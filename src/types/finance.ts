export type TransactionType =
  | 'EXPENSE'
  | 'SPLIT'
  | 'LENDING'
  | 'MONEY_RECEIVED'
  | 'REIMBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'REFUND'
  | 'TRANSFER';

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
  date: string; // ISO string YYYY-MM-DD
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
  accountId: string; // 'bank' | 'cash' | 'upi'
  toAccountId?: string; // For TRANSFER
  
  // Metadata & Links
  status: TransactionStatus;
  linkedTransactionId?: string; // Links repayment/reimbursement back to original loan/split
  isMonthlyBudget?: boolean; // When MONEY_RECEIVED is designated as the monthly budget
  monthlyBudgetId?: string; // "YYYY-MM"
  
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
  id: string; // e.g. "2026-09"
  userId: string;
  yearMonth: string; // "2026-09"
  totalBudget: number;
  allocations: Record<string, number>; // category -> budget amount
  notes?: string;
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

export interface MonthlyFinancialSummary {
  yearMonth: string; // "YYYY-MM"
  monthName: string;
  totalBudget: number;
  totalReceived: number;
  actualPersonalSpent: number;
  leftToSpend: number;
  
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
  
  // Cash vs Budget separation
  totalPhysicalCashBalance: number;
  
  // Pace & Forecasting
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  dailySpendingPace: number; // ₹/day so far
  recommendedDailyPace: number; // ₹/day remaining to stay within budget
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
  
  // Today and This Week
  todaySpent: number;
  thisWeekSpent: number;
}

export interface WhereDidMyMoneyGoReport {
  yearMonth: string;
  monthName: string;
  totalReceived: number;
  actualPersonalSpending: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  paidForOthers: number;
  reimbursed: number;
  stillOwedFromSplits: number;
  moneyLent: number;
  repaidLoans: number;
  stillOutstandingLoans: number;
  remainingBudget: number;
  summaryParagraph: string;
}
