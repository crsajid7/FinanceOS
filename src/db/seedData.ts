import {
  UserProfile,
  Person,
  MonthlyBudget,
  Account,
  Transaction,
} from '../types/finance';

export const DEMO_USER: UserProfile = {
  id: 'student_user_1',
  name: 'Student User',
  email: 'student@financeos.app',
  currency: '₹',
  defaultMonthlyBudget: 0,
  theme: 'light',
  customCategories: ['Food', 'Groceries', 'Transport', 'College', 'Entertainment', 'Personal', 'Rent', 'Other'],
};

export const DEMO_PEOPLE: Person[] = [
  {
    id: 'person_karthick',
    userId: DEMO_USER.id,
    name: 'Karthick',
    phone: '+91 98765 43210',
    avatarColor: 'bg-emerald-500',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'person_hemanth',
    userId: DEMO_USER.id,
    name: 'Hemanth',
    phone: '+91 98765 12345',
    avatarColor: 'bg-indigo-500',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: 'acc_upi',
    userId: DEMO_USER.id,
    name: 'GPay / UPI',
    type: 'WALLET',
    balance: 0,
  },
  {
    id: 'acc_bank',
    userId: DEMO_USER.id,
    name: 'Primary Bank',
    type: 'BANK',
    balance: 0,
  },
  {
    id: 'acc_cash',
    userId: DEMO_USER.id,
    name: 'Cash',
    type: 'CASH',
    balance: 0,
  },
];

export function getDemoBudgets(currentYearMonth: string): MonthlyBudget[] {
  return [
    {
      id: currentYearMonth,
      userId: DEMO_USER.id,
      yearMonth: currentYearMonth,
      totalBudget: 0,
      allocations: {},
      notes: 'Monthly budget',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

export function getDemoTransactions(_currentYearMonth: string): Transaction[] {
  // Fresh clean slate reset to 0
  return [];
}
