import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  Person,
  Account,
  FinancialOverviewSummary,
  PersonBalanceSummary,
  WhereDidMyMoneyGoReport,
  TransactionType,
  ReservedMoney,
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
  checkSufficientBalance,
  formatLocalDate,
} from '../services/accountingEngine';
import {
  DEMO_PEOPLE,
  DEMO_ACCOUNTS,
  getDemoTransactions,
} from '../db/seedData';

interface AddTransactionPayload {
  type: TransactionType;
  amount: number;
  userShare?: number;
  category: string;
  date?: string;
  time?: string;
  note?: string;
  source?: string;
  personId?: string;
  personName?: string;
  splits?: { personId: string; personName: string; amount: number }[];
  expectedDate?: string;
  accountId: MoneyLocationId | string; // 'acc_bank' | 'acc_cash'
  toAccountId?: MoneyLocationId | string; // For TRANSFER
  linkedTransactionId?: string;
}

interface FinanceContextType {
  // Reporting Period
  selectedPeriod: ReportingPeriod;
  setSelectedPeriod: (period: ReportingPeriod) => void;

  // Entities
  transactions: Transaction[];
  people: Person[];
  accounts: Account[];
  reservedMoney: ReservedMoney[];
  overview: FinancialOverviewSummary;
  summary: FinancialOverviewSummary; // Backwards-compatible alias for overview
  personBalances: PersonBalanceSummary[];
  whereDidMyMoneyGo: WhereDidMyMoneyGoReport;
  isLoading: boolean;

  // Actions
  addTransaction: (payload: AddTransactionPayload) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPerson: (name: string, phone?: string) => Promise<Person>;
  settleFriendSplit: (personId: string, amount: number, accountId?: MoneyLocationId, note?: string) => Promise<void>;
  recordLoanRepaymentDirect: (personId: string, amount: number, accountId?: MoneyLocationId, note?: string) => Promise<void>;
  
  // Transfer
  recordTransfer: (amount: number, fromAccountId: MoneyLocationId, toAccountId: MoneyLocationId, note?: string) => Promise<Transaction>;
  
  // Opening Balance
  recordOpeningBalance: (bankAmount: number, cashAmount: number) => Promise<void>;

  // Reserved Money
  addReservation: (amount: number, purpose: string, dueDate?: string) => Promise<ReservedMoney>;
  toggleReservationFulfilled: (id: string) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;

  // Cash Adjustment / Reconciliation
  recordCashAdjustment: (actualAmount: number, accountId: MoneyLocationId, reason?: string) => Promise<Transaction>;

  // Negative balance checker
  verifyBalance: (accountId: string, amount: number) => { hasSufficient: boolean; currentBalance: number; missingAmount: number; accountName: string };

  // Backup & Reset
  exportAllData: () => Promise<string>;
  importAllData: (jsonStr: string) => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  clearData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode } = useAuth();
  
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>('THIS_MONTH');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [reservedMoney, setReservedMoney] = useState<ReservedMoney[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user data from IndexedDB
  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userTx = await db.transactions.where('userId').equals(currentUser.id).toArray();
      const userPeople = await db.people.where('userId').equals(currentUser.id).toArray();
      const userReserved = await db.reservedMoney.where('userId').equals(currentUser.id).toArray();

      if (isDemoMode && userTx.length === 0 && userPeople.length === 0) {
        // Seed initial clean state
        const demoPeople = DEMO_PEOPLE;
        const demoAccounts = DEMO_ACCOUNTS;
        const demoTx = getDemoTransactions();

        await db.people.bulkPut(demoPeople);
        await db.accounts.bulkPut(demoAccounts);
        await db.transactions.bulkPut(demoTx);

        setPeople(demoPeople);
        setAccounts(demoAccounts);
        setTransactions(demoTx);
        setReservedMoney([]);
      } else {
        // Compute exact single-source-of-truth balances from transaction ledger
        const reconciledAccounts = computeAccountBalancesFromLedger(userTx, DEMO_ACCOUNTS);

        setTransactions(userTx);
        setPeople(userPeople);
        setAccounts(reconciledAccounts);
        setReservedMoney(userReserved);
      }
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isDemoMode]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Derived Account Balances (Single source of truth)
  const computedAccounts = useMemo(() => {
    return computeAccountBalancesFromLedger(transactions, accounts);
  }, [transactions, accounts]);

  // Master Financial Overview Calculation
  const overview = useMemo(() => {
    return calculateFinancialOverview(transactions, reservedMoney, selectedPeriod);
  }, [transactions, reservedMoney, selectedPeriod]);

  // Reactive Person Balances (Splits vs Loans)
  const personBalances = useMemo(() => {
    return calculateAllPersonBalances(transactions, people);
  }, [transactions, people]);

  // Reactive Story Report
  const whereDidMyMoneyGo = useMemo(() => {
    return generateWhereDidMyMoneyGo(transactions, reservedMoney, selectedPeriod);
  }, [transactions, reservedMoney, selectedPeriod]);

  // Verify balance before deducting
  const verifyBalance = useCallback((accountId: string, amount: number) => {
    return checkSufficientBalance(accountId, amount, computedAccounts);
  }, [computedAccounts]);

  // Add Person
  const addPerson = async (name: string, phone?: string): Promise<Person> => {
    const trimmed = name.trim();
    const existing = people.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
    const randomColor = colors[people.length % colors.length];

    const newPerson: Person = {
      id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      name: trimmed,
      phone,
      avatarColor: randomColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.people.put(newPerson);
    setPeople(prev => [...prev, newPerson]);
    return newPerson;
  };

  // Add Transaction
  const addTransaction = async (payload: AddTransactionPayload): Promise<Transaction> => {
    const now = new Date();
    const date = payload.date || formatLocalDate(now);
    const time = payload.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Normalize account ID to strictly Bank or Cash
    const targetAccountId: MoneyLocationId = (payload.accountId === 'acc_cash' || payload.accountId === 'cash')
      ? 'acc_cash'
      : 'acc_bank';

    const toAccountId: MoneyLocationId | undefined = payload.toAccountId
      ? (payload.toAccountId === 'acc_cash' || payload.toAccountId === 'cash' ? 'acc_cash' : 'acc_bank')
      : undefined;

    // Check balance for deducting transactions
    if (['EXPENSE', 'SPLIT', 'LENDING', 'TRANSFER'].includes(payload.type)) {
      const check = verifyBalance(targetAccountId, payload.amount);
      if (!check.hasSufficient) {
        throw new Error(`Insufficient funds: You only have ₹${check.currentBalance} in ${check.accountName}.`);
      }
    }

    // Resolve person if name is provided but no personId
    let personId = payload.personId;
    let personName = payload.personName;
    if (!personId && personName) {
      const personObj = await addPerson(personName);
      personId = personObj.id;
      personName = personObj.name;
    }

    // Resolve splits
    const splits = payload.splits?.map(s => ({
      personId: s.personId,
      personName: s.personName,
      amount: s.amount,
      settledAmount: 0,
      isSettled: false,
    }));

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      type: payload.type,
      amount: payload.amount,
      userShare: payload.userShare,
      category: payload.category || 'Other',
      date,
      time,
      note: payload.note,
      source: payload.source,
      personId,
      personName,
      splits,
      loanDetails: payload.type === 'LENDING' && personId ? {
        personId,
        personName: personName || 'Friend',
        expectedDate: payload.expectedDate,
        repaidAmount: 0,
        isSettled: false,
      } : undefined,
      accountId: targetAccountId,
      toAccountId,
      status: 'ACTIVE',
      linkedTransactionId: payload.linkedTransactionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const nextTransactions = [newTx, ...transactions];
    const nextAccounts = computeAccountBalancesFromLedger(nextTransactions, accounts);

    await db.transactions.put(newTx);
    for (const acc of nextAccounts) {
      await db.accounts.put(acc);
    }

    setTransactions(nextTransactions);
    setAccounts(nextAccounts);
    return newTx;
  };

  // Update Transaction with 100% Reversible Accounting Effect
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;

    const updatedTx: Transaction = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    const nextTransactions = transactions.map(t => (t.id === id ? updatedTx : t));
    const nextAccounts = computeAccountBalancesFromLedger(nextTransactions, accounts);

    await db.transactions.put(updatedTx);
    for (const acc of nextAccounts) {
      await db.accounts.put(acc);
    }

    setTransactions(nextTransactions);
    setAccounts(nextAccounts);
  };

  // Delete Transaction with 100% Reversible Accounting Effect
  const deleteTransaction = async (id: string) => {
    const nextTransactions = transactions.filter(t => t.id !== id);
    const nextAccounts = computeAccountBalancesFromLedger(nextTransactions, accounts);

    await db.transactions.delete(id);
    for (const acc of nextAccounts) {
      await db.accounts.put(acc);
    }

    setTransactions(nextTransactions);
    setAccounts(nextAccounts);
  };

  // Record Transfer Between Bank and Cash
  const recordTransfer = async (
    amount: number,
    fromAccountId: MoneyLocationId,
    toAccountId: MoneyLocationId,
    note?: string
  ): Promise<Transaction> => {
    return await addTransaction({
      type: 'TRANSFER',
      amount,
      category: 'Other',
      accountId: fromAccountId,
      toAccountId: toAccountId,
      note: note || `Transfer: ${fromAccountId === 'acc_bank' ? 'Bank → Cash' : 'Cash → Bank'}`,
    });
  };

  // Record Opening Balance for user starting with existing money
  const recordOpeningBalance = async (bankAmount: number, cashAmount: number) => {
    const today = formatLocalDate(new Date());
    if (bankAmount > 0) {
      await addTransaction({
        type: 'OPENING_BALANCE',
        amount: bankAmount,
        category: 'Other',
        accountId: 'acc_bank',
        date: today,
        note: 'Starting Bank Balance',
      });
    }
    if (cashAmount > 0) {
      await addTransaction({
        type: 'OPENING_BALANCE',
        amount: cashAmount,
        category: 'Other',
        accountId: 'acc_cash',
        date: today,
        note: 'Starting Cash Balance',
      });
    }
  };

  // Settle Friend Split
  const settleFriendSplit = async (
    personId: string,
    amount: number,
    accountId: MoneyLocationId = 'acc_bank',
    note?: string
  ) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    await addTransaction({
      type: 'REIMBURSEMENT',
      amount,
      category: 'Other',
      accountId,
      personId,
      personName: person.name,
      note: note || `Reimbursement from ${person.name}`,
    });
  };

  // Record Loan Repayment
  const recordLoanRepaymentDirect = async (
    personId: string,
    amount: number,
    accountId: MoneyLocationId = 'acc_bank',
    note?: string
  ) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    await addTransaction({
      type: 'LOAN_REPAYMENT',
      amount,
      category: 'Other',
      accountId,
      personId,
      personName: person.name,
      note: note || `Loan repaid by ${person.name}`,
    });
  };

  // Reserved Money: Add reservation
  const addReservation = async (amount: number, purpose: string, dueDate?: string): Promise<ReservedMoney> => {
    const newReservation: ReservedMoney = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      amount,
      purpose: purpose.trim(),
      dueDate,
      isFulfilled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.reservedMoney.put(newReservation);
    setReservedMoney(prev => [newReservation, ...prev]);
    return newReservation;
  };

  // Reserved Money: Toggle fulfilled
  const toggleReservationFulfilled = async (id: string) => {
    const existing = reservedMoney.find(r => r.id === id);
    if (!existing) return;

    const nextState = !existing.isFulfilled;
    const updated: ReservedMoney = {
      ...existing,
      isFulfilled: nextState,
      fulfilledDate: nextState ? formatLocalDate(new Date()) : undefined,
      updatedAt: Date.now(),
    };

    await db.reservedMoney.put(updated);
    setReservedMoney(prev => prev.map(r => (r.id === id ? updated : r)));
  };

  // Reserved Money: Delete
  const deleteReservation = async (id: string) => {
    await db.reservedMoney.delete(id);
    setReservedMoney(prev => prev.filter(r => r.id !== id));
  };

  // Record Cash Adjustment / Missing Money Reconciliation
  const recordCashAdjustment = async (
    actualAmount: number,
    accountId: MoneyLocationId,
    reason?: string
  ): Promise<Transaction> => {
    const targetAccount = computedAccounts.find(a => a.id === accountId) || computedAccounts[0];
    const currentBalance = targetAccount?.balance || 0;
    const delta = actualAmount - currentBalance;

    return await addTransaction({
      type: 'ADJUSTMENT',
      amount: delta,
      category: 'Other',
      accountId,
      note: reason?.trim() || `Balance adjustment to ${actualAmount} (diff: ${delta >= 0 ? '+' : ''}${delta})`,
    });
  };

  // Export all data as JSON
  const exportAllData = async (): Promise<string> => {
    const userTx = await db.transactions.where('userId').equals(currentUser.id).toArray();
    const userPeople = await db.people.where('userId').equals(currentUser.id).toArray();
    const userAccounts = await db.accounts.where('userId').equals(currentUser.id).toArray();
    const userReserved = await db.reservedMoney.where('userId').equals(currentUser.id).toArray();

    const payload: ExportDataPayload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      user: currentUser,
      accounts: userAccounts,
      transactions: userTx,
      people: userPeople,
      reservedMoney: userReserved,
    };

    return JSON.stringify(payload, null, 2);
  };

  // Import and validate backup JSON
  const importAllData = async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed: ExportDataPayload = JSON.parse(jsonStr);
      if (!parsed || !Array.isArray(parsed.transactions)) {
        throw new Error('Invalid backup file format.');
      }

      await clearData();

      if (parsed.people && parsed.people.length > 0) {
        await db.people.bulkPut(parsed.people.map(p => ({ ...p, userId: currentUser.id })));
      }
      if (parsed.transactions && parsed.transactions.length > 0) {
        await db.transactions.bulkPut(parsed.transactions.map(t => ({ ...t, userId: currentUser.id })));
      }
      if (parsed.reservedMoney && parsed.reservedMoney.length > 0) {
        await db.reservedMoney.bulkPut(parsed.reservedMoney.map(r => ({ ...r, userId: currentUser.id })));
      }

      await loadUserData();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  };

  // Reset Demo Data
  const resetDemoData = async () => {
    setIsLoading(true);
    try {
      await db.transactions.where('userId').equals(currentUser.id).delete();
      await db.people.where('userId').equals(currentUser.id).delete();
      await db.accounts.where('userId').equals(currentUser.id).delete();
      await db.reservedMoney.where('userId').equals(currentUser.id).delete();

      const demoPeople = DEMO_PEOPLE;
      const demoAccounts = DEMO_ACCOUNTS;
      const demoTx = getDemoTransactions();

      await db.people.bulkPut(demoPeople);
      await db.accounts.bulkPut(demoAccounts);
      await db.transactions.bulkPut(demoTx);

      setPeople(demoPeople);
      setAccounts(demoAccounts);
      setTransactions(demoTx);
      setReservedMoney([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all data
  const clearData = async () => {
    await db.transactions.where('userId').equals(currentUser.id).delete();
    await db.people.where('userId').equals(currentUser.id).delete();
    await db.reservedMoney.where('userId').equals(currentUser.id).delete();
    setTransactions([]);
    setPeople([]);
    setReservedMoney([]);
    const resetAccounts = DEMO_ACCOUNTS.map(a => ({ ...a, balance: 0 }));
    for (const a of resetAccounts) {
      await db.accounts.put(a);
    }
    setAccounts(resetAccounts);
  };

  return (
    <FinanceContext.Provider
      value={{
        selectedPeriod,
        setSelectedPeriod,
        transactions,
        people,
        accounts: computedAccounts,
        reservedMoney,
        overview,
        summary: overview,
        personBalances,
        whereDidMyMoneyGo,
        isLoading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addPerson,
        settleFriendSplit,
        recordLoanRepaymentDirect,
        recordTransfer,
        recordOpeningBalance,
        addReservation,
        toggleReservationFulfilled,
        deleteReservation,
        recordCashAdjustment,
        verifyBalance,
        exportAllData,
        importAllData,
        resetDemoData,
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
