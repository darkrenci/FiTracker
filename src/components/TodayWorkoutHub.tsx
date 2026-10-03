import React, { useState, useEffect } from 'react';
import {
  Play,
  Check,
  Clock,
  Calendar,
  Volume2,
  RotateCcw,
  FastForward,
  Sparkles,
  Award,
  ChevronRight,
  Layers,
  ArrowRight,
  Moon,
  Sun,
  Coffee,
  Heart,
  Droplets,
  Plus,
  Minus,
  Sliders,
  Bell,
  Footprints,
  Compass
} from 'lucide-react';
import { ReminderItem, UserPreferences } from '../types/notifications';
import { WorkScheduleConfig, WorkDayShift, WorkdayHabitRecommendation } from '../types/workSchedule';
import { formatTime12h } from '../services/smartSuggestionEngine';
import { WorkdayRecommendationEngine } from '../services/workdayRecommendationEngine';
import { notificationService } from '../services/notificationService';
import { soundEngine } from '../services/soundEngine';
import {
  ScheduleAdaptationService,
  LateWorkoutStatus
} from '../services/scheduleAdaptationService';
import { LateWorkoutAdjustmentModal } from './LateWorkoutAdjustmentModal';

interface TodayWorkoutHubProps {
  reminders: ReminderItem[];
  workConfig: WorkScheduleConfig;
  preferences: UserPreferences;
  userName?: string;
  onStartWorkout: (reminder: ReminderItem) => void;
  onTriggerAlarm: (reminder: ReminderItem) => void;
  onSkipToday: (reminder: ReminderItem) => void;
  onCompleteReminder: (reminderId: string) => void;
  onOpenScheduleManager: () => void;
  onOpenWorkSchedule: () => void;
  onOpenMenu: () => void;
  onOpenRecommendations: () => void;
  onUpdateWorkConfig: (config: WorkScheduleConfig) => void;
  onUpdateReminders?: (reminders: ReminderItem[]) => void;
  onShowBanner?: (message: string, type?: 'success' | 'info' | 'warn') => void;
}

export const TodayWorkoutHub: React.FC<TodayWorkoutHubProps> = ({
  reminders,
  workConfig,
  preferences,
  userName = 'Friend',
  onStartWorkout,
  onTriggerAlarm,
  onSkipToday,
  onCompleteReminder,
  onOpenScheduleManager,
  onOpenWorkSchedule,
  onOpenMenu,
  onOpenRecommendations,
  onUpdateWorkConfig,
  onUpdateReminders,
  onShowBanner,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDayIdx, setCurrentDayIdx] = useState<number>(new Date().getDay());
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fitbudget_water_glasses');
      return saved ? parseInt(saved, 10) : 4;
    } catch {
      return 4;
    }
  });

  const [lateSleepTime, setLateSleepTime] = useState<string>(
    workConfig.sleepRecovery?.actualSleptAt || '00:00'
  );
  const [appliedSleepNotice, setAppliedSleepNotice] = useState<string | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDayIdx(now.getDay());
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const DAYS_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = DAYS_NAMES[currentDayIdx];

  // Reminders scheduled for today
  const todayReminders = reminders
    .filter((r) => r.enabled && r.daysOfWeek.includes(currentDayIdx))
    .sort((a, b) => a.time.localeCompare(b.time));

  // Determine current clock minutes
  const nowMins = (() => {
    const [h, m] = (currentTimeStr || '12:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  })();

  // Track late status
  const lateStatus: LateWorkoutStatus = ScheduleAdaptationService.detectLateStatus(
    reminders,
    currentDayIdx,
    nowMins
  );

  // Find next upcoming uncompleted reminder
  let nextUpReminder: ReminderItem | null = null;
  let nextDiffMins = Infinity;

  if (lateStatus.hasLateWorkout && lateStatus.overdueWorkout) {
    nextUpReminder = lateStatus.overdueWorkout;
    nextDiffMins = -lateStatus.overdueMinutes;
  } else {
    for (const rem of todayReminders) {
      if (rem.completedToday || rem.skippedToday) continue;
      const [rh, rm] = rem.time.split(':').map(Number);
      const rMins = rh * 60 + rm;
      const diff = rMins - nowMins;

      if (diff >= -30 && diff < nextDiffMins) {
        nextDiffMins = diff;
        nextUpReminder = rem;
      }
    }

    if (!nextUpReminder) {
      nextUpReminder = todayReminders.find((r) => !r.completedToday && !r.skippedToday) || null;
    }
  }

  // Count progress stats
  const completedCount = todayReminders.filter((r) => r.completedToday).length;
  const totalCount = todayReminders.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Hydration handlers
  const handleUpdateWater = (delta: number) => {
    const updated = Math.max(0, Math.min(12, waterGlasses + delta));
    setWaterGlasses(updated);
    try {
      localStorage.setItem('fitbudget_water_glasses', updated.toString());
    } catch {}
    if (delta > 0) {
      soundEngine.playSound('water-drop', 0.8);
      if (onShowBanner) onShowBanner(`Logged glass #${updated} of water`, 'success');
    }
  };

  // Push back current workout by 15 mins
  const handleQuickDelay15 = async () => {
    if (!nextUpReminder) return;
    const subsequent = todayReminders.filter(
      (r) => r.id !== nextUpReminder?.id && !r.completedToday
    );
    const previews = ScheduleAdaptationService.previewShift(nextUpReminder, subsequent, 15);
    const updated = await ScheduleAdaptationService.applyShiftToReminders(reminders, previews);
    if (onUpdateReminders) onUpdateReminders(updated);
    if (onShowBanner) {
      onShowBanner('Schedule shifted back by 15 minutes', 'info');
    }
  };

  // Quick 10-Min Walk
  const handleQuick10MinWalk = () => {
    const quickWalkItem: ReminderItem = {
      id: `quick-walk-${Date.now()}`,
      title: '10-Minute Walk',
      category: 'walking',
      time: currentTimeStr || '12:00',
      daysOfWeek: [currentDayIdx],
      durationMinutes: 10,
      message: 'A brisk 10-minute walk to recharge your energy and clear your mind.',
      enabled: true,
      priority: 'high',
      soundPreset: 'pulse-energy',
      vibrate: true,
      repeatIntervalMinutes: 10,
      isAlarm: true,
      targetMetric: '10 min walk',
    };
    onStartWorkout(quickWalkItem);
  };

  // Late Bedtime Selection
  const handleApplyLateSleepTime = async (time: string) => {
    setLateSleepTime(time);
    const updatedConfig: WorkScheduleConfig = {
      ...workConfig,
      sleepRecovery: {
        targetBedtime: '23:30',
        actualSleptAt: time,
        isLateSleepMode: true,
        wakeUpTime: '06:45',
        morningRoutineType: 'gentle_circadian_walk',
        includePowerNapOrNSDR: true,
        napTime: '12:45',
        recoveryBedtime: '22:30',
        delayCaffeineMinutes: 90,
        hydrationElectrolytesBoost: true,
      },
    };

    onUpdateWorkConfig(updatedConfig);

    const recs = WorkdayRecommendationEngine.generateWorkdayPlan(updatedConfig);
    const adaptedReminders = WorkdayRecommendationEngine.convertToReminderItems(recs);

    for (const rem of adaptedReminders) {
      await notificationService.scheduleReminder(rem);
    }

    setAppliedSleepNotice(`Tomorrow adjusted for ${time} bedtime: +45m morning sleep & afternoon recharge`);
    setTimeout(() => setAppliedSleepNotice(null), 7000);
    if (onShowBanner) {
      onShowBanner(`Tomorrow adjusted for ${time} bedtime`, 'success');
    }
  };

  const isCurrentOverdue = lateStatus.hasLateWorkout && lateStatus.overdueWorkout?.id === nextUpReminder?.id;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* 1. EDITORIAL HEADER (Clean Typography, No Pill Clutter) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            {todayDayName} · Daily Plan
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 mt-1">
            Good day, {userName?.split(' ')[0] || 'Friend'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
            <span>{completedCount} of {totalCount} completed</span>
            <span aria-hidden="true">·</span>
            <span>{waterGlasses} of 8 glasses logged</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuick10MinWalk}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition shadow-xs cursor-pointer"
          >
            Start 10m Walk
          </button>
          <button
            onClick={onOpenMenu}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 transition shadow-xs cursor-pointer"
          >
            Options & Settings
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT ON DESKTOP, BALANCED & SPACIOUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN: HERO WORKOUT & TIMELINE (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PRIMARY WORKOUT CARD */}
          {nextUpReminder ? (
            <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              {/* Kicker & Time */}
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-medium tracking-wide uppercase">
                  {isCurrentOverdue ? 'Pending Start' : 'Up Next'}
                </span>
                <span className="font-medium text-stone-900">
                  {formatTime12h(nextUpReminder.time)} · {nextUpReminder.durationMinutes || 30} Minutes
                </span>
              </div>

              {/* Title & Notes */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 leading-tight">
                  {nextUpReminder.title}
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  {nextUpReminder.message}
                </p>
                {nextUpReminder.targetMetric && (
                  <div className="text-xs text-stone-500 mt-2">
                    Target: <strong className="text-stone-700 font-medium">{nextUpReminder.targetMetric}</strong>
                  </div>
                )}
              </div>

              {/* Overdue helper if late */}
              {isCurrentOverdue && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-stone-900 block">Behind your scheduled start?</span>
                    <span>Push upcoming alerts back so the rest of your day flows naturally.</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleQuickDelay15}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 transition cursor-pointer"
                    >
                      +15m Later
                    </button>
                    <button
                      onClick={() => setIsAdjustmentModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 transition cursor-pointer"
                    >
                      Adjust Day
                    </button>
                  </div>
                </div>
              )}

              {/* PRIMARY ACTION BUTTON */}
              <div>
                <button
                  onClick={() => onStartWorkout(nextUpReminder!)}
                  className="w-full py-4 rounded-2xl bg-[#1B4332] hover:bg-[#153427] active:scale-[0.99] text-white font-semibold text-base transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Workout</span>
                </button>
              </div>

              {/* SECONDARY TOOLBAR */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundEngine.playSound('zen-chime', 0.8);
                      onCompleteReminder(nextUpReminder!.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-stone-700 bg-stone-50 hover:bg-stone-100 font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-stone-600" />
                    <span>Mark Finished</span>
                  </button>

                  <button
                    onClick={() => onSkipToday(nextUpReminder!)}
                    className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-50 font-medium transition cursor-pointer"
                  >
                    Skip for Today
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAdjustmentModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-50 font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Reschedule</span>
                  </button>

                  <button
                    onClick={() => onTriggerAlarm(nextUpReminder!)}
                    className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-50 font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Test Chime</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Completed All For Today */
            <div className="rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#1B4332] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-stone-900">
                All routines finished for today
              </h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                You took time for your physical health and recovery. Rest well and enjoy your evening.
              </p>
              <div className="pt-2">
                <button
                  onClick={onOpenScheduleManager}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 transition"
                >
                  <span>Review Tomorrow's Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
                </button>
              </div>
            </div>
          )}

          {/* TODAY'S TIMELINE CHECKLIST */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h4 className="text-base font-semibold text-stone-900">Today's Schedule</h4>
                <p className="text-xs text-stone-500">Tap to mark tasks completed</p>
              </div>
              <span className="text-xs font-medium text-stone-500">
                {completedCount} / {totalCount} Done
              </span>
            </div>

            {todayReminders.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No reminders configured for today.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {todayReminders.map((rem) => {
                  const isDone = rem.completedToday;
                  const isSkipped = rem.skippedToday;
                  const isNext = nextUpReminder?.id === rem.id;

                  return (
                    <div
                      key={rem.id}
                      className={`py-3.5 flex items-center justify-between gap-4 transition ${
                        isDone ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Circular Check Button */}
                        <button
                          onClick={() => {
                            soundEngine.playSound('zen-chime', 0.7);
                            onCompleteReminder(rem.id);
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                            isDone
                              ? 'bg-[#1B4332] border-[#1B4332] text-white'
                              : 'border-stone-300 bg-white hover:border-[#1B4332]'
                          }`}
                          title="Toggle completed"
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium text-stone-500">
                              {formatTime12h(rem.time)}
                            </span>
                            {isNext && !isDone && (
                              <span className="text-[11px] font-medium text-[#1B4332]">Current Focus</span>
                            )}
                            {isSkipped && (
                              <span className="text-[11px] text-stone-400">Skipped</span>
                            )}
                          </div>
                          <div
                            className={`text-sm font-medium text-stone-900 truncate ${
                              isDone ? 'line-through text-stone-400' : ''
                            }`}
                          >
                            {rem.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => onStartWorkout(rem)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 transition cursor-pointer"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => onTriggerAlarm(rem)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 transition cursor-pointer"
                          title="Preview chime"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DAILY HABITS (HYDRATION & SLEEP RECOVERY) */}
        <div className="space-y-6">
          {/* HYDRATION WIDGET */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">Hydration</h4>
                <div className="text-xs text-stone-500">{waterGlasses} of 8 glasses</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleUpdateWater(-1)}
                  disabled={waterGlasses <= 0}
                  className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                  title="Remove glass"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleUpdateWater(1)}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-medium text-stone-700 transition flex items-center gap-1 cursor-pointer"
                  title="Add glass"
                >
                  <Plus className="w-3 h-3" />
                  <span>Drink Glass</span>
                </button>
              </div>
            </div>

            {/* 8 Clean Visual Pips */}
            <div className="grid grid-cols-8 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => {
                const filled = waterGlasses >= g;
                return (
                  <button
                    key={g}
                    onClick={() => {
                      setWaterGlasses(g);
                      try {
                        localStorage.setItem('fitbudget_water_glasses', g.toString());
                      } catch {}
                      soundEngine.playSound('water-drop', 0.7);
                    }}
                    className={`h-9 rounded-lg transition flex items-center justify-center text-[10px] font-mono cursor-pointer ${
                      filled
                        ? 'bg-blue-600 text-white font-medium shadow-2xs'
                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                    }`}
                    title={`Glass #${g}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-stone-400 leading-snug">
              Consistent water intake supports joint lubrication and prevents mid-day mental fatigue.
            </p>
          </div>

          {/* SLEEP RECOVERY & LATE BEDTIME */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-stone-900">Sleep & Rest Recovery</h4>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                Turn in late tonight? Select your bedtime so tomorrow's alarms automatically adjust:
              </p>
            </div>

            {/* 4 Clean Segmented Bedtime Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { time: '23:00', label: '11 PM' },
                { time: '00:00', label: '12 AM' },
                { time: '01:00', label: '1 AM' },
                { time: '02:00', label: '2 AM' },
              ].map((slot) => {
                const isSelected = lateSleepTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => handleApplyLateSleepTime(slot.time)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1B4332] text-white shadow-2xs'
                        : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            {appliedSleepNotice && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#1B4332] mt-0.5 flex-shrink-0" />
                <span>{appliedSleepNotice}</span>
              </div>
            )}

            <div className="pt-1 text-[11px] text-stone-400 space-y-1">
              <div>· Water upon waking before caffeine</div>
              <div>· 10-minute morning light exposure</div>
              <div>· Optional 15-minute afternoon recharge</div>
            </div>
          </div>

          {/* QUICK SUMMARY CARD */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-2">
            <h4 className="text-sm font-semibold text-stone-900">Weekly Rhythm</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Configured for work shifts and Saturday studies. Alarms ring according to your local time zone ({preferences.timeZone}).
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenWorkSchedule}
                className="text-xs font-medium text-[#1B4332] hover:underline flex items-center gap-1"
              >
                <span>View Full Routine Planner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LATE WORKOUT TIME ADJUSTMENT MODAL */}
      {lateStatus.overdueWorkout && (
        <LateWorkoutAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          overdueWorkout={lateStatus.overdueWorkout}
          overdueMinutes={lateStatus.overdueMinutes}
          subsequentReminders={lateStatus.subsequentReminders}
          allReminders={reminders}
          workConfig={workConfig}
          dayOfWeek={currentDayIdx}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onScheduleUpdated={(updated, msg) => {
            if (onUpdateReminders) onUpdateReminders(updated);
            if (onShowBanner) onShowBanner(msg, 'success');
          }}
        />
      )}
    </div>
  );
};
