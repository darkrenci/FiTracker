import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  Flame,
  Heart,
  Footprints,
  Sparkles,
  Timer,
  Navigation,
  Activity,
  AlertCircle,
  Download,
  X,
  RotateCcw,
  Check,
  Smile
} from 'lucide-react';
import { ReminderItem } from '../types/notifications';
import { soundEngine } from '../services/soundEngine';
import { CompletedWorkoutRecord } from '../types/workSchedule';
import { StravaService, GPXTrackPoint } from '../services/stravaService';
import { ScheduleAdaptationService } from '../services/scheduleAdaptationService';

interface ActiveWorkoutTrackerProps {
  reminder: ReminderItem;
  allReminders?: ReminderItem[];
  onFinishWorkout: (reminder: ReminderItem, record: CompletedWorkoutRecord, trackPoints: GPXTrackPoint[]) => void;
  onCancel: () => void;
  onUpdateReminders?: (reminders: ReminderItem[]) => void;
  onShowBanner?: (message: string) => void;
}

export const ActiveWorkoutTracker: React.FC<ActiveWorkoutTrackerProps> = ({
  reminder,
  allReminders = [],
  onFinishWorkout,
  onCancel,
  onUpdateReminders,
  onShowBanner,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [sessionStartTime] = useState(() => new Date());
  const [shiftedSuccess, setShiftedSuccess] = useState(false);

  // Calculate if this session started late compared to scheduled time
  const scheduledMins = ScheduleAdaptationService.timeToMinutes(reminder.time);
  const currentStartMins = sessionStartTime.getHours() * 60 + sessionStartTime.getMinutes();
  const lateMinutes = Math.max(0, currentStartMins - scheduledMins);
  const isStartedLate = lateMinutes >= 10;

  // GPS & Strava Tracking State
  const [gpsActive, setGpsActive] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [trackPoints, setTrackPoints] = useState<GPXTrackPoint[]>([]);
  const lastCoordRef = useRef<{ lat: number; lon: number } | null>(null);

  const isWalking = reminder.category === 'walking';
  const isRunningType = reminder.category === 'running';
  const isCardio = isWalking || isRunningType;

  // Live Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // GPS Geolocation Watcher for Walking / Running
  useEffect(() => {
    let watchId: number | null = null;

    if (typeof window !== 'undefined' && 'geolocation' in navigator && isRunning && isCardio) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            setGpsActive(true);
            const { latitude, longitude, altitude } = pos.coords;
            const newPt: GPXTrackPoint = {
              lat: latitude,
              lon: longitude,
              time: new Date(pos.timestamp).toISOString(),
              elevation: altitude ?? 15,
            };

            setTrackPoints((prev) => [...prev, newPt]);

            if (lastCoordRef.current) {
              const delta = StravaService.calculateDistanceMeters(
                lastCoordRef.current.lat,
                lastCoordRef.current.lon,
                latitude,
                longitude
              );
              if (delta > 2 && delta < 80) {
                setDistanceMeters((prev) => prev + delta);
              }
            }
            lastCoordRef.current = { lat: latitude, lon: longitude };
          },
          () => {
            setGpsActive(false);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      } catch {
        setGpsActive(false);
      }
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isRunning, isCardio]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Metrics Calculations
  const burnRatePerMin = isRunningType ? 11.5 : isWalking ? 5.2 : 7.8;
  const estimatedCalories = Math.round((secondsElapsed / 60) * burnRatePerMin);
  const estimatedSteps = Math.round((secondsElapsed / 60) * (isRunningType ? 160 : isWalking ? 115 : 60));

  const distanceKm = distanceMeters > 50 ? distanceMeters / 1000 : (estimatedSteps * 0.00078);
  const targetSeconds = (reminder.durationMinutes || 20) * 60;
  const progressPercent = Math.min(100, Math.round((secondsElapsed / targetSeconds) * 100));

  const handleFinish = () => {
    soundEngine.playSound('pulse-energy', 1);
    soundEngine.triggerVibration([200, 100, 400]);

    const minutesDone = Math.max(1, Math.round(secondsElapsed / 60));
    const hydrationNeededMl = Math.round(minutesDone * 12);

    const generatedRecs: string[] = [
      `Drink a big glass of water (~${hydrationNeededMl} ml) now to stay well hydrated.`,
      `Wonderful job! You burned about ${estimatedCalories} calories and took ${estimatedSteps.toLocaleString()} steps.`,
      'Take a few deep breaths and give yourself credit for showing up today!',
    ];

    const record: CompletedWorkoutRecord = {
      id: `session-${Date.now()}`,
      reminderId: reminder.id,
      title: reminder.title,
      category: reminder.category,
      startedAt: new Date(Date.now() - secondsElapsed * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: secondsElapsed,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      distanceMeters: Math.round(distanceKm * 1000),
      avgPaceFormatted: `${Math.floor(secondsElapsed / 60)} min`,
      caloriesBurned: estimatedCalories,
      stepsCount: estimatedSteps,
      stravaSynced: false,
      recommendations: generatedRecs,
    };

    onFinishWorkout(reminder, record, trackPoints);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-[#EAE7E0] bg-white p-6 sm:p-8 shadow-2xl text-[#1F2421]">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#234E3C] animate-ping" />
            <span className="text-xs font-bold text-[#234E3C] uppercase tracking-wide">
              {isRunning ? 'Workout in Progress' : 'Paused'}
            </span>
          </div>

          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-[#5C6460] hover:text-[#1F2421] hover:bg-[#F8F7F4] transition cursor-pointer"
            title="Exit workout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workout Title & Message */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421]">{reminder.title}</h2>
          <p className="text-sm text-[#5C6460] mt-1 font-medium">Goal: {reminder.durationMinutes || 20} minutes</p>

          {/* Late start friendly notice */}
          {isStartedLate && allReminders && allReminders.length > 0 && !shiftedSuccess && (
            <div className="mt-3 p-3 rounded-2xl bg-[#FBF1EB] border border-[#F5D8C7] flex items-center justify-between text-xs">
              <span className="text-[#9C4221] font-medium">
                Started a bit late?
              </span>

              <button
                onClick={async () => {
                  const todayIdx = new Date().getDay();
                  const subsequent = allReminders.filter(
                    (r) =>
                      r.enabled &&
                      r.daysOfWeek.includes(todayIdx) &&
                      r.id !== reminder.id &&
                      !r.completedToday
                  );
                  const previews = ScheduleAdaptationService.previewShift(
                    reminder,
                    subsequent,
                    lateMinutes
                  );
                  const updated = await ScheduleAdaptationService.applyShiftToReminders(
                    allReminders,
                    previews
                  );
                  if (onUpdateReminders) onUpdateReminders(updated);
                  if (onShowBanner) {
                    onShowBanner(`Pushed next reminders back by ${lateMinutes} minutes!`);
                  }
                  setShiftedSuccess(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#234E3C] text-white font-bold text-xs transition shadow-xs cursor-pointer"
              >
                Push Next Alarms Back
              </button>
            </div>
          )}
        </div>

        {/* Big Clear Stopwatch Display */}
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="relative flex h-52 w-52 items-center justify-center rounded-full border-8 border-[#E8F0EC] bg-[#F8F7F4]">
            <div className="text-center">
              <div className="text-5xl font-black text-[#1F2421] font-mono tracking-tight">
                {formatTime(secondsElapsed)}
              </div>
              <div className="text-xs font-bold text-[#234E3C] mt-2">
                {progressPercent}% COMPLETED
              </div>
            </div>
          </div>
        </div>

        {/* Friendly Encouraging Quote */}
        <div className="mt-4 text-center text-xs font-medium text-[#5C6460] bg-[#F8F7F4] p-3 rounded-2xl border border-[#EAE7E0]">
          👏 You're doing wonderful! Listen to your body and move at your own pace.
        </div>

        {/* Simple 3 Metrics Cards */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] p-3">
            <div className="text-xl">🔥</div>
            <div className="text-lg font-bold text-[#1F2421] mt-0.5">{estimatedCalories}</div>
            <div className="text-[11px] text-[#5C6460] font-medium">Calories</div>
          </div>

          <div className="rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] p-3">
            <div className="text-xl">👟</div>
            <div className="text-lg font-bold text-[#1F2421] mt-0.5">{estimatedSteps.toLocaleString()}</div>
            <div className="text-[11px] text-[#5C6460] font-medium">Steps</div>
          </div>

          <div className="rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] p-3">
            <div className="text-xl">📍</div>
            <div className="text-lg font-bold text-[#1F2421] mt-0.5">{distanceKm.toFixed(1)}</div>
            <div className="text-[11px] text-[#5C6460] font-medium">Km</div>
          </div>
        </div>

        {/* Large Action Controls (Pause / Finish) */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border border-[#EAE7E0] bg-[#F8F7F4] hover:bg-[#EAE7E0] text-sm font-bold text-[#1F2421] transition cursor-pointer"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 text-[#5C6460]" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 text-[#234E3C] fill-[#234E3C]" />
                <span>Resume</span>
              </>
            )}
          </button>

          <button
            onClick={handleFinish}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#234E3C] hover:bg-[#1C3F30] text-sm font-bold text-white shadow-md shadow-[#234E3C]/20 transition cursor-pointer"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Finish!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
