// renderer/services/boss-engine.js
/**
 * 守门瓶颈 BOSS 战斗系统 (Apple Pro Aesthetic Bottleneck Engine)
 * 将马斯克第一瓶颈与未解难题具象化为首领 BOSS：
 * - 结合 visionOS 空间暗红毛玻璃、苹果 Health 风格韧性胶囊条、高光弱点徽章
 * - 用户每完成一次即刻悬赏或沉淀实测硬核证物，对 BOSS 产生真实伤害破防
 * - 击破 BOSS 产生强多巴胺激励反馈，推进收敛度 (ΔQt) 与章节进化
 */

class BossEngine {
  constructor() {
    this.currentHp = 65;
    this.maxHp = 100;
    this.bossName = '击破「前额肌电与微眼动伪迹」';
    this.bossDesc = '消费级脑电仪的 Theta 波 70% 疑似为眼球微颤与前额肌电伪迹，是阻碍分类模型成立的单一核心卡点。';
    this.weaknesses = [
      { id: 'phys', name: '物理对照', multiplier: '2.0x 暴击', desc: '遮光眼罩双盲实测' },
      { id: 'stat', name: '频段方差', multiplier: '1.5x 破防', desc: '4-8Hz 衰减率统计' },
      { id: 'data', name: '实测证物', multiplier: '2.5x 致命', desc: '采集 10 组眼动基线' }
    ];
    this.isDefeated = false;
  }

  init(initialHp = 65, maxHp = 100) {
    this.currentHp = initialHp;
    this.maxHp = maxHp;
    this.isDefeated = this.currentHp <= 0;
    this.render();
  }

  updateFromCockpit(cockpit = {}) {
    if (cockpit.currentBottleneck) {
      this.bossDesc = cockpit.currentBottleneck;
      this.bossName = `击破「${cockpit.currentBottleneck.slice(0, 18)}...」`;
    }
    if (cockpit.actionCompleted && this.currentHp > 30) {
      this.currentHp = 30; // 行动已完成，处于重伤状态
    }
    this.render();
  }

  /**
   * 对 BOSS 造成伤害
   * @param {number} damage
   * @param {string} sourceName
   */
  dealDamage(damage = 35, sourceName = '行动悬赏达成') {
    if (this.isDefeated) return;

    this.currentHp = Math.max(0, this.currentHp - damage);

    // 播放 Apple 声学触觉打击音效
    if (window.audioFx) {
      window.audioFx.playBossDamage();
    }

    // 触发受击抖动与飘字特效
    const bossCard = document.getElementById('bossBattleCard');
    if (bossCard) {
      bossCard.classList.remove('boss-shake');
      void bossCard.offsetWidth; // 触发 reflow 重置动画
      bossCard.classList.add('boss-shake');

      this.spawnFloatingDamage(bossCard, `-${damage} 弱点暴击!`, '#FF453A');

      if (window.particleFx) {
        window.particleFx.spawnBurstOnElement(bossCard, 'crimson', 35);
      }
    }

    this.render();

    // 击破判定
    if (this.currentHp <= 0 && !this.isDefeated) {
      this.isDefeated = true;
      this.handleDefeat();
    }
  }

  spawnFloatingDamage(container, text, color = '#FF453A') {
    const el = document.createElement('div');
    el.className = 'floating-damage font-black text-sm tracking-wider pointer-events-none';
    el.innerText = text;
    el.style.color = color;
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '40%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.zIndex = '50';
    container.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 1300);
  }

  handleDefeat() {
    setTimeout(() => {
      if (window.audioFx) {
        window.audioFx.playLevelUp();
      }
      const bossCard = document.getElementById('bossBattleCard');
      if (bossCard && window.particleFx) {
        window.particleFx.spawnBurstOnElement(bossCard, 'gold', 55);
      }
    }, 350);
  }

  render() {
    const titleEl = document.getElementById('bossTitle');
    const contentEl = document.getElementById('bossContent');
    const hpBar = document.getElementById('bossHpBar');
    const hpText = document.getElementById('bossHpText');
    const statusBadge = document.getElementById('bossStatusBadge');

    if (titleEl) titleEl.innerText = this.bossName;
    if (contentEl) contentEl.innerText = this.bossDesc;

    const hpPercent = Math.max(0, Math.min(100, Math.round((this.currentHp / this.maxHp) * 100)));

    if (hpBar) {
      hpBar.style.width = `${hpPercent}%`;
      if (hpPercent <= 30) {
        hpBar.className = 'bg-rose-500 h-full rounded-full transition-all duration-700';
      } else if (hpPercent <= 60) {
        hpBar.className = 'bg-amber-400 h-full rounded-full transition-all duration-700';
      } else {
        hpBar.className = 'bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 h-full rounded-full transition-all duration-700';
      }
    }

    if (hpText) {
      hpText.innerText = `HP ${this.currentHp} / ${this.maxHp} (${hpPercent}%)`;
    }

    if (statusBadge) {
      if (this.currentHp <= 0) {
        statusBadge.innerText = '🏆 已击破歼灭';
        statusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white';
      } else if (this.currentHp <= 30) {
        statusBadge.innerText = '⚡ 濒死破防';
        statusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 animate-pulse';
      } else {
        statusBadge.innerText = '🔥 狂暴守门中';
        statusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white';
      }
    }
  }
}

window.bossEngine = new BossEngine();
