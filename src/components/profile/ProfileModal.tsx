import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Plus,
  RotateCcw,
  Trash2,
  Check,
  Download,
  Upload,
  Calendar,
  Sun,
  Moon,
  AlertCircle,
  FileJson,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, allUsers, switchUser, createCustomProfile, updateProfile, theme, toggleTheme } = useAuth();
  const {
    accounts,
    exportAllData,
    importAllData,
    resetDemoData,
    clearData,
  } = useFinance();

  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileBudget, setNewProfileBudget] = useState<string>('0');
  const [newProfileStartDay, setNewProfileStartDay] = useState<string>('5');
  
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    await createCustomProfile(
      newProfileName.trim(),
      parseFloat(newProfileBudget) || 0,
      parseInt(newProfileStartDay, 10) || 5
    );
    setNewProfileName('');
    setShowCreateProfile(false);
  };

  const handleUpdateCycleStartDay = async (dayVal: string) => {
    const day = parseInt(dayVal, 10);
    if (day >= 1 && day <= 28) {
      await updateProfile({ budgetCycleStartDay: day });
    }
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeos_backup_${currentUser.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing backup...');
    try {
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        setImportStatus('Backup restored successfully!');
        setTimeout(() => onClose(), 800);
      } else {
        setImportStatus('Failed to restore. Invalid file format.');
      }
    } catch {
      setImportStatus('Error reading file.');
    }
  };

  const handleResetDataToZero = async () => {
    if (window.confirm('Reset all financial records to clean ₹0 state?')) {
      await clearData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md theme-card rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-divider)]">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-black text-[var(--card-text-main)]">Profile & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--card-text-sub)] hover:text-[var(--card-text-main)] rounded-xl hover:bg-black/5 dark:hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Switcher */}
        <div className="p-4 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-black/10 flex items-center justify-center text-[var(--card-text-main)]">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--card-text-main)] block">Theme Appearance</span>
              <span className="text-[11px] text-[var(--card-text-sub)] block">
                {theme === 'dark' ? 'Dark Mode (Black Bg + Offwhite Elements)' : 'Light Mode (Offwhite Bg + Black Elements)'}
              </span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95"
          >
            Toggle
          </button>
        </div>

        {/* 2. Budget Cycle Start Day Setting */}
        <div className="p-4 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-[var(--card-text-main)]">Budget Cycle Starts On</span>
            </div>
            <select
              value={currentUser.budgetCycleStartDay || 5}
              onChange={e => handleUpdateCycleStartDay(e.target.value)}
              className="bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-xs font-bold px-3 py-1.5 rounded-xl text-[var(--card-text-main)] font-mono focus:outline-none focus:border-indigo-500"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  {day}th of month
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-[var(--card-text-dim)] block leading-relaxed font-mono">
            Example: 5th means your monthly budget runs from 5th of this month to 4th of next month (e.g. Sep 5 → Oct 4).
          </span>
        </div>

        {/* 3. Export & Import Backup */}
        <div className="p-4 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl space-y-2.5">
          <span className="text-xs font-bold text-[var(--card-text-main)] block font-mono">BACKUP & RESTORE</span>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="py-2.5 px-3 bg-black/10 dark:bg-black/10 hover:bg-black/20 text-[var(--card-text-main)] rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border border-[var(--card-divider)] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-black/10 dark:bg-black/10 hover:bg-black/20 text-[var(--card-text-main)] rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border border-[var(--card-divider)] transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {importStatus && (
            <span className="text-[11px] font-mono text-indigo-400 block pt-1">{importStatus}</span>
          )}
        </div>

        {/* 4. Active Profile & Accounts */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] px-1 font-mono">
            PHYSICAL WALLET CASH & ACCOUNTS
          </span>
          <div className="grid grid-cols-3 gap-2">
            {accounts.map(acc => (
              <div key={acc.id} className="p-3 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl">
                <span className="text-[10px] text-[var(--card-text-sub)] block truncate font-mono">{acc.name}</span>
                <span className="text-xs font-bold text-[var(--card-text-main)] font-mono-num mt-0.5 block">
                  {formatINR(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. User Profiles Switcher */}
        <div className="space-y-2 pt-1 border-t border-[var(--card-divider)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] px-1 font-mono">
              SWITCH PROFILE (ON THIS DEVICE)
            </span>
            <button
              onClick={() => setShowCreateProfile(true)}
              className="text-xs font-bold text-indigo-500 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs transition-colors shadow-sm ${
                  u.id === currentUser.id
                    ? 'bg-indigo-600 text-white border-transparent font-bold'
                    : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-main)]'
                }`}
              >
                <span>{u.name} (Starts {u.budgetCycleStartDay || 5}th)</span>
                {u.id === currentUser.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Create Profile Form */}
        {showCreateProfile && (
          <form onSubmit={handleCreateProfileSubmit} className="p-4 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl space-y-3">
            <span className="text-xs font-bold text-[var(--card-text-main)] block">Create Profile</span>
            <div>
              <label className="text-[11px] text-[var(--card-text-sub)] block mb-1">Your Name</label>
              <input
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                placeholder="e.g. Rahul, Priya"
                className="w-full bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-xs px-3 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--card-text-sub)] block mb-1">Cycle Starts On (Day 1–28)</label>
              <input
                type="number"
                min="1"
                max="28"
                value={newProfileStartDay}
                onChange={e => setNewProfileStartDay(e.target.value)}
                className="w-full bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] text-xs px-3 py-2 rounded-xl text-[var(--card-text-main)] focus:outline-none focus:border-indigo-500 font-mono-num"
                required
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateProfile(false)}
                className="flex-1 py-2 bg-black/10 dark:bg-black/10 text-[var(--card-text-sub)] text-xs rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Danger / Reset */}
        <div className="pt-2 border-t border-[var(--card-divider)]">
          <button
            onClick={handleResetDataToZero}
            className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Data to ₹0 Clean State</span>
          </button>
        </div>

      </div>
    </div>
  );
};
