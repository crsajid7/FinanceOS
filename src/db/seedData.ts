import {
  UserProfile,
  Person,
  Account,
  Transaction,
  ReservedMoney,
} from '../types/finance';

export const DEMO_USER: UserProfile = {
  id: 'student_user_1',
  name: 'Student User',
  email: 'student@financeos.app',
  currency: '₹',
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
    id: 'acc_bank',
    userId: DEMO_USER.id,
    name: 'Bank Account',
    type: 'BANK',
    balance: 0,
  },
  {
    id: 'acc_cash',
    userId: DEMO_USER.id,
    name: 'Cash in Hand',
    type: 'CASH',
    balance: 0,
  },
];

export const DEMO_RESERVED_MONEY: ReservedMoney[] = [];

export function getDemoTransactions(): Transaction[] {
  // Fresh clean slate reset to 0
  return [];
}
