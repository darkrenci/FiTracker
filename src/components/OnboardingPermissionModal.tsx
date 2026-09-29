import React, { useState } from 'react';
import {
  Bell,
  ShieldCheck,
  Dumbbell,
  Footprints,
  Flame,
  Utensils,
  Droplets,
  Moon,
  Sparkles,
  BarChart3,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { ReminderCategory, UserPreferences } from '../types/notifications';

interface OnboardingPermissionModalProps {
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onComplete: () => void;
}

export const OnboardingPermissionModal: React.FC<OnboardingPermissionModalProps> = ({
  preferences,
  onUpdatePreferences,
  onComplete,
}) => {
  const [categories, setCategories] = useState<Record<ReminderCategory, boolean>>(preferences.categories);
  const [requesting, setRequesting] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    notificationService.getPermissionStatus()
  );
  const [errorMessage, setErrorMessage] = useState('');

  const toggleCategory = (cat: ReminderCategory) => {
    setCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleRequestPermission = async () => {
    setRequesting(true);
    setErrorMessage('');
    try {
      const res = await notificationService.requestPermission();
      setPermissionState(res);
      onUpdatePreferences({ categories });
      if (res === 'granted') {
        onComplete();
      } else if (res === 'denied') {
        setErrorMessage('Notification permission was blocked in browser settings. You can still test in-app alarms.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting notification permission.');
    } finally {
      setRequesting(false);
    }
  };

  const categoryItems: Array<{
    id: ReminderCategory;
    title: string;
    desc: string;
    icon: any;
    color: string;
  }> = [
    {
      id: 'workout',
      title: 'Workout Reminders',
      desc: 'High-priority strength & resistance sessions',
      icon: Dumbbell,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'walking',
      title: 'Walking Reminders',
      desc: 'Evening night walks and endurance walking routines',
      icon: Footprints,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'running',
      title: 'Running Reminders',
      desc: 'Morning cardio runs and pace interval sessions',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'meal',
      title: 'Meal Reminders',
      desc: 'Breakfast, lunch, afternoon snack, and dinner',
      icon: Utensils,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    },
    {
      id: 'hydration',
      title: 'Hydration Reminders',
      desc: 'Flexible water intake prompts during active hours',
      icon: Droplets,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      id: 'sleep',
      title: 'Sleep Reminders',
      desc: 'Bedtime prompts, wind-down notice & morning checks',
      icon: Moon,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    },
    {
      id: 'recovery',
      title: 'Recovery Reminders',
      desc: 'Restorative mobility, stretching, and foam rolling',
      icon: Sparkles,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    },
    {
      id: 'summary',
      title: 'Weekly Fitness Summaries',
      desc: 'Weekly milestone recap and progress reports',
      icon: BarChart3,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100">
        
        {/* Badge & Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Smart Notifications & Alarms</h2>
            <p className="text-xs text-slate-400">Why FitBudget notifications are essential</p>
          </div>
        </div>

        {/* Value Proposition Note */}
        <div className="mt-5 rounded-2xl bg-slate-950/60 border border-slate-800 p-4 text-xs text-slate-300 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Honest, OS-Compliant Permission Architecture</span>
          </div>
          <p>
            FitBudget uses official browser and operating system APIs (Web Push, Service Workers, Audio Synthesizer, and Android/iOS calendar alarm integration).
            We never send unsolicited spam. All notifications are strictly tied to your personal fitness schedule.
          </p>
          <div className="text-[11px] text-slate-400">
            Current Browser Permission Status: <strong className="uppercase font-mono text-cyan-400">{permissionState}</strong>
          </div>
        </div>

        {/* 8 Granular Categories List (Section 11.2) */}
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Notification Categories to Enable:
          </label>

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categoryItems.map((cat) => {
              const Icon = cat.icon;
              const isChecked = categories[cat.id];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                    isChecked
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-950/40 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${cat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{cat.title}</span>
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${isChecked ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700'}`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={requesting}
            onClick={handleRequestPermission}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3.5 px-4 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{requesting ? 'Requesting OS Permission...' : 'Allow FitBudget Notifications'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onUpdatePreferences({ categories });
              onComplete();
            }}
            className="rounded-2xl border border-slate-700 bg-slate-800/80 py-3 px-4 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Configure Later
          </button>
        </div>
      </div>
    </div>
  );
};
