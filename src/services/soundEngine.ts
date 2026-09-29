import { SoundPreset } from '../types/notifications';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private alarmInterval: any = null;
  private wakeLock: any = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a single preview chime for a given preset
  public async playSound(preset: SoundPreset, volume = 0.8, customDataUrl?: string): Promise<void> {
    if (preset === 'custom' && customDataUrl) {
      try {
        const audio = new Audio(customDataUrl);
        audio.volume = Math.max(0, Math.min(1, volume));
        await audio.play();
        return;
      } catch (err) {
        console.warn('Could not play custom sound, falling back to pulse-energy', err);
      }
    }

    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, now);
      masterGain.connect(ctx.destination);

      switch (preset) {
        case 'digital-beep': {
          // 3 crisp digital beeps
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(2048, now + i * 0.14);
            gain.gain.setValueAtTime(0.3, now + i * 0.14);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.08);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + i * 0.14);
            osc.stop(now + i * 0.14 + 0.09);
          }
          break;
        }

        case 'zen-chime': {
          // Harmonic singing bowl chime with gentle decay
          const freqs = [528, 1056, 1584];
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.4 / (idx + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 2.5);
          });
          break;
        }

        case 'water-drop': {
          // Frequency modulated water droplet ping
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(700, now);
          osc.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.36);
          break;
        }

        case 'dining-bell': {
          // Warm brass service chime
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'triangle';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(880, now);
          osc2.frequency.setValueAtTime(1760, now);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.2);
          osc2.stop(now + 1.2);
          break;
        }

        case 'military-bugle': {
          // Energetic 3-note wake up bugle fanfare: G4 -> C5 -> E5
          const notes = [392, 523.25, 659.25];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const noteStart = now + idx * 0.15;
            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.3, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(noteStart);
            osc.stop(noteStart + 0.26);
          });
          break;
        }

        case 'radar-ping': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.65);
          break;
        }

        case 'pulse-energy':
        default: {
          // Ascending energetic workout alarm chords: C5 (523) -> E5 (659) -> G5 (784) -> C6 (1046)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const noteTime = now + idx * 0.1;
            osc.frequency.setValueAtTime(freq, noteTime);
            gain.gain.setValueAtTime(0.4, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(noteTime);
            osc.stop(noteTime + 0.42);
          });
          break;
        }
      }
    } catch (e) {
      console.error('Audio playback error', e);
    }
  }

  // Start continuous Workout Alarm (sound + vibration + screen wake lock)
  public async startAlarm(preset: SoundPreset = 'pulse-energy', volume = 0.9, customDataUrl?: string): Promise<void> {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    // Trigger initial sound & vibration
    this.playSound(preset, volume, customDataUrl);
    this.triggerVibration([400, 200, 400, 200, 600]);

    // Request Screen Wake Lock so display stays on during alarm
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // WakeLock not supported or denied
    }

    // Loop alarm sound every 2.2 seconds until dismissed
    this.alarmInterval = setInterval(() => {
      if (!this.isAlarmPlaying) return;
      this.playSound(preset, volume, customDataUrl);
      this.triggerVibration([300, 150, 300, 150, 500]);
    }, 2200);
  }

  // Stop the alarm sound and release locks
  public stopAlarm(): void {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
    this.stopVibration();
  }

  public getIsAlarmPlaying(): boolean {
    return this.isAlarmPlaying;
  }

  public triggerVibration(pattern: number[] = [300, 150, 300]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }

  public stopVibration(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }
}

export const soundEngine = new SoundEngine();
