import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Apple, HardDrive, Share2, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{
  onOpenPhoneDatabase?: () => void;
  onOpenAppInstaller?: () => void;
}> = ({ onOpenPhoneDatabase, onOpenAppInstaller }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<'android' | 'ios' | 'data'>('android');

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else {
      setGuidePlatform(isIOS ? 'ios' : 'android');
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isInstalled ? (
          <button
            onClick={() => {
              setGuidePlatform('data');
              setShowGuide(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/60 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Installed App</span>
            <span className="sm:hidden">Installed</span>
          </button>
        ) : (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Install on Phone</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}

        <button
          onClick={() => {
            if (onOpenAppInstaller) {
              onOpenAppInstaller();
            } else {
              setGuidePlatform(isIOS ? 'ios' : 'android');
              setShowGuide(true);
            }
          }}
          className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
          title="Phone Download & .apk / .exe Installer Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">How to Download FitBudget on Your Phone</h3>
                  <p className="text-xs text-slate-400">100% Offline-Ready with Local Phone Storage</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector */}
            <div className="flex rounded-2xl bg-slate-950 p-1.5 border border-slate-800 my-4 gap-1">
              <button
                onClick={() => setGuidePlatform('android')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  guidePlatform === 'android' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                onClick={() => setGuidePlatform('ios')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  guidePlatform === 'ios' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                onClick={() => setGuidePlatform('data')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  guidePlatform === 'data' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Download Data</span>
              </button>
            </div>

            {/* Guide Content */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {guidePlatform === 'android' && (
                <>
                  {isInstallable && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                      <div>
                        <strong className="block text-white text-xs">1-Tap Direct Install Ready!</strong>
                        <span className="text-[11px] text-emerald-400">Your browser supports instant installation.</span>
                      </div>
                      <button
                        onClick={() => {
                          install();
                          setShowGuide(false);
                        }}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:bg-emerald-400 transition"
                      >
                        Install Now
                      </button>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Open this link in Chrome or Edge</strong>
                      <p className="text-slate-400 mt-0.5">
                        Open FitBudget in Google Chrome on your Samsung, Google Pixel, Xiaomi, or Android device.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">Tap the 3 dots (⋮) in Chrome</strong>
                      <p className="text-slate-400 mt-0.5">
                        In the top-right corner of Chrome, tap the three dots icon to open the menu.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Select "Install app" (or "Add to Home screen")</strong>
                      <p className="text-slate-400 mt-0.5">
                        Confirm <strong>"Install"</strong>. The FitBudget app icon will be downloaded to your home screen!
                      </p>
                    </div>
                  </div>
                </>
              )}

              {guidePlatform === 'ios' && (
                <>
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Open in Safari</strong>
                      <p className="text-slate-400 mt-0.5">
                        Make sure you are in Safari on your iPhone or iPad. (Apple WebKit only allows PWA installation via Safari).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">Tap the Share button</strong>
                      <p className="text-slate-400 mt-0.5">
                        Tap the Share icon (square with arrow pointing up) in the bottom center toolbar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Tap "Add to Home Screen" & "Add"</strong>
                      <p className="text-slate-400 mt-0.5">
                        Scroll down and tap <strong>"Add to Home Screen"</strong>, then tap <strong>"Add"</strong> in the top-right corner.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {guidePlatform === 'data' && (
                <>
                  <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-purple-300">
                    <strong className="text-white block text-xs">Download Local Phone Database File (.json)</strong>
                    <p className="text-[11px] text-slate-300 mt-1">
                      You can download your entire workout database to keep an offline backup file right on your phone.
                    </p>
                    <button
                      onClick={() => {
                        setShowGuide(false);
                        if (onOpenPhoneDatabase) {
                          onOpenPhoneDatabase();
                        }
                      }}
                      className="mt-3 w-full rounded-xl bg-purple-500 py-2 text-xs font-bold text-slate-950 hover:bg-purple-400 transition"
                    >
                      Open Phone Database & Backup
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-400 text-[11px] space-y-1.5">
                    <p>• <strong>Offline Guarantee:</strong> Once installed on your phone, FitBudget loads all schedules instantly without needing internet.</p>
                    <p>• <strong>Phone Privacy:</strong> Local Phone Mode ensures zero personal health schedules leave your device.</p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                PWA Standalone App • Service Worker Ready
              </span>
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
