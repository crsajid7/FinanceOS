import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from './naturalLanguageParser';

describe('Natural Language Parser', () => {
  it('parses simple expense: "Spent 50 on food"', () => {
    const res = parseNaturalLanguage('Spent 50 on food');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(50);
    expect(res?.category).toBe('Food');
    expect(res?.people).toEqual([]);
  });

  it('parses split expense: "Paid 200 for food, 100 was Karthick\'s"', () => {
    const res = parseNaturalLanguage("Paid 200 for food, 100 was Karthick's");
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(200);
    expect(res?.userShare).toBe(100);
    expect(res?.category).toBe('Food');
    expect(res?.people).toContain('Karthick');
    expect(res?.splits?.[0].personName).toBe('Karthick');
    expect(res?.splits?.[0].amount).toBe(100);
  });

  it('parses lending: "Lent 500 to Karthick"', () => {
    const res = parseNaturalLanguage('Lent 500 to Karthick');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('LENDING');
    expect(res?.amount).toBe(500);
    expect(res?.personName).toBe('Karthick');
  });

  it('parses money received: "Received 10000 from Dad for September budget"', () => {
    const res = parseNaturalLanguage('Received 10000 from Dad for September budget');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('MONEY_RECEIVED');
    expect(res?.amount).toBe(10000);
    expect(res?.personName).toBe('Dad');
    expect(res?.isMonthlyBudget).toBe(true);
  });

  it('parses loan repayment: "Karthick repaid 200 loan"', () => {
    const res = parseNaturalLanguage('Karthick repaid 200 loan');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('LOAN_REPAYMENT');
    expect(res?.amount).toBe(200);
    expect(res?.personName).toBe('Karthick');
  });

  // Specific User-Requested Test Cases 1 through 10:

  it('TEST 1: "spent 50 on food"', () => {
    const res = parseNaturalLanguage('spent 50 on food');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(50);
    expect(res?.category).toBe('Food');
    expect(res?.people).toEqual([]);
    expect(res?.account).toBeUndefined();
  });

  it('TEST 2: "spent 100 on movies with cash"', () => {
    const res = parseNaturalLanguage('spent 100 on movies with cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Entertainment');
    expect(res?.account).toBe('acc_cash');
    expect(res?.people).toEqual([]);
  });

  it('TEST 3: "spent 100 rs on food with cash"', () => {
    const res = parseNaturalLanguage('spent 100 rs on food with cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_cash');
    expect(res?.people).toEqual([]);
  });

  it('TEST 4: "spent 90 rs for auto with Karthick and Hemanth"', () => {
    const res = parseNaturalLanguage('spent 90 rs for auto with Karthick and Hemanth');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(90);
    expect(res?.category).toBe('Transport');
    expect(res?.people).toEqual(['Karthick', 'Hemanth']);
  });

  it('TEST 5: "spent 200 on dinner with Karthick and Hemanth using cash"', () => {
    const res = parseNaturalLanguage('spent 200 on dinner with Karthick and Hemanth using cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(200);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_cash');
    expect(res?.people).toEqual(['Karthick', 'Hemanth']);
  });

  it('TEST 6: "paid 300 for movies using cash"', () => {
    const res = parseNaturalLanguage('paid 300 for movies using cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(300);
    expect(res?.category).toBe('Entertainment');
    expect(res?.account).toBe('acc_cash');
    expect(res?.people).toEqual([]);
  });

  it('TEST 7: "spent 500 on dinner with Karthick, Hemanth and Siva"', () => {
    const res = parseNaturalLanguage('spent 500 on dinner with Karthick, Hemanth and Siva');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(500);
    expect(res?.category).toBe('Food');
    expect(res?.people).toEqual(['Karthick', 'Hemanth', 'Siva']);
  });

  it('TEST 8: "spent 200 for auto with Karthick using bank"', () => {
    const res = parseNaturalLanguage('spent 200 for auto with Karthick using bank');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(200);
    expect(res?.category).toBe('Transport');
    expect(res?.account).toBe('acc_bank');
    expect(res?.people).toEqual(['Karthick']);
  });

  it('TEST 9: "paid 100 in cash for groceries"', () => {
    const res = parseNaturalLanguage('paid 100 in cash for groceries');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Groceries');
    expect(res?.account).toBe('acc_cash');
    expect(res?.people).toEqual([]);
  });

  it('TEST 10: "spent 100 on food with Karthick"', () => {
    const res = parseNaturalLanguage('spent 100 on food with Karthick');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Food');
    expect(res?.people).toEqual(['Karthick']);
  });

  it('TEST EXTRA 1: "spent 200 with Karthick, Mani and Sumith"', () => {
    const res = parseNaturalLanguage('spent 200 with Karthick, Mani and Sumith');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(200);
    expect(res?.people).toEqual(['Karthick', 'Mani', 'Sumith']);
  });

  it('TEST EXTRA 2: "paid 500 for food for Karthick and Hemanth"', () => {
    const res = parseNaturalLanguage('paid 500 for food for Karthick and Hemanth');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(500);
    expect(res?.category).toBe('Food');
    expect(res?.people).toEqual(['Karthick', 'Hemanth']);
  });

  it('TEST EXTRA 3: "spend 100 on movies with cash"', () => {
    const res = parseNaturalLanguage('spend 100 on movies with cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Entertainment');
    expect(res?.account).toBe('acc_cash');
    expect(res?.people).toEqual([]);
  });

  it('TEST EXTRA 4: "paid 2000 for room rent via upi"', () => {
    const res = parseNaturalLanguage('paid 2000 for room rent via upi');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(2000);
    expect(res?.category).toBe('Rent');
    expect(res?.account).toBe('acc_bank');
    expect(res?.people).toEqual([]);
  });

  it('TEST EXTRA 5: "spent 150 using gpay for snacks"', () => {
    const res = parseNaturalLanguage('spent 150 using gpay for snacks');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(150);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_bank');
    expect(res?.people).toEqual([]);
  });
});
