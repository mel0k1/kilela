export type SfxName =
  | 'click'
  | 'step'
  | 'sitDown'
  | 'standUp'
  | 'lieDown'
  | 'portal'
  | 'welcome'
  | 'pop';

export class Sfx {
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private lastStep = 0;
  enabled = true;

  resume() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.4);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);

      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;

    if (this.master) {
      this.master.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx!.currentTime, 0.03);
    }
  }

  play(name: SfxName) {
    if (!this.enabled || !this.ctx || !this.master) return;

    switch (name) {
      case 'click':
        this.tone(880, 0.05, 0.12, 'triangle', 0.25);
        break;
      case 'step':
        this.step();
        break;
      case 'sitDown':
        this.swish(520, 180, 0.16, 0.16);
        this.tone(220, 0.1, 0.1, 'sine', 0.14);
        break;
      case 'standUp':
        this.swish(260, 620, 0.18, 0.14);
        break;
      case 'lieDown':
        this.swish(420, 120, 0.22, 0.15);
        break;
      case 'portal':
        this.swish(180, 1400, 0.7, 0.2);
        this.tone(660, 0.5, 0.08, 'sine', 0.1);
        break;
      case 'welcome':
        this.tone(523.25, 0.16, 0.1, 'sine', 0.16);
        window.setTimeout(() => this.tone(659.25, 0.18, 0.1, 'sine', 0.16), 130);
        window.setTimeout(() => this.tone(783.99, 0.26, 0.1, 'sine', 0.16), 260);
        break;
      case 'pop':
        this.tone(420, 0.07, 0.14, 'triangle', 0.18);
        this.tone(840, 0.05, 0.1, 'sine', 0.12);
        break;
    }
  }

  step() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (now - this.lastStep < 0.22) return;

    this.lastStep = now;
    this.tone(80 + Math.random() * 30, 0.06, 0.28, 'sine', 0.4);
    this.noise(0.04, 0.03, 800 + Math.random() * 250);
  }

  private tone(freq: number, dur: number, gainValue: number, type: OscillatorType, attack: number) {
    if (!this.ctx || !this.master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainValue, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private swish(from: number, to: number, dur: number, gainValue: number) {
    if (!this.ctx || !this.master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainValue, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, gainValue: number, filterHz: number) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}

export const sfx = new Sfx();

