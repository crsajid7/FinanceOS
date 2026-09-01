import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  Bookmark,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';
import { SegmentedDonutChart } from '../visual/SegmentedDonutChart';

interface MonthScreenProps {
  onOpenWhereDidMoneyGo: () => void;
}

export const MonthScreen: React.FC<MonthScreenProps> = ({ onOpenWhereDidMoneyGo }) => {
  const {
    selectedCycle,
    availableCycles,
    setSelectedCycle,
    summary,
    currentBudget,
    updateBudget,
    reservedMoney,
    addReservation,
    toggleReservationFulfilled,
    deleteReservation,
  } = useFinance();

  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [newBudgetStr, setNewBudgetStr] = useState<string>(String(summary.totalBudget || 0));
  
  const [showAddReservation, setShowAddReservation] = useState<boolean>(false);
  const [resAmountStr, setResAmountStr] = useState<string>('');
  const [resPurpose, setResPurpose] = useState<string>('');
  const [resDueDate, setResDueDate] = useState<string>('');

  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({
    Food: String(currentBudget?.allocations?.['Food'] || 0),
    Rent: String(currentBudget?.allocations?.['Rent'] || 0),
    Transport: String(currentBudget?.allocations?.['Transport'] || 0),
    College: String(currentBudget?.allocations?.['College'] || 0),
    Entertainment: String(currentBudget?.allocations?.['Entertainment'] || 0),
    Groceries: String(currentBudget?.allocations?.['Groceries'] || 0),
    Personal: String(currentBudget?.allocations?.['Personal'] || 0),
  });

  const currentIndex = availableCycles.findIndex(c => c.cycleKey === selectedCycle.cycleKey);

  const handlePrevCycle = () => {
    if (currentIndex >= 0 && currentIndex < availableCycles.length - 1) {
      setSelectedCycle(availableCycles[currentIndex + 1]);
    }
  };

  const handleNextCycle = () => {
    if (currentIndex > 0) {
      setSelectedCycle(availableCycles[currentIndex - 1]);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newBudgetStr) || 0;
    const allocations: Record<string, number> = {};
    for (const [k, v] of Object.entries(allocationInputs)) {
      const val = parseFloat(v) || 0;
      if (val > 0) allocations[k] = val;
    }
    await updateBudget(selectedCycle.cycleKey, num, allocations);
    setShowBudgetModal(false);
  };

  const handleAddReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(resAmountStr);
    if (!num || num <= 0 || !resPurpose.trim()) return;
    await addReservation(num, resPurpose.trim(), resDueDate || undefined);
    setResAmountStr('');
    setResPurpose('');
    setResDueDate('');
    setShowAddReservation(false);
  };

  const PASTEL_COLORS = [
    '#60a5fa', '#fb923c', '#4ade80', '#c084fc',
    '#818cf8', '#facc15', '#f87171', '#94a3b8'
  ];

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto">
      
      {/* 1. Cycle Switcher Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevCycle}
          disabled={currentIndex >= availableCycles.length - 1}
          className="p-2.5 theme-card rounded-2xl transition-all active:scale-95 disabled:opacity-30"
          title="Previous budget cycle"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--card-text-main)]" />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase tracking-widest text-[var(--page-subtitle)] font-mono font-bold block">
            BUDGET CYCLE STATISTICS
          </span>
          <h1 className="text-xl font-black tracking-tight text-[var(--page-title)]">
            {selectedCycle.label}
          </h1>
          <span className="text-[11px] text-[var(--page-subtitle)] font-mono block">
            {selectedCycle.startDate} to {selectedCycle.endDate}
          </span>
        </div>

        <button
          onClick={handleNextCycle}
          disabled={currentIndex <= 0}
          className="p-2.5 theme-card rounded-2xl transition-all active:scale-95 disabled:opacity-30"
          title="Next budget cycle"
        >
          <ChevronRight className="w-4 h-4 text-[var(--card-text-main)]" />
        </button>
      </div>

      {/* 2. Spending Distribution Donut Card */}
      <div className="theme-card rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            PERSONAL SPENDING BREAKDOWN
          </span>
          <button
            onClick={onOpenWhereDidMoneyGo}
            className="text-xs font-bold text-indigo-500 hover:underline flex items-center space-x-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Story Report</span>
          </button>
        </div>

        {/* SVG Donut with Total Spent Centered */}
        <div className="py-2 flex justify-center">
          <SegmentedDonutChart
            centerAmount={summary.actualPersonalSpent}
            centerLabel="PERSONAL SPENT"
            items={summary.categorySpending}
            size={220}
          />
        </div>

        {/* Two-Column Category Breakdown */}
        {summary.categorySpending.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-[var(--card-divider)] text-xs">
            {summary.categorySpending.map((cat, idx) => {
              const color = PASTEL_COLORS[idx % PASTEL_COLORS.length];
              return (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate pr-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                    <span className="text-[var(--card-text-sub)] font-medium truncate">{cat.category}</span>
                  </div>
                  <span className="font-bold text-[var(--card-text-main)] font-mono-num flex-shrink-0">
                    {formatINR(cat.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center pt-3 border-t border-[var(--card-divider)]">
            <span className="text-xs text-[var(--card-text-sub)] font-mono">No spending recorded for this cycle.</span>
          </div>
        )}
      </div>

      {/* 3. Reserved Money Section */}
      <div className="theme-card rounded-3xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-main)] font-mono">
              RESERVED MONEY ({formatINR(summary.totalReserved)})
            </h2>
          </div>
          <button
            onClick={() => setShowAddReservation(!showAddReservation)}
            className="text-xs font-bold text-indigo-500 hover:underline flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {showAddReservation && (
          <form onSubmit={handleAddReservationSubmit} className="p-3.5 bg-black/10 dark:bg-black/10 rounded-2xl border border-[var(--card-divider)] space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={resAmountStr}
                onChange={e => setResAmountStr(e.target.value)}
                placeholder="Amount (₹)"
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3 py-2 rounded-xl text-[var(--card-text-main)] font-mono-num"
                required
              />
              <input
                type="text"
                value={resPurpose}
                onChange={e => setResPurpose(e.target.value)}
                placeholder="Purpose (e.g. PG Rent)"
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3 py-2 rounded-xl text-[var(--card-text-main)]"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowAddReservation(false)}
                className="flex-1 py-1.5 bg-black/10 dark:bg-black/10 text-[var(--card-text-main)] font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 bg-indigo-600 text-white font-bold rounded-xl"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {reservedMoney.length === 0 ? (
          <p className="text-xs text-[var(--card-text-sub)] italic py-2">
            No money reserved. Reserve funds for non-discretionary expenses like rent, fees, and travel.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {reservedMoney.map(r => (
              <div
                key={r.id}
                className="p-3 rounded-2xl bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <button onClick={() => toggleReservationFulfilled(r.id)}>
                    {r.isFulfilled ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-400" />}
                  </button>
                  <span className={`font-medium ${r.isFulfilled ? 'line-through text-[var(--card-text-dim)]' : 'text-[var(--card-text-main)]'}`}>
                    {r.purpose}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold font-mono-num text-[var(--card-text-main)]">{formatINR(r.amount)}</span>
                  <button onClick={() => deleteReservation(r.id)} className="text-rose-500 p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Complete Balance Sheet */}
      <div className="theme-card rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            CYCLE BALANCE SHEET
          </h2>
          <button
            onClick={() => {
              setNewBudgetStr(String(summary.totalBudget || 0));
              setShowBudgetModal(true);
            }}
            className="flex items-center space-x-1 text-xs text-indigo-500 font-bold hover:underline"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Set Cycle Budget</span>
          </button>
        </div>

        <div className="space-y-2.5 text-xs font-medium">
          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Total Cycle Budget / Received</span>
            <span className="font-black text-emerald-500 font-mono-num text-sm">
              {formatINR(summary.totalBudget)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Reserved Money (Committed)</span>
            <span className="font-black text-amber-500 font-mono-num text-sm">
              − {formatINR(summary.totalReserved)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Actual Personal Spending</span>
            <span className="font-black text-rose-500 font-mono-num text-sm">
              − {formatINR(summary.actualPersonalSpent)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Money Lent to Friends</span>
            <span className="font-black text-amber-500 font-mono-num">
              {formatINR(summary.totalMoneyLent)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Paid on Behalf of Friends</span>
            <span className="font-black text-indigo-500 font-mono-num">
              {formatINR(summary.totalPaidForOthers)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Reimbursements & Repayments Settled</span>
            <span className="font-black text-emerald-500 font-mono-num">
              + {formatINR(summary.totalReimbursed + summary.totalLoanRepayments)}
            </span>
          </div>

          <div className="pt-3 border-t border-[var(--card-divider)] flex items-center justify-between">
            <span className="text-sm font-black text-[var(--card-text-main)]">
              {summary.isOverBudget ? 'Over Budget' : 'Spendable Money Left'}
            </span>
            <span className={`text-2xl font-black font-mono-num ${
              summary.isOverBudget ? 'text-rose-500' : 'text-[var(--card-text-main)]'
            }`}>
              {summary.isOverBudget ? `${formatINR(summary.overBudgetAmount)} OVER` : formatINR(summary.spendableMoney)}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md theme-card rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-[var(--card-text-main)]">Set Cycle Budget</h3>
            
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--card-text-sub)] block mb-1 font-mono">
                  TOTAL BUDGET FOR {selectedCycle.label.toUpperCase()} (₹)
                </label>
                <input
                  type="number"
                  value={newBudgetStr}
                  onChange={e => setNewBudgetStr(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-base font-bold px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 font-mono-num"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--card-text-main)] block mb-2 font-mono">
                  OPTIONAL CATEGORY ALLOCATIONS
                </label>
                <div className="space-y-2">
                  {Object.entries(allocationInputs).map(([cat, val]) => (
                    <div key={cat} className="flex items-center justify-between bg-black/5 dark:bg-black/5 p-2.5 rounded-xl border border-[var(--card-divider)]">
                      <span className="text-xs text-[var(--card-text-main)]">{cat}</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-[var(--card-text-sub)] font-mono">₹</span>
                        <input
                          type="number"
                          value={val}
                          onChange={e => setAllocationInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                          className="w-24 bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-right px-2 py-1 text-xs font-bold rounded-lg text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 font-mono-num"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 bg-black/10 dark:bg-black/10 text-xs font-bold text-[var(--card-text-main)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Budget</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
