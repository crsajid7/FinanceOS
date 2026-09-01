export type TransactionType =
  | 'EXPENSE'
  | 'SPLIT'
  | 'LENDING'
  | 'MONEY_RECEIVED'
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
  
  // Account/wallet reference
  accountId: string; // 'acc_bank' | 'acc_cash' | 'acc_upi'
  toAccountId?: string; // For TRANSFER
  
  // Metadata & Links
  status: TransactionStatus;
  linkedTransactionId?: string; // Links repayment/reimbursement back to original loan/split
  isMonthlyBudget?: boolean; // When MONEY_RECEIVED is designated as budget for the cycle
  budgetCycleKey?: string; // e.g. "2026-09-05_2026-10-04"
  monthlyBudgetId?: string; // Legacy fallback
  
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

export interface CategoryAllocation {
  category: string;
  allocatedAmount: number;
}

export interface MonthlyBudget {
  id: string; // e.g. "2026-09" or cycle key
  userId: string;
  yearMonth: string; // e.g. "2026-09"
  totalBudget: number;
  allocations: Record<string, number>; // category -> budget amount
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReservedMoney {
  id: string;
  userId: string;
  amount: number;
  purpose: string; // e.g. "PG Rent", "Bus Pass", "College Fee"
  dueDate?: string; // YYYY-MM-DD
  isFulfilled: boolean;
  fulfilledDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'BANK' | 'CASH' | 'WALLET';
  balance: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currency: string;
  defaultMonthlyBudget: number;
  budgetCycleStartDay: number; // 1 to 28, default 5 (i.e. 5th of every month)
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

export interface BudgetCycleRange {
  cycleKey: string; // e.g. "2026-09-05_2026-10-04"
  label: string;    // e.g. "Sep 5 → Oct 4"
  shortLabel: string; // e.g. "Sep 5 – Oct 4, 2026"
  startDate: string; // "2026-09-05"
  endDate: string;   // "2026-10-04"
  startDay: number;
  year: number;
  month: number;
  isCurrent: boolean;
  totalDays: number;
  currentDayIndex: number;
  daysRemaining: number;
}

export interface MonthlyFinancialSummary {
  yearMonth: string; // "YYYY-MM"
  monthName: string;
  cycle: BudgetCycleRange;
  
  totalBudget: number;
  totalReceived: number;
  actualPersonalSpent: number;
  
  // Reserved & Spendable
  totalReserved: number;
  spendableMoney: number; // totalBudget - totalReserved - actualPersonalSpent (can be negative if over budget)
  leftToSpend: number;    // Spendable money
  isOverBudget: boolean;
  overBudgetAmount: number;
  
  // Friends breakdown
  totalPaidForOthers: number;
  totalReimbursed: number;
  pendingSplitReceivables: number;
  
  // Lending breakdown
  totalMoneyLent: number;
  totalLoanRepayments: number;
  pendingLoanReceivables: number;
  
  // Overall Receivables
  totalMoneyOwedToYou: number;
  
  // Physical Cash
  totalPhysicalCashBalance: number;
  
  // Pace & Forecasting
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  dailySpendingPace: number; // ₹/day so far
  recommendedDailyPace: number; // ₹/day remaining
  paceStatus: 'ON_TRACK' | 'SLIGHTLY_FAST' | 'OVERSPENDING' | 'AHEAD_OF_BUDGET';
  paceMessage: string;
  estimatedRemainingAtCurrentPace: number;
  
  // Category Breakdown
  categorySpending: {
    category: string;
    amount: number;
    percentage: number;
    allocatedBudget?: number;
  }[];
  
  // Today and Rolling 7 Days
  todaySpent: number;
  thisWeekSpent: number; // Rolling last 7 days
}

export interface WhereDidMyMoneyGoReport {
  yearMonth: string;
  monthName: string;
  cycleLabel: string;
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
  remainingBudget: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  summaryParagraph: string;
}

export interface ExportDataPayload {
  version: number;
  exportedAt: string;
  user: UserProfile;
  accounts: Account[];
  transactions: Transaction[];
  people: Person[];
  budgets: MonthlyBudget[];
  reservedMoney: ReservedMoney[];
}
