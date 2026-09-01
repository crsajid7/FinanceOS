import { Transaction, Person } from '../types/finance';

export interface SmartSuggestion {
  suggestedCategory?: string;
  suggestedPersonId?: string;
  suggestedPersonName?: string;
  confidenceScore: number;
}

/**
 * Predicts likely category given the entered amount based on user history.
 * E.g., user repeatedly enters ₹40 -> Food, ₹60 -> Transport.
 */
export function getCategorySuggestionForAmount(
  amount: number,
  transactions: Transaction[]
): string | undefined {
  if (!amount || amount <= 0 || transactions.length === 0) return undefined;

  // Filter expenses and splits with similar or exact amount
  const matchedTx = transactions.filter(
    tx => (tx.type === 'EXPENSE' || tx.type === 'SPLIT') && tx.amount === amount
  );

  if (matchedTx.length === 0) return undefined;

  // Count category frequency
  const counts = new Map<string, number>();
  for (const tx of matchedTx) {
    if (tx.category && tx.category !== 'Other') {
      counts.set(tx.category, (counts.get(tx.category) || 0) + 1);
    }
  }

  let topCategory: string | undefined;
  let maxCount = 0;

  for (const [cat, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  }

  // Only suggest if chosen at least twice or 60%+ of identical amount occurrences
  if (topCategory && (maxCount >= 2 || maxCount / matchedTx.length >= 0.6)) {
    return topCategory;
  }

  return undefined;
}

/**
 * Returns most frequently interacted people for splits or lending
 */
export function getFrequentPeople(
  transactions: Transaction[],
  allPeople: Person[],
  limit = 4
): Person[] {
  const frequencyMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.personId) {
      frequencyMap.set(tx.personId, (frequencyMap.get(tx.personId) || 0) + 1);
    }
    if (tx.splits) {
      for (const s of tx.splits) {
        frequencyMap.set(s.personId, (frequencyMap.get(s.personId) || 0) + 1);
      }
    }
  }

  return [...allPeople].sort((a, b) => {
    const countA = frequencyMap.get(a.id) || 0;
    const countB = frequencyMap.get(b.id) || 0;
    return countB - countA;
  }).slice(0, limit);
}
