import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, CheckCircle, Flame, Heart, Footprints, Sparkles, Timer } from 'lucide-react';
import { ReminderItem } from '../types/notifications';
import { soundEngine } from '../services/soundEngine';

interface ActiveWorkoutTrackerProps {
  reminder: ReminderItem;
  onFinishWorkout: (reminder: ReminderItem, durationSeconds: number) => void;
  onCancel: () => void;
}

export const ActiveWorkoutTracker: React.FC<ActiveWorkoutTrackerProps> = ({
  reminder,
  onFinishWorkout,
  onCancel,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Estimate calories and steps based on duration and workout type
  const isWalking = reminder.category === 'walking';
  const isRunningType = reminder.category === 'running';
  const burnRatePerMin = isRunningType ? 11.5 : isWalking ? 5.2 : 7.8;
  const estimatedCalories = Math.round((secondsElapsed / 60) * burnRatePerMin);
  const estimatedSteps = Math.round((secondsElapsed / 60) * (isRunningType ? 160 : isWalking ? 115 : 60));
  const estimatedHeartRate = isRunningType ? 148 : isWalking ? 112 : 130;

  const targetSeconds = (reminder.durationMinutes || 30) * 60;
  const progressPercent = Math.min(100, Math.round((secondsElapsed / targetSeconds) * 100));

  const handleComplete = () => {
    soundEngine.playSound('pulse-energy', 1);
    soundEngine.triggerVibration([200, 100, 400]);
    onFinishWorkout(reminder, secondsElapsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">Live Workout Session</span>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Exit Session
          </button>
        </div>

        {/* Workout Title */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-black text-white">{reminder.title}</h2>
          <p className="text-xs text-slate-400 mt-1">Target Duration: {reminder.durationMinutes || 30} minutes</p>
        </div>

        {/* Big Stop-Watch Timer */}
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950">
            {/* Circular Progress Ring */}
            <svg className="absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="6"
                className="text-emerald-500/20"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="6"
                className="text-emerald-400 transition-all duration-500"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="text-center z-10">
              <div className="text-4xl font-black font-mono text-white tracking-wider">
                {formatTime(secondsElapsed)}
              </div>
              <div className="text-[11px] font-semibold text-emerald-400 mt-1">
                {progressPercent}% TARGET
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-center">
            <Flame className="w-4 h-4 mx-auto text-amber-400 mb-1" />
            <div className="text-lg font-black text-white font-mono">{estimatedCalories}</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Est. Kcal</div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-center">
            <Footprints className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
            <div className="text-lg font-black text-white font-mono">{estimatedSteps.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Steps</div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-center">
            <Heart className="w-4 h-4 mx-auto text-rose-400 mb-1" />
            <div className="text-lg font-black text-white font-mono">{estimatedHeartRate}</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">BPM Zone</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 space-y-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Resume Timer</span>
                </>
              )}
            </button>

            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <CheckCircle className="w-4 h-4 fill-slate-950" />
              <span>Finish Workout</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            Completing this session automatically cancels unnecessary reminders for today.
          </p>
        </div>
      </div>
    </div>
  );
};
