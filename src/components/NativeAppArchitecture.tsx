import React, { useState } from 'react';
import {
  Smartphone,
  Layers,
  Code2,
  FileCode,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Terminal
} from 'lucide-react';

export const NativeAppArchitecture: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);

  const capacitorConfigCode = `// capacitor.config.ts - FitBudget Native App Bridge
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.fitbudget.mobile',
  appName: 'FitBudget',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#10b981',
      sound: 'pulse_energy.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;`;

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Native Mobile Application Architecture</h3>
            <p className="text-xs text-slate-400">
              Clean service abstraction ready for immediate Capacitor packaging to Android APK and iOS IPA.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The notification layer in FitBudget has been cleanly isolated into <code className="text-emerald-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">notificationService.ts</code> and <code className="text-cyan-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">soundEngine.ts</code>.
          When packaged with Capacitor, the same methods map 1:1 to <code className="text-amber-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">@capacitor/local-notifications</code> and native Android AlarmManager / NotificationChannels.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Android Native Features */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>Android Capabilities</span>
          </div>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Notification Channels:</strong> Configured with <code className="text-emerald-300 font-mono text-[10px]">IMPORTANCE_HIGH</code> for pop-on-screen banners.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Direct Clock Intent:</strong> Uses <code className="text-emerald-300 font-mono text-[10px]">android.intent.action.SET_ALARM</code> to configure the phone's native Clock app.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Hardware Vibration:</strong> Custom vibration cadence <code className="text-emerald-300 font-mono text-[10px]">[400, 200, 400, 200, 600]</code>.</span>
            </li>
          </ul>
        </div>

        {/* iOS Native Features */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>iOS Capabilities</span>
          </div>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span><strong>Web Push on Home Screen:</strong> iOS 16.4+ supports real background push when added to Home Screen.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span><strong>Apple Calendar .ics Bridge:</strong> Generates calendar alarm files with high-priority audio triggers.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span><strong>Focus Mode Respect:</strong> Complies with user Focus Modes, avoiding non-consensual sound intrusions.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Capacitor Config Code Sample */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-mono">capacitor.config.ts</span>
          <button
            onClick={() => copyCode(capacitorConfigCode)}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Config'}</span>
          </button>
        </div>
        <pre className="text-[11px] font-mono text-emerald-300/90 overflow-x-auto p-2 bg-slate-900/80 rounded-xl border border-slate-800">
          {capacitorConfigCode}
        </pre>
      </div>
    </div>
  );
};
