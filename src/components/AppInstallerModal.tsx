import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  FileCode,
  HardDrive,
  Laptop,
  Apple,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Package,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppPackageGenerator } from '../services/appPackageGenerator';

interface AppInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPhoneDb?: () => void;
}

export const AppInstallerModal: React.FC<AppInstallerModalProps> = ({
  isOpen,
  onClose,
  onOpenPhoneDb,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'offline_file' | 'windows' | 'ios'>('android');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadOfflineFile = () => {
    AppPackageGenerator.downloadStandaloneOfflineApp();
    setDownloadSuccess('FitBudget-Offline-App.html downloaded directly to your device!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleDownloadApkGuide = () => {
    AppPackageGenerator.downloadAndroidPackageFiles();
    setDownloadSuccess('FitBudget-Android-APK-Guide.md downloaded!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Download FitBudget to Phone</h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  .apk & WebAPK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Understanding .exe vs .apk and installing directly to your phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Callout: .exe vs .apk */}
        <div className="my-4 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-300 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-white block font-semibold">Why Phones Don't Use .exe:</strong>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-indigo-300">.exe</strong> files are executable programs built exclusively for <strong className="text-white">Windows PC</strong>.
              Smartphones run on Android or iOS. On Android phones, the equivalent installer is called <strong className="text-emerald-400 font-mono">.apk</strong> (or <strong className="text-emerald-400 font-mono">WebAPK</strong>).
            </p>
          </div>
        </div>

        {/* Tab Selectors */}
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-950 p-1.5 border border-slate-800 mb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('android')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'android' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="truncate">Android (.apk)</span>
          </button>

          <button
            onClick={() => setActiveTab('offline_file')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'offline_file' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="truncate">Offline File</span>
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'windows' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="truncate">Windows (.exe)</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'ios' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span className="truncate">iPhone (iOS)</span>
          </button>
        </div>

        {downloadSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Tab 1: Android (.apk & WebAPK) */}
        {activeTab === 'android' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Method 1: Direct Android WebAPK Install</h4>
                  <p className="text-[11px] text-emerald-400">Installs directly into Android Settings &gt; Apps</p>
                </div>
                {isInstallable && (
                  <button
                    onClick={install}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install on Phone</span>
                  </button>
                )}
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed">
                When you tap <strong>"Install on Phone"</strong> on Android Chrome, Google's Android minting service automatically compiles a native <strong>WebAPK package</strong> and installs it directly onto your phone.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                  <strong className="text-white block">✓ Phone App Icon</strong>
                  <span className="text-slate-400">Appears on Home Screen & App Drawer</span>
                </div>
                <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                  <strong className="text-white block">✓ 100% Offline</strong>
                  <span className="text-slate-400">Runs locally from phone database</span>
                </div>
                <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                  <strong className="text-white block">✓ Full-Screen</strong>
                  <span className="text-slate-400">Zero browser search bar or URL</span>
                </div>
              </div>
            </div>

            {/* Sideload APK Builder Option */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Method 2: Standalone .APK File Sideload</h4>
                  <p className="text-[11px] text-slate-400">Build an unsigned or signed .apk using Bubblewrap or Capacitor</p>
                </div>
                <button
                  onClick={handleDownloadApkGuide}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download APK Guide (.md)</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
                <p className="text-slate-500"># 1-command APK generator using Google Bubblewrap:</p>
                <p>npx @bubblewrap/cli build</p>
                <p className="text-slate-500"># Outputs: app-release-signed.apk</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Standalone Offline File */}
        {activeTab === 'offline_file' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Download Standalone Offline App File</h4>
                  <p className="text-[11px] text-purple-400">Single self-contained file saved into phone storage</p>
                </div>
                <button
                  onClick={handleDownloadOfflineFile}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-purple-400 active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File (.html)</span>
                </button>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed">
                If you want a physical file downloaded to your phone like a document or program, this generates <code className="text-purple-300 font-mono">FitBudget-Offline-App.html</code>.
                You can save it to your phone's <strong>Downloads</strong> folder and tap it anytime to open a complete offline workout timer and alarm with synthesized audio and local device storage.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Also Available: Local Database Backup (.json)</h4>
              <p className="text-[11px] text-slate-400">
                You can also download your exact personalized schedules, audio presets, and workout logs as a raw JSON database file.
              </p>
              {onOpenPhoneDb && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPhoneDb();
                  }}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold pt-1"
                >
                  <span>Open Local Phone Database Manager</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Windows (.exe) */}
        {activeTab === 'windows' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
              <h4 className="text-sm font-bold text-white">How to Install FitBudget on Windows PC (.exe)</h4>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                If you are on a Windows PC or laptop and want FitBudget as an actual desktop executable program:
              </p>

              <div className="space-y-2.5 text-[11px] text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">1</span>
                  <p>Open FitBudget in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on your Windows computer.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">2</span>
                  <p>In the browser address bar on the right, click the <strong>Install FitBudget</strong> computer icon (or Menu &gt; Install FitBudget).</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">3</span>
                  <p>Windows automatically creates an executable desktop application shortcut on your Desktop and Start Menu!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: iPhone (iOS) */}
        {activeTab === 'ios' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
              <h4 className="text-sm font-bold text-white">How to Install on iPhone / iPad (iOS)</h4>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Apple does not allow downloading executable installer files (.exe or .apk) onto iOS devices due to security sandboxing. The official installation method is:
              </p>

              <div className="space-y-2.5 text-[11px] text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">1</span>
                  <p>Open FitBudget in <strong>Safari</strong> on your iPhone.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">2</span>
                  <p>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom toolbar.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">3</span>
                  <p>Tap <strong>"Add to Home Screen"</strong> &gt; <strong>"Add"</strong>. FitBudget installs as a standalone iOS app with full Web Push & local database storage!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            FitBudget Mobile Installer Engine
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
