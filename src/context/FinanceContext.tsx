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
} from '../types/finance';
import { db } from '../db/database';
import { useAuth } from './AuthContext';
import {
  calculateMonthlySummary,
  calculateAllPersonBalances,
  generateWhereDidMyMoneyGo,
  getYearMonth,
} from '../services/accountingEngine';
import {
  DEMO_PEOPLE,
  DEMO_ACCOUNTS,
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
  isMonthlyBudget?: boolean;
  linkedTransactionId?: string;
}

interface FinanceContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  transactions: Transaction[];
  people: Person[];
  accounts: Account[];
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
  updateBudget: (yearMonth: string, totalBudget: number, allocations?: Record<string, number>) => Promise<void>;
  settleFriendSplit: (personId: string, amount: number, note?: string) => Promise<void>;
  recordLoanRepaymentDirect: (personId: string, amount: number, note?: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode } = useAuth();
  
  // Default to current calendar month (e.g. 2026-09)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getYearMonth(new Date()));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load or seed data whenever currentUser changes
  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userTx = await db.transactions.where('userId').equals(currentUser.id).toArray();
      const userPeople = await db.people.where('userId').equals(currentUser.id).toArray();
      const userAccounts = await db.accounts.where('userId').equals(currentUser.id).toArray();
      const userBudgets = await db.monthlyBudgets.where('userId').equals(currentUser.id).toArray();

      if (isDemoMode && userTx.length === 0) {
        // Seed demo data
        const demoPeople = DEMO_PEOPLE;
        const demoAccounts = DEMO_ACCOUNTS;
        const demoBudgets = getDemoBudgets(selectedMonth);
        const demoTx = getDemoTransactions(selectedMonth);

        await db.people.bulkPut(demoPeople);
        await db.accounts.bulkPut(demoAccounts);
        await db.monthlyBudgets.bulkPut(demoBudgets);
        await db.transactions.bulkPut(demoTx);

        setPeople(demoPeople);
        setAccounts(demoAccounts);
        setBudgets(demoBudgets);
        setTransactions(demoTx);
      } else {
        setTransactions(userTx);
        setPeople(userPeople);
        setAccounts(userAccounts.length > 0 ? userAccounts : [
          { id: 'acc_upi', userId: currentUser.id, name: 'UPI / Wallet', type: 'WALLET', balance: 0 },
          { id: 'acc_bank', userId: currentUser.id, name: 'Bank Account', type: 'BANK', balance: 0 },
          { id: 'acc_cash', userId: currentUser.id, name: 'Cash', type: 'CASH', balance: 0 },
        ]);
        setBudgets(userBudgets);
      }
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isDemoMode, selectedMonth]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Current month's budget object
  const currentBudget = useMemo(() => {
    return budgets.find(b => b.yearMonth === selectedMonth) || null;
  }, [budgets, selectedMonth]);

  // Reactive financial summary
  const summary = useMemo(() => {
    return calculateMonthlySummary(selectedMonth, transactions, currentBudget, accounts);
  }, [selectedMonth, transactions, currentBudget, accounts]);

  // Reactive person balances
  const personBalances = useMemo(() => {
    return calculateAllPersonBalances(transactions, people);
  }, [transactions, people]);

  // Reactive Where Did My Money Go report
  const whereDidMyMoneyGo = useMemo(() => {
    return generateWhereDidMyMoneyGo(selectedMonth, transactions, currentBudget);
  }, [selectedMonth, transactions, currentBudget]);

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
    const date = payload.date || now.toISOString().split('T')[0];
    const time = payload.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const txYearMonth = getYearMonth(date);

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
      status: 'ACTIVE',
      isMonthlyBudget: payload.isMonthlyBudget,
      monthlyBudgetId: txYearMonth,
      linkedTransactionId: payload.linkedTransactionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update account physical balance
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === newTx.accountId) {
        let delta = 0;
        if (payload.type === 'EXPENSE' || payload.type === 'SPLIT' || payload.type === 'LENDING') {
          delta = -payload.amount;
        } else if (payload.type === 'MONEY_RECEIVED' || payload.type === 'REIMBURSEMENT' || payload.type === 'LOAN_REPAYMENT' || payload.type === 'REFUND') {
          delta = payload.amount;
        }
        return { ...acc, balance: acc.balance + delta };
      }
      return acc;
    });

    await db.transactions.put(newTx);
    for (const acc of updatedAccounts) {
      await db.accounts.put(acc);
    }

    setTransactions(prev => [newTx, ...prev]);
    setAccounts(updatedAccounts);

    // If budget was created via this transaction
    if (payload.isMonthlyBudget) {
      const existingB = budgets.find(b => b.yearMonth === txYearMonth);
      const newTotal = (existingB?.totalBudget || 0) + payload.amount;
      await updateBudget(txYearMonth, newTotal);
    }

    return newTx;
  };

  // Update Transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;

    const updatedTx: Transaction = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.transactions.put(updatedTx);
    setTransactions(prev => prev.map(t => (t.id === id ? updatedTx : t)));
  };

  // Delete Transaction
  const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
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

  // Update or Set Monthly Budget
  const updateBudget = async (yearMonth: string, totalBudget: number, allocations?: Record<string, number>) => {
    const existing = budgets.find(b => b.yearMonth === yearMonth);
    const updatedBudget: MonthlyBudget = {
      id: yearMonth,
      userId: currentUser.id,
      yearMonth,
      totalBudget,
      allocations: allocations || existing?.allocations || {},
      notes: existing?.notes,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await db.monthlyBudgets.put(updatedBudget);
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.yearMonth === yearMonth);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedBudget;
        return next;
      }
      return [...prev, updatedBudget];
    });
  };

  // Reset Demo Data
  const resetDemoData = async () => {
    setIsLoading(true);
    try {
      await db.transactions.where('userId').equals(currentUser.id).delete();
      await db.people.where('userId').equals(currentUser.id).delete();
      await db.accounts.where('userId').equals(currentUser.id).delete();
      await db.monthlyBudgets.where('userId').equals(currentUser.id).delete();

      const demoPeople = DEMO_PEOPLE;
      const demoAccounts = DEMO_ACCOUNTS;
      const demoBudgets = getDemoBudgets(selectedMonth);
      const demoTx = getDemoTransactions(selectedMonth);

      await db.people.bulkPut(demoPeople);
      await db.accounts.bulkPut(demoAccounts);
      await db.monthlyBudgets.bulkPut(demoBudgets);
      await db.transactions.bulkPut(demoTx);

      setPeople(demoPeople);
      setAccounts(demoAccounts);
      setBudgets(demoBudgets);
      setTransactions(demoTx);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all data
  const clearData = async () => {
    await db.transactions.where('userId').equals(currentUser.id).delete();
    await db.people.where('userId').equals(currentUser.id).delete();
    await db.monthlyBudgets.where('userId').equals(currentUser.id).delete();
    setTransactions([]);
    setPeople([]);
    setBudgets([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        transactions,
        people,
        accounts,
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
