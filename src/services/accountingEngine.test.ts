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

describe('FinanceOS Two-Way Friend Balances & Pure Accounting Engine', () => {
  const baseAccounts: Account[] = [
    { id: 'acc_bank', userId: 'user_1', name: 'Bank Account', type: 'BANK', balance: 0 },
    { id: 'acc_cash', userId: 'user_1', name: 'Cash in Hand', type: 'CASH', balance: 0 },
  ];

  const people: Person[] = [
    { id: 'p_karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 },
    { id: 'p_muthu', userId: 'user_1', name: 'Muthu', createdAt: 1, updatedAt: 1 },
  ];

  // TEST 1 — RECEIVE ₹3,200 INTO BANK
  it('TEST 1: Receive ₹3,200 into Bank -> Current Money = ₹3,200 (NEVER ₹6,400)', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 3200,
        category: 'Other',
        source: 'Dad',
        date: '2026-09-05',
        time: '10:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-05'));
    expect(overview.bankBalance).toBe(3200);
    expect(overview.cashBalance).toBe(0);
    expect(overview.currentMoney).toBe(3200);
    expect(overview.totalReceivedInPeriod).toBe(3200);
    expect(overview.actualPersonalSpentInPeriod).toBe(0);
    expect(overview.totalReserved).toBe(0);
    expect(overview.spendableMoney).toBe(3200);
  });

  // TEST 2 — RECEIVE ANOTHER ₹2,000
  it('TEST 2: Receive another ₹2,000 into Bank -> Bank = ₹5,200, Current Money = ₹5,200', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 2000, category: 'Other', date: '2026-09-06', time: '11:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-06'));
    expect(overview.bankBalance).toBe(5200);
    expect(overview.cashBalance).toBe(0);
    expect(overview.currentMoney).toBe(5200);
  });

  // TEST 3 — FRIEND SPLIT + BORROWED MONEY NETTING (Section 19 Scenario)
  it('TEST 3: Full Two-Way Net Settlement Lifecycle with Karthick', () => {
    let ledger: Transaction[] = [];

    // Step 1: Split ₹200 (User ₹100, Karthick ₹100)
    ledger.push({
      id: 's1',
      userId: 'user_1',
      type: 'SPLIT',
      amount: 200,
      userShare: 100,
      category: 'Food',
      date: '2026-09-05',
      time: '12:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      splits: [{ personId: 'p_karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }],
      createdAt: 1,
      updatedAt: 1,
    });

    let pb = calculateAllPersonBalances(ledger, people);
    let k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(100);
    expect(k.amountIOweThem).toBe(0);
    expect(k.netBalance).toBe(100);
    expect(k.status).toBe('THEY_OWE_ME');

    // Step 2: I borrow ₹50 from Karthick
    ledger.push({
      id: 's2',
      userId: 'user_1',
      type: 'BORROWED_MONEY',
      amount: 50,
      category: 'Other',
      personId: 'p_karthick',
      personName: 'Karthick',
      date: '2026-09-06',
      time: '14:00',
      accountId: 'acc_cash',
      status: 'ACTIVE',
      createdAt: 2,
      updatedAt: 2,
    });

    pb = calculateAllPersonBalances(ledger, people);
    k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(100);
    expect(k.amountIOweThem).toBe(50);
    expect(k.netBalance).toBe(50);
    expect(k.status).toBe('THEY_OWE_ME');

    // Step 3: I borrow another ₹100 from Karthick -> Crosses zero boundary!
    ledger.push({
      id: 's3',
      userId: 'user_1',
      type: 'BORROWED_MONEY',
      amount: 100,
      category: 'Other',
      personId: 'p_karthick',
      personName: 'Karthick',
      date: '2026-09-07',
      time: '10:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      createdAt: 3,
      updatedAt: 3,
    });

    pb = calculateAllPersonBalances(ledger, people);
    k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(100);
    expect(k.amountIOweThem).toBe(150);
    expect(k.netBalance).toBe(-50);
    expect(k.status).toBe('I_OWE_THEM'); // User owes Karthick ₹50

    // Step 4: I repay Karthick ₹30
    ledger.push({
      id: 's4',
      userId: 'user_1',
      type: 'BORROW_REPAYMENT',
      amount: 30,
      category: 'Other',
      personId: 'p_karthick',
      personName: 'Karthick',
      date: '2026-09-08',
      time: '11:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      createdAt: 4,
      updatedAt: 4,
    });

    pb = calculateAllPersonBalances(ledger, people);
    k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(100);
    expect(k.amountIOweThem).toBe(120);
    expect(k.netBalance).toBe(-20);
    expect(k.status).toBe('I_OWE_THEM'); // User owes Karthick ₹20

    // Step 5: Karthick pays me ₹100 for the original split
    ledger.push({
      id: 's5',
      userId: 'user_1',
      type: 'REIMBURSEMENT',
      amount: 100,
      category: 'Other',
      personId: 'p_karthick',
      personName: 'Karthick',
      date: '2026-09-09',
      time: '12:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      createdAt: 5,
      updatedAt: 5,
    });

    pb = calculateAllPersonBalances(ledger, people);
    k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(0);
    expect(k.amountIOweThem).toBe(120);
    expect(k.netBalance).toBe(-120);
    expect(k.status).toBe('I_OWE_THEM'); // User owes Karthick remaining borrowed ₹120

    // Step 6: I repay Karthick remaining ₹120 -> Exact settlement!
    ledger.push({
      id: 's6',
      userId: 'user_1',
      type: 'BORROW_REPAYMENT',
      amount: 120,
      category: 'Other',
      personId: 'p_karthick',
      personName: 'Karthick',
      date: '2026-09-10',
      time: '15:00',
      accountId: 'acc_cash',
      status: 'ACTIVE',
      createdAt: 6,
      updatedAt: 6,
    });

    pb = calculateAllPersonBalances(ledger, people);
    k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(0);
    expect(k.amountIOweThem).toBe(0);
    expect(k.netBalance).toBe(0);
    expect(k.status).toBe('SETTLED');
  });

  // TEST 4 — BOUNDARY CROSSING TEST (Section 20)
  it('TEST 4: Boundary crossing from ₹500 to -₹100 (Section 20)', () => {
    let ledger: Transaction[] = [
      // Karthick owes ₹500
      { id: '1', userId: 'user_1', type: 'LENDING', amount: 500, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-01', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
    ];

    let pb = calculateAllPersonBalances(ledger, people);
    expect(pb.find(p => p.personId === 'p_karthick')?.netBalance).toBe(500);

    // Borrow ₹200 -> Net ₹300
    ledger.push({ id: '2', userId: 'user_1', type: 'BORROWED_MONEY', amount: 200, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-02', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 });
    pb = calculateAllPersonBalances(ledger, people);
    expect(pb.find(p => p.personId === 'p_karthick')?.netBalance).toBe(300);

    // Lend ₹100 more -> Net ₹400
    ledger.push({ id: '3', userId: 'user_1', type: 'LENDING', amount: 100, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-03', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 3, updatedAt: 3 });
    pb = calculateAllPersonBalances(ledger, people);
    expect(pb.find(p => p.personId === 'p_karthick')?.netBalance).toBe(400);

    // Borrow ₹500 -> Net -₹100 (You owe Karthick ₹100)
    ledger.push({ id: '4', userId: 'user_1', type: 'BORROWED_MONEY', amount: 500, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-04', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 4, updatedAt: 4 });
    pb = calculateAllPersonBalances(ledger, people);
    const k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.netBalance).toBe(-100);
    expect(k.status).toBe('I_OWE_THEM');
  });

  // TEST 5 — EXACT SETTLEMENT EQUALITY (Section 21)
  it('TEST 5: Equal amounts net to exactly 0 Settled (Section 21)', () => {
    const ledger: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'LENDING', amount: 300, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-01', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'BORROWED_MONEY', amount: 300, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-02', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const pb = calculateAllPersonBalances(ledger, people);
    const k = pb.find(p => p.personId === 'p_karthick')!;
    expect(k.amountTheyOweMe).toBe(300);
    expect(k.amountIOweThem).toBe(300);
    expect(k.netBalance).toBe(0);
    expect(k.status).toBe('SETTLED');
  });

  // TEST 6 — BORROWED MONEY PHYSICAL CASH EFFECTS (Section 22 & 23)
  it('TEST 6: Borrowing increases physical cash without creating income or spending', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'OPENING_BALANCE', amount: 1000, category: 'Other', date: '2026-09-01', time: '00:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'BORROWED_MONEY', amount: 500, category: 'Other', personId: 'p_karthick', personName: 'Karthick', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const accounts = computeAccountBalancesFromLedger(transactions, baseAccounts);
    expect(accounts.find(a => a.id === 'acc_bank')?.balance).toBe(1500);

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-05'));
    expect(overview.currentMoney).toBe(1500);
    expect(overview.actualPersonalSpentInPeriod).toBe(0);
    expect(overview.totalReceivedInPeriod).toBe(0); // Borrowing is NOT income!
    expect(overview.totalMoneyYouOwe).toBe(500);
  });
});
