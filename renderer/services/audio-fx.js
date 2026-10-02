// renderer/services/audio-fx.js
/**
 * 纯 Web Audio API 程序化苹果级声学触觉合成引擎 (Apple Acoustic & Haptic Audio Engine)
 * 模拟 Apple Taptic Engine 极短清脆机械敲击、macOS 晶莹剔透通知和弦与 Siri 灵动虚空声效
 * 100% 纯代码合成，零外部音频文件依赖，零网络延迟
 */

class AudioFxEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API 初始化受限:', e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        const res = this.ctx.resume();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch (e) {
        // Safely ignore in headless environments
      }
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.38, this.ctx.currentTime);
    }
  }

  /**
   * 1. 录入线索时的苹果 Taptic Engine 拟真触觉反馈 (Apple Watch Crown / iOS Keyboard Tap)
   */
  playClueAdded() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // 微触觉瞬态敲击 (Micro-transient snap)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2200, t);
    osc1.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.045);

    // 水晶泛音共振 (Crystalline Glass Resonance)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(3520, t + 0.01);
    osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

    gain2.gain.setValueAtTime(0.12, t + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.01);
    osc2.stop(t + 0.09);
  }

  /**
   * 2. 悬赏达成 / 经验爆发音效 (macOS AirDrop & Chime Inspired Harmonic Fanfare)
   */
  playBountyComplete() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 纯净明亮的 Apple 大调和弦 (F# Maj9: F#5, A#5, C#6, F6, G#6)
    const notes = [739.99, 932.33, 1108.73, 1396.91, 1661.22];

    // 温润低频底垫 (Warm Sub Bass)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(184.99, t);
    subOsc.frequency.exponentialRampToValueAtTime(92.50, t + 0.45);
    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.5);

    // 晶莹阶梯泛音 (Bell-like arpeggiated resonance)
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  /**
   * 3. 击破瓶颈 BOSS 弱点重击音效 (Deep Physical Impact & Metallic Fracture)
   */
  playBossDamage() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // 沉稳震撼次低音冲量
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.32);

    // 破防金属结晶微颤 (Apple-grade crisp crack)
    const glassOsc = this.ctx.createOscillator();
    const glassGain = this.ctx.createGain();
    glassOsc.type = 'triangle';
    glassOsc.frequency.setValueAtTime(1400, t);
    glassOsc.frequency.exponentialRampToValueAtTime(400, t + 0.16);
    glassGain.gain.setValueAtTime(0.2, t);
    glassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    glassOsc.connect(glassGain);
    glassGain.connect(this.masterGain);
    glassOsc.start(t);
    glassOsc.stop(t + 0.18);
  }

  /**
   * 4. 发动战术透镜虚空施法音效 (Apple Intelligence / Siri Iridescent Chime)
   */
  playSpellCast() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, t);
    osc1.frequency.exponentialRampToValueAtTime(1320, t + 0.22);
    osc1.frequency.exponentialRampToValueAtTime(880, t + 0.45);

    gain1.gain.setValueAtTime(0.01, t);
    gain1.gain.linearRampToValueAtTime(0.28, t + 0.12);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.5);

    // 伴随微光高频微颤
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(1760, t + 0.08);
    shimmer.frequency.exponentialRampToValueAtTime(2640, t + 0.35);

    shimmerGain.gain.setValueAtTime(0.08, t + 0.08);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);
    shimmer.start(t + 0.08);
    shimmer.stop(t + 0.4);
  }

  /**
   * 5. 认知等级晋升音效 (Apple Watch Activity Rings Triple Close Celebration)
   */
  playLevelUp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [
      [523.25, 659.25, 783.99],          // C5
      [587.33, 739.99, 880.00],          // D5
      [659.25, 830.61, 987.77],          // E5
      [783.99, 987.77, 1174.66, 1567.98] // G5 Victory Chime
    ];

    chords.forEach((chord, i) => {
      const start = t + i * 0.14;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        const duration = i === chords.length - 1 ? 0.95 : 0.22;
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + duration);
      });
    });
  }
}

// 导出单例
window.audioFx = new AudioFxEngine();
