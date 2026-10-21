'use client';

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Âm thanh click lách cách nhẹ nhàng, vui tai của bánh xe số vali
   */
  public playTick(pitch: number = 600) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore
    }
  }

  /**
   * Âm thanh pop nhẹ khi bánh xe vào khớp
   */
  public playLockClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore
    }
  }

  /**
   * Âm thanh chuông leng keng vui vẻ khi mở khoá thành công
   */
  public playWin() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      // Nốt nhạc vui tươi C5, E5, G5, C6 (đồ mi son đố)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteDuration = 0.12;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * noteDuration);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * noteDuration);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * noteDuration + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * noteDuration);
        osc.stop(ctx.currentTime + idx * noteDuration + 0.26);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Âm thanh nhẹ nhàng khi không có ai mở được kì này
   */
  public playNoWinner() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [440, 392]; // A4, G4
      const noteDuration = 0.18;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * noteDuration);

        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * noteDuration);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * noteDuration + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * noteDuration);
        osc.stop(ctx.currentTime + idx * noteDuration + 0.22);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundEffects = new SoundEffectsManager();
