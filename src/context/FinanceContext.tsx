import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  Person,
  MonthlyBudget,
  Account,
  MonthlyFinancialSummary,
  PersonBalanceSummary,
  WhereDidMyMoneyGoReport,
  TransactionType,
  ReservedMoney,
  BudgetCycleRange,
  ExportDataPayload,
} from '../types/finance';
import { db } from '../db/database';
import { useAuth } from './AuthContext';
import {
  calculateBudgetCycleSummary,
  calculateAllPersonBalances,
  generateWhereDidMyMoneyGo,
  getBudgetCycleRange,
  getPreviousBudgetCycles,
  computeAccountBalancesFromLedger,
  formatLocalDate,
  parseLocalDate,
} from '../services/accountingEngine';
import {
  DEMO_PEOPLE,
  DEMO_ACCOUNTS,
  DEMO_RESERVED_MONEY,
  getDemoBudgets,
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
  personId?: string;
  personName?: string;
  splits?: { personId: string; personName: string; amount: number }[];
  expectedDate?: string;
  accountId?: string;
  toAccountId?: string;
  isMonthlyBudget?: boolean;
  linkedTransactionId?: string;
}

interface FinanceContextType {
  // Budget cycle
  selectedCycle: BudgetCycleRange;
  availableCycles: BudgetCycleRange[];
  setSelectedCycle: (cycle: BudgetCycleRange) => void;
  selectedMonth: string; // Legacy fallback
  setSelectedMonth: (month: string) => void;

  // Entities
  transactions: Transaction[];
  people: Person[];
  accounts: Account[];
  reservedMoney: ReservedMoney[];
  currentBudget: MonthlyBudget | null;
  summary: MonthlyFinancialSummary;
  personBalances: PersonBalanceSummary[];
  whereDidMyMoneyGo: WhereDidMyMoneyGoReport;
  isLoading: boolean;

  // Actions
  addTransaction: (payload: AddTransactionPayload) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPerson: (name: string, phone?: string) => Promise<Person>;
  updateBudget: (cycleOrMonth: string, totalBudget: number, allocations?: Record<string, number>) => Promise<void>;
  settleFriendSplit: (personId: string, amount: number, note?: string) => Promise<void>;
  recordLoanRepaymentDirect: (personId: string, amount: number, note?: string) => Promise<void>;
  
  // Reserved Money
  addReservation: (amount: number, purpose: string, dueDate?: string) => Promise<ReservedMoney>;
  toggleReservationFulfilled: (id: string) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;

  // Cash Adjustment / Reconciliation
  recordCashAdjustment: (actualCash: number, accountId: string, reason?: string) => Promise<Transaction>;

  // Backup
  exportAllData: () => Promise<string>;
  importAllData: (jsonStr: string) => Promise<boolean>;

  // Reset
  resetDemoData: () => Promise<void>;
  clearData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode } = useAuth();
  
  const startDay = currentUser.budgetCycleStartDay || 5;

  // Available cycles and active selected cycle
  const availableCycles = useMemo(() => {
    return getPreviousBudgetCycles(12, startDay, new Date());
  }, [startDay]);

  const [selectedCycle, setSelectedCycle] = useState<BudgetCycleRange>(() => {
    return getBudgetCycleRange(new Date(), startDay);
  });

  // Re-sync cycle when user's start day changes
  useEffect(() => {
    setSelectedCycle(getBudgetCycleRange(new Date(), startDay));
  }, [startDay]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [reservedMoney, setReservedMoney] = useState<ReservedMoney[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user data from IndexedDB
  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userTx = await db.transactions.where('userId').equals(currentUser.id).toArray();
      const userPeople = await db.people.where('userId').equals(currentUser.id).toArray();
      const userAccounts = await db.accounts.where('userId').equals(currentUser.id).toArray();
      const userBudgets = await db.monthlyBudgets.where('userId').equals(currentUser.id).toArray();
      const userReserved = await db.reservedMoney.where('userId').equals(currentUser.id).toArray();

      if (isDemoMode && userTx.length === 0 && userAccounts.length === 0) {
        // Seed initial clean state
        const demoPeople = DEMO_PEOPLE;
        const demoAccounts = DEMO_ACCOUNTS;
        const demoBudgets = getDemoBudgets(selectedCycle.startDate.substring(0, 7));
        const demoTx = getDemoTransactions(selectedCycle.startDate.substring(0, 7));

        await db.people.bulkPut(demoPeople);
        await db.accounts.bulkPut(demoAccounts);
        await db.monthlyBudgets.bulkPut(demoBudgets);
        await db.transactions.bulkPut(demoTx);

        setPeople(demoPeople);
        setAccounts(demoAccounts);
        setBudgets(demoBudgets);
        setTransactions(demoTx);
        setReservedMoney([]);
      } else {
        const initialAccounts = userAccounts.length > 0 ? userAccounts : [
          { id: 'acc_upi', userId: currentUser.id, name: 'GPay / UPI', type: 'WALLET' as const, balance: 0 },
          { id: 'acc_bank', userId: currentUser.id, name: 'Primary Bank', type: 'BANK' as const, balance: 0 },
          { id: 'acc_cash', userId: currentUser.id, name: 'Cash in Wallet', type: 'CASH' as const, balance: 0 },
        ];

        // Ensure accounts reflect single-source-of-truth from ledger
        const reconciledAccounts = computeAccountBalancesFromLedger(userTx, initialAccounts);

        setTransactions(userTx);
        setPeople(userPeople);
        setAccounts(reconciledAccounts);
        setBudgets(userBudgets);
        setReservedMoney(userReserved);
      }
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isDemoMode, selectedCycle]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Current cycle's budget object
  const currentBudget = useMemo(() => {
    return budgets.find(b => b.yearMonth === selectedCycle.cycleKey || b.yearMonth === selectedCycle.startDate.substring(0, 7)) || null;
  }, [budgets, selectedCycle]);

  // Recomputed physical cash balances based on ledger
  const computedAccounts = useMemo(() => {
    return computeAccountBalancesFromLedger(transactions, accounts);
  }, [transactions, accounts]);

  // Reactive financial summary strictly calculated from current cycle
  const summary = useMemo(() => {
    return calculateBudgetCycleSummary(selectedCycle, transactions, currentBudget, reservedMoney, computedAccounts);
  }, [selectedCycle, transactions, currentBudget, reservedMoney, computedAccounts]);

  // Reactive person balances
  const personBalances = useMemo(() => {
    return calculateAllPersonBalances(transactions, people);
  }, [transactions, people]);

  // Reactive Where Did My Money Go report
  const whereDidMyMoneyGo = useMemo(() => {
    return generateWhereDidMyMoneyGo(selectedCycle, transactions, currentBudget, reservedMoney);
  }, [selectedCycle, transactions, currentBudget, reservedMoney]);

  // Add a new Person
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
    const txCycle = getBudgetCycleRange(date, startDay);

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
      accountId: payload.accountId || accounts[0]?.id || 'acc_upi',
      toAccountId: payload.toAccountId,
      status: 'ACTIVE',
      isMonthlyBudget: payload.isMonthlyBudget,
      budgetCycleKey: txCycle.cycleKey,
      monthlyBudgetId: txCycle.startDate.substring(0, 7),
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

    // If marked as cycle budget, update cycle budget record
    if (payload.isMonthlyBudget) {
      const existingB = budgets.find(b => b.yearMonth === txCycle.cycleKey);
      const newTotal = (existingB?.totalBudget || 0) + payload.amount;
      await updateBudget(txCycle.cycleKey, newTotal);
    }

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

  // Settle Friend Split
  const settleFriendSplit = async (personId: string, amount: number, note?: string) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    await addTransaction({
      type: 'REIMBURSEMENT',
      amount,
      category: 'Other',
      personId,
      personName: person.name,
      note: note || `Reimbursement received from ${person.name}`,
    });
  };

  // Record Loan Repayment
  const recordLoanRepaymentDirect = async (personId: string, amount: number, note?: string) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    await addTransaction({
      type: 'LOAN_REPAYMENT',
      amount,
      category: 'Other',
      personId,
      personName: person.name,
      note: note || `Loan repayment received from ${person.name}`,
    });
  };

  // Update or Set Budget for Cycle
  const updateBudget = async (cycleOrMonth: string, totalBudget: number, allocations?: Record<string, number>) => {
    const existing = budgets.find(b => b.yearMonth === cycleOrMonth);
    const updatedBudget: MonthlyBudget = {
      id: cycleOrMonth,
      userId: currentUser.id,
      yearMonth: cycleOrMonth,
      totalBudget,
      allocations: allocations || existing?.allocations || {},
      notes: existing?.notes,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await db.monthlyBudgets.put(updatedBudget);
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.yearMonth === cycleOrMonth);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedBudget;
        return next;
      }
      return [...prev, updatedBudget];
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
  const recordCashAdjustment = async (actualCash: number, accountId: string, reason?: string): Promise<Transaction> => {
    const targetAccount = computedAccounts.find(a => a.id === accountId) || computedAccounts[0];
    const currentBalance = targetAccount?.balance || 0;
    const delta = actualCash - currentBalance;

    return await addTransaction({
      type: 'ADJUSTMENT',
      amount: delta,
      category: 'Other',
      accountId: targetAccount.id,
      note: reason?.trim() || `Cash balance adjusted to ${actualCash} (diff: ${delta >= 0 ? '+' : ''}${delta})`,
    });
  };

  // Export all data as JSON
  const exportAllData = async (): Promise<string> => {
    const userTx = await db.transactions.where('userId').equals(currentUser.id).toArray();
    const userPeople = await db.people.where('userId').equals(currentUser.id).toArray();
    const userAccounts = await db.accounts.where('userId').equals(currentUser.id).toArray();
    const userBudgets = await db.monthlyBudgets.where('userId').equals(currentUser.id).toArray();
    const userReserved = await db.reservedMoney.where('userId').equals(currentUser.id).toArray();

    const payload: ExportDataPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      user: currentUser,
      accounts: userAccounts,
      transactions: userTx,
      people: userPeople,
      budgets: userBudgets,
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
      if (parsed.budgets && parsed.budgets.length > 0) {
        await db.monthlyBudgets.bulkPut(parsed.budgets.map(b => ({ ...b, userId: currentUser.id })));
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
      await db.monthlyBudgets.where('userId').equals(currentUser.id).delete();
      await db.reservedMoney.where('userId').equals(currentUser.id).delete();

      const demoPeople = DEMO_PEOPLE;
      const demoAccounts = DEMO_ACCOUNTS;
      const demoBudgets = getDemoBudgets(selectedCycle.startDate.substring(0, 7));
      const demoTx = getDemoTransactions(selectedCycle.startDate.substring(0, 7));

      await db.people.bulkPut(demoPeople);
      await db.accounts.bulkPut(demoAccounts);
      await db.monthlyBudgets.bulkPut(demoBudgets);
      await db.transactions.bulkPut(demoTx);

      setPeople(demoPeople);
      setAccounts(demoAccounts);
      setBudgets(demoBudgets);
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
    await db.monthlyBudgets.where('userId').equals(currentUser.id).delete();
    await db.reservedMoney.where('userId').equals(currentUser.id).delete();
    setTransactions([]);
    setPeople([]);
    setBudgets([]);
    setReservedMoney([]);
    const resetAccounts = accounts.map(a => ({ ...a, balance: 0 }));
    for (const a of resetAccounts) {
      await db.accounts.put(a);
    }
    setAccounts(resetAccounts);
  };

  return (
    <FinanceContext.Provider
      value={{
        selectedCycle,
        availableCycles,
        setSelectedCycle,
        selectedMonth: selectedCycle.startDate.substring(0, 7),
        setSelectedMonth: (monthStr: string) => {
          const cy = getBudgetCycleRange(parseLocalDate(`${monthStr}-05`), startDay);
          setSelectedCycle(cy);
        },
        transactions,
        people,
        accounts: computedAccounts,
        reservedMoney,
        currentBudget,
        summary,
        personBalances,
        whereDidMyMoneyGo,
        isLoading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addPerson,
        updateBudget,
        settleFriendSplit,
        recordLoanRepaymentDirect,
        addReservation,
        toggleReservationFulfilled,
        deleteReservation,
        recordCashAdjustment,
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
