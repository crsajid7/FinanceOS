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

import { useSwipeNavigation } from './hooks/useSwipeNavigation';
import { useBackHandler } from './hooks/useBackHandler';

const MAIN_TABS: TabType[] = ['home', 'history', 'people', 'month'];

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

  const isAnyModalOpen =
    isSpentOpen ||
    isMoneyOpen ||
    isWhereDidMoneyGoOpen ||
    isProfileOpen ||
    selectedTransaction !== null;

  useBackHandler('transaction-detail-modal', !!selectedTransaction, () => setSelectedTransaction(null));
  useBackHandler('where-money-go-modal', isWhereDidMoneyGoOpen, () => setIsWhereDidMoneyGoOpen(false));
  useBackHandler('profile-modal', isProfileOpen, () => setIsProfileOpen(false));
  useBackHandler('main-tab-subpage', currentTab !== 'home', () => setCurrentTab('home'));

  const handleNextTab = () => {
    const currentIndex = MAIN_TABS.indexOf(currentTab);
    if (currentIndex < MAIN_TABS.length - 1) {
      setCurrentTab(MAIN_TABS[currentIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    const currentIndex = MAIN_TABS.indexOf(currentTab);
    if (currentIndex > 0) {
      setCurrentTab(MAIN_TABS[currentIndex - 1]);
    }
  };

  useSwipeNavigation({
    onSwipeLeft: handleNextTab,
    onSwipeRight: handlePrevTab,
    disabled: isAnyModalOpen,
    threshold: 60,
  });

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onOpenSpent={() => setIsSpentOpen(true)}
      onOpenMoney={() => setIsMoneyOpen(true)}
      onOpenProfile={() => setIsProfileOpen(true)}
    >
      <div key={currentTab} className="animate-in fade-in duration-150">
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
      </div>

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
