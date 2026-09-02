import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Plus,
  RotateCcw,
  Download,
  Upload,
  Sun,
  Moon,
  Landmark,
  Banknote,
  Check,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../services/accountingEngine';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, allUsers, switchUser, createCustomProfile, deleteProfile, theme, toggleTheme } = useAuth();
  const {
    accounts,
    exportAllData,
    importAllData,
    clearData,
  } = useFinance();

  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');
  
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    await createCustomProfile(newProfileName.trim());
    setNewProfileName('');
    setShowCreateProfile(false);
  };

  const handleDeleteProfile = async (e: React.MouseEvent, userId: string, userName: string) => {
    e.stopPropagation();
    if (allUsers.length <= 1) {
      alert('You must have at least one profile.');
      return;
    }
    if (window.confirm(`Delete profile "${userName}" and all its financial history? This action cannot be undone.`)) {
      await deleteProfile(userId);
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
    if (window.confirm('Reset all financial records for current profile to clean ₹0 state?')) {
      await clearData();
      onClose();
    }
  };

  const bankAccount = accounts.find(a => a.id === 'acc_bank') || accounts[0];
  const cashAccount = accounts.find(a => a.id === 'acc_cash') || accounts[1];

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
                {theme === 'dark' ? 'Dark Mode (Black Bg + Offwhite Cards)' : 'Light Mode (Offwhite Bg + Dark Cards)'}
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

        {/* 2. Physical Money Locations Display */}
        <div className="p-4 bg-black/5 dark:bg-black/5 border border-[var(--card-divider)] rounded-2xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] font-mono block">
            YOUR TWO MONEY LOCATIONS
          </span>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] rounded-xl">
              <div className="flex items-center space-x-1.5 text-[var(--card-text-sub)]">
                <Landmark className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold">Bank Account</span>
              </div>
              <span className="text-base font-black font-mono-num text-[var(--card-text-main)] mt-0.5 block">
                {formatINR(bankAccount?.balance || 0)}
              </span>
            </div>

            <div className="p-3 bg-black/10 dark:bg-black/10 border border-[var(--card-divider)] rounded-xl">
              <div className="flex items-center space-x-1.5 text-[var(--card-text-sub)]">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-bold">Cash in Hand</span>
              </div>
              <span className="text-base font-black font-mono-num text-[var(--card-text-main)] mt-0.5 block">
                {formatINR(cashAccount?.balance || 0)}
              </span>
            </div>
          </div>
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

        {/* 4. Local User Profiles Switcher with Floating Delete Option */}
        <div className="space-y-2 pt-1 border-t border-[var(--card-divider)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--card-text-sub)] px-1 font-mono">
              PROFILES ON THIS DEVICE
            </span>
            <button
              onClick={() => setShowCreateProfile(true)}
              className="text-xs font-bold text-indigo-500 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>New Profile</span>
            </button>
          </div>

          <div className="space-y-2">
            {allUsers.map(u => {
              const isActive = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`group relative w-full flex items-center justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition-all shadow-sm ${
                    isActive
                      ? 'bg-indigo-600 text-white border-transparent font-bold'
                      : 'bg-black/5 dark:bg-black/5 border-[var(--card-divider)] text-[var(--card-text-main)] hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-12">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-black/10 text-[var(--card-text-main)]'
                    }`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="block truncate">{u.name}</span>
                      {isActive && <span className="text-[10px] opacity-80 block font-normal">Active profile</span>}
                    </div>
                  </div>

                  {/* Right side status and floating delete action */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isActive && <Check className="w-4 h-4 text-white" />}
                    
                    {allUsers.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteProfile(e, u.id, u.name)}
                        className={`p-1.5 rounded-xl transition-all shadow-sm ${
                          isActive
                            ? 'bg-white/20 hover:bg-rose-500 text-white'
                            : 'bg-black/10 dark:bg-black/10 hover:bg-rose-500 text-[var(--card-text-sub)] hover:text-white'
                        }`}
                        title={`Delete profile ${u.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                autoFocus
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
            <span>Reset Current Profile Data to ₹0</span>
          </button>
        </div>

      </div>
    </div>
  );
};
