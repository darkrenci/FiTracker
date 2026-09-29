import React, { useEffect, useState } from 'react';
import {
  Bell,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlarmClock,
  Sparkles,
  Flame,
  ChevronDown
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { notificationService, AlarmIntentResult } from '../services/notificationService';
import { ReminderItem, SoundPreset } from '../types/notifications';

interface WorkoutAlarmModalProps {
  reminder: ReminderItem;
  onStartWorkout: (reminder: ReminderItem) => void;
  onSnooze: (reminder: ReminderItem, minutes: number) => void;
  onSkipToday: (reminder: ReminderItem) => void;
  onDismiss: () => void;
  soundPreset?: SoundPreset;
}

export const WorkoutAlarmModal: React.FC<WorkoutAlarmModalProps> = ({
  reminder,
  onStartWorkout,
  onSnooze,
  onSkipToday,
  onDismiss,
  soundPreset = 'pulse-energy',
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const [alarmIntentResult, setAlarmIntentResult] = useState<AlarmIntentResult | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    // Start continuous audio chime & vibration pattern
    soundEngine.startAlarm(soundPreset, 0.9);

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    return () => {
      clearInterval(timer);
      soundEngine.stopAlarm();
    };
  }, [soundPreset]);

  const toggleSound = () => {
    if (isMuted) {
      soundEngine.startAlarm(soundPreset, 0.9);
      setIsMuted(false);
    } else {
      soundEngine.stopAlarm();
      setIsMuted(true);
    }
  };

  const handleOpenDeviceAlarm = () => {
    const result = notificationService.openInDeviceAlarm({
      title: reminder.title,
      time: reminder.time,
      durationMinutes: reminder.durationMinutes || 30,
    });
    setAlarmIntentResult(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      {/* Alarm Glowing Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl shadow-emerald-500/20">
        
        {/* Animated Top Pulse Wave */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-pulse" />

        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>HIGH-PRIORITY WORKOUT ALARM</span>
          </div>

          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition"
            title={isMuted ? 'Unmute Alarm' : 'Mute Alarm'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />}
            <span>{isMuted ? 'Muted' : 'Sounding'}</span>
          </button>
        </div>

        {/* Big Digital Clock Display */}
        <div className="mt-6 text-center">
          <div className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {currentTime}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-xs font-medium text-emerald-400/90">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled for {reminder.time}</span>
            <span>•</span>
            <span>{reminder.durationMinutes || 30} Minutes Target</span>
          </div>
        </div>

        {/* Workout Info Center */}
        <div className="mt-6 rounded-2xl bg-slate-950/70 border border-slate-800 p-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
            <Flame className="w-7 h-7 text-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">{reminder.title}</h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {reminder.message}
          </p>
          {reminder.targetMetric && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Target: {reminder.targetMetric}</span>
            </div>
          )}
        </div>

        {/* Interactive Notification Actions (Section 11.3 & Prompt Instructions) */}
        <div className="mt-6 space-y-3">
          {/* Action 1: Start Workout */}
          <button
            onClick={() => {
              soundEngine.stopAlarm();
              onStartWorkout(reminder);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 py-3.5 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Start Workout Now</span>
          </button>

          {/* Action 2: Remind Me Later (Snooze with 5, 10, 15 min options) */}
          <div className="relative">
            <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-800/80">
              <button
                onClick={() => {
                  soundEngine.stopAlarm();
                  onSnooze(reminder, 10);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700/80 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Remind Me Later (10m)</span>
              </button>
              <button
                onClick={() => setSnoozeMenuOpen(!snoozeMenuOpen)}
                className="border-l border-slate-700 px-3 text-slate-300 hover:bg-slate-700 hover:text-white"
                title="Choose snooze delay"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {snoozeMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 right-0 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl z-20 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Postpone reminder duration
                </div>
                {[5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setSnoozeMenuOpen(false);
                      soundEngine.stopAlarm();
                      onSnooze(reminder, mins);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-emerald-400 transition"
                  >
                    <span>Remind in {mins} minutes</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(Date.now() + mins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action 3: Skip Today & Device Alarm Option */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                soundEngine.stopAlarm();
                onSkipToday(reminder);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 active:scale-[0.98] transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Skip Today</span>
            </button>

            <button
              onClick={handleOpenDeviceAlarm}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 active:scale-[0.98] transition"
              title="Add to Android Clock or Apple Calendar alarm"
            >
              <AlarmClock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open in Device Alarm</span>
            </button>
          </div>
        </div>

        {/* Device Alarm Intent Feedback (Section 11.5) */}
        {alarmIntentResult && (
          <div className="mt-4 rounded-xl bg-slate-950/90 border border-slate-700 p-3 text-xs text-slate-300 space-y-1.5 animate-in fade-in">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Device Alarm Status:</span>
              <span className="text-[11px] uppercase text-cyan-400 font-mono">{alarmIntentResult.platform}</span>
            </div>
            <p className="text-slate-300">{alarmIntentResult.message}</p>
            {alarmIntentResult.platform === 'ios' && (
              <p className="text-[11px] text-amber-300/90">
                Tip: Tap the downloaded file in your browser to import into iOS Calendar with native sound alert.
              </p>
            )}
          </div>
        )}

        {/* Footer Dismiss without action */}
        <div className="mt-5 text-center">
          <button
            onClick={() => {
              soundEngine.stopAlarm();
              onDismiss();
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4"
          >
            Dismiss for now (Silent)
          </button>
        </div>
      </div>
    </div>
  );
};
