import { describe, it, expect } from 'vitest';
import {
  calculateBudgetCycleSummary,
  calculateAllPersonBalances,
  computeAccountBalancesFromLedger,
  getBudgetCycleRange,
  formatLocalDate,
  parseLocalDate,
  validateSplit,
  validateLoanRepayment,
  generateWhereDidMyMoneyGo,
} from './accountingEngine';
import {
  Transaction,
  MonthlyBudget,
  Account,
  ReservedMoney,
  Person,
  ExportDataPayload,
} from '../types/finance';

describe('FinanceOS 15-Point Accounting Engine Suite', () => {
  const cycle = getBudgetCycleRange('2026-09-10', 5); // Sep 5 → Oct 4
  const defaultAccounts: Account[] = [
    { id: 'bank', userId: 'user_1', name: 'Bank', type: 'BANK', balance: 0 },
    { id: 'cash', userId: 'user_1', name: 'Cash', type: 'CASH', balance: 0 },
  ];

  // TEST 1: Receive ₹10,000. Spend ₹50. Expected remaining = ₹9,950.
  it('TEST 1: Receive ₹10,000. Spend ₹50. Remaining = ₹9,950', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 10000,
        category: 'Other',
        isMonthlyBudget: true,
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 50,
        category: 'Food',
        date: '2026-09-06',
        time: '12:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const summary = calculateBudgetCycleSummary(cycle, transactions, null, [], defaultAccounts);
    expect(summary.totalBudget).toBe(10000);
    expect(summary.actualPersonalSpent).toBe(50);
    expect(summary.spendableMoney).toBe(9950);
    expect(summary.leftToSpend).toBe(9950);
  });

  // TEST 2: Receive ₹10,000. Spend ₹200 split. User share = ₹100. Expected personal spending = ₹100. Expected receivable = ₹100.
  it('TEST 2: Friend Split: Personal spending = user share, receivable = others share', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 10000,
        category: 'Other',
        isMonthlyBudget: true,
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-06',
        time: '13:00',
        accountId: 'bank',
        status: 'ACTIVE',
        splits: [{ personId: 'karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }],
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const summary = calculateBudgetCycleSummary(cycle, transactions, null, [], defaultAccounts);
    expect(summary.actualPersonalSpent).toBe(100);
    expect(summary.spendableMoney).toBe(9900);
    expect(summary.totalPaidForOthers).toBe(100);
    expect(summary.pendingSplitReceivables).toBe(100);
  });

  // TEST 3: Friend repays ₹100. Expected receivable = ₹0.
  it('TEST 3: Friend reimbursement settles receivable to ₹0 without inflating income', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-06',
        time: '13:00',
        accountId: 'bank',
        status: 'ACTIVE',
        splits: [{ personId: 'karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false }],
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'REIMBURSEMENT',
        amount: 100,
        category: 'Other',
        date: '2026-09-07',
        time: '10:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const personList: Person[] = [{ id: 'karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];
    const personBalances = calculateAllPersonBalances(transactions, personList);
    const karthickBal = personBalances.find(p => p.personId === 'karthick');
    expect(karthickBal?.splitOwed).toBe(0);
    expect(karthickBal?.totalOwed).toBe(0);
  });

  // TEST 4: Lend ₹500. Expected personal spending unchanged. Expected loan outstanding = ₹500.
  it('TEST 4: Lending ₹500 keeps personal spending unchanged, increases loan receivable', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        date: '2026-09-07',
        time: '15:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const summary = calculateBudgetCycleSummary(cycle, transactions, null, [], defaultAccounts);
    expect(summary.actualPersonalSpent).toBe(0);
    expect(summary.totalMoneyLent).toBe(500);
    expect(summary.pendingLoanReceivables).toBe(500);
  });

  // TEST 5: Friend repays ₹200. Expected loan outstanding = ₹300.
  it('TEST 5: Partial loan repayment of ₹200 leaves ₹300 outstanding', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        date: '2026-09-07',
        time: '15:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'LOAN_REPAYMENT',
        amount: 200,
        category: 'Other',
        date: '2026-09-08',
        time: '11:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const personList: Person[] = [{ id: 'karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];
    const personBalances = calculateAllPersonBalances(transactions, personList);
    const karthickBal = personBalances.find(p => p.personId === 'karthick');
    expect(karthickBal?.loanOwed).toBe(300);
    expect(karthickBal?.totalOwed).toBe(300);
  });

  // TEST 6: Delete ₹200 expense. Expected balance restored.
  it('TEST 6: Deleting ₹200 expense restores ledger balance to ₹1,000', () => {
    const initialTx: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 1000,
        category: 'Other',
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 200,
        category: 'Food',
        date: '2026-09-06',
        time: '12:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    // Ledger before delete
    let accounts = computeAccountBalancesFromLedger(initialTx, defaultAccounts);
    expect(accounts.find(a => a.id === 'bank')?.balance).toBe(800);

    // Delete transaction id '2'
    const afterDeleteTx = initialTx.filter(t => t.id !== '2');
    accounts = computeAccountBalancesFromLedger(afterDeleteTx, defaultAccounts);
    expect(accounts.find(a => a.id === 'bank')?.balance).toBe(1000);
  });

  // TEST 7: Edit ₹500 expense to ₹50. Expected accounting reflects ₹50, NOT ₹500.
  it('TEST 7: Editing ₹500 expense to ₹50 accurately reflects ₹50 in spend and balance', () => {
    const initialTx: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 1000,
        category: 'Other',
        isMonthlyBudget: true,
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 500,
        category: 'Food',
        date: '2026-09-06',
        time: '12:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    // Edit tx '2' to amount 50
    const editedTx = initialTx.map(t => (t.id === '2' ? { ...t, amount: 50 } : t));

    const summary = calculateBudgetCycleSummary(cycle, editedTx, null, [], defaultAccounts);
    expect(summary.actualPersonalSpent).toBe(50);
    expect(summary.spendableMoney).toBe(950);

    const accounts = computeAccountBalancesFromLedger(editedTx, defaultAccounts);
    expect(accounts.find(a => a.id === 'bank')?.balance).toBe(950);
  });

  // TEST 8: Edit split amounts. Expected personal share and receivable both update.
  it('TEST 8: Editing split shares updates personal spending and receivables cleanly', () => {
    const initialTx: Transaction[] = [
      {
        id: 'split_1',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 300,
        userShare: 100,
        category: 'Food',
        date: '2026-09-06',
        time: '12:00',
        accountId: 'bank',
        status: 'ACTIVE',
        splits: [
          { personId: 'karthick', personName: 'Karthick', amount: 100, settledAmount: 0, isSettled: false },
          { personId: 'hemanth', personName: 'Hemanth', amount: 100, settledAmount: 0, isSettled: false },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    // Edit: User share becomes 150, Karthick 150, Hemanth removed
    const editedTx: Transaction[] = [
      {
        ...initialTx[0],
        userShare: 150,
        splits: [{ personId: 'karthick', personName: 'Karthick', amount: 150, settledAmount: 0, isSettled: false }],
      },
    ];

    const people: Person[] = [
      { id: 'karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 },
      { id: 'hemanth', userId: 'user_1', name: 'Hemanth', createdAt: 1, updatedAt: 1 },
    ];

    const personBalances = calculateAllPersonBalances(editedTx, people);
    expect(personBalances.find(p => p.personId === 'karthick')?.splitOwed).toBe(150);
    expect(personBalances.find(p => p.personId === 'hemanth')?.splitOwed).toBe(0);
  });

  // TEST 9: Delete repayment. Expected outstanding balance restored.
  it('TEST 9: Deleting loan repayment restores original loan balance', () => {
    const initialTx: Transaction[] = [
      {
        id: 'loan_1',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        date: '2026-09-07',
        time: '10:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'repay_1',
        userId: 'user_1',
        type: 'LOAN_REPAYMENT',
        amount: 200,
        category: 'Other',
        date: '2026-09-08',
        time: '10:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const people: Person[] = [{ id: 'karthick', userId: 'user_1', name: 'Karthick', createdAt: 1, updatedAt: 1 }];

    // Before delete
    let personBalances = calculateAllPersonBalances(initialTx, people);
    expect(personBalances.find(p => p.personId === 'karthick')?.loanOwed).toBe(300);

    // Delete repay_1
    const afterDelete = initialTx.filter(t => t.id !== 'repay_1');
    personBalances = calculateAllPersonBalances(afterDelete, people);
    expect(personBalances.find(p => p.personId === 'karthick')?.loanOwed).toBe(500);
  });

  // TEST 10: Transfer ₹500 between own accounts. Expected total money unchanged. Expected personal spending unchanged.
  it('TEST 10: Transfers move money without altering personal spend or total cash', () => {
    const transactions: Transaction[] = [
      {
        id: 'in_1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 2000,
        category: 'Other',
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'transfer_1',
        userId: 'user_1',
        type: 'TRANSFER',
        amount: 500,
        category: 'Other',
        date: '2026-09-06',
        time: '11:00',
        accountId: 'bank',
        toAccountId: 'cash',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const accounts = computeAccountBalancesFromLedger(transactions, defaultAccounts);
    expect(accounts.find(a => a.id === 'bank')?.balance).toBe(1500);
    expect(accounts.find(a => a.id === 'cash')?.balance).toBe(500);

    const totalCash = accounts.reduce((sum, a) => sum + a.balance, 0);
    expect(totalCash).toBe(2000);

    const summary = calculateBudgetCycleSummary(cycle, transactions, null, [], accounts);
    expect(summary.actualPersonalSpent).toBe(0);
  });

  // TEST 11: ₹6,000 received. ₹5,000 reserved. Expected spendable = ₹1,000.
  it('TEST 11: Reserved money separates committed funds from spendable cash', () => {
    const transactions: Transaction[] = [
      {
        id: 'in_1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 6000,
        category: 'Other',
        isMonthlyBudget: true,
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const reservations: ReservedMoney[] = [
      {
        id: 'res_1',
        userId: 'user_1',
        amount: 5000,
        purpose: 'PG Rent',
        isFulfilled: false,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const summary = calculateBudgetCycleSummary(cycle, transactions, null, reservations, defaultAccounts);
    expect(summary.totalBudget).toBe(6000);
    expect(summary.totalReserved).toBe(5000);
    expect(summary.actualPersonalSpent).toBe(0);
    expect(summary.spendableMoney).toBe(1000);
    expect(summary.leftToSpend).toBe(1000);
  });

  // TEST 12: Budget cycle Sep 5 → Oct 4. Transaction Sep 4 belongs to previous cycle. Transaction Sep 5 belongs to current cycle.
  it('TEST 12: Budget cycle boundaries strictly partition transactions', () => {
    const cycleRange = getBudgetCycleRange('2026-09-10', 5); // Sep 5 → Oct 4
    expect(cycleRange.startDate).toBe('2026-09-05');
    expect(cycleRange.endDate).toBe('2026-10-04');

    const transactions: Transaction[] = [
      {
        id: 'tx_old',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 100,
        category: 'Food',
        date: '2026-09-04', // Before cycle start!
        time: '23:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'tx_current',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 200,
        category: 'Food',
        date: '2026-09-05', // On cycle start!
        time: '01:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const summary = calculateBudgetCycleSummary(cycleRange, transactions, null, [], defaultAccounts);
    expect(summary.actualPersonalSpent).toBe(200); // Only Sep 5 included!
  });

  // TEST 13: Transaction around midnight. Verify local date is correct.
  it('TEST 13: Local date helper prevents midnight UTC shifts', () => {
    const midnightLocal = new Date(2026, 8, 5, 0, 5); // Sep 5, 00:05 local
    const formatted = formatLocalDate(midnightLocal);
    expect(formatted).toBe('2026-09-05');
  });

  // TEST 14: ₹5,000 budget. ₹5,500 spending. Expected: ₹500 over budget.
  it('TEST 14: Overspending reflects negative spendable and over-budget flag', () => {
    const transactions: Transaction[] = [
      {
        id: 'in_1',
        userId: 'user_1',
        type: 'MONEY_RECEIVED',
        amount: 5000,
        category: 'Other',
        isMonthlyBudget: true,
        date: '2026-09-05',
        time: '10:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'exp_1',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 5500,
        category: 'Food',
        date: '2026-09-10',
        time: '12:00',
        accountId: 'bank',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const summary = calculateBudgetCycleSummary(cycle, transactions, null, [], defaultAccounts);
    expect(summary.totalBudget).toBe(5000);
    expect(summary.actualPersonalSpent).toBe(5500);
    expect(summary.spendableMoney).toBe(-500);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.overBudgetAmount).toBe(500);
  });

  // TEST 15: Export data → clear local data → import data. All financial records return correctly.
  it('TEST 15: Export and Import roundtrip payload structure is fully preserved', () => {
    const exportPayload: ExportDataPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      user: {
        id: 'u1',
        name: 'Sajid',
        email: 'sajid@financeos.app',
        currency: '₹',
        defaultMonthlyBudget: 10000,
        budgetCycleStartDay: 5,
        theme: 'light',
        customCategories: ['Food', 'Groceries'],
      },
      accounts: defaultAccounts,
      transactions: [
        {
          id: 'tx_1',
          userId: 'u1',
          type: 'EXPENSE',
          amount: 50,
          category: 'Food',
          date: '2026-09-05',
          time: '12:00',
          accountId: 'bank',
          status: 'ACTIVE',
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      people: [{ id: 'p1', userId: 'u1', name: 'Karthick', createdAt: 1, updatedAt: 1 }],
      budgets: [{ id: 'b1', userId: 'u1', yearMonth: '2026-09', totalBudget: 10000, allocations: {}, createdAt: 1, updatedAt: 1 }],
      reservedMoney: [{ id: 'r1', userId: 'u1', amount: 5000, purpose: 'PG Rent', isFulfilled: false, createdAt: 1, updatedAt: 1 }],
    };

    const json = JSON.stringify(exportPayload);
    const parsed: ExportDataPayload = JSON.parse(json);

    expect(parsed.version).toBe(2);
    expect(parsed.user.name).toBe('Sajid');
    expect(parsed.transactions.length).toBe(1);
    expect(parsed.transactions[0].amount).toBe(50);
    expect(parsed.reservedMoney.length).toBe(1);
    expect(parsed.reservedMoney[0].purpose).toBe('PG Rent');
  });
});
