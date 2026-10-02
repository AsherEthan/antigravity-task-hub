// renderer/index.js
/**
 * 战术指挥大屏前端控制器 (Apple Pro Edition)
 */

let currentState = null;
let currentFilter = 'all';
let selectedNewType = 'observation';
let lastLensResult = null;
let currentClueView = 'canvas'; // 'canvas' | 'cards'

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
  // 1. 初始化引擎单例
  if (window.particleFx) {
    window.particleFx.init('fxCanvas');
  }

  if (window.clueCanvas) {
    window.clueCanvas.init('clueCanvas', (selectedNode) => {
      onClueNodeSelected(selectedNode);
    });
  }

  if (window.bossEngine) {
    window.bossEngine.init(65, 100);
  }

  if (window.commandPalette) {
    window.commandPalette.init();
  }

  if (!window.electronAPI) return;

  // 2. 监听全系统状态变更广播
  window.electronAPI.onStateUpdate((state) => {
    currentState = state;
    window.currentState = state;
    renderAll(state);
  });

  // 3. 初始拉取状态
  currentState = await window.electronAPI.getState();
  window.currentState = currentState;
  renderAll(currentState);

  // 4. 绑定快捷录入键盘监听 (Cmd/Ctrl+Enter 或 Enter)
  const inputArea = document.getElementById('quickInputArea');
  if (inputArea) {
    inputArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
        e.preventDefault();
        dispatchIntel();
      }
    });
  }
});

function renderAll(state) {
  if (!state) return;

  const proj = state.activeProject || {};
  const cockpit = proj.cockpit || {};
  const profile = state.playerProfile || {};
  const clues = proj.clues || [];

  // 1. 顶栏课题与度量
  const toolbarTitle = document.getElementById('navToolbarTitle');
  if (toolbarTitle) toolbarTitle.innerText = proj.title || '探索课题';

  document.getElementById('campaignTitle').innerText = (proj.title || '探索课题') + ' ▾';
  document.getElementById('campaignChapterLabel').innerText = proj.currentChapter || '第 1 阶段';
  const rankEl = document.getElementById('playerRank');
  if (rankEl) {
    rankEl.innerText = 'Stage 2 · 因果收敛';
  }
  document.getElementById('convergenceLabel').innerText = (profile.convergenceRate || 50) + '%';
  document.getElementById('convergenceBar').style.width = (profile.convergenceRate || 50) + '%';
  document.getElementById('possibilityLabel').innerText = (profile.possibilityCount || 10) + ' 路径';

  const stepsEl = document.getElementById('verifiedStepsLabel');
  if (stepsEl) {
    const steps = profile.completedStepsCount || 0;
    stepsEl.innerText = `已验证 ${steps} 步`;
  }

  // 2. 更新战争迷雾透明度 (随着收敛度提升而消散)
  if (window.particleFx) {
    window.particleFx.updateFogConvergence(profile.convergenceRate || 58);
  }

  // 3. 更新守门 BOSS
  if (window.bossEngine) {
    window.bossEngine.updateFromCockpit(cockpit);
  }

  // 4. 中栏主线核心问题与进度
  document.getElementById('questCoreQuestion').innerText = cockpit.coreQuestion || '尚未确立主线目标';
  const questProg = document.getElementById('questActionProgress');
  const questProgText = document.getElementById('questActionProgressText');
  if (cockpit.actionCompleted) {
    if (questProg) questProg.style.width = '100%';
    if (questProgText) questProgText.innerText = '100% 已达成';
  } else {
    if (questProg) questProg.style.width = '70%';
    if (questProgText) questProgText.innerText = '70%';
  }

  // 5. 右栏即刻悬赏
  document.getElementById('bountyTitle').innerText = cockpit.nextAction || '暂无行动悬赏';
  const bountyBtn = document.getElementById('btnWarRoomCheck');
  if (bountyBtn) {
    if (cockpit.actionCompleted) {
      bountyBtn.innerHTML = '<span>🎉 已达成! 推进因果闭环</span>';
      bountyBtn.className = 'apple-capsule-btn px-3.5 py-1 bg-sky-600 text-white font-bold text-xs shadow';
    } else {
      bountyBtn.innerHTML = '<span>✓ 达成行动</span>';
      bountyBtn.className = 'apple-capsule-btn apple-btn-success px-3.5 py-1 text-xs font-bold shadow-lg';
    }
  }

  // 6. 战术顾问锐评
  document.getElementById('tacticalAdvisorText').innerText = cockpit.tacticalCritique || '战术顾问正在分析当前探索拓扑...';

  // 7. 更新育碧式线索调查 Canvas 与卡片列表
  if (window.clueCanvas) {
    window.clueCanvas.setData(clues);
  }
  renderClues(clues);

  // 8. 应用已保存的苹果主题风格
  const savedTheme = state.userSettings?.gameTheme || 'apple-dark-theme';
  applyThemeUI(savedTheme);

  // 9. 更新课题切换列表
  renderProjectList(state.projects || [], state.activeProjectId);
}

function renderClues(clues) {
  const container = document.getElementById('clueCardsContainer');
  if (!container) return;

  const obsCount = clues.filter(c => c.type === 'observation').length;
  const queCount = clues.filter(c => c.type === 'question').length;
  const hypCount = clues.filter(c => c.type === 'hypothesis').length;
  const eviCount = clues.filter(c => c.type === 'evidence').length;

  document.getElementById('cnt-all').innerText = clues.length;
  document.getElementById('cnt-obs').innerText = obsCount;
  document.getElementById('cnt-que').innerText = queCount;
  document.getElementById('cnt-hyp').innerText = hypCount;
  document.getElementById('cnt-evi').innerText = eviCount;
  document.getElementById('clueTotalBadge').innerText = `${clues.length} 条`;
  document.getElementById('clueStreamCount').innerText = `${clues.length} 节点`;

  const filtered = clues.filter(c => {
    if (currentFilter === 'all') return true;
    return c.type === currentFilter;
  });

  const typeConfig = {
    observation: { label: '👁️ 观察记录', border: 'border-l-sky-400', tag: 'text-sky-300 bg-sky-500/15 border-sky-400/25' },
    question: { label: '❓ 探究线索', border: 'border-l-purple-400', tag: 'text-purple-300 bg-purple-500/15 border-purple-400/25' },
    hypothesis: { label: '💡 机制假说', border: 'border-l-amber-400', tag: 'text-amber-300 bg-amber-500/15 border-amber-400/25' },
    evidence: { label: '🔬 实测证物', border: 'border-l-emerald-400', tag: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/25' },
    bottleneck: { label: '🚧 瓶颈阻碍', border: 'border-l-rose-500', tag: 'text-rose-300 bg-rose-500/15 border-rose-400/25' }
  };

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-xs text-white/40 bg-white/5 rounded-2xl border border-white/5">
        该分类下暂无线索情报。在左侧快速录入一条新线索吧！
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const meta = typeConfig[c.type] || typeConfig.observation;
    const timeStr = formatRelativeTime(c.timestamp);
    return `
      <div class="apple-glass-card p-3.5 border-l-4 ${meta.border} hover:border-white/25 transition">
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="inline-flex items-center gap-1.5 ${meta.tag} border font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
            ${meta.label}
          </span>
          <span class="text-[10px] text-white/40 font-mono">${timeStr}</span>
        </div>
        <div class="text-xs font-bold text-white mb-1 tracking-tight">${c.title || c.content.slice(0, 24)}</div>
        <p class="text-xs text-white/70 leading-relaxed">${c.content}</p>
        <div class="mt-2.5 text-[10px] text-white/40 flex items-center justify-between pt-2 border-t border-white/10">
          <span>${c.parentId ? `↳ 承接前序因果` : '● 根基事实'}</span>
          <button onclick="inspectClue('${c.id}')" class="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition">
            <span>发动透镜推演 ›</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 切换画布视图 vs 卡片流 (Apple Segmented Style)
function switchClueView(view) {
  currentClueView = view;
  const canvasContainer = document.getElementById('clueCanvasContainer');
  const cardsWrapper = document.getElementById('clueCardsWrapper');
  const btnCanvas = document.getElementById('btnViewCanvas');
  const btnCards = document.getElementById('btnViewCards');

  if (view === 'canvas') {
    canvasContainer.classList.remove('hidden');
    cardsWrapper.classList.add('hidden');
    btnCanvas.className = 'apple-segment-btn active';
    btnCards.className = 'apple-segment-btn';
    if (window.clueCanvas) window.clueCanvas.resize();
  } else {
    canvasContainer.classList.add('hidden');
    cardsWrapper.classList.remove('hidden');
    btnCards.className = 'apple-segment-btn active';
    btnCanvas.className = 'apple-segment-btn';
  }
}

// 重置画布视角
function resetCanvasView() {
  if (window.clueCanvas) {
    window.clueCanvas.panOffset = { x: 0, y: 0 };
    window.clueCanvas.zoom = 1.0;
  }
}

// 点击画布节点响应
function onClueNodeSelected(node) {
  if (!node) return;
  if (window.audioFx) window.audioFx.playClueAdded();
  // 弹出战术透镜弹窗
  castTacticalSpell('socratic', node);
}

// 切换录入类型
function setNewIntelType(type) {
  selectedNewType = type;
  ['obs', 'que', 'hyp', 'evi', 'bot'].forEach(k => {
    const el = document.getElementById('tab-' + k);
    if (el) el.className = 'py-1 text-[11px] font-medium rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white transition';
  });
  const activeEl = document.getElementById('tab-' + type.slice(0, 3));
  if (activeEl) {
    activeEl.className = 'py-1 text-[11px] font-bold rounded-lg border border-sky-400/40 bg-sky-500/20 text-sky-300 transition';
  }
}

// 快速录入情报
async function dispatchIntel() {
  const textarea = document.getElementById('quickInputArea');
  const text = textarea.value.trim();
  if (!text) return;

  const typeTitles = {
    observation: '现象目击记录',
    question: '核心探究线索',
    hypothesis: '因果机制假说',
    evidence: '实测数据证据',
    bottleneck: '关键阻碍点'
  };

  // Apple 声学触觉反馈与粒子爆发
  if (window.audioFx) window.audioFx.playClueAdded();
  const btn = document.getElementById('btnDispatchIntel');
  if (btn && window.particleFx) window.particleFx.spawnBurstOnElement(btn, 'cyan', 25);

  await window.electronAPI.addClue({
    type: selectedNewType,
    title: typeTitles[selectedNewType] || '新情报',
    content: text
  });

  textarea.value = '';
}

// 达成行动悬赏
async function handleCompleteBounty() {
  const btn = document.getElementById('btnWarRoomCheck');

  // 1. 播放苹果级晶莹和弦音效
  if (window.audioFx) window.audioFx.playBountyComplete();

  // 2. 爆发金色粒子烟花
  if (btn && window.particleFx) {
    window.particleFx.spawnBurstOnElement(btn, 'gold', 55);
  }

  // 3. 计算对 BOSS 造成的破防伤害 (受认知圣物加成)
  let damage = 35;
  if (window.relicEngine?.hasBuff('BOSS 伤害')) {
    damage = Math.round(damage * 1.5);
  }

  if (window.bossEngine) {
    window.bossEngine.dealDamage(damage, '遮光眼罩 A/B 实测达成');
  }

  // 4. 持久化数据并处理掉落战利品
  const result = await window.electronAPI.completeAction();
  if (result?.droppedRelic && window.relicEngine) {
    setTimeout(() => {
      window.relicEngine.showLootDrop(result.droppedRelic);
    }, 450);
  }
}

// 施放战术透镜推演 (Siri Iridescent Spell Cast)
async function castTacticalSpell(lensKey, targetContext) {
  const context = targetContext || {
    title: currentState?.activeProject?.cockpit?.coreQuestion || '核心目标',
    content: currentState?.activeProject?.cockpit?.currentBottleneck || ''
  };

  // Siri 虚空微颤音效
  if (window.audioFx) window.audioFx.playSpellCast();

  document.getElementById('modalSpellFocus').innerText = context.title || context.content;
  document.getElementById('modalSpellOutput').innerText = '正在调用战术推理引擎，计算因果矩阵与认知反例...';
  document.getElementById('spellModal').classList.remove('hidden');

  try {
    const res = await window.electronAPI.castLens(lensKey, context);
    lastLensResult = res;
    document.getElementById('modalSpellTitle').innerText = res.title;
    document.getElementById('modalSpellOutput').innerText = res.output;
  } catch (err) {
    document.getElementById('modalSpellOutput').innerText = '推演出现异常: ' + err.message;
  }
}

function inspectClue(clueId) {
  const clue = currentState?.activeProject?.clues?.find(c => c.id === clueId);
  if (clue) {
    castTacticalSpell('socratic', clue);
  }
}

function closeSpellModal() {
  document.getElementById('spellModal').classList.add('hidden');
}

async function spinoffToQuest() {
  if (!lastLensResult) return;
  if (window.audioFx) window.audioFx.playClueAdded();
  await window.electronAPI.addClue({
    type: 'hypothesis',
    title: '透镜推演衍生节点',
    content: lastLensResult.output.slice(0, 180)
  });
  closeSpellModal();
}

// 过滤线索
function filterClues(type) {
  currentFilter = type;
  ['all', 'obs', 'que', 'hyp', 'evi'].forEach(k => {
    const el = document.getElementById('filter-' + k);
    if (el) el.className = 'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-white/70 hover:bg-white/5 flex justify-between transition';
  });
  const activeEl = document.getElementById('filter-' + (type === 'all' ? 'all' : type.slice(0, 3)));
  if (activeEl) {
    activeEl.className = 'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 border border-white/15 text-sky-300 flex justify-between transition';
  }

  if (currentState?.activeProject) {
    renderClues(currentState.activeProject.clues || []);
  }
}

// 苹果主题风格切换
function setGameTheme(theme) {
  applyThemeUI(theme);
  if (currentState?.userSettings) {
    currentState.userSettings.gameTheme = theme;
    window.electronAPI.saveState(currentState);
  }
}

function applyThemeUI(theme) {
  let mappedTheme = theme;
  if (theme === 'destiny-theme') mappedTheme = 'apple-dark-theme';
  if (theme === 'mhw-theme') mappedTheme = 'apple-tahoe-theme';
  if (theme === 'maple-theme') mappedTheme = 'apple-space-theme';

  const body = document.getElementById('themeBody');
  if (body) {
    body.className = `${mappedTheme} min-h-screen flex flex-col font-sans select-none antialiased relative overflow-x-hidden transition-colors duration-500`;
  }

  const btnDark = document.getElementById('theme-btn-dark');
  const btnTahoe = document.getElementById('theme-btn-tahoe');
  const btnSpace = document.getElementById('theme-btn-space');

  if (btnDark) btnDark.className = mappedTheme === 'apple-dark-theme' ? 'apple-segment-btn active' : 'apple-segment-btn';
  if (btnTahoe) btnTahoe.className = mappedTheme === 'apple-tahoe-theme' ? 'apple-segment-btn active' : 'apple-segment-btn';
  if (btnSpace) btnSpace.className = mappedTheme === 'apple-space-theme' ? 'apple-segment-btn active' : 'apple-segment-btn';
}

function toggleHudOverlay() {
  window.electronAPI.toggleHud();
}

// 课题管理弹窗
function openProjectModal() {
  document.getElementById('projectModal').classList.remove('hidden');
}

function closeProjectModal() {
  document.getElementById('projectModal').classList.add('hidden');
}

function renderProjectList(projects, activeId) {
  const container = document.getElementById('projectListContainer');
  if (!container) return;

  container.innerHTML = projects.map(p => {
    const isActive = p.id === activeId;
    return `
      <div onclick="handleSwitchProject('${p.id}')" class="p-3.5 rounded-2xl border ${isActive ? 'border-sky-500/50 bg-sky-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'} cursor-pointer flex items-center justify-between transition">
        <div>
          <div class="text-xs font-bold text-white flex items-center gap-2">
            <span>${p.title}</span>
            ${isActive ? '<span class="px-2 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono border border-sky-400/30">当前战役</span>' : ''}
          </div>
          <div class="text-[10px] text-white/50 mt-0.5 line-clamp-1">${p.description || '无详细描述'}</div>
        </div>
        <span class="text-xs text-sky-400 font-bold">${isActive ? '●' : '›'}</span>
      </div>
    `;
  }).join('');
}

async function handleSwitchProject(projectId) {
  await window.electronAPI.switchProject(projectId);
  closeProjectModal();
}

async function handleCreateProject() {
  const titleEl = document.getElementById('newProjTitle');
  const descEl = document.getElementById('newProjDesc');
  const title = titleEl.value.trim();
  const description = descEl.value.trim();

  if (!title) return;

  await window.electronAPI.createProject({ title, description });
  titleEl.value = '';
  descEl.value = '';
  closeProjectModal();
}

// 设置弹窗
function openSettingsModal() {
  const settings = currentState?.userSettings || {};
  document.getElementById('inputApiKey').value = settings.apiKey || '';
  document.getElementById('inputBaseUrl').value = settings.baseUrl || 'https://api.deepseek.com/v1';
  document.getElementById('inputModel').value = settings.model || 'deepseek-chat';
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

async function saveSettings() {
  const apiKey = document.getElementById('inputApiKey').value.trim();
  const baseUrl = document.getElementById('inputBaseUrl').value.trim();
  const model = document.getElementById('inputModel').value.trim();

  currentState.userSettings = {
    ...currentState.userSettings,
    apiKey,
    baseUrl: baseUrl || 'https://api.deepseek.com/v1',
    model: model || 'deepseek-chat'
  };

  await window.electronAPI.saveState(currentState);
  closeSettingsModal();
}

function formatRelativeTime(ts) {
  if (!ts) return '刚刚';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

// 视窗双向协同：收起至 620×420 极简聚焦卡片
function collapseToFocusCard() {
  if (window.electronAPI) {
    if (typeof window.electronAPI.toggleWindowView === 'function') {
      window.electronAPI.toggleWindowView('focus-card');
    } else if (typeof window.electronAPI.toggleWarRoom === 'function') {
      window.electronAPI.toggleWarRoom();
    }
  }
}
window.collapseToFocusCard = collapseToFocusCard;
window.toggleHudOverlay = collapseToFocusCard;
