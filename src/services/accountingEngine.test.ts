import { describe, it, expect } from 'vitest';
import {
  calculateFinancialOverview,
  calculateAllPersonBalances,
  computeAccountBalancesFromLedger,
  checkSufficientBalance,
  formatLocalDate,
  parseLocalDate,
  validateSplit,
  validateLoanRepayment,
  generateWhereDidMyMoneyGo,
} from './accountingEngine';
import {
  Transaction,
  Account,
  ReservedMoney,
  Person,
} from '../types/finance';

describe('FinanceOS Two-Way Friend Balances & Split Auto-Creation', () => {
  const baseAccounts: Account[] = [
    { id: 'acc_bank', userId: 'user_1', name: 'Bank Account', type: 'BANK', balance: 0 },
    { id: 'acc_cash', userId: 'user_1', name: 'Cash in Hand', type: 'CASH', balance: 0 },
  ];

  // Helper simulating ensurePerson logic
  function ensurePersonInList(peopleList: Person[], name: string): { person: Person; updatedList: Person[] } {
    const trimmed = name.trim();
    const normalized = trimmed.toLowerCase();
    const existing = peopleList.find(p => p.name.trim().toLowerCase() === normalized);
    if (existing) {
      return { person: existing, updatedList: peopleList };
    }
    const newPerson: Person = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: 'user_1',
      name: trimmed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return { person: newPerson, updatedList: [...peopleList, newPerson] };
  }

  // TEST 1: No friends exist. Create split with Karthick.
  it('TEST 1: No friends exist -> Split with Karthick creates person and shows in Friends', () => {
    let peopleList: Person[] = [];

    // User enters "Karthick" in empty friends list
    const { person: karthick, updatedList } = ensurePersonInList(peopleList, 'Karthick');
    peopleList = updatedList;

    const ledger: Transaction[] = [
      {
        id: 'tx_1',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-02',
        time: '12:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        splits: [
          { personId: karthick.id, personName: karthick.name, amount: 100, settledAmount: 0, isSettled: false },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    expect(peopleList.length).toBe(1);
    expect(peopleList[0].name).toBe('Karthick');

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances.length).toBe(1);
    expect(balances[0].personName).toBe('Karthick');
    expect(balances[0].netBalance).toBe(100);
    expect(balances[0].status).toBe('THEY_OWE_ME');
  });

  // TEST 2: Karthick already exists. Create another split with Karthick -> Still only ONE Karthick record.
  it('TEST 2: Karthick already exists -> Second split reuses Karthick without duplicating', () => {
    let peopleList: Person[] = [
      { id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 },
    ];

    const { person: karthick, updatedList } = ensurePersonInList(peopleList, 'Karthick');
    peopleList = updatedList;
    expect(peopleList.length).toBe(1);
    expect(karthick.id).toBe('p_karthick');

    const ledger: Transaction[] = [
      { id: 'tx_1', userId: 'user_1', type: 'SPLIT', amount: 200, userShare: 100, category: 'Food', date: '2026-09-01', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', splits: [{ personId: karthick.id, personName: karthick.name, amount: 100, settledAmount: 0, isSettled: false }], createdAt: 1, updatedAt: 1 },
      { id: 'tx_2', userId: 'user_1', type: 'SPLIT', amount: 300, userShare: 150, category: 'Food', date: '2026-09-02', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', splits: [{ personId: karthick.id, personName: karthick.name, amount: 150, settledAmount: 0, isSettled: false }], createdAt: 2, updatedAt: 2 },
    ];

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances.length).toBe(1);
    expect(balances[0].netBalance).toBe(250);
  });

  // TEST 3: Existing Karthick + new Rahul in same split -> Karthick reused, Rahul created.
  it('TEST 3: Multi-person split with existing and new friends', () => {
    let peopleList: Person[] = [
      { id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 },
    ];

    const { person: karthick, updatedList: l1 } = ensurePersonInList(peopleList, 'Karthick');
    peopleList = l1;
    const { person: rahul, updatedList: l2 } = ensurePersonInList(peopleList, 'Rahul');
    peopleList = l2;

    expect(peopleList.length).toBe(2);
    expect(karthick.id).toBe('p_karthick');
    expect(rahul.name).toBe('Rahul');

    const ledger: Transaction[] = [
      {
        id: 'tx_1',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 300,
        userShare: 100,
        category: 'Food',
        date: '2026-09-02',
        time: '12:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        splits: [
          { personId: karthick.id, personName: karthick.name, amount: 100, settledAmount: 0, isSettled: false },
          { personId: rahul.id, personName: rahul.name, amount: 100, settledAmount: 0, isSettled: false },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances.length).toBe(2);
    expect(balances.find(b => b.personName === 'Karthick')?.netBalance).toBe(100);
    expect(balances.find(b => b.personName === 'Rahul')?.netBalance).toBe(100);
  });

  // TEST 4: Name variations ("Karthick" vs " karthick ") -> Reuses existing Karthick.
  it('TEST 4: Name variations case-insensitively resolve to same person', () => {
    let peopleList: Person[] = [
      { id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 },
    ];

    const { person: resolved, updatedList } = ensurePersonInList(peopleList, '  karthick  ');
    expect(updatedList.length).toBe(1);
    expect(resolved.id).toBe('p_karthick');
  });

  // TEST 5: Split ₹200 total, ₹100 personal share, ₹100 Karthick share -> Karthick owes ₹100.
  it('TEST 5: Split accounting accuracy', () => {
    const peopleList: Person[] = [{ id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];
    const ledger: Transaction[] = [
      {
        id: 'tx_1',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-02',
        time: '12:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        splits: [{ personId: 'p_karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances[0].netBalance).toBe(100);
    expect(balances[0].status).toBe('THEY_OWE_ME');
  });

  // TEST 6: Karthick owes ₹100 from split, user borrows ₹50 -> Net ₹50 (Owes you ₹50).
  it('TEST 6: Split + Borrowing nets to ₹50', () => {
    const peopleList: Person[] = [{ id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];
    const ledger: Transaction[] = [
      { id: 'tx_1', userId: 'user_1', type: 'SPLIT', amount: 200, userShare: 100, category: 'Food', date: '2026-09-01', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', splits: [{ personId: 'p_karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }], createdAt: 1, updatedAt: 1 },
      { id: 'tx_2', userId: 'user_1', type: 'BORROWED_MONEY', amount: 50, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-02', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances[0].netBalance).toBe(50);
    expect(balances[0].status).toBe('THEY_OWE_ME');
  });

  // TEST 7: Karthick owes ₹50, user owes Karthick ₹100 -> Net -₹50 (You owe Karthick ₹50).
  it('TEST 7: User liability exceeds receivable -> You owe Karthick ₹50', () => {
    const peopleList: Person[] = [{ id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];
    const ledger: Transaction[] = [
      { id: 'tx_1', userId: 'user_1', type: 'SPLIT', amount: 100, userShare: 50, category: 'Food', date: '2026-09-01', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', splits: [{ personId: 'p_karthick', personName: 'Karthick', amount: 50, settledAmount: 0, isSettled: false }], createdAt: 1, updatedAt: 1 },
      { id: 'tx_2', userId: 'user_1', type: 'BORROWED_MONEY', amount: 100, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-02', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances[0].netBalance).toBe(-50);
    expect(balances[0].status).toBe('I_OWE_THEM');
  });

  // TEST 8: Karthick owes ₹100, user owes Karthick ₹100 -> Settled.
  it('TEST 8: Equal amounts result in exact Settled status', () => {
    const peopleList: Person[] = [{ id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];
    const ledger: Transaction[] = [
      { id: 'tx_1', userId: 'user_1', type: 'SPLIT', amount: 200, userShare: 100, category: 'Food', date: '2026-09-01', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', splits: [{ personId: 'p_karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }], createdAt: 1, updatedAt: 1 },
      { id: 'tx_2', userId: 'user_1', type: 'BORROWED_MONEY', amount: 100, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-02', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const balances = calculateAllPersonBalances(ledger, peopleList);
    expect(balances[0].netBalance).toBe(0);
    expect(balances[0].status).toBe('SETTLED');
  });
});
