import React, { useState } from 'react';
import { Wallet, Eye, EyeOff, Landmark, Banknote } from 'lucide-react';
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
    <div className="relative overflow-hidden rounded-3xl theme-card p-5 sm:p-6 shadow-md transition-all duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-black/10 dark:bg-black/5 flex items-center justify-center text-[var(--card-text-main)]">
            {activeAccount.type === 'CASH' ? <Banknote className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest font-mono text-[var(--card-text-sub)] block">
              TOTAL PHYSICAL CASH
            </span>
            <span className="text-xs font-bold text-[var(--card-text-main)] block">
              {activeAccount.name}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setHideBalance(!hideBalance)}
            className="p-1.5 rounded-lg bg-black/5 dark:bg-black/5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] transition-colors"
            title="Toggle balance visibility"
          >
            {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="py-4">
        <span className="text-3xl sm:text-4xl font-black font-mono-num tracking-tight text-[var(--card-text-main)]">
          {hideBalance ? '₹ ••••••' : formatINR(activeAccount.balance)}
        </span>
        <span className="text-[10px] text-[var(--card-text-dim)] block mt-0.5 font-mono">
          Total in all accounts: {formatINR(summary.totalPhysicalCashBalance)}
        </span>
      </div>

      {/* Account Tabs */}
      <div className="flex space-x-1.5 pt-3 border-t border-[var(--card-divider)] overflow-x-auto no-scrollbar">
        {accounts.map((acc, idx) => (
          <button
            key={acc.id}
            onClick={() => setSelectedAccIndex(idx)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
              selectedAccIndex === idx
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-black/5 dark:bg-black/5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            {acc.name}
          </button>
        ))}
      </div>
    </div>
  );
};
