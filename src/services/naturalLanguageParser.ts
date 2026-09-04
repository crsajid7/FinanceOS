import { TransactionType, StandardCategory, MoneyLocationId } from '../types/finance';

export interface ParsedNaturalLanguage {
  type: TransactionType;
  amount: number;
  userShare?: number;
  category: StandardCategory;
  account?: MoneyLocationId | null;
  people: string[];
  personName?: string;
  isMonthlyBudget?: boolean;
  splits?: { personName: string; amount: number }[];
  confidence: number;
  rawText: string;
  note?: string;
}

export const KNOWN_CATEGORIES: { name: StandardCategory; keywords: string[] }[] = [
  {
    name: 'Food',
    keywords: [
      'restaurant food', 'food', 'breakfast', 'lunch', 'dinner', 'snacks', 'snack', 'restaurant',
      'shawarma', 'pizza', 'burger', 'eating', 'meal', 'cafe', 'canteen',
      'chai', 'tea', 'coffee', 'swiggy', 'zomato', 'mcdonalds', 'biryani',
      'bakery', 'sweets', 'juice'
    ]
  },
  {
    name: 'Entertainment',
    keywords: [
      'movies', 'movie', 'cinema', 'film', 'netflix', 'ott', 'gaming', 'game',
      'concert', 'party', 'fun', 'entertainment', 'theater', 'theatre',
      'spotify', 'prime', 'outing', 'show', 'plays'
    ]
  },
  {
    name: 'Transport',
    keywords: [
      'auto', 'autos', 'uber', 'ola', 'rapido', 'cab', 'taxi', 'bus', 'train',
      'metro', 'fuel', 'petrol', 'diesel', 'transport', 'rickshaw', 'ticket',
      'tickets', 'toll', 'parking', 'flight', 'fare'
    ]
  },
  {
    name: 'Groceries',
    keywords: [
      'groceries', 'grocery', 'vegetables', 'vegetable', 'milk', 'fruits', 'fruit',
      'supermarket', 'zepto', 'blinkit', 'instamart', 'kirana', 'provisions',
      'egg', 'eggs', 'chicken', 'meat'
    ]
  },
  {
    name: 'College',
    keywords: [
      'college', 'books', 'book', 'stationery', 'assignment', 'project', 'exam',
      'tuition', 'xerox', 'print', 'printout', 'lab', 'fee', 'fees', 'course',
      'semester', 'notes'
    ]
  },
  {
    name: 'Rent',
    keywords: [
      'room rent', 'pg rent', 'hostel rent', 'rent', 'room', 'pg', 'hostel',
      'maintenance', 'electricity', 'maid', 'water bill', 'eb bill'
    ]
  },
  {
    name: 'Personal',
    keywords: [
      'clothes', 'clothing', 'shopping', 'personal', 'haircut', 'salon', 'spa',
      'medicine', 'pharmacy', 'recharge', 'wifi', 'dress', 'shoes', 'cosmetics',
      'skincare'
    ]
  },
  {
    name: 'Other',
    keywords: ['other', 'misc', 'miscellaneous']
  }
];

const RESERVED_WORDS = new Set([
  'cash', 'cash in hand', 'bank', 'bank account', 'banking', 'account',
  'upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'card', 'debit card', 'credit card', 'online',
  'food', 'auto', 'autos', 'movie', 'movies', 'cinema', 'dinner', 'lunch', 'breakfast',
  'snacks', 'groceries', 'grocery', 'uber', 'ola', 'cab', 'bus', 'train', 'metro',
  'rent', 'college', 'books', 'clothes', 'personal', 'fuel', 'petrol',
  'me', 'my', 'myself', 'us', 'we', 'our', 'you', 'your', 'him', 'her', 'them',
  'it', 'its', 'this', 'that', 'these', 'those', 'the', 'a', 'an',
  'rs', 'rupees', 'rupee', 'inr', 'buck', 'bucks',
  'today', 'yesterday', 'tomorrow', 'night', 'morning', 'evening',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'budget',
  'bill', 'amount', 'share', 'split', 'payment', 'paid', 'spent', 'spend', 'gave', 'given',
  'for', 'with', 'and', 'from', 'to', 'using', 'in', 'on', 'at', 'by', 'was', 'were'
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects payment source and returns the account ID + cleaned text with payment phrases removed
 */
function extractPaymentSource(text: string): { account?: MoneyLocationId; cleanedText: string } {
  // Cash matches: "with cash", "using cash", "paid in cash", "in cash", "from cash", "by cash", "cash in hand", standalone "cash"
  const cashPattern = /\b(?:(?:with|using|paid in|in|from|via|by)\s+)?cash(?:\s+in\s+hand)?\b/i;
  // Bank matches: "with bank", "using bank", "from bank", "from my bank account", "using my bank account", "paid from bank", "bank account", "banking", "upi", "gpay", "google pay", "phonepe", "paytm", "card", "debit card", "credit card", "online"
  const bankPattern = /\b(?:(?:with|using|paid from|from|via|by)\s+)?(?:(?:my\s+)?bank(?:\s+account)?|banking|net\s*banking|upi|gpay|google\s*pay|phonepe|paytm|card|debit\s*card|credit\s*card|online)\b/i;

  let account: MoneyLocationId | undefined = undefined;
  let cleanedText = text;

  if (cashPattern.test(text)) {
    account = 'acc_cash';
    cleanedText = cleanedText.replace(cashPattern, ' ');
  } else if (bankPattern.test(text)) {
    account = 'acc_bank';
    cleanedText = cleanedText.replace(bankPattern, ' ');
  }

  return { account, cleanedText: cleanedText.replace(/\s+/g, ' ').trim() };
}

/**
 * Extracts multiple people from text, resolving against known friends if available
 */
function extractPeople(text: string, knownFriends?: string[]): string[] {
  const detectedPeople: string[] = [];
  const normalizedKnown = (knownFriends || [])
    .map(k => ({ original: k, lower: k.trim().toLowerCase() }))
    .filter(k => k.lower.length > 0 && !RESERVED_WORDS.has(k.lower));

  // 1. Check known friends mentioned in text
  for (const k of normalizedKnown) {
    const reg = new RegExp(`\\b${escapeRegExp(k.original)}\\b`, 'i');
    if (reg.test(text)) {
      if (!detectedPeople.some(p => p.toLowerCase() === k.lower)) {
        detectedPeople.push(k.original);
      }
    }
  }

  // 2. Extract friends from phrases like:
  // "with Karthick and Hemanth", "with Karthick, Hemanth and Siva"
  // "split with Karthick and Hemanth", "between Karthick and Hemanth"
  const withMatch = text.match(/\b(?:with|between|shared with|split with)\s+([^,.;!?]+(?:\s*,\s*[^,.;!?]+)*(?:\s+(?:and|&)\s+[^,.;!?]+)?)/i);
  if (withMatch) {
    const clause = withMatch[1];
    const tokens = clause.split(/\s*,\s*|\s+(?:and|&|\+)\s+/i);
    for (let token of tokens) {
      token = token.trim().replace(/^for\s+/i, '').replace(/'s$/i, '').trim();
      if (!token) continue;
      // Stop before preposition trailing phrases
      const parts = token.split(/\s+(?:using|for|in|on|at|paid|from|via)\s+/i);
      const nameCand = parts[0].trim();
      const lower = nameCand.toLowerCase();
      if (lower && !RESERVED_WORDS.has(lower) && !/^\d+$/.test(lower) && nameCand.length >= 2) {
        // Check if matches known friend case-insensitively
        const known = normalizedKnown.find(k => k.lower === lower);
        const finalName = known ? known.original : (nameCand.charAt(0).toUpperCase() + nameCand.slice(1));
        if (!detectedPeople.some(p => p.toLowerCase() === finalName.toLowerCase())) {
          detectedPeople.push(finalName);
        }
      }
    }
  }

  // 3. Extract friends from "for <People>" if not a category word
  // e.g. "for Karthick and Hemanth"
  const forMatch = text.match(/\bfor\s+([A-Z][a-z0-9_]+(?:\s*(?:,|and|&)\s*[A-Z][a-z0-9_]+)*)\b/);
  if (forMatch) {
    const clause = forMatch[1];
    const tokens = clause.split(/\s*,\s*|\s+(?:and|&|\+)\s+/i);
    for (let token of tokens) {
      const nameCand = token.trim().replace(/'s$/i, '').trim();
      const lower = nameCand.toLowerCase();
      if (lower && !RESERVED_WORDS.has(lower) && !/^\d+$/.test(lower) && nameCand.length >= 2) {
        const known = normalizedKnown.find(k => k.lower === lower);
        const finalName = known ? known.original : (nameCand.charAt(0).toUpperCase() + nameCand.slice(1));
        if (!detectedPeople.some(p => p.toLowerCase() === finalName.toLowerCase())) {
          detectedPeople.push(finalName);
        }
      }
    }
  }

  // 4. Possessive names: "100 was Karthick's"
  const possessiveMatches = text.matchAll(/\b([A-Za-z][a-z0-9_]+)'s\b/gi);
  for (const m of possessiveMatches) {
    const nameCand = m[1].trim();
    const lower = nameCand.toLowerCase();
    if (lower && !RESERVED_WORDS.has(lower) && !/^\d+$/.test(lower) && nameCand.length >= 2) {
      const known = normalizedKnown.find(k => k.lower === lower);
      const finalName = known ? known.original : (nameCand.charAt(0).toUpperCase() + nameCand.slice(1));
      if (!detectedPeople.some(p => p.toLowerCase() === finalName.toLowerCase())) {
        detectedPeople.push(finalName);
      }
    }
  }

  return detectedPeople;
}

/**
 * Determines standard category based on keyword matches
 */
function extractCategory(text: string): StandardCategory {
  const lower = text.toLowerCase();
  for (const cat of KNOWN_CATEGORIES) {
    const sortedKeywords = [...cat.keywords].sort((a, b) => b.length - a.length);
    for (const kw of sortedKeywords) {
      const kwRegex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (kwRegex.test(lower)) {
        return cat.name;
      }
    }
  }
  return 'Other';
}

/**
 * Parses free text natural language financial entries
 */
export function parseNaturalLanguage(text: string, knownFriends?: string[]): ParsedNaturalLanguage | null {
  if (!text || text.trim().length === 0) return null;

  const rawText = text.trim();

  // 1. Detect and extract payment source first
  const { account, cleanedText } = extractPaymentSource(rawText);
  const lower = cleanedText.toLowerCase();

  // 2. Extract numbers or rupee patterns (e.g. 50, 100, ₹50, rs 50, inr 50)
  const numberRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/gi;
  const numbers: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = numberRegex.exec(cleanedText)) !== null) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0) {
      numbers.push(val);
    }
  }

  if (numbers.length === 0) return null;
  const amount = numbers[0];

  // 3. Determine Category
  const detectedCategory = extractCategory(cleanedText);

  // 4. Extract ALL people
  const detectedPeople = extractPeople(cleanedText, knownFriends);

  // Check 1: LOAN REPAYMENT
  if (/\b(repaid|repay|loan repayment|returned loan|repaid loan)\b/i.test(lower)) {
    const fromMatch = cleanedText.match(/(?:from|by)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i) || cleanedText.match(/^([A-Z][a-z0-9_]+)\s+repaid/i);
    let personName = detectedPeople[0];
    if (fromMatch) {
      const cand = fromMatch[1].trim();
      if (!RESERVED_WORDS.has(cand.toLowerCase())) {
        personName = cand.charAt(0).toUpperCase() + cand.slice(1);
        if (!detectedPeople.includes(personName)) {
          detectedPeople.push(personName);
        }
      }
    }
    return {
      type: 'LOAN_REPAYMENT',
      amount,
      category: 'Other',
      account,
      people: detectedPeople,
      personName,
      note: rawText,
      confidence: 0.9,
      rawText,
    };
  }

  // Check 2: REIMBURSEMENT
  if (/\b(reimbursement|reimbursed|settled split|split settled|payback)\b/i.test(lower)) {
    const personName = detectedPeople[0] || undefined;
    return {
      type: 'REIMBURSEMENT',
      amount,
      category: 'Other',
      account,
      people: detectedPeople,
      personName,
      note: rawText,
      confidence: 0.9,
      rawText,
    };
  }

  // Check 3: LENDING
  if (/\b(lent|lend|borrowed to)\b/i.test(lower) || (/\bgave\b/i.test(lower) && /\bto\b/i.test(lower)) || (/\bloan\b/i.test(lower) && !/\brepaid\b/i.test(lower))) {
    const toMatch = cleanedText.match(/(?:to)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i);
    let personName = detectedPeople[0];
    if (!personName && toMatch) {
      const cand = toMatch[1].trim();
      if (!RESERVED_WORDS.has(cand.toLowerCase())) {
        personName = cand.charAt(0).toUpperCase() + cand.slice(1);
        detectedPeople.push(personName);
      }
    }

    return {
      type: 'LENDING',
      amount,
      category: 'Other',
      account,
      people: detectedPeople,
      personName,
      note: rawText,
      confidence: personName ? 0.95 : 0.8,
      rawText,
    };
  }

  // Check 4: MONEY_RECEIVED / BUDGET
  if (/\b(received|allowance|pocket money|salary|from dad|from mom|budget)\b/i.test(lower) || (/\bgot\b/i.test(lower) && !/\breimbursement\b/i.test(lower))) {
    const isMonthlyBudget = /\b(budget|monthly budget|allowance|september|october|november|december|january|february|march|april|may|june|july|august)\b/i.test(lower);
    const fromMatch = cleanedText.match(/(?:from)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i);
    let personName: string | undefined = undefined;
    if (fromMatch) {
      const cand = fromMatch[1].trim();
      if (!RESERVED_WORDS.has(cand.toLowerCase())) {
        personName = cand.charAt(0).toUpperCase() + cand.slice(1);
      }
    }
    if (!personName && detectedPeople.length > 0) {
      personName = detectedPeople[0];
    }
    const peopleList = personName ? [personName] : detectedPeople;

    return {
      type: 'MONEY_RECEIVED',
      amount,
      category: 'Other',
      account,
      people: peopleList,
      personName,
      isMonthlyBudget,
      note: rawText,
      confidence: 0.9,
      rawText,
    };
  }

  // Check 5: SPLIT vs EXPENSE
  // A transaction is a SPLIT if:
  // - There are 1 or more detected people! OR
  // - Keyword 'split' or 'shared' is explicitly in text
  const isSplitIntent = detectedPeople.length > 0 || /\b(split|shared)\b/i.test(lower);

  if (isSplitIntent && detectedPeople.length > 0) {
    const friendCount = detectedPeople.length;
    let userShare: number;
    let splits: { personName: string; amount: number }[];

    if (numbers.length > 1 && numbers[1] < amount) {
      // E.g. "Paid 200 for food, 100 was Karthick's"
      const friendShare = numbers[1];
      userShare = amount - friendShare;
      splits = detectedPeople.map((p, idx) => ({
        personName: p,
        amount: idx === 0 ? friendShare : Math.round(friendShare / friendCount),
      }));
    } else {
      // Equal split among user + friends
      const eachShare = Math.round(amount / (friendCount + 1));
      splits = detectedPeople.map(p => ({
        personName: p,
        amount: eachShare,
      }));
      userShare = amount - splits.reduce((sum, s) => sum + s.amount, 0);
    }

    return {
      type: 'SPLIT',
      amount,
      userShare,
      category: detectedCategory,
      account,
      people: detectedPeople,
      personName: detectedPeople[0],
      splits,
      note: rawText,
      confidence: 0.9,
      rawText,
    };
  }

  // Default: Standard PERSONAL EXPENSE
  return {
    type: 'EXPENSE',
    amount,
    category: detectedCategory,
    account,
    people: [],
    note: rawText,
    confidence: 0.85,
    rawText,
  };
}
