import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Users,
  HandCoins,
  ShieldCheck,
  Edit3,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, getYearMonth } from '../../services/accountingEngine';
import { SegmentedDonutChart } from '../visual/SegmentedDonutChart';

interface MonthScreenProps {
  onOpenWhereDidMoneyGo: () => void;
}

export const MonthScreen: React.FC<MonthScreenProps> = ({ onOpenWhereDidMoneyGo }) => {
  const {
    selectedMonth,
    setSelectedMonth,
    summary,
    currentBudget,
    updateBudget,
  } = useFinance();

  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [newBudgetStr, setNewBudgetStr] = useState<string>(String(summary.totalBudget || 0));
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({
    Food: String(currentBudget?.allocations?.['Food'] || 0),
    Rent: String(currentBudget?.allocations?.['Rent'] || 0),
    Transport: String(currentBudget?.allocations?.['Transport'] || 0),
    College: String(currentBudget?.allocations?.['College'] || 0),
    Entertainment: String(currentBudget?.allocations?.['Entertainment'] || 0),
    Groceries: String(currentBudget?.allocations?.['Groceries'] || 0),
    Personal: String(currentBudget?.allocations?.['Personal'] || 0),
  });

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(getYearMonth(prevDate));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(getYearMonth(nextDate));
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newBudgetStr) || 0;
    const allocations: Record<string, number> = {};
    for (const [k, v] of Object.entries(allocationInputs)) {
      const val = parseFloat(v) || 0;
      if (val > 0) allocations[k] = val;
    }
    await updateBudget(selectedMonth, num, allocations);
    setShowBudgetModal(false);
  };

  const PASTEL_COLORS = [
    '#60a5fa', '#fb923c', '#4ade80', '#c084fc',
    '#818cf8', '#facc15', '#f87171', '#94a3b8'
  ];

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto">
      
      {/* Month Header & Pill Switcher */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2.5 theme-card rounded-2xl transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--card-text-main)]" />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase tracking-widest text-[var(--page-subtitle)] font-mono font-bold block">
            STATISTICS & BREAKDOWN
          </span>
          <h1 className="text-xl font-black tracking-tight text-[var(--page-title)]">
            {summary.monthName}
          </h1>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2.5 theme-card rounded-2xl transition-all active:scale-95"
        >
          <ChevronRight className="w-4 h-4 text-[var(--card-text-main)]" />
        </button>
      </div>

      {/* 1. Segmented Pill Donut Visualizer Card */}
      <div className="theme-card rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            SPENDING DISTRIBUTION
          </span>
          <button
            onClick={onOpenWhereDidMoneyGo}
            className="text-xs font-bold text-indigo-500 hover:underline flex items-center space-x-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Story Report</span>
          </button>
        </div>

        {/* SVG Pill Donut with center text */}
        <div className="py-2 flex justify-center">
          <SegmentedDonutChart
            centerAmount={summary.actualPersonalSpent}
            centerLabel="TOTAL SPENT"
            items={summary.categorySpending}
            size={220}
          />
        </div>

        {/* Two-Column Category Breakdown Grid with Colored Dots */}
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
            <span className="text-xs text-[var(--card-text-sub)] font-mono">No spending recorded for this month.</span>
          </div>
        )}
      </div>

      {/* 2. Full Financial Balance Sheet */}
      <div className="theme-card rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            FINANCIAL BALANCE SHEET
          </h2>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center space-x-1 text-xs text-indigo-500 font-bold hover:underline"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Budget</span>
          </button>
        </div>

        <div className="space-y-3 text-xs font-medium">
          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Money Received / Budget</span>
            <span className="font-black text-emerald-500 font-mono-num text-sm">
              {formatINR(summary.totalBudget)}
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
            <span>Paid for Other Friends</span>
            <span className="font-black text-indigo-500 font-mono-num">
              {formatINR(summary.totalPaidForOthers)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Money Received Back (Settled)</span>
            <span className="font-black text-emerald-500 font-mono-num">
              + {formatINR(summary.totalReimbursed + summary.totalLoanRepayments)}
            </span>
          </div>

          <div className="pt-3 border-t border-[var(--card-divider)] flex items-center justify-between">
            <span className="text-sm font-black text-[var(--card-text-main)]">Remaining Budget</span>
            <span className="text-2xl font-black text-[var(--card-text-main)] font-mono-num">
              {formatINR(summary.leftToSpend)}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md theme-card rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-[var(--card-text-main)]">Set Monthly Budget & Allocations</h3>
            
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--card-text-sub)] block mb-1 font-mono">TOTAL MONTHLY BUDGET (₹)</label>
                <input
                  type="number"
                  value={newBudgetStr}
                  onChange={e => setNewBudgetStr(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-base font-bold px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 font-mono-num"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--card-text-main)] block mb-2 font-mono">OPTIONAL CATEGORY ALLOCATIONS</label>
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
