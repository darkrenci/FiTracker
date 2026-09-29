import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Bell,
  AlertTriangle,
  Play,
  AlarmClock,
  Check,
  X,
  Volume2,
  Vibrate,
  Globe,
  Sliders,
  Droplets,
  Flame,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Zap,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { ReminderCategory, ReminderItem, SoundPreset, UserPreferences } from '../types/notifications';
import { notificationService } from '../services/notificationService';
import { soundEngine } from '../services/soundEngine';
import {
  SmartSuggestionEngine,
  ProposedAdjustment,
  SmartSuggestion,
  timeToMinutes,
  formatTime12h
} from '../services/smartSuggestionEngine';
import { SmartSuggestionsPanel } from './SmartSuggestionsPanel';

interface ScheduleManagerProps {
  reminders: ReminderItem[];
  preferences: UserPreferences;
  onUpdateReminder: (id: string, updates: Partial<ReminderItem>) => void;
  onAddReminder: (reminder: Partial<ReminderItem>) => void;
  onDeleteReminder: (id: string) => void;
  onTriggerAlarmModal: (reminder: ReminderItem) => void;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onNavigateToPhoneDb?: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const POPULAR_TIMEZONES = [
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'UTC',
];

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  reminders,
  preferences,
  onUpdateReminder,
  onAddReminder,
  onDeleteReminder,
  onTriggerAlarmModal,
  onUpdatePreferences,
  onNavigateToPhoneDb,
}) => {
  const [activeTab, setActiveTab] = useState<'workouts' | 'meals' | 'sleep' | 'hydration'>('workouts');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ReminderItem> | null>(null);
  const [waterLoggedToday, setWaterLoggedToday] = useState(1250); // ml

  // Smart Suggestion Engine: Analyze schedule across all days and preferences
  const allSuggestions = useMemo(() => {
    return SmartSuggestionEngine.analyzeSchedule(reminders, preferences);
  }, [reminders, preferences]);

  const handleApplyAdjustment = (adjustment: ProposedAdjustment) => {
    onUpdateReminder(adjustment.targetReminderId, {
      time: adjustment.newTime,
      ...(adjustment.newDuration ? { durationMinutes: adjustment.newDuration } : {}),
    });
  };

  const handleApplyAllAdjustments = (adjustments: ProposedAdjustment[]) => {
    for (const adj of adjustments) {
      onUpdateReminder(adj.targetReminderId, {
        time: adj.newTime,
        ...(adj.newDuration ? { durationMinutes: adj.newDuration } : {}),
      });
    }
  };

  const handleEdit = (item: ReminderItem) => {
    setEditingItem({ ...item });
    setIsEditingModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingItem({
      title: 'New Scheduled Reminder',
      category: activeTab === 'workouts' ? 'workout' : activeTab === 'meals' ? 'meal' : 'sleep',
      time: '19:00',
      daysOfWeek: [selectedDay],
      durationMinutes: 30,
      message: 'Time for your scheduled fitness activity.',
      enabled: true,
      priority: 'high',
      soundPreset: 'pulse-energy',
      vibrate: true,
      repeatIntervalMinutes: 10,
      isAlarm: true,
      targetMetric: '30 min session',
    });
    setIsEditingModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!editingItem || !editingItem.title || !editingItem.time) return;

    if (editingItem.id) {
      onUpdateReminder(editingItem.id, editingItem);
    } else {
      onAddReminder(editingItem);
    }
    setIsEditingModalOpen(false);
    setEditingItem(null);
  };

  // Filter reminders by current tab and day
  const filteredReminders = reminders.filter((r) => {
    if (activeTab === 'workouts') {
      return (r.category === 'workout' || r.category === 'walking' || r.category === 'running' || r.category === 'recovery');
    }
    if (activeTab === 'meals') {
      return r.category === 'meal';
    }
    if (activeTab === 'sleep') {
      return r.category === 'sleep' || r.category === 'summary';
    }
    return false;
  });

  const dayFilteredReminders = filteredReminders.filter((r) => r.daysOfWeek.includes(selectedDay));

  const handleLogWater = (amountMl: number) => {
    setWaterLoggedToday((prev) => prev + amountMl);
    soundEngine.playSound('water-drop', 0.8);
    soundEngine.triggerVibration([100]);
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Time Zone & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Active Time Zone:</span>
              <select
                value={preferences.timeZone}
                onChange={(e) => onUpdatePreferences({ timeZone: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500"
              >
                {POPULAR_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All reminders calculate accurate solar time according to {preferences.timeZone}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToPhoneDb && (
            <button
              onClick={onNavigateToPhoneDb}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              title="Manage Phone Database & Download Backups"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Phone Database</span>
            </button>
          )}

          <button
            onClick={handleCreateNew}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {/* Smart Suggestion Engine Optimization Panel */}
      <SmartSuggestionsPanel
        suggestions={allSuggestions}
        selectedDay={selectedDay}
        onApplyAdjustment={handleApplyAdjustment}
        onApplyAll={handleApplyAllAdjustments}
      />

      {/* Category Navigation Tabs */}
      <div className="flex rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 gap-1 overflow-x-auto">
        {[
          { id: 'workouts', label: '🏋️ Weekly Workouts & Alarms', count: reminders.filter((r) => ['workout', 'walking', 'running', 'recovery'].includes(r.category)).length },
          { id: 'meals', label: '🍽️ Meals (Breakfast, Lunch, Dinner)', count: reminders.filter((r) => r.category === 'meal').length },
          { id: 'hydration', label: '💧 Hydration Tracking', count: 'Active' },
          { id: 'sleep', label: '🌙 Sleep & Recovery', count: reminders.filter((r) => ['sleep', 'summary'].includes(r.category)).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-emerald-400 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Hydration Interactive Hub Tab */}
      {activeTab === 'hydration' ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Droplets className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Smart Hydration Engine</h3>
                <p className="text-xs text-slate-400">
                  Configurable recurring interval reminders during active hours.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Interval:</span>
              <select
                value={preferences.hydrationIntervalMinutes}
                onChange={(e) => onUpdatePreferences({ hydrationIntervalMinutes: parseInt(e.target.value, 10) })}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={30}>Every 30 Minutes</option>
                <option value={45}>Every 45 Minutes</option>
                <option value={60}>Every 60 Minutes (Default)</option>
                <option value={90}>Every 90 Minutes</option>
                <option value={120}>Every 2 Hours</option>
              </select>
            </div>
          </div>

          {/* Water Progress Meter */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Today's Water Intake</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">{waterLoggedToday} ml / 2,500 ml Goal</span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((waterLoggedToday / 2500) * 100))}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleLogWater(250)}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+250 ml (Glass)</span>
              </button>
              <button
                onClick={() => handleLogWater(500)}
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/20 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+500 ml (Bottle)</span>
              </button>
              <button
                onClick={() => setWaterLoggedToday(0)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:text-white transition ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/40 p-4 rounded-2xl border border-slate-800 leading-relaxed">
            <strong>Non-intrusive Guarantee:</strong> Hydration reminders are gentle prompts that do not force exact intake, repeat after dismissal, or ring during your configured quiet hours ({preferences.quietHoursStart} - {preferences.quietHoursEnd}).
          </div>
        </div>
      ) : (
        <>
          {/* Day of Week Selector Bar (Sun - Sat) with Conflict Badges */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {DAYS.map((d, index) => {
              const isSelected = selectedDay === index;
              const countForDay = filteredReminders.filter((r) => r.daysOfWeek.includes(index)).length;
              const daySuggestions = allSuggestions.filter((s) => s.affectedDays.includes(index));
              const hasCritical = daySuggestions.some((s) => s.severity === 'critical');

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(index)}
                  className={`relative flex-1 min-w-[48px] py-2.5 px-2 rounded-2xl border text-center transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/10'
                      : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {/* Conflict indicator badge on day */}
                  {daySuggestions.length > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black shadow-sm ${
                        hasCritical
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-amber-400 text-slate-950 font-bold'
                      }`}
                      title={`${daySuggestions.length} scheduling issue(s) detected on ${FULL_DAYS[index]}`}
                    >
                      {daySuggestions.length}
                    </span>
                  )}

                  <div className="text-[11px] font-bold uppercase">{d}</div>
                  <div className={`mt-0.5 text-xs font-mono font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {countForDay}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Day Timeline & Conflict Bar (06:00 to 23:00) */}
          {(() => {
            const dayAllReminders = reminders.filter((r) => r.enabled && r.daysOfWeek.includes(selectedDay));
            const daySuggestions = allSuggestions.filter((s) => s.affectedDays.includes(selectedDay));

            return (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-white">{FULL_DAYS[selectedDay]} Visual Flow Timeline</span>
                    {daySuggestions.length > 0 && (
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {daySuggestions.length} conflict(s)
                      </span>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> Workout
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-orange-400" /> Meal
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" /> Sleep
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Overlap
                    </span>
                  </div>
                </div>

                {/* Timeline Track (6:00 AM to 11:00 PM = 17 hours = 1020 mins) */}
                <div className="relative h-8 w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                  {/* Hour markers */}
                  <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-25 text-[9px] font-mono text-slate-400 items-center">
                    <span>6AM</span>
                    <span>9AM</span>
                    <span>12PM</span>
                    <span>3PM</span>
                    <span>6PM</span>
                    <span>9PM</span>
                    <span>11PM</span>
                  </div>

                  {/* Blocks */}
                  {dayAllReminders.map((r) => {
                    const startMins = timeToMinutes(r.time);
                    const durMins = r.durationMinutes || 30;
                    // Timeline starts at 6:00 AM (360 mins) and spans 1020 mins (to 23:00)
                    const leftPct = Math.max(0, Math.min(100, ((startMins - 360) / 1020) * 100));
                    const widthPct = Math.max(2.5, Math.min(100 - leftPct, (durMins / 1020) * 100));

                    const isConflicted = daySuggestions.some(
                      (s) => s.itemA.id === r.id || s.itemB.id === r.id
                    );

                    const colorClass = isConflicted
                      ? 'bg-rose-500/80 border-rose-300 text-white animate-pulse'
                      : r.category === 'meal'
                      ? 'bg-orange-500/70 border-orange-400 text-white'
                      : r.category === 'sleep'
                      ? 'bg-indigo-500/70 border-indigo-400 text-white'
                      : 'bg-emerald-500/80 border-emerald-300 text-slate-950 font-bold';

                    return (
                      <div
                        key={r.id}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`absolute top-1 bottom-1 rounded-md border text-[9px] flex items-center justify-center overflow-hidden px-1 transition-all ${colorClass}`}
                        title={`${r.title} (${formatTime12h(r.time)}, ${durMins}m)${isConflicted ? ' ⚠️ CONFLICT' : ''}`}
                      >
                        <span className="truncate">{r.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* List of Reminders for Selected Day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {FULL_DAYS[selectedDay]} Schedule ({dayFilteredReminders.length} scheduled)
              </h3>
              <span className="text-[11px] text-slate-500">
                Click any alarm to test or configure
              </span>
            </div>

            {dayFilteredReminders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400">
                <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs">No reminders configured for {FULL_DAYS[selectedDay]}.</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Reminder</span>
                </button>
              </div>
            ) : (
              dayFilteredReminders.map((reminder) => {
                const isCompleted = reminder.completedToday;
                const isSkipped = reminder.skippedToday;
                const isSnoozed = reminder.snoozedUntil && new Date(reminder.snoozedUntil) > new Date();

                // Check if this reminder has a smart suggestion conflict on this day
                const activeConflict = allSuggestions.find(
                  (s) =>
                    s.affectedDays.includes(selectedDay) &&
                    (s.itemA.id === reminder.id || s.itemB.id === reminder.id)
                );

                return (
                  <div
                    key={reminder.id}
                    className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition ${
                      !reminder.enabled
                        ? 'border-slate-800/50 bg-slate-950/40 opacity-50'
                        : isCompleted
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : isSkipped
                        ? 'border-rose-500/30 bg-rose-950/15'
                        : isSnoozed
                        ? 'border-cyan-500/40 bg-cyan-950/20'
                        : activeConflict
                        ? 'border-amber-500/40 bg-amber-950/15 hover:border-amber-500/60'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Left Accent Bar */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                        activeConflict
                          ? 'bg-amber-400'
                          : reminder.isAlarm
                          ? 'bg-gradient-to-b from-emerald-500 to-cyan-400'
                          : 'bg-slate-700'
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Reminder Info */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Time Badge */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5">
                          <span className="text-base font-black font-mono text-white">{reminder.time}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {parseInt(reminder.time.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{reminder.title}</h4>
                            {reminder.isAlarm && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                <AlarmClock className="w-3 h-3" />
                                <span>ALARM</span>
                              </span>
                            )}
                            {activeConflict && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Conflict Detected</span>
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                <Check className="w-3 h-3" />
                                <span>Completed Today</span>
                              </span>
                            )}
                            {isSkipped && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                <X className="w-3 h-3" />
                                <span>Skipped Today</span>
                              </span>
                            )}
                            {isSnoozed && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                <RotateCcw className="w-3 h-3" />
                                <span>Snoozed until {new Date(reminder.snoozedUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-slate-300 line-clamp-1">{reminder.message}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            {reminder.durationMinutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>{reminder.durationMinutes} mins</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Volume2 className="w-3 h-3 text-cyan-400" />
                              <span className="font-mono">{reminder.soundPreset}</span>
                            </span>
                            {reminder.vibrate && (
                              <span className="flex items-center gap-1 text-teal-400">
                                <Vibrate className="w-3 h-3" />
                                <span>Vibrate</span>
                              </span>
                            )}
                            {reminder.targetMetric && (
                              <span className="text-slate-400 border-l border-slate-700 pl-2">
                                {reminder.targetMetric}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* Test Alarm Trigger */}
                        <button
                          onClick={() => onTriggerAlarmModal(reminder)}
                          className="flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition"
                          title="Trigger full Workout Alarm modal"
                        >
                          <Play className="w-3.5 h-3.5 fill-emerald-300" />
                          <span>Test Alarm</span>
                        </button>

                        {/* Open in Device Alarm */}
                        <button
                          onClick={() => notificationService.openInDeviceAlarm(reminder)}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                          title="Open in Device Alarm (Android Clock / iOS Calendar)"
                        >
                          <AlarmClock className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(reminder)}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                          title="Edit Reminder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active */}
                        <button
                          onClick={() => onUpdateReminder(reminder.id, { enabled: !reminder.enabled })}
                          className={`rounded-xl border p-2 text-xs font-bold transition ${
                            reminder.enabled
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                              : 'border-slate-800 bg-slate-950 text-slate-500'
                          }`}
                          title={reminder.enabled ? 'Disable Reminder' : 'Enable Reminder'}
                        >
                          {reminder.enabled ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteReminder(reminder.id)}
                          className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-500 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition"
                          title="Delete Reminder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* In-Card Smart Suggestion Quick Fix Banner */}
                    {activeConflict && (
                      <div className="mt-3.5 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
                        <div className="flex items-start sm:items-center gap-2 text-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                          <div>
                            <span className="font-bold text-white">Smart Engine Recommendation:</span>{' '}
                            <span>{activeConflict.primaryAdjustment.description}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleApplyAdjustment(activeConflict.primaryAdjustment)}
                          className="self-start sm:self-center flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 active:scale-95 transition shadow-sm cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Apply Quick Fix</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Edit / Create Reminder Modal */}
      {isEditingModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingItem.id ? 'Edit Reminder' : 'New Reminder'}
              </h3>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Title</label>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Night Walking Reminder"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Scheduled Time (24h)</label>
                  <input
                    type="time"
                    value={editingItem.time || '19:00'}
                    onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={editingItem.durationMinutes || 30}
                    onChange={(e) => setEditingItem({ ...editingItem, durationMinutes: parseInt(e.target.value, 10) || 30 })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Days of Week</label>
                <div className="mt-1.5 flex gap-1">
                  {DAYS.map((d, idx) => {
                    const isChecked = editingItem.daysOfWeek?.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const current = editingItem.daysOfWeek || [];
                          const updated = isChecked
                            ? current.filter((c) => c !== idx)
                            : [...current, idx].sort();
                          setEditingItem({ ...editingItem, daysOfWeek: updated });
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-950 text-slate-500'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notification Message</label>
                <textarea
                  rows={2}
                  value={editingItem.message || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, message: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Ku, your 30-minute evening walk is scheduled. Ready to get moving?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notification Sound</label>
                  <select
                    value={editingItem.soundPreset || 'pulse-energy'}
                    onChange={(e) => setEditingItem({ ...editingItem, soundPreset: e.target.value as SoundPreset })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="pulse-energy">⚡ Pulse Energy</option>
                    <option value="digital-beep">⏰ Classic Digital Beep</option>
                    <option value="zen-chime">🧘 Zen Singing Bowl</option>
                    <option value="water-drop">💧 Aqua Droplet</option>
                    <option value="dining-bell">🍽️ Dining Bell</option>
                    <option value="military-bugle">🎺 Bugle Fanfare</option>
                    <option value="radar-ping">📡 Radar Ping</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Postpone Interval</label>
                  <select
                    value={editingItem.repeatIntervalMinutes || 10}
                    onChange={(e) => setEditingItem({ ...editingItem, repeatIntervalMinutes: parseInt(e.target.value, 10) })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={0}>Notify Once Only</option>
                    <option value={5}>Remind again after 5 min</option>
                    <option value={10}>Remind again after 10 min</option>
                    <option value={15}>Remind again after 15 min</option>
                    <option value={30}>Remind again after 30 min</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingItem.isAlarm ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, isAlarm: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span>Trigger Fullscreen Workout Alarm</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingItem.vibrate ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, vibrate: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span>Vibration Pattern</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
