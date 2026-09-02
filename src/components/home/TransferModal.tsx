import React, { useState } from 'react';
import { X, ArrowRightLeft, Check, AlertCircle, Landmark, Banknote } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';
import { MoneyLocationId } from '../../types/finance';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const { accounts, recordTransfer, verifyBalance } = useFinance();
  const [fromAccountId, setFromAccountId] = useState<MoneyLocationId>('acc_bank');
  const [toAccountId, setToAccountId] = useState<MoneyLocationId>('acc_cash');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const bankAccount = accounts.find(a => a.id === 'acc_bank') || accounts[0];
  const cashAccount = accounts.find(a => a.id === 'acc_cash') || accounts[1];

  const handleSwap = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and destination accounts must be different.');
      return;
    }

    const check = verifyBalance(fromAccountId, amount);
    if (!check.hasSufficient) {
      setErrorMsg(`Insufficient funds: You only have ${formatINR(check.currentBalance)} in ${check.accountName}.`);
      return;
    }

    try {
      await recordTransfer(amount, fromAccountId, toAccountId, note.trim() || undefined);
      setAmountStr('');
      setNote('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Transfer failed.');
    }
  };

  const sourceBalance = fromAccountId === 'acc_bank' ? bankAccount?.balance || 0 : cashAccount?.balance || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm theme-card rounded-3xl p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-black text-[var(--card-text-main)]">Transfer Money</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Transfer Route Selector */}
          <div className="p-3.5 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-[var(--card-text-sub)] block">FROM</span>
                <span className="text-sm font-black text-[var(--card-text-main)] flex items-center space-x-1.5 mt-0.5">
                  {fromAccountId === 'acc_bank' ? <Landmark className="w-3.5 h-3.5 text-indigo-500" /> : <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{fromAccountId === 'acc_bank' ? 'Bank Account' : 'Cash in Hand'}</span>
                </span>
                <span className="text-[10px] text-[var(--card-text-dim)] font-mono block">
                  Available: {formatINR(sourceBalance)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSwap}
                className="p-2 rounded-xl bg-black/10 dark:bg-black/10 hover:bg-black/20 text-indigo-500 transition-transform active:scale-90"
                title="Swap source and destination"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono font-bold text-[var(--card-text-sub)] block">TO</span>
                <span className="text-sm font-black text-[var(--card-text-main)] flex items-center justify-end space-x-1.5 mt-0.5">
                  {toAccountId === 'acc_bank' ? <Landmark className="w-3.5 h-3.5 text-indigo-500" /> : <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{toAccountId === 'acc_bank' ? 'Bank Account' : 'Cash in Hand'}</span>
                </span>
                <span className="text-[10px] text-[var(--card-text-dim)] font-mono block">
                  {toAccountId === 'acc_bank' ? 'ATM Deposit / UPI' : 'ATM Cash Withdrawal'}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">AMOUNT TO TRANSFER (₹)</label>
            <input
              type="number"
              step="any"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-base font-black px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] font-mono-num focus:outline-none focus:border-indigo-500"
              required
              autoFocus
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">NOTE / REASON (OPTIONAL)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. ATM withdrawal for auto/canteen"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3.5 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Transfer Funds</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
