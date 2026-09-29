import React, { useState } from 'react';
import {
  Volume2,
  Play,
  Square,
  Vibrate,
  Sliders,
  Sparkles,
  Upload,
  Check,
  Smartphone,
  Music
} from 'lucide-react';
import { soundEngine } from '../services/soundEngine';
import { SoundPreset, SoundSettings } from '../types/notifications';

interface SoundSettingsPanelProps {
  sounds: SoundSettings;
  onUpdateSounds: (updated: Partial<SoundSettings>) => void;
}

const SOUND_PRESETS: Array<{ id: SoundPreset; name: string; desc: string; bestFor: string }> = [
  {
    id: 'pulse-energy',
    name: '⚡ Pulse Energy (Default)',
    desc: 'Ascending synthesizer chords with high-energy tempo',
    bestFor: 'High-intensity workouts & alarms',
  },
  {
    id: 'digital-beep',
    name: '⏰ Classic Digital Beep',
    desc: 'Triple digital chronograph beep pattern',
    bestFor: 'Clear, unmistakably urgent alerts',
  },
  {
    id: 'zen-chime',
    name: '🧘 Zen Singing Bowl',
    desc: 'Harmonic resonant chime with long soothing decay',
    bestFor: 'Sleep, wind-down & stretching',
  },
  {
    id: 'water-drop',
    name: '💧 Aqua Splash Droplet',
    desc: 'Resonant frequency-modulated droplet ping',
    bestFor: 'Hydration & water tracking',
  },
  {
    id: 'dining-bell',
    name: '🍽️ Dining Bell Chime',
    desc: 'Warm brass cafe table bell chord',
    bestFor: 'Breakfast, lunch, and dinner reminders',
  },
  {
    id: 'military-bugle',
    name: '🎺 Morning Fanfare Bugle',
    desc: 'Energetic brass wake-up arpeggio',
    bestFor: 'Early morning runs & cardio',
  },
  {
    id: 'radar-ping',
    name: '📡 Sonar Radar Pulse',
    desc: 'Subtle clean frequency pulse',
    bestFor: 'Gentle, unobtrusive notifications',
  },
  {
    id: 'custom',
    name: '📁 Custom Audio File',
    desc: 'Upload your own custom MP3 / WAV audio file',
    bestFor: 'Personalized tones',
  },
];

export const SoundSettingsPanel: React.FC<SoundSettingsPanelProps> = ({
  sounds,
  onUpdateSounds,
}) => {
  const [playingPreset, setPlayingPreset] = useState<string | null>(null);

  const handlePreviewSound = async (preset: SoundPreset) => {
    if (playingPreset === preset) {
      soundEngine.stopAlarm();
      setPlayingPreset(null);
      return;
    }

    setPlayingPreset(preset);
    if (sounds.vibrateEnabled) {
      soundEngine.triggerVibration([150, 80, 150]);
    }
    await soundEngine.playSound(preset, sounds.volume, sounds.customSoundDataUrl);

    setTimeout(() => {
      setPlayingPreset(null);
    }, 1800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdateSounds({
          customSoundDataUrl: dataUrl,
          workout: 'custom',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 p-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <span>Custom Notification Sounds</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose distinctive audible tones for workouts, meals, hydration, and sleep.
          </p>
        </div>

        {/* Master Volume & Vibration */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={sounds.volume}
              onChange={(e) => onUpdateSounds({ volume: parseFloat(e.target.value) })}
              className="w-24 accent-emerald-500 cursor-pointer"
              title="Alert Volume"
            />
            <span className="text-xs font-mono text-slate-300 w-8">{Math.round(sounds.volume * 100)}%</span>
          </div>

          <button
            type="button"
            onClick={() => onUpdateSounds({ vibrateEnabled: !sounds.vibrateEnabled })}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              sounds.vibrateEnabled
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            <Vibrate className="w-3.5 h-3.5" />
            <span>Vibration: {sounds.vibrateEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Category Sound Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Workout & Alarm Sound */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>🏋️ Workout & Alarm Alert Sound</span>
            </label>
            <button
              onClick={() => handlePreviewSound(sounds.workout)}
              className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              {playingPreset === sounds.workout ? <Square className="w-3 h-3 fill-emerald-300" /> : <Play className="w-3 h-3 fill-emerald-300" />}
              <span>Test</span>
            </button>
          </div>

          <select
            value={sounds.workout}
            onChange={(e) => onUpdateSounds({ workout: e.target.value as SoundPreset })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
          >
            {SOUND_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Triggers during high-priority scheduled workouts and the Workout Alarm.
          </p>
        </div>

        {/* 2. Meal Reminders Sound */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <span>🍽️ Meal Reminders Sound</span>
            </label>
            <button
              onClick={() => handlePreviewSound(sounds.meal)}
              className="flex items-center gap-1 rounded-lg bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/20"
            >
              {playingPreset === sounds.meal ? <Square className="w-3 h-3 fill-orange-300" /> : <Play className="w-3 h-3 fill-orange-300" />}
              <span>Test</span>
            </button>
          </div>

          <select
            value={sounds.meal}
            onChange={(e) => onUpdateSounds({ meal: e.target.value as SoundPreset })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-orange-500 focus:outline-none"
          >
            {SOUND_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Breakfast (6:30 AM), Lunch (12:00 PM), Snack (3:30 PM), Dinner (7:30 PM).
          </p>
        </div>

        {/* 3. Hydration Reminders Sound */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <span>💧 Hydration Alert Sound</span>
            </label>
            <button
              onClick={() => handlePreviewSound(sounds.hydration)}
              className="flex items-center gap-1 rounded-lg bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
            >
              {playingPreset === sounds.hydration ? <Square className="w-3 h-3 fill-blue-300" /> : <Play className="w-3 h-3 fill-blue-300" />}
              <span>Test</span>
            </button>
          </div>

          <select
            value={sounds.hydration}
            onChange={(e) => onUpdateSounds({ hydration: e.target.value as SoundPreset })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-blue-500 focus:outline-none"
          >
            {SOUND_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Triggers at your chosen hydration interval (e.g. every 60 min).
          </p>
        </div>

        {/* 4. Sleep & Wind-Down Sound */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>🌙 Sleep & Wind-Down Sound</span>
            </label>
            <button
              onClick={() => handlePreviewSound(sounds.sleep)}
              className="flex items-center gap-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
            >
              {playingPreset === sounds.sleep ? <Square className="w-3 h-3 fill-indigo-300" /> : <Play className="w-3 h-3 fill-indigo-300" />}
              <span>Test</span>
            </button>
          </div>

          <select
            value={sounds.sleep}
            onChange={(e) => onUpdateSounds({ sleep: e.target.value as SoundPreset })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
          >
            {SOUND_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Wind-down (9:45 PM), Bedtime (10:30 PM), and morning readiness check-in.
          </p>
        </div>
      </div>

      {/* Pre-defined Sounds Showcase & Custom File Upload */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Interactive Sound Library & Audition
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Synthesized in real-time via Web Audio API. Safe, zero-lag, works offline.
            </p>
          </div>

          <label className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload Custom Audio</span>
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SOUND_PRESETS.filter((p) => p.id !== 'custom').map((preset) => {
            const isPlaying = playingPreset === preset.id;
            return (
              <div
                key={preset.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 hover:border-slate-700 transition"
              >
                <div>
                  <div className="text-xs font-bold text-white">{preset.name}</div>
                  <div className="mt-1 text-[10px] text-slate-400 line-clamp-2">{preset.desc}</div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-emerald-400 font-mono">{preset.bestFor}</span>
                  <button
                    onClick={() => handlePreviewSound(preset.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition"
                  >
                    {isPlaying ? <Square className="w-3.5 h-3.5 fill-emerald-400" /> : <Play className="w-3.5 h-3.5 fill-emerald-400" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
