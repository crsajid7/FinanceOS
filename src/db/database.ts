import Dexie, { Table } from 'dexie';
import {
  Transaction,
  Person,
  Account,
  UserProfile,
  ReservedMoney,
} from '../types/finance';

export class FinanceOSDatabase extends Dexie {
  users!: Table<UserProfile, string>;
  transactions!: Table<Transaction, string>;
  people!: Table<Person, string>;
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

    this.version(3).stores({
      users: 'id, email',
      transactions: 'id, userId, type, date, category, personId, accountId, status',
      people: 'id, userId, name',
      accounts: 'id, userId, type',
      reservedMoney: 'id, userId, isFulfilled, dueDate',
    }).upgrade(async tx => {
      // Migrate old account IDs (e.g. 'acc_upi' -> 'acc_bank')
      const transactionsTable = tx.table('transactions');
      await transactionsTable.toCollection().modify((t: any) => {
        if (t.accountId === 'acc_upi' || t.accountId === 'upi') {
          t.accountId = 'acc_bank';
        } else if (t.accountId === 'cash') {
          t.accountId = 'acc_cash';
        } else if (t.accountId === 'bank') {
          t.accountId = 'acc_bank';
        }
        if (t.toAccountId === 'acc_upi' || t.toAccountId === 'upi') {
          t.toAccountId = 'acc_bank';
        }
      });
    });
  }
}

export const db = new FinanceOSDatabase();
