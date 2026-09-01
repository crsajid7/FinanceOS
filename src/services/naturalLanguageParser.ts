import { TransactionType, StandardCategory } from '../types/finance';

export interface ParsedNaturalLanguage {
  type: TransactionType;
  amount: number;
  userShare?: number;
  category: string;
  note?: string;
  personName?: string;
  isMonthlyBudget?: boolean;
  splits?: { personName: string; amount: number }[];
  confidence: number;
  rawText: string;
}

const KNOWN_CATEGORIES: { name: StandardCategory; keywords: string[] }[] = [
  { name: 'Food', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'canteen', 'chai', 'tea', 'coffee', 'snack', 'swiggy', 'zomato', 'mcdonalds', 'biryani', 'pizza', 'burger', 'eating', 'meal', 'cafe'] },
  { name: 'Groceries', keywords: ['grocery', 'groceries', 'supermarket', 'zepto', 'blinkit', 'instamart', 'milk', 'vegetables', 'fruits', 'kirana'] },
  { name: 'Transport', keywords: ['transport', 'auto', 'metro', 'bus', 'uber', 'ola', 'rapido', 'petrol', 'fuel', 'cab', 'train', 'ticket', 'rickshaw'] },
  { name: 'College', keywords: ['college', 'tuition', 'exam', 'book', 'books', 'xerox', 'print', 'stationery', 'lab', 'project', 'fee', 'fees'] },
  { name: 'Entertainment', keywords: ['entertainment', 'movie', 'cinema', 'netflix', 'spotify', 'prime', 'game', 'gaming', 'party', 'concert', 'outing'] },
  { name: 'Personal', keywords: ['personal', 'clothes', 'clothing', 'haircut', 'salon', 'shopping', 'medicine', 'pharmacy', 'recharge', 'wifi'] },
  { name: 'Rent', keywords: ['rent', 'pg', 'hostel', 'room', 'maintenance', 'electricity', 'maid'] },
  { name: 'Other', keywords: ['other', 'misc', 'miscellaneous'] },
];

/**
 * Parses free text natural language financial entries
 */
export function parseNaturalLanguage(text: string): ParsedNaturalLanguage | null {
  if (!text || text.trim().length === 0) return null;

  const cleaned = text.trim();
  const lower = cleaned.toLowerCase();

  // Extract all numbers or rupee patterns (e.g. 50, 100, ₹50, rs 50, inr 50)
  const numberRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/gi;
  const numbers: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = numberRegex.exec(cleaned)) !== null) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0) {
      numbers.push(val);
    }
  }

  if (numbers.length === 0) return null;

  // Determine Category
  let detectedCategory: string = 'Other';
  for (const cat of KNOWN_CATEGORIES) {
    for (const kw of cat.keywords) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
      if (kwRegex.test(lower)) {
        detectedCategory = cat.name;
        break;
      }
    }
    if (detectedCategory !== 'Other') break;
  }

  // 1. Check for LOAN REPAYMENT first: "Karthick repaid 200 loan", "loan repayment 200 from Karthick"
  if (/\b(repaid|repay|loan repayment|returned loan|repaid loan)\b/i.test(lower)) {
    const amount = numbers[0];
    const fromMatch = cleaned.match(/(?:from|by)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i) || cleaned.match(/^([A-Z][a-z0-9_]+)\s+repaid/i);
    const personName = fromMatch ? fromMatch[1].trim() : undefined;

    return {
      type: 'LOAN_REPAYMENT',
      amount,
      category: 'Other',
      personName,
      note: cleaned,
      confidence: 0.9,
      rawText: cleaned,
    };
  }

  // 2. Check for REIMBURSEMENT: "Got 100 reimbursement from Karthick", "Karthick settled 100"
  if (/\b(reimbursement|reimbursed|settled split|split settled|payback)\b/i.test(lower)) {
    const amount = numbers[0];
    const fromMatch = cleaned.match(/(?:from|by)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i) || cleaned.match(/^([A-Z][a-z0-9_]+)\s+(?:reimbursed|settled)/i);
    const personName = fromMatch ? fromMatch[1].trim() : undefined;

    return {
      type: 'REIMBURSEMENT',
      amount,
      category: 'Other',
      personName,
      note: cleaned,
      confidence: 0.9,
      rawText: cleaned,
    };
  }

  // 3. Check for LENDING: "Lent 500 to Karthick", "Loan 500 to Hemanth", "gave 500 to karthick"
  if (/\b(lent|lend|gave|given|borrowed to)\b/i.test(lower) || (/\bloan\b/i.test(lower) && !/\brepaid\b/i.test(lower))) {
    const amount = numbers[0];
    const toMatch = cleaned.match(/(?:to|for)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i);
    const personName = toMatch ? toMatch[1].replace(/^(me|him|her|us)$/i, '').trim() : undefined;

    return {
      type: 'LENDING',
      amount,
      category: 'Other',
      personName: personName || undefined,
      note: cleaned,
      confidence: personName ? 0.95 : 0.8,
      rawText: cleaned,
    };
  }

  // 4. Check for MONEY_RECEIVED / BUDGET: "Received 10000 from Dad for budget", "Got 5000 allowance"
  if (/\b(received|got|pocket money|allowance|salary|from dad|from mom|budget)\b/i.test(lower)) {
    const amount = numbers[0];
    const isMonthlyBudget = /\b(budget|monthly budget|allowance|september|october|november|december|january|february|march|april|may|june|july|august)\b/i.test(lower);
    const fromMatch = cleaned.match(/(?:from)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i);
    const personName = fromMatch ? fromMatch[1].trim() : undefined;

    return {
      type: 'MONEY_RECEIVED',
      amount,
      category: 'Other',
      personName,
      isMonthlyBudget,
      note: cleaned,
      confidence: 0.9,
      rawText: cleaned,
    };
  }

  // 5. Check for SPLIT: "Paid 200 for food, 100 was Karthick's", "Split 300 with Karthick and Hemanth"
  const splitKeywords = /\b(split|shared|karthick's|hemanth's|with\s+[a-zA-Z]+|was\s+[a-zA-Z]+'s)\b/i;
  if (splitKeywords.test(lower)) {
    const totalAmount = numbers[0];
    let userShare = numbers.length > 1 ? totalAmount - numbers[1] : Math.round(totalAmount / 2);

    // Extract friend names
    const friendMatch = cleaned.match(/(?:with|was)\s+([A-Za-z]+)(?:'s)?/i) || cleaned.match(/([A-Za-z]+)'s/i);
    const friendName = friendMatch ? friendMatch[1] : 'Friend';
    const friendShare = numbers.length > 1 ? numbers[1] : Math.round(totalAmount / 2);

    return {
      type: 'SPLIT',
      amount: totalAmount,
      userShare,
      category: detectedCategory,
      splits: [{ personName: friendName, amount: friendShare }],
      note: cleaned,
      confidence: 0.88,
      rawText: cleaned,
    };
  }

  // 6. Default: Standard EXPENSE
  const amount = numbers[0];
  return {
    type: 'EXPENSE',
    amount,
    category: detectedCategory,
    note: cleaned,
    confidence: 0.85,
    rawText: cleaned,
  };
}
