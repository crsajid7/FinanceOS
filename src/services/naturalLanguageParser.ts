import { TransactionType, StandardCategory, MoneyLocationId } from '../types/finance';

export interface ParsedNaturalLanguage {
  type: TransactionType;
  amount: number;
  userShare?: number;
  category: StandardCategory;
  account?: MoneyLocationId;
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
      'restaurant food', 'chicken biryani', 'biryani', 'shawarma', 'pizza', 'burger',
      'food', 'breakfast', 'lunch', 'dinner', 'snacks', 'snack', 'restaurant',
      'eating', 'meal', 'cafe', 'canteen', 'chai', 'tea', 'coffee',
      'swiggy', 'zomato', 'mcdonalds', 'bakery', 'sweets', 'juice'
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
function extractPaymentSource(text: string): { account: MoneyLocationId; cleanedText: string } {
  // Cash matches: "with cash", "using cash", "paid in cash", "in cash", "from cash", "by cash", "cash in hand", standalone "cash"
  const cashPattern = /\b(?:(?:with|using|paid in|in|from|via|by)\s+)?cash(?:\s+in\s+hand)?\b/i;
  // Bank matches: "with bank", "using bank", "from bank", "from my bank account", "using my bank account", "paid from bank", "bank account", "banking", "upi", "gpay", "google pay", "phonepe", "paytm", "card", "debit card", "credit card", "online"
  const bankPattern = /\b(?:(?:with|using|paid from|from|via|by)\s+)?(?:(?:my\s+)?bank(?:\s+account)?|banking|net\s*banking|upi|gpay|google\s*pay|phonepe|paytm|card|debit\s*card|credit\s*card|online)\b/i;

  let account: MoneyLocationId = 'acc_bank'; // Default to Bank Account per requirement
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
  // "with Karthick and Hemanth", "with Karthick, Hemanth and Smith"
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
        const known = normalizedKnown.find(k => k.lower === lower);
        const finalName = known ? known.original : (nameCand.charAt(0).toUpperCase() + nameCand.slice(1));
        if (!detectedPeople.some(p => p.toLowerCase() === finalName.toLowerCase())) {
          detectedPeople.push(finalName);
        }
      }
    }
  }

  // 3. Extract friends from "to <Person>" (e.g. "lent 100 to Karthick", "gave back 100rs to Karthick")
  const toMatch = text.match(/\bto\s+([A-Z][a-z0-9_]+(?:\s*(?:,|and|&)\s*[A-Z][a-z0-9_]+)*)\b/);
  if (toMatch) {
    const clause = toMatch[1];
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

  // 4. Extract friends from "for <People>" if capitalized and not a reserved word
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

  // 5. Possessive names: "100 was Karthick's"
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
 * Extracts clean, meaningful purchase/item note, stripping intent words, amounts, accounts, and friends
 */
function extractCleanNote(rawText: string, people: string[]): string {
  let text = rawText;

  // 1. Remove amounts (e.g. "100rs", "₹100", "100 rupees", "100 rs", "100")
  text = text.replace(/(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?(?:\s*(?:rs\.?|rupees|rupee|inr|bucks|buck))?/gi, ' ');

  // 2. Remove payment phrases
  const paymentPhrases = [
    /\b(?:with|using|paid in|in|from|via|by)?\s*cash(?:\s+in\s+hand)?\b/gi,
    /\b(?:with|using|paid from|from|via|by)?\s*(?:(?:my\s+)?bank(?:\s+account)?|banking|net\s*banking|upi|gpay|google\s*pay|phonepe|paytm|card|debit\s*card|credit\s*card|online)\b/gi,
  ];
  for (const p of paymentPhrases) {
    text = text.replace(p, ' ');
  }

  // 3. Remove friend clauses & names
  text = text.replace(/\b(?:with|between|shared with|split with)\s+[^,.;!?]+/gi, ' ');
  for (const person of people) {
    const reg = new RegExp(`\\b${escapeRegExp(person)}(?:'s)?\\b`, 'gi');
    text = text.replace(reg, ' ');
  }
  text = text.replace(/\bto\s+[A-Z][a-z0-9_]+\b/g, ' ');
  text = text.replace(/\bfrom\s+[A-Z][a-z0-9_]+\b/g, ' ');

  // 4. Remove action / intent prefixes
  const intentPhrases = [
    /\b(?:gave\s+back|give\s+back|given\s+back|paid\s+back|pay\s+back|payback)\b/gi,
    /\b(?:repaid|repay|repaying|repayment|returned\s+money|returned|return|returning|settled|settle|cleared|clear\s+my\s+debt)\b/gi,
    /\b(?:lent\s+money\s+to|lent|lending|lend|loaned|loan|gave\s+money\s+to|gave|give)\b/gi,
    /\b(?:received|pocket\s+money|allowance|salary|got)\b/gi,
    /\b(?:spent\s+on|spent\s+for|spent|spend\s+on|spend\s+for|spend)\b/gi,
    /\b(?:paid\s+for|paid\s+on|paid|pay\s+for|pay\s+on|pay)\b/gi,
    /\b(?:split|shared)\b/gi,
  ];
  for (const ip of intentPhrases) {
    text = text.replace(ip, ' ');
  }

  // 5. Remove common prepositions, conjunctions, and articles
  text = text.replace(/\b(?:on|for|to|from|in|at|by|with|into|of|a|an|the|and|or|via)\b/gi, ' ');
  text = text.replace(/&/g, ' ');

  // 6. Clean punctuation & extra whitespace
  text = text.replace(/[.,;!?_\\/+\\-]/g, ' ').replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Parses free text natural language financial entries (Quick Entry)
 */
export function parseNaturalLanguage(text: string, knownFriends?: string[]): ParsedNaturalLanguage | null {
  if (!text || text.trim().length === 0) return null;

  const rawText = text.trim();

  // 1. Detect and extract payment source first (defaults to 'acc_bank')
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

  // PRIORITY 1: REPAYMENT INTENT
  // Keywords: "gave back", "give back", "paid back", "pay back", "payback", "repaid", "repay", "repayment", "returned", "return", "settled", "settle", "cleared"
  const REPAYMENT_REGEX = /\b(gave\s+back|give\s+back|given\s+back|paid\s+back|pay\s+back|payback|repaid|repay|repaying|repayment|returned\s+money|returned|return|returning|settled|settle|cleared|clear\s+my\s+debt)\b/i;
  if (REPAYMENT_REGEX.test(lower)) {
    const toMatch = cleanedText.match(/\b(?:to)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i) ||
                    cleanedText.match(/\b(?:from|by)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i) ||
                    cleanedText.match(/^([A-Z][a-z0-9_]+)\s+repaid/i);
    let personName = toMatch ? toMatch[1].trim() : detectedPeople[0];
    if (personName) {
      personName = personName.charAt(0).toUpperCase() + personName.slice(1);
    }
    const peopleList = personName ? [personName] : detectedPeople;
    const cleanNote = extractCleanNote(rawText, peopleList);

    return {
      type: 'BORROW_REPAYMENT',
      amount,
      category: 'Other',
      account,
      people: peopleList,
      personName,
      note: cleanNote,
      confidence: 0.95,
      rawText,
    };
  }

  // PRIORITY 2: LENDING INTENT
  // Keywords: "lent", "lend", "lending", "loaned", "loan", "gave to", "give to", "gave"
  const LENDING_REGEX = /\b(lent\s+money\s+to|lent|lending|lend|loaned|loan|gave\s+money\s+to|gave|give)\b/i;
  if (LENDING_REGEX.test(lower)) {
    const toMatch = cleanedText.match(/\b(?:to|for)\s+([A-Z][a-z0-9_]+|[a-zA-Z]+)/i);
    let personName = toMatch ? toMatch[1].trim() : detectedPeople[0];
    if (personName) {
      personName = personName.charAt(0).toUpperCase() + personName.slice(1);
    }
    const peopleList = personName ? [personName] : detectedPeople;
    const cleanNote = extractCleanNote(rawText, peopleList);

    return {
      type: 'LENDING',
      amount,
      category: 'Other',
      account,
      people: peopleList,
      personName,
      note: cleanNote,
      confidence: personName ? 0.95 : 0.85,
      rawText,
    };
  }

  // Check: MONEY_RECEIVED / BUDGET
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
    const cleanNote = extractCleanNote(rawText, peopleList);

    return {
      type: 'MONEY_RECEIVED',
      amount,
      category: 'Other',
      account,
      people: peopleList,
      personName,
      isMonthlyBudget,
      note: cleanNote,
      confidence: 0.9,
      rawText,
    };
  }

  // PRIORITY 3: SPLIT vs EXPENSE
  // A transaction is a SPLIT if:
  // - 1 or more actual people detected
  // - Or keywords 'split' / 'shared'
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

    const cleanNote = extractCleanNote(rawText, detectedPeople);

    return {
      type: 'SPLIT',
      amount,
      userShare,
      category: detectedCategory,
      account,
      people: detectedPeople,
      personName: detectedPeople[0],
      splits,
      note: cleanNote,
      confidence: 0.9,
      rawText,
    };
  }

  // PRIORITY 4: Standard PERSONAL EXPENSE
  const cleanNote = extractCleanNote(rawText, []);

  return {
    type: 'EXPENSE',
    amount,
    category: detectedCategory,
    account,
    people: [],
    note: cleanNote,
    confidence: 0.85,
    rawText,
  };
}
