// renderer/services/relic-engine.js
/**
 * 认知圣物与战利品宝库系统 (Epistemic Relic Vault & Loot Engine)
 * 借鉴 Habitica & RPG 战利品与被动装备机制：
 * - 击破守门 BOSS 或达成高连击时，几率掉落探索认知神器
 * - 佩戴圣物可获得持续的被动认知增益 (Passive Buffs: 伤害提升、收敛加速、连击暴击)
 * - 采用 Apple visionOS 空间暗金卡片与多层毛玻璃高光呈现
 */

class RelicEngine {
  constructor() {
    this.equippedRelics = [];
  }

  getEquippedBuffs() {
    const relics = window.currentState?.playerProfile?.relicVault || [];
    return relics.filter(r => r.equipped && r.unlockedAt);
  }

  hasBuff(buffType) {
    const equipped = this.getEquippedBuffs();
    return equipped.some(r => r.buffText && r.buffText.includes(buffType));
  }

  openVaultModal() {
    const modal = document.getElementById('relicVaultModal');
    if (!modal) return;
    this.renderVault();
    modal.classList.remove('hidden');
    if (window.audioFx) window.audioFx.playSpellCast();
  }

  closeVaultModal() {
    const modal = document.getElementById('relicVaultModal');
    if (modal) modal.classList.add('hidden');
  }

  async toggleEquip(relicId) {
    if (!window.electronAPI) return;
    if (window.audioFx) window.audioFx.playClueAdded();
    await window.electronAPI.toggleEquipRelic(relicId);
    this.renderVault();
  }

  renderVault() {
    const listEl = document.getElementById('relicListContainer');
    if (!listEl) return;

    const relics = window.currentState?.playerProfile?.relicVault || [];

    const rarityConfig = {
      rare: { badge: '稀有 RARE', color: 'text-sky-300 border-sky-400/30 bg-sky-500/10' },
      epic: { badge: '史诗 EPIC', color: 'text-purple-300 border-purple-400/30 bg-purple-500/10' },
      legendary: { badge: '传说 LEGENDARY', color: 'text-amber-300 border-amber-400/40 bg-amber-500/15' }
    };

    listEl.innerHTML = relics.map(r => {
      const cfg = rarityConfig[r.rarity] || rarityConfig.rare;
      const isUnlocked = !!r.unlockedAt;

      return `
        <div class="apple-glass-card p-4 border ${r.equipped ? 'border-amber-400/50 bg-amber-500/5' : isUnlocked ? 'border-white/15' : 'border-white/5 opacity-55'} flex items-center justify-between gap-4 transition">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-black/50 border ${isUnlocked ? 'border-white/20' : 'border-white/5'} flex items-center justify-center text-2xl shadow-inner ${r.equipped ? 'shadow-amber-500/20' : ''}">
              ${isUnlocked ? r.icon : '🔒'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white tracking-tight">${r.name}</span>
                <span class="px-2 py-0.2 rounded-full text-[9px] font-mono border ${cfg.color}">${cfg.badge}</span>
                ${r.equipped ? '<span class="px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-400 text-slate-950">已佩戴</span>' : ''}
              </div>
              <p class="text-[11px] text-white/60 mt-1 leading-snug">${r.desc}</p>
              <div class="mt-1 text-[10px] font-mono text-emerald-400 font-semibold">⚡ ${r.buffText}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${isUnlocked ? `
              <button onclick="relicEngine.toggleEquip('${r.id}')" class="apple-capsule-btn px-3 py-1 text-xs font-bold ${r.equipped ? 'bg-white/10 hover:bg-white/15 text-white/70 border border-white/15' : 'apple-btn-primary shadow-md'} transition">
                ${r.equipped ? '卸下' : '佩戴'}
              </button>
            ` : `
              <span class="text-[10px] text-white/30 font-mono">待击破BOSS掉落</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 触发战利品掉落展示 (Apple-style Loot Drop Toast)
   */
  showLootDrop(relic) {
    if (!relic) return;

    // 播放音效与粒子
    if (window.audioFx) window.audioFx.playLevelUp();
    if (window.particleFx) window.particleFx.spawnBurst(window.innerWidth / 2, window.innerHeight / 3, 'gold', 60);

    const popup = document.getElementById('lootDropPopup');
    if (!popup) return;

    document.getElementById('lootIcon').innerText = relic.icon || '🎁';
    document.getElementById('lootTitle').innerText = relic.name;
    document.getElementById('lootDesc').innerText = relic.desc;
    document.getElementById('lootBuff').innerText = '⚡ ' + relic.buffText;

    popup.classList.remove('hidden');
    popup.classList.remove('scale-90', 'opacity-0');
    popup.classList.add('scale-100', 'opacity-100');

    setTimeout(() => {
      this.closeLootDrop();
    }, 4500);
  }

  closeLootDrop() {
    const popup = document.getElementById('lootDropPopup');
    if (popup) {
      popup.classList.add('scale-90', 'opacity-0');
      setTimeout(() => popup.classList.add('hidden'), 300);
    }
  }
}

window.relicEngine = new RelicEngine();
