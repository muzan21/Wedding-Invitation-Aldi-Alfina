/**
 * Soft Javanese pentatonic / ambient piano audio controller.
 * Uses uploaded custom audio URL when configured, or falls back to a delicate
 * Web Audio synthesized melody so background music always works after user interaction.
 */
export class WeddingAudioController {
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthTimer: number | null = null;
  private isPlaying = false;
  private currentUrl = '';
  private step = 0;

  // Pelog-inspired warm pentatonic frequencies (Hz)
  private readonly notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];

  public setUrl(url: string): void {
    const clean = (url || '').trim();
    if (clean === this.currentUrl) return;
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentUrl = clean;
    if (wasPlaying) {
      void this.play();
    }
  }

  public async play(): Promise<boolean> {
    if (this.isPlaying) return true;
    try {
      if (this.currentUrl) {
        if (!this.audioEl || this.audioEl.src !== this.currentUrl) {
          this.audioEl = new Audio(this.currentUrl);
          this.audioEl.loop = true;
          this.audioEl.volume = 0.5;
        }
        await this.audioEl.play();
        this.isPlaying = true;
        return true;
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.isPlaying = true;
      this.playSynthNote();
      this.synthTimer = window.setInterval(() => {
        if (this.isPlaying) this.playSynthNote();
      }, 1900);
      return true;
    } catch {
      this.isPlaying = false;
      return false;
    }
  }

  private playSynthNote(): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;
    const now = this.audioCtx.currentTime;
    const freq = this.notes[this.step % this.notes.length];
    this.step += 1;

    const osc = this.audioCtx.createOscillator();
    const oscHarmonic = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    const harmonicGain = this.audioCtx.createGain();
    harmonicGain.gain.setValueAtTime(0.012, now);

    osc.connect(gain);
    oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 1.85);
    oscHarmonic.stop(now + 1.85);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.audioEl) {
      this.audioEl.pause();
    }
    if (this.synthTimer !== null) {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  }

  public stop(): void {
    this.pause();
    if (this.audioEl) {
      this.audioEl.currentTime = 0;
    }
  }

  public dispose(): void {
    this.stop();
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
