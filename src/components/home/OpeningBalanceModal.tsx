import React, { useState, useRef, useEffect } from 'react';
import { X, Wallet, Check, Landmark, Banknote } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpeningBalanceModal: React.FC<OpeningBalanceModalProps> = ({ isOpen, onClose }) => {
  const { recordOpeningBalance, accounts } = useFinance();
  const [bankAmountStr, setBankAmountStr] = useState<string>('');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({});
  
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Synchronize modal position with mobile visual viewport / virtual keyboard
  useEffect(() => {
    if (!isOpen) return;

    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportStyle({
          height: `${window.visualViewport.height}px`,
          top: `${window.visualViewport.offsetTop}px`,
        });
      }
    };

    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveStartingBalance = async () => {
    if (isSubmitting) return;
    const bank = parseFloat(bankAmountStr) || 0;
    const cash = parseFloat(cashAmountStr) || 0;

    if (bank > 0 || cash > 0) {
      try {
        setIsSubmitting(true);
        await recordOpeningBalance(bank, cash);
      } finally {
        setIsSubmitting(false);
      }
    }
    onClose();
  };

  return (
    <div
      style={viewportStyle}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in"
    >
      <div className="w-full max-w-sm theme-card rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-black text-[var(--card-text-main)]">Set Starting Balance</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--card-text-sub)] leading-relaxed">
          Enter what you already have today. This establishes your starting money without falsely inflating your received income.
        </p>

        <form onSubmit={e => e.preventDefault()} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-indigo-500" />
              <span>CURRENT BANK BALANCE (₹)</span>
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              enterKeyHint="next"
              value={bankAmountStr}
              onChange={e => setBankAmountStr(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  cashInputRef.current?.focus();
                }
              }}
              placeholder="e.g. 3200.50"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-sm font-bold px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] font-mono-num focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold flex items-center space-x-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              <span>CURRENT CASH IN HAND (₹)</span>
            </label>
            <input
              ref={cashInputRef}
              type="number"
              step="any"
              inputMode="decimal"
              enterKeyHint="done"
              value={cashAmountStr}
              onChange={e => setCashAmountStr(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              placeholder="e.g. 500.25"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-sm font-bold px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] font-mono-num focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveStartingBalance}
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Set Starting Money'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
