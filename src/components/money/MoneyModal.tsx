import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Sparkles,
  Landmark,
  Banknote,
  HandCoins,
  Plus,
  ArrowDownLeft,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { MoneyLocationId } from '../../types/finance';
import { formatINR } from '../../services/accountingEngine';
import confetti from 'canvas-confetti';

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

export const MoneyModal: React.FC<MoneyModalProps> = ({ isOpen, onClose }) => {
  const { addTransaction, recordBorrowedMoney, people, addPerson, accounts } = useFinance();
  
  const [tab, setTab] = useState<'INCOME' | 'BORROWED'>('INCOME');
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

  const amountInputRef = useRef<HTMLInputElement>(null);

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
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

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

      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.85 },
          colors: ['#10b981', '#6366f1', '#3b82f6'],
        });
      } catch {
        // Fallback
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record money received.';
      setErrorMsg(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md theme-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-divider)] flex items-center justify-between bg-black/5 dark:bg-black/5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-base font-black text-[var(--card-text-main)] tracking-tight">
              {tab === 'INCOME' ? 'Record Money In' : 'Record Borrowed Money'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Regular Money vs Borrowed from Friend */}
        <div className="flex border-b border-[var(--card-divider)] bg-black/5 dark:bg-black/5 px-3 pt-2">
          <button
            type="button"
            onClick={() => setTab('INCOME')}
            className={`flex-1 py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1.5 transition-all ${
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
            className={`flex-1 py-2 text-xs font-black rounded-t-xl flex items-center justify-center space-x-1.5 transition-all ${
              tab === 'BORROWED'
                ? 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] border-t-2 border-amber-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5 text-amber-500" />
            <span>Borrowed from Friend</span>
          </button>
        </div>

        {/* Form Body */}
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
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
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

      </div>
    </div>
  );
};
