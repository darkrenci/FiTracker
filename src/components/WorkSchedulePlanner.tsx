import React, { useState } from 'react';
import {
  Briefcase,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Footprints,
  Flame,
  Coffee,
  Sun,
  Moon,
  ChevronRight,
  Sliders,
  Check,
  Zap,
  Info,
  GraduationCap,
  BookOpen,
  Laptop,
  Dumbbell,
  Bed,
  Copy,
  RotateCcw
} from 'lucide-react';
import { WorkScheduleConfig, WorkDayShift, WorkdayHabitRecommendation, DayActivityType } from '../types/workSchedule';
import { WorkdayRecommendationEngine } from '../services/workdayRecommendationEngine';
import { ReminderItem } from '../types/notifications';
import { notificationService } from '../services/notificationService';
import { ACTIVITY_PRESET_OPTIONS, DEFAULT_WORK_CONFIG } from '../data/defaultWorkSchedule';

interface WorkSchedulePlannerProps {
  workConfig: WorkScheduleConfig;
  onUpdateWorkConfig: (config: WorkScheduleConfig) => void;
  onApplyRecommendations: (newReminders: ReminderItem[]) => void;
}

const DAYS = [
  { idx: 1, name: 'Monday', short: 'Mon' },
  { idx: 2, name: 'Tuesday', short: 'Tue' },
  { idx: 3, name: 'Wednesday', short: 'Wed' },
  { idx: 4, name: 'Thursday', short: 'Thu' },
  { idx: 5, name: 'Friday', short: 'Fri' },
  { idx: 6, name: 'Saturday', short: 'Sat' },
  { idx: 0, name: 'Sunday', short: 'Sun' },
];

export const WorkSchedulePlanner: React.FC<WorkSchedulePlannerProps> = ({
  workConfig,
  onUpdateWorkConfig,
  onApplyRecommendations,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(6); // Default to Saturday to highlight Graduate School customization
  const [filterCategory, setFilterCategory] = useState<'all' | 'office' | 'grad_school' | 'recovery'>('all');
  const [isApplied, setIsApplied] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  // Generate recommendations based on current config
  const recommendations = WorkdayRecommendationEngine.generateWorkdayPlan(workConfig);

  const handleUpdateShift = (dayIdx: number, updates: Partial<WorkDayShift>) => {
    const updatedShifts = { ...workConfig.shifts };
    updatedShifts[dayIdx] = {
      ...updatedShifts[dayIdx],
      ...updates,
    };
    onUpdateWorkConfig({
      ...workConfig,
      shifts: updatedShifts,
    });
  };

  const handleApplyPreset = (dayIdx: number, presetType: DayActivityType) => {
    const preset = ACTIVITY_PRESET_OPTIONS.find((p) => p.type === presetType);
    if (!preset) return;

    handleUpdateShift(dayIdx, {
      activityType: presetType,
      isWorkDay: presetType !== 'rest_recovery',
      customTitle: presetType === 'graduate_school' ? `${DAYS.find(d => d.idx === dayIdx)?.name} Graduate School & Classes` : preset.label,
      workStartTime: preset.defaultStart,
      workEndTime: preset.defaultEnd,
      workType: presetType === 'graduate_school' ? 'classroom_lecture' : presetType === 'remote_work' ? 'remote_desk' : 'office_desk',
      includePreActivityExercise: true,
      includeMidMorningStretch: presetType !== 'rest_recovery',
      includeLunchWalk: true,
      includeAfternoonEnergyBreak: presetType !== 'rest_recovery',
      includePostActivityWorkout: presetType !== 'rest_recovery',
    });
  };

  const handleCopyDayToWeekdays = (sourceDayIdx: number) => {
    const sourceShift = workConfig.shifts[sourceDayIdx];
    if (!sourceShift) return;

    const updatedShifts = { ...workConfig.shifts };
    for (const dayIdx of [1, 2, 3, 4, 5]) {
      updatedShifts[dayIdx] = {
        ...sourceShift,
        dayOfWeek: dayIdx,
        dayName: DAYS.find((d) => d.idx === dayIdx)?.name || '',
      };
    }

    onUpdateWorkConfig({
      ...workConfig,
      shifts: updatedShifts,
    });
  };

  const handleSetSaturdayGradSchool = () => {
    handleApplyPreset(6, 'graduate_school');
    setSelectedDay(6);
  };

  const handleResetToDefaults = () => {
    onUpdateWorkConfig({ ...DEFAULT_WORK_CONFIG });
  };

  const handleApplyAllToSchedule = async () => {
    const reminders = WorkdayRecommendationEngine.convertToReminderItems(recommendations);
    for (const rem of reminders) {
      await notificationService.scheduleReminder(rem);
    }
    onApplyRecommendations(reminders);
    setIsApplied(true);
    setAppliedCount(reminders.length);
    setTimeout(() => setIsApplied(false), 4500);
  };

  const activeShift = workConfig.shifts[selectedDay] || {
    dayOfWeek: selectedDay,
    dayName: DAYS.find((d) => d.idx === selectedDay)?.name || '',
    isWorkDay: selectedDay !== 0,
    activityType: selectedDay === 6 ? 'graduate_school' : selectedDay === 0 ? 'rest_recovery' : 'office_work',
    customTitle: selectedDay === 6 ? 'Saturday Graduate School' : selectedDay === 0 ? 'Rest Day' : 'Office Shift',
    workStartTime: selectedDay === 6 ? '08:00' : '07:00',
    workEndTime: selectedDay === 6 ? '17:00' : '18:00',
    workType: selectedDay === 6 ? 'classroom_lecture' : 'office_desk',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    includePreActivityExercise: true,
    includeMidMorningStretch: true,
    includeLunchWalk: true,
    includeAfternoonEnergyBreak: true,
    includePostActivityWorkout: true,
    preferredWorkoutTime: 'post_work',
  };

  const currentActivityType = activeShift.activityType || (activeShift.isWorkDay ? (selectedDay === 6 ? 'graduate_school' : 'office_work') : 'rest_recovery');

  // Filter recommendations
  const filteredRecs = recommendations.filter((rec) => {
    if (filterCategory === 'office') {
      return rec.id.includes('office');
    }
    if (filterCategory === 'grad_school') {
      return rec.id.includes('gradschool');
    }
    if (filterCategory === 'recovery') {
      return rec.id.includes('recovery') || rec.id.includes('wind-down');
    }
    return true;
  });

  const getActivityBadge = (type: DayActivityType) => {
    switch (type) {
      case 'graduate_school':
        return { label: 'Grad School', icon: GraduationCap, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'study_research':
        return { label: 'Study & Thesis', icon: BookOpen, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'remote_work':
        return { label: 'Remote', icon: Laptop, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'fitness_training':
        return { label: 'Fitness Day', icon: Dumbbell, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'rest_recovery':
        return { label: 'Rest', icon: Bed, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
      default:
        return { label: 'Office', icon: Briefcase, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Overview */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Monday to Sunday Routine & Schedule Planner</h3>
                <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                  Graduate School + Office Adaptive
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customize every day from Monday to Sunday individually — office work (7am–6pm), Saturday graduate school, study, or rest days.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplyAllToSchedule}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Apply Weekly Alarms to Schedule</span>
            </button>
          </div>
        </div>

        {isApplied && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Successfully generated and scheduled {appliedCount} tailored alarms & reminders across your weekly schedule!</span>
          </div>
        )}

        {/* Monday to Sunday Day Selector Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Select Day to Customize (Monday – Sunday):</span>
            <span className="text-[11px] text-purple-400 font-medium">Tip: Click Saturday to adjust Graduate School hours</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {DAYS.map((d) => {
              const shift = workConfig.shifts[d.idx];
              const isSelected = selectedDay === d.idx;
              const actType = shift?.activityType || (shift?.isWorkDay ? (d.idx === 6 ? 'graduate_school' : 'office_work') : 'rest_recovery');
              const badge = getActivityBadge(actType);
              const BadgeIcon = badge.icon;

              return (
                <button
                  key={d.idx}
                  onClick={() => setSelectedDay(d.idx)}
                  className={`p-3 rounded-2xl text-left border transition flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-slate-800 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {d.name}
                    </span>
                    <BadgeIcon className={`w-3.5 h-3.5 ${badge.color.split(' ')[0]}`} />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block max-w-fit border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {shift?.isWorkDay ? `${shift.workStartTime} - ${shift.workEndTime}` : 'Rest Day'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Customizer Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-5">
          {/* Header of selected day */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {currentActivityType === 'graduate_school' ? (
                  <GraduationCap className="w-5 h-5" />
                ) : currentActivityType === 'rest_recovery' ? (
                  <Bed className="w-5 h-5" />
                ) : (
                  <Briefcase className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    {DAYS.find((d) => d.idx === selectedDay)?.name} Schedule Settings
                  </h4>
                  {selectedDay === 6 && (
                    <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      🎓 Graduate School Day
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {currentActivityType === 'graduate_school'
                    ? 'Attending graduate school, university lectures, seminars & research'
                    : currentActivityType === 'office_work'
                    ? 'Office hours, desk work, and screen intervals'
                    : 'Scheduled day commitment and recovery routines'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={activeShift.isWorkDay}
                  onChange={(e) => handleUpdateShift(selectedDay, { isWorkDay: e.target.checked })}
                  className="rounded accent-purple-500"
                />
                <span className="font-semibold text-slate-200">
                  {activeShift.isWorkDay ? 'Active Commitment Day' : 'Day Off / Rest Only'}
                </span>
              </label>
            </div>
          </div>

          {/* Quick Preset Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              1. Choose Activity Type Preset for {DAYS.find((d) => d.idx === selectedDay)?.name}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {ACTIVITY_PRESET_OPTIONS.map((preset) => {
                const isCurrent = currentActivityType === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() => handleApplyPreset(selectedDay, preset.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center border transition ${
                      isCurrent
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl mb-1">{preset.icon}</span>
                    <span className="text-xs font-bold leading-tight">{preset.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{preset.defaultStart} - {preset.defaultEnd}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Title & Time Grid */}
          <div className="space-y-4 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              2. Timing & Break Windows:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Custom Label */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Activity Title / Subject</label>
                <input
                  type="text"
                  value={activeShift.customTitle || ''}
                  onChange={(e) => handleUpdateShift(selectedDay, { customTitle: e.target.value })}
                  placeholder={selectedDay === 6 ? 'e.g. Saturday Graduate School' : 'e.g. Corporate Office Shift'}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs font-semibold focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                  {currentActivityType === 'graduate_school' ? 'Classes Start' : 'Start Time'}
                </label>
                <div className="relative">
                  <Sun className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="time"
                    value={activeShift.workStartTime}
                    onChange={(e) => handleUpdateShift(selectedDay, { workStartTime: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-white font-mono font-semibold focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                  {currentActivityType === 'graduate_school' ? 'Classes End' : 'End Time'}
                </label>
                <div className="relative">
                  <Moon className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5" />
                  <input
                    type="time"
                    value={activeShift.workEndTime}
                    onChange={(e) => handleUpdateShift(selectedDay, { workEndTime: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-white font-mono font-semibold focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lunch / Midday Break */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Lunch / Midday Window</label>
                <div className="relative">
                  <Coffee className="w-4 h-4 text-rose-400 absolute left-3 top-2.5" />
                  <input
                    type="time"
                    value={activeShift.lunchBreakStart}
                    onChange={(e) => handleUpdateShift(selectedDay, { lunchBreakStart: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-white font-mono font-semibold focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Routine Checklists for this Day */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pt-3">
              3. Habit & Alarm Automations for {DAYS.find((d) => d.idx === selectedDay)?.name}:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={activeShift.includePreActivityExercise ?? true}
                  onChange={(e) => handleUpdateShift(selectedDay, { includePreActivityExercise: e.target.checked })}
                  className="rounded accent-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-white block">
                    {currentActivityType === 'graduate_school' ? '🎓 Pre-Class Clarity Walk' : '🌅 Morning Awakening Walk'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Triggers 45m before starting ({activeShift.workStartTime})
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={activeShift.includeMidMorningStretch}
                  onChange={(e) => handleUpdateShift(selectedDay, { includeMidMorningStretch: e.target.checked })}
                  className="rounded accent-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-white block">
                    {currentActivityType === 'graduate_school' ? '🎓 Lecture Break Spine Stretch' : '🧘 Desk Mobility & Anti-Slouch'}
                  </span>
                  <span className="text-[11px] text-slate-400">Mid-morning mobility reset</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={activeShift.includeLunchWalk}
                  onChange={(e) => handleUpdateShift(selectedDay, { includeLunchWalk: e.target.checked })}
                  className="rounded accent-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-white block">
                    {currentActivityType === 'graduate_school' ? '🎓 Campus Digestive Walk' : '🚶 Post-Lunch Digestive Walk'}
                  </span>
                  <span className="text-[11px] text-slate-400">20-minute stroll after lunch</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={activeShift.includeAfternoonEnergyBreak}
                  onChange={(e) => handleUpdateShift(selectedDay, { includeAfternoonEnergyBreak: e.target.checked })}
                  className="rounded accent-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-white block">
                    {currentActivityType === 'graduate_school' ? '🎓 Seminar Energy Boost' : '⚡ Afternoon Stair Climb / Squats'}
                  </span>
                  <span className="text-[11px] text-slate-400">Defeats afternoon brain fatigue</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={activeShift.includePostActivityWorkout ?? true}
                  onChange={(e) => handleUpdateShift(selectedDay, { includePostActivityWorkout: e.target.checked })}
                  className="rounded accent-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-white block">
                    {currentActivityType === 'graduate_school' ? '🎓 Post-Class Stress-Relief Run' : '🏃 Post-Work Outdoor Run / Gym'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Triggers after finish ({activeShift.workEndTime})
                  </span>
                </div>
              </label>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-center">
                <span className="text-[11px] text-slate-400">Preferred Workout Window:</span>
                <select
                  value={activeShift.preferredWorkoutTime}
                  onChange={(e) => handleUpdateShift(selectedDay, { preferredWorkoutTime: e.target.value as any })}
                  className="mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-semibold"
                >
                  <option value="post_work">After Classes / Work Shift</option>
                  <option value="pre_work">Before Classes / Work Shift</option>
                  <option value="lunch_break">During Lunch Window</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Helper Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCopyDayToWeekdays(selectedDay)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy this setup to Mon–Fri</span>
              </button>

              <button
                onClick={handleSetSaturdayGradSchool}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/40 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30 transition"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Quick Preset: Saturday Graduate School</span>
              </button>
            </div>

            <button
              onClick={handleResetToDefaults}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all to defaults</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Generated Tailored Recommendations Section */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Tailored Exercise, Walking & Study Habit Recommendations
              </h4>
              <p className="text-[11px] text-slate-400">
                Calibrated to your active Monday–Sunday schedules (including Saturday Graduate School)
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({recommendations.length})
            </button>
            <button
              onClick={() => setFilterCategory('grad_school')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                filterCategory === 'grad_school' ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🎓 Grad School</span>
            </button>
            <button
              onClick={() => setFilterCategory('office')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                filterCategory === 'office' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>💼 Office</span>
            </button>
            <button
              onClick={() => setFilterCategory('recovery')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterCategory === 'recovery' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recovery & Sleep
            </button>
          </div>
        </div>

        {/* Recommendations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRecs.map((rec) => {
            const isGrad = rec.id.includes('gradschool');
            const isWalkOrRun = rec.category === 'walking' || rec.category === 'running';

            // Format day names
            const dayNames = rec.daysOfWeek
              .map((idx) => DAYS.find((d) => d.idx === idx)?.short)
              .filter(Boolean)
              .join(', ');

            return (
              <div
                key={rec.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 space-y-3 transition ${
                  isGrad
                    ? 'border-purple-500/40 bg-purple-950/20 shadow-md shadow-purple-500/5'
                    : 'border-slate-800 bg-slate-950/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm font-bold ${isGrad ? 'text-purple-400' : 'text-emerald-400'}`}>
                        {rec.time}
                      </span>
                      <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 capitalize">
                        {rec.durationMinutes} mins
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isGrad && (
                        <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 text-[9px] font-bold">
                          Saturday Grad School
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isGrad
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                            : isWalkOrRun
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {rec.category}
                      </span>
                    </div>
                  </div>

                  <h5 className="text-xs font-bold text-white mt-2 flex items-center gap-1.5">
                    <span>{rec.title}</span>
                  </h5>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {rec.message}
                  </p>

                  <div className="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                    <div>
                      <strong className="text-slate-300">Why this timing: </strong>
                      <span>{rec.rationale}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
                      <span>Scheduled for: <strong className="text-cyan-300">{dayNames || 'All days'}</strong></span>
                    </div>
                  </div>

                  {rec.exerciseInstructions && rec.exerciseInstructions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Routine breakdown:
                      </span>
                      {rec.exerciseInstructions.map((ins, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isGrad ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                          <span>{ins}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Alarm sound: <strong className="text-slate-200">{rec.soundPreset}</strong></span>
                  <span className="text-cyan-400 font-mono font-semibold">{rec.targetMetric}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
