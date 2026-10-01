import React, { useState } from 'react';
import {
  X,
  Clock,
  FastForward,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';
import { ReminderItem } from '../types/notifications';
import { WorkScheduleConfig } from '../types/workSchedule';
import {
  ScheduleAdaptationService,
  ShiftPlanPreview,
} from '../services/scheduleAdaptationService';

interface LateWorkoutAdjustmentModalProps {
  isOpen: boolean;
  overdueWorkout: ReminderItem;
  overdueMinutes: number;
  subsequentReminders: ReminderItem[];
  allReminders: ReminderItem[];
  workConfig: WorkScheduleConfig;
  dayOfWeek: number;
  onClose: () => void;
  onScheduleUpdated: (updatedReminders: ReminderItem[], message: string) => void;
}

export const LateWorkoutAdjustmentModal: React.FC<LateWorkoutAdjustmentModalProps> = ({
  isOpen,
  overdueWorkout,
  overdueMinutes,
  subsequentReminders,
  allReminders,
  workConfig,
  dayOfWeek,
  onClose,
  onScheduleUpdated,
}) => {
  if (!isOpen) return null;

  // Selected shift amount (defaults to rounded overdue minutes or +30m)
  const defaultShift = Math.max(15, Math.ceil(overdueMinutes / 15) * 15);
  const [selectedShiftMins, setSelectedShiftMins] = useState<number>(defaultShift);
  const [activeTab, setActiveTab] = useState<'shift' | 'express' | 'reschedule' | 'rebalance'>('shift');
  const [isApplying, setIsApplying] = useState(false);

  // Generate preview of shifts
  const shiftPreviews: ShiftPlanPreview[] = ScheduleAdaptationService.previewShift(
    overdueWorkout,
    subsequentReminders,
    selectedShiftMins
  );

  const handleApplyShift = async () => {
    setIsApplying(true);
    try {
      const updated = await ScheduleAdaptationService.applyShiftToReminders(
        allReminders,
        shiftPreviews
      );
      onScheduleUpdated(
        updated,
        `Shifted ${shiftPreviews.length} upcoming workouts & alarms by +${selectedShiftMins} minutes.`
      );
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyExpress = async (duration = 15) => {
    setIsApplying(true);
    try {
      const updated = await ScheduleAdaptationService.compressWorkoutToExpress(
        allReminders,
        overdueWorkout.id,
        duration
      );
      onScheduleUpdated(
        updated,
        `Compressed '${overdueWorkout.title}' to a ${duration}-min Express workout. Remaining schedule stays on time!`
      );
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleRescheduleToSlot = async (slot: 'lunch' | 'evening') => {
    setIsApplying(true);
    try {
      const newTime = slot === 'lunch' ? '12:30' : '18:15';
      const updated = await ScheduleAdaptationService.rescheduleWorkoutToSlot(
        allReminders,
        overdueWorkout.id,
        newTime,
        slot
      );
      onScheduleUpdated(
        updated,
        `Rescheduled '${overdueWorkout.title}' to ${slot === 'lunch' ? 'Lunch Break (12:30 PM)' : 'Evening (6:15 PM)'}.`
      );
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleAutoRebalance = async () => {
    setIsApplying(true);
    try {
      const result = await ScheduleAdaptationService.autoRebalanceToday(
        allReminders,
        dayOfWeek,
        workConfig
      );
      onScheduleUpdated(result.updatedReminders, result.message);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/40 bg-slate-950 p-5 sm:p-6 shadow-2xl shadow-amber-500/10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Workout Late Start Adjustment</span>
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                  {overdueMinutes}m Overdue
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust remaining scheduled alarms so you don't miss exercises
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Late Workout Summary */}
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Workout Not Started Yet
            </span>
            <h4 className="text-sm font-bold text-white mt-0.5">{overdueWorkout.title}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
              <span>Scheduled: {ScheduleAdaptationService.formatTime12h(overdueWorkout.time)}</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">Delay: +{overdueMinutes} mins</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              {overdueWorkout.durationMinutes || 30} mins
            </span>
          </div>
        </div>

        {/* Adjustment Modes Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs">
          <button
            onClick={() => setActiveTab('shift')}
            className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'shift'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Shift</span>
          </button>

          <button
            onClick={() => setActiveTab('express')}
            className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'express'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Express</span>
          </button>

          <button
            onClick={() => setActiveTab('reschedule')}
            className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'reschedule'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Move</span>
          </button>

          <button
            onClick={() => setActiveTab('rebalance')}
            className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'rebalance'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rebalance</span>
          </button>
        </div>

        {/* TAB 1: SHIFT REMAINING SCHEDULE */}
        {activeTab === 'shift' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Choose how many minutes to shift remaining routines forward:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, defaultShift].map((mins, idx) => {
                  const isSelected = selectedShiftMins === mins;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedShiftMins(mins)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      +{mins} min
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shift Preview List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Live Preview: Shifted Schedule
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 p-2.5">
                {shiftPreviews.map((p) => (
                  <div
                    key={p.reminderId}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <div className="truncate max-w-[60%]">
                      <div className="font-bold text-white truncate">{p.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.reminderId === overdueWorkout.id ? 'Starting Now' : 'Subsequent Routine'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-500 line-through">
                        {ScheduleAdaptationService.formatTime12h(p.originalTime)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300 font-bold">
                        {ScheduleAdaptationService.formatTime12h(p.newTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleApplyShift}
              disabled={isApplying}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:brightness-110 active:scale-[0.99] transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>APPLY +{selectedShiftMins}M SHIFT & UPDATE ALL ALARMS</span>
            </button>
          </div>
        )}

        {/* TAB 2: EXPRESS MODE */}
        {activeTab === 'express' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                <span>Keep Subsequent Schedule On Time with Express Mode</span>
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Don't want to push back work, school, or meals? Compress this workout to a targeted 15-minute or 20-minute session. You get the cardiovascular & metabolic benefits while keeping all subsequent alarms on time!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleApplyExpress(15)}
                disabled={isApplying}
                className="p-3 rounded-2xl border border-cyan-500/40 bg-slate-900 hover:bg-cyan-950/40 text-left transition space-y-1"
              >
                <div className="text-sm font-black text-white">⚡ 15-Min Express</div>
                <p className="text-[11px] text-slate-400">
                  High-tempo circuit or brisk power walk. Zero delay to subsequent schedule.
                </p>
              </button>

              <button
                onClick={() => handleApplyExpress(20)}
                disabled={isApplying}
                className="p-3 rounded-2xl border border-cyan-500/40 bg-slate-900 hover:bg-cyan-950/40 text-left transition space-y-1"
              >
                <div className="text-sm font-black text-white">🔥 20-Min Flow</div>
                <p className="text-[11px] text-slate-400">
                  Targeted mobility + core reset. Maintains habit momentum safely.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: RESCHEDULE TO LUNCH OR EVENING */}
        {activeTab === 'reschedule' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-1">
              <span className="text-purple-300 font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Move Missed Exercise to Later Today</span>
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                If your morning was occupied with urgent tasks, shift this workout to an open window later today so your health benefits aren't lost:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleRescheduleToSlot('lunch')}
                disabled={isApplying}
                className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-purple-500/50 hover:bg-purple-950/30 text-left transition space-y-1"
              >
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Sun className="w-4 h-4" />
                  <span>Lunch Break (12:30 PM)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Perform as a midday digestive walk or mobility reset during shift break.
                </p>
              </button>

              <button
                onClick={() => handleRescheduleToSlot('evening')}
                disabled={isApplying}
                className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-purple-500/50 hover:bg-purple-950/30 text-left transition space-y-1"
              >
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Moon className="w-4 h-4" />
                  <span>Post-Work / School (6:15 PM)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Release stress after office or graduate school with this session.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: AUTO REBALANCE */}
        {activeTab === 'rebalance' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Intelligent Schedule Auto-Rebalancing</span>
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                FitBudget's algorithm will recalculate today's remaining workouts, spacing them smoothly around your work/graduate school shift hours without overlaps, all the way until bedtime.
              </p>
            </div>

            <button
              onClick={handleAutoRebalance}
              disabled={isApplying}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs hover:brightness-110 active:scale-[0.99] transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>REBALANCE ALL REMAINING WORKOUTS TODAY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
