import React, { useState, useEffect } from 'react';
import { X, Scale, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ isOpen, onClose }) => {
  const { accounts, recordCashAdjustment } = useFinance();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [actualCashStr, setActualCashStr] = useState<string>('');
  const [reason, setReason] = useState<string>('Forgot to record an expense');

  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      const defaultAcc = accounts[0];
      setSelectedAccountId(defaultAcc.id);
      setActualCashStr(String(defaultAcc.balance));
      setReason('Forgot to record an expense');
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const currentAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const appBalance = currentAccount?.balance || 0;
  const actualCash = parseFloat(actualCashStr) || 0;
  const difference = actualCash - appBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;
    await recordCashAdjustment(actualCash, currentAccount.id, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm theme-card rounded-3xl p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-black text-[var(--card-text-main)]">Reconcile Money</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">SELECT ACCOUNT</label>
            <select
              value={selectedAccountId}
              onChange={e => {
                setSelectedAccountId(e.target.value);
                const acc = accounts.find(a => a.id === e.target.value);
                if (acc) setActualCashStr(String(acc.balance));
              }}
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  {acc.name} (App says {formatINR(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] text-center">
            <div>
              <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">APP SAYS</span>
              <span className="text-lg font-black font-mono-num text-[var(--card-text-main)]">{formatINR(appBalance)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">I ACTUALLY HAVE</span>
              <div className="flex items-center justify-center space-x-1 mt-0.5">
                <span className="font-mono text-xs text-[var(--card-text-sub)]">₹</span>
                <input
                  type="number"
                  step="any"
                  value={actualCashStr}
                  onChange={e => setActualCashStr(e.target.value)}
                  className="w-20 bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-center font-bold text-base rounded-lg text-[var(--card-text-main)] font-mono-num focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Difference Highlight */}
          {difference !== 0 && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              difference < 0
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold">Difference: {formatINR(difference)}</span>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold">
                {difference < 0 ? 'Missing cash' : 'Extra cash'}
              </span>
            </div>
          )}

          <div>
            <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">REASON FOR ADJUSTMENT</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Forgot to record an expense"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Record Cash Adjustment ({formatINR(difference)})</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
