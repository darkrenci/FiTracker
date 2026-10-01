import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Coffee,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Heart,
  Brain,
  Bed,
  Footprints,
  Activity,
  ArrowRight,
  ShieldCheck,
  Droplets
} from 'lucide-react';
import { SleepRecoveryProfile, WorkScheduleConfig } from '../types/workSchedule';
import { ReminderItem } from '../types/notifications';
import { WorkdayRecommendationEngine } from '../services/workdayRecommendationEngine';
import { notificationService } from '../services/notificationService';
import { formatTime12h } from '../services/smartSuggestionEngine';

interface SleepRecoveryOptimizerProps {
  workConfig: WorkScheduleConfig;
  onUpdateWorkConfig: (config: WorkScheduleConfig) => void;
  onApplyAdaptedSchedule: (newReminders: ReminderItem[]) => void;
}

export const SleepRecoveryOptimizer: React.FC<SleepRecoveryOptimizerProps> = ({
  workConfig,
  onUpdateWorkConfig,
  onApplyAdaptedSchedule,
}) => {
  const currentSleep = workConfig.sleepRecovery || {
    targetBedtime: '23:30',
    actualSleptAt: '00:00',
    isLateSleepMode: true,
    wakeUpTime: '06:45',
    morningRoutineType: 'gentle_circadian_walk',
    includePowerNapOrNSDR: true,
    napTime: '12:45',
    recoveryBedtime: '22:30',
    delayCaffeineMinutes: 90,
    hydrationElectrolytesBoost: true,
  };

  const [selectedBedtime, setSelectedBedtime] = useState<string>(currentSleep.actualSleptAt || '00:00');
  const [wakeUpTime, setWakeUpTime] = useState<string>(currentSleep.wakeUpTime || '06:45');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Calculate sleep duration
  const calculateSleepDuration = (bedtimeStr: string, wakeStr: string) => {
    const [bh, bm] = bedtimeStr.split(':').map(Number);
    const [wh, wm] = wakeStr.split(':').map(Number);

    let bedMins = bh * 60 + bm;
    let wakeMins = wh * 60 + wm;

    if (wakeMins <= bedMins) {
      wakeMins += 24 * 60; // next morning
    }

    const diffMins = wakeMins - bedMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const totalHoursFloat = Number((diffMins / 60).toFixed(1));

    return { hours, mins, totalHoursFloat };
  };

  const sleepStats = calculateSleepDuration(selectedBedtime, wakeUpTime);
  const isLate = ['00:00', '00:30', '01:00', '01:30', '02:00'].includes(selectedBedtime) || sleepStats.totalHoursFloat < 7;

  const handleSelectBedtime = (time: string) => {
    setSelectedBedtime(time);
    const isLateMode = ['00:00', '00:30', '01:00', '01:30', '02:00'].includes(time);
    const updated: SleepRecoveryProfile = {
      ...currentSleep,
      actualSleptAt: time,
      isLateSleepMode: isLateMode,
      wakeUpTime,
    };

    onUpdateWorkConfig({
      ...workConfig,
      sleepRecovery: updated,
    });
  };

  const handleApplySleepAdaptedRoutines = async () => {
    setIsApplying(true);
    const updatedConfig = {
      ...workConfig,
      sleepRecovery: {
        ...currentSleep,
        actualSleptAt: selectedBedtime,
        isLateSleepMode: isLate,
        wakeUpTime,
      },
    };

    onUpdateWorkConfig(updatedConfig);

    // Generate sleep adapted recommendations
    const recs = WorkdayRecommendationEngine.generateWorkdayPlan(updatedConfig);
    const reminders = WorkdayRecommendationEngine.convertToReminderItems(recs);

    for (const rem of reminders) {
      await notificationService.scheduleReminder(rem);
    }

    onApplyAdaptedSchedule(reminders);
    setIsApplying(false);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 4500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Bedtime Selector */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Late Sleep & Next-Day Health Adaptation</h3>
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  Adaptive Circadian AI
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Sleeping at 12 AM or 1 AM? FitBudget intelligently modifies tomorrow’s workouts, hydration, and nap timing so your body stays energized and protected.
              </p>
            </div>
          </div>

          <button
            onClick={handleApplySleepAdaptedRoutines}
            disabled={isApplying}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Apply Adapted Schedule for Tomorrow</span>
          </button>
        </div>

        {appliedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Success! Adapted schedule and alarms generated for late sleep ({selectedBedtime}). Wake up walk and restorative nap scheduled!</span>
          </div>
        )}

        {/* Bedtime Quick Choice Pills */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            What time will you sleep (or did you sleep)?
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { time: '23:00', label: '11:00 PM', desc: 'Optimal 8h recovery', icon: '😴' },
              { time: '00:00', label: '12:00 AM', desc: 'Moderate sleep debt', icon: '🌙' },
              { time: '01:00', label: '1:00 AM', desc: 'Late night study/work', icon: '🦉' },
              { time: '02:00', label: '2:00 AM', desc: 'Severe sleep delay', icon: '⚡' },
            ].map((preset) => {
              const isSelected = selectedBedtime === preset.time;
              return (
                <button
                  key={preset.time}
                  onClick={() => handleSelectBedtime(preset.time)}
                  className={`p-3 rounded-2xl text-left border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-400 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400/50'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{preset.icon}</span>
                    <span className="text-xs font-mono font-bold text-white">{preset.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">{preset.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Time Picker Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                Custom Bedtime:
              </label>
              <input
                type="time"
                value={selectedBedtime}
                onChange={(e) => handleSelectBedtime(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-mono font-bold focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                Expected Wake-Up Time:
              </label>
              <input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-mono font-bold focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Calculation Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-300">
                Calculated Sleep: <strong className="text-white font-mono">{sleepStats.hours}h {sleepStats.mins}m</strong>
              </span>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                sleepStats.totalHoursFloat >= 7.5
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : sleepStats.totalHoursFloat >= 6
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              {sleepStats.totalHoursFloat >= 7.5 ? 'Full Recovery' : sleepStats.totalHoursFloat >= 6 ? 'Late Sleep Mode (Mild Debt)' : 'High Sleep Debt (Protective Mode)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ADAPTIVE "WHAT SHOULD I DO TOMORROW" HEALTH PROTOCOL */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                What To Do Tomorrow When Sleeping at {formatTime12h(selectedBedtime)}
              </h4>
              <p className="text-[11px] text-slate-400">
                Scientific adjustments to protect your cardiovascular health and brain stamina
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-full">
            5 Adaptive Habits
          </span>
        </div>

        {/* The 5 Adaptive Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Step 1: Gentle Morning Sunlight Walk */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">
                🌅 6:45 AM (or Upon Waking)
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Cardio Adaptation
              </span>
            </div>
            <h5 className="text-xs font-bold text-white">
              Gentle Circadian Sunlight Walk (NOT Punishing High-Intensity Cardio)
            </h5>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              When sleeping at 12 AM/1 AM, your resting heart rate is elevated. Heavy morning HIIT or fast sprint runs will spike cardiac strain and cortisol, causing an afternoon crash.
            </p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <strong className="text-emerald-400 block mb-0.5">Health Benefit:</strong>
              15-20 min outdoor walk hits retinal ganglion cells with natural sunlight, halting melatonin production and setting your cortisol rhythm safely.
            </div>
          </div>

          {/* Step 2: Delayed Caffeine & Vasopressin Hydration */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">
                💧 7:00 AM & 8:30 AM
              </span>
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                Energy Optimization
              </span>
            </div>
            <h5 className="text-xs font-bold text-white">
              Rapid Rehydration & Delay Coffee by 90 Minutes
            </h5>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Late sleep suppresses anti-diuretic hormone (vasopressin), creating dehydration. Drink 500ml water with a pinch of sea salt upon waking.
            </p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <strong className="text-cyan-400 block mb-0.5">Health Benefit:</strong>
              Delaying coffee until 8:30 AM allows natural adenosine clearance so you avoid the brutal 2:00 PM exhaustion slump!
            </div>
          </div>

          {/* Step 3: 15-Minute Afternoon NSDR / Power Nap */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400">
                🧘 12:45 PM – 1:05 PM
              </span>
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
                Cognitive Recovery
              </span>
            </div>
            <h5 className="text-xs font-bold text-white">
              15-Minute Non-Sleep Deep Rest (NSDR / Power Nap)
            </h5>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Take 15-20 minutes after lunch in a quiet room or desk with eyes closed doing slow diaphragmatic box breathing.
            </p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <strong className="text-purple-400 block mb-0.5">Health Benefit:</strong>
              Stanford neuroscience reveals that 15-20 mins of NSDR resets striatal dopamine and prefrontal focus as effectively as 90 mins of nighttime sleep.
            </div>
          </div>

          {/* Step 4: Shift Primary Workout to Late Afternoon / Evening */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">
                🏃 5:30 PM (Post-Work / Post-Classes)
              </span>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Safe Workout Window
              </span>
            </div>
            <h5 className="text-xs font-bold text-white">
              Late Afternoon Moderate Workout & Run
            </h5>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              By late afternoon, core body temperature and joint lubrication reach their daily peak, making workouts 25% safer than early morning after late sleep.
            </p>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <strong className="text-amber-400 block mb-0.5">Health Benefit:</strong>
              35-minute aerobic zone 2 jog or strength session flushes accumulated stress hormones and physically primes your body to sleep early tonight.
            </div>
          </div>

          {/* Step 5: Early Catch-Up Recovery Bedtime */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400">
                🌙 10:30 PM Tonight
              </span>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Debt Elimination
              </span>
            </div>
            <h5 className="text-xs font-bold text-white">
              10:30 PM Catch-Up Sleep Alarm (Pay Back Sleep Debt)
            </h5>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Don’t repeat the late night cycle! FitBudget triggers an alarm at 10:30 PM so you can initiate slow-wave deep sleep before midnight.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              <strong className="text-indigo-400 block mb-0.5">Health Benefit:</strong>
              Slow-wave sleep (NREM 3) predominantly occurs before 2:00 AM. Sleeping by 10:30 PM ensures full hormonal reset and cellular repair.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
