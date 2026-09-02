import React from 'react';
import {
  X,
  Sparkles,
  Users,
  HandCoins,
  Landmark,
  Banknote,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface WhereDidMyMoneyGoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhereDidMyMoneyGoModal: React.FC<WhereDidMyMoneyGoModalProps> = ({ isOpen, onClose }) => {
  const { whereDidMyMoneyGo, overview } = useFinance();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg theme-card rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--card-divider)] bg-black/5 dark:bg-black/5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-500 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--card-text-main)] tracking-tight">
                Where Did Your Money Go?
              </h2>
              <span className="text-xs text-indigo-500 font-mono font-bold">
                {overview.periodLabel} Story Report
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[var(--card-text-main)] leading-relaxed">
          
          {/* Section 1: Physical Money Status */}
          <div className="bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block font-mono">
              1. PHYSICAL MONEY RIGHT NOW
            </span>
            <p className="font-medium text-sm">
              You currently have <strong>{formatINR(whereDidMyMoneyGo.currentMoney)}</strong> in total physical money:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-black/10 dark:bg-black/10 rounded-xl border border-[var(--card-divider)]">
                <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">BANK ACCOUNT</span>
                <span className="font-bold font-mono-num text-[var(--card-text-main)]">{formatINR(whereDidMyMoneyGo.bankBalance)}</span>
              </div>
              <div className="p-2.5 bg-black/10 dark:bg-black/10 rounded-xl border border-[var(--card-divider)]">
                <span className="text-[10px] text-[var(--card-text-sub)] block font-mono">CASH IN HAND</span>
                <span className="font-bold font-mono-num text-[var(--card-text-main)]">{formatINR(whereDidMyMoneyGo.cashBalance)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Reserved Funds */}
          {whereDidMyMoneyGo.totalReserved > 0 && (
            <div className="bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block font-mono">
                2. RESERVED FOR BILLS & RENT
              </span>
              <p className="font-medium">
                You committed <strong>{formatINR(whereDidMyMoneyGo.totalReserved)}</strong> in reserved funds for future commitments.
              </p>
            </div>
          )}

          {/* Section 3: Personal Spending & Top Categories */}
          <div className="bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block font-mono">
              3. ACTUAL PERSONAL SPENDING ({whereDidMyMoneyGo.periodLabel})
            </span>
            <p className="font-medium">
              You personally spent <strong>{formatINR(whereDidMyMoneyGo.actualPersonalSpending)}</strong>.
            </p>
            
            {whereDidMyMoneyGo.topCategories.length > 0 && (
              <div className="pt-2 border-t border-[var(--card-divider)] space-y-1.5">
                <span className="text-[11px] text-[var(--card-text-sub)] block font-medium font-mono">TOP EXPENSE AREAS:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {whereDidMyMoneyGo.topCategories.map((c, i) => (
                    <div key={c.category} className="bg-black/10 dark:bg-black/10 p-2.5 rounded-xl border border-[var(--card-divider)] text-xs shadow-sm">
                      <span className="text-[var(--card-text-sub)] text-[10px] block font-mono">#{i + 1} {c.category}</span>
                      <span className="font-black text-[var(--card-text-main)] font-mono-num">{formatINR(c.amount)}</span>
                      <span className="text-[10px] text-[var(--card-text-dim)] block font-mono-num">{c.percentage}% of spent</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Shared Friend Bills */}
          <div className="bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl p-4 space-y-1.5">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center space-x-1 font-mono">
              <Users className="w-3.5 h-3.5" />
              <span>4. SHARED FRIEND BILLS</span>
            </span>
            <p>
              You paid <strong>{formatINR(whereDidMyMoneyGo.paidForOthers)}</strong> on behalf of friends during this period.
            </p>
            <div className="flex items-center space-x-3 text-xs pt-1 font-mono-num">
              <span className="text-emerald-500">Reimbursed: {formatINR(whereDidMyMoneyGo.reimbursed)}</span>
              <span>·</span>
              <span className="text-amber-500">Still owed: {formatINR(whereDidMyMoneyGo.stillOwedFromSplits)}</span>
            </div>
          </div>

          {/* Section 5: Direct Loans */}
          <div className="bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl p-4 space-y-1.5">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center space-x-1 font-mono">
              <HandCoins className="w-3.5 h-3.5" />
              <span>5. DIRECT LOANS</span>
            </span>
            <p>
              You lent <strong>{formatINR(whereDidMyMoneyGo.moneyLent)}</strong> to friends during this period.
            </p>
            <div className="flex items-center space-x-3 text-xs pt-1 font-mono-num">
              <span className="text-emerald-500">Repaid: {formatINR(whereDidMyMoneyGo.repaidLoans)}</span>
              <span>·</span>
              <span className="text-amber-500">Still outstanding: {formatINR(whereDidMyMoneyGo.stillOutstandingLoans)}</span>
            </div>
          </div>

          {/* Spendable Money Callout */}
          <div className="p-4 rounded-2xl border bg-black/10 dark:bg-black/10 border-[var(--card-divider)] text-[var(--card-text-main)] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-[var(--card-text-sub)] font-bold block uppercase font-mono">
                SPENDABLE CASH RIGHT NOW
              </span>
              <span className="text-2xl font-black font-mono-num block mt-0.5 text-emerald-500">
                {formatINR(whereDidMyMoneyGo.spendableMoney)}
              </span>
            </div>
            <span className="text-xs text-[var(--card-text-sub)] font-mono">
              Free to spend
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-divider)] bg-black/5 dark:bg-black/5 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-colors shadow-sm"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
