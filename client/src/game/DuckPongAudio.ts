type AudioContextConstructor = new () => AudioContext;

export class DuckPongAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  private getContext() {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const AudioContextClass = (window.AudioContext || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined;
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
    }
    return this.context;
  }

  unlock() {
    const context = this.getContext();
    if (context?.state === 'suspended') void context.resume();
  }

  private tone(startFrequency: number, endFrequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) {
    const context = this.getContext();
    if (!context || !this.master) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.025, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  quack() {
    this.tone(430, 170, 0.16, 'sawtooth', 0.22);
    this.tone(310, 120, 0.2, 'triangle', 0.1, 0.05);
  }

  hit() {
    this.tone(520, 760, 0.07, 'square', 0.08);
  }

  point(winner: 'player' | 'alfredo') {
    if (winner === 'player') {
      this.quack();
      this.tone(620, 900, 0.16, 'triangle', 0.12, 0.08);
    } else {
      this.tone(220, 110, 0.22, 'sawtooth', 0.13);
      this.quack();
    }
  }

  finish(winner: 'player' | 'alfredo' | 'draw') {
    if (winner === 'draw') {
      this.tone(330, 240, 0.2, 'triangle', 0.12);
      this.tone(330, 240, 0.2, 'triangle', 0.12, 0.18);
      return;
    }
    if (winner === 'player') {
      this.quack();
      this.tone(520, 1040, 0.34, 'triangle', 0.14, 0.16);
      this.tone(660, 1320, 0.36, 'triangle', 0.12, 0.3);
    } else {
      this.tone(250, 90, 0.48, 'sawtooth', 0.14);
    }
  }

  dispose() {
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
  }
}
