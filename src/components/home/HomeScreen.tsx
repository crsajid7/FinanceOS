import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  Plus,
  Scale,
  Bookmark,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../services/accountingEngine';
import { WalletCard } from '../visual/WalletCard';
import { ReconciliationModal } from './ReconciliationModal';
import { ReservedMoneyModal } from './ReservedMoneyModal';

interface HomeScreenProps {
  onOpenSpent: () => void;
  onOpenMoney: () => void;
  onOpenWhereDidMoneyGo: () => void;
  onNavigateToPeople: () => void;
  onNavigateToHistory: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenSpent,
  onOpenMoney,
  onOpenWhereDidMoneyGo,
  onNavigateToPeople,
  onNavigateToHistory,
}) => {
  const { summary, transactions, selectedCycle } = useFinance();
  const { currentUser } = useAuth();

  const [showReconciliation, setShowReconciliation] = useState<boolean>(false);
  const [showReservedModal, setShowReservedModal] = useState<boolean>(false);

  const recentTransactions = transactions.slice(0, 4);

  return (
    <div className="space-y-5 pb-28 max-w-2xl mx-auto">
      
      {/* 1. Header: Greeting & Active Budget Cycle */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold text-[var(--page-subtitle)] uppercase tracking-wider block font-mono">
            FINANCEOS
          </span>
          <h1 className="text-xl font-black tracking-tight text-[var(--page-title)]">
            {currentUser.name}
          </h1>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full theme-card text-xs font-mono font-bold">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[var(--card-text-main)]">{selectedCycle.label}</span>
          <span className="text-[var(--card-text-sub)]">· {selectedCycle.daysRemaining}d left</span>
        </div>
      </div>

      {/* 2. Primary Spendable Money Hero Card */}
      <div className={`rounded-3xl p-6 shadow-md space-y-4 ${
        summary.isOverBudget
          ? 'bg-rose-950/20 border-2 border-rose-500/50 text-rose-500'
          : 'theme-card'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--card-text-sub)] font-mono">
            {summary.isOverBudget ? 'OVER-BUDGET ALERT' : 'SPENDABLE MONEY / LEFT TO SPEND'}
          </span>
          <span className="text-xs font-mono font-bold text-[var(--card-text-sub)]">
            ≈ {formatINR(summary.recommendedDailyPace)}/day target
          </span>
        </div>

        {/* Large Main Number */}
        <div className="py-1">
          {summary.isOverBudget ? (
            <div>
              <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono-num block text-rose-500">
                {formatINR(summary.overBudgetAmount)} OVER
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 mt-1 block">
                ₹0 left to spend · Exceeded {formatINR(summary.totalBudget)} cycle budget
              </span>
            </div>
          ) : (
            <div>
              <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono-num block text-[var(--card-text-main)]">
                {formatINR(summary.spendableMoney)}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] mt-1 block font-mono">
                Left to spend of {formatINR(summary.totalBudget)} total money
              </span>
            </div>
          )}
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--card-divider)] text-center text-xs">
          <div className="bg-black/5 dark:bg-black/5 p-2 rounded-xl border border-[var(--card-divider)]">
            <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">TOTAL IN</span>
            <span className="font-bold text-[var(--card-text-main)] font-mono-num">{formatINR(summary.totalBudget)}</span>
          </div>
          <div className="bg-black/5 dark:bg-black/5 p-2 rounded-xl border border-[var(--card-divider)]">
            <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">RESERVED</span>
            <span className="font-bold text-amber-500 font-mono-num">{formatINR(summary.totalReserved)}</span>
          </div>
          <div className="bg-black/5 dark:bg-black/5 p-2 rounded-xl border border-[var(--card-divider)]">
            <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">SPENT</span>
            <span className="font-bold text-rose-500 font-mono-num">{formatINR(summary.actualPersonalSpent)}</span>
          </div>
        </div>
      </div>

      {/* 3. Physical Cash Wallet Card */}
      <WalletCard />

      {/* 4. Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={onOpenSpent}
          className="p-3.5 theme-card rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group active:scale-95"
        >
          <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-[var(--card-text-main)] tracking-wide font-mono">+ SPENT</span>
        </button>

        <button
          onClick={onOpenMoney}
          className="p-3.5 theme-card rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group active:scale-95"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-[var(--card-text-main)] tracking-wide font-mono">+ MONEY</span>
        </button>

        <button
          onClick={() => setShowReservedModal(true)}
          className="p-3.5 theme-card rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group active:scale-95"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
            <Bookmark className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-[var(--card-text-main)] tracking-wide font-mono">RESERVE</span>
        </button>

        <button
          onClick={() => setShowReconciliation(true)}
          className="p-3.5 theme-card rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group active:scale-95"
        >
          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
            <Scale className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-[var(--card-text-main)] tracking-wide font-mono">RECONCILE</span>
        </button>
      </div>

      {/* 5. Personal Spending & Money Owed Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="theme-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--card-text-sub)] font-mono">
            PERSONAL SPENDING
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-[var(--card-text-main)] font-mono-num block">
              {formatINR(summary.actualPersonalSpent)}
            </span>
            <span className="text-[10px] text-[var(--card-text-dim)] mt-0.5 block font-mono">
              In {selectedCycle.label}
            </span>
          </div>
        </div>

        <div
          onClick={onNavigateToPeople}
          className="theme-card rounded-2xl p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--card-text-sub)] font-mono">
              OWED TO YOU
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-500 font-mono-num block">
              {formatINR(summary.totalMoneyOwedToYou)}
            </span>
            <span className="text-[10px] text-[var(--card-text-dim)] mt-0.5 block font-mono">
              Splits & loans
            </span>
          </div>
        </div>
      </div>

      {/* 6. Today & Last 7 Days */}
      <div className="grid grid-cols-2 gap-3">
        <div className="theme-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--card-text-sub)] font-mono">
            TODAY'S SPEND
          </span>
          <span className="text-xl font-black text-[var(--card-text-main)] font-mono-num mt-1 block">
            {formatINR(summary.todaySpent)}
          </span>
        </div>

        <div className="theme-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--card-text-sub)] font-mono">
            LAST 7 DAYS
          </span>
          <span className="text-xl font-black text-[var(--card-text-main)] font-mono-num mt-1 block">
            {formatINR(summary.thisWeekSpent)}
          </span>
        </div>
      </div>

      {/* 7. Recent Transactions Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--page-subtitle)] font-mono">
            RECENT TRANSACTIONS
          </span>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-indigo-500 hover:underline transition-colors"
          >
            View All
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="theme-card rounded-3xl p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-[var(--card-text-main)]">No transactions yet.</p>
            <p className="text-xs text-[var(--card-text-sub)] mt-1">Tap + SPENT to log your first money entry.</p>
          </div>
        ) : (
          <div className="theme-card rounded-3xl divide-y divide-[var(--card-divider)] overflow-hidden shadow-sm">
            {recentTransactions.map(tx => {
              const isPositive = ['MONEY_RECEIVED', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'REFUND'].includes(tx.type);
              const isLending = tx.type === 'LENDING';

              return (
                <div
                  key={tx.id}
                  onClick={onNavigateToHistory}
                  className="p-4 hover:bg-black/5 dark:hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : isLending
                          ? 'bg-amber-500/10 text-amber-500'
                          : tx.type === 'SPLIT'
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {isPositive ? '+' : isLending ? '↗' : tx.type === 'SPLIT' ? '👥' : '−'}
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--card-text-main)] truncate block">
                        {tx.note || tx.category}
                      </span>
                      <span className="text-[10px] text-[var(--card-text-sub)] mt-0.5 block font-mono truncate">
                        {tx.category} · {tx.date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <span
                      className={`text-sm font-black font-mono-num ${
                        isPositive
                          ? 'text-emerald-500'
                          : isLending
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {isPositive ? '+' : '−'} {formatINR(tx.amount)}
                    </span>
                    {tx.type === 'SPLIT' && (
                      <span className="text-[9px] text-[var(--card-text-dim)] block font-mono-num">
                        Your share: {formatINR(tx.userShare || 0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <ReconciliationModal
        isOpen={showReconciliation}
        onClose={() => setShowReconciliation(false)}
      />
      <ReservedMoneyModal
        isOpen={showReservedModal}
        onClose={() => setShowReservedModal(false)}
      />

    </div>
  );
};
