import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CloudOff,
  Cloud,
  FileJson,
  Check,
  RefreshCw,
  Info,
  HelpCircle,
  FolderDown,
  Apple,
  Package
} from 'lucide-react';
import { StorageMode, UserPreferences, ReminderItem } from '../types/notifications';
import { notificationService } from '../services/notificationService';
import { PhoneStorageStats } from '../services/localDatabase';
import { AppPackageGenerator } from '../services/appPackageGenerator';

interface PhoneDatabaseManagerProps {
  preferences: UserPreferences;
  reminders: ReminderItem[];
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onRefreshData: () => void;
  onOpenPhoneGuide?: () => void;
  onOpenAppInstaller?: () => void;
}

export const PhoneDatabaseManager: React.FC<PhoneDatabaseManagerProps> = ({
  preferences,
  reminders,
  onUpdatePreferences,
  onRefreshData,
  onOpenPhoneGuide,
  onOpenAppInstaller,
}) => {
  const [stats, setStats] = useState<PhoneStorageStats | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'backup'>('android');

  const currentMode = notificationService.getStorageMode();

  const loadStats = async () => {
    try {
      const data = await notificationService.getStorageStats();
      setStats(data);
    } catch (e) {
      console.warn('Could not load storage stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [reminders, preferences]);

  const handleToggleMode = async (newMode: StorageMode) => {
    notificationService.setStorageMode(newMode);
    onUpdatePreferences({ storageMode: newMode });
    await loadStats();
    onRefreshData();
  };

  const handleRequestPersistence = async () => {
    setIsPersisting(true);
    try {
      const granted = await notificationService.requestPersistentStorage();
      await loadStats();
      if (granted) {
        alert('Phone storage protection activated! Your workouts and alarms will not be cleared by the phone cache cleaner.');
      } else {
        alert('Persistent storage requested. Your operating system may grant it based on usage frequency.');
      }
    } finally {
      setIsPersisting(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const fileName = await notificationService.downloadDatabaseFile();
      setExportMessage(`Saved ${fileName} directly to your device Downloads folder!`);
      await loadStats();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const res = await notificationService.importDatabaseFromJson(content);
      setImportStatus(res);
      if (res.success) {
        onRefreshData();
        await loadStats();
      }
    };
    reader.readAsText(file);
    // reset input
    event.target.value = '';
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Reset all schedules and preferences to default initial values on your phone?')) {
      setIsResetting(true);
      try {
        await notificationService.resetDatabaseToDefaults();
        onRefreshData();
        await loadStats();
        alert('Phone database reset to default workout schedule.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Storage Mode Toggle */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Local Phone Database</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  {currentMode === 'local_only' ? '100% On-Device' : 'Cloud Synced'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Store all schedules, alarm sounds, and workout logs directly inside your phone's memory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
              title="Refresh Storage Usage"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stats</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <button
            onClick={() => handleToggleMode('local_only')}
            className={`flex flex-col text-left p-4 rounded-2xl border transition ${
              currentMode === 'local_only'
                ? 'bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${currentMode === 'local_only' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  <CloudOff className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white">Local Phone Storage Only</span>
                  <p className="text-[11px] text-emerald-400 font-semibold">Recommended for maximum privacy & offline use</p>
                </div>
              </div>
              {currentMode === 'local_only' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="mt-2.5 text-[11px] text-slate-400 leading-relaxed">
              Stores 100% of data in your device's IndexedDB. Zero cloud uploads, zero external database requirements. Operates entirely without internet.
            </p>
          </button>

          <button
            onClick={() => handleToggleMode('cloud_synced')}
            className={`flex flex-col text-left p-4 rounded-2xl border transition ${
              currentMode === 'cloud_synced'
                ? 'bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${currentMode === 'cloud_synced' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white">Cloud Synced Mode</span>
                  <p className="text-[11px] text-cyan-400 font-semibold">Supabase & Multi-Device Sync</p>
                </div>
              </div>
              {currentMode === 'cloud_synced' && <Check className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="mt-2.5 text-[11px] text-slate-400 leading-relaxed">
              Maintains local device cache while syncing schedule changes across multiple phones, laptops, and remote Web Push servers.
            </p>
          </button>
        </div>

        {/* Live Phone Storage Metric Card */}
        {stats && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-300">Device Storage Footprint:</span>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-emerald-400 font-bold">{stats.usageFormatted} Used</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{stats.quotaFormatted} Available</span>
              </div>
            </div>

            {/* Storage Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(stats.percentUsed, 2)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">Workouts & Reminders</span>
                <span className="text-sm font-bold text-white">{stats.reminderCount} items</span>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">History & Logs</span>
                <span className="text-sm font-bold text-white">{stats.logCount} logged</span>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">OS Storage Lock</span>
                <span className={`text-xs font-bold ${stats.isPersisted ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stats.isPersisted ? '✓ Protected' : 'Standard'}
                </span>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">Last Device Backup</span>
                <span className="text-xs font-bold text-cyan-300">
                  {stats.lastBackupDate ? new Date(stats.lastBackupDate).toLocaleDateString() : 'None Yet'}
                </span>
              </div>
            </div>

            {!stats.isPersisted && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Protect from phone cache cleaning under low disk space:</span>
                </div>
                <button
                  onClick={handleRequestPersistence}
                  disabled={isPersisting}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
                >
                  {isPersisting ? 'Requesting...' : 'Lock Storage in Phone'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export / Download / Restore Database Actions */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <FolderDown className="w-5 h-5 text-cyan-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Download & Backup Phone Data</h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Download your complete schedule, workout alarm profiles, custom sounds, and completion history as a standalone file directly into your phone’s storage folder.
        </p>

        {exportMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{exportMessage}</span>
          </div>
        )}

        {importStatus && (
          <div
            className={`flex items-center gap-2 rounded-2xl p-3.5 text-xs animate-in fade-in border ${
              importStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {importStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Export / Download Button */}
          <button
            onClick={handleDownloadBackup}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 p-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Download Database (.json)'}</span>
          </button>

          {/* Import / Restore Button */}
          <label className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-3.5 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer active:scale-95 transition text-center">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Restore from Phone File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Reset Database */}
          <button
            onClick={handleResetToDefaults}
            disabled={isResetting}
            className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs font-bold text-rose-300 hover:bg-rose-900/30 transition disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Schedule Defaults</span>
          </button>
        </div>
      </div>

      {/* Standalone Mobile App & Android Package (.apk / .exe alternative) */}
      <div className="rounded-3xl border border-indigo-500/30 bg-indigo-950/20 p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-indigo-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Download Standalone Mobile App Package (.apk &amp; Offline App)
            </h4>
          </div>

          {onOpenAppInstaller && (
            <button
              onClick={onOpenAppInstaller}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-indigo-400 transition"
            >
              <span>Open Installer Guide</span>
            </button>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Need an actual installer file downloaded to your phone (like an <strong className="text-white">.exe</strong> or <strong className="text-emerald-400 font-mono">.apk</strong>)?
          Smartphones run <strong className="text-emerald-400 font-mono">.apk</strong> instead of Windows <strong className="text-slate-400 font-mono">.exe</strong>.
          You can download a standalone offline application file or the Android APK package specification directly below:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              AppPackageGenerator.downloadStandaloneOfflineApp();
              setExportMessage('Downloaded FitBudget-Offline-App.html directly to your device!');
            }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-purple-500/40 bg-purple-950/30 p-3.5 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition active:scale-95 text-center"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Download Offline Single-File App (.html)</span>
          </button>

          <button
            onClick={() => {
              AppPackageGenerator.downloadAndroidPackageFiles();
              setExportMessage('Downloaded FitBudget-Android-APK-Guide.md!');
            }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition active:scale-95 text-center"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Download Android .APK Build Guide</span>
          </button>
        </div>
      </div>

      {/* Guide: How to Download / Install FitBudget on Your Phone */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">How to Download FitBudget on Your Phone</h4>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setActiveGuideTab('android')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeGuideTab === 'android' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Android Phone
            </button>
            <button
              onClick={() => setActiveGuideTab('ios')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeGuideTab === 'ios' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              iPhone / iPad
            </button>
            <button
              onClick={() => setActiveGuideTab('backup')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeGuideTab === 'backup' ? 'bg-purple-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Saving Data Files
            </button>
          </div>
        </div>

        {/* Tab 1: Android */}
        {activeGuideTab === 'android' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <span className="flex h-6 w-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs items-center justify-center flex-shrink-0">
                1
              </span>
              <div>
                <strong className="text-white text-xs block">Open in Google Chrome or Edge on your Android phone</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Navigate to your FitBudget app URL in Chrome.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <span className="flex h-6 w-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs items-center justify-center flex-shrink-0">
                2
              </span>
              <div>
                <strong className="text-white text-xs block">Tap the "Install App" button or Chrome menu (⋮)</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap the green <strong>"Install App"</strong> button at the top header, OR tap the three vertical dots (⋮) in the top-right corner of Chrome and select <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <span className="flex h-6 w-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs items-center justify-center flex-shrink-0">
                3
              </span>
              <div>
                <strong className="text-white text-xs block">Tap "Install" to download to your home screen</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The FitBudget icon will appear alongside your other native apps on your phone. It launches with zero browser URL bar, supports full-screen high-priority alarms, and works 100% offline using your local phone database!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: iPhone / iPad */}
        {activeGuideTab === 'ios' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <span className="flex h-6 w-6 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs items-center justify-center flex-shrink-0">
                1
              </span>
              <div>
                <strong className="text-white text-xs block">Open FitBudget in Safari on your iPhone</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Apple WebKit requires Safari to install Progressive Web Apps and grant notification permissions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <span className="flex h-6 w-6 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs items-center justify-center flex-shrink-0">
                2
              </span>
              <div>
                <strong className="text-white text-xs block">Tap the Share icon at the bottom toolbar</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap the box with an upward-pointing arrow in the bottom center bar of Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <span className="flex h-6 w-6 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs items-center justify-center flex-shrink-0">
                3
              </span>
              <div>
                <strong className="text-white text-xs block">Tap "Add to Home Screen"</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scroll down the menu, tap <strong>"Add to Home Screen"</strong>, then tap <strong>"Add"</strong> in the top right. Launching from your home screen unlocks full-screen alerts and iOS Web Push!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Saving Data Files */}
        {activeGuideTab === 'backup' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <FileJson className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white text-xs block">Where is my downloaded database file located?</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  On Android, the <code className="text-emerald-400">fitbudget-phone-backup.json</code> file saves to your <strong>Files &gt; Downloads</strong> folder. On iPhone, it saves to your <strong>Files &gt; Downloads</strong> or iCloud Drive.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white text-xs block">Transferring to another phone or computer</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You can send this JSON file via AirDrop, Bluetooth, or messaging to your new phone, then tap <strong>"Restore from Phone File"</strong> above to instantly load your exact workout routine.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
