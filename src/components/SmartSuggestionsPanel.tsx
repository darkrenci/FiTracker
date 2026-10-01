import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  SmartSuggestion,
  ProposedAdjustment,
  formatTime12h
} from '../services/smartSuggestionEngine';
import { ReminderItem } from '../types/notifications';

interface SmartSuggestionsPanelProps {
  suggestions: SmartSuggestion[];
  selectedDay: number;
  onApplyAdjustment: (adjustment: ProposedAdjustment) => void;
  onApplyAll: (adjustments: ProposedAdjustment[]) => void;
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
  suggestions,
  selectedDay,
  onApplyAdjustment,
  onApplyAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'current_day'>('all');
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<string[]>([]);
  const [showRationaleForId, setShowRationaleForId] = useState<string | null>(null);

  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDay];

  const visibleSuggestions = suggestions.filter((s) => {
    if (appliedSuggestionIds.includes(s.id)) return false;
    if (selectedFilter === 'critical') return s.severity === 'critical';
    if (selectedFilter === 'current_day') return s.affectedDays.includes(selectedDay);
    return true;
  });

  const criticalCount = suggestions.filter((s) => s.severity === 'critical' && !appliedSuggestionIds.includes(s.id)).length;
  const currentDayCount = suggestions.filter((s) => s.affectedDays.includes(selectedDay) && !appliedSuggestionIds.includes(s.id)).length;

  const handleApply = (s: SmartSuggestion, adj: ProposedAdjustment) => {
    onApplyAdjustment(adj);
    setAppliedSuggestionIds((prev) => [...prev, s.id]);
  };

  const handleApplyAllBatch = () => {
    const adjustments = visibleSuggestions.map((s) => s.primaryAdjustment);
    onApplyAll(adjustments);
    setAppliedSuggestionIds((prev) => [...prev, ...visibleSuggestions.map((s) => s.id)]);
  };

  if (suggestions.length === 0 || visibleSuggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white">Smart Engine: Schedule Optimized</span>
            <p className="text-[11px] text-emerald-400/80">No workout, meal, or sleep conflicts detected in your schedule.</p>
          </div>
        </div>
        {appliedSuggestionIds.length > 0 && (
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-500/30">
            {appliedSuggestionIds.length} Conflict(s) Resolved Today
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-xl overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Smart Suggestion Engine</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AI Optimization
                </span>
              </h3>
              {criticalCount > 0 && (
                <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
                  {criticalCount} Critical
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified {visibleSuggestions.length} scheduling bottleneck(s) across workouts, nutrition, and rest.
            </p>
          </div>
        </div>

        {/* Header Right: Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {visibleSuggestions.length > 1 && (
            <button
              onClick={handleApplyAllBatch}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Auto-Resolve All ({visibleSuggestions.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                selectedFilter === 'all'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Suggestions ({suggestions.length})
            </button>
            <button
              onClick={() => setSelectedFilter('critical')}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                selectedFilter === 'critical'
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Overlaps ({criticalCount})
            </button>
            <button
              onClick={() => setSelectedFilter('current_day')}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                selectedFilter === 'current_day'
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {currentDayName} ({currentDayCount})
            </button>
          </div>

          {/* Suggestion Cards Grid */}
          <div className="space-y-3">
            {visibleSuggestions.map((suggestion) => {
              const isCritical = suggestion.severity === 'critical';
              const showRationale = showRationaleForId === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition ${
                    isCritical
                      ? 'border-rose-500/30 bg-rose-950/10'
                      : 'border-amber-500/25 bg-amber-950/10'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {isCritical ? 'Direct Collision' : 'Recovery Buffer Warning'}
                        </span>

                        <div className="flex items-center gap-1">
                          {suggestion.affectedDayNames.map((day) => (
                            <span
                              key={day}
                              className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700"
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white pt-0.5">{suggestion.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{suggestion.explanation}</p>
                    </div>

                    {/* Scientific Rationale Toggle */}
                    <button
                      onClick={() =>
                        setShowRationaleForId(showRationale ? null : suggestion.id)
                      }
                      className="self-start sm:self-center flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 whitespace-nowrap"
                    >
                      <Info className="w-3 h-3" />
                      <span>{showRationale ? 'Hide Science' : 'Why This Matters'}</span>
                    </button>
                  </div>

                  {/* Scientific Rationale Accordion */}
                  {showRationale && (
                    <div className="mt-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-300 leading-relaxed space-y-1 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sports Nutrition & Circadian Logic:</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{suggestion.scientificRationale}</p>
                    </div>
                  )}

                  {/* Before / After Adjustment Preview Box */}
                  <div className="mt-4 rounded-xl bg-slate-950/90 border border-slate-800 p-3.5 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Recommended Schedule Adjustment:</span>
                    </div>

                    {/* Primary Adjustment Option */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="line-through text-slate-500">
                            {formatTime12h(suggestion.primaryAdjustment.originalTime)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                            {formatTime12h(suggestion.primaryAdjustment.newTime)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-200">
                          {suggestion.primaryAdjustment.description}
                        </span>
                      </div>

                      <button
                        onClick={() => handleApply(suggestion, suggestion.primaryAdjustment)}
                        className="flex-shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 active:scale-95 transition shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Apply Optimal Adjustment</span>
                      </button>
                    </div>

                    {/* Alternative Adjustment Option (if available) */}
                    {suggestion.alternativeAdjustment && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="line-through text-slate-500">
                              {formatTime12h(suggestion.alternativeAdjustment.originalTime)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
                              {formatTime12h(suggestion.alternativeAdjustment.newTime)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-300">
                            {suggestion.alternativeAdjustment.description}
                          </span>
                        </div>

                        <button
                          onClick={() => handleApply(suggestion, suggestion.alternativeAdjustment!)}
                          className="flex-shrink-0 flex items-center justify-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                        >
                          <span>Apply Alternative</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
