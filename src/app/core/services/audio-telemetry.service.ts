import { Injectable, signal } from '@angular/core';

const AUDIO_TELEMETRY_STORAGE_KEY = 'nexus_audio_telemetry_enabled';

@Injectable({
  providedIn: 'root',
})
export class AudioTelemetryService {
  readonly soundEnabled = signal<boolean>(
    typeof window !== 'undefined'
      ? localStorage.getItem(AUDIO_TELEMETRY_STORAGE_KEY) !== 'false'
      : true,
  );

  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  toggleSound(): boolean {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUDIO_TELEMETRY_STORAGE_KEY, String(next));
    }
    return next;
  }

  /**
   * High-tech dispatch departure chime (Double-tone ascending arpeggio)
   */
  playDispatchPing() {
    if (!this.soundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Note 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, now + 0.1);
      gain2.gain.setValueAtTime(0.1, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Sonar radar ping (<500m proximity alert to receiving dock)
   */
  playProximityAlert() {
    if (!this.soundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // First chirp (740 Hz -> 987 Hz chirp)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(740, now);
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.12);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Second chirp echo (rhythmic ping)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3);
      gain2.gain.setValueAtTime(0.09, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.42);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Harmonious major chord resolution for successful e-POD handover confirmation
   */
  playPodSuccessChord() {
    if (!this.soundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // C5, E5, G5, C6 frequencies
      const freqs = [523.25, 659.25, 783.99, 1046.5];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.06, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + 0.75);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }
}
