// renderer/services/particles.js
/**
 * 高性能游戏粒子与战争迷雾系统 (Particle FX & Fog of War Engine)
 * 用于营造多巴胺喷涌、打击感与探索迷雾点亮体验
 */

class ParticleFxEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.fogClouds = [];
    this.animationFrameId = null;
    this.fogDensity = 0.45; // 迷雾浓度 (随收敛度上升而消散)
  }

  init(canvasId = 'fxCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initFogClouds();
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initFogClouds() {
    this.fogClouds = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      this.fogClouds.push({
        x: Math.random() * (this.canvas ? this.canvas.width : 1200),
        y: Math.random() * (this.canvas ? this.canvas.height : 800),
        radius: 180 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        baseAlpha: 0.04 + Math.random() * 0.05
      });
    }
  }

  updateFogConvergence(convergenceRate = 58) {
    // 收敛度越高，战争迷雾越稀薄，清晰度越高
    this.fogDensity = Math.max(0.1, 0.6 - (convergenceRate / 100) * 0.45);
  }

  /**
   * 爆发粒子 (Burst at coordinate)
   * @param {number} x
   * @param {number} y
   * @param {string} theme 'gold' | 'crimson' | 'cyan' | 'purple'
   * @param {number} count
   */
  spawnBurst(x, y, theme = 'gold', count = 35) {
    const colors = {
      gold: ['#facc15', '#fde047', '#eab308', '#ffffff'],
      crimson: ['#f43f5e', '#fb7185', '#e11d48', '#fda4af'],
      cyan: ['#38bdf8', '#7dd3fc', '#0284c7', '#ffffff'],
      purple: ['#c084fc', '#d8b4fe', '#a855f7', '#ffffff']
    };
    const palette = colors[theme] || colors.gold;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 6.5;
      const life = 40 + Math.random() * 45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // 初始轻微向上
        gravity: 0.12,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: 2.5 + Math.random() * 3.5,
        alpha: 1,
        life,
        maxLife: life,
        decay: 1 / life
      });
    }
  }

  /**
   * 在某个 DOM 元素中心爆发粒子
   */
  spawnBurstOnElement(el, theme = 'gold', count = 35) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    this.spawnBurst(x, y, theme, count);
  }

  loop() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 绘制环境战争迷雾粒子 (Ambient Fog of War)
    this.ctx.save();
    this.fogClouds.forEach(cloud => {
      cloud.x += cloud.vx;
      cloud.y += cloud.vy;
      if (cloud.x < -cloud.radius) cloud.x = this.canvas.width + cloud.radius;
      if (cloud.x > this.canvas.width + cloud.radius) cloud.x = -cloud.radius;
      if (cloud.y < -cloud.radius) cloud.y = this.canvas.height + cloud.radius;
      if (cloud.y > this.canvas.height + cloud.radius) cloud.y = -cloud.radius;

      const grad = this.ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, cloud.radius
      );
      const alpha = cloud.baseAlpha * this.fogDensity;
      grad.addColorStop(0, `rgba(56, 189, 248, ${alpha * 1.5})`);
      grad.addColorStop(0.5, `rgba(99, 102, 241, ${alpha * 0.8})`);
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();

    // 2. 绘制与更新动态爆发粒子 (Action Particles)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
}

window.particleFx = new ParticleFxEngine();
