import {
  Transaction,
  Account,
  ReservedMoney,
  Person,
  PersonBalanceSummary,
  FinancialOverviewSummary,
  WhereDidMyMoneyGoReport,
  ReportingPeriod,
  ReportingDateRange,
  MoneyLocationId,
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
 * Formats a Date object to local YYYY-MM-DD string without UTC shift bugs
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
 * Formats currency amount in Indian Rupee format (e.g. ₹3,200 or −₹500)
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
 * Generates reporting date ranges for a given period
 */
export function getReportingDateRange(
  period: ReportingPeriod = 'THIS_MONTH',
  referenceDate: Date = new Date()
): ReportingDateRange {
  const todayStr = formatLocalDate(referenceDate);
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed

  switch (period) {
    case 'TODAY':
      return {
        key: `today_${todayStr}`,
        label: 'Today',
        startDate: todayStr,
        endDate: todayStr,
        isCurrent: true,
      };

    case 'LAST_7_DAYS': {
      const sevenDaysAgo = new Date(referenceDate);
      sevenDaysAgo.setDate(referenceDate.getDate() - 6);
      const startStr = formatLocalDate(sevenDaysAgo);
      return {
        key: `last7_${startStr}_${todayStr}`,
        label: 'Last 7 Days',
        startDate: startStr,
        endDate: todayStr,
        isCurrent: true,
      };
    }

    case 'LAST_MONTH': {
      let lastMonth = refMonth - 1;
      let lastYear = refYear;
      if (lastMonth < 0) {
        lastMonth = 11;
        lastYear -= 1;
      }
      const lastMonthStart = new Date(lastYear, lastMonth, 1);
      const lastDayOfLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate();
      const lastMonthEnd = new Date(lastYear, lastMonth, lastDayOfLastMonth);

      return {
        key: `month_${lastYear}-${String(lastMonth + 1).padStart(2, '0')}`,
        label: `${FULL_MONTH_NAMES[lastMonth]} ${lastYear}`,
        startDate: formatLocalDate(lastMonthStart),
        endDate: formatLocalDate(lastMonthEnd),
        isCurrent: false,
      };
    }

    case 'ALL_TIME':
      return {
        key: 'all_time',
        label: 'All Time',
        startDate: '2000-01-01',
        endDate: '2099-12-31',
        isCurrent: true,
      };

    case 'THIS_MONTH':
    default: {
      const startOfMonth = new Date(refYear, refMonth, 1);
      const lastDayOfMonth = new Date(refYear, refMonth + 1, 0).getDate();
      const endOfMonth = new Date(refYear, refMonth, lastDayOfMonth);

      return {
        key: `month_${refYear}-${String(refMonth + 1).padStart(2, '0')}`,
        label: `${FULL_MONTH_NAMES[refMonth]} ${refYear}`,
        startDate: formatLocalDate(startOfMonth),
        endDate: formatLocalDate(endOfMonth),
        isCurrent: true,
      };
    }
  }
}

/**
 * Computes exact physical cash and bank balances strictly from the transaction ledger.
 * This is the SINGLE SOURCE OF TRUTH for account balances.
 */
export function computeAccountBalancesFromLedger(
  transactions: Transaction[],
  baseAccounts: Account[] = []
): Account[] {
  // Normalize accounts to strictly Bank and Cash
  let bankBalance = 0;
  let cashBalance = 0;

  for (const tx of transactions) {
    // Determine which account is targeted
    const isBank = tx.accountId === 'acc_bank' || tx.accountId === 'bank' || tx.accountId === 'acc_upi' || tx.accountId === 'upi';
    const isCash = tx.accountId === 'acc_cash' || tx.accountId === 'cash';

    switch (tx.type) {
      case 'OPENING_BALANCE':
      case 'MONEY_RECEIVED':
      case 'REIMBURSEMENT':
      case 'LOAN_REPAYMENT':
      case 'REFUND':
        if (isBank) bankBalance += tx.amount;
        else if (isCash) cashBalance += tx.amount;
        break;

      case 'EXPENSE':
      case 'SPLIT':
      case 'LENDING':
        if (isBank) bankBalance -= tx.amount;
        else if (isCash) cashBalance -= tx.amount;
        break;

      case 'TRANSFER':
        // Source account loses money
        if (isBank) bankBalance -= tx.amount;
        else if (isCash) cashBalance -= tx.amount;

        // Destination account gains money
        if (tx.toAccountId === 'acc_bank' || tx.toAccountId === 'bank') {
          bankBalance += tx.amount;
        } else if (tx.toAccountId === 'acc_cash' || tx.toAccountId === 'cash') {
          cashBalance += tx.amount;
        }
        break;

      case 'ADJUSTMENT':
        // Cash adjustment delta
        if (isBank) bankBalance += tx.amount;
        else if (isCash) cashBalance += tx.amount;
        break;
    }
  }

  const userId = baseAccounts[0]?.userId || 'student_user_1';

  return [
    {
      id: 'acc_bank',
      userId,
      name: 'Bank Account',
      type: 'BANK',
      balance: bankBalance,
    },
    {
      id: 'acc_cash',
      userId,
      name: 'Cash in Hand',
      type: 'CASH',
      balance: cashBalance,
    },
  ];
}

/**
 * Checks if an account has sufficient balance before spending/lending/transferring
 */
export function checkSufficientBalance(
  accountId: string,
  amountToDeduct: number,
  accounts: Account[]
): {
  hasSufficient: boolean;
  currentBalance: number;
  missingAmount: number;
  accountName: string;
} {
  const account = accounts.find(a => a.id === accountId || (accountId === 'acc_bank' && a.type === 'BANK') || (accountId === 'acc_cash' && a.type === 'CASH'))
    || accounts[0];

  const currentBalance = account?.balance || 0;
  const hasSufficient = currentBalance >= amountToDeduct;
  const missingAmount = Math.max(0, amountToDeduct - currentBalance);
  const accountName = account?.name || 'Account';

  return {
    hasSufficient,
    currentBalance,
    missingAmount,
    accountName,
  };
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
 * Master Financial Overview Calculator
 *
 * Fundamental Equations:
 * 1. Current Money = Bank Balance + Cash Balance
 * 2. Spendable Money = Current Money - Active Reserved Money
 * 3. Total Received = Sum of MONEY_RECEIVED in reporting period (NOT a budget limit!)
 * 4. Personal Spending = Expenses + Split User Share - Refunds in period
 * 5. Receivables (Splits + Loans) are NEVER added to Current Money
 */
export function calculateFinancialOverview(
  transactions: Transaction[],
  reservedList: ReservedMoney[] = [],
  period: ReportingPeriod = 'THIS_MONTH',
  referenceDate: Date = new Date()
): FinancialOverviewSummary {
  const dateRange = getReportingDateRange(period, referenceDate);
  const todayStr = formatLocalDate(referenceDate);

  // 1. Current Physical Money (Always authoritative from full transaction history)
  const computedAccounts = computeAccountBalancesFromLedger(transactions);
  const bankAccount = computedAccounts.find(a => a.id === 'acc_bank') || computedAccounts[0];
  const cashAccount = computedAccounts.find(a => a.id === 'acc_cash') || computedAccounts[1];

  const bankBalance = bankAccount?.balance || 0;
  const cashBalance = cashAccount?.balance || 0;
  const currentMoney = bankBalance + cashBalance;

  // 2. Active Reserved Money (Funds committed for rent, fees, etc.)
  const totalReserved = reservedList
    .filter(r => !r.isFulfilled)
    .reduce((sum, r) => sum + r.amount, 0);

  // 3. Spendable Money = Current Money - Reserved Money
  const spendableMoney = currentMoney - totalReserved;

  // 4. Period Inflows & Spending
  const periodTransactions = transactions.filter(tx => {
    return tx.date >= dateRange.startDate && tx.date <= dateRange.endDate;
  });

  let totalReceivedInPeriod = 0;
  let actualPersonalSpentInPeriod = 0;
  let totalPaidForOthersInPeriod = 0;
  let totalReimbursedInPeriod = 0;
  let totalMoneyLentInPeriod = 0;
  let totalLoanRepaymentsInPeriod = 0;

  const categoryMap = new Map<string, number>();

  // Rolling last 7 days calculation
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(referenceDate.getDate() - 6);
  const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo);

  let todaySpent = 0;
  let last7DaysSpent = 0;

  for (const tx of transactions) {
    const isToday = tx.date === todayStr;
    const isInLast7Days = tx.date >= sevenDaysAgoStr && tx.date <= todayStr;

    // Spending in last 7 days & today
    if (tx.type === 'EXPENSE') {
      if (isToday) todaySpent += tx.amount;
      if (isInLast7Days) last7DaysSpent += tx.amount;
    } else if (tx.type === 'SPLIT') {
      const userShare = typeof tx.userShare === 'number' ? tx.userShare : tx.amount;
      if (isToday) todaySpent += userShare;
      if (isInLast7Days) last7DaysSpent += userShare;
    } else if (tx.type === 'REFUND') {
      if (isToday) todaySpent = Math.max(0, todaySpent - tx.amount);
      if (isInLast7Days) last7DaysSpent = Math.max(0, last7DaysSpent - tx.amount);
    }
  }

  // Period-specific metrics
  for (const tx of periodTransactions) {
    switch (tx.type) {
      case 'MONEY_RECEIVED':
        totalReceivedInPeriod += tx.amount;
        break;

      case 'EXPENSE': {
        actualPersonalSpentInPeriod += tx.amount;
        categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + tx.amount);
        break;
      }

      case 'SPLIT': {
        const userPortion = typeof tx.userShare === 'number' ? tx.userShare : tx.amount;
        const othersPortion = tx.amount - userPortion;

        actualPersonalSpentInPeriod += userPortion;
        totalPaidForOthersInPeriod += othersPortion;
        categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + userPortion);
        break;
      }

      case 'LENDING':
        totalMoneyLentInPeriod += tx.amount;
        break;

      case 'REIMBURSEMENT':
        totalReimbursedInPeriod += tx.amount;
        break;

      case 'LOAN_REPAYMENT':
        totalLoanRepaymentsInPeriod += tx.amount;
        break;

      case 'REFUND': {
        actualPersonalSpentInPeriod = Math.max(0, actualPersonalSpentInPeriod - tx.amount);
        const curCat = categoryMap.get(tx.category) || 0;
        categoryMap.set(tx.category, Math.max(0, curCat - tx.amount));
        break;
      }

      case 'OPENING_BALANCE':
      case 'TRANSFER':
      case 'ADJUSTMENT':
        break;
    }
  }

  // Receivables across the entire ledger (All-time outstanding)
  let totalSplitsAllTime = 0;
  let totalReimbursedAllTime = 0;
  let totalLentAllTime = 0;
  let totalRepaymentsAllTime = 0;

  for (const tx of transactions) {
    if (tx.type === 'SPLIT') {
      const userPortion = typeof tx.userShare === 'number' ? tx.userShare : tx.amount;
      totalSplitsAllTime += (tx.amount - userPortion);
    } else if (tx.type === 'REIMBURSEMENT') {
      totalReimbursedAllTime += tx.amount;
    } else if (tx.type === 'LENDING') {
      totalLentAllTime += tx.amount;
    } else if (tx.type === 'LOAN_REPAYMENT') {
      totalRepaymentsAllTime += tx.amount;
    }
  }

  const pendingSplitReceivables = Math.max(0, totalSplitsAllTime - totalReimbursedAllTime);
  const pendingLoanReceivables = Math.max(0, totalLentAllTime - totalRepaymentsAllTime);
  const totalMoneyOwedToYou = pendingSplitReceivables + pendingLoanReceivables;

  // Category breakdown for reporting period
  const categorySpending = Array.from(categoryMap.entries())
    .map(([category, amount]) => {
      const percentage = actualPersonalSpentInPeriod > 0 ? Math.round((amount / actualPersonalSpentInPeriod) * 100) : 0;
      return { category, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    bankBalance,
    cashBalance,
    currentMoney,
    totalReserved,
    spendableMoney,
    pendingSplitReceivables,
    pendingLoanReceivables,
    totalMoneyOwedToYou,
    periodLabel: dateRange.label,
    totalReceivedInPeriod,
    actualPersonalSpentInPeriod,
    totalPaidForOthersInPeriod,
    totalReimbursedInPeriod,
    totalMoneyLentInPeriod,
    totalLoanRepaymentsInPeriod,
    todaySpent,
    last7DaysSpent,
    categorySpending,
  };
}

/**
 * Generates transparent "Where Did My Money Go?" natural-language story report
 */
export function generateWhereDidMyMoneyGo(
  transactions: Transaction[],
  reservedList: ReservedMoney[] = [],
  period: ReportingPeriod = 'THIS_MONTH'
): WhereDidMyMoneyGoReport {
  const summary = calculateFinancialOverview(transactions, reservedList, period);

  const topCategories = summary.categorySpending.slice(0, 3);
  const topCatListText = topCategories.length > 0
    ? topCategories.map(c => `${c.category} (${formatINR(c.amount)})`).join(', ')
    : 'No expenses recorded';

  const reservedText = summary.totalReserved > 0
    ? ` You have set aside ${formatINR(summary.totalReserved)} in reserved funds.`
    : '';

  const summaryParagraph = `During ${summary.periodLabel}, you received ${formatINR(summary.totalReceivedInPeriod)} in total money. You currently have ${formatINR(summary.currentMoney)} in total physical cash (${formatINR(summary.bankBalance)} in Bank, ${formatINR(summary.cashBalance)} in Cash).${reservedText} You personally spent ${formatINR(summary.actualPersonalSpentInPeriod)}, primarily on ${topCatListText}. You paid ${formatINR(summary.totalPaidForOthersInPeriod)} on behalf of friends (${formatINR(summary.totalReimbursedInPeriod)} reimbursed, ${formatINR(summary.pendingSplitReceivables)} still owed) and lent ${formatINR(summary.totalMoneyLentInPeriod)} (${formatINR(summary.pendingLoanReceivables)} currently outstanding). You have ${formatINR(summary.spendableMoney)} spendable money available right now.`;

  return {
    periodLabel: summary.periodLabel,
    currentMoney: summary.currentMoney,
    bankBalance: summary.bankBalance,
    cashBalance: summary.cashBalance,
    totalReceived: summary.totalReceivedInPeriod,
    actualPersonalSpending: summary.actualPersonalSpentInPeriod,
    topCategories,
    paidForOthers: summary.totalPaidForOthersInPeriod,
    reimbursed: summary.totalReimbursedInPeriod,
    stillOwedFromSplits: summary.pendingSplitReceivables,
    moneyLent: summary.totalMoneyLentInPeriod,
    repaidLoans: summary.totalLoanRepaymentsInPeriod,
    stillOutstandingLoans: summary.pendingLoanReceivables,
    totalReserved: summary.totalReserved,
    spendableMoney: summary.spendableMoney,
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
