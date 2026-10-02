// renderer/hud.js
/**
 * 极简任务聚焦卡片控制器 (Minimal Focus Card Controller, 620×420)
 * 纯白话大字号单点心流、呼吸光环与心流连击激励
 */

let currentHudState = null;

window.addEventListener('DOMContentLoaded', async () => {
  if (!window.electronAPI) return;

  // 1. 监听全系统状态广播 (SSoT 毫秒级同频)
  window.electronAPI.onStateUpdate((state) => {
    currentHudState = state;
    renderHud(state);
  });

  // 2. 初始拉取状态
  try {
    currentHudState = await window.electronAPI.getState();
    renderHud(currentHudState);
  } catch (err) {
    // 降级使用空状态
  }

  // 3. 输入框回车监听
  const inputEl = document.getElementById('hudQuickInput');
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        dispatchQuickInput();
      } else if (e.key === 'Escape') {
        toggleQuickInput(false);
      }
    });
  }

  // 4. 接收全局快捷键 Alt+Space 自动聚焦输入框
  if (window.electronAPI.onFocusQuickInput) {
    window.electronAPI.onFocusQuickInput(() => {
      toggleQuickInput(true);
      document.getElementById('hudQuickInput')?.focus();
    });
  }
});

function extractActionVerb(actionText) {
  if (!actionText || typeof actionText !== 'string') return '执行';
  const verbs = ['打开', '运行', '记录', '输入', '注释', '查看', '搜索', '查阅', '对比', '启动', '执行', '打印', '提取', '配置'];
  for (const v of verbs) {
    if (actionText.startsWith(v) || actionText.includes(v)) {
      return v;
    }
  }
  return '执行';
}

function calculateFocusTier(steps) {
  const s = Math.max(0, parseInt(steps, 10) || 0);
  return Math.min(3, 1 + Math.floor(s / 2));
}

function renderHud(state) {
  if (!state) return;

  const proj = state.activeProject || {};
  const cockpit = proj.cockpit || {};
  const profile = state.playerProfile || {};
  const evaluation = state.evaluation || {};
  const nextBounty = state.nextBounty || {};

  // 1. 课题信息与探索度量
  const titleEl = document.getElementById('hudCampaignTitle');
  if (titleEl) titleEl.innerText = proj.title || 'EEG 脑电 × 冥想机制';

  const deltaQEl = document.getElementById('hudDeltaQ');
  if (deltaQEl) {
    const conv = profile.convergenceRate || (evaluation.agentState ? evaluation.agentState.epistemicCertainty : 50) || 50;
    deltaQEl.innerText = `ΔQt ${conv}%`;
  }

  // 2. 步骤进展与客观执行指标
  const stepsCount = profile.completedStepsCount || 0;
  const stepProgressEl = document.getElementById('hudStepProgress');
  if (stepProgressEl) {
    stepProgressEl.innerText = `已验证微动作：${stepsCount} 步`;
  }

  const stepBadgeEl = document.getElementById('hudStepBadge');
  if (stepBadgeEl) {
    stepBadgeEl.innerText = '⚡ 就地执行';
  }

  // 3. 桌面心流伴随结界 (Focus Field Breathing Aura) 跃升
  const focusTier = calculateFocusTier(profile.completedStepsCount);
  const container = document.getElementById('focusCardContainer');
  const auraStatus = document.getElementById('hudAuraStatusText');
  if (container) {
    container.classList.remove('focus-aura-tier-1', 'focus-aura-tier-2', 'focus-aura-tier-3');
    if (focusTier <= 1) {
      container.classList.add('focus-aura-tier-1');
      if (auraStatus) auraStatus.innerText = `心流伴随结界: 冰川天蓝律动中`;
    } else if (focusTier === 2) {
      container.classList.add('focus-aura-tier-2');
      if (auraStatus) auraStatus.innerText = `心流伴随结界: 极光翡翠律动中`;
    } else {
      container.classList.add('focus-aura-tier-3');
      if (auraStatus) auraStatus.innerText = `心流伴随结界: 黑曜流金超专注`;
    }
  }

  // 4. 当前核心微动作卡片 (Single-Focus Hero Action)
  const actionText = cockpit.nextAction || nextBounty.title || '打开终端，记录第 1 条有价值的异常现象或观察报告';
  const heroActionEl = document.getElementById('hudHeroAction');
  if (heroActionEl) {
    heroActionEl.innerText = actionText;
  }

  const verbBadge = document.getElementById('hudVerbBadge');
  if (verbBadge) {
    const verb = extractActionVerb(actionText);
    verbBadge.innerText = `⚡ ${verb}`;
  }

  const estTimeEl = document.getElementById('hudEstTime');
  if (estTimeEl) {
    const est = nextBounty.estMinutes || 2;
    estTimeEl.innerText = `⏱️ ${est}分钟内`;
  }

  // 5. 达成按钮状态
  const btn = document.getElementById('hudActionBtn');
  const btnLabel = document.getElementById('hudActionBtnLabel');
  if (btn) {
    if (cockpit.actionCompleted) {
      if (btnLabel) btnLabel.innerText = '达成！心流自适应推进下一动作...';
      btn.className = 'w-full py-2.5 rounded-xl apple-capsule-btn px-4 bg-sky-600/90 text-white font-extrabold text-sm tracking-wide shadow transition opacity-80 cursor-default';
      btn.disabled = true;
    } else {
      if (btnLabel) btnLabel.innerText = '达成！搞定当前微动作并推进下一步';
      btn.className = 'w-full py-2.5 rounded-xl apple-capsule-btn apple-btn-success text-white font-extrabold text-sm tracking-wide shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2';
      btn.disabled = false;
    }
  }

  // 6. 关联卡点与破局启发小贴士
  const bossTextEl = document.getElementById('hudBossText');
  if (bossTextEl) {
    bossTextEl.innerText = cockpit.currentBottleneck ? cockpit.currentBottleneck.slice(0, 36) : '尚未建立明确因果对照基线';
  }

  const bossHpEl = document.getElementById('hudObstacleConvergence') || document.getElementById('hudBossHp');
  if (bossHpEl) {
    bossHpEl.innerText = cockpit.actionCompleted ? '已收敛 100%' : '收敛 65%';
  }

  const heuristicEl = document.getElementById('hudHeuristicText');
  if (heuristicEl) {
    const advice = (evaluation.bottleneckAssessment && evaluation.bottleneckAssessment.actionableAdvice)
      || evaluation.tacticalRecommendation
      || '先在 15 分钟内执行单一变量 A/B 实测，杜绝概念纠缠';
    heuristicEl.innerHTML = `<span>💡 破局启发:</span> <span class="text-amber-200/90">${advice}</span>`;
  }

  // 7. 同步主题
  if (state.userSettings?.gameTheme) {
    let theme = state.userSettings.gameTheme;
    if (theme === 'destiny-theme') theme = 'apple-dark-theme';
    if (theme === 'mhw-theme') theme = 'apple-tahoe-theme';
    if (theme === 'maple-theme') theme = 'apple-space-theme';
    const body = document.getElementById('hudBody');
    if (body) body.className = `${theme} antialiased`;
  }
}

let isCompletingAction = false;

async function completeBounty() {
  if (isCompletingAction) return;
  if (currentHudState && currentHudState.activeProject && currentHudState.activeProject.cockpit && currentHudState.activeProject.cockpit.actionCompleted) {
    return;
  }
  isCompletingAction = true;

  const btn = document.getElementById('hudActionBtn');
  if (btn) {
    btn.disabled = true;
  }

  // 安全触发 Apple 和弦音效 (无声卡/挂起状态下不报错)
  try {
    if (window.audioFx && typeof window.audioFx.playBountyComplete === 'function') {
      window.audioFx.playBountyComplete();
    }
  } catch (e) {
    // 忽略挂起的音频上下文异常
  }

  // 悬浮窗微振动反馈
  const container = document.getElementById('focusCardContainer');
  if (container) {
    container.classList.add('boss-shake');
    setTimeout(() => container.classList.remove('boss-shake'), 350);
  }

  try {
    const result = await window.electronAPI.completeAction();
    const stepProgressEl = document.getElementById('hudStepProgress');
    if (stepProgressEl && result) {
      const steps = result.completedStepsCount || (result.data?.playerProfile?.completedStepsCount) || 1;
      stepProgressEl.innerText = `已验证微动作：${steps} 步`;
    }
  } catch (err) {
    console.error('completeAction error:', err);
  } finally {
    isCompletingAction = false;
    if (btn && (!currentHudState || !currentHudState.activeProject || !currentHudState.activeProject.cockpit || !currentHudState.activeProject.cockpit.actionCompleted)) {
      btn.disabled = false;
    }
  }
}

function toggleSidebar() {
  if (window.electronAPI && typeof window.electronAPI.toggleSidebar === 'function') {
    window.electronAPI.toggleSidebar();
  } else if (window.sidebarAPI && typeof window.sidebarAPI.toggleSidebar === 'function') {
    window.sidebarAPI.toggleSidebar();
  }
}

function openWarRoom() {
  if (window.electronAPI) {
    window.electronAPI.toggleWarRoom();
  }
}

function hideHud() {
  if (window.electronAPI) {
    window.electronAPI.toggleHud();
  }
}

function minimizeHud() {
  if (window.electronAPI) {
    window.electronAPI.minimizeWindow();
  }
}

function toggleQuickInput(forceOpen) {
  const drawer = document.getElementById('quickInputDrawer');
  if (!drawer) return;
  if (forceOpen === true) {
    drawer.classList.remove('hidden');
    document.getElementById('hudQuickInput')?.focus();
  } else if (forceOpen === false) {
    drawer.classList.add('hidden');
  } else {
    drawer.classList.toggle('hidden');
    if (!drawer.classList.contains('hidden')) {
      document.getElementById('hudQuickInput')?.focus();
    }
  }
}

async function dispatchQuickInput() {
  const inputEl = document.getElementById('hudQuickInput');
  const typeSelect = document.getElementById('quickTypeSelect');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;

  const type = typeSelect ? typeSelect.value : 'observation';

  try {
    if (window.audioFx && typeof window.audioFx.playClueAdded === 'function') {
      window.audioFx.playClueAdded();
    }
  } catch (e) {
    // 忽略音频异常
  }

  if (window.electronAPI) {
    await window.electronAPI.addClue({
      type,
      title: '桌面极简卡片快速沉淀',
      content: text
    });
  }

  inputEl.value = '';
  toggleQuickInput(false);
}
