// renderer/sidebar.js - Google Antigravity-Inspired Attached Sidebar Task Hub Controller
/**
 * Frosted Acrylic UI & Cognitive Ergonomics Controller (Milestone M4)
 * 
 * Provides:
 *   - window.sidebarAPI integration with safe headless/mock fallbacks.
 *   - Strictly zero console errors (level >= 3) and zero unhandled rejections.
 *   - In-situ context ingestion & @ context mounting chips (@clipboard, @selection, @error, @code).
 *   - Slash command parsing & submission (/plan, /shred, /solve).
 *   - Interactive step ticking with dynamic progress bar updates (0% -> 100%).
 *   - 1-click Markdown copy and local disk export.
 *   - Artifact history drawer and zero-friction ergonomics (Auto-focus, Esc to hide).
 */

(function () {
  'use strict';

  // State Management
  let currentArtifact = null;
  let mountedChips = []; // Array<{ tag: string, type: string, content: string, preview: string }>
  let isPinned = false;

  // DOM Elements
  let promptInput = null;
  let sendBtn = null;
  let mountedChipsContainer = null;
  let activeArtifactCard = null;
  let historyDrawer = null;
  let historyList = null;
  let toastContainer = null;
  let btnPinSidebar = null;
  let btnToggleHistory = null;
  let btnCloseHistory = null;
  let btnCloseSidebar = null;

  // Safe API Reference
  const api = window.sidebarAPI || null;

  // Helper: Show non-intrusive toast notification
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '!' : 'ℹ');
    toast.innerHTML = `<span style="font-weight:bold;">${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2800);
  }

  // Helper: Escape HTML to avoid injection
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------------------------------------------------------------------------
  // 1. In-Situ Context Mounting Chips
  // ---------------------------------------------------------------------------

  function renderMountedChips() {
    if (!mountedChipsContainer) return;
    mountedChipsContainer.innerHTML = '';

    if (mountedChips.length === 0) {
      mountedChipsContainer.style.display = 'none';
      return;
    }

    mountedChipsContainer.style.display = 'flex';

    mountedChips.forEach((chip, index) => {
      const chipEl = document.createElement('div');
      const chipClass = chip.type === 'clipboard' ? 'chip-clipboard'
        : (chip.type === 'error' ? 'chip-error'
        : (chip.type === 'code' ? 'chip-code' : ''));
      chipEl.className = `context-chip ${chipClass}`;

      const icon = chip.type === 'clipboard' ? '📋'
        : (chip.type === 'error' ? '⚠️'
        : (chip.type === 'code' ? '💻' : '📎'));

      const previewText = chip.preview || chip.content || chip.tag;
      const displayTag = chip.tag.startsWith('@') ? chip.tag : `@${chip.tag}`;

      chipEl.innerHTML = `
        <span class="chip-label" title="${escapeHtml(previewText)}">
          <span>${icon}</span>
          <span>${escapeHtml(displayTag)}</span>
          <span style="opacity:0.6;font-size:10px;">(${chip.content ? chip.content.length : 0}字)</span>
        </span>
        <button class="chip-remove-btn" data-index="${index}" title="移除此上下文挂载">✕</button>
      `;

      const removeBtn = chipEl.querySelector('.chip-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          mountedChips.splice(index, 1);
          renderMountedChips();
        });
      }

      mountedChipsContainer.appendChild(chipEl);
    });
  }

  async function mountClipboardContext() {
    try {
      if (!api || typeof api.readClipboardContext !== 'function') {
        showToast('剪贴板接口不可用 (需 Electron 环境)', 'info');
        return;
      }

      const clip = await api.readClipboardContext();
      if (!clip || !clip.text || clip.text.trim().length === 0) {
        showToast('系统剪贴板当前无文本内容', 'info');
        return;
      }

      // Check if already mounted
      const existing = mountedChips.find(c => c.tag === '@clipboard');
      if (existing) {
        existing.content = clip.text;
        existing.preview = clip.preview || clip.text.slice(0, 80);
      } else {
        mountedChips.push({
          tag: '@clipboard',
          type: 'clipboard',
          content: clip.text,
          preview: clip.preview || clip.text.slice(0, 80)
        });
      }

      renderMountedChips();
      showToast(`已挂载剪贴板现场上下文 (${clip.text.length} 字符)`, 'success');
    } catch (e) {
      showToast('挂载剪贴板失败', 'info');
    }
  }

  function addCustomContextChip(tag, content, type = 'custom') {
    const normTag = tag.startsWith('@') ? tag : `@${tag}`;
    const existing = mountedChips.find(c => c.tag === normTag);
    if (existing) {
      existing.content = content;
      existing.preview = content.slice(0, 80);
    } else {
      mountedChips.push({
        tag: normTag,
        type,
        content,
        preview: content.slice(0, 80)
      });
    }
    renderMountedChips();
  }

  // ---------------------------------------------------------------------------
  // 2. Active Artifact Card Rendering & Step Ticking
  // ---------------------------------------------------------------------------

  function renderActiveArtifact(artifact) {
    if (!activeArtifactCard) return;
    currentArtifact = artifact;

    if (!artifact) {
      activeArtifactCard.innerHTML = `
        <div class="artifact-empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">就地呼出 · 现场拆解 · 即刻启动</div>
          <div class="empty-desc">
            在输入框输入 <code>/shred</code>、<code>/solve</code> 或 <code>/plan</code>，或点击上方「挂载剪贴板」，即可生成高质感可执行步骤产出物。
          </div>
        </div>
      `;
      return;
    }

    const steps = artifact.steps || (artifact.payload && (artifact.payload.steps || artifact.payload.actions)) || [];
    const totalSteps = artifact.progress?.totalSteps ?? steps.length;
    const completedSteps = artifact.progress?.completedSteps ?? steps.filter(s => s.completed).length;
    const percent = artifact.progress?.percent ?? (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

    const cmd = (artifact.command || `/${artifact.type || 'plan'}`).toLowerCase();
    const badgeClass = cmd === '/shred' ? 'badge-shred'
      : (cmd === '/solve' ? 'badge-solve'
      : (cmd === '/plan' ? 'badge-plan' : 'badge-fallback'));

    const status = artifact.status || (percent === 100 ? 'completed' : (percent > 0 ? 'in-progress' : 'active'));
    const statusClass = status === 'completed' ? 'status-completed'
      : (status === 'in-progress' ? 'status-in-progress' : 'status-active');
    const statusLabel = status === 'completed' ? '✓ 已完结'
      : (status === 'in-progress' ? '⚡ 推进中' : '🟢 待启动');

    // Solve diagnostic details if present
    let solveMetaHtml = '';
    if (artifact.type === 'solve' && artifact.payload && artifact.payload.diagnosis) {
      const diag = artifact.payload.diagnosis;
      solveMetaHtml = `
        <div class="solve-meta-box">
          <div class="solve-meta-row">
            <span class="solve-meta-label">障碍分类:</span>
            <span class="solve-meta-val">${escapeHtml(diag.obstacleName || diag.title || '思维卡点')}</span>
          </div>
          <div class="solve-meta-row">
            <span class="solve-meta-label">思维模型:</span>
            <span class="solve-meta-val">${escapeHtml(diag.mentalModelName || diag.appliedMentalModel || '第一性原理')}</span>
          </div>
          ${diag.underlyingCause ? `
            <div class="solve-meta-row">
              <span class="solve-meta-label">底层机理:</span>
              <span class="solve-meta-val">${escapeHtml(diag.underlyingCause)}</span>
            </div>
          ` : ''}
          ${diag.breakthroughGuidance ? `
            <div class="solve-meta-row">
              <span class="solve-meta-label">破局战术:</span>
              <span class="solve-meta-val">${escapeHtml(diag.breakthroughGuidance)}</span>
            </div>
          ` : ''}
          ${diag.minimalViableTest?.falsificationCondition ? `
            <div class="solve-meta-row">
              <span class="solve-meta-label">证伪准则:</span>
              <span class="solve-meta-val" style="color:var(--accent-amber);">${escapeHtml(diag.minimalViableTest.falsificationCondition)}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Step items checklist HTML
    let stepsHtml = '';
    steps.forEach((step, idx) => {
      const isChecked = Boolean(step.completed);
      const verb = step.actionVerb || step.verb || '执行';
      const estMin = step.estMinutes ? `⏱️ ${step.estMinutes}m` : '⏱️ 2m';
      const title = step.title || `步骤 ${idx + 1}`;
      const detail = step.detail || step.plainPrompt || step.description || '';
      const dependsHtml = (step.dependsOn && step.dependsOn.length > 0)
        ? `<span class="step-dependency-tag" title="前置依赖步骤">前置: ${escapeHtml(step.dependsOn.join(', '))}</span>`
        : '';

      stepsHtml += `
        <div class="step-item ${isChecked ? 'completed' : ''}" data-step-id="${escapeHtml(step.id)}">
          <div class="step-checkbox-wrapper">
            <input
              type="checkbox"
              class="step-checkbox"
              data-step-id="${escapeHtml(step.id)}"
              ${isChecked ? 'checked' : ''}
              aria-label="${escapeHtml(title)}"
            />
          </div>
          <div class="step-content">
            <div class="step-title-line">
              <span class="step-verb">${escapeHtml(verb)}</span>
              <span class="step-est-minutes">${escapeHtml(estMin)}</span>
              ${dependsHtml}
              <span class="step-title-text">${escapeHtml(title)}</span>
            </div>
            ${detail ? `<div class="step-detail">${escapeHtml(detail)}</div>` : ''}
          </div>
        </div>
      `;
    });

    activeArtifactCard.innerHTML = `
      <div class="artifact-card">
        <!-- Card Header -->
        <div class="card-header">
          <div class="card-meta-row">
            <div class="meta-badges">
              <span class="command-badge ${badgeClass}">${escapeHtml(cmd)}</span>
              <span class="status-pill ${statusClass}">${statusLabel}</span>
            </div>
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--text-dim);">
              ${new Date(artifact.createdAt || Date.now()).toLocaleTimeString()}
            </span>
          </div>
          <div class="artifact-title">${escapeHtml(artifact.title || '探索任务产出物')}</div>
          ${artifact.query ? `<div class="artifact-query">“${escapeHtml(artifact.query)}”</div>` : ''}
          ${solveMetaHtml}
        </div>

        <!-- Progress Section -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">推进进度</span>
            <span id="progressPercentageText" class="progress-percentage-text">${percent}% (${completedSteps}/${totalSteps} 已完成)</span>
          </div>
          <div class="progress-bar-container">
            <div id="progressBarFill" class="progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <!-- Step List -->
        <div id="artifactStepList" class="card-steps-container">
          ${stepsHtml || '<div style="text-align:center;color:var(--text-dim);font-size:11px;padding:12px;">无分解步骤</div>'}
        </div>

        <!-- Footer Actions -->
        <div class="card-footer">
          <button id="btnCopyMarkdown" class="footer-btn btn-copy" title="复制完整 Markdown 到系统剪贴板">
            <span>📋</span>
            <span>复制 Markdown</span>
          </button>
          <button id="btnExportFile" class="footer-btn btn-export" title="导出沉淀为本地 Markdown 知识资产">
            <span>💾</span>
            <span>导出文件</span>
          </button>
          <button id="btnLocateFile" class="footer-btn btn-locate" title="在系统资源管理器中高亮定位该文件">
            <span>📂</span>
            <span>定位</span>
          </button>
          <button id="btnOpenFile" class="footer-btn btn-open" title="在系统默认编辑器中打开该资产文件">
            <span>📝</span>
            <span>打开</span>
          </button>
        </div>
      </div>
    `;

    // Bind step checkbox event listeners
    const checkboxes = activeArtifactCard.querySelectorAll('.step-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const stepId = e.target.dataset.stepId;
        const completed = e.target.checked;
        await handleStepToggle(artifact.id, stepId, completed);
      });
    });

    // Bind Markdown copy button
    const btnCopy = activeArtifactCard.querySelector('#btnCopyMarkdown');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => handleCopyMarkdown(artifact.id));
    }

    // Bind Export file button
    const btnExport = activeArtifactCard.querySelector('#btnExportFile');
    if (btnExport) {
      btnExport.addEventListener('click', () => handleExportFile(artifact.id));
    }

    // Bind Locate file button
    const btnLocate = activeArtifactCard.querySelector('#btnLocateFile') || activeArtifactCard.querySelector('#btnLocateArtifact');
    if (btnLocate) {
      btnLocate.addEventListener('click', async () => {
        if (api && typeof api.locateArtifact === 'function') {
          const res = await api.locateArtifact({ artifactId: artifact.id, filePath: artifact.localFilePath });
          if (res && res.success) {
            showToast('已在资源管理器中定位', 'success');
          } else {
            showToast(res?.error || '文件尚未落盘或未找到', 'info');
          }
        }
      });
    }

    // Bind Open file button
    const btnOpen = activeArtifactCard.querySelector('#btnOpenFile') || activeArtifactCard.querySelector('#btnOpenArtifact');
    if (btnOpen) {
      btnOpen.addEventListener('click', async () => {
        if (api && typeof api.openArtifact === 'function') {
          const res = await api.openArtifact({ artifactId: artifact.id, filePath: artifact.localFilePath });
          if (res && res.success) {
            showToast('已在默认编辑器中打开', 'success');
          } else {
            showToast(res?.error || '文件尚未落盘或未找到', 'info');
          }
        }
      });
    }
  }

  function updateArtifactProgressUI(artifact) {
    if (!activeArtifactCard) return;
    const steps = artifact.steps || (artifact.payload && (artifact.payload.steps || artifact.payload.actions)) || [];
    const totalSteps = artifact.progress?.totalSteps ?? steps.length;
    const completedSteps = artifact.progress?.completedSteps ?? steps.filter(s => s.completed).length;
    const percent = artifact.progress?.percent ?? (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

    const status = artifact.status || (percent === 100 ? 'completed' : (percent > 0 ? 'in-progress' : 'active'));
    const statusClass = status === 'completed' ? 'status-completed'
      : (status === 'in-progress' ? 'status-in-progress' : 'status-active');
    const statusLabel = status === 'completed' ? '✓ 已完结'
      : (status === 'in-progress' ? '⚡ 推进中' : '🟢 待启动');

    const progressText = activeArtifactCard.querySelector('#progressPercentageText');
    if (progressText) {
      progressText.innerText = `${percent}% (${completedSteps}/${totalSteps} 已完成)`;
    }
    const progressBarFill = activeArtifactCard.querySelector('#progressBarFill');
    if (progressBarFill) {
      progressBarFill.style.width = `${percent}%`;
    }
    const statusPill = activeArtifactCard.querySelector('.status-pill');
    if (statusPill) {
      statusPill.className = `status-pill ${statusClass}`;
      statusPill.innerText = statusLabel;
    }
  }

  // Handle step checkbox toggle with immediate DOM reflection to prevent async thrashing
  async function handleStepToggle(artifactId, stepId, completed) {
    if (currentArtifact) {
      const steps = currentArtifact.steps || (currentArtifact.payload && (currentArtifact.payload.steps || currentArtifact.payload.actions)) || [];
      const s = steps.find(st => st.id === stepId);
      if (s) {
        s.completed = completed;
      }
      const itemEl = activeArtifactCard.querySelector(`.step-item[data-step-id="${stepId}"]`);
      if (itemEl) {
        itemEl.classList.toggle('completed', completed);
        const cb = itemEl.querySelector('.step-checkbox');
        if (cb && cb.checked !== completed) {
          cb.checked = completed;
        }
      }
      const totalSteps = steps.length;
      const completedSteps = steps.filter(st => st.completed).length;
      const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      currentArtifact.progress = { totalSteps, completedSteps, percent };
      currentArtifact.status = percent === 100 ? 'completed' : (percent > 0 ? 'in-progress' : 'active');
      updateArtifactProgressUI(currentArtifact);
    }

    try {
      if (!api || typeof api.toggleArtifactStep !== 'function') {
        return;
      }

      const updated = await api.toggleArtifactStep({
        artifactId,
        stepId,
        completed
      });

      if (updated && updated.id) {
        if (currentArtifact && currentArtifact.id === updated.id) {
          currentArtifact.localFilePath = updated.localFilePath;
          currentArtifact.updatedAt = updated.updatedAt;
        }
        if (updated.progress?.percent === 100 && currentArtifact?.progress?.percent === 100) {
          showToast('🎉 该产出物所有微动作已全部完成！', 'success');
        }
      }
    } catch (e) {
      showToast('更新步骤状态失败', 'info');
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Markdown Copy & File Export
  // ---------------------------------------------------------------------------

  async function handleCopyMarkdown(artifactId) {
    try {
      if (!api || typeof api.copyArtifactMarkdown !== 'function') {
        showToast('复制接口不可用', 'info');
        return;
      }

      const res = await api.copyArtifactMarkdown({ artifactId });
      if (res && res.success) {
        showToast('📋 Markdown 已成功复制到系统剪贴板', 'success');
      } else {
        showToast('复制 Markdown 失败', 'info');
      }
    } catch (e) {
      showToast('复制 Markdown 异常', 'info');
    }
  }

  async function handleExportFile(artifactId) {
    try {
      if (!api || typeof api.exportArtifactFile !== 'function') {
        showToast('导出接口不可用', 'info');
        return;
      }

      const res = await api.exportArtifactFile({ artifactId });
      if (res && res.success) {
        const filePath = res.filePath || 'artifacts/*.md';
        showToast(`💾 已导出沉淀至: ${filePath}`, 'success');
      } else {
        showToast('导出文件失败', 'info');
      }
    } catch (e) {
      showToast('导出文件异常', 'info');
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Slash Command Submission & Execution
  // ---------------------------------------------------------------------------

  async function handleCommandSubmit() {
    if (!promptInput) return;
    const rawVal = promptInput.value.trim();

    if (!rawVal && mountedChips.length === 0) {
      promptInput.focus();
      return;
    }

    // Check if user included @clipboard in text
    let cleanPrompt = rawVal;
    if (rawVal.includes('@clipboard')) {
      cleanPrompt = rawVal.replace(/@clipboard/g, ' ').replace(/\s+/g, ' ').trim();
      if (!mountedChips.some(c => c.tag === '@clipboard')) {
        await mountClipboardContext();
      }
    }

    // Clear exception glow on submit
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
      sidebarContainer.classList.remove('exception-detected');
    }

    // Parse slash command prefix
    let command = null;
    let query = cleanPrompt;
    if (!rawVal && mountedChips.length > 0) {
      // Empty prompt input + mounted context chip defaults to /shred cognitive breakdown
      command = '/shred';
      const primary = mountedChips[0];
      query = primary.preview || (primary.content ? primary.content.slice(0, 120) : '') || '排查现场选区卡点';
    } else if (cleanPrompt.startsWith('/')) {
      const match = cleanPrompt.match(/^\/([a-zA-Z0-9_\-]+)(?:\s+(.*))?$/s);
      if (match) {
        command = '/' + match[1].toLowerCase();
        query = (match[2] || '').trim();
      }
    } else {
      command = '/plan'; // Default command is /plan if plain prompt
    }

    try {
      sendBtn.disabled = true;
      sendBtn.innerText = '…';

      if (activeArtifactCard) {
        activeArtifactCard.innerHTML = `
          <div class="artifact-loading-state" style="padding:28px;text-align:center;color:var(--text-dim);font-size:12px;">
            <div style="font-size:20px;margin-bottom:8px;">⚡</div>
            <div>认知引擎正在处理指令并生成可执行步骤…</div>
          </div>
        `;
      }

      if (!api || typeof api.executeSlashCommand !== 'function') {
        // Fallback mock artifact
        const mockArt = {
          id: 'mock_art_' + Date.now(),
          type: (command || '/plan').replace(/^\//, ''),
          command: command || '/plan',
          title: query || '现场探索任务',
          query,
          createdAt: Date.now(),
          status: 'active',
          progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
          steps: [
            { id: 's1', title: '打开终端并核实运行依赖', actionVerb: '打开', estMinutes: 2, completed: false },
            { id: 's2', title: '运行基准测试确认现有行为', actionVerb: '运行', estMinutes: 2, completed: false },
            { id: 's3', title: '记录第一项可测指标差分', actionVerb: '记录', estMinutes: 1, completed: false }
          ]
        };
        renderActiveArtifact(mockArt);
        promptInput.value = '';
        mountedChips = [];
        renderMountedChips();
        showToast('已生成可执行步骤产出物', 'success');
        return;
      }

      const payload = {
        command,
        rawInput: rawVal,
        query,
        attachments: [...mountedChips]
      };

      const result = await api.executeSlashCommand(payload);

      if (result && result.id) {
        renderActiveArtifact(result);
        promptInput.value = '';
        mountedChips = [];
        renderMountedChips();
        refreshHistoryDrawer();
        showToast(`🎯 已生成「${result.title || '探索产出物'}」`, 'success');
      } else {
        showToast('认知引擎未返回有效产出物', 'info');
      }
    } catch (e) {
      showToast('执行 Slash 指令异常', 'info');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerText = '➔';
      }
      if (promptInput) {
        promptInput.focus();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Artifact History Drawer
  // ---------------------------------------------------------------------------

  async function refreshHistoryDrawer() {
    if (!historyList) return;

    try {
      let artifacts = [];
      if (api && typeof api.getArtifacts === 'function') {
        artifacts = await api.getArtifacts();
      }

      if (!Array.isArray(artifacts) || artifacts.length === 0) {
        historyList.innerHTML = '<div class="history-empty-text">暂无历史沉淀产出物</div>';
        return;
      }

      historyList.innerHTML = '';
      artifacts.forEach(art => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const cmd = (art.command || `/${art.type || 'plan'}`).toLowerCase();
        const badgeClass = cmd === '/shred' ? 'badge-shred'
          : (cmd === '/solve' ? 'badge-solve'
          : (cmd === '/plan' ? 'badge-plan' : 'badge-fallback'));

        const total = art.progress?.totalSteps ?? (art.steps?.length || 0);
        const done = art.progress?.completedSteps ?? 0;
        const pct = art.progress?.percent ?? 0;

        item.innerHTML = `
          <div class="history-item-top">
            <span class="command-badge ${badgeClass}" style="font-size:9px;">${escapeHtml(cmd)}</span>
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--text-dim);">
              ${new Date(art.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
          <div class="history-item-title">${escapeHtml(art.title || '探索产出物')}</div>
          <div class="history-item-meta">
            <span style="color:var(--accent-cyan);font-family:var(--font-mono);">${pct}% 完成 (${done}/${total})</span>
            <span>${escapeHtml(art.status || 'active')}</span>
          </div>
        `;

        item.addEventListener('click', () => {
          renderActiveArtifact(art);
          if (historyDrawer) {
            historyDrawer.classList.remove('open');
          }
          showToast(`已调入「${art.title}」`, 'info');
        });

        historyList.appendChild(item);
      });
    } catch (e) {
      // Graceful fallback
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Initialization & Ergonomics Setup
  // ---------------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', async () => {
    // Cache DOM references
    promptInput = document.getElementById('sidebarPromptInput');
    sendBtn = document.getElementById('btnSendPrompt');
    mountedChipsContainer = document.getElementById('mountedChips');
    activeArtifactCard = document.getElementById('activeArtifactCard');
    historyDrawer = document.getElementById('historyDrawer');
    historyList = document.getElementById('historyList');
    toastContainer = document.getElementById('toastContainer');
    btnPinSidebar = document.getElementById('btnPinSidebar');
    btnToggleHistory = document.getElementById('btnToggleHistory');
    btnCloseHistory = document.getElementById('btnCloseHistory');
    btnCloseSidebar = document.getElementById('btnCloseSidebar');

    // 1. Slash Input & Send triggers
    if (sendBtn) {
      sendBtn.addEventListener('click', () => handleCommandSubmit());
    }

    if (promptInput) {
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleCommandSubmit();
        }
      });

      // In-situ @ detection on typing
      promptInput.addEventListener('input', () => {
        const val = promptInput.value;
        if (val.includes('@clipboard')) {
          promptInput.value = val.replace(/@clipboard/g, '').trim();
          mountClipboardContext();
        }
      });
    }

    // 2. Quick Action Buttons
    const btnMountClip = document.getElementById('btnQuickMountClipboard');
    if (btnMountClip) {
      btnMountClip.addEventListener('click', () => mountClipboardContext());
    }

    const btnShred = document.getElementById('btnQuickShred');
    if (btnShred) {
      btnShred.addEventListener('click', () => {
        if (promptInput) {
          const current = promptInput.value.replace(/^\/(?:shred|solve|plan)\s*/i, '');
          promptInput.value = `/shred ${current}`.trim();
          promptInput.focus();
        }
      });
    }

    const btnSolve = document.getElementById('btnQuickSolve');
    if (btnSolve) {
      btnSolve.addEventListener('click', () => {
        if (promptInput) {
          const current = promptInput.value.replace(/^\/(?:shred|solve|plan)\s*/i, '');
          promptInput.value = `/solve ${current}`.trim();
          promptInput.focus();
        }
      });
    }

    const btnPlan = document.getElementById('btnQuickPlan');
    if (btnPlan) {
      btnPlan.addEventListener('click', () => {
        if (promptInput) {
          const current = promptInput.value.replace(/^\/(?:shred|solve|plan)\s*/i, '');
          promptInput.value = `/plan ${current}`.trim();
          promptInput.focus();
        }
      });
    }

    // 3. Window & Header Controls
    if (btnPinSidebar) {
      btnPinSidebar.addEventListener('click', async () => {
        isPinned = !isPinned;
        btnPinSidebar.classList.toggle('active', isPinned);
        if (api && typeof api.setPinState === 'function') {
          try {
            await api.setPinState(isPinned);
          } catch (e) {}
        }
        showToast(isPinned ? '📌 侧边栏已置顶固定' : '已取消置顶', 'info');
      });
    }

    if (btnToggleHistory) {
      btnToggleHistory.addEventListener('click', () => {
        if (historyDrawer) {
          historyDrawer.classList.toggle('open');
          if (historyDrawer.classList.contains('open')) {
            refreshHistoryDrawer();
          }
        }
      });
    }

    if (btnCloseHistory) {
      btnCloseHistory.addEventListener('click', () => {
        if (historyDrawer) {
          historyDrawer.classList.remove('open');
        }
      });
    }

    if (btnCloseSidebar) {
      btnCloseSidebar.addEventListener('click', () => {
        if (api && typeof api.hideSidebar === 'function') {
          api.hideSidebar();
        }
      });
    }

    const btnWarRoom = document.getElementById('btnToggleWarRoom') ||
                       document.getElementById('btnOpenWarRoom') ||
                       Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('全景复盘'));
    if (btnWarRoom) {
      btnWarRoom.addEventListener('click', () => {
        if (api && typeof api.toggleWarRoom === 'function') {
          api.toggleWarRoom();
        } else if (window.electronAPI && typeof window.electronAPI.toggleWarRoom === 'function') {
          window.electronAPI.toggleWarRoom();
        }
      });
    }

    // 4. Global Keyboard Ergonomics (Esc to tuck away)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (historyDrawer && historyDrawer.classList.contains('open')) {
          historyDrawer.classList.remove('open');
          return;
        }
        if (api && typeof api.hideSidebar === 'function') {
          api.hideSidebar();
        }
      }
    });

    // 6. Preload Bridge Event Listeners
    if (api) {
      if (typeof api.onSidebarFocused === 'function') {
        api.onSidebarFocused(() => {
          if (promptInput) {
            promptInput.focus();
            promptInput.select();
          }
          loadInitialArtifacts();
        });
      }

      if (typeof api.onClipboardAutoSummon === 'function') {
        api.onClipboardAutoSummon(({ text, classification }) => {
          if (!text) return;
          const type = (classification && classification.type) ? classification.type : (isExceptionSnippet(text) ? 'error' : 'selection');
          addCustomContextChip('@selection', text, type);
          if (promptInput) {
            promptInput.focus();
            promptInput.select();
          }
        });
      }

      if (typeof api.onClipboardExceptionState === 'function') {
        api.onClipboardExceptionState(({ hasException }) => {
          const container = document.getElementById('sidebarContainer');
          if (!container) return;
          if (hasException) {
            container.classList.add('exception-detected');
          } else {
            container.classList.remove('exception-detected');
          }
        });
      }

      if (typeof api.onContextInjected === 'function') {
        api.onContextInjected((data) => {
          if (data && data.text) {
            addCustomContextChip(data.tag || '@selection', data.text, data.type || 'selection');
            showToast(`已注入现场选区上下文 (${data.text.length}字)`, 'info');
          }
        });
      }

      if (typeof api.onStateUpdate === 'function') {
        api.onStateUpdate((state) => {
          updateCausalBreadcrumbs(state);
        });
      }
    }

    if (window.electronAPI && typeof window.electronAPI.onStateUpdate === 'function') {
      window.electronAPI.onStateUpdate((state) => {
        updateCausalBreadcrumbs(state);
      });
    }

    function updateCausalBreadcrumbs(state) {
      if (!state) return;
      const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
      if (!container) return;

      const phases = ['现象', '疑问', '假说', '证据', '突破'];
      let activePhaseIdx = 0;

      if (typeof state.causalPhase === 'number') {
        activePhaseIdx = Math.max(0, Math.min(4, Math.floor(state.causalPhase)));
      } else if (typeof state.causalPhase === 'string') {
        const parsed = parseInt(state.causalPhase, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
          activePhaseIdx = parsed;
        } else {
          const idx = phases.findIndex(p => state.causalPhase.includes(p));
          if (idx >= 0) activePhaseIdx = idx;
        }
      } else if (state.causalPhaseName && typeof state.causalPhaseName === 'string') {
        const idx = phases.findIndex(p => state.causalPhaseName.includes(p));
        if (idx >= 0) activePhaseIdx = idx;
      } else if (typeof state.phase === 'number') {
        activePhaseIdx = Math.max(0, Math.min(4, Math.floor(state.phase)));
      }

      const nodes = container.querySelectorAll('.crumb-item, .phase-node, .breadcrumb-stage');
      nodes.forEach((node, idx) => {
        let nodePhaseIdx = idx;
        if (node.hasAttribute('data-phase')) {
          const p = parseInt(node.getAttribute('data-phase'), 10);
          if (!isNaN(p)) nodePhaseIdx = p;
        }
        const nodeText = (node.innerText || '').trim();
        const matchesActive = nodePhaseIdx === activePhaseIdx ||
          (phases[activePhaseIdx] && nodeText.includes(phases[activePhaseIdx]));

        if (matchesActive) {
          node.classList.add('active', 'current-phase');
          node.classList.remove('completed');
          node.dataset.active = 'true';
          node.setAttribute('data-active', 'true');
        } else if (nodePhaseIdx < activePhaseIdx) {
          node.classList.add('completed');
          node.classList.remove('active', 'current-phase');
          node.dataset.active = 'false';
          node.setAttribute('data-active', 'false');
        } else {
          node.classList.remove('active', 'current-phase', 'completed');
          node.dataset.active = 'false';
          node.setAttribute('data-active', 'false');
        }
      });

      const clarity = state.deltaQt !== undefined
        ? state.deltaQt
        : (state.clarity !== undefined
            ? state.clarity
            : (state.epistemicClarity !== undefined ? state.epistemicClarity : 58));

      const badges = container.querySelectorAll('.clarity-badge, .delta-qt, .clarity-score');
      if (badges.length > 0) {
        badges.forEach(b => {
          b.innerText = `ΔQt: ${clarity}%`;
        });
      } else {
        const fallbackBadge = document.querySelector('.delta-qt, .clarity-score, .clarity-badge');
        if (fallbackBadge) fallbackBadge.innerText = `ΔQt: ${clarity}%`;
      }
    }

    async function initCausalBreadcrumbsState() {
      try {
        let initialState = null;
        if (api && typeof api.getState === 'function') {
          initialState = await api.getState();
        } else if (window.electronAPI && typeof window.electronAPI.getState === 'function') {
          initialState = await window.electronAPI.getState();
        }
        if (initialState) {
          updateCausalBreadcrumbs(initialState);
        } else {
          updateCausalBreadcrumbs({ causalPhase: 0, causalPhaseName: '现象', deltaQt: 58 });
        }
      } catch (e) {
        updateCausalBreadcrumbs({ causalPhase: 0, causalPhaseName: '现象', deltaQt: 58 });
      }
    }

    initCausalBreadcrumbsState();

    // 7. Test and Summon Selection Hooks
    function isExceptionSnippet(text) {
      if (!text || typeof text !== 'string') return false;
      const str = text.trim();
      if (str.length < 5) return false;
      const jsStackRegex = /^\s*at\s+(?:async\s+)?(?:[a-zA-Z0-9_$<>.]+\s+\()?[^()\n]+:\d+(?::\d+)?\)?/m;
      const pyStackRegex = /(?:Traceback\s+\(most\s+recent\s+call\s+last\):|File\s+["'][^"']+["'],\s+line\s+\d+|line\s+\d+,\s+in)/i;
      const javaStackRegex = /(?:^\s*at\s+[a-zA-Z0-9_$<>/]+(?:\.[a-zA-Z0-9_$<>/]+)+\([a-zA-Z0-9_$.]+\.(?:java|kt):\d+\)|\b(?:Exception|Error)\s+in\s+thread\s+)/m;
      const goPanicRegex = /(?:panic:\s+|fatal error:\s+|goroutine\s+\d+\s+\[)/;
      const hasStack = jsStackRegex.test(str) || pyStackRegex.test(str) || javaStackRegex.test(str) || goPanicRegex.test(str);
      if (hasStack) return true;

      const keywordRegex = /(?:TypeError|ReferenceError|SyntaxError|RangeError|UnhandledPromiseRejection|NullPointerException|AssertionError|Segmentation fault|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ModuleNotFoundError|Cannot find module|failed with exit code\s+\d+|Caused by:\s+[^\n]+|(?:[a-zA-Z0-9_$]+)?(?:Error|Exception):\s+[^\n]+)/i;
      return keywordRegex.test(str);
    }

    window.__handleSummonSelection = async () => {
      if (api && typeof api.readClipboardContext === 'function') {
        try {
          const clip = await api.readClipboardContext();
          if (clip && clip.text && clip.text.trim().length > 0) {
            let type = 'selection';
            try {
              if (api && typeof api.detectClipboardException === 'function') {
                const res = await api.detectClipboardException();
                if (res && res.isException) {
                  type = 'error';
                }
              }
            } catch (e) {}
            if (type === 'selection' && isExceptionSnippet(clip.text)) {
              type = 'error';
            }
            if (type === 'selection' && /(?:const|let|var|function|class|import|export|def)\b/.test(clip.text)) {
              type = 'code';
            }
            addCustomContextChip('@selection', clip.text, type);
          }
        } catch (e) {}
      }
      if (promptInput) {
        promptInput.focus();
        promptInput.select();
      }
    };

    window.__testMountChip = (tag = '@selection', content = '', type = 'error') => {
      addCustomContextChip(tag, content, type);
    };

    window.__checkClipboardForErrors = async () => {
      const container = document.getElementById('sidebarContainer');
      if (!container) return;
      try {
        let isErr = false;
        try {
          if (api && typeof api.detectClipboardException === 'function') {
            const res = await api.detectClipboardException();
            isErr = Boolean(res && res.isException);
          }
        } catch (e) {}
        if (!isErr && api && typeof api.readClipboardContext === 'function') {
          const clip = await api.readClipboardContext();
          isErr = isExceptionSnippet(clip?.text || '');
        }
        if (isErr) {
          container.classList.add('exception-detected');
        } else {
          container.classList.remove('exception-detected');
        }
      } catch (e) {}
    };

    // 8. Initial Data Loading: Load existing artifacts on startup / focus
    async function loadInitialArtifacts() {
      try {
        if (api && typeof api.getArtifacts === 'function') {
          const artifacts = await api.getArtifacts();
          if (Array.isArray(artifacts) && artifacts.length > 0) {
            renderActiveArtifact(artifacts[0]);
          }
        }
      } catch (e) {}
    }

    loadInitialArtifacts();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadInitialArtifacts();
      }
    });
    window.addEventListener('focus', () => {
      loadInitialArtifacts();
    });

    // Auto-focus input on launch
    if (promptInput) {
      promptInput.focus();
    }
  });

})();
