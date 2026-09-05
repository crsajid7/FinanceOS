import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Landmark,
  Banknote,
  HandCoins,
  Plus,
  ArrowDownLeft,
  Wand2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { MoneyLocationId } from '../../types/finance';
import { formatINR } from '../../services/accountingEngine';
import { parseNaturalLanguage } from '../../services/naturalLanguageParser';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { useBackHandler } from '../../hooks/useBackHandler';

interface MoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_SOURCES = [
  'Dad',
  'Mom',
  'Salary',
  'Stipend',
  'Freelance',
  'Scholarship',
  'Gift',
  'Other',
];

type MoneyTab = 'PARSING' | 'INCOME' | 'BORROWED';

const MONEY_TABS: MoneyTab[] = ['PARSING', 'INCOME', 'BORROWED'];

export const MoneyModal: React.FC<MoneyModalProps> = ({ isOpen, onClose }) => {
  const { addTransaction, recordBorrowedMoney, people, addPerson, accounts, ensurePerson } = useFinance();
  
  const [tab, setTab] = useState<MoneyTab>('INCOME');
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('Dad');
  const [customSource, setCustomSource] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<MoneyLocationId>('acc_bank');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Borrowed Money specific
  const [borrowPersonId, setBorrowPersonId] = useState<string>('');
  const [borrowPersonName, setBorrowPersonName] = useState<string>('');
  const [newFriendName, setNewFriendName] = useState<string>('');

  // Parsing tab specific
  const [nlText, setNlText] = useState<string>('');
  const [nlError, setNlError] = useState<string>('');

  const amountInputRef = useRef<HTMLInputElement>(null);
  const nlInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const handleNextMoneyTab = () => {
    const currentIndex = MONEY_TABS.indexOf(tab);
    if (currentIndex < MONEY_TABS.length - 1) {
      setTab(MONEY_TABS[currentIndex + 1]);
    }
  };

  const handlePrevMoneyTab = () => {
    const currentIndex = MONEY_TABS.indexOf(tab);
    if (currentIndex > 0) {
      setTab(MONEY_TABS[currentIndex - 1]);
    }
  };

  useBackHandler('money-modal', isOpen, onClose);

  useSwipeNavigation({
    onSwipeLeft: handleNextMoneyTab,
    onSwipeRight: handlePrevMoneyTab,
    onEdgeBack: onClose,
    disabled: !isOpen,
    threshold: 50,
    targetRef: modalContentRef,
  });

  useEffect(() => {
    if (isOpen) {
      setTab('INCOME');
      setAmountStr('');
      setSelectedSource('Dad');
      setCustomSource('');
      setSelectedAccountId('acc_bank');
      setNote('');
      setErrorMsg('');
      setBorrowPersonId('');
      setBorrowPersonName('');
      setNewFriendName('');
      setNlText('');
      setNlError('');
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (tab === 'PARSING') {
      setTimeout(() => {
        nlInputRef.current?.focus();
      }, 50);
    }
  }, [tab]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr) || 0;
  const bankAccount = accounts.find(a => a.id === 'acc_bank') || accounts[0];
  const cashAccount = accounts.find(a => a.id === 'acc_cash') || accounts[1];

  const handleAddNewFriend = async () => {
    if (!newFriendName.trim()) return;
    const created = await addPerson(newFriendName.trim());
    setBorrowPersonId(created.id);
    setBorrowPersonName(created.name);
    setNewFriendName('');
  };

  const handleParseNL = async () => {
    setNlError('');
    if (!nlText.trim()) return;

    const knownFriendNames = (people || []).map(p => p.name);
    const parsed = parseNaturalLanguage(nlText, knownFriendNames);
    if (!parsed) {
      setNlError('Could not understand. Try: "received 500 from Dad into bank"');
      return;
    }

    setAmountStr(String(parsed.amount));
    if (parsed.account) {
      setSelectedAccountId(parsed.account);
    } else {
      setSelectedAccountId('acc_bank');
    }
    setNote(parsed.note || '');

    const isBorrow = /\b(borrowed|borrow|borrowing|loan from|took from|taken from)\b/i.test(nlText);

    if (isBorrow) {
      setTab('BORROWED');
      if (parsed.personName) {
        const p = await ensurePerson(parsed.personName);
        setBorrowPersonId(p.id);
        setBorrowPersonName(p.name);
      }
    } else {
      setTab('INCOME');
      if (parsed.personName) {
        const matchedSource = COMMON_SOURCES.find(s => s.toLowerCase() === parsed.personName?.toLowerCase());
        if (matchedSource) {
          setSelectedSource(matchedSource);
          setCustomSource('');
        } else {
          setSelectedSource('Other');
          setCustomSource(parsed.personName);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0.');
      return;
    }

    try {
      if (tab === 'INCOME') {
        const sourceName = selectedSource === 'Other' && customSource.trim()
          ? customSource.trim()
          : selectedSource;

        await addTransaction({
          type: 'MONEY_RECEIVED',
          amount: numericAmount,
          category: 'Income',
          source: sourceName,
          note: note.trim() || undefined,
          accountId: selectedAccountId,
        });
      } else {
        // BORROWED MONEY
        const targetName = borrowPersonName.trim() || (people.find(p => p.id === borrowPersonId)?.name);
        if (!targetName) {
          setErrorMsg('Please select or add the friend you borrowed from.');
          return;
        }

        let pid = borrowPersonId;
        if (!pid) {
          const created = await addPerson(targetName);
          pid = created.id;
        }

        await recordBorrowedMoney(
          numericAmount,
          pid,
          targetName,
          selectedAccountId,
          note.trim() || undefined
        );
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record money received.';
      setErrorMsg(message);
    }
  };

  return (
    <div ref={modalContentRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md theme-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-divider)] flex items-center justify-between bg-black/5 dark:bg-black/5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-base font-black text-[var(--card-text-main)] tracking-tight">
              {tab === 'PARSING' && 'Quick Entry'}
              {tab === 'INCOME' && 'Record Money In'}
              {tab === 'BORROWED' && 'Record Borrowed Money'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--card-divider)] bg-black/5 dark:bg-black/5 px-3 pt-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('PARSING')}
            aria-label="Quick Entry"
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl flex items-center justify-center whitespace-nowrap transition-all ${
              tab === 'PARSING'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-indigo-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <Wand2 className="w-4 h-4 text-indigo-500" />
          </button>

          <button
            type="button"
            onClick={() => setTab('INCOME')}
            className={`flex-1 min-w-[120px] py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all ${
              tab === 'INCOME'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-emerald-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>Money Received</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('BORROWED')}
            className={`flex-1 min-w-[140px] py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1.5 whitespace-nowrap transition-all ${
              tab === 'BORROWED'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-amber-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5 text-amber-500" />
            <span>Borrowed from Friend</span>
          </button>
        </div>

        {/* Modal Body */}
        {tab === 'PARSING' ? (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
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
                    placeholder="e.g. received 500 from Dad into bank"
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
                    onClick={() => setNlText('received 500 from Dad into bank')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "received 500 from Dad into bank"
                  </div>
                  <div
                    onClick={() => setNlText('got 1000 salary')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "got 1000 salary"
                  </div>
                  <div
                    onClick={() => setNlText('pocket money 2000 in cash')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "pocket money 2000 in cash"
                  </div>
                  <div
                    onClick={() => setNlText('borrowed 500 from Karthick')}
                    className="p-2 rounded-lg bg-black/5 dark:bg-black/5 hover:text-[var(--card-text-main)] cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    "borrowed 500 from Karthick"
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Large Amount Input */}
          <div className="text-center py-2">
            <span className="text-xs font-bold text-[var(--card-text-sub)] uppercase tracking-wider block mb-1 font-mono">
              {tab === 'INCOME' ? 'AMOUNT RECEIVED' : 'AMOUNT BORROWED'}
            </span>
            <div className="inline-flex items-center justify-center bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl px-4 py-2 focus-within:border-emerald-500 transition-colors w-full">
              <span className="text-2xl font-bold text-[var(--card-text-sub)] mr-1.5 font-mono">₹</span>
              <input
                ref={amountInputRef}
                type="number"
                step="any"
                inputMode="decimal"
                enterKeyHint="done"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.blur();
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

          {/* Received Into? (Strictly Bank Account or Cash in Hand) */}
          <div>
            <label className="text-xs font-bold text-[var(--card-text-sub)] uppercase tracking-wider block mb-2 font-mono">
              WHERE DID YOU RECEIVE THIS MONEY?
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
                  Current: {formatINR(bankAccount?.balance || 0)}
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
                  Current: {formatINR(cashAccount?.balance || 0)}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: REGULAR MONEY RECEIVED SOURCE */}
          {tab === 'INCOME' && (
            <div>
              <label className="text-xs font-bold text-[var(--card-text-sub)] uppercase tracking-wider block mb-2 font-mono">
                WHO SENT THIS MONEY?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COMMON_SOURCES.map(source => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSelectedSource(source)}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all text-center ${
                      selectedSource === source
                        ? 'bg-emerald-600 border-transparent text-white shadow-sm'
                        : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>

              {selectedSource === 'Other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customSource}
                    onChange={e => setCustomSource(e.target.value)}
                    placeholder="Specify source (e.g. Uncle, Reimbursement)"
                    className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BORROWED FROM FRIEND */}
          {tab === 'BORROWED' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <div>
                <label className="text-xs font-bold text-[var(--card-text-main)] block mb-1.5">Who did you borrow from?</label>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {people.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBorrowPersonId(p.id);
                        setBorrowPersonName(p.name);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1 shadow-sm ${
                        borrowPersonName === p.name
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={e => setNewFriendName(e.target.value)}
                    placeholder="Or enter friend name (e.g. Karthick)"
                    className="flex-1 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewFriend}
                    className="px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"
                  >
                    Select
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-500 leading-relaxed">
                💡 <strong>Important:</strong> Borrowed money physically adds to your Bank/Cash, but is recorded as a liability owed to your friend and does <strong>NOT</strong> count as earned income.
              </div>
            </div>
          )}

          {/* Optional Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note (e.g. For project materials)"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] placeholder:text-[var(--card-text-sub)] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs text-rose-500 p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">{errorMsg}</p>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 px-4 font-black rounded-2xl text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5 text-white ${
                tab === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{tab === 'INCOME' ? 'Record Money Received' : 'Record Borrowed Money'}</span>
            </button>
          </div>
        </form>
        )}

      </div>
    </div>
  );
};
