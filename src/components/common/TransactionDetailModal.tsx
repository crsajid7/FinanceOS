import React, { useState } from 'react';
import {
  X,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  RotateCcw,
  Users,
  HandCoins,
  Check,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types/finance';
import { formatINR } from '../../services/accountingEngine';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
}) => {
  const { deleteTransaction, updateTransaction } = useFinance();
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');

  if (!transaction) return null;

  const handleStartEdit = () => {
    setAmountStr(String(transaction.amount));
    setCategory(transaction.category);
    setNote(transaction.note || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const num = parseFloat(amountStr);
    if (!num || num <= 0) return;

    await updateTransaction(transaction.id, {
      amount: num,
      category,
      note: note.trim() || undefined,
      userShare: transaction.type === 'SPLIT' ? Math.round(num / 2) : undefined,
    });
    setIsEditing(false);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this transaction? All balances will automatically recalculate.')) {
      await deleteTransaction(transaction.id);
      onClose();
    }
  };

  const isPositive = ['MONEY_RECEIVED', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'REFUND'].includes(transaction.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm theme-card rounded-3xl p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            TRANSACTION DETAILS
          </span>
          <button
            onClick={onClose}
            className="p-1 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isEditing ? (
          <div className="space-y-4">
            {/* Amount Hero */}
            <div className="text-center py-3 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl">
              <span
                className={`text-3xl font-black font-mono-num ${
                  isPositive ? 'text-emerald-500' : transaction.type === 'LENDING' ? 'text-amber-500' : 'text-rose-500'
                }`}
              >
                {isPositive ? '+' : '−'} {formatINR(transaction.amount)}
              </span>
              <span className="text-xs font-bold uppercase text-[var(--card-text-sub)] block mt-1 font-mono">
                {transaction.type.replace('_', ' ')}
              </span>
            </div>

            {/* Details List */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-black/5 dark:bg-black/5 rounded-xl border border-[var(--card-divider)]">
                <span className="text-[var(--card-text-sub)]">Category</span>
                <span className="font-bold text-[var(--card-text-main)]">{transaction.category}</span>
              </div>

              {transaction.note && (
                <div className="p-3 bg-black/5 dark:bg-black/5 rounded-xl border border-[var(--card-divider)]">
                  <span className="text-[var(--card-text-sub)] block mb-0.5">Note</span>
                  <span className="font-medium text-[var(--card-text-main)]">{transaction.note}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-black/5 dark:bg-black/5 rounded-xl border border-[var(--card-divider)]">
                <span className="text-[var(--card-text-sub)]">Date & Time</span>
                <span className="font-medium text-[var(--card-text-main)] font-mono-num">
                  {transaction.date} {transaction.time && `· ${transaction.time}`}
                </span>
              </div>

              {/* Split Breakdown */}
              {transaction.type === 'SPLIT' && transaction.splits && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase flex items-center space-x-1 font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>Split Breakdown</span>
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="text-[var(--card-text-sub)]">Your Share:</span>
                    <span className="font-bold text-[var(--card-text-main)]">{formatINR(transaction.userShare || 0)}</span>
                  </div>
                  {transaction.splits.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono-num text-indigo-500">
                      <span>{s.personName}:</span>
                      <span>{formatINR(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lending Details */}
              {transaction.type === 'LENDING' && transaction.personName && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-mono-num text-amber-500 flex items-center justify-between">
                  <span>Lent to {transaction.personName}</span>
                  <span className="font-bold">{formatINR(transaction.amount)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2 border-t border-[var(--card-divider)]">
              <button
                onClick={handleStartEdit}
                className="flex-1 py-2.5 bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold flex items-center justify-center transition-colors"
                title="Delete transaction"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--card-text-sub)] block mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-sm font-bold px-3.5 py-2 rounded-xl text-[var(--card-text-main)] font-mono-num focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--card-text-sub)] block mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--card-text-sub)] block mb-1">Note</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 bg-black/10 dark:bg-black/10 text-xs font-semibold text-[var(--card-text-main)] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-indigo-600 text-xs font-bold text-white rounded-xl flex items-center justify-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
