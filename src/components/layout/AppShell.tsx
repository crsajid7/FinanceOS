import React, { useRef, useEffect } from 'react';
import {
  Home,
  Clock,
  Users,
  PieChart,
  Plus,
  ArrowDownLeft,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabType = 'home' | 'history' | 'people' | 'month';

interface AppShellProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSpent: () => void;
  onOpenMoney: () => void;
  onOpenProfile: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  onOpenSpent,
  onOpenMoney,
  onOpenProfile,
  children,
}) => {
  const { currentUser, theme, toggleTheme } = useAuth();
  const mainContentRef = useRef<HTMLElement>(null);

  // Reset scroll position to top whenever changing main pages/tabs
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentTab]);

  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'people', label: 'Friends', icon: Users },
    { id: 'month', label: 'Stats', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--page-title)] flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 justify-between flex-shrink-0 transition-colors">
        <div className="space-y-6">
          
          {/* Brand Logo & Theme Toggle */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-md font-black text-lg">
                ₹
              </div>
              <div>
                <span className="text-base font-black tracking-tight block text-[var(--page-title)]">
                  FinanceOS
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--page-subtitle)] font-bold block font-mono">
                  Personal Money Diary
                </span>
              </div>
            </div>

            {/* Desktop Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] text-[var(--page-title)] transition-colors"
              title={theme === 'dark' ? 'Switch to Offwhite theme' : 'Switch to Dark theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onOpenSpent}
              className="w-full py-3 px-4 bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black rounded-2xl text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ SPENT</span>
            </button>

            <button
              onClick={onOpenMoney}
              className="w-full py-2.5 px-4 bg-black/[0.05] dark:bg-white/[0.08] border border-black/10 dark:border-white/10 text-[var(--page-title)] font-black rounded-2xl text-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              <span>+ MONEY</span>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'text-[var(--page-subtitle)] hover:text-[var(--page-title)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="pt-4 border-t border-[var(--sidebar-border)]">
          <button
            onClick={onOpenProfile}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-xs transition-colors"
          >
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-7 h-7 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <span className="font-bold text-[var(--page-title)] truncate">{currentUser.name}</span>
            </div>
            <User className="w-3.5 h-3.5 text-[var(--page-subtitle)]" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--sidebar-border)] sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-extrabold text-sm">
              ₹
            </div>
            <span className="text-sm font-extrabold tracking-tight text-[var(--page-title)]">FinanceOS</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[var(--page-title)]"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            <button
              onClick={onOpenProfile}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-xs text-[var(--page-title)]"
            >
              <span className="font-semibold">{currentUser.name.split(' ')[0]}</span>
              <User className="w-3 h-3 text-[var(--page-subtitle)]" />
            </button>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main ref={mainContentRef} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Floating Pill Bottom Dock for Mobile */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-center pointer-events-none">
        <nav className="pointer-events-auto floating-dock rounded-full px-3 py-2 flex items-center space-x-2 max-w-sm w-full justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--dock-active-bg)] text-[var(--dock-active-text)] shadow-md scale-105'
                    : 'text-[var(--dock-inactive-text)] hover:text-[var(--page-title)]'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
};
