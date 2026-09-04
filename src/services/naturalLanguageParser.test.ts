import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from './naturalLanguageParser';

describe('Quick Entry Natural Language Parser', () => {
  it('TEST 1: "spent 50 on food"', () => {
    const res = parseNaturalLanguage('spent 50 on food');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(50);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_bank');
    expect(res?.note).toBe('food');
    expect(res?.people).toEqual([]);
  });

  it('TEST 2: "spent 100 on movies"', () => {
    const res = parseNaturalLanguage('spent 100 on movies');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Entertainment');
    expect(res?.account).toBe('acc_bank');
    expect(res?.note).toBe('movies');
    expect(res?.people).toEqual([]);
  });

  it('TEST 3: "spent 100 on shawarma with cash"', () => {
    const res = parseNaturalLanguage('spent 100 on shawarma with cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_cash');
    expect(res?.note).toBe('shawarma');
    expect(res?.people).toEqual([]);
  });

  it('TEST 4: "spent 30 on food"', () => {
    const res = parseNaturalLanguage('spent 30 on food');
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(30);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_bank');
  });

  it('TEST 5: "spent 100 on food from cash"', () => {
    const res = parseNaturalLanguage('spent 100 on food from cash');
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(100);
    expect(res?.account).toBe('acc_cash');
    expect(res?.note).toBe('food');
  });

  it('TEST 6: "spent 90 for auto with Karthick and Hemanth"', () => {
    const res = parseNaturalLanguage('spent 90 rs for auto with Karthick and Hemanth');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(90);
    expect(res?.category).toBe('Transport');
    expect(res?.people).toEqual(['Karthick', 'Hemanth']);
    expect(res?.note).toBe('auto');
  });

  it('TEST 7: "spent 200 on dinner with Karthick, Hemanth and Smith"', () => {
    const res = parseNaturalLanguage('spent 200 on dinner with Karthick, Hemanth and Smith');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(200);
    expect(res?.category).toBe('Food');
    expect(res?.people).toEqual(['Karthick', 'Hemanth', 'Smith']);
    expect(res?.note).toBe('dinner');
  });

  it('TEST 8: "gave back 100rs to Karthick"', () => {
    const res = parseNaturalLanguage('gave back 100rs to Karthick');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('BORROW_REPAYMENT');
    expect(res?.amount).toBe(100);
    expect(res?.personName).toBe('Karthick');
  });

  it('TEST 9: "repaid 100 to Karthick"', () => {
    const res = parseNaturalLanguage('repaid 100 to Karthick');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('BORROW_REPAYMENT');
    expect(res?.amount).toBe(100);
    expect(res?.personName).toBe('Karthick');
  });

  it('TEST 10: "paid back 200 to Hemanth"', () => {
    const res = parseNaturalLanguage('paid back 200 to Hemanth');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('BORROW_REPAYMENT');
    expect(res?.amount).toBe(200);
    expect(res?.personName).toBe('Hemanth');
  });

  it('TEST 11: "lent 500 to Karthick"', () => {
    const res = parseNaturalLanguage('lent 500 to Karthick');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('LENDING');
    expect(res?.amount).toBe(500);
    expect(res?.personName).toBe('Karthick');
  });

  it('TEST 12: "gave 200 to Hemanth"', () => {
    const res = parseNaturalLanguage('gave 200 to Hemanth');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('LENDING');
    expect(res?.amount).toBe(200);
    expect(res?.personName).toBe('Hemanth');
  });

  it('TEST 13: "spent 100 on chicken biryani with cash"', () => {
    const res = parseNaturalLanguage('spent 100 on chicken biryani with cash');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(100);
    expect(res?.category).toBe('Food');
    expect(res?.account).toBe('acc_cash');
    expect(res?.note).toBe('chicken biryani');
  });

  it('TEST 14: additional categories: uber, movie, groceries, auto, college', () => {
    expect(parseNaturalLanguage('spent 200 for uber')?.note).toBe('uber');
    expect(parseNaturalLanguage('spent 200 for uber')?.category).toBe('Transport');

    expect(parseNaturalLanguage('spent 100 on a movie')?.note).toBe('movie');
    expect(parseNaturalLanguage('spent 100 on a movie')?.category).toBe('Entertainment');

    expect(parseNaturalLanguage('spent 50 on groceries')?.category).toBe('Groceries');
    expect(parseNaturalLanguage('spent 100 on auto')?.category).toBe('Transport');
    expect(parseNaturalLanguage('spent 300 on college')?.category).toBe('College');
  });
});
