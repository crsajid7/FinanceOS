import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Tag,
  Clock,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType } from '../../types/finance';
import { formatINR } from '../../services/accountingEngine';

interface HistoryScreenProps {
  onSelectTransaction: (tx: Transaction) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectTransaction }) => {
  const { transactions } = useFinance();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType === 'EXPENSE' && tx.type !== 'EXPENSE') return false;
      if (filterType === 'SPLIT' && tx.type !== 'SPLIT') return false;
      if (filterType === 'LENDING' && tx.type !== 'LENDING') return false;
      if (filterType === 'MONEY_IN' && !['MONEY_RECEIVED', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'REFUND'].includes(tx.type)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catMatch = tx.category.toLowerCase().includes(q);
        const noteMatch = tx.note?.toLowerCase().includes(q);
        const personMatch = tx.personName?.toLowerCase().includes(q) || tx.splits?.some(s => s.personName.toLowerCase().includes(q));
        const amountMatch = String(tx.amount).includes(q);
        if (!catMatch && !noteMatch && !personMatch && !amountMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      return new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    });
  }, [transactions, filterType, searchQuery]);

  const groupedTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groups: { [dateKey: string]: Transaction[] } = {};

    for (const tx of filteredTransactions) {
      let label = tx.date;
      if (tx.date === todayStr) label = 'TODAY';
      else if (tx.date === yesterdayStr) label = 'YESTERDAY';
      else {
        const d = new Date(tx.date);
        label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(tx);
    }

    return Object.entries(groups);
  }, [filteredTransactions]);

  const renderBadge = (tx: Transaction) => {
    switch (tx.type) {
      case 'EXPENSE':
        return (
          <span className="text-[11px] font-bold text-[var(--card-text-sub)] bg-black/10 dark:bg-black/5 px-2 py-0.5 rounded-md font-mono">
            {tx.category}
          </span>
        );
      case 'SPLIT':
        const names = tx.splits?.map(s => s.personName).join(', ') || 'Friends';
        return (
          <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>Shared with {names}</span>
          </span>
        );
      case 'LENDING':
        return (
          <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <HandCoins className="w-3 h-3" />
            <span>Lent to {tx.personName || 'Friend'}</span>
          </span>
        );
      case 'REIMBURSEMENT':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <RotateCcw className="w-3 h-3" />
            <span>Reimbursement ({tx.personName})</span>
          </span>
        );
      case 'LOAN_REPAYMENT':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <RotateCcw className="w-3 h-3" />
            <span>Loan Repaid ({tx.personName})</span>
          </span>
        );
      case 'MONEY_RECEIVED':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
            {tx.isMonthlyBudget ? 'Monthly Budget' : 'Money Received'}
          </span>
        );
      case 'REFUND':
        return (
          <span className="text-[11px] font-bold text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono">
            Refund
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto">
      
      {/* Header & Search */}
      <div className="space-y-3">
        <h1 className="text-xl font-black text-[var(--page-title)] tracking-tight">Transaction History</h1>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--card-text-sub)] absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by category, friend, note..."
            className="w-full theme-card text-xs pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:border-indigo-500 placeholder:text-[var(--card-text-sub)] shadow-sm"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'EXPENSE', label: 'Spending' },
            { id: 'SPLIT', label: 'Friend Splits' },
            { id: 'LENDING', label: 'Lending' },
            { id: 'MONEY_IN', label: 'Money In' },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilterType(chip.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors border shadow-sm ${
                filterType === chip.id
                  ? 'bg-indigo-600 text-white border-transparent'
                  : 'theme-card text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Feed */}
      {groupedTransactions.length === 0 ? (
        <div className="text-center py-16 px-4 theme-card rounded-3xl shadow-sm">
          <p className="text-sm font-black text-[var(--card-text-main)]">Nothing spent yet.</p>
          <p className="text-xs text-[var(--card-text-sub)] mt-1">Add your first expense or money received to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedTransactions.map(([dateGroup, items]) => (
            <div key={dateGroup} className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--page-subtitle)] px-1 block font-mono">
                {dateGroup}
              </span>

              <div className="theme-card rounded-3xl divide-y divide-[var(--card-divider)] overflow-hidden shadow-sm">
                {items.map(tx => {
                  const isPositive = ['MONEY_RECEIVED', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'REFUND'].includes(tx.type);
                  const isLending = tx.type === 'LENDING';
                  
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="p-4 hover:bg-black/5 dark:hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
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

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-[var(--card-text-main)] truncate">
                              {tx.note || tx.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            {renderBadge(tx)}
                            {tx.time && (
                              <span className="text-[11px] text-[var(--card-text-sub)] flex items-center space-x-0.5 font-mono">
                                <Clock className="w-3 h-3" />
                                <span>{tx.time}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Amount */}
                      <div className="text-right flex-shrink-0 ml-3">
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
                          <span className="text-[10px] text-[var(--card-text-dim)] block font-mono-num">
                            Your share: {formatINR(tx.userShare || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
