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
 * Formats currency amount in Indian Rupee format (e.g. ₹3,200, ₹1,000.75 or −₹500.50)
 * Preserves decimals up to two decimal places if non-zero, but omits trailing .00 for whole amounts.
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const roundedCents = Math.round(absAmount * 100) / 100;
  const hasDecimals = Math.abs(roundedCents - Math.round(roundedCents)) >= 0.005;

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(roundedCents);

  return `${isNegative ? '−' : ''}₹${formatted}`;
}

/**
 * Formats local time HH:mm
 */
export function formatLocalTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Deterministically splits a total bill among N participants down to the exact paisa,
 * distributing the remainder paise to the first participants so sum(shares) === totalAmount.
 */
export function distributeEqualSplit(totalAmount: number, participantCount: number): number[] {
  if (participantCount <= 0 || totalAmount <= 0) return [];

  const totalPaise = Math.round(totalAmount * 100);
  const basePaise = Math.floor(totalPaise / participantCount);
  const remainderPaise = totalPaise % participantCount;

  const shares: number[] = [];
  for (let i = 0; i < participantCount; i++) {
    const paise = basePaise + (i < remainderPaise ? 1 : 0);
    shares.push(Math.round(paise) / 100);
  }
  return shares;
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
 * Generates reporting date ranges for a given period, including custom ranges
 */
export function getReportingDateRange(
  period: ReportingPeriod = 'THIS_MONTH',
  referenceDate: Date = new Date(),
  customRange?: { startDate: string; endDate: string }
): ReportingDateRange {
  const todayStr = formatLocalDate(referenceDate);
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed

  if (period === 'CUSTOM' && customRange?.startDate && customRange?.endDate) {
    const sDate = parseLocalDate(customRange.startDate);
    const eDate = parseLocalDate(customRange.endDate);
    const sLabel = `${sDate.getDate()} ${SHORT_MONTH_NAMES[sDate.getMonth()]} ${sDate.getFullYear()}`;
    const eLabel = `${eDate.getDate()} ${SHORT_MONTH_NAMES[eDate.getMonth()]} ${eDate.getFullYear()}`;
    return {
      key: `custom_${customRange.startDate}_${customRange.endDate}`,
      label: `${sLabel} – ${eLabel}`,
      startDate: customRange.startDate,
      endDate: customRange.endDate,
      isCurrent: true,
    };
  }

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
  let bankBalance = 0;
  let cashBalance = 0;

  for (const tx of transactions) {
    const isBank = tx.accountId === 'acc_bank' || tx.accountId === 'bank' || tx.accountId === 'acc_upi' || tx.accountId === 'upi';
    const isCash = tx.accountId === 'acc_cash' || tx.accountId === 'cash';

    switch (tx.type) {
      case 'OPENING_BALANCE':
      case 'MONEY_RECEIVED':
      case 'BORROWED_MONEY': // User physically receives borrowed cash
      case 'REIMBURSEMENT':
      case 'LOAN_REPAYMENT':
      case 'REFUND':
        if (isBank) bankBalance += tx.amount;
        else if (isCash) cashBalance += tx.amount;
        break;

      case 'EXPENSE':
      case 'SPLIT':
      case 'LENDING':
      case 'BORROW_REPAYMENT': // User physically pays back borrowed cash
        if (isBank) bankBalance -= tx.amount;
        else if (isCash) cashBalance -= tx.amount;
        break;

      case 'TRANSFER':
        if (isBank) bankBalance -= tx.amount;
        else if (isCash) cashBalance -= tx.amount;

        if (tx.toAccountId === 'acc_bank' || tx.toAccountId === 'bank') {
          bankBalance += tx.amount;
        } else if (tx.toAccountId === 'acc_cash' || tx.toAccountId === 'cash') {
          cashBalance += tx.amount;
        }
        break;

      case 'ADJUSTMENT':
        if (isBank) bankBalance += tx.amount;
        else if (isCash) cashBalance += tx.amount;
        break;
    }
  }

  const userId = baseAccounts[0]?.userId || 'student_user_1';
  const roundedBank = Math.round(bankBalance * 100) / 100;
  const roundedCash = Math.round(cashBalance * 100) / 100;

  return [
    {
      id: 'acc_bank',
      userId,
      name: 'Bank Account',
      type: 'BANK',
      balance: roundedBank,
    },
    {
      id: 'acc_cash',
      userId,
      name: 'Cash in Hand',
      type: 'CASH',
      balance: roundedCash,
    },
  ];
}

/**
 * Checks if an account has sufficient balance before spending/lending/transferring/repaying
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
 * Calculates Two-Way Person Balances & Single Net Position from transaction ledger
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
    borrowedOwed: number;
    settledTotal: number;
    lastInteractionDate?: string;
  }>();

  // Initialize for all registered people
  for (const p of personList) {
    balanceMap.set(p.id, {
      personId: p.id,
      personName: p.name,
      splitOwed: 0,
      loanOwed: 0,
      borrowedOwed: 0,
      settledTotal: 0,
      lastInteractionDate: undefined,
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
            borrowedOwed: 0,
            settledTotal: 0,
          };
          balanceMap.set(split.personId, personData);
        }
        personData.splitOwed += split.amount;
        personData.lastInteractionDate = tx.date;
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
            borrowedOwed: 0,
            settledTotal: 0,
          };
          balanceMap.set(pid, personData);
        }
        personData.loanOwed += tx.amount;
        personData.lastInteractionDate = tx.date;
      }
    }

    // 3. BORROWED_MONEY: User borrowed money from person (User liability)
    if (tx.type === 'BORROWED_MONEY' && tx.personId) {
      let personData = balanceMap.get(tx.personId);
      if (!personData) {
        personData = {
          personId: tx.personId,
          personName: tx.personName || 'Friend',
          splitOwed: 0,
          loanOwed: 0,
          borrowedOwed: 0,
          settledTotal: 0,
        };
        balanceMap.set(tx.personId, personData);
      }
      personData.borrowedOwed += tx.amount;
      personData.lastInteractionDate = tx.date;
    }

    // 4. REIMBURSEMENT: Reduces split receivables
    if (tx.type === 'REIMBURSEMENT' && tx.personId) {
      const personData = balanceMap.get(tx.personId);
      if (personData) {
        personData.splitOwed = Math.max(0, personData.splitOwed - tx.amount);
        personData.settledTotal += tx.amount;
        personData.lastInteractionDate = tx.date;
      }
    }

    // 5. LOAN_REPAYMENT: Reduces loan receivables
    if (tx.type === 'LOAN_REPAYMENT' && tx.personId) {
      const personData = balanceMap.get(tx.personId);
      if (personData) {
        personData.loanOwed = Math.max(0, personData.loanOwed - tx.amount);
        personData.settledTotal += tx.amount;
        personData.lastInteractionDate = tx.date;
      }
    }

    // 6. BORROW_REPAYMENT: User repaid borrowed money to person (Reduces user liability)
    if (tx.type === 'BORROW_REPAYMENT' && tx.personId) {
      const personData = balanceMap.get(tx.personId);
      if (personData) {
        personData.borrowedOwed = Math.max(0, personData.borrowedOwed - tx.amount);
        personData.settledTotal += tx.amount;
        personData.lastInteractionDate = tx.date;
      }
    }
  }

  return Array.from(balanceMap.values()).map(p => {
    const amountTheyOweMe = Math.round((p.splitOwed + p.loanOwed) * 100) / 100;
    const amountIOweThem = Math.round(p.borrowedOwed * 100) / 100;
    const netBalance = Math.round((amountTheyOweMe - amountIOweThem) * 100) / 100;

    let status: 'THEY_OWE_ME' | 'I_OWE_THEM' | 'SETTLED' = 'SETTLED';
    if (netBalance > 0) status = 'THEY_OWE_ME';
    else if (netBalance < 0) status = 'I_OWE_THEM';

    return {
      personId: p.personId,
      personName: p.personName,
      splitOwed: Math.round(p.splitOwed * 100) / 100,
      loanOwed: Math.round(p.loanOwed * 100) / 100,
      amountTheyOweMe,
      borrowedOwed: Math.round(p.borrowedOwed * 100) / 100,
      amountIOweThem,
      netBalance,
      status,
      settledTotal: Math.round(p.settledTotal * 100) / 100,
      lastInteractionDate: p.lastInteractionDate,
    };
  });
}

/**
 * Master Financial Overview Calculator with Two-Way Friend Positions
 */
export function calculateFinancialOverview(
  transactions: Transaction[],
  reservedList: ReservedMoney[] = [],
  period: ReportingPeriod = 'THIS_MONTH',
  referenceDate: Date = new Date(),
  customRange?: { startDate: string; endDate: string }
): FinancialOverviewSummary {
  const dateRange = getReportingDateRange(period, referenceDate, customRange);
  const todayStr = formatLocalDate(referenceDate);

  // 1. Current Physical Money
  const computedAccounts = computeAccountBalancesFromLedger(transactions);
  const bankAccount = computedAccounts.find(a => a.id === 'acc_bank') || computedAccounts[0];
  const cashAccount = computedAccounts.find(a => a.id === 'acc_cash') || computedAccounts[1];

  const bankBalance = bankAccount?.balance || 0;
  const cashBalance = cashAccount?.balance || 0;
  const currentMoney = bankBalance + cashBalance;

  // 2. Active Reserved Money
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
  let totalMoneyBorrowedInPeriod = 0;
  let totalLoanRepaymentsInPeriod = 0;
  let totalBorrowRepaymentsInPeriod = 0;

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

      case 'BORROWED_MONEY':
        totalMoneyBorrowedInPeriod += tx.amount;
        break;

      case 'REIMBURSEMENT':
        totalReimbursedInPeriod += tx.amount;
        break;

      case 'LOAN_REPAYMENT':
        totalLoanRepaymentsInPeriod += tx.amount;
        break;

      case 'BORROW_REPAYMENT':
        totalBorrowRepaymentsInPeriod += tx.amount;
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

  // Two-Way Friend Balances Across the Ledger
  const allPersonBalances = calculateAllPersonBalances(transactions, []);
  let totalMoneyOwedToYou = 0;
  let totalMoneyYouOwe = 0;

  for (const p of allPersonBalances) {
    if (p.netBalance > 0) {
      totalMoneyOwedToYou += p.netBalance;
    } else if (p.netBalance < 0) {
      totalMoneyYouOwe += Math.abs(p.netBalance);
    }
  }

  const netFriendPosition = totalMoneyOwedToYou - totalMoneyYouOwe;

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
    totalMoneyOwedToYou,
    totalMoneyYouOwe,
    netFriendPosition,
    periodLabel: dateRange.label,
    totalReceivedInPeriod,
    actualPersonalSpentInPeriod,
    totalPaidForOthersInPeriod,
    totalReimbursedInPeriod,
    totalMoneyLentInPeriod,
    totalMoneyBorrowedInPeriod,
    totalLoanRepaymentsInPeriod,
    totalBorrowRepaymentsInPeriod,
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
  period: ReportingPeriod = 'THIS_MONTH',
  customRange?: { startDate: string; endDate: string }
): WhereDidMyMoneyGoReport {
  const summary = calculateFinancialOverview(transactions, reservedList, period, new Date(), customRange);

  const topCategories = summary.categorySpending.slice(0, 3);
  const topCatListText = topCategories.length > 0
    ? topCategories.map(c => `${c.category} (${formatINR(c.amount)})`).join(', ')
    : 'No expenses recorded';

  const reservedText = summary.totalReserved > 0
    ? ` You have set aside ${formatINR(summary.totalReserved)} in reserved funds.`
    : '';

  const summaryParagraph = `During ${summary.periodLabel}, you received ${formatINR(summary.totalReceivedInPeriod)} in total money. You currently have ${formatINR(summary.currentMoney)} in total physical cash (${formatINR(summary.bankBalance)} in Bank, ${formatINR(summary.cashBalance)} in Cash).${reservedText} You personally spent ${formatINR(summary.actualPersonalSpentInPeriod)}, primarily on ${topCatListText}. You paid ${formatINR(summary.totalPaidForOthersInPeriod)} on behalf of friends (${formatINR(summary.totalReimbursedInPeriod)} reimbursed) and lent ${formatINR(summary.totalMoneyLentInPeriod)} (${formatINR(summary.totalLoanRepaymentsInPeriod)} repaid). Friends currently owe you ${formatINR(summary.totalMoneyOwedToYou)}, and you owe others ${formatINR(summary.totalMoneyYouOwe)}. You have ${formatINR(summary.spendableMoney)} spendable money available right now.`;

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
    stillOwedFromSplits: summary.totalMoneyOwedToYou,
    moneyLent: summary.totalMoneyLentInPeriod,
    repaidLoans: summary.totalLoanRepaymentsInPeriod,
    stillOutstandingLoans: summary.totalMoneyYouOwe,
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
