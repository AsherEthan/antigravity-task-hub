// renderer/services/command-palette.js
/**
 * 苹果 Spotlight / Raycast 风格全局统一指令中枢 (Command Palette Engine)
 * 快捷键: Ctrl+K / Cmd+K
 * 支持线索全局模糊检索、战术透镜施法、悬赏达成、圣物库与视窗快捷操控
 */

class CommandPaletteEngine {
  constructor() {
    this.isOpen = false;
    this.items = [];
    this.filtered = [];
    this.selectedIndex = 0;
  }

  init() {
    // 监听全局 Ctrl+K 或 Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    const input = document.getElementById('paletteSearchInput');
    if (input) {
      input.addEventListener('input', (e) => this.onSearch(e.target.value));
      input.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.buildIndex();
    this.filtered = [...this.items];
    this.selectedIndex = 0;
    this.render();

    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.classList.remove('hidden');

    const input = document.getElementById('paletteSearchInput');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (window.audioFx) window.audioFx.playClueAdded();
  }

  close() {
    this.isOpen = false;
    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.classList.add('hidden');
  }

  buildIndex() {
    this.items = [];
    const state = window.currentState || {};
    const proj = state.activeProject || {};
    const clues = proj.clues || [];

    // 1. 战术透镜技能
    this.items.push(
      { type: 'spell', title: '🔍 穿透追问分析 (Socratic Drill)', desc: '防过早定义，挖掘底层未经检验的假定', action: () => castTacticalSpell('socratic') },
      { type: 'spell', title: '💡 竞争假说发散 (Hypothesis Spectrum)', desc: '打破单一执念，构建独立机制假说', action: () => castTacticalSpell('hypotheses') },
      { type: 'spell', title: '⚡ 最小验证设计 (Minimal Viable Test)', desc: '击破Action=0，设计15分钟极低成本实测', action: () => castTacticalSpell('test') },
      { type: 'spell', title: '🎯 失败层级归因 (Failure Attribution)', desc: '分层排查：测量伪迹？参数错？假设漏洞？', action: () => castTacticalSpell('attribution') }
    );

    // 2. 快捷系统动作
    this.items.push(
      { type: 'action', title: '✓ 达成即刻行动悬赏 (Bounty)', desc: '结算当前行动，推进因果拓扑与探索收敛', action: () => handleCompleteBounty() },
      { type: 'action', title: '⟳ 智能因果重排画布 (Auto-DAG Layout)', desc: '一键按照 观察→疑问→假说→证物→瓶颈 优雅排列', action: () => { if (window.clueCanvas) window.clueCanvas.autoLayoutDAG(); } },
      { type: 'action', title: '💎 查看认知圣物库 (Relic Vault)', desc: '检查已解锁的神器被动加成与佩戴状态', action: () => { if (window.relicEngine) window.relicEngine.openVaultModal(); } },
      { type: 'action', title: '🏆 探索里程碑与成就殿堂 (Triumphs)', desc: '查看探索胜利称号与特性赋能', action: () => { if (window.skillTree) window.skillTree.openModal(); } },
      { type: 'action', title: '📌 显示/隐藏桌面常驻 HUD', desc: '极简悬浮小组件切换 (Alt+H)', action: () => toggleHudOverlay() }
    );

    // 3. 线索搜索索引
    clues.forEach(c => {
      this.items.push({
        type: 'clue',
        title: `${this.getClueTypeIcon(c.type)} ${c.title || c.content.slice(0, 20)}`,
        desc: c.content,
        action: () => {
          if (window.clueCanvas) {
            window.clueCanvas.selectedNodeId = c.id;
            window.clueCanvas.focusNode(c.id);
          }
          inspectClue(c.id);
        }
      });
    });
  }

  getClueTypeIcon(type) {
    const map = { observation: '👁️', question: '❓', hypothesis: '💡', evidence: '🔬', bottleneck: '🔥' };
    return map[type] || '📄';
  }

  onSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.items];
    } else {
      this.filtered = this.items.filter(item => 
        item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.render();
  }

  onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.filtered.length);
      this.render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.filtered.length) % Math.max(1, this.filtered.length);
      this.render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = this.filtered[this.selectedIndex];
      if (selected && selected.action) {
        this.close();
        selected.action();
      }
    }
  }

  render() {
    const listEl = document.getElementById('paletteResultsList');
    if (!listEl) return;

    if (this.filtered.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center text-xs text-white/40">
          未检索到相关指令或线索。输入关键词搜索...
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.filtered.map((item, idx) => {
      const isSelected = idx === this.selectedIndex;
      const typeTag = {
        spell: '<span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-sky-500/15 text-sky-300 border border-sky-400/25">透镜推演</span>',
        action: '<span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">快捷动作</span>',
        clue: '<span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-purple-500/15 text-purple-300 border border-purple-400/25">线索节点</span>'
      }[item.type] || '';

      return `
        <div onclick="commandPalette.executeItem(${idx})" class="p-3 rounded-xl flex items-center justify-between cursor-pointer transition ${isSelected ? 'bg-sky-500/20 border border-sky-400/35 text-white' : 'hover:bg-white/5 text-white/80'}">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <div>
              <div class="text-xs font-bold flex items-center gap-2 tracking-tight">
                <span>${item.title}</span>
                ${typeTag}
              </div>
              <div class="text-[10px] text-white/50 line-clamp-1 mt-0.5">${item.desc}</div>
            </div>
          </div>
          <span class="text-xs text-white/40 font-mono ${isSelected ? 'text-sky-300 font-bold' : ''}">↵</span>
        </div>
      `;
    }).join('');
  }

  executeItem(index) {
    const item = this.filtered[index];
    if (item && item.action) {
      this.close();
      item.action();
    }
  }
}

window.commandPalette = new CommandPaletteEngine();
