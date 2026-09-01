import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ArrowRight,
  HandCoins,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';
import { Person } from '../../types/finance';

interface PeopleScreenProps {
  onRecordPayment: (personId: string, type: 'REIMBURSEMENT' | 'LOAN_REPAYMENT') => void;
}

export const PeopleScreen: React.FC<PeopleScreenProps> = ({ onRecordPayment }) => {
  const { people, personBalances, transactions, addPerson } = useFinance();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddPersonModal, setShowAddPersonModal] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [newPersonPhone, setNewPersonPhone] = useState<string>('');

  const selectedPerson = people.find(p => p.id === selectedPersonId);
  const selectedBalance = personBalances.find(p => p.personId === selectedPersonId);

  const personTransactions = transactions.filter(tx => {
    if (!selectedPersonId) return false;
    if (tx.personId === selectedPersonId) return true;
    if (tx.splits?.some(s => s.personId === selectedPersonId)) return true;
    return false;
  }).sort((a, b) => {
    return new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime();
  });

  const handleAddPersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const created = await addPerson(newPersonName.trim(), newPersonPhone.trim() || undefined);
    setNewPersonName('');
    setNewPersonPhone('');
    setShowAddPersonModal(false);
    setSelectedPersonId(created.id);
  };

  // 1. PERSON DETAIL VIEW
  if (selectedPerson) {
    const splitOwed = selectedBalance?.splitOwed || 0;
    const loanOwed = selectedBalance?.loanOwed || 0;
    const totalOwed = selectedBalance?.totalOwed || 0;

    return (
      <div className="space-y-5 pb-28 max-w-2xl mx-auto">
        
        {/* Back Button */}
        <button
          onClick={() => setSelectedPersonId(null)}
          className="flex items-center space-x-1.5 text-xs font-bold text-[var(--page-subtitle)] hover:text-[var(--page-title)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to People</span>
        </button>

        {/* Person Hero Statement Card */}
        <div className="theme-card rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-500 flex items-center justify-center text-lg font-black">
                {selectedPerson.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black text-[var(--card-text-main)]">{selectedPerson.name}</h1>
                {selectedPerson.phone && (
                  <span className="text-xs text-[var(--card-text-sub)]">{selectedPerson.phone}</span>
                )}
              </div>
            </div>

            {totalOwed === 0 ? (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Settled</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-500">
                Owes You
              </span>
            )}
          </div>

          {/* Owed Amount Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--card-divider)]">
            <div className="bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--card-text-sub)] block font-mono">
                SPLIT EXPENSES
              </span>
              <span className="text-xl font-black text-indigo-500 font-mono-num mt-1 block">
                {formatINR(splitOwed)}
              </span>
              <span className="text-[10px] text-[var(--card-text-dim)] block mt-0.5">Shared bills share</span>
            </div>

            <div className="bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--card-text-sub)] block font-mono">
                MONEY LENT
              </span>
              <span className="text-xl font-black text-amber-500 font-mono-num mt-1 block">
                {formatINR(loanOwed)}
              </span>
              <span className="text-[10px] text-[var(--card-text-dim)] block mt-0.5">Direct cash loans</span>
            </div>
          </div>

          {/* Total Owed Highlight */}
          <div className="mt-4 p-3.5 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--card-text-main)]">Total Outstanding</span>
            <span className="text-2xl font-black text-[var(--card-text-main)] font-mono-num">
              {formatINR(totalOwed)}
            </span>
          </div>

          {/* Quick Settle Actions */}
          {totalOwed > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {splitOwed > 0 && (
                <button
                  onClick={() => onRecordPayment(selectedPerson.id, 'REIMBURSEMENT')}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Receive Split ({formatINR(splitOwed)})</span>
                </button>
              )}
              {loanOwed > 0 && (
                <button
                  onClick={() => onRecordPayment(selectedPerson.id, 'LOAN_REPAYMENT')}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                >
                  <HandCoins className="w-3.5 h-3.5" />
                  <span>Receive Loan ({formatINR(loanOwed)})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Statement with this Person */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--page-subtitle)] px-1 font-mono">
            TRANSACTION HISTORY WITH {selectedPerson.name.toUpperCase()}
          </h2>

          {personTransactions.length === 0 ? (
            <p className="text-xs text-[var(--card-text-sub)] italic p-4 theme-card rounded-3xl shadow-sm">
              No transactions recorded with {selectedPerson.name} yet.
            </p>
          ) : (
            <div className="theme-card rounded-3xl divide-y divide-[var(--card-divider)] overflow-hidden shadow-sm">
              {personTransactions.map(tx => {
                const isReimbursement = tx.type === 'REIMBURSEMENT';
                const isRepayment = tx.type === 'LOAN_REPAYMENT';
                const isLend = tx.type === 'LENDING';
                const isSplit = tx.type === 'SPLIT';

                let actionTitle = tx.category;
                let friendAmount = tx.amount;

                if (isSplit && tx.splits) {
                  const myFriendSplit = tx.splits.find(s => s.personId === selectedPerson.id || s.personName.toLowerCase() === selectedPerson.name.toLowerCase());
                  if (myFriendSplit) {
                    friendAmount = myFriendSplit.amount;
                    actionTitle = `Split: ${tx.category} (${tx.note || 'Shared bill'})`;
                  }
                } else if (isLend) {
                  actionTitle = `Lent: ${tx.note || 'Direct loan'}`;
                } else if (isReimbursement) {
                  actionTitle = 'Reimbursement received';
                } else if (isRepayment) {
                  actionTitle = 'Loan repayment received';
                }

                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--card-text-main)] block">{actionTitle}</span>
                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-[var(--card-text-sub)] font-mono">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{tx.date}</span>
                        </span>
                        {tx.time && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{tx.time}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-black font-mono-num ${
                          isReimbursement || isRepayment
                            ? 'text-emerald-500'
                            : isLend
                            ? 'text-amber-500'
                            : 'text-indigo-500'
                        }`}
                      >
                        {isReimbursement || isRepayment ? '+ ' : '− '}
                        {formatINR(friendAmount)}
                      </span>
                      <span className="text-[10px] text-[var(--card-text-dim)] block">
                        {isReimbursement && 'Settled split'}
                        {isRepayment && 'Repaid loan'}
                        {isLend && 'Money lent'}
                        {isSplit && 'Owed share'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    );
  }

  // 2. PEOPLE LIST VIEW
  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[var(--page-title)] tracking-tight">People & Shared Money</h1>
          <p className="text-xs text-[var(--page-subtitle)] mt-0.5">Track who owes you and friend settlements</p>
        </div>

        <button
          onClick={() => setShowAddPersonModal(true)}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </button>
      </div>

      {/* People List */}
      {people.length === 0 ? (
        <div className="text-center py-16 px-4 theme-card rounded-3xl shadow-sm">
          <p className="text-sm font-black text-[var(--card-text-main)]">No money owed yet.</p>
          <p className="text-xs text-[var(--card-text-sub)] mt-1">When you split expenses or lend money, friends will appear here.</p>
        </div>
      ) : (
        <div className="theme-card rounded-3xl divide-y divide-[var(--card-divider)] overflow-hidden shadow-sm">
          {people.map(person => {
            const balance = personBalances.find(p => p.personId === person.id);
            const splitOwed = balance?.splitOwed || 0;
            const loanOwed = balance?.loanOwed || 0;
            const totalOwed = balance?.totalOwed || 0;

            return (
              <div
                key={person.id}
                onClick={() => setSelectedPersonId(person.id)}
                className="p-4 hover:bg-black/5 dark:hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-500 flex items-center justify-center text-sm font-black">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--card-text-main)] group-hover:text-indigo-500 transition-colors">
                      {person.name}
                    </span>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[var(--card-text-sub)] font-mono">
                      {splitOwed > 0 && <span>Splits: {formatINR(splitOwed)}</span>}
                      {splitOwed > 0 && loanOwed > 0 && <span>·</span>}
                      {loanOwed > 0 && <span>Lent: {formatINR(loanOwed)}</span>}
                      {totalOwed === 0 && <span className="text-emerald-500 font-bold">All settled</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span
                      className={`text-sm font-black font-mono-num block ${
                        totalOwed > 0 ? 'text-amber-500' : 'text-[var(--card-text-dim)]'
                      }`}
                    >
                      {totalOwed > 0 ? `${formatINR(totalOwed)} owes you` : '₹0 settled'}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--card-text-sub)] group-hover:text-indigo-500 transform group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm theme-card rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-[var(--card-text-main)]">Add New Friend</h3>
            
            <form onSubmit={handleAddPersonSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[var(--card-text-sub)] block mb-1 font-mono">FRIEND'S NAME</label>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  placeholder="e.g. Karthick, Hemanth"
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-[var(--card-text-sub)] block mb-1 font-mono">PHONE NUMBER (OPTIONAL)</label>
                <input
                  type="tel"
                  value={newPersonPhone}
                  onChange={e => setNewPersonPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPersonModal(false)}
                  className="flex-1 py-2.5 bg-black/10 dark:bg-black/10 text-xs font-bold text-[var(--card-text-main)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Friend</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
