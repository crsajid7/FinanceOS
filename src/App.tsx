import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
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
  // Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Modal States
  const [isSpentOpen, setIsSpentOpen] = useState<boolean>(false);
  const [isMoneyOpen, setIsMoneyOpen] = useState<boolean>(false);
  const [isWhereDidMoneyGoOpen, setIsWhereDidMoneyGoOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  
  // Detail Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onOpenSpent={() => setIsSpentOpen(true)}
      onOpenMoney={() => setIsMoneyOpen(true)}
      onOpenProfile={() => setIsProfileOpen(true)}
    >
      {currentTab === 'home' && (
        <HomeScreen
          onOpenSpent={() => setIsSpentOpen(true)}
          onOpenMoney={() => setIsMoneyOpen(true)}
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
        <PeopleScreen />
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
        onClose={() => setIsMoneyOpen(false)}
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
