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

describe('FinanceOS Pure Student Money Accounting Engine', () => {
  const baseAccounts: Account[] = [
    { id: 'acc_bank', userId: 'user_1', name: 'Bank Account', type: 'BANK', balance: 0 },
    { id: 'acc_cash', userId: 'user_1', name: 'Cash in Hand', type: 'CASH', balance: 0 },
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
      {
        id: '1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 3200,
        category: 'Other',
        date: '2026-09-05',
        time: '10:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 2000,
        category: 'Other',
        date: '2026-09-06',
        time: '11:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-06'));
    expect(overview.bankBalance).toBe(5200);
    expect(overview.cashBalance).toBe(0);
    expect(overview.currentMoney).toBe(5200);
    expect(overview.totalReceivedInPeriod).toBe(5200);
    expect(overview.spendableMoney).toBe(5200);
  });

  // TEST 3 — RECEIVE ₹1,000 CASH
  it('TEST 3: Receive ₹1,000 Cash -> Bank = ₹5,200, Cash = ₹1,000, Current Money = ₹6,200', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 2000, category: 'Other', date: '2026-09-06', time: '11:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 1000, category: 'Other', date: '2026-09-07', time: '12:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-07'));
    expect(overview.bankBalance).toBe(5200);
    expect(overview.cashBalance).toBe(1000);
    expect(overview.currentMoney).toBe(6200);
  });

  // TEST 4 — SPEND ₹300 CASH
  it('TEST 4: Spend ₹300 Cash -> Cash = ₹700, Current Money = ₹5,900, Personal Spending = ₹300', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 5200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 1000, category: 'Other', date: '2026-09-06', time: '11:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'EXPENSE', amount: 300, category: 'Food', date: '2026-09-07', time: '13:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-07'));
    expect(overview.bankBalance).toBe(5200);
    expect(overview.cashBalance).toBe(700);
    expect(overview.currentMoney).toBe(5900);
    expect(overview.actualPersonalSpentInPeriod).toBe(300);
    expect(overview.spendableMoney).toBe(5900);
  });

  // TEST 5 — SPEND ₹500 BANK
  it('TEST 5: Spend ₹500 Bank -> Bank = ₹4,700, Cash = ₹700, Current Money = ₹5,400, Personal Spending = ₹800', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 5200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 1000, category: 'Other', date: '2026-09-06', time: '11:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'EXPENSE', amount: 300, category: 'Food', date: '2026-09-07', time: '13:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
      { id: '4', userId: 'user_1', type: 'EXPENSE', amount: 500, category: 'Transport', date: '2026-09-08', time: '14:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 4, updatedAt: 4 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-08'));
    expect(overview.bankBalance).toBe(4700);
    expect(overview.cashBalance).toBe(700);
    expect(overview.currentMoney).toBe(5400);
    expect(overview.actualPersonalSpentInPeriod).toBe(800);
  });

  // TEST 6 — FRIEND SPLIT
  it('TEST 6: Friend Split -> Bank -= ₹200, Personal Spending += ₹100, Friend owes ₹100 (Receivable NOT in cash)', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      {
        id: '2',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-06',
        time: '13:00',
        accountId: 'acc_bank',
        status: 'ACTIVE',
        splits: [{ personId: 'karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }],
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-06'));
    expect(overview.bankBalance).toBe(3000);
    expect(overview.currentMoney).toBe(3000);
    expect(overview.actualPersonalSpentInPeriod).toBe(100);
    expect(overview.pendingSplitReceivables).toBe(100);
    expect(overview.totalMoneyOwedToYou).toBe(100);
    // Current money must NOT include the ₹100 receivable!
    expect(overview.currentMoney).not.toBe(3100);
  });

  // TEST 7 — LEND ₹500
  it('TEST 7: Lend ₹500 -> Cash -= ₹500, Personal Spending unchanged, Loan outstanding = ₹500', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 1000, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      {
        id: '2',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        personId: 'karthick',
        personName: 'Karthick',
        date: '2026-09-06',
        time: '14:00',
        accountId: 'acc_cash',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-06'));
    expect(overview.cashBalance).toBe(500);
    expect(overview.currentMoney).toBe(500);
    expect(overview.actualPersonalSpentInPeriod).toBe(0);
    expect(overview.pendingLoanReceivables).toBe(500);
    expect(overview.totalMoneyOwedToYou).toBe(500);
  });

  // TEST 8 — LOAN REPAYMENT ₹200
  it('TEST 8: Loan Repayment ₹200 -> Cash += ₹200, Loan outstanding = ₹300, 0 new spending/income', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 1000, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'LENDING', amount: 500, category: 'Other', personId: 'karthick', personName: 'Karthick', date: '2026-09-06', time: '14:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'LOAN_REPAYMENT', amount: 200, category: 'Other', personId: 'karthick', personName: 'Karthick', date: '2026-09-07', time: '15:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-07'));
    expect(overview.cashBalance).toBe(700);
    expect(overview.currentMoney).toBe(700);
    expect(overview.pendingLoanReceivables).toBe(300);
    expect(overview.totalMoneyOwedToYou).toBe(300);
    expect(overview.actualPersonalSpentInPeriod).toBe(0);
  });

  // TEST 9 — RESERVE ₹2,000
  it('TEST 9: Reserve ₹2,000 -> Current Money = ₹6,400, Reserved = ₹2,000, Spendable = ₹4,400', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 6400, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
    ];

    const reservations: ReservedMoney[] = [
      { id: 'r1', userId: 'user_1', amount: 2000, purpose: 'Rent', isFulfilled: false, createdAt: 1, updatedAt: 1 },
    ];

    const overview = calculateFinancialOverview(transactions, reservations, 'THIS_MONTH', new Date('2026-09-05'));
    expect(overview.currentMoney).toBe(6400);
    expect(overview.totalReserved).toBe(2000);
    expect(overview.spendableMoney).toBe(4400);
    expect(overview.bankBalance).toBe(6400); // Physical balance unchanged
  });

  // TEST 10 — TRANSFER BANK → CASH
  it('TEST 10: Transfer Bank -> Cash ₹1,000: Total Money unchanged, no spending, no income', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 5000, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 500, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'TRANSFER', amount: 1000, category: 'Other', date: '2026-09-06', time: '11:00', accountId: 'acc_bank', toAccountId: 'acc_cash', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-06'));
    expect(overview.bankBalance).toBe(4000);
    expect(overview.cashBalance).toBe(1500);
    expect(overview.currentMoney).toBe(5500);
    expect(overview.actualPersonalSpentInPeriod).toBe(0);
  });

  // TEST 11 — EDIT EXPENSE
  it('TEST 11: Edit expense ₹500 -> ₹300: Bank becomes ₹2,900 (NOT ₹2,400)', () => {
    const initialTx: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'EXPENSE', amount: 500, category: 'Food', date: '2026-09-06', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    // Replaced in ledger with edited amount ₹300
    const editedTx = initialTx.map(t => (t.id === '2' ? { ...t, amount: 300 } : t));
    const accounts = computeAccountBalancesFromLedger(editedTx, baseAccounts);
    expect(accounts.find(a => a.id === 'acc_bank')?.balance).toBe(2900);
  });

  // TEST 12 — DELETE EXPENSE
  it('TEST 12: Delete ₹500 expense: Bank restores to ₹3,200', () => {
    const initialTx: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'EXPENSE', amount: 500, category: 'Food', date: '2026-09-06', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const afterDelete = initialTx.filter(t => t.id !== '2');
    const accounts = computeAccountBalancesFromLedger(afterDelete, baseAccounts);
    expect(accounts.find(a => a.id === 'acc_bank')?.balance).toBe(3200);
  });

  // TEST 13 — CHANGE ACCOUNT ON EDIT (Bank -> Cash)
  it('TEST 13: Edit expense account Bank -> Cash: Reverses Bank and applies Cash', () => {
    const initialTx: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 500, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'EXPENSE', amount: 200, category: 'Food', date: '2026-09-06', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
    ];

    // Edit tx '3' from Bank to Cash
    const editedTx = initialTx.map(t => (t.id === '3' ? { ...t, accountId: 'acc_cash' } : t));
    const accounts = computeAccountBalancesFromLedger(editedTx, baseAccounts);
    expect(accounts.find(a => a.id === 'acc_bank')?.balance).toBe(3200);
    expect(accounts.find(a => a.id === 'acc_cash')?.balance).toBe(300);
  });

  // TEST 14 — MULTIPLE RECEIPTS
  it('TEST 14: Multiple Receipts (₹3,200 Bank + ₹2,000 Bank + ₹1,500 Cash) -> Bank = ₹5,200, Cash = ₹1,500, Total = ₹6,700', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 2000, category: 'Other', date: '2026-09-12', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
      { id: '3', userId: 'user_1', type: 'MONEY_RECEIVED', amount: 1500, category: 'Other', date: '2026-09-20', time: '10:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 3, updatedAt: 3 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-20'));
    expect(overview.bankBalance).toBe(5200);
    expect(overview.cashBalance).toBe(1500);
    expect(overview.currentMoney).toBe(6700);
    expect(overview.totalReceivedInPeriod).toBe(6700);
  });

  // TEST 15 — OPENING BALANCE
  it('TEST 15: Opening Balance sets starting cash without inflating normal received-money period stats', () => {
    const transactions: Transaction[] = [
      { id: '1', userId: 'user_1', type: 'OPENING_BALANCE', amount: 3200, category: 'Other', date: '2026-09-01', time: '00:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
      { id: '2', userId: 'user_1', type: 'OPENING_BALANCE', amount: 500, category: 'Other', date: '2026-09-01', time: '00:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 2, updatedAt: 2 },
    ];

    const overview = calculateFinancialOverview(transactions, [], 'THIS_MONTH', new Date('2026-09-01'));
    expect(overview.bankBalance).toBe(3200);
    expect(overview.cashBalance).toBe(500);
    expect(overview.currentMoney).toBe(3700);
    // Opening balance does NOT count as regular period inflow
    expect(overview.totalReceivedInPeriod).toBe(0);
  });

  // TEST 16 — COMPLETE 10-STEP REAL-WORLD STUDENT SEQUENCE (Section 45)
  it('TEST 16: Complete 10-step real-world student sequence matches exact expected amounts', () => {
    let ledger: Transaction[] = [];
    let reservations: ReservedMoney[] = [];

    // Step 1: Receive ₹3,200 into Bank
    ledger.push({ id: 's1', userId: 'u1', type: 'MONEY_RECEIVED', amount: 3200, category: 'Other', date: '2026-09-05', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 1, updatedAt: 1 });
    let o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-05'));
    expect(o.bankBalance).toBe(3200);
    expect(o.cashBalance).toBe(0);
    expect(o.currentMoney).toBe(3200);
    expect(o.spendableMoney).toBe(3200);

    // Step 2: Spend ₹100 on food from Bank
    ledger.push({ id: 's2', userId: 'u1', type: 'EXPENSE', amount: 100, category: 'Food', date: '2026-09-06', time: '12:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 2, updatedAt: 2 });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-06'));
    expect(o.bankBalance).toBe(3100);
    expect(o.currentMoney).toBe(3100);
    expect(o.actualPersonalSpentInPeriod).toBe(100);

    // Step 3: Receive another ₹2,000 into Bank
    ledger.push({ id: 's3', userId: 'u1', type: 'MONEY_RECEIVED', amount: 2000, category: 'Other', date: '2026-09-07', time: '10:00', accountId: 'acc_bank', status: 'ACTIVE', createdAt: 3, updatedAt: 3 });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-07'));
    expect(o.bankBalance).toBe(5100);
    expect(o.currentMoney).toBe(5100);

    // Step 4: Receive ₹500 into Cash
    ledger.push({ id: 's4', userId: 'u1', type: 'MONEY_RECEIVED', amount: 500, category: 'Other', date: '2026-09-08', time: '10:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 4, updatedAt: 4 });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-08'));
    expect(o.bankBalance).toBe(5100);
    expect(o.cashBalance).toBe(500);
    expect(o.currentMoney).toBe(5600);

    // Step 5: Spend ₹200 from Cash
    ledger.push({ id: 's5', userId: 'u1', type: 'EXPENSE', amount: 200, category: 'Food', date: '2026-09-09', time: '13:00', accountId: 'acc_cash', status: 'ACTIVE', createdAt: 5, updatedAt: 5 });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-09'));
    expect(o.cashBalance).toBe(300);
    expect(o.currentMoney).toBe(5400);

    // Step 6: Pay ₹300 for a friend from Bank. My share = ₹150.
    ledger.push({
      id: 's6',
      userId: 'u1',
      type: 'SPLIT',
      amount: 300,
      userShare: 150,
      category: 'Food',
      date: '2026-09-10',
      time: '14:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      splits: [{ personId: 'karthick', personName: 'Karthick', amount: 150, settledAmount: 0, isSettled: false }],
      createdAt: 6,
      updatedAt: 6,
    });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-10'));
    expect(o.bankBalance).toBe(4800);
    expect(o.actualPersonalSpentInPeriod).toBe(450); // 100 + 200 + 150
    expect(o.pendingSplitReceivables).toBe(150);
    expect(o.currentMoney).toBe(5100);

    // Step 7: Lend ₹500 from Bank
    ledger.push({
      id: 's7',
      userId: 'u1',
      type: 'LENDING',
      amount: 500,
      category: 'Other',
      personId: 'karthick',
      personName: 'Karthick',
      date: '2026-09-11',
      time: '15:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      createdAt: 7,
      updatedAt: 7,
    });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-11'));
    expect(o.bankBalance).toBe(4300);
    expect(o.actualPersonalSpentInPeriod).toBe(450); // unchanged
    expect(o.pendingLoanReceivables).toBe(500);
    expect(o.currentMoney).toBe(4600);

    // Step 8: Reserve ₹1,000 for rent
    reservations.push({ id: 'r1', userId: 'u1', amount: 1000, purpose: 'Rent', isFulfilled: false, createdAt: 8, updatedAt: 8 });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-11'));
    expect(o.currentMoney).toBe(4600);
    expect(o.totalReserved).toBe(1000);
    expect(o.spendableMoney).toBe(3600);

    // Step 9: Friend reimburses ₹150 into Bank
    ledger.push({
      id: 's9',
      userId: 'u1',
      type: 'REIMBURSEMENT',
      amount: 150,
      category: 'Other',
      personId: 'karthick',
      personName: 'Karthick',
      date: '2026-09-12',
      time: '10:00',
      accountId: 'acc_bank',
      status: 'ACTIVE',
      createdAt: 9,
      updatedAt: 9,
    });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-12'));
    expect(o.bankBalance).toBe(4450);
    expect(o.pendingSplitReceivables).toBe(0);
    expect(o.currentMoney).toBe(4750);
    expect(o.spendableMoney).toBe(3750);

    // Step 10: Friend repays ₹200 of the loan into Cash
    ledger.push({
      id: 's10',
      userId: 'u1',
      type: 'LOAN_REPAYMENT',
      amount: 200,
      category: 'Other',
      personId: 'karthick',
      personName: 'Karthick',
      date: '2026-09-13',
      time: '11:00',
      accountId: 'acc_cash',
      status: 'ACTIVE',
      createdAt: 10,
      updatedAt: 10,
    });
    o = calculateFinancialOverview(ledger, reservations, 'THIS_MONTH', new Date('2026-09-13'));
    expect(o.cashBalance).toBe(500);
    expect(o.pendingLoanReceivables).toBe(300);
    expect(o.currentMoney).toBe(4950);
    expect(o.spendableMoney).toBe(3950);

    // Check negative balance prevention function
    const balanceCheck = checkSufficientBalance('acc_cash', 600, o.bankBalance ? [{ id: 'acc_bank', userId: 'u1', name: 'Bank Account', type: 'BANK', balance: o.bankBalance }, { id: 'acc_cash', userId: 'u1', name: 'Cash in Hand', type: 'CASH', balance: o.cashBalance }] : baseAccounts);
    expect(balanceCheck.hasSufficient).toBe(false);
    expect(balanceCheck.missingAmount).toBe(100);
  });
});
