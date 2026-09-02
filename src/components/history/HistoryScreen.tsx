import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  HandCoins,
  RotateCcw,
  Clock,
  ArrowRightLeft,
  Scale,
  Landmark,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types/finance';
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
      if (filterType === 'BORROW' && tx.type !== 'BORROWED_MONEY' && tx.type !== 'BORROW_REPAYMENT') return false;
      if (filterType === 'MONEY_IN' && !['MONEY_RECEIVED', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'BORROWED_MONEY', 'REFUND', 'OPENING_BALANCE'].includes(tx.type)) {
        return false;
      }
      if (filterType === 'TRANSFER' && tx.type !== 'TRANSFER' && tx.type !== 'ADJUSTMENT') return false;

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
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const groups: { [dateKey: string]: Transaction[] } = {};

    for (const tx of filteredTransactions) {
      let label = tx.date;
      if (tx.date === todayStr) label = 'TODAY';
      else if (tx.date === yesterdayStr) label = 'YESTERDAY';
      else {
        const [y, m, d] = tx.date.split('-').map(Number);
        const dateObj = new Date(y, (m || 1) - 1, d || 1);
        label = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(tx);
    }

    return Object.entries(groups);
  }, [filteredTransactions]);

  const renderTransactionIcon = (tx: Transaction) => {
    if (tx.type === 'MONEY_RECEIVED' || tx.type === 'REFUND' || tx.type === 'OPENING_BALANCE') {
      return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    }
    if (tx.type === 'BORROWED_MONEY') {
      return <HandCoins className="w-4 h-4 text-rose-500" />;
    }
    if (tx.type === 'BORROW_REPAYMENT' || tx.type === 'REIMBURSEMENT' || tx.type === 'LOAN_REPAYMENT') {
      return <RotateCcw className="w-4 h-4 text-emerald-500" />;
    }
    if (tx.type === 'LENDING') {
      return <ArrowUpRight className="w-4 h-4 text-amber-500" />;
    }
    if (tx.type === 'SPLIT') {
      return <Users className="w-4 h-4 text-indigo-500" />;
    }
    if (tx.type === 'TRANSFER') {
      return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
    }
    if (tx.type === 'ADJUSTMENT') {
      return <Scale className="w-4 h-4 text-indigo-400" />;
    }
    if (tx.category.toLowerCase() === 'food' || tx.category.toLowerCase() === 'canteen') {
      return <Utensils className="w-4 h-4 text-rose-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
  };

  const renderBadge = (tx: Transaction) => {
    switch (tx.type) {
      case 'OPENING_BALANCE':
        return (
          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono flex items-center space-x-1">
            <Wallet className="w-3 h-3" />
            <span>Starting Balance</span>
          </span>
        );
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
      case 'BORROWED_MONEY':
        return (
          <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Borrowed from {tx.personName || 'Friend'}</span>
          </span>
        );
      case 'REIMBURSEMENT':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <RotateCcw className="w-3 h-3" />
            <span>Split Settled ({tx.personName})</span>
          </span>
        );
      case 'LOAN_REPAYMENT':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <RotateCcw className="w-3 h-3" />
            <span>Loan Repaid ({tx.personName})</span>
          </span>
        );
      case 'BORROW_REPAYMENT':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center space-x-1">
            <RotateCcw className="w-3 h-3" />
            <span>Repaid Friend ({tx.personName})</span>
          </span>
        );
      case 'MONEY_RECEIVED':
        return (
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
            {tx.source ? `From ${tx.source}` : 'Money Received'}
          </span>
        );
      case 'REFUND':
        return (
          <span className="text-[11px] font-bold text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono">
            Refund
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="text-[11px] font-bold text-slate-400 bg-black/10 dark:bg-black/5 border border-[var(--card-divider)] px-2 py-0.5 rounded-md font-mono flex items-center space-x-1">
            <ArrowRightLeft className="w-3 h-3" />
            <span>Transfer: {tx.accountId === 'acc_bank' ? 'Bank → Cash' : 'Cash → Bank'}</span>
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono flex items-center space-x-1">
            <Scale className="w-3 h-3" />
            <span>Cash Adjustment</span>
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
        <div className="w-full max-w-full overflow-x-auto no-scrollbar pb-1">
          <div className="flex space-x-2 min-w-max px-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'EXPENSE', label: 'Spending' },
              { id: 'SPLIT', label: 'Friend Splits' },
              { id: 'LENDING', label: 'Lending' },
              { id: 'BORROW', label: 'Borrowed & Repaid' },
              { id: 'MONEY_IN', label: 'Money In' },
              { id: 'TRANSFER', label: 'Transfers & Adjustments' },
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setFilterType(chip.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors border shadow-sm flex-shrink-0 ${
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
      </div>

      {/* Transaction Feed */}
      {groupedTransactions.length === 0 ? (
        <div className="text-center py-16 px-4 theme-card rounded-3xl shadow-sm">
          <p className="text-sm font-black text-[var(--card-text-main)]">Nothing recorded yet.</p>
          <p className="text-xs text-[var(--card-text-sub)] mt-1">Record your first entry and FinanceOS will track your money with mathematical accuracy.</p>
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
                  const isPositive = ['MONEY_RECEIVED', 'BORROWED_MONEY', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'REFUND', 'OPENING_BALANCE'].includes(tx.type) || (tx.type === 'ADJUSTMENT' && tx.amount > 0);
                  const isLending = tx.type === 'LENDING';
                  const isBorrow = tx.type === 'BORROWED_MONEY';
                  
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="p-4 hover:bg-black/5 dark:hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold ${
                            tx.type === 'MONEY_RECEIVED' || tx.type === 'REFUND' || tx.type === 'OPENING_BALANCE'
                              ? 'bg-emerald-500/10'
                              : tx.type === 'BORROWED_MONEY'
                              ? 'bg-rose-500/10'
                              : tx.type === 'LENDING'
                              ? 'bg-amber-500/10'
                              : tx.type === 'SPLIT'
                              ? 'bg-indigo-500/10'
                              : tx.type === 'TRANSFER' || tx.type === 'ADJUSTMENT'
                              ? 'bg-blue-500/10'
                              : 'bg-rose-500/10'
                          }`}
                        >
                          {renderTransactionIcon(tx)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-[var(--card-text-main)] truncate">
                              {tx.note || tx.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            {renderBadge(tx)}
                            <span className="text-[10px] text-[var(--card-text-dim)] font-mono flex items-center space-x-1">
                              {tx.accountId === 'acc_cash' ? <Banknote className="w-3 h-3 text-emerald-500" /> : <Landmark className="w-3 h-3 text-indigo-500" />}
                              <span>{tx.accountId === 'acc_cash' ? 'Cash' : 'Bank'}</span>
                            </span>
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
                              : tx.type === 'TRANSFER'
                              ? 'text-[var(--card-text-main)]'
                              : 'text-rose-500'
                          }`}
                        >
                          {isPositive ? '+' : tx.type === 'TRANSFER' ? '' : '−'} {formatINR(Math.abs(tx.amount))}
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
