import Dexie, { Table } from 'dexie';
import {
  Transaction,
  Person,
  MonthlyBudget,
  Account,
  UserProfile,
} from '../types/finance';

export class FinanceOSDatabase extends Dexie {
  users!: Table<UserProfile, string>;
  transactions!: Table<Transaction, string>;
  people!: Table<Person, string>;
  monthlyBudgets!: Table<MonthlyBudget, string>;
  accounts!: Table<Account, string>;

  constructor() {
    super('FinanceOSDB');

    this.version(1).stores({
      users: 'id, email',
      transactions: 'id, userId, type, date, category, personId, status, monthlyBudgetId',
      people: 'id, userId, name',
      monthlyBudgets: 'id, userId, yearMonth',
      accounts: 'id, userId, type',
    });
  }
}

export const db = new FinanceOSDatabase();
