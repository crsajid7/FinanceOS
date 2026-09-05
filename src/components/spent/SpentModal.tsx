import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  HandCoins,
  Wand2,
  Lightbulb,
  Check,
  Plus,
  ArrowRight,
  AlertCircle,
  Landmark,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StandardCategory, MoneyLocationId } from '../../types/finance';
import { getCategorySuggestionForAmount, getFrequentPeople } from '../../services/smartSuggestions';
import { parseNaturalLanguage } from '../../services/naturalLanguageParser';
import { validateSplit, formatINR, distributeEqualSplit } from '../../services/accountingEngine';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

const STANDARD_CATEGORIES: { name: StandardCategory; emoji: string }[] = [
  { name: 'Food', emoji: '🍔' },
  { name: 'Groceries', emoji: '🛒' },
  { name: 'Transport', emoji: '🛺' },
  { name: 'College', emoji: '📚' },
  { name: 'Entertainment', emoji: '🎬' },
  { name: 'Personal', emoji: '👕' },
  { name: 'Rent', emoji: '🏠' },
  { name: 'Other', emoji: '📦' },
];

interface SpentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'QUICK_ENTRY' | 'EXPENSE' | 'SPLIT' | 'LENDING' | 'REPAY_FRIEND';

const SPENT_TABS: Mode[] = ['QUICK_ENTRY', 'EXPENSE', 'SPLIT', 'LENDING', 'REPAY_FRIEND'];

export const SpentModal: React.FC<SpentModalProps> = ({ isOpen, onClose }) => {
  const { transactions, people, addTransaction, recordBorrowRepayment, accounts, verifyBalance, ensurePerson } = useFinance();
  const [mode, setMode] = useState<Mode>('EXPENSE');

  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Food');
  const [note, setNote] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<MoneyLocationId>('acc_bank');

  const [userShareStr, setUserShareStr] = useState<string>('');
  const [splitFriends, setSplitFriends] = useState<{ personId: string; personName: string; amountStr: string }[]>([]);
  const [newFriendName, setNewFriendName] = useState<string>('');

  const [lendingPersonId, setLendingPersonId] = useState<string>('');
  const [lendingPersonName, setLendingPersonName] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');

  const [repayPersonId, setRepayPersonId] = useState<string>('');
  const [repayPersonName, setRepayPersonName] = useState<string>('');

  const [nlText, setNlText] = useState<string>('');
  const [nlError, setNlError] = useState<string>('');

  const [suggestedCat, setSuggestedCat] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const nlInputRef = useRef<HTMLInputElement>(null);
  const isDismissingAmountRef = useRef<boolean>(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const handleNextSpentTab = () => {
    const currentIndex = SPENT_TABS.indexOf(mode);
    if (currentIndex < SPENT_TABS.length - 1) {
      setMode(SPENT_TABS[currentIndex + 1]);
    }
  };

  const handlePrevSpentTab = () => {
    const currentIndex = SPENT_TABS.indexOf(mode);
    if (currentIndex > 0) {
      setMode(SPENT_TABS[currentIndex - 1]);
    }
  };

  useSwipeNavigation({
    onSwipeLeft: handleNextSpentTab,
    onSwipeRight: handlePrevSpentTab,
    disabled: !isOpen,
    threshold: 60,
    targetRef: modalContentRef,
  });

  const numericAmount = parseFloat(amountStr) || 0;

  useEffect(() => {
    if (isOpen) {
      setMode('EXPENSE');
      setAmountStr('');
      setSelectedCategory('Food');
      setNote('');
      setUserShareStr('');
      setSplitFriends([]);
      setLendingPersonId('');
      setLendingPersonName('');
      setRepayPersonId('');
      setRepayPersonName('');
      setExpectedDate('');
      setNlText('');
      setNlError('');
      setErrorMsg('');
      setSelectedAccountId('acc_bank');
    }
  }, [isOpen]);

  useEffect(() => {
    if (numericAmount > 0 && mode === 'EXPENSE') {
      const suggestion = getCategorySuggestionForAmount(numericAmount, transactions);
      setSuggestedCat(suggestion);
    } else {
      setSuggestedCat(undefined);
    }
  }, [numericAmount, transactions, mode]);

  useEffect(() => {
    if (mode === 'SPLIT' && numericAmount > 0) {
      const friendCount = splitFriends.length;
      if (friendCount > 0) {
        const shares = distributeEqualSplit(numericAmount, friendCount + 1);
        setUserShareStr(String(shares[0] || 0));
        setSplitFriends(prev =>
          prev.map((f, idx) => ({ ...f, amountStr: String(shares[idx + 1] || 0) }))
        );
      } else {
        setUserShareStr(String(numericAmount));
      }
    }
  }, [numericAmount, mode, splitFriends.length]);

  useEffect(() => {
    if (mode === 'QUICK_ENTRY') {
      setTimeout(() => {
        nlInputRef.current?.focus();
      }, 50);
    }
  }, [mode]);

  const frequentPeople = getFrequentPeople(transactions || [], people || [], 4);
  const lendDisplayPeople = React.useMemo(() => {
    const list = [...frequentPeople];
    if (lendingPersonId && !list.some(p => p.id === lendingPersonId)) {
      const found = (people || []).find(p => p.id === lendingPersonId);
      if (found) list.push(found);
    }
    return list;
  }, [frequentPeople, lendingPersonId, people]);
  const bankAccount = (accounts || []).find(a => a.id === 'acc_bank') || accounts?.[0] || { balance: 0 };
  const cashAccount = (accounts || []).find(a => a.id === 'acc_cash') || accounts?.[1] || { balance: 0 };

  if (!isOpen) return null;

  const handleAddSplitFriend = async (personId: string, personName: string) => {
    const trimmed = personName.trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();

    // Check if already in current split list
    if (splitFriends.some(f => (personId && f.personId === personId) || f.personName.trim().toLowerCase() === normalized)) {
      return;
    }

    // Auto-create or resolve person in database immediately!
    const resolvedPerson = await ensurePerson(trimmed);

    const nextFriends = [...splitFriends, { personId: resolvedPerson.id, personName: resolvedPerson.name, amountStr: '' }];
    const totalCount = nextFriends.length + 1;
    const shares = distributeEqualSplit(numericAmount, totalCount);

    setUserShareStr(String(shares[0] || 0));
    setSplitFriends(nextFriends.map((f, idx) => ({ ...f, amountStr: String(shares[idx + 1] || 0) })));
  };

  const handleParseNL = async () => {
    setNlError('');
    if (!nlText.trim()) return;

    const knownFriendNames = (people || []).map(p => p.name);
    const parsed = parseNaturalLanguage(nlText, knownFriendNames);
    if (!parsed) {
      setNlError('Could not understand. Try: "spent 100 on shawarma with cash"');
      return;
    }

    setAmountStr(String(parsed.amount));
    setSelectedCategory(parsed.category || 'Food');
    setNote(parsed.note || '');

    // Set payment source: default to bank unless cash explicitly parsed
    if (parsed.account) {
      setSelectedAccountId(parsed.account);
    } else {
      setSelectedAccountId('acc_bank');
    }

    if (parsed.type === 'SPLIT') {
      setMode('SPLIT');
      if (parsed.people && parsed.people.length > 0) {
        // Resolve all detected people in database
        const friendObjects = await Promise.all(
          parsed.people.map(async name => {
            const p = await ensurePerson(name);
            return { personId: p.id, personName: p.name };
          })
        );

        if (parsed.splits && parsed.splits.length > 0 && parsed.userShare !== undefined) {
          setUserShareStr(String(parsed.userShare));
          setSplitFriends(
            friendObjects.map(f => {
              const matchedSplit = parsed.splits?.find(s => s.personName.toLowerCase() === f.personName.toLowerCase());
              return {
                personId: f.personId,
                personName: f.personName,
                amountStr: String(matchedSplit ? matchedSplit.amount : Math.round(parsed.amount / (friendObjects.length + 1))),
              };
            })
          );
        } else {
          const totalCount = friendObjects.length + 1;
          const shares = distributeEqualSplit(parsed.amount, totalCount);
          setUserShareStr(String(shares[0] || 0));
          setSplitFriends(
            friendObjects.map((f, idx) => ({
              personId: f.personId,
              personName: f.personName,
              amountStr: String(shares[idx + 1] || 0),
            }))
          );
        }
      }
    } else if (parsed.type === 'LENDING') {
      setMode('LENDING');
      if (parsed.personName) {
        const p = await ensurePerson(parsed.personName);
        setLendingPersonId(p.id);
        setLendingPersonName(p.name);
      }
    } else if (parsed.type === 'BORROW_REPAYMENT' || parsed.type === 'LOAN_REPAYMENT') {
      setMode('REPAY_FRIEND');
      if (parsed.personName) {
        const p = await ensurePerson(parsed.personName);
        setRepayPersonId(p.id);
        setRepayPersonName(p.name);
      }
    } else {
      setMode('EXPENSE');
    }
  };

  const handleSaveTransaction = async () => {
    if (isSubmitting) return;
    setErrorMsg('');

    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0.');
      return;
    }

    // Check account balance to prevent negative balances
    const check = verifyBalance(selectedAccountId, numericAmount);
    if (!check.hasSufficient) {
      setErrorMsg(`You only have ${formatINR(check.currentBalance)} in ${check.accountName}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === 'EXPENSE') {
        await addTransaction({
          type: 'EXPENSE',
          amount: numericAmount,
          category: selectedCategory,
          note: note.trim() || undefined,
          accountId: selectedAccountId,
        });
      } else if (mode === 'SPLIT') {
        const userShare = parseFloat(userShareStr) || 0;
        const friendShares = splitFriends.map(f => parseFloat(f.amountStr) || 0);

        if (splitFriends.length === 0) {
          setErrorMsg('Add at least one friend to split with.');
          return;
        }

        const splitVal = validateSplit(numericAmount, userShare, friendShares);
        if (!splitVal.isValid) {
          setErrorMsg(splitVal.errorMessage || 'Split shares do not add up to total bill paid.');
          return;
        }

        await addTransaction({
          type: 'SPLIT',
          amount: numericAmount,
          userShare,
          category: selectedCategory,
          note: note.trim() || undefined,
          accountId: selectedAccountId,
          splits: splitFriends.map((f, i) => ({
            personId: f.personId,
            personName: f.personName,
            amount: friendShares[i],
            settledAmount: 0,
            isSettled: false,
          })),
        });
      } else if (mode === 'LENDING') {
        const targetName = lendingPersonName.trim() || (people.find(p => p.id === lendingPersonId)?.name);
        if (!targetName) {
          setErrorMsg('Please select or enter the person you lent money to.');
          return;
        }

        await addTransaction({
          type: 'LENDING',
          amount: numericAmount,
          category: 'Other',
          personId: lendingPersonId || undefined,
          personName: targetName,
          loanDetails: {
            personId: lendingPersonId || '',
            personName: targetName,
            expectedDate: expectedDate || undefined,
            repaidAmount: 0,
            isSettled: false,
          },
          note: note.trim() || undefined,
          accountId: selectedAccountId,
        });
      } else if (mode === 'REPAY_FRIEND') {
        const targetName = repayPersonName.trim() || (people.find(p => p.id === repayPersonId)?.name);
        if (!targetName) {
          setErrorMsg('Please select the person you are repaying.');
          return;
        }

        await recordBorrowRepayment(
          numericAmount,
          repayPersonId,
          targetName,
          selectedAccountId,
          note.trim() || undefined
        );
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save transaction.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={modalContentRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md theme-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-divider)] flex items-center justify-between bg-black/5 dark:bg-black/5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-base font-black text-[var(--card-text-main)] tracking-tight">
              {mode === 'QUICK_ENTRY' && 'Quick Entry'}
              {mode === 'EXPENSE' && 'Record Spending'}
              {mode === 'SPLIT' && 'Friend Split'}
              {mode === 'LENDING' && 'Lend Money'}
              {mode === 'REPAY_FRIEND' && 'Repay Friend'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[var(--card-divider)] bg-black/5 dark:bg-black/5 px-3 pt-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setMode('QUICK_ENTRY')}
            aria-label="Quick Entry"
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl flex items-center justify-center whitespace-nowrap transition-all ${
              mode === 'QUICK_ENTRY'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-indigo-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <Wand2 className="w-4 h-4 text-indigo-500" />
          </button>
          <button
            type="button"
            onClick={() => setMode('EXPENSE')}
            className={`px-3 py-2 text-xs font-black rounded-t-xl whitespace-nowrap transition-all ${
              mode === 'EXPENSE'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-rose-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => setMode('SPLIT')}
            className={`px-3 py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1 whitespace-nowrap transition-all ${
              mode === 'SPLIT'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-indigo-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('LENDING')}
            className={`px-3 py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1 whitespace-nowrap transition-all ${
              mode === 'LENDING'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-amber-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Lend</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('REPAY_FRIEND')}
            className={`px-3 py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1 whitespace-nowrap transition-all ${
              mode === 'REPAY_FRIEND'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-emerald-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repay</span>
          </button>
        </div>

        {/* Modal Body - <div> replaces <form> to prevent browser IME auto-advance and implicit submission */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {mode === 'QUICK_ENTRY' ? (
            <div className="space-y-4 py-2">
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-500 flex items-center space-x-1.5">
                    <Wand2 className="w-4 h-4" />
                    <span>Quick Entry</span>
                  </label>
                  <span className="text-[10px] text-indigo-400 font-mono">Type & press enter or parse</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    ref={nlInputRef}
                    type="text"
                    enterKeyHint="go"
                    value={nlText}
                    onChange={e => setNlText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.blur();
                        handleParseNL();
                      }
                    }}
                    onKeyUp={e => {
                      if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.blur();
                      }
                    }}
                    onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const nativeEvent = e.nativeEvent as InputEvent;
                      if (nativeEvent.inputType === 'insertLineBreak' || nativeEvent.inputType === 'insertParagraph') {
                        e.preventDefault();
                        (e.currentTarget as HTMLInputElement).blur();
                        handleParseNL();
                      }
                    }}
                    placeholder="e.g. spent 100 on shawarma with cash"
                    className="flex-1 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs text-[var(--card-text-main)] px-3.5 py-3 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleParseNL}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors flex-shrink-0"
                    title="Parse Quick Entry"
                  >
                    <span>Parse</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {nlError && (
                  <div className="flex items-center space-x-1.5 text-xs text-rose-500 font-semibold pt-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{nlError}</span>
                  </div>
                )}
              </div>

              {/* Suggestions / Instructions */}
              <div className="p-3.5 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] space-y-2.5">
                <span className="text-[11px] font-bold text-[var(--card-text-sub)] uppercase tracking-wider block font-mono">
                  Examples:
                </span>
                <div className="space-y-1.5 text-xs text-[var(--card-text-sub)]">
                  <div
                    onClick={() => setNlText('spent 100 on shawarma with cash')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "spent 100 on shawarma with cash"
                  </div>
                  <div
                    onClick={() => setNlText('paid 300 for dinner with Karthik and Mani')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "paid 300 for dinner with Karthik and Mani"
                  </div>
                  <div
                    onClick={() => setNlText('lent 500 to Praveen')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "lent 500 to Praveen"
                  </div>
                  <div
                    onClick={() => setNlText('repaid 200 to Mani')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "repaid 200 to Mani"
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>

          {/* Large Amount Input */}
          <div className="text-center py-2">
            <span className="text-xs font-bold text-[var(--card-text-sub)] uppercase tracking-wider block mb-1 font-mono">
              {mode === 'EXPENSE' && 'Amount Spent'}
              {mode === 'SPLIT' && 'Total Bill Paid'}
              {mode === 'LENDING' && 'Amount Lent'}
              {mode === 'REPAY_FRIEND' && 'Amount to Repay'}
            </span>
            <div className="inline-flex items-center justify-center bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl px-4 py-2 focus-within:border-rose-500 transition-colors w-full">
              <span className="text-2xl font-bold text-[var(--card-text-sub)] mr-1.5 font-mono">₹</span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                value={amountStr}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmountStr(val);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                    isDismissingAmountRef.current = true;
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.blur();
                    setTimeout(() => { isDismissingAmountRef.current = false; }, 400);
                  }
                }}
                onKeyUp={e => {
                  if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                    isDismissingAmountRef.current = true;
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.blur();
                    setTimeout(() => { isDismissingAmountRef.current = false; }, 400);
                  }
                }}
                onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                  const nativeEvent = e.nativeEvent as InputEvent;
                  if (nativeEvent.inputType === 'insertLineBreak' || nativeEvent.inputType === 'insertParagraph') {
                    isDismissingAmountRef.current = true;
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).blur();
                    setTimeout(() => { isDismissingAmountRef.current = false; }, 400);
                  }
                }}
                onFocus={e => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 250);
                }}
                placeholder="0"
                className="w-full text-3xl font-black text-[var(--card-text-main)] bg-transparent focus:outline-none font-mono-num tracking-tight"
                required
              />
            </div>
          </div>

          {/* Paid From? (Strictly Bank Account or Cash in Hand) */}
          <div>
            <label className="text-xs font-bold text-[var(--card-text-sub)] uppercase tracking-wider block mb-2 font-mono">
              PAID FROM?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAccountId('acc_bank')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all shadow-sm ${
                  selectedAccountId === 'acc_bank'
                    ? 'bg-indigo-600 text-white border-transparent'
                    : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Landmark className="w-4 h-4" />
                  <span>Bank Account</span>
                </div>
                <span className="text-[10px] opacity-80 font-mono">
                  Avail: {formatINR(bankAccount?.balance || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAccountId('acc_cash')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all shadow-sm ${
                  selectedAccountId === 'acc_cash'
                    ? 'bg-emerald-600 text-white border-transparent'
                    : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Banknote className="w-4 h-4" />
                  <span>Cash in Hand</span>
                </div>
                <span className="text-[10px] opacity-80 font-mono">
                  Avail: {formatINR(cashAccount?.balance || 0)}
                </span>
              </button>
            </div>
          </div>

          {/* Smart Category Suggestion Badge */}
          {suggestedCat && suggestedCat !== selectedCategory && mode === 'EXPENSE' && (
            <button
              type="button"
              onClick={() => setSelectedCategory(suggestedCat)}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-500 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                <span>You often spend ₹{amountStr} on <strong>{suggestedCat}</strong></span>
              </div>
              <span className="font-bold underline">Select</span>
            </button>
          )}

          {/* Mode-Specific Controls */}
          {mode === 'EXPENSE' && (
            <div>
              <label className="text-xs font-bold text-[var(--card-text-sub)] block mb-2 font-mono">
                WHAT WAS IT FOR?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STANDARD_CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500 text-[var(--card-text-main)] shadow-sm'
                          : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)] hover:border-black/20'
                      }`}
                    >
                      <span className="text-lg mb-1">{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'SPLIT' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--card-text-main)]">Split Breakdown</label>
                <span className="text-[11px] text-[var(--card-text-sub)] font-mono">Total: ₹{numericAmount || 0}</span>
              </div>

              {/* User share */}
              <div className="flex items-center justify-between bg-black/10 dark:bg-black/10 p-2.5 rounded-xl border border-[var(--card-divider)] shadow-sm">
                <span className="text-xs font-bold text-[var(--card-text-main)]">Your Share (Personal)</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-[var(--card-text-sub)] font-mono">₹</span>
                  <input
                    type="number"
                    step="any"
                    tabIndex={-1}
                    inputMode="decimal"
                    enterKeyHint="done"
                    value={userShareStr}
                    onChange={e => setUserShareStr(e.target.value)}
                    onFocus={e => {
                      if (isDismissingAmountRef.current) e.target.blur();
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-20 bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-right px-2 py-1 text-sm font-bold rounded-lg text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 font-mono-num"
                  />
                </div>
              </div>

              {/* Friends list in split */}
              {splitFriends.map((friend, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/10 dark:bg-black/10 p-2.5 rounded-xl border border-[var(--card-divider)] shadow-sm">
                  <span className="text-xs font-bold text-indigo-500">{friend.personName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[var(--card-text-sub)] font-mono">₹</span>
                    <input
                      type="number"
                      step="any"
                      tabIndex={-1}
                      inputMode="decimal"
                      enterKeyHint="done"
                      value={friend.amountStr}
                      onChange={e => {
                        const val = e.target.value;
                        setSplitFriends(prev =>
                          prev.map((f, i) => (i === idx ? { ...f, amountStr: val } : f))
                        );
                      }}
                      onFocus={e => {
                        if (isDismissingAmountRef.current) e.target.blur();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-right px-2 py-1 text-sm font-bold rounded-lg text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 font-mono-num"
                    />
                    <button
                      type="button"
                      onClick={() => setSplitFriends(prev => prev.filter((_, i) => i !== idx))}
                      className="text-[var(--card-text-sub)] hover:text-rose-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Quick Add Friend Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-[var(--card-text-sub)] block font-mono">WHO SHARED THIS?</span>
                <div className="flex flex-wrap gap-1.5">
                  {frequentPeople.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddSplitFriend(p.id, p.name)}
                      className="px-3 py-1 bg-black/5 dark:bg-black/5 hover:bg-black/10 border border-[var(--card-divider)] rounded-xl text-xs font-semibold text-[var(--card-text-main)] transition-colors flex items-center space-x-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3 text-indigo-500" />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex space-x-2 pt-1.5">
                  <input
                    type="text"
                    tabIndex={-1}
                    enterKeyHint="done"
                    value={newFriendName}
                    onChange={e => setNewFriendName(e.target.value)}
                    onFocus={e => {
                      if (isDismissingAmountRef.current) {
                        e.target.blur();
                        return;
                      }
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 250);
                    }}
                    onKeyDown={async e => {
                      if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        const nameToAdd = newFriendName.trim();
                        setNewFriendName('');
                        e.currentTarget.blur();
                        if (nameToAdd) {
                          await handleAddSplitFriend('', nameToAdd);
                        }
                      }
                    }}
                    onKeyUp={e => {
                      if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.blur();
                      }
                    }}
                    onBeforeInput={async (e: React.FormEvent<HTMLInputElement>) => {
                      const nativeEvent = e.nativeEvent as InputEvent;
                      if (nativeEvent.inputType === 'insertLineBreak' || nativeEvent.inputType === 'insertParagraph') {
                        e.preventDefault();
                        const inputEl = e.currentTarget as HTMLInputElement;
                        const nameToAdd = newFriendName.trim();
                        setNewFriendName('');
                        inputEl.blur();
                        if (nameToAdd) {
                          await handleAddSplitFriend('', nameToAdd);
                        }
                      }
                    }}
                    placeholder="Add friend name..."
                    className="flex-1 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const nameToAdd = newFriendName.trim();
                      if (nameToAdd) {
                        setNewFriendName('');
                        await handleAddSplitFriend('', nameToAdd);
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Category for split */}
              <div className="pt-2 border-t border-[var(--card-divider)]">
                <label className="text-[11px] text-[var(--card-text-sub)] block mb-1 font-mono">EXPENSE CATEGORY</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Food', 'Transport', 'Entertainment', 'Groceries', 'Other'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors shadow-sm ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'LENDING' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <div>
                <label className="text-xs font-bold text-[var(--card-text-main)] block mb-1.5">Who did you lend to?</label>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {lendDisplayPeople.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLendingPersonId(p.id);
                        setLendingPersonName(p.name);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1 shadow-sm ${
                        lendingPersonName === p.name
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  tabIndex={-1}
                  enterKeyHint="done"
                  value={lendingPersonName}
                  onChange={e => {
                    setLendingPersonName(e.target.value);
                    setLendingPersonId('');
                  }}
                  onFocus={e => {
                    if (isDismissingAmountRef.current) {
                      e.target.blur();
                      return;
                    }
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 250);
                  }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      const trimmed = lendingPersonName.trim();
                      e.currentTarget.blur();
                      if (trimmed) {
                        const p = await ensurePerson(trimmed);
                        setLendingPersonId(p.id);
                        setLendingPersonName(p.name);
                      }
                    }
                  }}
                  onKeyUp={e => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.blur();
                    }
                  }}
                  onBeforeInput={async (e: React.FormEvent<HTMLInputElement>) => {
                    const nativeEvent = e.nativeEvent as InputEvent;
                    if (nativeEvent.inputType === 'insertLineBreak' || nativeEvent.inputType === 'insertParagraph') {
                      e.preventDefault();
                      const inputEl = e.currentTarget as HTMLInputElement;
                      const trimmed = lendingPersonName.trim();
                      inputEl.blur();
                      if (trimmed) {
                        const p = await ensurePerson(trimmed);
                        setLendingPersonId(p.id);
                        setLendingPersonName(p.name);
                      }
                    }
                  }}
                  placeholder="Or enter friend's name (e.g. Karthick)"
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--card-text-sub)] block mb-1">Expected Repayment Date (Optional)</label>
                <input
                  type="date"
                  tabIndex={-1}
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  onFocus={e => {
                    if (isDismissingAmountRef.current) e.target.blur();
                  }}
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-500 leading-relaxed">
                💡 <strong>Important:</strong> Money lent is recorded as an asset owed to you, but does <strong>NOT</strong> count as personal spending.
              </div>
            </div>
          )}

          {mode === 'REPAY_FRIEND' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <div>
                <label className="text-xs font-bold text-[var(--card-text-main)] block mb-1.5">Who are you repaying?</label>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {people.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setRepayPersonId(p.id);
                        setRepayPersonName(p.name);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1 shadow-sm ${
                        repayPersonName === p.name
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  tabIndex={-1}
                  enterKeyHint="done"
                  value={repayPersonName}
                  onChange={e => {
                    setRepayPersonName(e.target.value);
                    setRepayPersonId('');
                  }}
                  onFocus={e => {
                    if (isDismissingAmountRef.current) {
                      e.target.blur();
                      return;
                    }
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 250);
                  }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      const trimmed = repayPersonName.trim();
                      e.currentTarget.blur();
                      if (trimmed) {
                        const p = await ensurePerson(trimmed);
                        setRepayPersonId(p.id);
                        setRepayPersonName(p.name);
                      }
                    }
                  }}
                  onKeyUp={e => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.blur();
                    }
                  }}
                  onBeforeInput={async (e: React.FormEvent<HTMLInputElement>) => {
                    const nativeEvent = e.nativeEvent as InputEvent;
                    if (nativeEvent.inputType === 'insertLineBreak' || nativeEvent.inputType === 'insertParagraph') {
                      e.preventDefault();
                      const inputEl = e.currentTarget as HTMLInputElement;
                      const trimmed = repayPersonName.trim();
                      inputEl.blur();
                      if (trimmed) {
                        const p = await ensurePerson(trimmed);
                        setRepayPersonId(p.id);
                        setRepayPersonName(p.name);
                      }
                    }
                  }}
                  placeholder="Or enter friend's name (e.g. Karthick)"
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-500 leading-relaxed">
                💡 <strong>Important:</strong> Repaying borrowed money reduces your liability to your friend and deducts from Bank/Cash, but does <strong>NOT</strong> count as personal spending.
              </div>
            </div>
          )}

          {/* Optional Note */}
          <div>
            <input
              type="text"
              tabIndex={-1}
              enterKeyHint="done"
              value={note}
              onChange={e => setNote(e.target.value)}
              onFocus={e => {
                if (isDismissingAmountRef.current) e.target.blur();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.blur();
                }
              }}
              placeholder="Optional note (e.g. Swiggy coupon applied)"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] placeholder:text-[var(--card-text-sub)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center space-x-1.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Saving...' : (
                    mode === 'EXPENSE' ? 'Save Expense' :
                    mode === 'SPLIT' ? 'Save Friend Split' :
                    mode === 'LENDING' ? 'Record Loan' :
                    mode === 'REPAY_FRIEND' ? 'Record Repayment' :
                    'Save Transaction'
                  )}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      </div>
    </div>
  );
};
