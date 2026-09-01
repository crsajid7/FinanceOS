import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/finance';
import { DEMO_USER } from '../db/seedData';
import { db } from '../db/database';

interface AuthContextType {
  currentUser: UserProfile;
  isDemoMode: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  switchUser: (userId: string) => Promise<void>;
  createCustomProfile: (name: string, monthlyBudget: number, budgetCycleStartDay?: number) => Promise<UserProfile>;
  resetToDemo: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  allUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedTheme = (localStorage.getItem('financeos_theme') as 'light' | 'dark') || 'light';
    return { ...DEMO_USER, theme: savedTheme };
  });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([DEMO_USER]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('financeos_theme') as 'light' | 'dark') || 'light';
  });

  // Apply theme to html root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('financeos_theme', theme);
  }, [theme]);

  // Initialize users from DB
  useEffect(() => {
    async function initUsers() {
      try {
        const usersInDb = await db.users.toArray();
        if (usersInDb.length === 0) {
          await db.users.add(DEMO_USER);
          setAllUsers([DEMO_USER]);
          setCurrentUser(DEMO_USER);
        } else {
          // Safe migration for budgetCycleStartDay
          const migratedUsers = usersInDb.map(u => ({
            ...u,
            budgetCycleStartDay: u.budgetCycleStartDay || 5,
          }));
          setAllUsers(migratedUsers);
          const savedUserId = localStorage.getItem('financeos_active_user_id');
          const matched = migratedUsers.find(u => u.id === savedUserId) || migratedUsers[0];
          setCurrentUser(matched);
          setIsDemoMode(matched.id === DEMO_USER.id);
        }
      } catch (err) {
        console.error('Failed to init users from DB:', err);
      }
    }
    initUsers();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const switchUser = async (userId: string) => {
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      setIsDemoMode(target.id === DEMO_USER.id);
      localStorage.setItem('financeos_active_user_id', target.id);
    }
  };

  const createCustomProfile = async (name: string, monthlyBudget: number, budgetCycleStartDay: number = 5): Promise<UserProfile> => {
    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '')}@financeos.app`,
      currency: '₹',
      defaultMonthlyBudget: monthlyBudget || 0,
      budgetCycleStartDay: budgetCycleStartDay || 5,
      theme,
      customCategories: [],
    };

    await db.users.add(newUser);
    setAllUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setIsDemoMode(false);
    localStorage.setItem('financeos_active_user_id', newUser.id);
    return newUser;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      ...updates,
    };
    await db.users.put(updated);
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  };

  const resetToDemo = async () => {
    await switchUser(DEMO_USER.id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isDemoMode,
        theme,
        toggleTheme,
        switchUser,
        createCustomProfile,
        resetToDemo,
        updateProfile,
        allUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
