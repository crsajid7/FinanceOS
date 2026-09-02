import React, { useState } from 'react';
import {
  BarChart3,
  Bookmark,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Landmark,
  Banknote,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';
import { SegmentedDonutChart } from '../visual/SegmentedDonutChart';
import { ReportingPeriod } from '../../types/finance';

interface MonthScreenProps {
  onOpenWhereDidMoneyGo: () => void;
}

export const MonthScreen: React.FC<MonthScreenProps> = ({ onOpenWhereDidMoneyGo }) => {
  const {
    selectedPeriod,
    setSelectedPeriod,
    overview,
    reservedMoney,
    addReservation,
    toggleReservationFulfilled,
    deleteReservation,
  } = useFinance();

  const [showAddReservation, setShowAddReservation] = useState<boolean>(false);
  const [resAmountStr, setResAmountStr] = useState<string>('');
  const [resPurpose, setResPurpose] = useState<string>('');
  const [resDueDate, setResDueDate] = useState<string>('');

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

  const PERIOD_OPTIONS: { id: ReportingPeriod; label: string }[] = [
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
    { id: 'TODAY', label: 'Today' },
    { id: 'ALL_TIME', label: 'All Time' },
  ];

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto">
      
      {/* 1. Reporting Period Switcher */}
      <div className="space-y-3">
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-widest text-[var(--page-subtitle)] font-mono font-bold block">
            FINANCIAL REPORTING
          </span>
          <h1 className="text-xl font-black tracking-tight text-[var(--page-title)]">
            {overview.periodLabel}
          </h1>
        </div>

        {/* Period Chips */}
        <div className="w-full max-w-full overflow-x-auto no-scrollbar pb-1">
          <div className="flex space-x-2 min-w-max px-1 sm:justify-center">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors border shadow-sm flex-shrink-0 ${
                  selectedPeriod === opt.id
                    ? 'bg-indigo-600 text-white border-transparent'
                    : 'theme-card text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Spending Distribution Donut Card */}
      <div className="theme-card rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            PERSONAL SPENDING BREAKDOWN
          </span>
          <button
            onClick={onOpenWhereDidMoneyGo}
            className="text-xs font-bold text-indigo-500 hover:underline flex items-center space-x-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Story Report</span>
          </button>
        </div>

        {/* SVG Donut with Total Spent Centered */}
        <div className="py-2 flex justify-center">
          <SegmentedDonutChart
            centerAmount={overview.actualPersonalSpentInPeriod}
            centerLabel="PERSONAL SPENT"
            items={overview.categorySpending}
            size={220}
          />
        </div>

        {/* Two-Column Category Breakdown */}
        {overview.categorySpending.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-[var(--card-divider)] text-xs">
            {overview.categorySpending.map((cat, idx) => {
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
            <span className="text-xs text-[var(--card-text-sub)] font-mono">No spending recorded in this period.</span>
          </div>
        )}
      </div>

      {/* 3. Reserved Money Section */}
      <div className="theme-card rounded-3xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-main)] font-mono">
              RESERVED MONEY ({formatINR(overview.totalReserved)})
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

      {/* 4. Period Cash Flow Statement */}
      <div className="theme-card rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="pb-3 border-b border-[var(--card-divider)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono">
            {overview.periodLabel.toUpperCase()} CASH FLOW SUMMARY
          </h2>
        </div>

        <div className="space-y-2.5 text-xs font-medium">
          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Total Inflows Received in Period</span>
            <span className="font-black text-emerald-500 font-mono-num text-sm">
              + {formatINR(overview.totalReceivedInPeriod)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Actual Personal Spending in Period</span>
            <span className="font-black text-rose-500 font-mono-num text-sm">
              − {formatINR(overview.actualPersonalSpentInPeriod)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Paid on Behalf of Friends</span>
            <span className="font-black text-indigo-500 font-mono-num">
              {formatINR(overview.totalPaidForOthersInPeriod)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Money Lent to Friends</span>
            <span className="font-black text-amber-500 font-mono-num">
              {formatINR(overview.totalMoneyLentInPeriod)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--card-text-sub)]">
            <span>Reimbursements & Repayments Settled</span>
            <span className="font-black text-emerald-500 font-mono-num">
              + {formatINR(overview.totalReimbursedInPeriod + overview.totalLoanRepaymentsInPeriod)}
            </span>
          </div>

          <div className="pt-3 border-t border-[var(--card-divider)] space-y-1.5">
            <div className="flex items-center justify-between text-[var(--card-text-sub)]">
              <span>Current Bank Account</span>
              <span className="font-bold text-[var(--card-text-main)] font-mono-num">{formatINR(overview.bankBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--card-text-sub)]">
              <span>Current Cash in Hand</span>
              <span className="font-bold text-[var(--card-text-main)] font-mono-num">{formatINR(overview.cashBalance)}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-black text-[var(--card-text-main)]">Spendable Cash Right Now</span>
              <span className="text-2xl font-black font-mono-num text-emerald-500">
                {formatINR(overview.spendableMoney)}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
