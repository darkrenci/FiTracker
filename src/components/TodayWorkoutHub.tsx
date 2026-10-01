import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  Volume2,
  RotateCcw,
  FastForward,
  Sparkles,
  Award,
  ChevronRight,
  Layers,
  Check,
  Zap,
  ArrowRight,
  Moon,
  Sun,
  Coffee,
  Heart,
  Droplets,
  Plus,
  Smile,
  Bell,
  ThumbsUp,
  Flame,
  Footprints
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
      return saved ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  const [lateSleepTime, setLateSleepTime] = useState<string>(
    workConfig.sleepRecovery?.actualSleptAt || '00:00'
  );
  const [appliedSleepToast, setAppliedSleepToast] = useState(false);
  const [isApplyingAdaptedHabits, setIsApplyingAdaptedHabits] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Update clock every 10 seconds
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

  // Friendly greeting
  const getGreeting = () => {
    const hour = parseInt(currentTimeStr.split(':')[0] || '12', 10);
    const firstName = userName?.split(' ')[0] || 'Friend';
    if (hour < 12) return `Good morning, ${firstName}! ☀️`;
    if (hour < 17) return `Good afternoon, ${firstName}! 🌤️`;
    return `Good evening, ${firstName}! 🌙`;
  };

  // Water Drink Handler (super simple 1-tap!)
  const handleDrinkWater = () => {
    const updated = Math.min(12, waterGlasses + 1);
    setWaterGlasses(updated);
    try {
      localStorage.setItem('fitbudget_water_glasses', updated.toString());
    } catch {}
    soundEngine.playSound('water-drop', 0.8);
    soundEngine.triggerVibration([100]);
    if (onShowBanner) {
      onShowBanner(`Great job! You drank glass #${updated} of water today 💧`, 'success');
    }
  };

  // Late Sleep Helper
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

    setAppliedSleepToast(true);
    setTimeout(() => setAppliedSleepToast(false), 6000);
    if (onShowBanner) {
      onShowBanner(`All set! Tomorrow will give you extra morning rest for ${time} bedtime.`, 'success');
    }
  };

  // Quick shift helper
  const handleQuickShift = async (shiftMins: number) => {
    if (!lateStatus.overdueWorkout) return;
    const previews = ScheduleAdaptationService.previewShift(
      lateStatus.overdueWorkout,
      lateStatus.subsequentReminders,
      shiftMins
    );
    const updated = await ScheduleAdaptationService.applyShiftToReminders(
      reminders,
      previews
    );
    if (onUpdateReminders) onUpdateReminders(updated);
    if (onShowBanner) {
      onShowBanner(`Pushed remaining alarms back by ${shiftMins} minutes!`, 'success');
    }
  };

  // Quick express mode
  const handleQuickExpress = async (duration = 15) => {
    if (!lateStatus.overdueWorkout) return;
    const updated = await ScheduleAdaptationService.compressWorkoutToExpress(
      reminders,
      lateStatus.overdueWorkout.id,
      duration
    );
    if (onUpdateReminders) onUpdateReminders(updated);
    if (onShowBanner) {
      onShowBanner(`Switched to a quick ${duration}-minute session! Take it easy today.`, 'info');
    }
  };

  const isCurrentOverdue = lateStatus.hasLateWorkout && lateStatus.overdueWorkout?.id === nextUpReminder?.id;

  // Choose friendly emoji based on activity
  const getActivityIcon = (cat?: string) => {
    switch (cat) {
      case 'workout':
        return '🏃';
      case 'walking':
        return '🚶';
      case 'running':
        return '🏃‍♂️';
      case 'meal':
        return '🥗';
      case 'hydration':
        return '💧';
      case 'sleep':
      case 'recovery':
        return '🌙';
      default:
        return '✨';
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto px-2 sm:px-0 pb-24">
      {/* 1. BIG, WARM, FRIENDLY GREETING */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE7E0] shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] tracking-tight">
            {getGreeting()}
          </h2>
          <p className="text-sm text-[#5C6460] mt-1 font-medium">
            Today is <strong className="text-[#1F2421]">{todayDayName}</strong> · Ready to move and feel good?
          </p>
        </div>

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F8F7F4] hover:bg-[#EAE7E0] border border-[#EAE7E0] text-[#1F2421] transition cursor-pointer shadow-xs"
          title="Open Menu & Settings"
        >
          <Layers className="w-5 h-5 text-[#234E3C]" />
          <span className="text-[11px] font-bold mt-0.5">Settings</span>
        </button>
      </div>

      {/* 2. THE MAIN HERO ACTIVITY CARD (Designed for Non-Tech Users) */}
      {nextUpReminder ? (
        <div className="bg-white rounded-3xl border-2 border-[#234E3C]/20 p-6 sm:p-7 shadow-md space-y-5">
          {/* Header Tag + Time */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#E8F0EC] text-[#234E3C]">
              <span>{getActivityIcon(nextUpReminder.category)}</span>
              <span>{isCurrentOverdue ? 'Ready when you are!' : 'Up Next Today'}</span>
            </span>

            <span className="text-sm font-bold text-[#1F2421] bg-[#F8F7F4] px-3.5 py-1.5 rounded-full border border-[#EAE7E0]">
              ⏰ {formatTime12h(nextUpReminder.time)}
            </span>
          </div>

          {/* Activity Title & Simple Details */}
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] leading-tight">
              {nextUpReminder.title}
            </h3>

            <div className="flex items-center gap-2 text-sm text-[#5C6460] mt-2 font-medium">
              <span>⏱️ {nextUpReminder.durationMinutes || 20} minutes</span>
              {nextUpReminder.targetMetric && (
                <>
                  <span>•</span>
                  <span className="text-[#234E3C] font-semibold">{nextUpReminder.targetMetric}</span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-base text-[#474E4A] mt-3 leading-relaxed bg-[#F8F7F4] p-4 rounded-2xl border border-[#EAE7E0]">
              {nextUpReminder.message}
            </p>
          </div>

          {/* Friendly Late Helper (Comforting, Zero Guilt!) */}
          {isCurrentOverdue && (
            <div className="p-4 rounded-2xl bg-[#FBF1EB] border border-[#F5D8C7] space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-[#9C4221] font-bold">
                <Smile className="w-5 h-5 text-[#C2633C] flex-shrink-0" />
                <span>Running a little behind? No worries at all! Life happens.</span>
              </div>
              <p className="text-xs text-[#5C6460]">
                Choose what feels best for you right now:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => handleQuickShift(30)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8F7F4] border border-[#F5D8C7] text-[#9C4221] text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  ⏰ Push back 30 mins
                </button>
                <button
                  onClick={() => handleQuickExpress(10)}
                  className="px-4 py-2 rounded-xl bg-[#234E3C] hover:bg-[#1C3F30] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  ⚡ Do quick 10-min stretch
                </button>
              </div>
            </div>
          )}

          {/* ONE BIG OBVIOUS PRIMARY BUTTON: START WORKOUT */}
          <div>
            <button
              onClick={() => onStartWorkout(nextUpReminder!)}
              className="w-full flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl bg-[#234E3C] hover:bg-[#1C3F30] active:scale-[0.99] text-white font-extrabold text-base sm:text-lg shadow-lg shadow-[#234E3C]/20 transition cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white text-white" />
              <span>Start Workout Now</span>
            </button>
          </div>

          {/* SIMPLE 4-BUTTON ACTION GRID (SUPER CLEAR, SKIP IS FULLY VISIBLE!) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* 1. Done */}
            <button
              onClick={() => onCompleteReminder(nextUpReminder!.id)}
              className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl border border-[#CDE0D5] bg-[#E8F0EC] hover:bg-[#D7E6DD] text-xs sm:text-sm font-bold text-[#234E3C] transition cursor-pointer"
            >
              <Check className="w-5 h-5 text-[#234E3C] stroke-[3]" />
              <span>I Finished!</span>
            </button>

            {/* 2. Skip */}
            <button
              onClick={() => onSkipToday(nextUpReminder!)}
              className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl border border-[#EAE7E0] bg-[#F8F7F4] hover:bg-[#EAE7E0] text-xs sm:text-sm font-bold text-[#5C6460] hover:text-[#9C4221] transition cursor-pointer"
            >
              <FastForward className="w-5 h-5 text-[#5C6460]" />
              <span>Skip for Today</span>
            </button>

            {/* 3. Later */}
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl border border-[#EAE7E0] bg-[#F8F7F4] hover:bg-[#EAE7E0] text-xs sm:text-sm font-bold text-[#5C6460] hover:text-[#1F2421] transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-[#5C6460]" />
              <span>Change Time</span>
            </button>

            {/* 4. Test Chime */}
            <button
              onClick={() => onTriggerAlarm(nextUpReminder!)}
              className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl border border-[#EAE7E0] bg-[#F8F7F4] hover:bg-[#EAE7E0] text-xs sm:text-sm font-bold text-[#5C6460] hover:text-[#1F2421] transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-[#5C6460]" />
              <span>Test Chime</span>
            </button>
          </div>
        </div>
      ) : (
        /* Celebratory Finished State */
        <div className="bg-white rounded-3xl border border-[#EAE7E0] p-8 text-center space-y-4 shadow-sm">
          <div className="text-5xl animate-bounce">🎉</div>
          <h3 className="text-2xl font-extrabold text-[#1F2421]">All done for today!</h3>
          <p className="text-sm sm:text-base text-[#5C6460] max-w-sm mx-auto leading-relaxed">
            You completed your routines for {todayDayName}. You should be super proud of yourself!
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenScheduleManager}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#234E3C] text-sm font-bold text-white hover:bg-[#1C3F30] transition shadow-sm cursor-pointer"
            >
              <span>See Tomorrow's Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. SUPER SIMPLE WATER TRACKER (1 Tap to Drink!) */}
      <div className="bg-white rounded-3xl border border-[#EAE7E0] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF3FB] text-[#1D4ED8] flex items-center justify-center text-3xl flex-shrink-0">
            💧
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-[#1F2421]">
              Water Today: {waterGlasses} of 8 glasses
            </h4>
            <p className="text-xs text-[#5C6460]">
              Staying hydrated keeps your energy high and joints pain-free.
            </p>
          </div>
        </div>

        <button
          onClick={handleDrinkWater}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-bold transition shadow-sm cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>I Drank a Glass</span>
        </button>
      </div>

      {/* 4. SLEPT LATE LAST NIGHT? (Super Simple, Non-Tech Helper) */}
      <div className="bg-white rounded-3xl border border-[#EAE7E0] p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FBF1EB] text-[#C2633C] flex items-center justify-center text-xl flex-shrink-0">
            🌙
          </div>
          <div>
            <h4 className="text-base font-bold text-[#1F2421]">
              Did you go to bed late last night?
            </h4>
            <p className="text-xs text-[#5C6460]">
              Tap your bedtime below — we will gently adjust today so you don't feel tired.
            </p>
          </div>
        </div>

        {appliedSleepToast && (
          <div className="p-4 rounded-2xl bg-[#E8F0EC] border border-[#CDE0D5] text-xs text-[#234E3C] flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#234E3C]" />
            <span>Schedule adjusted! We scheduled extra rest and gentle light movement.</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { time: '00:00', label: '12:00 AM' },
            { time: '01:00', label: '1:00 AM' },
            { time: '02:00', label: '2:00 AM' },
            { time: '23:00', label: '11:00 PM' },
          ].map((b) => {
            const isSelected = lateSleepTime === b.time;
            return (
              <button
                key={b.time}
                onClick={() => handleApplyLateSleepTime(b.time)}
                className={`py-3 px-2 rounded-2xl border text-center font-bold text-xs sm:text-sm transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#234E3C] border-[#234E3C] text-white shadow-xs'
                    : 'bg-[#F8F7F4] border-[#EAE7E0] text-[#5C6460] hover:bg-[#EAE7E0]'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] text-xs text-[#5C6460] space-y-1">
          <p className="font-bold text-[#1F2421]">💡 Our gentle recovery tips for you:</p>
          <p>• Drink a full glass of water first thing upon waking up.</p>
          <p>• Enjoy a short 10-minute morning walk in natural sunlight.</p>
          <p>• Take a relaxing 15-minute afternoon rest to recharge.</p>
        </div>
      </div>

      {/* 5. TODAY'S DAILY CHECKLIST (Friendly, Big Tap Circles) */}
      <div className="bg-white rounded-3xl border border-[#EAE7E0] p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-bold text-[#1F2421] flex items-center gap-2">
              <span>📋 Today's Checklist</span>
            </h4>
            <p className="text-xs text-[#5C6460]">
              Tap the circle to mark an activity finished!
            </p>
          </div>

          <span className="text-xs font-bold text-[#234E3C] bg-[#E8F0EC] px-3 py-1 rounded-full">
            {completedCount} of {totalCount} Done
          </span>
        </div>

        {todayReminders.length === 0 ? (
          <div className="py-8 text-center text-[#8F9792] text-sm">
            No routines scheduled for today. Enjoy your day!
          </div>
        ) : (
          <div className="space-y-3">
            {todayReminders.map((rem) => {
              const isDone = rem.completedToday;
              const isSkipped = rem.skippedToday;
              const isNext = nextUpReminder?.id === rem.id;

              return (
                <div
                  key={rem.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition gap-3.5 ${
                    isDone
                      ? 'bg-[#E8F0EC]/40 border-[#CDE0D5]'
                      : isNext
                      ? 'bg-white border-2 border-[#234E3C] shadow-sm'
                      : isSkipped
                      ? 'bg-[#F8F7F4]/50 border-[#EAE7E0] opacity-50'
                      : 'bg-[#F8F7F4] border-[#EAE7E0] hover:border-[#C2BAAE]'
                  }`}
                >
                  {/* Left: Big tap-friendly circle checkbox */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => onCompleteReminder(rem.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition flex-shrink-0 cursor-pointer ${
                        isDone
                          ? 'bg-[#234E3C] border-[#234E3C] text-white'
                          : 'border-[#9CA3AF] bg-white hover:border-[#234E3C]'
                      }`}
                      title="Tap to mark finished"
                    >
                      {isDone && <Check className="w-5 h-5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#234E3C]">
                          ⏰ {formatTime12h(rem.time)}
                        </span>
                        {isDone && (
                          <span className="text-[11px] font-bold text-[#234E3C] bg-[#E8F0EC] px-2 py-0.5 rounded-full">
                            Done! 🎉
                          </span>
                        )}
                        {isNext && !isDone && (
                          <span className="text-[11px] font-bold text-[#234E3C] bg-[#E8F0EC] px-2 py-0.5 rounded-full">
                            Up Next
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-[#1F2421] truncate mt-0.5">
                        {getActivityIcon(rem.category)} {rem.title}
                      </h5>
                    </div>
                  </div>

                  {/* Right: Big Start Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onStartWorkout(rem)}
                      className="px-3.5 py-2 rounded-xl bg-[#234E3C] hover:bg-[#1C3F30] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => onTriggerAlarm(rem)}
                      className="p-2 rounded-xl text-[#5C6460] hover:text-[#1F2421] hover:bg-white transition cursor-pointer"
                      title="Test alarm sound"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
