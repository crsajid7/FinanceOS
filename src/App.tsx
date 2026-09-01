import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AppShell, TabType } from './components/layout/AppShell';
import { HomeScreen } from './components/home/HomeScreen';
import { HistoryScreen } from './components/history/HistoryScreen';
import { PeopleScreen } from './components/people/PeopleScreen';
import { MonthScreen } from './components/month/MonthScreen';
import { SpentModal } from './components/spent/SpentModal';
import { MoneyModal } from './components/money/MoneyModal';
import { WhereDidMyMoneyGoModal } from './components/insights/WhereDidMyMoneyGoModal';
import { TransactionDetailModal } from './components/common/TransactionDetailModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { Transaction } from './types/finance';

const MainAppContent: React.FC = () => {
  const { isLoading } = useFinance();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Modal States
  const [isSpentOpen, setIsSpentOpen] = useState<boolean>(false);
  const [isMoneyOpen, setIsMoneyOpen] = useState<boolean>(false);
  const [isWhereDidMoneyGoOpen, setIsWhereDidMoneyGoOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  
  // Detail Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Preselected Person for Money Modal (from People Screen Settle Action)
  const [moneyPreselect, setMoneyPreselect] = useState<{
    personId?: string;
    type?: 'REIMBURSEMENT' | 'LOAN_REPAYMENT';
  }>({});

  const handleRecordPersonPayment = (personId: string, type: 'REIMBURSEMENT' | 'LOAN_REPAYMENT') => {
    setMoneyPreselect({ personId, type });
    setIsMoneyOpen(true);
  };

  const handleOpenMoneyStandard = () => {
    setMoneyPreselect({});
    setIsMoneyOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-lg animate-pulse">
            ₹
          </div>
          <span className="text-xs text-slate-400 font-medium">Opening your money diary...</span>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onOpenSpent={() => setIsSpentOpen(true)}
      onOpenMoney={handleOpenMoneyStandard}
      onOpenProfile={() => setIsProfileOpen(true)}
    >
      {currentTab === 'home' && (
        <HomeScreen
          onOpenSpent={() => setIsSpentOpen(true)}
          onOpenMoney={handleOpenMoneyStandard}
          onOpenWhereDidMoneyGo={() => setIsWhereDidMoneyGoOpen(true)}
          onNavigateToPeople={() => setCurrentTab('people')}
          onNavigateToHistory={() => setCurrentTab('history')}
        />
      )}

      {currentTab === 'history' && (
        <HistoryScreen
          onSelectTransaction={tx => setSelectedTransaction(tx)}
        />
      )}

      {currentTab === 'people' && (
        <PeopleScreen
          onRecordPayment={handleRecordPersonPayment}
        />
      )}

      {currentTab === 'month' && (
        <MonthScreen
          onOpenWhereDidMoneyGo={() => setIsWhereDidMoneyGoOpen(true)}
        />
      )}

      {/* Global Modals */}
      <SpentModal
        isOpen={isSpentOpen}
        onClose={() => setIsSpentOpen(false)}
      />

      <MoneyModal
        isOpen={isMoneyOpen}
        onClose={() => {
          setIsMoneyOpen(false);
          setMoneyPreselect({});
        }}
        preselectedPersonId={moneyPreselect.personId}
        preselectedType={moneyPreselect.type}
      />

      <WhereDidMyMoneyGoModal
        isOpen={isWhereDidMoneyGoOpen}
        onClose={() => setIsWhereDidMoneyGoOpen(false)}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </AppShell>
  );
};

export function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainAppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;
