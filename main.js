// main.js
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, screen, nativeImage, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');
const store = require('./services/store');
const stateEngine = require('./services/state-engine');
const aiAdvisor = require('./services/ai-advisor');
const cognitiveShredder = require('./services/cognitive-shredder');
const bottleneckDiagnostician = require('./services/bottleneck-diagnostician');
const contextManager = require('./services/context-manager');

let mainWindow = null;
let hudWindow = null;
let sidebarWindow = null;
let tray = null;
let sidebarScreenListener = null;

function detachSidebarScreenListeners() {
  if (sidebarScreenListener && screen && typeof screen.removeListener === 'function') {
    screen.removeListener('display-metrics-changed', sidebarScreenListener);
    screen.removeListener('display-added', sidebarScreenListener);
    screen.removeListener('display-removed', sidebarScreenListener);
    sidebarScreenListener = null;
  }
}

let clipboardWatcherTimer = null;
let lastProcessedClipboard = '';
let lastMonitoredClipboard = '';

function startClipboardWatcher() {
  if (clipboardWatcherTimer) return;
  clipboardWatcherTimer = setInterval(() => {
    try {
      if (!clipboard || typeof clipboard.readText !== 'function') return;
      const text = clipboard.readText();
      if (text === lastMonitoredClipboard) return;
      lastMonitoredClipboard = text;

      const exceptionInfo = (contextManager && typeof contextManager.detectException === 'function')
        ? contextManager.detectException(text)
        : { isException: false, errorType: null, preview: '', hasStack: false };

      if (sidebarWindow && !sidebarWindow.isDestroyed() && sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
        sidebarWindow.webContents.send('clipboard-exception-state', {
          hasException: exceptionInfo.isException,
          errorType: exceptionInfo.errorType,
          preview: exceptionInfo.preview
        });
      }
    } catch (err) {
      // Safe guard against clipboard read errors
    }
  }, 1000);
}

function stopClipboardWatcher() {
  if (clipboardWatcherTimer) {
    clearInterval(clipboardWatcherTimer);
    clipboardWatcherTimer = null;
  }
}



// 生成高质感指南针托盘图标 (DataURL 免外部文件依赖)
function createTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <polygon points="16,6 20,16 16,13" fill="#f43f5e"/>
    <polygon points="16,26 20,16 16,13" fill="#94a3b8"/>
    <circle cx="16" cy="16" r="2.5" fill="#38bdf8"/>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#070b12',
    frame: false, // 沉浸式无边框游戏视窗
    show: false, // 默认隐藏，通过 Alt+W 或 HUD 展开按钮调出
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    // 默认关闭为隐藏到托盘，保持后台持续感知
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createHudWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  hudWindow = new BrowserWindow({
    width: 620,
    height: 420,
    x: Math.round((width - 620) / 2),
    y: Math.max(40, Math.round((height - 420) / 3)),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  hudWindow.loadFile(path.join(__dirname, 'renderer', 'hud.html'));
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  hudWindow.once('ready-to-show', () => {
    // HUD 保持后台静默预热，可通过 Alt+F (极简卡片) 或 Alt+H (HUD) 随时唤起
    // 系统默认视觉焦点直接交由屏幕右侧 Antigravity 贴附侧边栏
  });

  hudWindow.on('close', (e) => {
    // 默认关闭为隐藏到托盘，保持后台持续感知
    if (!app.isQuitting) {
      e.preventDefault();
      hudWindow.hide();
    }
  });
}

// ---------------------------------------------------------
// Antigravity 内生贴附侧边栏视窗管理 (M1)
// ---------------------------------------------------------
const SIDEBAR_DEFAULT_WIDTH = 400;
const SIDEBAR_MIN_WIDTH = 380;
const SIDEBAR_MAX_WIDTH = 420;

function clampSidebarWidth(width) {
  const w = Number(width);
  if (isNaN(w)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(w)));
}

function getSidebarBounds(targetDisplayOrWidth, maybeWidth) {
  let display = null;
  let requestedWidth = SIDEBAR_DEFAULT_WIDTH;

  if (typeof targetDisplayOrWidth === 'number') {
    requestedWidth = targetDisplayOrWidth;
  } else if (targetDisplayOrWidth && typeof targetDisplayOrWidth === 'object') {
    display = targetDisplayOrWidth;
    if (typeof maybeWidth === 'number') {
      requestedWidth = maybeWidth;
    }
  } else if (typeof maybeWidth === 'number') {
    requestedWidth = maybeWidth;
  }

  if (!display) {
    try {
      if (screen && typeof screen.getCursorScreenPoint === 'function' && typeof screen.getDisplayNearestPoint === 'function') {
        const cursorPoint = screen.getCursorScreenPoint();
        display = screen.getDisplayNearestPoint(cursorPoint);
      }
    } catch (e) {
      // In headless environments
    }
  }

  if (!display && screen && typeof screen.getPrimaryDisplay === 'function') {
    try {
      display = screen.getPrimaryDisplay();
    } catch (e) {
      // In headless environments
    }
  }

  let workArea = { x: 0, y: 0, width: 1920, height: 1080 };
  if (display) {
    if (display.workArea && typeof display.workArea.width === 'number') {
      workArea = display.workArea;
    } else if (typeof display.width === 'number' && typeof display.height === 'number') {
      workArea = {
        x: typeof display.x === 'number' ? display.x : 0,
        y: typeof display.y === 'number' ? display.y : 0,
        width: display.width,
        height: display.height
      };
    }
  }

  const width = clampSidebarWidth(requestedWidth);
  return {
    x: workArea.x + workArea.width - width,
    y: workArea.y,
    width: width,
    height: workArea.height
  };
}

function createSidebarWindow() {
  if (sidebarWindow && !sidebarWindow.isDestroyed()) {
    return sidebarWindow;
  }

  // Ensure any previous screen listeners from earlier cycles are detached
  detachSidebarScreenListeners();

  const bounds = getSidebarBounds();
  sidebarWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    minHeight: bounds.height,
    maxHeight: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    show: false, // Pre-warmed at startup
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const sidebarHtmlPath = path.join(__dirname, 'renderer', 'sidebar.html');
  if (fs.existsSync(sidebarHtmlPath)) {
    sidebarWindow.loadFile(sidebarHtmlPath).catch(err => {
      console.warn('[Sidebar] Error loading sidebar.html:', err.message);
    });
  } else {
    sidebarWindow.loadURL('about:blank').catch(() => {});
  }

  sidebarWindow.once('ready-to-show', () => {
    sidebarWindow.show();
    sidebarWindow.focus();
    if (sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
      sidebarWindow.webContents.send('sidebar-focused');
      sidebarWindow.webContents.send('sidebar-visibility-changed', {
        visible: true,
        duration: 0,
        timestamp: Date.now(),
        bounds: sidebarWindow.getBounds()
      });
    }
  });

  sidebarWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      hideSidebar();
    }
  });

  // Re-dock when displays or resolution change
  sidebarScreenListener = () => {
    if (sidebarWindow && !sidebarWindow.isDestroyed()) {
      const newBounds = getSidebarBounds();
      sidebarWindow.setBounds(newBounds);
    }
  };
  if (screen && typeof screen.on === 'function') {
    screen.on('display-metrics-changed', sidebarScreenListener);
    screen.on('display-added', sidebarScreenListener);
    screen.on('display-removed', sidebarScreenListener);
  }

  sidebarWindow.once('closed', () => {
    detachSidebarScreenListeners();
    sidebarWindow = null;
  });

  return sidebarWindow;
}

function toggleSidebar() {
  const t0 = performance.now();
  if (!sidebarWindow || sidebarWindow.isDestroyed()) {
    createSidebarWindow();
  }

  const isVisible = sidebarWindow.isVisible();
  let nextVisible = false;
  let bounds = null;

  if (isVisible) {
    sidebarWindow.hide();
    nextVisible = false;
    bounds = sidebarWindow.getBounds();
  } else {
    const sidebarHtmlPath = path.join(__dirname, 'renderer', 'sidebar.html');
    if (fs.existsSync(sidebarHtmlPath)) {
      const currentUrl = sidebarWindow.webContents ? sidebarWindow.webContents.getURL() : '';
      if (!currentUrl || currentUrl.includes('about:blank')) {
        sidebarWindow.loadFile(sidebarHtmlPath).catch(() => {});
      }
    }
    bounds = getSidebarBounds();
    sidebarWindow.setBounds(bounds);
    sidebarWindow.show();
    sidebarWindow.focus();
    nextVisible = true;
    if (sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
      sidebarWindow.webContents.send('sidebar-focused');

      let clipText = '';
      try {
        if (clipboard && typeof clipboard.readText === 'function') {
          clipText = clipboard.readText() || '';
        }
      } catch (e) {
        clipText = '';
      }

      if (clipText && clipText.trim().length > 0 && clipText !== lastProcessedClipboard) {
        lastProcessedClipboard = clipText;
        const classification = (contextManager && typeof contextManager.classifyClipboardContent === 'function')
          ? contextManager.classifyClipboardContent(clipText)
          : { type: 'text', isException: false, errorType: null, preview: clipText.slice(0, 100) };

        sidebarWindow.webContents.send('sidebar-auto-summon', {
          text: clipText,
          classification
        });
      }
    }
  }

  const duration = Number((performance.now() - t0).toFixed(2));
  const payload = {
    visible: nextVisible,
    duration,
    timestamp: Date.now(),
    bounds
  };

  if (sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
    sidebarWindow.webContents.send('sidebar-visibility-changed', payload);
  }
  return payload;
}

function hideSidebar() {
  const t0 = performance.now();
  if (!sidebarWindow || sidebarWindow.isDestroyed()) {
    return { visible: false, duration: 0, timestamp: Date.now(), bounds: null };
  }

  if (sidebarWindow.isVisible()) {
    sidebarWindow.hide();
  }

  const duration = Number((performance.now() - t0).toFixed(2));
  const bounds = sidebarWindow.getBounds();
  const payload = {
    visible: false,
    duration,
    timestamp: Date.now(),
    bounds
  };

  if (sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
    sidebarWindow.webContents.send('sidebar-visibility-changed', payload);
  }
  return payload;
}


function showWarRoom() {
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

function showFocusCard() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  if (hudWindow && !hudWindow.isDestroyed()) {
    if (hudWindow.isMinimized()) hudWindow.restore();
    hudWindow.show();
    hudWindow.focus();
  }
}

function toggleHud() {
  if (!hudWindow || hudWindow.isDestroyed()) return;
  if (hudWindow.isVisible()) {
    hudWindow.hide();
  } else {
    hudWindow.show();
    hudWindow.focus();
  }
}

function toggleWarRoom() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible()) {
    showFocusCard();
  } else {
    showWarRoom();
  }
}

function toggleWindowView(targetView) {
  if (targetView === 'war-room' || targetView === 'warRoom') {
    showWarRoom();
  } else if (targetView === 'focus-card' || targetView === 'focus' || targetView === 'hud') {
    showFocusCard();
  } else {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      showFocusCard();
    } else {
      showWarRoom();
    }
  }
}

function broadcastStateUpdate() {
  const activeProj = store.getActiveProject();
  const evaluation = stateEngine.evaluateSystemState(activeProj, store.data.playerProfile);
  const nextBounty = stateEngine.recommendNextBounty(activeProj);

  const payload = {
    ...store.data,
    activeProject: activeProj,
    evaluation,
    nextBounty
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-updated', payload);
  }
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.webContents.send('state-updated', payload);
  }
  if (sidebarWindow && !sidebarWindow.isDestroyed() && sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
    sidebarWindow.webContents.send('state-updated', payload);
  }
}

// IPC 消息处理
function registerIpcHandlers() {
  ipcMain.handle('get-state', () => {
    const activeProj = store.getActiveProject();
    const evaluation = stateEngine.evaluateSystemState(activeProj, store.data.playerProfile);
    const nextBounty = stateEngine.recommendNextBounty(activeProj);
    return {
      ...store.data,
      activeProject: activeProj,
      evaluation,
      nextBounty
    };
  });

  ipcMain.handle('save-state', (event, newData) => {
    store.saveData(newData);
    broadcastStateUpdate();
    return true;
  });

  ipcMain.handle('add-clue', (event, clue) => {
    const added = store.addClue(clue);
    broadcastStateUpdate();
    return added;
  });

  ipcMain.handle('complete-action', () => {
    const res = store.completeAction();
    broadcastStateUpdate();
    return res;
  });

  ipcMain.handle('toggle-equip-relic', (event, relicId) => {
    const res = store.toggleEquipRelic(relicId);
    broadcastStateUpdate();
    return res;
  });

  ipcMain.handle('cast-lens', async (event, { lensKey, clueContext }) => {
    const settings = store.data.userSettings;
    return await aiAdvisor.castLens(lensKey, clueContext, settings);
  });

  ipcMain.handle('update-cockpit', (event, updates) => {
    const updated = store.updateCockpit(updates);
    broadcastStateUpdate();
    return updated;
  });

  ipcMain.handle('switch-project', (event, projectId) => {
    store.data.activeProjectId = projectId;
    store.saveData();
    broadcastStateUpdate();
    return true;
  });

  ipcMain.handle('create-project', (event, { title, description }) => {
    const newProj = {
      id: 'proj_' + Date.now(),
      title,
      description,
      status: 'active',
      currentChapter: '第 1 阶段 · 现象捕获与问题定义',
      createdAt: Date.now(),
      cockpit: {
        coreQuestion: `围绕「${title}」最核心的未解问题是什么？`,
        currentBottleneck: '尚未建立明确因果模型与实验闭环',
        nextAction: '记录第 1 条有价值的异常现象或观察报告',
        actionCompleted: false,
        unknowns: [],
        tacticalCritique: '新探索副本已开启。第一步：先扩大观察面，切忌过早下结论。'
      },
      clues: []
    };
    store.data.projects.unshift(newProj);
    store.data.activeProjectId = newProj.id;
    store.saveData();
    broadcastStateUpdate();
    return newProj;
  });

  // 目标粉碎与微动作拆解 (F1, F2, F3)
  ipcMain.handle('decompose-goal', async (event, { goal, options }) => {
    if (cognitiveShredder && typeof cognitiveShredder.decomposeGoal === 'function') {
      return await cognitiveShredder.decomposeGoal(goal, options);
    }
    return null;
  });

  // 卡点主动诊断与破局引导 (F4, F5)
  ipcMain.handle('diagnose-bottleneck', (event, context) => {
    if (bottleneckDiagnostician && typeof bottleneckDiagnostician.diagnoseBottleneck === 'function') {
      return bottleneckDiagnostician.diagnoseBottleneck(context);
    }
    return null;
  });

  // 窗口与视窗切换操作 (F8, F9)
  ipcMain.on('toggle-hud', toggleHud);
  ipcMain.on('toggle-war-room', toggleWarRoom);
  ipcMain.on('toggle-window-view', (event, targetView) => toggleWindowView(targetView));
  ipcMain.on('minimize-window', () => mainWindow?.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('close-window', () => mainWindow?.hide());

  // ---------------------------------------------------------
  // 贴附侧边栏视窗控制与几何 (M1)
  // ---------------------------------------------------------
  ipcMain.on('toggle-sidebar', () => toggleSidebar());
  ipcMain.handle('toggle-sidebar', () => toggleSidebar());
  ipcMain.on('hide-sidebar', () => hideSidebar());
  ipcMain.handle('hide-sidebar', () => hideSidebar());

  ipcMain.handle('get-sidebar-bounds', (event, targetDisplayOrWidth, maybeWidth) => {
    if (targetDisplayOrWidth !== undefined) {
      return getSidebarBounds(targetDisplayOrWidth, maybeWidth);
    }
    return (sidebarWindow && !sidebarWindow.isDestroyed() && sidebarWindow.isVisible())
      ? sidebarWindow.getBounds()
      : getSidebarBounds();
  });

  ipcMain.handle('set-pin-state', (event, pinned) => {
    const isPinned = Boolean(pinned);
    if (sidebarWindow && !sidebarWindow.isDestroyed()) {
      sidebarWindow.setAlwaysOnTop(isPinned, 'floating');
    }
    return { success: true, pinned: isPinned };
  });

  // ---------------------------------------------------------
  // 剪贴板与现场上下文捕获 (M1 / M2)
  // ---------------------------------------------------------
  const handleReadClipboard = () => {
    if (contextManager && typeof contextManager.captureClipboard === 'function') {
      return contextManager.captureClipboard(clipboard);
    }
    let text = '';
    try {
      text = clipboard.readText() || '';
    } catch (e) {
      text = '';
    }
    return {
      text,
      length: text.length,
      timestamp: Date.now(),
      preview: text.length > 100 ? text.slice(0, 97) + '...' : text
    };
  };
  ipcMain.handle('read-clipboard-context', handleReadClipboard);
  ipcMain.handle('capture-clipboard', handleReadClipboard);
  ipcMain.handle('detect-clipboard-exception', () => {
    let text = '';
    try {
      if (clipboard && typeof clipboard.readText === 'function') {
        text = clipboard.readText() || '';
      }
    } catch (e) {
      text = '';
    }
    if (contextManager && typeof contextManager.detectException === 'function') {
      return contextManager.detectException(text);
    }
    return { isException: false, errorType: null, preview: '', hasStack: false };
  });

  ipcMain.handle('parse-context-mentions', (event, rawPrompt) => {
    if (contextManager && typeof contextManager.parseContextMentions === 'function') {
      return contextManager.parseContextMentions(rawPrompt);
    }
    return { cleanPrompt: rawPrompt, tokens: [], tags: [], hasTokens: false };
  });

  ipcMain.handle('build-context-envelope', (event, payload) => {
    if (contextManager && typeof contextManager.buildContextEnvelope === 'function') {
      return contextManager.buildContextEnvelope(payload);
    }
    return null;
  });

  ipcMain.handle('copy-to-clipboard', (event, text) => {
    const content = typeof text === 'string' ? text : String(text || '');
    clipboard.writeText(content);
    return {
      success: true,
      length: content.length,
      timestamp: Date.now()
    };
  });

  ipcMain.handle('inject-context', (event, ctx) => {
    if (sidebarWindow && !sidebarWindow.isDestroyed() && sidebarWindow.webContents && !sidebarWindow.webContents.isDestroyed()) {
      sidebarWindow.webContents.send('context-injected', ctx);
    }
    return { success: true, context: ctx };
  });

  // ---------------------------------------------------------
  // Slash 指令与认知引擎集成钩子 (M1 / M3)
  // ---------------------------------------------------------
  ipcMain.handle('execute-slash-command', async (event, payload) => {
    let slashEngine = null;
    try {
      slashEngine = require('./services/slash-engine');
    } catch (e) {}

    if (slashEngine) {
      let art = null;
      if (typeof slashEngine.executeSlashCommand === 'function') {
        art = await slashEngine.executeSlashCommand(payload);
      } else if (typeof slashEngine.executeCommand === 'function') {
        art = await slashEngine.executeCommand(payload);
      } else if (typeof slashEngine.execute === 'function') {
        art = await slashEngine.execute(payload);
      }

      if (art && art.id && store && typeof store.addArtifact === 'function') {
        store.addArtifact(art);
      }
      if (art) return art;
    }

    const rawInput = payload?.rawInput || payload?.query || payload?.input || '';
    const cmd = payload?.command || (rawInput.startsWith('/') ? rawInput.split(' ')[0] : '/plan');

    const fallbackArt = {
      id: 'art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: cmd.replace(/^\//, '').toLowerCase(),
      command: cmd,
      title: rawInput || '探索任务计划',
      query: rawInput,
      mountedContexts: payload?.attachments || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'in-progress',
      payload: {},
      progress: { totalSteps: 0, completedSteps: 0, percent: 0 },
      localFilePath: null
    };
    if (store && typeof store.addArtifact === 'function') {
      store.addArtifact(fallbackArt);
    }
    return fallbackArt;
  });

  // ---------------------------------------------------------
  // 产出物步骤勾选与操作 (M1 / M3)
  // ---------------------------------------------------------
  const handleArtifactStep = async (event, payload) => {
    if (store && typeof store.toggleArtifactStep === 'function') {
      const res = store.toggleArtifactStep(payload);
      if (res) return res;
    }
    let slashEngine = null;
    try {
      slashEngine = require('./services/slash-engine');
    } catch (e) {}

    if (slashEngine && typeof slashEngine.toggleArtifactStep === 'function') {
      return await slashEngine.toggleArtifactStep(payload);
    }
    return { success: true, payload };
  };
  ipcMain.handle('toggle-artifact-step', handleArtifactStep);
  ipcMain.handle('update-artifact-step', handleArtifactStep);

  // ---------------------------------------------------------
  // 产出物 Markdown 导出与剪贴板复制 (M1 / M3)
  // ---------------------------------------------------------
  ipcMain.handle('copy-artifact-markdown', async (event, payload) => {
    let artifactExporter = null;
    try {
      artifactExporter = require('./services/artifact-exporter');
    } catch (e) {}

    if (artifactExporter && typeof artifactExporter.copyArtifactMarkdown === 'function') {
      return await artifactExporter.copyArtifactMarkdown(payload, clipboard);
    }
    const text = payload?.text || (payload?.artifactId ? `Artifact ${payload.artifactId}` : '');
    clipboard.writeText(text);
    return { success: true, text, length: text.length };
  });

  const handleExportArtifact = async (event, payload) => {
    let artifactExporter = null;
    try {
      artifactExporter = require('./services/artifact-exporter');
    } catch (e) {}

    if (artifactExporter) {
      if (typeof artifactExporter.exportArtifactFile === 'function') {
        return await artifactExporter.exportArtifactFile(payload);
      }
      if (typeof artifactExporter.exportArtifactMarkdown === 'function') {
        return await artifactExporter.exportArtifactMarkdown(payload);
      }
    }
    const artId = payload?.artifactId || Date.now();
    return { success: true, filePath: `artifacts/artifact-${artId}.md` };
  };
  ipcMain.handle('export-artifact-markdown', handleExportArtifact);
  ipcMain.handle('export-artifact-file', handleExportArtifact);

  ipcMain.handle('locate-artifact', async (event, payload) => {
    try {
      let targetPath = payload?.filePath;
      const artifactId = payload?.artifactId;
      let art = null;
      if (store && typeof store.getArtifact === 'function') {
        art = store.getArtifact(artifactId);
      }
      if (!art && store && Array.isArray(store.data?.artifacts)) {
        art = store.data.artifacts.find(a => a.id === artifactId);
      }
      if (!targetPath && art && art.localFilePath && fs.existsSync(art.localFilePath)) {
        targetPath = art.localFilePath;
      }
      if (!targetPath || !fs.existsSync(targetPath)) {
        if (art) {
          const exporter = require('./services/artifact-exporter');
          const res = await exporter.exportArtifactFile({ artifact: art });
          targetPath = res?.filePath;
          art.localFilePath = targetPath;
          if (store && typeof store.saveData === 'function') store.saveData();
        }
      }
      if (targetPath && fs.existsSync(targetPath)) {
        const fullPath = path.resolve(targetPath);
        shell.showItemInFolder(fullPath);
        return { success: true, filePath: fullPath };
      }
      return { success: false, error: 'File does not exist on disk' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-artifact', async (event, payload) => {
    try {
      let targetPath = payload?.filePath;
      const artifactId = payload?.artifactId;
      let art = null;
      if (store && typeof store.getArtifact === 'function') {
        art = store.getArtifact(artifactId);
      }
      if (!art && store && Array.isArray(store.data?.artifacts)) {
        art = store.data.artifacts.find(a => a.id === artifactId);
      }
      if (!targetPath && art && art.localFilePath && fs.existsSync(art.localFilePath)) {
        targetPath = art.localFilePath;
      }
      if (!targetPath || !fs.existsSync(targetPath)) {
        if (art) {
          const exporter = require('./services/artifact-exporter');
          const res = await exporter.exportArtifactFile({ artifact: art });
          targetPath = res?.filePath;
          art.localFilePath = targetPath;
          if (store && typeof store.saveData === 'function') store.saveData();
        }
      }
      if (targetPath && fs.existsSync(targetPath)) {
        const fullPath = path.resolve(targetPath);
        const errMsg = await shell.openPath(fullPath);
        if (errMsg) {
          return { success: false, error: errMsg };
        }
        return { success: true, filePath: fullPath };
      }
      return { success: false, error: 'File does not exist on disk' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('show-item-in-folder', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) {
      return { success: false, error: 'Path not found' };
    }
    try {
      shell.showItemInFolder(path.resolve(targetPath));
      return { success: true, filePath: path.resolve(targetPath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-path', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) {
      return { success: false, error: 'Path not found' };
    }
    try {
      const errMsg = await shell.openPath(path.resolve(targetPath));
      if (errMsg) {
        return { success: false, error: errMsg };
      }
      return { success: true, filePath: path.resolve(targetPath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // 产出物列表与存储 (M1 / M3)
  // ---------------------------------------------------------
  ipcMain.handle('get-artifacts', async () => {
    if (store && typeof store.getArtifacts === 'function') {
      return store.getArtifacts();
    }
    if (store && Array.isArray(store.data?.artifacts)) {
      return store.data.artifacts;
    }
    return [];
  });

  ipcMain.handle('save-artifact', async (event, artifact) => {
    if (store && typeof store.addArtifact === 'function') {
      store.addArtifact(artifact);
      return true;
    }
    if (store) {
      if (!Array.isArray(store.data.artifacts)) {
        store.data.artifacts = [];
      }
      if (artifact && artifact.id) {
        const idx = store.data.artifacts.findIndex(a => a.id === artifact.id);
        if (idx >= 0) {
          store.data.artifacts[idx] = artifact;
        } else {
          store.data.artifacts.unshift(artifact);
        }
        store.saveData();
      }
      return true;
    }
    return false;
  });
}

function setupTray() {
  tray = new Tray(createTrayIcon());
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🧭 打开全景作战大屏 (War Room, Alt+W)',
      click: () => showWarRoom()
    },
    {
      label: '🎯 切换极简聚焦卡片 (Focus Card, Alt+F)',
      click: () => showFocusCard()
    },
    {
      label: '📌 显示/隐藏常驻 HUD (Alt+H)',
      click: () => toggleHud()
    },
    {
      label: '📑 切换贴附侧边栏 (Sidebar, Alt+S)',
      click: () => toggleSidebar()
    },
    {
      label: '⚡ 快速情报录入 (Alt+Space)',
      click: () => {
        if (hudWindow && !hudWindow.isDestroyed()) {
          if (!hudWindow.isVisible()) hudWindow.show();
          hudWindow.focus();
          hudWindow.webContents.send('focus-quick-input');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出系统',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('全自动智能探索伴侣 · 战术任务工作台');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      showFocusCard();
    } else {
      showWarRoom();
    }
  });
}

// 注册全局快捷键
function registerShortcuts() {
  // Alt+W: 展开/聚焦全景作战室 (1280x840)，收起极简卡片
  globalShortcut.register('Alt+W', showWarRoom);

  // Alt+F: 展开/聚焦极简聚焦卡片 (620x420)，收起全景作战室
  globalShortcut.register('Alt+F', showFocusCard);

  // Alt+Space 或 Alt+Q: 快速唤起 HUD 输入
  globalShortcut.register('Alt+Space', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
      if (!hudWindow.isVisible()) hudWindow.show();
      hudWindow.focus();
      hudWindow.webContents.send('focus-quick-input');
    }
  });

  // Alt+H: 切换 HUD 显示
  globalShortcut.register('Alt+H', toggleHud);

  // Alt+S: 切换内生贴附侧边栏 (Fallback to Alt+A)
  try {
    const sReg = globalShortcut.register('Alt+S', () => {
      toggleSidebar();
    });
    if (!sReg) {
      console.warn('[Shortcut] Alt+S registration failed, falling back to Alt+A');
      const aReg = globalShortcut.register('Alt+A', () => {
        toggleSidebar();
      });
      if (aReg) {
        console.log('[Shortcut] Registered fallback Alt+A for sidebar');
      } else {
        console.warn('[Shortcut] Alt+A registration also failed');
      }
    } else {
      console.log('[Shortcut] Registered Alt+S for sidebar');
    }
  } catch (err) {
    console.error('[Shortcut] Error registering sidebar shortcut:', err);
  }
}

// 单实例锁 (防止重复打开多个实例)
if (app && typeof app.requestSingleInstanceLock === 'function') {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    app.whenReady().then(() => {
      registerIpcHandlers();
      createMainWindow();
      createHudWindow();
      const sidebar = createSidebarWindow();
      if (sidebar && !sidebar.isVisible()) {
        sidebar.show();
        sidebar.focus();
      }
      setupTray();
      registerShortcuts();
      startClipboardWatcher();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
          createHudWindow();
          const sb = createSidebarWindow();
          if (sb && !sb.isVisible()) {
            sb.show();
            sb.focus();
          }
        }
      });
    });

    app.on('before-quit', () => {
      app.isQuitting = true;
    });

    app.on('will-quit', () => {
      stopClipboardWatcher();
      detachSidebarScreenListeners();
      globalShortcut.unregisterAll();
    });
  }
}

module.exports = {
  createSidebarWindow,
  toggleSidebar,
  hideSidebar,
  getSidebarBounds,
  clampSidebarWidth,
  detachSidebarScreenListeners,
  startClipboardWatcher,
  stopClipboardWatcher,
  getSidebarWindow: () => sidebarWindow
};


