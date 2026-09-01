import Dexie, { Table } from 'dexie';
import {
  Transaction,
  Person,
  MonthlyBudget,
  Account,
  UserProfile,
  ReservedMoney,
} from '../types/finance';

export class FinanceOSDatabase extends Dexie {
  users!: Table<UserProfile, string>;
  transactions!: Table<Transaction, string>;
  people!: Table<Person, string>;
  monthlyBudgets!: Table<MonthlyBudget, string>;
  accounts!: Table<Account, string>;
  reservedMoney!: Table<ReservedMoney, string>;

  constructor() {
    super('FinanceOSDB');

    this.version(1).stores({
      users: 'id, email',
      transactions: 'id, userId, type, date, category, personId, status, monthlyBudgetId',
      people: 'id, userId, name',
      monthlyBudgets: 'id, userId, yearMonth',
      accounts: 'id, userId, type',
    });

    this.version(2).stores({
      users: 'id, email',
      transactions: 'id, userId, type, date, category, personId, status, budgetCycleKey, monthlyBudgetId',
      people: 'id, userId, name',
      monthlyBudgets: 'id, userId, yearMonth',
      accounts: 'id, userId, type',
      reservedMoney: 'id, userId, isFulfilled, dueDate',
    });
  }
}

export const db = new FinanceOSDatabase();
