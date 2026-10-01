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
  Smile,
  X,
  FastForward
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
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-[#EAE7E0] bg-white p-6 sm:p-8 shadow-2xl text-[#1F2421]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F0EC] px-3.5 py-1 text-xs font-bold text-[#234E3C]">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>Time to Move!</span>
          </div>

          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 rounded-full border border-[#EAE7E0] bg-[#F8F7F4] hover:bg-[#EAE7E0] px-3 py-1 text-xs font-medium text-[#5C6460] transition cursor-pointer"
            title={isMuted ? 'Turn on sound' : 'Turn off sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-[#234E3C]" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>

        {/* Big Friendly Clock Display */}
        <div className="mt-5 text-center">
          <div className="text-4xl sm:text-5xl font-extrabold text-[#1F2421] font-mono tracking-tight">
            {currentTime}
          </div>
          <p className="mt-1 text-xs font-medium text-[#5C6460]">
            Scheduled for {reminder.time} · {reminder.durationMinutes || 20} minutes
          </p>
        </div>

        {/* Workout Info Center */}
        <div className="mt-5 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] p-5 text-center">
          <div className="text-4xl mb-2">🏃‍♂️</div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1F2421]">{reminder.title}</h2>
          <p className="mt-2 text-sm text-[#5C6460] leading-relaxed">
            {reminder.message}
          </p>
        </div>

        {/* Primary & Secondary Action Buttons (Clear, Big Touch Targets) */}
        <div className="mt-6 space-y-2.5">
          {/* Action 1: Start Workout */}
          <button
            onClick={() => {
              soundEngine.stopAlarm();
              onStartWorkout(reminder);
            }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#234E3C] hover:bg-[#1C3F30] text-white font-extrabold text-base shadow-md shadow-[#234E3C]/20 transition cursor-pointer active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-white text-white" />
            <span>Start Activity Now</span>
          </button>

          {/* Action 2: Remind Me in 10 mins */}
          <button
            onClick={() => {
              soundEngine.stopAlarm();
              onSnooze(reminder, 10);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#EAE7E0] bg-[#F8F7F4] hover:bg-[#EAE7E0] text-sm font-bold text-[#1F2421] transition cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#5C6460]" />
            <span>Remind me in 10 minutes</span>
          </button>

          {/* Action 3 & 4: Skip or Dismiss */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                soundEngine.stopAlarm();
                onSkipToday(reminder);
              }}
              className="flex-1 py-2.5 rounded-xl border border-[#EAE7E0] bg-white hover:bg-[#F8F7F4] text-xs font-semibold text-[#5C6460] hover:text-[#9C4221] transition cursor-pointer"
            >
              Skip for Today
            </button>

            <button
              onClick={() => {
                soundEngine.stopAlarm();
                onDismiss();
              }}
              className="flex-1 py-2.5 rounded-xl border border-[#EAE7E0] bg-white hover:bg-[#F8F7F4] text-xs font-semibold text-[#5C6460] transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
