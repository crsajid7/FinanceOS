import React, { useState } from 'react';
import { CreditCard, Wallet, Landmark, ArrowUpRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

export const WalletCard: React.FC = () => {
  const { accounts, summary } = useFinance();
  const [selectedAccIndex, setSelectedAccIndex] = useState<number>(0);
  const [hideBalance, setHideBalance] = useState<boolean>(false);

  const activeAccount = accounts[selectedAccIndex] || accounts[0] || {
    id: 'default',
    name: 'Primary Account',
    type: 'BANK',
    balance: summary.totalPhysicalCashBalance || 0,
  };

  return (
    <div className="space-y-3">
      {/* Wallet Card Container */}
      <div className="relative overflow-hidden rounded-3xl theme-card p-6 shadow-xl transition-all duration-300">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Card Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-widest font-mono text-[var(--card-text-main)]">
              FINANCEOS WALLET
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] p-1 transition-colors"
              title="Toggle balance visibility"
            >
              {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-extrabold tracking-widest font-mono text-[var(--card-text-sub)]">
              STUDENT
            </span>
          </div>
        </div>

        {/* Balance Section */}
        <div className="relative z-10 py-5">
          <span className="text-[11px] font-bold uppercase tracking-wider block text-[var(--card-text-sub)] font-mono">
            {activeAccount.name.toUpperCase()} · PHYSICAL CASH BALANCE
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black font-mono-num tracking-tight text-[var(--card-text-main)]">
              {hideBalance ? '₹ ••••••' : formatINR(activeAccount.balance)}
            </span>
          </div>
        </div>

        {/* Card Footer: Masked number & account switch chips */}
        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-[var(--card-divider)]">
          <div className="flex items-center space-x-1.5 font-mono text-[11px] text-[var(--card-text-sub)]">
            <span>••••</span>
            <span>••••</span>
            <span>6925</span>
          </div>

          {/* Account Tabs */}
          <div className="flex space-x-1 bg-black/10 dark:bg-black/5 p-1 rounded-xl border border-black/5 dark:border-black/5">
            {accounts.map((acc, idx) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccIndex(idx)}
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                  selectedAccIndex === idx
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
                }`}
              >
                {acc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
