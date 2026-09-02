import React from 'react';
import { Landmark, Banknote, ArrowRightLeft } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface WalletCardProps {
  onOpenTransfer?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ onOpenTransfer }) => {
  const { accounts, overview } = useFinance();

  const bankAccount = accounts.find(a => a.id === 'acc_bank') || accounts[0];
  const cashAccount = accounts.find(a => a.id === 'acc_cash') || accounts[1];

  return (
    <div className="relative overflow-hidden rounded-3xl theme-card p-5 sm:p-6 shadow-md transition-all duration-300 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--card-divider)]">
        <div>
          <h2 className="text-sm sm:text-base font-black tracking-tight text-[var(--card-text-main)]">
            Where your money is right now
          </h2>
        </div>

        {onOpenTransfer && (
          <button
            onClick={onOpenTransfer}
            className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/5 hover:bg-black/10 text-xs font-bold text-indigo-500 flex items-center space-x-1.5 border border-[var(--card-divider)] transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        )}
      </div>

      {/* Two Money Locations Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bank Account */}
        <div className="bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)] space-y-1">
          <div className="flex items-center space-x-1.5 text-[var(--card-text-sub)]">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-bold font-mono uppercase">Bank Account</span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono-num text-[var(--card-text-main)] block">
            {formatINR(bankAccount?.balance || 0)}
          </span>
        </div>

        {/* Cash in Hand */}
        <div className="bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)] space-y-1">
          <div className="flex items-center space-x-1.5 text-[var(--card-text-sub)]">
            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-bold font-mono uppercase">Cash in Hand</span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono-num text-[var(--card-text-main)] block">
            {formatINR(cashAccount?.balance || 0)}
          </span>
        </div>
      </div>

      {/* Total Money in Possession Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--card-divider)]">
        <span className="text-xs font-black uppercase text-[var(--card-text-sub)] font-mono">
          TOTAL MONEY IN POSSESSION
        </span>
        <span className="text-xl sm:text-2xl font-black font-mono-num text-[var(--card-text-main)]">
          {formatINR(overview.currentMoney)}
        </span>
      </div>

    </div>
  );
};
