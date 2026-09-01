import {
  Transaction,
  MonthlyBudget,
  MonthlyFinancialSummary,
  PersonBalanceSummary,
  WhereDidMyMoneyGoReport,
  Account,
} from '../types/finance';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats currency amount in Indian Rupee format (e.g. ₹10,000)
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('en-IN').format(absAmount);
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Gets YearMonth string "YYYY-MM" from date string or Date
 */
export function getYearMonth(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthDisplayName(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[monthIndex] || 'Unknown'} ${yearStr}`;
}

/**
 * Calculates days in month, current day, and remaining days
 */
export function getMonthTimeline(yearMonth: string, referenceDateStr?: string) {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  
  const isCurrentMonth = getYearMonth(refDate) === yearMonth;
  const currentDay = isCurrentMonth ? Math.min(refDate.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  
  return {
    daysInMonth,
    currentDay,
    daysRemaining,
    isCurrentMonth,
  };
}

/**
 * Calculates Person Balances (Distinguishing Split Receivables vs Loan Receivables)
 */
export function calculateAllPersonBalances(
  transactions: Transaction[],
  personList: { id: string; name: string }[]
): PersonBalanceSummary[] {
  const balanceMap = new Map<string, {
    personId: string;
    personName: string;
    splitOwed: number;
    loanOwed: number;
    settledTotal: number;
    lastDate?: string;
  }>();

  // Initialize for all known people
  for (const p of personList) {
    balanceMap.set(p.id, {
      personId: p.id,
      personName: p.name,
      splitOwed: 0,
      loanOwed: 0,
      settledTotal: 0,
      lastDate: undefined,
    });
  }

  // Iterate chronologically through transactions
  const sortedTx = [...transactions].sort((a, b) => {
    return new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime();
  });

  for (const tx of sortedTx) {
    // 1. SPLIT Transactions: Friends owe their share
    if (tx.type === 'SPLIT' && tx.splits && tx.splits.length > 0) {
      for (const split of tx.splits) {
        let personData = balanceMap.get(split.personId);
        if (!personData) {
          personData = {
            personId: split.personId,
            personName: split.personName,
            splitOwed: 0,
            loanOwed: 0,
            settledTotal: 0,
          };
          balanceMap.set(split.personId, personData);
        }
        personData.splitOwed += split.amount;
        personData.lastDate = tx.date;
      }
    }

    // 2. LENDING Transactions: Person owes the lent amount
    if (tx.type === 'LENDING') {
      const pid = tx.personId || tx.loanDetails?.personId;
      const pname = tx.personName || tx.loanDetails?.personName || 'Friend';
      if (pid) {
        let personData = balanceMap.get(pid);
        if (!personData) {
          personData = {
            personId: pid,
            personName: pname,
            splitOwed: 0,
            loanOwed: 0,
            settledTotal: 0,
          };
          balanceMap.set(pid, personData);
        }
        personData.loanOwed += tx.amount;
        personData.lastDate = tx.date;
      }
    }

    // 3. REIMBURSEMENT: Reduces split receivables
    if (tx.type === 'REIMBURSEMENT' && tx.personId) {
      const personData = balanceMap.get(tx.personId);
      if (personData) {
        personData.splitOwed = Math.max(0, personData.splitOwed - tx.amount);
        personData.settledTotal += tx.amount;
        personData.lastDate = tx.date;
      }
    }

    // 4. LOAN_REPAYMENT: Reduces loan receivables
    if (tx.type === 'LOAN_REPAYMENT' && tx.personId) {
      const personData = balanceMap.get(tx.personId);
      if (personData) {
        personData.loanOwed = Math.max(0, personData.loanOwed - tx.amount);
        personData.settledTotal += tx.amount;
        personData.lastDate = tx.date;
      }
    }
  }

  return Array.from(balanceMap.values()).map(p => ({
    ...p,
    totalOwed: p.splitOwed + p.loanOwed,
  }));
}

/**
 * Main accounting function to calculate monthly financial summary
 */
export function calculateMonthlySummary(
  yearMonth: string,
  transactions: Transaction[],
  budget: MonthlyBudget | null,
  accounts: Account[] = [],
  referenceDateStr?: string
): MonthlyFinancialSummary {
  const timeline = getMonthTimeline(yearMonth, referenceDateStr);
  const monthName = getMonthDisplayName(yearMonth);

  // Filter transactions belonging to this month
  const monthTransactions = transactions.filter(tx => tx.date.startsWith(yearMonth));

  let totalReceived = 0;
  let explicitMonthlyBudget = budget ? budget.totalBudget : 0;
  let actualPersonalSpent = 0;
  let totalPaidForOthers = 0;
  let totalReimbursed = 0;
  let totalMoneyLent = 0;
  let totalLoanRepayments = 0;

  const categoryMap = new Map<string, number>();

  // Date markers for Today and This Week
  const todayStr = referenceDateStr || new Date().toISOString().split('T')[0];
  const refDate = new Date(todayStr);
  const startOfWeek = new Date(refDate);
  startOfWeek.setDate(refDate.getDate() - refDate.getDay()); // Sunday as start
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  let todaySpent = 0;
  let thisWeekSpent = 0;

  for (const tx of monthTransactions) {
    const isToday = tx.date === todayStr;
    const isThisWeek = tx.date >= startOfWeekStr && tx.date <= todayStr;

    switch (tx.type) {
      case 'EXPENSE': {
        actualPersonalSpent += tx.amount;
        categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + tx.amount);
        if (isToday) todaySpent += tx.amount;
        if (isThisWeek) thisWeekSpent += tx.amount;
        break;
      }

      case 'SPLIT': {
        const userPortion = typeof tx.userShare === 'number' ? tx.userShare : tx.amount;
        const othersPortion = tx.amount - userPortion;

        actualPersonalSpent += userPortion;
        totalPaidForOthers += othersPortion;

        categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + userPortion);

        if (isToday) todaySpent += userPortion;
        if (isThisWeek) thisWeekSpent += userPortion;
        break;
      }

      case 'LENDING': {
        // Lending is NOT personal spending
        totalMoneyLent += tx.amount;
        break;
      }

      case 'MONEY_RECEIVED': {
        totalReceived += tx.amount;
        if (tx.isMonthlyBudget) {
          explicitMonthlyBudget += tx.amount;
        }
        break;
      }

      case 'REIMBURSEMENT': {
        // Reimbursement is not new income, it's money received back
        totalReimbursed += tx.amount;
        break;
      }

      case 'LOAN_REPAYMENT': {
        // Loan repayment is not new income, it's loan principal returned
        totalLoanRepayments += tx.amount;
        break;
      }

      case 'REFUND': {
        // Refund reduces actual personal spending
        actualPersonalSpent = Math.max(0, actualPersonalSpent - tx.amount);
        const prevCat = categoryMap.get(tx.category) || 0;
        categoryMap.set(tx.category, Math.max(0, prevCat - tx.amount));
        break;
      }

      case 'TRANSFER': {
        // Transfers between own accounts have 0 effect on spending or budget
        break;
      }
    }
  }

  // Active budget: if no explicit budget received/set, use totalReceived
  const totalBudget = explicitMonthlyBudget > 0 ? explicitMonthlyBudget : (budget?.totalBudget || totalReceived);

  // Left to spend calculation
  const leftToSpend = Math.max(0, totalBudget - actualPersonalSpent);

  // Pending receivables for the whole system (or this month)
  const pendingSplitReceivables = Math.max(0, totalPaidForOthers - totalReimbursed);
  const pendingLoanReceivables = Math.max(0, totalMoneyLent - totalLoanRepayments);
  const totalMoneyOwedToYou = pendingSplitReceivables + pendingLoanReceivables;

  // Physical cash / bank balance across accounts
  const totalPhysicalCashBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  // Spending Pace calculation
  const passedDays = Math.max(1, timeline.currentDay);
  const dailySpendingPace = Math.round(actualPersonalSpent / passedDays);
  const recommendedDailyPace = timeline.daysRemaining > 0
    ? Math.round(leftToSpend / timeline.daysRemaining)
    : 0;

  // Pace status evaluation
  let paceStatus: 'ON_TRACK' | 'SLIGHTLY_FAST' | 'OVERSPENDING' | 'AHEAD_OF_BUDGET' = 'ON_TRACK';
  let paceMessage = '';

  const expectedSpentByNow = totalBudget > 0 ? (totalBudget / timeline.daysInMonth) * passedDays : 0;
  const estimatedRemainingAtCurrentPace = Math.round(totalBudget - (dailySpendingPace * timeline.daysInMonth));

  if (totalBudget === 0) {
    paceStatus = 'ON_TRACK';
    paceMessage = 'Set a monthly budget to track your spending pace.';
  } else if (actualPersonalSpent > totalBudget) {
    paceStatus = 'OVERSPENDING';
    paceMessage = `You have exceeded your ₹${new Intl.NumberFormat('en-IN').format(totalBudget)} monthly budget.`;
  } else if (dailySpendingPace > (totalBudget / timeline.daysInMonth) * 1.25) {
    paceStatus = 'OVERSPENDING';
    paceMessage = 'At your current pace, you may run out before the month ends.';
  } else if (dailySpendingPace > (totalBudget / timeline.daysInMonth) * 1.05) {
    paceStatus = 'SLIGHTLY_FAST';
    paceMessage = "You're spending slightly faster than your target daily budget.";
  } else if (dailySpendingPace < (totalBudget / timeline.daysInMonth) * 0.8) {
    paceStatus = 'AHEAD_OF_BUDGET';
    paceMessage = `You're on track to finish with ~${formatINR(Math.max(0, estimatedRemainingAtCurrentPace))} remaining.`;
  } else {
    paceStatus = 'ON_TRACK';
    paceMessage = `Spending is well balanced. Recommended pace: ${formatINR(recommendedDailyPace)}/day.`;
  }

  // Category spending breakdown with percentages & budget allocations
  const categorySpending = Array.from(categoryMap.entries())
    .map(([category, amount]) => {
      const percentage = actualPersonalSpent > 0 ? Math.round((amount / actualPersonalSpent) * 100) : 0;
      const allocatedBudget = budget?.allocations?.[category];
      return {
        category,
        amount,
        percentage,
        allocatedBudget,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    yearMonth,
    monthName,
    totalBudget,
    totalReceived,
    actualPersonalSpent,
    leftToSpend,
    totalPaidForOthers,
    totalReimbursed,
    pendingSplitReceivables,
    totalMoneyLent,
    totalLoanRepayments,
    pendingLoanReceivables,
    totalMoneyOwedToYou,
    totalPhysicalCashBalance,
    daysInMonth: timeline.daysInMonth,
    currentDay: timeline.currentDay,
    daysRemaining: timeline.daysRemaining,
    dailySpendingPace,
    recommendedDailyPace,
    paceStatus,
    paceMessage,
    estimatedRemainingAtCurrentPace,
    categorySpending,
    todaySpent,
    thisWeekSpent,
  };
}

/**
 * Generates the "Where did my money go?" transparent report
 */
export function generateWhereDidMyMoneyGo(
  yearMonth: string,
  transactions: Transaction[],
  budget: MonthlyBudget | null
): WhereDidMyMoneyGoReport {
  const summary = calculateMonthlySummary(yearMonth, transactions, budget);

  const topCategories = summary.categorySpending.slice(0, 3);
  const remainingBudget = summary.leftToSpend;

  const topCatListText = topCategories.length > 0
    ? topCategories.map(c => `${c.category} (${formatINR(c.amount)})`).join(', ')
    : 'No major categories yet';

  const summaryParagraph = `In ${summary.monthName}, you had a budget of ${formatINR(summary.totalBudget)}. You spent ${formatINR(summary.actualPersonalSpent)} on personal expenses, mainly in ${topCatListText}. You paid ${formatINR(summary.totalPaidForOthers)} on behalf of friends (${formatINR(summary.totalReimbursed)} reimbursed, ${formatINR(summary.pendingSplitReceivables)} still owed), and lent ${formatINR(summary.totalMoneyLent)} (${formatINR(summary.pendingLoanReceivables)} still outstanding). You have ${formatINR(remainingBudget)} left to spend.`;

  return {
    yearMonth,
    monthName: summary.monthName,
    totalReceived: summary.totalBudget,
    actualPersonalSpending: summary.actualPersonalSpent,
    topCategories,
    paidForOthers: summary.totalPaidForOthers,
    reimbursed: summary.totalReimbursed,
    stillOwedFromSplits: summary.pendingSplitReceivables,
    moneyLent: summary.totalMoneyLent,
    repaidLoans: summary.totalLoanRepayments,
    stillOutstandingLoans: summary.pendingLoanReceivables,
    remainingBudget,
    summaryParagraph,
  };
}

/**
 * Validates a friend split sum
 */
export function validateSplit(totalAmount: number, userShare: number, splitAmounts: number[]): {
  isValid: boolean;
  difference: number;
  errorMessage?: string;
} {
  const friendSum = splitAmounts.reduce((sum, val) => sum + val, 0);
  const totalShares = userShare + friendSum;
  const diff = totalAmount - totalShares;

  if (Math.abs(diff) > 0.01) {
    return {
      isValid: false,
      difference: diff,
      errorMessage: `Shares (₹${totalShares}) do not equal total paid (₹${totalAmount}). Difference: ${formatINR(diff)}`,
    };
  }

  return { isValid: true, difference: 0 };
}

/**
 * Validates a loan repayment against outstanding balance
 */
export function validateLoanRepayment(repaymentAmount: number, outstandingLoan: number, personName: string): {
  isValid: boolean;
  excessAmount: number;
  warningMessage?: string;
} {
  if (repaymentAmount <= 0) {
    return { isValid: false, excessAmount: 0, warningMessage: 'Repayment amount must be greater than ₹0.' };
  }

  if (repaymentAmount > outstandingLoan) {
    const excess = repaymentAmount - outstandingLoan;
    return {
      isValid: false,
      excessAmount: excess,
      warningMessage: `${personName} currently owes you ${formatINR(outstandingLoan)}. Repayment exceeds outstanding amount by ${formatINR(excess)}.`,
    };
  }

  return { isValid: true, excessAmount: 0 };
}
