import {
  Transaction,
  MonthlyBudget,
  MonthlyFinancialSummary,
  PersonBalanceSummary,
  WhereDidMyMoneyGoReport,
  Account,
  ReservedMoney,
  BudgetCycleRange,
  Person,
} from '../types/finance';

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns YYYY-MM-DD string using local calendar date (avoids UTC offset shifts)
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Formats currency amount in Indian Rupee format (e.g. ₹10,000 or -₹500)
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('en-IN').format(absAmount);
  return `${isNegative ? '−' : ''}₹${formatted}`;
}

/**
 * Gets YearMonth string "YYYY-MM"
 */
export function getYearMonth(dateInput: string | Date = new Date()): string {
  if (typeof dateInput === 'string') {
    if (dateInput.length === 7) return dateInput;
    return dateInput.substring(0, 7);
  }
  return formatLocalDate(dateInput).substring(0, 7);
}

/**
 * Computes the exact budget cycle range for a given date and cycle start day.
 * Example: startDay = 5
 * If refDate = Sep 10, 2026 -> Start: 2026-09-05, End: 2026-10-04 (Sep 5 → Oct 4)
 * If refDate = Sep 3, 2026  -> Start: 2026-08-05, End: 2026-09-04 (Aug 5 → Sep 4)
 */
export function getBudgetCycleRange(
  dateInput: string | Date = new Date(),
  startDay: number = 5
): BudgetCycleRange {
  const date = typeof dateInput === 'string' ? parseLocalDate(dateInput) : new Date(dateInput);
  const safeStartDay = Math.min(28, Math.max(1, startDay || 1));

  let startYear = date.getFullYear();
  let startMonth = date.getMonth(); // 0-indexed

  if (safeStartDay === 1) {
    // Standard calendar month cycle: 1st to end of month
    const startDate = new Date(startYear, startMonth, 1);
    const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
    const endDate = new Date(startYear, startMonth, lastDayOfMonth);

    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    const label = `${SHORT_MONTH_NAMES[startMonth]} 1 → ${SHORT_MONTH_NAMES[startMonth]} ${lastDayOfMonth}`;
    const shortLabel = `${FULL_MONTH_NAMES[startMonth]} ${startYear}`;

    const todayStr = formatLocalDate(new Date());
    const isCurrent = todayStr >= startStr && todayStr <= endStr;

    const totalDays = lastDayOfMonth;
    const currentDayVal = date.getDate();
    const currentDayIndex = Math.min(totalDays, Math.max(1, currentDayVal));
    const daysRemaining = Math.max(0, totalDays - currentDayIndex);

    return {
      cycleKey: `${startStr}_${endStr}`,
      label,
      shortLabel,
      startDate: startStr,
      endDate: endStr,
      startDay: 1,
      year: startYear,
      month: startMonth + 1,
      isCurrent,
      totalDays,
      currentDayIndex,
      daysRemaining,
    };
  }

  // Custom cycle start day (e.g. 5th of month)
  if (date.getDate() < safeStartDay) {
    // We are before the cycle start day in the current calendar month -> cycle started last month
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const startDate = new Date(startYear, startMonth, safeStartDay);
  
  // End date is (safeStartDay - 1) of the next month
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear += 1;
  }
  const endDate = new Date(endYear, endMonth, safeStartDay - 1);

  const startStr = formatLocalDate(startDate);
  const endStr = formatLocalDate(endDate);

  const label = `${SHORT_MONTH_NAMES[startMonth]} ${safeStartDay} → ${SHORT_MONTH_NAMES[endMonth]} ${safeStartDay - 1}`;
  const shortLabel = `${label}, ${startYear}`;

  const todayStr = formatLocalDate(new Date());
  const isCurrent = todayStr >= startStr && todayStr <= endStr;

  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const passedMs = date.getTime() - startDate.getTime();
  const currentDayIndex = Math.min(totalDays, Math.max(1, Math.floor(passedMs / (1000 * 60 * 60 * 24)) + 1));
  const daysRemaining = Math.max(0, totalDays - currentDayIndex);

  return {
    cycleKey: `${startStr}_${endStr}`,
    label,
    shortLabel,
    startDate: startStr,
    endDate: endStr,
    startDay: safeStartDay,
    year: startYear,
    month: startMonth + 1,
    isCurrent,
    totalDays,
    currentDayIndex,
    daysRemaining,
  };
}

/**
 * Returns a list of past and current budget cycle ranges for navigation
 */
export function getPreviousBudgetCycles(
  count: number = 6,
  startDay: number = 5,
  referenceDate: Date = new Date()
): BudgetCycleRange[] {
  const cycles: BudgetCycleRange[] = [];
  const currentCycle = getBudgetCycleRange(referenceDate, startDay);
  cycles.push(currentCycle);

  let curStartDate = parseLocalDate(currentCycle.startDate);
  for (let i = 1; i < count; i++) {
    // Step back 15 days before the start of previous cycle
    const prevDate = new Date(curStartDate);
    prevDate.setDate(prevDate.getDate() - 10);
    const prevCycle = getBudgetCycleRange(prevDate, startDay);
    cycles.push(prevCycle);
    curStartDate = parseLocalDate(prevCycle.startDate);
  }

  return cycles;
}

/**
 * Computes exact account physical cash balances directly from the transaction ledger.
 * Single source of truth: guaranteed consistent regardless of edits or deletions.
 */
export function computeAccountBalancesFromLedger(
  transactions: Transaction[],
  accounts: Account[]
): Account[] {
  const balanceMap = new Map<string, number>();
  for (const acc of accounts) {
    balanceMap.set(acc.id, 0);
  }

  // Chronologically apply active transactions
  for (const tx of transactions) {
    const accId = tx.accountId;
    const cur = balanceMap.get(accId) || 0;

    switch (tx.type) {
      case 'EXPENSE':
      case 'SPLIT':
      case 'LENDING':
        balanceMap.set(accId, cur - tx.amount);
        break;

      case 'MONEY_RECEIVED':
      case 'REIMBURSEMENT':
      case 'LOAN_REPAYMENT':
      case 'REFUND':
        balanceMap.set(accId, cur + tx.amount);
        break;

      case 'TRANSFER':
        balanceMap.set(accId, cur - tx.amount);
        if (tx.toAccountId) {
          const toCur = balanceMap.get(tx.toAccountId) || 0;
          balanceMap.set(tx.toAccountId, toCur + tx.amount);
        }
        break;

      case 'ADJUSTMENT':
        // Adjustment applies delta (amount can be positive or negative)
        balanceMap.set(accId, cur + tx.amount);
        break;
    }
  }

  return accounts.map(acc => ({
    ...acc,
    balance: balanceMap.get(acc.id) || 0,
  }));
}

/**
 * Calculates Person Balances from transaction ledger (Splits vs Loans)
 */
export function calculateAllPersonBalances(
  transactions: Transaction[],
  personList: Person[]
): PersonBalanceSummary[] {
  const balanceMap = new Map<string, {
    personId: string;
    personName: string;
    splitOwed: number;
    loanOwed: number;
    settledTotal: number;
    lastDate?: string;
  }>();

  // Initialize for all registered people
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

  // Chronologically process transactions
  const sortedTx = [...transactions].sort((a, b) => {
    return new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime();
  });

  for (const tx of sortedTx) {
    // 1. SPLIT: Friends owe their respective share
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

    // 2. LENDING: Person owes the loan amount
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
 * Main accounting function to calculate comprehensive budget cycle summary
 */
export function calculateBudgetCycleSummary(
  cycle: BudgetCycleRange,
  transactions: Transaction[],
  budget: MonthlyBudget | null,
  reservedList: ReservedMoney[] = [],
  accounts: Account[] = [],
  referenceDateStr?: string
): MonthlyFinancialSummary {
  const todayStr = referenceDateStr || formatLocalDate(new Date());

  // Filter transactions strictly within this budget cycle
  const cycleTransactions = transactions.filter(tx => {
    return tx.date >= cycle.startDate && tx.date <= cycle.endDate;
  });

  let totalReceived = 0;
  let explicitBudget = budget ? budget.totalBudget : 0;
  let actualPersonalSpent = 0;
  let totalPaidForOthers = 0;
  let totalReimbursed = 0;
  let totalMoneyLent = 0;
  let totalLoanRepayments = 0;

  const categoryMap = new Map<string, number>();

  // Rolling last 7 days calculation
  const todayDate = parseLocalDate(todayStr);
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setDate(todayDate.getDate() - 6);
  const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo);

  let todaySpent = 0;
  let thisWeekSpent = 0;

  for (const tx of cycleTransactions) {
    const isToday = tx.date === todayStr;
    const isInLast7Days = tx.date >= sevenDaysAgoStr && tx.date <= todayStr;

    switch (tx.type) {
      case 'EXPENSE': {
        actualPersonalSpent += tx.amount;
        categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + tx.amount);
        if (isToday) todaySpent += tx.amount;
        if (isInLast7Days) thisWeekSpent += tx.amount;
        break;
      }

      case 'SPLIT': {
        const userPortion = typeof tx.userShare === 'number' ? tx.userShare : tx.amount;
        const othersPortion = tx.amount - userPortion;

        actualPersonalSpent += userPortion;
        totalPaidForOthers += othersPortion;

        categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + userPortion);

        if (isToday) todaySpent += userPortion;
        if (isInLast7Days) thisWeekSpent += userPortion;
        break;
      }

      case 'LENDING': {
        totalMoneyLent += tx.amount;
        break;
      }

      case 'MONEY_RECEIVED': {
        totalReceived += tx.amount;
        if (tx.isMonthlyBudget) {
          explicitBudget += tx.amount;
        }
        break;
      }

      case 'REIMBURSEMENT': {
        totalReimbursed += tx.amount;
        break;
      }

      case 'LOAN_REPAYMENT': {
        totalLoanRepayments += tx.amount;
        break;
      }

      case 'REFUND': {
        actualPersonalSpent = Math.max(0, actualPersonalSpent - tx.amount);
        const prevCat = categoryMap.get(tx.category) || 0;
        categoryMap.set(tx.category, Math.max(0, prevCat - tx.amount));
        break;
      }

      case 'TRANSFER':
      case 'ADJUSTMENT':
        break;
    }
  }

  // Active Total Budget for this cycle
  const totalBudget = explicitBudget > 0 ? explicitBudget : (budget?.totalBudget || totalReceived);

  // Active Reserved Money (Unfulfilled reservations)
  const totalReserved = reservedList
    .filter(r => !r.isFulfilled)
    .reduce((sum, r) => sum + r.amount, 0);

  // SPENDABLE MONEY: Total Budget - Reserved - Actual Personal Spent
  const spendableMoney = totalBudget - totalReserved - actualPersonalSpent;
  const isOverBudget = spendableMoney < 0;
  const overBudgetAmount = isOverBudget ? Math.abs(spendableMoney) : 0;
  const leftToSpend = spendableMoney;

  // Receivables
  const pendingSplitReceivables = Math.max(0, totalPaidForOthers - totalReimbursed);
  const pendingLoanReceivables = Math.max(0, totalMoneyLent - totalLoanRepayments);
  const totalMoneyOwedToYou = pendingSplitReceivables + pendingLoanReceivables;

  // Total physical cash across accounts
  const totalPhysicalCashBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  // Spending Pace calculation
  const passedDays = Math.max(1, cycle.currentDayIndex);
  const dailySpendingPace = Math.round(actualPersonalSpent / passedDays);
  const recommendedDailyPace = cycle.daysRemaining > 0
    ? Math.round(Math.max(0, spendableMoney) / cycle.daysRemaining)
    : 0;

  // Pace status evaluation
  let paceStatus: 'ON_TRACK' | 'SLIGHTLY_FAST' | 'OVERSPENDING' | 'AHEAD_OF_BUDGET' = 'ON_TRACK';
  let paceMessage = '';

  const estimatedRemainingAtCurrentPace = Math.round(totalBudget - totalReserved - (dailySpendingPace * cycle.totalDays));

  if (totalBudget === 0) {
    paceStatus = 'ON_TRACK';
    paceMessage = 'Record your budget or money received to track spending pace.';
  } else if (isOverBudget) {
    paceStatus = 'OVERSPENDING';
    paceMessage = `You are ${formatINR(overBudgetAmount)} over your cycle budget.`;
  } else if (dailySpendingPace > (totalBudget / cycle.totalDays) * 1.25) {
    paceStatus = 'OVERSPENDING';
    paceMessage = "You're spending faster than your planned daily budget.";
  } else if (dailySpendingPace > (totalBudget / cycle.totalDays) * 1.05) {
    paceStatus = 'SLIGHTLY_FAST';
    paceMessage = "You're spending slightly faster than your target pace.";
  } else if (dailySpendingPace < (totalBudget / cycle.totalDays) * 0.8) {
    paceStatus = 'AHEAD_OF_BUDGET';
    paceMessage = `You're on track to finish with ~${formatINR(Math.max(0, estimatedRemainingAtCurrentPace))} remaining.`;
  } else {
    paceStatus = 'ON_TRACK';
    paceMessage = `Pace is balanced. Recommended: ${formatINR(recommendedDailyPace)}/day.`;
  }

  // Category breakdown
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
    yearMonth: `${cycle.year}-${String(cycle.month).padStart(2, '0')}`,
    monthName: cycle.shortLabel,
    cycle,
    totalBudget,
    totalReceived,
    actualPersonalSpent,
    totalReserved,
    spendableMoney,
    leftToSpend,
    isOverBudget,
    overBudgetAmount,
    totalPaidForOthers,
    totalReimbursed,
    pendingSplitReceivables,
    totalMoneyLent,
    totalLoanRepayments,
    pendingLoanReceivables,
    totalMoneyOwedToYou,
    totalPhysicalCashBalance,
    daysInMonth: cycle.totalDays,
    currentDay: cycle.currentDayIndex,
    daysRemaining: cycle.daysRemaining,
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
 * Generates transparent "Where Did My Money Go?" plain-English story
 */
export function generateWhereDidMyMoneyGo(
  cycle: BudgetCycleRange,
  transactions: Transaction[],
  budget: MonthlyBudget | null,
  reservedList: ReservedMoney[] = []
): WhereDidMyMoneyGoReport {
  const summary = calculateBudgetCycleSummary(cycle, transactions, budget, reservedList);

  const topCategories = summary.categorySpending.slice(0, 3);
  const topCatListText = topCategories.length > 0
    ? topCategories.map(c => `${c.category} (${formatINR(c.amount)})`).join(', ')
    : 'No expenses recorded yet';

  const reservedText = summary.totalReserved > 0
    ? ` You set aside ${formatINR(summary.totalReserved)} in reserved money.`
    : '';

  const summaryParagraph = `During ${summary.cycle.label}, you received ${formatINR(summary.totalBudget)} in total money.${reservedText} You personally spent ${formatINR(summary.actualPersonalSpent)}, primarily on ${topCatListText}. You paid ${formatINR(summary.totalPaidForOthers)} for friends (${formatINR(summary.totalReimbursed)} reimbursed, ${formatINR(summary.pendingSplitReceivables)} still owed) and lent ${formatINR(summary.totalMoneyLent)} (${formatINR(summary.pendingLoanReceivables)} still outstanding). ${summary.isOverBudget ? `You are currently ${formatINR(summary.overBudgetAmount)} over budget.` : `You have ${formatINR(summary.spendableMoney)} remaining to spend.`}`;

  return {
    yearMonth: summary.yearMonth,
    monthName: summary.monthName,
    cycleLabel: summary.cycle.label,
    totalReceived: summary.totalBudget,
    actualPersonalSpending: summary.actualPersonalSpent,
    topCategories,
    paidForOthers: summary.totalPaidForOthers,
    reimbursed: summary.totalReimbursed,
    stillOwedFromSplits: summary.pendingSplitReceivables,
    moneyLent: summary.totalMoneyLent,
    repaidLoans: summary.totalLoanRepayments,
    stillOutstandingLoans: summary.pendingLoanReceivables,
    totalReserved: summary.totalReserved,
    spendableMoney: summary.spendableMoney,
    remainingBudget: summary.leftToSpend,
    isOverBudget: summary.isOverBudget,
    overBudgetAmount: summary.overBudgetAmount,
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
  const diff = Math.round((totalAmount - totalShares) * 100) / 100;

  if (Math.abs(diff) > 0.01) {
    return {
      isValid: false,
      difference: diff,
      errorMessage: `Shares (${formatINR(totalShares)}) do not equal total paid (${formatINR(totalAmount)}). Difference: ${formatINR(diff)}`,
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
