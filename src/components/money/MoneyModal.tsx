import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  TrendingUp,
  RotateCcw,
  HandCoins,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, validateLoanRepayment } from '../../services/accountingEngine';
import confetti from 'canvas-confetti';

interface MoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPersonId?: string;
  preselectedType?: 'REIMBURSEMENT' | 'LOAN_REPAYMENT';
}

type MoneyType = 'BUDGET' | 'REIMBURSEMENT' | 'LOAN_REPAYMENT' | 'REFUND' | 'INCOME';

export const MoneyModal: React.FC<MoneyModalProps> = ({
  isOpen,
  onClose,
  preselectedPersonId,
  preselectedType,
}) => {
  const { people, personBalances, addTransaction, accounts } = useFinance();

  const [moneyType, setMoneyType] = useState<MoneyType>('BUDGET');
  const [amountStr, setAmountStr] = useState<string>('');
  const [personId, setPersonId] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [sourcePurpose, setSourcePurpose] = useState<string>('Monthly Allowance');
  const [note, setNote] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setNote('');
      setErrorMsg('');
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }

      if (preselectedType === 'REIMBURSEMENT') {
        setMoneyType('REIMBURSEMENT');
      } else if (preselectedType === 'LOAN_REPAYMENT') {
        setMoneyType('LOAN_REPAYMENT');
      } else {
        setMoneyType('BUDGET');
      }

      if (preselectedPersonId) {
        setPersonId(preselectedPersonId);
        const p = people.find(item => item.id === preselectedPersonId);
        if (p) setPersonName(p.name);
      } else {
        setPersonId('');
        setPersonName('');
      }

      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, preselectedPersonId, preselectedType, people, accounts]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr) || 0;
  const selectedPersonBalance = personBalances.find(p => p.personId === personId);

  const handleSelectPerson = (pId: string) => {
    setPersonId(pId);
    const p = people.find(item => item.id === pId);
    if (p) {
      setPersonName(p.name);
      const bal = personBalances.find(b => b.personId === pId);
      if (bal) {
        if (moneyType === 'REIMBURSEMENT' && bal.splitOwed > 0) {
          setAmountStr(String(bal.splitOwed));
        } else if (moneyType === 'LOAN_REPAYMENT' && bal.loanOwed > 0) {
          setAmountStr(String(bal.loanOwed));
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0.');
      return;
    }

    try {
      if (moneyType === 'BUDGET') {
        await addTransaction({
          type: 'MONEY_RECEIVED',
          amount: numericAmount,
          category: 'Other',
          personName: personName.trim() || undefined,
          note: note.trim() || sourcePurpose || 'Monthly Budget Addition',
          isMonthlyBudget: true,
          accountId: selectedAccountId,
        });
      } else if (moneyType === 'REIMBURSEMENT') {
        const targetName = personName.trim() || people.find(p => p.id === personId)?.name;
        if (!targetName) {
          setErrorMsg('Please choose the person who reimbursed you.');
          return;
        }

        await addTransaction({
          type: 'REIMBURSEMENT',
          amount: numericAmount,
          category: 'Other',
          personId: personId || undefined,
          personName: targetName,
          note: note.trim() || `Reimbursement from ${targetName}`,
          accountId: selectedAccountId,
        });
      } else if (moneyType === 'LOAN_REPAYMENT') {
        const targetName = personName.trim() || people.find(p => p.id === personId)?.name;
        if (!targetName) {
          setErrorMsg('Please choose the person who returned the loan.');
          return;
        }

        if (selectedPersonBalance) {
          const validation = validateLoanRepayment(numericAmount, selectedPersonBalance.loanOwed, targetName);
          if (!validation.isValid) {
            setErrorMsg(validation.warningMessage || 'Repayment exceeds outstanding loan.');
            return;
          }
        }

        await addTransaction({
          type: 'LOAN_REPAYMENT',
          amount: numericAmount,
          category: 'Other',
          personId: personId || undefined,
          personName: targetName,
          note: note.trim() || `Loan repayment from ${targetName}`,
          accountId: selectedAccountId,
        });
      } else if (moneyType === 'REFUND') {
        await addTransaction({
          type: 'REFUND',
          amount: numericAmount,
          category: 'Other',
          note: note.trim() || 'Refund received',
          accountId: selectedAccountId,
        });
      } else {
        await addTransaction({
          type: 'MONEY_RECEIVED',
          amount: numericAmount,
          category: 'Other',
          personName: personName.trim() || undefined,
          note: note.trim() || sourcePurpose || 'Income',
          isMonthlyBudget: false,
          accountId: selectedAccountId,
        });
      }

      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch {
        // Fallback
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record money.';
      setErrorMsg(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md theme-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-divider)] flex items-center justify-between bg-black/5 dark:bg-black/5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-base font-black text-[var(--card-text-main)] tracking-tight">
              {moneyType === 'BUDGET' && 'Add Monthly Budget / Allowance'}
              {moneyType === 'REIMBURSEMENT' && 'Receive Friend Reimbursement'}
              {moneyType === 'LOAN_REPAYMENT' && 'Receive Loan Repayment'}
              {moneyType === 'REFUND' && 'Record Refund'}
              {moneyType === 'INCOME' && 'Record Other Money In'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="flex border-b border-[var(--card-divider)] bg-black/5 dark:bg-black/5 px-3 pt-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setMoneyType('BUDGET')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl whitespace-nowrap transition-all ${
              moneyType === 'BUDGET'
                ? 'bg-black/10 dark:bg-black/10 text-emerald-500 border-t-2 border-emerald-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            Monthly Budget
          </button>
          <button
            type="button"
            onClick={() => setMoneyType('REIMBURSEMENT')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl whitespace-nowrap transition-all ${
              moneyType === 'REIMBURSEMENT'
                ? 'bg-black/10 dark:bg-black/10 text-emerald-500 border-t-2 border-emerald-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            Reimbursement
          </button>
          <button
            type="button"
            onClick={() => setMoneyType('LOAN_REPAYMENT')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl whitespace-nowrap transition-all ${
              moneyType === 'LOAN_REPAYMENT'
                ? 'bg-black/10 dark:bg-black/10 text-emerald-500 border-t-2 border-emerald-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            Loan Repaid
          </button>
          <button
            type="button"
            onClick={() => setMoneyType('REFUND')}
            className={`px-3.5 py-2 text-xs font-black rounded-t-xl whitespace-nowrap transition-all ${
              moneyType === 'REFUND'
                ? 'bg-black/10 dark:bg-black/10 text-emerald-500 border-t-2 border-emerald-500 shadow-sm'
                : 'text-[var(--card-text-sub)] hover:text-[var(--card-text-main)]'
            }`}
          >
            Refund
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Large Amount Input */}
          <div className="text-center py-2">
            <span className="text-xs font-bold text-[var(--card-text-sub)] uppercase tracking-wider block mb-1 font-mono">
              Amount Received
            </span>
            <div className="inline-flex items-center justify-center bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl px-4 py-2 focus-within:border-emerald-500 transition-colors w-full">
              <span className="text-2xl font-bold text-[var(--card-text-sub)] mr-1.5 font-mono">₹</span>
              <input
                ref={amountInputRef}
                type="number"
                step="any"
                inputMode="decimal"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full text-3xl font-black text-[var(--card-text-main)] bg-transparent focus:outline-none font-mono-num tracking-tight"
                required
              />
            </div>
          </div>

          {/* BUDGET FLOW */}
          {moneyType === 'BUDGET' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <div>
                <label className="text-xs font-bold text-[var(--card-text-sub)] block mb-1 font-mono">SOURCE / FROM (OPTIONAL)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Dad', 'Mom', 'Parents', 'Salary', 'Savings', 'Other'].map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setPersonName(src)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors shadow-sm ${
                        personName === src
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  placeholder="e.g. Dad, Scholarship, etc."
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-500 leading-relaxed">
                ✨ Designating this as your <strong>Monthly Budget</strong> sets your available spending limit for this month.
              </div>
            </div>
          )}

          {/* REIMBURSEMENT FLOW */}
          {moneyType === 'REIMBURSEMENT' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <label className="text-xs font-bold text-[var(--card-text-main)] block">Who reimbursed you?</label>
              
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {personBalances.filter(p => p.splitOwed > 0).length === 0 ? (
                  <p className="text-xs text-[var(--card-text-sub)] italic p-3 bg-black/5 dark:bg-black/5 rounded-xl border border-[var(--card-divider)]">
                    No friends currently owe you money from splits. You can still select anyone below.
                  </p>
                ) : (
                  personBalances
                    .filter(p => p.splitOwed > 0)
                    .map(p => (
                      <button
                        key={p.personId}
                        type="button"
                        onClick={() => handleSelectPerson(p.personId)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-colors shadow-sm ${
                          personId === p.personId
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)] hover:border-black/20'
                        }`}
                      >
                        <span className="font-bold">{p.personName}</span>
                        <span className="text-emerald-500 font-mono-num font-bold">
                          Owes {formatINR(p.splitOwed)}
                        </span>
                      </button>
                    ))
                )}
              </div>

              <div>
                <select
                  value={personId}
                  onChange={e => handleSelectPerson(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  <option value="">-- Or choose from contacts --</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-500 leading-relaxed">
                💡 <strong>Important:</strong> Reimbursements settle receivables and replenish cash. They do <strong>NOT</strong> count as new income or alter your monthly spending budget.
              </div>
            </div>
          )}

          {/* LOAN REPAYMENT FLOW */}
          {moneyType === 'LOAN_REPAYMENT' && (
            <div className="space-y-3 bg-black/5 dark:bg-black/5 p-3.5 rounded-2xl border border-[var(--card-divider)]">
              <label className="text-xs font-bold text-[var(--card-text-main)] block">Who is returning borrowed money?</label>
              
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {personBalances.filter(p => p.loanOwed > 0).length === 0 ? (
                  <p className="text-xs text-[var(--card-text-sub)] italic p-3 bg-black/5 dark:bg-black/5 rounded-xl border border-[var(--card-divider)]">
                    No one currently has an active loan recorded. You can still select anyone below.
                  </p>
                ) : (
                  personBalances
                    .filter(p => p.loanOwed > 0)
                    .map(p => (
                      <button
                        key={p.personId}
                        type="button"
                        onClick={() => handleSelectPerson(p.personId)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-colors shadow-sm ${
                          personId === p.personId
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-sub)]'
                        }`}
                      >
                        <span className="font-bold">{p.personName}</span>
                        <span className="text-amber-500 font-mono-num font-bold">
                          Loan {formatINR(p.loanOwed)}
                        </span>
                      </button>
                    ))
                )}
              </div>

              <div>
                <select
                  value={personId}
                  onChange={e => handleSelectPerson(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  <option value="">-- Or choose from contacts --</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-500 leading-relaxed">
                💡 <strong>Important:</strong> Repaying a loan restores your cash balance and reduces the loan receivable. It does <strong>NOT</strong> inflate your monthly budget. Partial repayments are supported.
              </div>
            </div>
          )}

          {/* REFUND FLOW */}
          {moneyType === 'REFUND' && (
            <div className="p-3.5 bg-black/5 dark:bg-black/5 rounded-2xl border border-[var(--card-divider)] text-xs text-[var(--card-text-main)] space-y-2">
              <p>Refunds reverse your previous personal spending and restore cash balance.</p>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What was refunded? (e.g. Cancelled train ticket, Swiggy refund)"
                className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          )}

          {/* Optional Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note"
              className="w-full bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] text-xs px-3.5 py-2.5 rounded-xl text-[var(--card-text-main)] placeholder:text-[var(--card-text-sub)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center space-x-1.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {moneyType === 'BUDGET' && 'Set Monthly Budget'}
                {moneyType === 'REIMBURSEMENT' && 'Save Reimbursement'}
                {moneyType === 'LOAN_REPAYMENT' && 'Save Loan Repayment'}
                {moneyType === 'REFUND' && 'Record Refund'}
                {moneyType === 'INCOME' && 'Save Money Received'}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
