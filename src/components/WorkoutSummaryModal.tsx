import React from 'react';
import {
  Trophy,
  Flame,
  Footprints,
  Clock,
  Sparkles,
  Share2,
  CheckCircle2,
  ArrowRight,
  Droplets,
  Calendar,
  X,
  Download,
  Activity
} from 'lucide-react';
import { CompletedWorkoutRecord } from '../types/workSchedule';
import { StravaService, GPXTrackPoint } from '../services/stravaService';

interface WorkoutSummaryModalProps {
  workout: CompletedWorkoutRecord;
  trackPoints?: GPXTrackPoint[];
  onClose: () => void;
  onOpenSchedule?: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  workout,
  trackPoints = [],
  onClose,
  onOpenSchedule,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleExportGpx = () => {
    StravaService.downloadGPXFile(workout.title, trackPoints);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Workout Completed!</h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Great Job
                </span>
              </div>
              <p className="text-xs text-slate-400">{workout.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="rounded-2xl bg-slate-950 p-3 text-center border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-base font-black text-white font-mono">{formatTime(workout.durationSeconds)}</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Duration</div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-3 text-center border border-slate-800">
            <Flame className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-base font-black text-white font-mono">{workout.caloriesBurned}</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Est. Kcal</div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-3 text-center border border-slate-800">
            <Footprints className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-base font-black text-white font-mono">{workout.stepsCount.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Steps</div>
          </div>
        </div>

        {/* GPS Distance & Pace if applicable */}
        {(workout.distanceKm || 0) > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Distance Covered:</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {(workout.distanceKm || 0).toFixed(2)} km
              </span>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Average Pace:</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">
                {workout.avgPaceFormatted || '6:12 /km'}
              </span>
            </div>
          </div>
        )}

        {/* Strava Export & Sync Card */}
        <div className="mb-4 rounded-2xl border border-orange-500/30 bg-orange-950/20 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Strava Activity Tracker</span>
              <span className="text-[10px] text-orange-300">
                {trackPoints.length > 0 ? `${trackPoints.length} GPS points logged` : 'Activity formatted for Strava'}
              </span>
            </div>
          </div>

          <button
            onClick={handleExportGpx}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400 active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download GPX</span>
          </button>
        </div>

        {/* Tailored Progress & Recovery Recommendations */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Personalized Next-Step Recommendations</span>
          </div>

          <div className="space-y-2">
            {workout.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 mt-4 flex items-center gap-2">
          {onOpenSchedule && (
            <button
              onClick={() => {
                onClose();
                onOpenSchedule();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>View Schedule</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
          >
            <span>Done</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
