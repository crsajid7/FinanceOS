import React from 'react';
import {
  Sparkles,
  TrendingDown,
  Users,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  CreditCard,
  Plus,
  Clock,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../services/accountingEngine';
import { WalletCard } from '../visual/WalletCard';
import { TickLineGauge } from '../visual/TickLineGauge';

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
  const { summary, transactions } = useFinance();
  const { currentUser } = useAuth();

  const recentTransactions = transactions.slice(0, 4);

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto">
      
      {/* Top Header: Greeting & Profile */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold text-[var(--page-subtitle)] uppercase tracking-wider block font-mono">
            FINANCEOS DIARY
          </span>
          <h1 className="text-xl font-black tracking-tight text-[var(--page-title)]">
            {currentUser.name}
          </h1>
        </div>
      </div>

      {/* 1. Wallet Card */}
      <WalletCard />

      {/* 2. "AVAILABLE BUDGET" Card with Barcode Gauge */}
      <div className="relative overflow-hidden theme-card rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--card-text-sub)] font-mono">
            AVAILABLE {summary.monthName.toUpperCase()} BUDGET
          </span>
          <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-black/10 dark:bg-black/5 text-[10px] font-mono font-bold text-[var(--card-text-main)]">
            <Calendar className="w-3 h-3 text-[var(--card-text-sub)]" />
            <span>{summary.daysRemaining} days left</span>
          </div>
        </div>

        {/* Hero Number */}
        <div className="py-1">
          <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono-num block text-[var(--card-text-main)]">
            {formatINR(summary.leftToSpend)}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] mt-1 block">
            Left to spend of {formatINR(summary.totalBudget)}
          </span>
        </div>

        {/* Barcode Tick Line Gauge */}
        <div className="pt-2 border-t border-[var(--card-divider)]">
          <TickLineGauge
            label="SPENDING BUDGET GAUGE"
            amount={summary.leftToSpend}
            maxAmount={summary.totalBudget}
            highlightColor="#6366f1"
            unitLabel="LEFT"
          />
        </div>
      </div>

      {/* 3. Quick Action Pill Buttons */}
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
          onClick={onNavigateToPeople}
          className="p-3.5 theme-card rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group active:scale-95"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-[var(--card-text-main)] tracking-wide font-mono">FRIENDS</span>
        </button>

        <button
          onClick={onOpenWhereDidMoneyGo}
          className="p-3.5 theme-card rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm group active:scale-95"
        >
          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-[var(--card-text-main)] tracking-wide font-mono">INSIGHTS</span>
        </button>
      </div>

      {/* 4. Quick Stats: Today & This Week */}
      <div className="grid grid-cols-2 gap-3">
        <div className="theme-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--card-text-sub)] font-mono">
            TODAY'S SPEND
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-[var(--card-text-main)] font-mono-num block">
              {formatINR(summary.todaySpent)}
            </span>
            <span className="text-[10px] text-[var(--card-text-dim)] mt-0.5 block font-mono">
              {summary.todaySpent === 0 ? 'No spend recorded' : 'Personal spending'}
            </span>
          </div>
        </div>

        <div className="theme-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--card-text-sub)] font-mono">
            THIS WEEK
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-[var(--card-text-main)] font-mono-num block">
              {formatINR(summary.thisWeekSpent)}
            </span>
            <span className="text-[10px] text-[var(--card-text-dim)] mt-0.5 block font-mono">
              Last 7 days total
            </span>
          </div>
        </div>
      </div>

      {/* 5. Money Owed to You Card */}
      <div
        onClick={onNavigateToPeople}
        className="cursor-pointer rounded-3xl p-5 theme-card transition-all duration-200 shadow-md active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest block font-mono text-[var(--card-text-sub)]">
                MONEY OWED TO YOU
              </span>
              <span className="text-2xl font-black font-mono-num block text-amber-500">
                {formatINR(summary.totalMoneyOwedToYou)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <div className="text-right hidden sm:block text-[11px] font-mono text-[var(--card-text-sub)]">
              <span>Splits: {formatINR(summary.pendingSplitReceivables)}</span>
              <span className="block">Loans: {formatINR(summary.pendingLoanReceivables)}</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 dark:bg-black/5 text-[var(--card-text-main)]">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Spending Pace Section */}
      <div className="theme-card rounded-3xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--card-text-main)] font-mono">
              SPENDING PACE
            </span>
          </div>
          <span className="text-xs font-mono-num font-bold text-[var(--card-text-main)]">
            {formatINR(summary.dailySpendingPace)} / day
          </span>
        </div>

        <div className="p-3.5 bg-black/5 dark:bg-black/5 rounded-2xl flex items-start space-x-2.5 text-xs leading-relaxed border border-black/5 dark:border-black/5">
          <div className="mt-0.5">
            {summary.paceStatus === 'OVERSPENDING' ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            ) : summary.paceStatus === 'SLIGHTLY_FAST' ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[var(--card-text-main)]">{summary.paceMessage}</p>
            <p className="text-[11px] text-[var(--card-text-sub)] mt-1 font-mono-num">
              Target pace: <strong>{formatINR(summary.recommendedDailyPace)}/day</strong> for the next {summary.daysRemaining} days.
            </p>
          </div>
        </div>
      </div>

      {/* 7. Recent Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--page-subtitle)] font-mono">
            RECENT TRANSACTIONS
          </span>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
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
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : isLending
                          ? 'bg-amber-500/10 text-amber-500'
                          : tx.type === 'SPLIT'
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isLending ? (
                        <HandCoins className="w-4 h-4" />
                      ) : tx.type === 'SPLIT' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-[var(--card-text-main)] block">
                        {tx.note || tx.category}
                      </span>
                      <span className="text-[10px] text-[var(--card-text-sub)] mt-0.5 block font-mono">
                        {tx.category} · {tx.date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold font-mono-num ${
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
                        Your: {formatINR(tx.userShare || 0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
