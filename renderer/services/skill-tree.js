// renderer/services/skill-tree.js
/**
 * 探索里程碑与认知胜利成就系统 (Apple Fitness+ & Triumphs Inspired Engine)
 * 采用 Apple Fitness+ 奖章成就与专属特性赋能机制：
 * - 强化玩家在面对未知探索时的心理复原力与探索驱动力
 * - 每次达成一线实测、击破伪迹、剪枝假说均累积荣耀点数与专属徽章
 */

class SkillTreeEngine {
  constructor() {
    this.triumphs = [
      {
        id: 'tri_breaker',
        title: '破壁人 (Bottleneck Breaker)',
        icon: '🗡️',
        category: 'combat',
        desc: '精准识别并击破守门瓶颈 BOSS，打破停滞僵局。',
        progress: 1,
        maxProgress: 3,
        rewardXp: 500,
        claimed: false,
        perk: '【破障光环】：面对高难度未解问题时，顾问优先给出弱点排查矩阵。'
      },
      {
        id: 'tri_occam',
        title: '奥卡姆剃刀 (Occam Razor)',
        icon: '🪒',
        category: 'logic',
        desc: '通过反例测试剪除 3 条不必要的复杂假说，坚持极简解释。',
        progress: 2,
        maxProgress: 3,
        rewardXp: 350,
        claimed: false,
        perk: '【思维减负】：自动过滤 40% 泛化综述与无意义忙碌建议。'
      },
      {
        id: 'tri_ground_truth',
        title: '真实接触 (Ground Truth Contact)',
        icon: '👁️',
        category: 'evidence',
        desc: '获取一线受试实测原始数据或实验证物，直面客观物理事实。',
        progress: 2,
        maxProgress: 4,
        rewardXp: 400,
        claimed: false,
        perk: '【证据倍增】：每沉淀一条硬核证物，核心收敛度 ΔQt 额外 +2%。'
      },
      {
        id: 'tri_blitz',
        title: '行动闪击 (Action Blitz)',
        icon: '⚡',
        category: 'action',
        desc: '拒绝“永远准备不行动”，在 30 分钟内完成极小闭环微悬赏。',
        progress: 3,
        maxProgress: 5,
        rewardXp: 300,
        claimed: true,
        perk: '【惯性击穿】：在桌面 HUD 一键达成悬赏，多巴胺奖励翻倍。'
      },
      {
        id: 'tri_fog_walker',
        title: '迷雾穿行者 (Fog Navigator)',
        icon: '🧭',
        category: 'exploration',
        desc: '单一探索课题的认知收敛度突破 50%，驱散首层战争迷雾。',
        progress: 58,
        maxProgress: 100,
        rewardXp: 600,
        claimed: true,
        perk: '【全景洞察】：解锁育碧式线索调查画布的全局因果能量流动流向。'
      }
    ];

    this.ranks = [
      { level: 1, title: '探索见习生 (Novice Explorer)', minXp: 0, maxXp: 500 },
      { level: 5, title: '现象观测手 (Phenomenon Watcher)', minXp: 501, maxXp: 1200 },
      { level: 10, title: '假说侦探 (Hypothesis Detective)', minXp: 1201, maxXp: 2200 },
      { level: 14, title: '因果先锋 (Causal Pioneer)', minXp: 2201, maxXp: 3500 },
      { level: 20, title: '认知霸主 (Cognitive Archon)', minXp: 3501, maxXp: 10000 }
    ];
  }

  openModal() {
    const modal = document.getElementById('skillTreeModal');
    if (!modal) return;
    this.renderModal();
    modal.classList.remove('hidden');
    if (window.audioFx) window.audioFx.playSpellCast();
  }

  closeModal() {
    const modal = document.getElementById('skillTreeModal');
    if (modal) modal.classList.add('hidden');
  }

  claimTriumph(id) {
    const item = this.triumphs.find(t => t.id === id);
    if (!item || item.claimed || item.progress < item.maxProgress) return;

    item.claimed = true;

    // 播放 Apple 升级和弦与金色粒子
    if (window.audioFx) window.audioFx.playLevelUp();
    if (window.particleFx) {
      const btn = document.getElementById(`claim-btn-${id}`);
      if (btn) window.particleFx.spawnBurstOnElement(btn, 'gold', 50);
    }

    // 增加 XP
    if (window.electronAPI && window.currentState) {
      window.currentState.playerProfile.totalXp += item.rewardXp;
      window.electronAPI.saveState(window.currentState);
    }

    this.renderModal();
  }

  renderModal() {
    const listEl = document.getElementById('triumphListContainer');
    if (!listEl) return;

    listEl.innerHTML = this.triumphs.map(t => {
      const isComplete = t.progress >= t.maxProgress;
      const pct = Math.min(100, Math.round((t.progress / t.maxProgress) * 100));

      return `
        <div class="p-4 rounded-2xl bg-white/5 border ${isComplete ? 'border-amber-400/40 bg-amber-500/5' : 'border-white/10'} hover:border-white/20 transition relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                ${t.icon}
              </div>
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-2">
                  <span>${t.title}</span>
                  ${isComplete ? '<span class="px-2 py-0.2 rounded-full text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">已达成</span>' : ''}
                </div>
                <div class="text-[10px] text-white/50 mt-0.5">${t.desc}</div>
              </div>
            </div>
            
            <div class="text-right flex flex-col items-end">
              <span class="text-xs font-mono font-bold text-amber-300">⚡ 阶段成就</span>
              ${isComplete && !t.claimed ? `
                <button id="claim-btn-${t.id}" onclick="skillTree.claimTriumph('${t.id}')" class="apple-capsule-btn mt-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] shadow-lg transition">
                  领取奖励
                </button>
              ` : t.claimed ? `
                <span class="text-[10px] text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">✓ 已领勋章</span>
              ` : `
                <span class="text-[10px] text-white/40 font-mono mt-1.5">${t.progress} / ${t.maxProgress}</span>
              `}
            </div>
          </div>

          <!-- 苹果风格进度胶囊条 (Apple Pill Progress Bar) -->
          <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden p-0.5 border border-white/5 mt-2.5">
            <div class="${isComplete ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 'bg-gradient-to-r from-sky-400 to-indigo-500'} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
          </div>

          <!-- 特性赋能说明 (Apple Sub-perk Capsule) -->
          <div class="mt-2.5 text-[10px] text-sky-200/90 bg-sky-500/10 p-2.5 rounded-xl border border-sky-400/20">
            ${t.perk}
          </div>
        </div>
      `;
    }).join('');
  }
}

window.skillTree = new SkillTreeEngine();
