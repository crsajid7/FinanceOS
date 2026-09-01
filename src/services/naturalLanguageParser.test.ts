import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from './naturalLanguageParser';

describe('Natural Language Parser', () => {
  it('parses simple expense: "Spent 50 on food"', () => {
    const res = parseNaturalLanguage('Spent 50 on food');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('EXPENSE');
    expect(res?.amount).toBe(50);
    expect(res?.category).toBe('Food');
  });

  it('parses split expense: "Paid 200 for food, 100 was Karthick\'s"', () => {
    const res = parseNaturalLanguage("Paid 200 for food, 100 was Karthick's");
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SPLIT');
    expect(res?.amount).toBe(200);
    expect(res?.userShare).toBe(100);
    expect(res?.category).toBe('Food');
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
});
