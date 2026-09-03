import React, { useState, useRef } from 'react';
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
  Landmark,
  Banknote,
  Scale,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';
import { Person, MoneyLocationId } from '../../types/finance';

export const PeopleScreen: React.FC = () => {
  const {
    people,
    personBalances,
    transactions,
    addPerson,
    recordReimbursement,
    recordLoanRepayment,
    recordBorrowRepayment,
    recordBorrowedMoney,
    accounts,
    overview,
  } = useFinance();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddPersonModal, setShowAddPersonModal] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [newPersonPhone, setNewPersonPhone] = useState<string>('');
  const [isSubmittingPerson, setIsSubmittingPerson] = useState<boolean>(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Settlement modal state
  const [settleModalData, setSettleModalData] = useState<{
    isOpen: boolean;
    type: 'RECEIVE' | 'PAY';
    amount: number;
    personId: string;
    personName: string;
  } | null>(null);
  const [settleAccountId, setSettleAccountId] = useState<MoneyLocationId>('acc_bank');
  const [settleAmountStr, setSettleAmountStr] = useState<string>('');

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
    if (!newPersonName.trim() || isSubmittingPerson) return;
    try {
      setIsSubmittingPerson(true);
      const created = await addPerson(newPersonName.trim(), newPersonPhone.trim() || undefined);
      setNewPersonName('');
      setNewPersonPhone('');
      setShowAddPersonModal(false);
      setSelectedPersonId(created.id);
    } finally {
      setIsSubmittingPerson(false);
    }
  };

  const handleOpenSettleModal = (type: 'RECEIVE' | 'PAY', amount: number, personId: string, personName: string) => {
    setSettleModalData({
      isOpen: true,
      type,
      amount,
      personId,
      personName,
    });
    setSettleAmountStr(String(amount));
    setSettleAccountId('acc_bank');
  };

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalData) return;
    const num = parseFloat(settleAmountStr);
    if (!num || num <= 0) return;

    if (settleModalData.type === 'RECEIVE') {
      // If user had split vs loan, record reimbursement
      await recordReimbursement(num, settleModalData.personId, settleModalData.personName, settleAccountId);
    } else {
      // User is paying back borrowed money
      await recordBorrowRepayment(num, settleModalData.personId, settleModalData.personName, settleAccountId);
    }

    setSettleModalData(null);
  };

  // 1. PERSON DETAIL VIEW
  if (selectedPerson) {
    const splitOwed = selectedBalance?.splitOwed || 0;
    const loanOwed = selectedBalance?.loanOwed || 0;
    const amountTheyOweMe = selectedBalance?.amountTheyOweMe || 0;
    const borrowedOwed = selectedBalance?.borrowedOwed || 0;
    const amountIOweThem = selectedBalance?.amountIOweThem || 0;
    const netBalance = selectedBalance?.netBalance || 0;

    return (
      <div className="space-y-5 pb-28 max-w-2xl mx-auto">
        
        {/* Back Button */}
        <button
          onClick={() => setSelectedPersonId(null)}
          className="flex items-center space-x-1.5 text-xs font-bold text-[var(--page-subtitle)] hover:text-[var(--page-title)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Friends</span>
        </button>

        {/* Person Hero Net Card */}
        <div className="theme-card rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-500 flex items-center justify-center text-lg font-black">
                {selectedPerson.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black text-[var(--card-text-main)]">{selectedPerson.name}</h1>
                {selectedPerson.phone && (
                  <span className="text-xs text-[var(--card-text-sub)] font-mono">{selectedPerson.phone}</span>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {netBalance === 0 ? (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settled</span>
              </span>
            ) : netBalance > 0 ? (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-500">
                Owes you {formatINR(netBalance)}
              </span>
            ) : (
              <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-xs font-bold text-rose-500">
                You owe {formatINR(Math.abs(netBalance))}
              </span>
            )}
          </div>

          {/* NET Position Statement Box */}
          <div className="p-4 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--card-text-sub)] font-mono block">
                NET POSITION
              </span>
              <span className="text-sm font-bold text-[var(--card-text-main)] mt-0.5 block">
                {netBalance > 0 && `${selectedPerson.name} owes you`}
                {netBalance < 0 && `You owe ${selectedPerson.name}`}
                {netBalance === 0 && `You and ${selectedPerson.name} are settled`}
              </span>
            </div>
            <span
              className={`text-2xl font-black font-mono-num ${
                netBalance > 0 ? 'text-amber-500' : netBalance < 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {netBalance === 0 ? '₹0' : formatINR(Math.abs(netBalance))}
            </span>
          </div>

          {/* Breakdown: What they owe me vs What I owe them */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--card-divider)] text-xs">
            <div className="p-3 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--card-text-sub)] block font-mono">
                THEY OWE YOU
              </span>
              <span className="text-lg font-black text-indigo-500 font-mono-num block">
                {formatINR(amountTheyOweMe)}
              </span>
              <span className="text-[10px] text-[var(--card-text-dim)] block">
                Splits: {formatINR(splitOwed)} · Loans: {formatINR(loanOwed)}
              </span>
            </div>

            <div className="p-3 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--card-text-sub)] block font-mono">
                YOU OWE THEM
              </span>
              <span className="text-lg font-black text-rose-500 font-mono-num block">
                {formatINR(amountIOweThem)}
              </span>
              <span className="text-[10px] text-[var(--card-text-dim)] block">
                Borrowed money: {formatINR(borrowedOwed)}
              </span>
            </div>
          </div>

          {/* Settle Action Button */}
          {netBalance !== 0 && (
            <div className="pt-2">
              {netBalance > 0 ? (
                <button
                  onClick={() => handleOpenSettleModal('RECEIVE', netBalance, selectedPerson.id, selectedPerson.name)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Receive Settlement ({formatINR(netBalance)})</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenSettleModal('PAY', Math.abs(netBalance), selectedPerson.id, selectedPerson.name)}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                >
                  <HandCoins className="w-3.5 h-3.5" />
                  <span>Repay Net Balance ({formatINR(Math.abs(netBalance))})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Statement / Activity History with this Person */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--page-subtitle)] px-1 font-mono">
            ACTIVITY HISTORY WITH {selectedPerson.name.toUpperCase()}
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
                const isBorrow = tx.type === 'BORROWED_MONEY';
                const isBorrowRepay = tx.type === 'BORROW_REPAYMENT';
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
                  actionTitle = `Lent: ${tx.note || 'Direct cash loan'}`;
                } else if (isBorrow) {
                  actionTitle = `Borrowed: ${tx.note || 'Cash from friend'}`;
                } else if (isBorrowRepay) {
                  actionTitle = `Repaid: ${tx.note || 'Repaid borrowed money'}`;
                } else if (isReimbursement) {
                  actionTitle = 'Split reimbursement received';
                } else if (isRepayment) {
                  actionTitle = 'Loan repayment received';
                }

                const isTheyOweIncrement = isSplit || isLend;
                const isIOweIncrement = isBorrow;
                const isSettlement = isReimbursement || isRepayment || isBorrowRepay;

                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[var(--card-text-main)] block">{actionTitle}</span>
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
                        <span>· {tx.accountId === 'acc_cash' ? 'Cash' : 'Bank'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-black font-mono-num ${
                          isSettlement
                            ? 'text-emerald-500'
                            : isTheyOweIncrement
                            ? 'text-indigo-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {isSettlement ? '✓ ' : isTheyOweIncrement ? '+ ' : '− '}
                        {formatINR(friendAmount)}
                      </span>
                      <span className="text-[10px] text-[var(--card-text-dim)] block font-mono">
                        {isSplit && 'Owed to you'}
                        {isLend && 'Lent to friend'}
                        {isBorrow && 'You owe friend'}
                        {isReimbursement && 'Split settled'}
                        {isRepayment && 'Loan settled'}
                        {isBorrowRepay && 'Borrow repaid'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settlement Modal */}
        {settleModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm theme-card rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--card-divider)]">
                <h3 className="text-base font-black text-[var(--card-text-main)]">
                  {settleModalData.type === 'RECEIVE' ? 'Receive Payment' : 'Repay Friend'}
                </h3>
                <button onClick={() => setSettleModalData(null)} className="p-1 text-[var(--card-text-sub)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmSettlement} className="space-y-4 text-xs">
                <div>
                  <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">AMOUNT</label>
                  <input
                    type="number"
                    value={settleAmountStr}
                    onChange={e => setSettleAmountStr(e.target.value)}
                    className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-lg font-black px-3.5 py-2 rounded-xl text-[var(--card-text-main)] font-mono-num"
                    required
                  />
                </div>

                <div>
                  <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">
                    {settleModalData.type === 'RECEIVE' ? 'DEPOSIT INTO' : 'PAID FROM'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettleAccountId('acc_bank')}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1 ${
                        settleAccountId === 'acc_bank' ? 'bg-indigo-600 text-white border-transparent' : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Bank</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleAccountId('acc_cash')}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1 ${
                        settleAccountId === 'acc_cash' ? 'bg-emerald-600 text-white border-transparent' : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Cash</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-sm"
                  >
                    Confirm Settlement ({formatINR(parseFloat(settleAmountStr) || 0)})
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // 2. MAIN FRIENDS LIST VIEW (Unified Two-Way Net Balances)
  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[var(--page-title)] tracking-tight">Friends & Shared Money</h1>
        </div>

        <button
          onClick={() => setShowAddPersonModal(true)}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </button>
      </div>

      {/* Aggregate Friend Summary Card */}
      {people.length > 0 && (
        <div className="theme-card rounded-3xl p-4 shadow-sm grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-black/5 dark:bg-black/5 p-2.5 rounded-2xl border border-[var(--card-divider)]">
            <span className="text-[10px] font-bold uppercase text-[var(--card-text-sub)] font-mono block">THEY OWE YOU</span>
            <span className="text-base font-black text-amber-500 font-mono-num mt-0.5 block">
              {formatINR(overview.totalMoneyOwedToYou)}
            </span>
          </div>

          <div className="bg-black/5 dark:bg-black/5 p-2.5 rounded-2xl border border-[var(--card-divider)]">
            <span className="text-[10px] font-bold uppercase text-[var(--card-text-sub)] font-mono block">YOU OWE OTHERS</span>
            <span className="text-base font-black text-rose-500 font-mono-num mt-0.5 block">
              {formatINR(overview.totalMoneyYouOwe)}
            </span>
          </div>

          <div className="bg-black/5 dark:bg-black/5 p-2.5 rounded-2xl border border-[var(--card-divider)]">
            <span className="text-[10px] font-bold uppercase text-[var(--card-text-sub)] font-mono block">NET POSITION</span>
            <span
              className={`text-base font-black font-mono-num mt-0.5 block ${
                overview.netFriendPosition > 0
                  ? 'text-amber-500'
                  : overview.netFriendPosition < 0
                  ? 'text-rose-500'
                  : 'text-emerald-500'
              }`}
            >
              {formatINR(overview.netFriendPosition)}
            </span>
          </div>
        </div>
      )}

      {/* People List with Single Net Balance */}
      {people.length === 0 ? (
        <div className="text-center py-16 px-4 theme-card rounded-3xl shadow-sm">
          <p className="text-sm font-black text-[var(--card-text-main)]">No friends recorded yet.</p>
          <p className="text-xs text-[var(--card-text-sub)] mt-1">When you split expenses, lend money, or borrow from friends, they will appear here with a single net balance.</p>
        </div>
      ) : (
        <div className="theme-card rounded-3xl divide-y divide-[var(--card-divider)] overflow-hidden shadow-sm">
          {people.map(person => {
            const balance = personBalances.find(p => p.personId === person.id);
            const netBalance = balance?.netBalance || 0;
            const isSettled = netBalance === 0;
            const theyOweMe = netBalance > 0;
            const iOweThem = netBalance < 0;

            return (
              <div
                key={person.id}
                onClick={() => setSelectedPersonId(person.id)}
                className="p-4 hover:bg-black/5 dark:hover:bg-black/5 cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${
                      theyOweMe
                        ? 'bg-amber-500/20 text-amber-500'
                        : iOweThem
                        ? 'bg-rose-500/20 text-rose-500'
                        : 'bg-emerald-500/20 text-emerald-500'
                    }`}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-sm font-bold text-[var(--card-text-main)] group-hover:text-indigo-500 transition-colors block truncate">
                      {person.name}
                    </span>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[var(--card-text-sub)] font-mono truncate">
                      {theyOweMe && <span className="text-amber-500 font-bold">Owes you {formatINR(netBalance)}</span>}
                      {iOweThem && <span className="text-rose-500 font-bold">You owe {formatINR(Math.abs(netBalance))}</span>}
                      {isSettled && <span className="text-emerald-500 font-bold flex items-center space-x-0.5"><CheckCircle2 className="w-3 h-3" /><span>Settled</span></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                  <div className="text-right">
                    <span
                      className={`text-sm font-black font-mono-num block ${
                        theyOweMe
                          ? 'text-amber-500'
                          : iOweThem
                          ? 'text-rose-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      {theyOweMe && `+${formatINR(netBalance)}`}
                      {iOweThem && `−${formatINR(Math.abs(netBalance))}`}
                      {isSettled && '₹0'}
                    </span>
                    <span className="text-[10px] text-[var(--card-text-dim)] block font-mono">
                      {theyOweMe && 'Owes you'}
                      {iOweThem && 'You owe'}
                      {isSettled && 'Settled'}
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
            
            <form onSubmit={handleAddPersonSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">FRIEND'S NAME</label>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      phoneInputRef.current?.focus();
                    }
                  }}
                  placeholder="e.g. Karthick, Hemanth"
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[var(--card-text-sub)] block mb-1 font-mono font-bold">PHONE NUMBER (OPTIONAL)</label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="tel"
                  value={newPersonPhone}
                  onChange={e => setNewPersonPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPersonModal(false)}
                  className="flex-1 py-2.5 bg-black/10 dark:bg-black/10 font-bold text-[var(--card-text-main)] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPerson}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-xl flex items-center justify-center space-x-1 shadow-sm disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingPerson ? 'Saving...' : 'Save Friend'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
