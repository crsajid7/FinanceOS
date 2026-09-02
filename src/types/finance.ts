export type TransactionType =
  | 'OPENING_BALANCE'
  | 'MONEY_RECEIVED'
  | 'EXPENSE'
  | 'SPLIT'
  | 'LENDING'
  | 'REIMBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'REFUND'
  | 'TRANSFER'
  | 'ADJUSTMENT';

export type TransactionStatus = 'ACTIVE' | 'SETTLED' | 'PARTIALLY_SETTLED' | 'CANCELLED';

export type StandardCategory =
  | 'Food'
  | 'Groceries'
  | 'Transport'
  | 'College'
  | 'Entertainment'
  | 'Personal'
  | 'Rent'
  | 'Other';

export interface SplitParticipant {
  personId: string;
  personName: string;
  amount: number;
  settledAmount: number;
  isSettled: boolean;
  settledDate?: string;
}

export interface LoanDetails {
  personId: string;
  personName: string;
  expectedDate?: string;
  repaidAmount: number;
  isSettled: boolean;
  settledDate?: string;
}

export type MoneyLocationId = 'acc_bank' | 'acc_cash';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // Total transaction amount
  userShare?: number; // In SPLIT, the user's actual personal portion
  category: string; // StandardCategory or custom category
  date: string; // YYYY-MM-DD in local time
  time: string; // HH:mm (24h)
  note?: string;
  
  // Person references
  personId?: string; // For LENDING, REIMBURSEMENT, LOAN_REPAYMENT
  personName?: string;
  
  // Multiple split details
  splits?: SplitParticipant[];
  
  // Lending details
  loanDetails?: LoanDetails;
  
  // Account/money location reference (Strictly 'acc_bank' | 'acc_cash')
  accountId: MoneyLocationId | string;
  toAccountId?: MoneyLocationId | string; // For TRANSFER
  
  // Metadata & Links
  status: TransactionStatus;
  linkedTransactionId?: string; // Links repayment/reimbursement back to original loan/split
  source?: string; // e.g. Dad, Mom, Salary for MONEY_RECEIVED
  
  createdAt: number;
  updatedAt: number;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  avatarColor?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReservedMoney {
  id: string;
  userId: string;
  amount: number;
  purpose: string; // e.g. "PG Rent", "Bus Pass", "Exam Fee"
  dueDate?: string; // YYYY-MM-DD
  isFulfilled: boolean;
  fulfilledDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Account {
  id: MoneyLocationId | string;
  userId: string;
  name: string; // "Bank Account" | "Cash in Hand"
  type: 'BANK' | 'CASH';
  balance: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currency: string;
  theme: 'dark' | 'light';
  customCategories: string[];
}

export interface PersonBalanceSummary {
  personId: string;
  personName: string;
  splitOwed: number; // Owed from shared expenses
  loanOwed: number;  // Owed from direct loans
  totalOwed: number; // splitOwed + loanOwed
  settledTotal: number;
  lastInteractionDate?: string;
}

export type ReportingPeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS' | 'TODAY' | 'ALL_TIME';

export interface ReportingDateRange {
  key: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isCurrent: boolean;
}

export interface FinancialOverviewSummary {
  // Current Physical Money (Fundamental equation: Bank + Cash)
  bankBalance: number;
  cashBalance: number;
  currentMoney: number; // bankBalance + cashBalance
  
  // Reserved & Spendable
  totalReserved: number;
  spendableMoney: number; // currentMoney - totalReserved
  
  // Receivables (NOT in current money)
  pendingSplitReceivables: number;
  pendingLoanReceivables: number;
  totalMoneyOwedToYou: number;
  
  // Period flows (e.g. This Month)
  periodLabel: string;
  totalReceivedInPeriod: number; // Actual inflows during period (excludes opening balances)
  actualPersonalSpentInPeriod: number;
  totalPaidForOthersInPeriod: number;
  totalReimbursedInPeriod: number;
  totalMoneyLentInPeriod: number;
  totalLoanRepaymentsInPeriod: number;
  
  // Today and Rolling 7 Days
  todaySpent: number;
  last7DaysSpent: number;
  
  // Category breakdown for period
  categorySpending: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface WhereDidMyMoneyGoReport {
  periodLabel: string;
  currentMoney: number;
  bankBalance: number;
  cashBalance: number;
  totalReceived: number;
  actualPersonalSpending: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  paidForOthers: number;
  reimbursed: number;
  stillOwedFromSplits: number;
  moneyLent: number;
  repaidLoans: number;
  stillOutstandingLoans: number;
  totalReserved: number;
  spendableMoney: number;
  summaryParagraph: string;
}

export interface ExportDataPayload {
  version: number;
  exportedAt: string;
  user: UserProfile;
  accounts: Account[];
  transactions: Transaction[];
  people: Person[];
  reservedMoney: ReservedMoney[];
}
