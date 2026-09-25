// ===== 音效（WebAudio 程序化合成，无外部资源） =====
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.28;
        this.master.connect(this.ctx.destination);
      } catch { /* 无音频环境时静默降级 */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.28;
    return this.muted;
  }

  blip({ freq = 440, freqEnd = null, dur = 0.12, type = 'square', vol = 0.5, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.25, vol = 0.4, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  }

  shoot(kind) {
    if (kind === 'sniper') this.blip({ freq: 900, freqEnd: 180, dur: 0.14, type: 'sawtooth', vol: 0.35 });
    else this.blip({ freq: 620, freqEnd: 300, dur: 0.06, type: 'square', vol: 0.18 });
  }
  rocketLaunch() {
    // 导弹呼啸：气流噪声 + 下滑锯齿波（参考极速摩托的导弹发射音）
    this.noise({ dur: 0.4, vol: 0.3 });
    this.blip({ freq: 650, freqEnd: 160, dur: 0.42, type: 'sawtooth', vol: 0.22 });
  }
  hit()      { this.blip({ freq: 300, freqEnd: 120, dur: 0.05, type: 'triangle', vol: 0.2 }); }
  explode()  { this.noise({ dur: 0.4, vol: 0.55 }); this.blip({ freq: 120, freqEnd: 40, dur: 0.35, type: 'sine', vol: 0.5 }); }
  pulse()    { this.blip({ freq: 500, freqEnd: 900, dur: 0.18, type: 'sine', vol: 0.2 }); }
  club()     { this.blip({ freq: 150, freqEnd: 65, dur: 0.14, type: 'sawtooth', vol: 0.4 });
               this.noise({ dur: 0.09, vol: 0.28 }); }
  grenadeThrow() { this.blip({ freq: 300, freqEnd: 520, dur: 0.16, type: 'sine', vol: 0.16 }); }
  slip()     { this.blip({ freq: 900, freqEnd: 260, dur: 0.3, type: 'triangle', vol: 0.28 }); }
  repair()   { this.blip({ freq: 420, freqEnd: 840, dur: 0.1, type: 'triangle', vol: 0.3 });
               this.blip({ freq: 560, freqEnd: 1100, dur: 0.12, type: 'triangle', vol: 0.28, delay: 0.1 }); }
  siren() {
    // 超级怪兽警报：两声上扬警报 + 低鸣
    this.blip({ freq: 300, freqEnd: 620, dur: 0.42, type: 'sawtooth', vol: 0.3 });
    this.blip({ freq: 300, freqEnd: 620, dur: 0.42, type: 'sawtooth', vol: 0.3, delay: 0.48 });
    this.noise({ dur: 0.9, vol: 0.18 });
  }
  place()    { this.blip({ freq: 350, freqEnd: 700, dur: 0.12, type: 'triangle', vol: 0.4 }); }
  upgrade()  { this.blip({ freq: 500, freqEnd: 1000, dur: 0.1, type: 'triangle', vol: 0.4 });
               this.blip({ freq: 700, freqEnd: 1400, dur: 0.12, type: 'triangle', vol: 0.35, delay: 0.08 }); }
  sell()     { this.blip({ freq: 800, freqEnd: 300, dur: 0.16, type: 'triangle', vol: 0.35 }); }
  error()    { this.blip({ freq: 180, freqEnd: 120, dur: 0.15, type: 'square', vol: 0.3 }); }
  leak()     { this.blip({ freq: 260, freqEnd: 90, dur: 0.3, type: 'sawtooth', vol: 0.45 }); }
  kill()     { this.blip({ freq: 440, freqEnd: 880, dur: 0.07, type: 'sine', vol: 0.18 }); }
  split()    { this.blip({ freq: 700, freqEnd: 1200, dur: 0.09, type: 'square', vol: 0.3 });
               this.blip({ freq: 900, freqEnd: 1500, dur: 0.09, type: 'square', vol: 0.3, delay: 0.07 }); }
  waveStart(){ this.blip({ freq: 330, freqEnd: 440, dur: 0.15, type: 'square', vol: 0.35 });
               this.blip({ freq: 440, freqEnd: 550, dur: 0.18, type: 'square', vol: 0.35, delay: 0.14 }); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.blip({ freq: f, dur: 0.22, type: 'triangle', vol: 0.4, delay: i * 0.16 }));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) =>
      this.blip({ freq: f, dur: 0.3, type: 'sawtooth', vol: 0.4, delay: i * 0.2 }));
  }
}
