import { describe, it, expect } from 'vitest';
import {
  calculateMonthlySummary,
  calculateAllPersonBalances,
  validateSplit,
  validateLoanRepayment,
  generateWhereDidMyMoneyGo,
} from './accountingEngine';
import { Transaction, MonthlyBudget } from '../types/finance';

describe('Accounting Engine Core Rules', () => {
  const mockBudget: MonthlyBudget = {
    id: '2026-09',
    userId: 'user_1',
    yearMonth: '2026-09',
    totalBudget: 10000,
    allocations: { Food: 3000, Transport: 1500 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('1. Correctly calculates simple personal expenses', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 50,
        category: 'Food',
        date: '2026-09-05',
        time: '12:00',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const summary = calculateMonthlySummary('2026-09', transactions, mockBudget);
    expect(summary.totalBudget).toBe(10000);
    expect(summary.actualPersonalSpent).toBe(50);
    expect(summary.leftToSpend).toBe(9950);
  });

  it('2. Friend Split only deducts user personal share from spending budget', () => {
    const transactions: Transaction[] = [
      {
        id: '2',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-06',
        time: '13:00',
        accountId: 'upi',
        status: 'ACTIVE',
        splits: [
          {
            personId: 'karthick',
            personName: 'Karthick',
            amount: 100,
            settledAmount: 0,
            isSettled: false,
          },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const summary = calculateMonthlySummary('2026-09', transactions, mockBudget);
    // User paid 200, but personal spent is ONLY 100
    expect(summary.actualPersonalSpent).toBe(100);
    expect(summary.leftToSpend).toBe(9900);
    expect(summary.totalPaidForOthers).toBe(100);
    expect(summary.pendingSplitReceivables).toBe(100);
    expect(summary.totalMoneyOwedToYou).toBe(100);
  });

  it('3. Lending does NOT count as personal spending', () => {
    const transactions: Transaction[] = [
      {
        id: '3',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        date: '2026-09-07',
        time: '14:00',
        personId: 'karthick',
        personName: 'Karthick',
        loanDetails: {
          personId: 'karthick',
          personName: 'Karthick',
          repaidAmount: 0,
          isSettled: false,
        },
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const summary = calculateMonthlySummary('2026-09', transactions, mockBudget);
    // Personal spending remains 0
    expect(summary.actualPersonalSpent).toBe(0);
    expect(summary.leftToSpend).toBe(10000);
    expect(summary.totalMoneyLent).toBe(500);
    expect(summary.pendingLoanReceivables).toBe(500);
    expect(summary.totalMoneyOwedToYou).toBe(500);
  });

  it('4. Reimbursement settles receivable and does NOT count as new income', () => {
    const transactions: Transaction[] = [
      // 1. Paid 200 split (100 user, 100 Karthick)
      {
        id: 'tx_split',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 200,
        userShare: 100,
        category: 'Food',
        date: '2026-09-06',
        time: '13:00',
        accountId: 'upi',
        status: 'ACTIVE',
        splits: [
          {
            personId: 'karthick',
            personName: 'Karthick',
            amount: 100,
            settledAmount: 0,
            isSettled: false,
          },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
      // 2. Karthick reimburses 100
      {
        id: 'tx_reimburse',
        userId: 'user_1',
        type: 'REIMBURSEMENT',
        amount: 100,
        category: 'Other',
        date: '2026-09-08',
        time: '10:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const summary = calculateMonthlySummary('2026-09', transactions, mockBudget);
    expect(summary.totalBudget).toBe(10000); // Does not inflate budget
    expect(summary.actualPersonalSpent).toBe(100);
    expect(summary.leftToSpend).toBe(9900);
    expect(summary.totalPaidForOthers).toBe(100);
    expect(summary.totalReimbursed).toBe(100);
    expect(summary.pendingSplitReceivables).toBe(0); // Fully settled!
    expect(summary.totalMoneyOwedToYou).toBe(0);
  });

  it('5. Loan repayment reduces loan receivable and supports partial repayment', () => {
    const transactions: Transaction[] = [
      // Lent 500
      {
        id: 'tx_lend',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        date: '2026-09-07',
        time: '14:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      // Partial repayment of 200
      {
        id: 'tx_repay',
        userId: 'user_1',
        type: 'LOAN_REPAYMENT',
        amount: 200,
        category: 'Other',
        date: '2026-09-09',
        time: '11:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const summary = calculateMonthlySummary('2026-09', transactions, mockBudget);
    expect(summary.totalMoneyLent).toBe(500);
    expect(summary.totalLoanRepayments).toBe(200);
    expect(summary.pendingLoanReceivables).toBe(300);
    expect(summary.totalMoneyOwedToYou).toBe(300);
    expect(summary.actualPersonalSpent).toBe(0);

    // Check Person balances specifically
    const personBalances = calculateAllPersonBalances(transactions, [{ id: 'karthick', name: 'Karthick' }]);
    const karthickBal = personBalances.find(p => p.personId === 'karthick');
    expect(karthickBal?.loanOwed).toBe(300);
    expect(karthickBal?.splitOwed).toBe(0);
    expect(karthickBal?.totalOwed).toBe(300);
  });

  it('6. Validates friend split arithmetic accurately', () => {
    // Valid: 200 = 100 + 50 + 50
    const valid = validateSplit(200, 100, [50, 50]);
    expect(valid.isValid).toBe(true);

    // Invalid: 200 != 100 + 50 (missing 50)
    const invalid = validateSplit(200, 100, [50]);
    expect(invalid.isValid).toBe(false);
    expect(invalid.difference).toBe(50);
  });

  it('7. Validates loan repayments to prevent accidental over-repayment', () => {
    const valid = validateLoanRepayment(300, 500, 'Karthick');
    expect(valid.isValid).toBe(true);

    const invalid = validateLoanRepayment(600, 500, 'Karthick');
    expect(invalid.isValid).toBe(false);
    expect(invalid.excessAmount).toBe(100);
  });

  it('8. Generates transparent Where Did My Money Go report', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 2400,
        category: 'Food',
        date: '2026-09-05',
        time: '12:00',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: '2',
        userId: 'user_1',
        type: 'EXPENSE',
        amount: 1300,
        category: 'Transport',
        date: '2026-09-06',
        time: '12:00',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 2,
        updatedAt: 2,
      },
      {
        id: '3',
        userId: 'user_1',
        type: 'SPLIT',
        amount: 430,
        userShare: 0,
        category: 'Food',
        date: '2026-09-07',
        time: '12:00',
        accountId: 'upi',
        status: 'ACTIVE',
        splits: [{ personId: 'karthick', personName: 'Karthick', amount: 430, settledAmount: 0, isSettled: false }],
        createdAt: 3,
        updatedAt: 3,
      },
      {
        id: '4',
        userId: 'user_1',
        type: 'REIMBURSEMENT',
        amount: 350,
        category: 'Other',
        date: '2026-09-08',
        time: '12:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 4,
        updatedAt: 4,
      },
      {
        id: '5',
        userId: 'user_1',
        type: 'LENDING',
        amount: 500,
        category: 'Other',
        date: '2026-09-09',
        time: '12:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 5,
        updatedAt: 5,
      },
      {
        id: '6',
        userId: 'user_1',
        type: 'LOAN_REPAYMENT',
        amount: 200,
        category: 'Other',
        date: '2026-09-10',
        time: '12:00',
        personId: 'karthick',
        personName: 'Karthick',
        accountId: 'upi',
        status: 'ACTIVE',
        createdAt: 6,
        updatedAt: 6,
      },
    ];

    const report = generateWhereDidMyMoneyGo('2026-09', transactions, mockBudget);
    expect(report.totalReceived).toBe(10000);
    expect(report.actualPersonalSpending).toBe(3700); // 2400 + 1300
    expect(report.paidForOthers).toBe(430);
    expect(report.reimbursed).toBe(350);
    expect(report.stillOwedFromSplits).toBe(80);
    expect(report.moneyLent).toBe(500);
    expect(report.repaidLoans).toBe(200);
    expect(report.stillOutstandingLoans).toBe(300);
    expect(report.remainingBudget).toBe(6300);
  });
});
