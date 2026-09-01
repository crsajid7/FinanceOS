import React, { useState } from 'react';
import { X, Bookmark, Plus, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface ReservedMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReservedMoneyModal: React.FC<ReservedMoneyModalProps> = ({ isOpen, onClose }) => {
  const { reservedMoney, addReservation, toggleReservationFulfilled, deleteReservation } = useFinance();

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [amountStr, setAmountStr] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountStr);
    if (!num || num <= 0 || !purpose.trim()) return;

    await addReservation(num, purpose.trim(), dueDate || undefined);
    setAmountStr('');
    setPurpose('');
    setDueDate('');
    setShowAddForm(false);
  };

  const totalReserved = reservedMoney
    .filter(r => !r.isFulfilled)
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md theme-card rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-black text-[var(--card-text-main)]">Reserved Money</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Card */}
        <div className="p-4 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--card-text-sub)] font-mono font-bold block">
              TOTAL COMMITTED FUNDS
            </span>
            <span className="text-2xl font-black text-[var(--card-text-main)] font-mono-num mt-0.5 block">
              {formatINR(totalReserved)}
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Aside</span>
          </button>
        </div>

        {/* Quick Add Form */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-4 bg-black/10 dark:bg-black/10 rounded-2xl border border-[var(--card-divider)] space-y-3">
            <span className="text-xs font-bold text-[var(--card-text-main)] block font-mono">NEW RESERVATION</span>
            <div>
              <label className="text-[11px] text-[var(--card-text-sub)] block mb-1">Amount to reserve (₹)</label>
              <input
                type="number"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-sm font-bold px-3 py-2 rounded-xl text-[var(--card-text-main)] font-mono-num focus:outline-none focus:border-indigo-500"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--card-text-sub)] block mb-1">Purpose / Reason</label>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. PG Rent, Bus Pass, Exam Fee"
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--card-text-sub)] block mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 bg-black/10 dark:bg-black/10 text-xs font-bold text-[var(--card-text-main)] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Reservations List */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--card-text-sub)] font-mono font-bold px-1 block">
            ACTIVE RESERVATIONS
          </span>

          {reservedMoney.length === 0 ? (
            <p className="text-xs text-[var(--card-text-sub)] italic p-4 bg-black/5 dark:bg-black/5 rounded-2xl text-center">
              No money reserved. Reserve money for rent, fees or travel so you don't accidentally spend it.
            </p>
          ) : (
            <div className="space-y-2">
              {reservedMoney.map(r => (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                    r.isFulfilled
                      ? 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] opacity-60'
                      : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleReservationFulfilled(r.id)}
                      className="text-indigo-500 hover:text-indigo-400 p-0.5"
                      title={r.isFulfilled ? 'Mark unfulfilled' : 'Mark fulfilled'}
                    >
                      {r.isFulfilled ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                    </button>
                    <div>
                      <span className={`text-xs font-bold block text-[var(--card-text-main)] ${r.isFulfilled ? 'line-through' : ''}`}>
                        {r.purpose}
                      </span>
                      {r.dueDate && (
                        <span className="text-[10px] text-[var(--card-text-dim)] font-mono block">
                          Due: {r.dueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black font-mono-num text-[var(--card-text-main)]">
                      {formatINR(r.amount)}
                    </span>
                    <button
                      onClick={() => deleteReservation(r.id)}
                      className="text-rose-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
