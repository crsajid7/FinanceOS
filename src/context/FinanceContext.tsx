import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Transaction,
  Account,
  ReservedMoney,
  Person,
  PersonBalanceSummary,
  FinancialOverviewSummary,
  WhereDidMyMoneyGoReport,
  ReportingPeriod,
  ExportDataPayload,
  MoneyLocationId,
} from '../types/finance';
import { db } from '../db/database';
import { useAuth } from './AuthContext';
import {
  calculateFinancialOverview,
  calculateAllPersonBalances,
  generateWhereDidMyMoneyGo,
  computeAccountBalancesFromLedger,
  formatLocalDate,
  checkSufficientBalance,
} from '../services/accountingEngine';

export type AddTransactionInput = Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status' | 'date' | 'time'> & {
  date?: string;
  time?: string;
};

interface FinanceContextType {
  // Primary State
  transactions: Transaction[];
  accounts: Account[];
  reservedMoney: ReservedMoney[];
  people: Person[];
  personBalances: PersonBalanceSummary[];
  overview: FinancialOverviewSummary;
  whereDidMyMoneyGo: WhereDidMyMoneyGoReport;

  // Reporting Period
  selectedPeriod: ReportingPeriod;
  setSelectedPeriod: (period: ReportingPeriod) => void;

  // Transaction Operations
  addTransaction: (tx: AddTransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Two-Way Friend & Settlement Actions
  recordBorrowedMoney: (amount: number, personId: string, personName: string, accountId: MoneyLocationId, note?: string, date?: string) => Promise<Transaction>;
  recordBorrowRepayment: (amount: number, personId: string, personName: string, accountId: MoneyLocationId, note?: string, date?: string) => Promise<Transaction>;
  recordReimbursement: (amount: number, personId: string, personName: string, accountId: MoneyLocationId, note?: string, date?: string) => Promise<Transaction>;
  recordLoanRepayment: (amount: number, personId: string, personName: string, accountId: MoneyLocationId, note?: string, date?: string) => Promise<Transaction>;

  // Transfer & Opening Balance
  transferMoney: (amount: number, fromAccountId: MoneyLocationId, toAccountId: MoneyLocationId, note?: string) => Promise<Transaction>;
  recordTransfer: (amount: number, fromAccountId: MoneyLocationId, toAccountId: MoneyLocationId, note?: string) => Promise<Transaction>;
  setOpeningBalance: (bankAmount: number, cashAmount: number) => Promise<void>;
  recordOpeningBalance: (bankAmount: number, cashAmount: number) => Promise<void>;

  // Cash Adjustment
  recordCashAdjustment: (actualAmount: number, accountId: MoneyLocationId, reason?: string) => Promise<Transaction>;

  // Reserved Money Operations
  addReservation: (amount: number, purpose: string, dueDate?: string) => Promise<ReservedMoney>;
  toggleReservationFulfilled: (id: string) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;

  // People Operations
  addPerson: (name: string, phone?: string) => Promise<Person>;
  ensurePerson: (name: string, phone?: string) => Promise<Person>;
  deletePerson: (id: string) => Promise<void>;

  // Balance Guard Helper
  verifyBalance: (accountId: string, amount: number) => { hasSufficient: boolean; currentBalance: number; missingAmount: number; accountName: string };

  // Data Export & Import
  exportAllData: () => Promise<string>;
  importAllData: (jsonData: string) => Promise<boolean>;
  clearData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userId = currentUser.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservedMoney, setReservedMoney] = useState<ReservedMoney[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>('THIS_MONTH');

  // Load user data reactively from Dexie IndexedDB
  const loadUserData = useCallback(async () => {
    try {
      const [txList, resList, personList] = await Promise.all([
        db.transactions.where('userId').equals(userId).toArray(),
        db.reservedMoney.where('userId').equals(userId).toArray(),
        db.people.where('userId').equals(userId).toArray(),
      ]);

      // Sort transactions descending by date & time
      txList.sort((a, b) => {
        return new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      });

      setTransactions(txList);
      setReservedMoney(resList);
      setPeople(personList);
    } catch (err) {
      console.error('Failed to load user financial data:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Derived Account Balances (SINGLE SOURCE OF TRUTH FROM LEDGER)
  const accounts = useMemo(() => {
    return computeAccountBalancesFromLedger(transactions);
  }, [transactions]);

  // Derived Two-Way Person Balances & Single Net Positions
  const personBalances = useMemo(() => {
    return calculateAllPersonBalances(transactions, people);
  }, [transactions, people]);

  // Derived Master Overview & Where Did My Money Go
  const overview = useMemo(() => {
    return calculateFinancialOverview(transactions, reservedMoney, selectedPeriod);
  }, [transactions, reservedMoney, selectedPeriod]);

  const whereDidMyMoneyGo = useMemo(() => {
    return generateWhereDidMyMoneyGo(transactions, reservedMoney, selectedPeriod);
  }, [transactions, reservedMoney, selectedPeriod]);

  const verifyBalance = useCallback((accountId: string, amount: number) => {
    return checkSufficientBalance(accountId, amount, accounts);
  }, [accounts]);

  // Ensure Person exists without duplicates (case-insensitive match & auto-creation)
  const ensurePerson = useCallback(async (name: string, phone?: string): Promise<Person> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Person name cannot be empty');

    const normalized = trimmed.toLowerCase();

    // 1. Look up in state
    const existingInState = people.find(p => p.name.trim().toLowerCase() === normalized);
    if (existingInState) {
      return existingInState;
    }

    // 2. Query Dexie table directly
    const existingInDb = await db.people
      .where('userId')
      .equals(userId)
      .filter(p => p.name.trim().toLowerCase() === normalized)
      .first();

    if (existingInDb) {
      return existingInDb;
    }

    // 3. Create new person in Dexie
    const newPerson: Person = {
      id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      name: trimmed,
      phone: phone?.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.people.add(newPerson);
    setPeople(prev => [...prev, newPerson]);
    return newPerson;
  }, [people, userId]);

  // Add Person (alias with duplicate prevention)
  const addPerson = useCallback(async (name: string, phone?: string): Promise<Person> => {
    return ensurePerson(name, phone);
  }, [ensurePerson]);

  const deletePerson = async (id: string) => {
    await db.people.delete(id);
    await loadUserData();
  };

  // Add Transaction (with automatic person resolution and atomic person creation)
  const addTransaction = async (
    txData: AddTransactionInput
  ): Promise<Transaction> => {
    const now = new Date();

    // Auto-resolve split participants
    let resolvedSplits = txData.splits;
    if (txData.type === 'SPLIT' && txData.splits && txData.splits.length > 0) {
      resolvedSplits = await Promise.all(
        txData.splits.map(async (s) => {
          let pid = s.personId;
          let pname = s.personName?.trim() || '';
          if (!pid || pid === '') {
            const p = await ensurePerson(pname);
            pid = p.id;
            pname = p.name;
          }
          return {
            ...s,
            personId: pid,
            personName: pname,
          };
        })
      );
    }

    // Auto-resolve main person reference (Lending, Borrowed Money, etc.)
    let resolvedPersonId = txData.personId;
    let resolvedPersonName = txData.personName;
    let resolvedLoanDetails = txData.loanDetails;

    if (txData.personName && (!resolvedPersonId || resolvedPersonId === '')) {
      const p = await ensurePerson(txData.personName);
      resolvedPersonId = p.id;
      resolvedPersonName = p.name;
      if (resolvedLoanDetails) {
        resolvedLoanDetails = {
          ...resolvedLoanDetails,
          personId: p.id,
          personName: p.name,
        };
      }
    }

    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      personId: resolvedPersonId,
      personName: resolvedPersonName,
      splits: resolvedSplits,
      loanDetails: resolvedLoanDetails,
      date: txData.date || formatLocalDate(now),
      time: txData.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      status: 'ACTIVE',
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    await db.transactions.add(newTx);
    await loadUserData();
    return newTx;
  };

  // Update Transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const existing = await db.transactions.get(id);
    if (!existing) return;

    const updatedTx: Transaction = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.transactions.put(updatedTx);
    await loadUserData();
  };

  // Delete Transaction
  const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
    await loadUserData();
  };

  // 1. Record Borrowed Money
  const recordBorrowedMoney = async (
    amount: number,
    personId: string,
    personName: string,
    accountId: MoneyLocationId,
    note?: string,
    date?: string
  ): Promise<Transaction> => {
    return addTransaction({
      type: 'BORROWED_MONEY',
      amount,
      category: 'Other',
      personId,
      personName,
      accountId,
      note: note || `Borrowed from ${personName}`,
      date: date || formatLocalDate(),
      time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    });
  };

  // 2. Record Borrow Repayment
  const recordBorrowRepayment = async (
    amount: number,
    personId: string,
    personName: string,
    accountId: MoneyLocationId,
    note?: string,
    date?: string
  ): Promise<Transaction> => {
    return addTransaction({
      type: 'BORROW_REPAYMENT',
      amount,
      category: 'Other',
      personId,
      personName,
      accountId,
      note: note || `Repaid borrowed money to ${personName}`,
      date: date || formatLocalDate(),
      time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    });
  };

  // 3. Record Reimbursement
  const recordReimbursement = async (
    amount: number,
    personId: string,
    personName: string,
    accountId: MoneyLocationId,
    note?: string,
    date?: string
  ): Promise<Transaction> => {
    return addTransaction({
      type: 'REIMBURSEMENT',
      amount,
      category: 'Other',
      personId,
      personName,
      accountId,
      note: note || `Split reimbursement from ${personName}`,
      date: date || formatLocalDate(),
      time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    });
  };

  // 4. Record Loan Repayment
  const recordLoanRepayment = async (
    amount: number,
    personId: string,
    personName: string,
    accountId: MoneyLocationId,
    note?: string,
    date?: string
  ): Promise<Transaction> => {
    return addTransaction({
      type: 'LOAN_REPAYMENT',
      amount,
      category: 'Other',
      personId,
      personName,
      accountId,
      note: note || `Loan repayment from ${personName}`,
      date: date || formatLocalDate(),
      time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    });
  };

  // Transfer Money between Bank and Cash
  const transferMoney = async (
    amount: number,
    fromAccountId: MoneyLocationId,
    toAccountId: MoneyLocationId,
    note?: string
  ): Promise<Transaction> => {
    return addTransaction({
      type: 'TRANSFER',
      amount,
      category: 'Other',
      accountId: fromAccountId,
      toAccountId,
      note: note || `Transfer: ${fromAccountId === 'acc_bank' ? 'Bank to Cash' : 'Cash to Bank'}`,
      date: formatLocalDate(),
      time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    });
  };

  // Set Opening Balance
  const setOpeningBalance = async (bankAmount: number, cashAmount: number) => {
    const existingOpeningTxs = await db.transactions
      .where('userId')
      .equals(userId)
      .filter(tx => tx.type === 'OPENING_BALANCE')
      .toArray();

    for (const tx of existingOpeningTxs) {
      await db.transactions.delete(tx.id);
    }

    if (bankAmount > 0) {
      await addTransaction({
        type: 'OPENING_BALANCE',
        amount: bankAmount,
        category: 'Other',
        accountId: 'acc_bank',
        note: 'Starting Bank balance',
        date: formatLocalDate(),
        time: '00:00',
      });
    }

    if (cashAmount > 0) {
      await addTransaction({
        type: 'OPENING_BALANCE',
        amount: cashAmount,
        category: 'Other',
        accountId: 'acc_cash',
        note: 'Starting Cash in Hand',
        date: formatLocalDate(),
        time: '00:00',
      });
    }
  };

  // Record Cash Adjustment
  const recordCashAdjustment = async (
    actualAmount: number,
    accountId: MoneyLocationId,
    reason?: string
  ): Promise<Transaction> => {
    const acc = accounts.find(a => a.id === accountId) || accounts[0];
    const diff = actualAmount - acc.balance;

    return addTransaction({
      type: 'ADJUSTMENT',
      amount: diff,
      category: 'Other',
      accountId,
      note: reason || `Cash reconciliation: adjusted by ${diff >= 0 ? '+' : ''}${diff}`,
      date: formatLocalDate(),
      time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    });
  };

  // Add Reservation
  const addReservation = async (
    amount: number,
    purpose: string,
    dueDate?: string
  ): Promise<ReservedMoney> => {
    const newRes: ReservedMoney = {
      id: `res_${Date.now()}`,
      userId,
      amount,
      purpose,
      dueDate,
      isFulfilled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.reservedMoney.add(newRes);
    await loadUserData();
    return newRes;
  };

  const toggleReservationFulfilled = async (id: string) => {
    const res = await db.reservedMoney.get(id);
    if (!res) return;
    await db.reservedMoney.update(id, {
      isFulfilled: !res.isFulfilled,
      fulfilledDate: !res.isFulfilled ? formatLocalDate() : undefined,
      updatedAt: Date.now(),
    });
    await loadUserData();
  };

  const deleteReservation = async (id: string) => {
    await db.reservedMoney.delete(id);
    await loadUserData();
  };

  // Export All Data
  const exportAllData = async (): Promise<string> => {
    const payload: ExportDataPayload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      user: currentUser,
      accounts,
      transactions,
      people,
      reservedMoney,
    };
    return JSON.stringify(payload, null, 2);
  };

  // Import All Data
  const importAllData = async (jsonData: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonData) as ExportDataPayload;
      if (!parsed.user || !Array.isArray(parsed.transactions)) {
        return false;
      }

      await db.transactions.where('userId').equals(userId).delete();
      await db.people.where('userId').equals(userId).delete();
      await db.reservedMoney.where('userId').equals(userId).delete();

      if (parsed.transactions.length > 0) {
        await db.transactions.bulkAdd(parsed.transactions.map(t => ({ ...t, userId })));
      }
      if (parsed.people && parsed.people.length > 0) {
        await db.people.bulkAdd(parsed.people.map(p => ({ ...p, userId })));
      }
      if (parsed.reservedMoney && parsed.reservedMoney.length > 0) {
        await db.reservedMoney.bulkAdd(parsed.reservedMoney.map(r => ({ ...r, userId })));
      }

      await loadUserData();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  };

  // Reset to Zero
  const clearData = async () => {
    await db.transactions.where('userId').equals(userId).delete();
    await db.people.where('userId').equals(userId).delete();
    await db.reservedMoney.where('userId').equals(userId).delete();
    await loadUserData();
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        accounts,
        reservedMoney,
        people,
        personBalances,
        overview,
        whereDidMyMoneyGo,
        selectedPeriod,
        setSelectedPeriod,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        recordBorrowedMoney,
        recordBorrowRepayment,
        recordReimbursement,
        recordLoanRepayment,
        transferMoney,
        recordTransfer: transferMoney,
        setOpeningBalance,
        recordOpeningBalance: setOpeningBalance,
        recordCashAdjustment,
        addReservation,
        toggleReservationFulfilled,
        deleteReservation,
        addPerson,
        ensurePerson,
        deletePerson,
        verifyBalance,
        exportAllData,
        importAllData,
        clearData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
