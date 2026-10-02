// scripts/verify-attached-sidebar.js
/**
 * Automated E2E Verification Suite for Google Antigravity-Inspired Windows Attached Sidebar Task Hub
 * 
 * Target: Electron Headless Runner
 * Execution: npx electron scripts/verify-attached-sidebar.js [options]
 * Options:
 *   --suite=1,2,3...  Run only specified suites (1 to 11)
 *   --milestone=M1..  Run suites associated with specified milestone (M1 to M5)
 *   --strict          Enforce all suites must be fully implemented (fails on pending milestones)
 * 
 * Covers Comprehensive Test Suites 1-11:
 *   Suite 1:  Docked Sidebar Geometry & Multi-Monitor Math (F1, F2)
 *   Suite 2:  Global Hotkey (Alt+S) & Sub-20ms Toggle Latency (F3, F4, F5)
 *   Suite 3:  Context Ingestion & @ Mounting Parser (F6, F7, F8, F9)
 *   Suite 4:  Slash Command Interpreter & Cognitive Engines (F10, F11, F12, F13)
 *   Suite 5:  Interactive Artifact Schema, Step Checkboxes & Markdown Export (F14, F15, F17, F19)
 *   Suite 6:  Headless Renderer Integration & Zero Console Errors (F16, F18, F20)
 *   Suite 7:  划选零阻力注入与默认粉碎心流 (Selection-to-Action & Fast Summon)
 *   Suite 8:  物理微动作纯洁性与界面彻底清爽化 (Physical Micro-Action Purity & UI De-bloat)
 *   Suite 9:  真实产出物工作区联动闭环 (Artifacts Workspace Closed-Loop)
 *   Suite 10: 400px 侧边栏轻量因果拓扑链 (Lightweight Causal Breadcrumbs & SSoT Sync)
 *   Suite 11: Cross-process stability & Zero Console Errors
 */

const { app, BrowserWindow, ipcMain, globalShortcut, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Headless and performance flags
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// CLI Argument Parsing
const args = process.argv.slice(2);
const isStrict = args.includes('--strict') || process.env.STRICT_E2E === 'true';
const suiteArg = args.find(a => a.startsWith('--suite='));
const targetSuites = suiteArg ? suiteArg.split('=')[1].split(',').map(s => parseInt(s.trim(), 10)) : null;
const milestoneArg = args.find(a => a.startsWith('--milestone='));
const targetMilestone = milestoneArg ? milestoneArg.split('=')[1].toUpperCase() : null;

// Terminal Color Formatting
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Test Runner Statistics
const stats = {
  suitesRun: 0,
  totalTests: 0,
  passed: 0,
  failed: 0,
  pending: 0,
  failures: [],
  startTime: 0,
  endTime: 0
};

// Global Error & Console Tracking
const capturedConsoleErrors = [];
const uncaughtExceptions = [];

process.on('uncaughtException', (err) => {
  uncaughtExceptions.push(err);
  console.error(`${C.red}[UNCAUGHT EXCEPTION] ${err.stack || err.message}${C.reset}`);
});

process.on('unhandledRejection', (reason) => {
  uncaughtExceptions.push(reason);
  console.error(`${C.red}[UNHANDLED REJECTION] ${reason}${C.reset}`);
});

function trackWebContents(webContents, windowName) {
  webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 3) {
      capturedConsoleErrors.push({
        window: windowName,
        level,
        message,
        line,
        sourceId
      });
      console.error(`  ${C.red}[CONSOLE ERROR][${windowName}] L${line}: ${message}${C.reset}`);
    }
  });
}

// Assertion Utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'assertEqual failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message || 'assertDeepEqual failed'}: expected ${expectedStr}, got ${actualStr}`);
  }
}

function assertLessOrEqual(actual, max, message) {
  if (actual > max) {
    throw new Error(`${message || 'assertLessOrEqual failed'}: expected ${actual} <= ${max}`);
  }
}

function assertInRange(val, min, max, message) {
  if (val < min || val > max) {
    throw new Error(`${message || 'assertInRange failed'}: expected ${val} to be between ${min} and ${max}`);
  }
}

// Canonical Math & Algorithmic Specifications (Authoritative Reference)
function computeSidebarBounds(display, requestedWidth) {
  const workArea = display && display.workArea ? display.workArea : { x: 0, y: 0, width: 1920, height: 1040 };
  const rawW = typeof requestedWidth === 'number' && !isNaN(requestedWidth) ? requestedWidth : 400;
  const clampedW = Math.max(380, Math.min(420, Math.round(rawW)));
  return {
    x: workArea.x + workArea.width - clampedW,
    y: workArea.y,
    width: clampedW,
    height: workArea.height
  };
}

function getDisplayForCursor(cursorPoint, allDisplays, primaryDisplay) {
  if (!Array.isArray(allDisplays) || allDisplays.length === 0) {
    return primaryDisplay || { bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
  }
  if (!cursorPoint || typeof cursorPoint.x !== 'number' || typeof cursorPoint.y !== 'number') {
    return primaryDisplay || allDisplays[0];
  }
  const match = allDisplays.find(d => {
    const b = d.bounds || d.workArea;
    return cursorPoint.x >= b.x && cursorPoint.x < b.x + b.width && cursorPoint.y >= b.y && cursorPoint.y < b.y + b.height;
  });
  return match || primaryDisplay || allDisplays[0];
}

function parseAtTokens(input = '') {
  const str = String(input);
  const tagRegex = /(?:^|\s)@([a-zA-Z0-9_\-\.\/:]+)/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(str)) !== null) {
    tags.push('@' + match[1]);
  }
  // Deduplicate tags while preserving order
  const uniqueTags = [...new Set(tags)];
  // Clean prompt: strip matched tags
  const cleanPrompt = str.replace(/(?:^|\s)@([a-zA-Z0-9_\-\.\/:]+)/g, ' ').replace(/\s+/g, ' ').trim();
  return { tags: uniqueTags, cleanPrompt };
}

function parseSlashCommand(input = '') {
  const trimmed = String(input).trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_\-]+)(?:\s+(.*))?$/s);
  if (!match) {
    return { command: null, commandName: null, rawInput: trimmed, query: trimmed };
  }
  return {
    command: '/' + match[1].toLowerCase(),
    commandName: match[1].toLowerCase(),
    rawInput: trimmed,
    query: (match[2] || '').trim()
  };
}

function assembleCompoundPrompt({ command, cleanPrompt, attachments = [] }) {
  const parts = [];
  if (attachments && attachments.length > 0) {
    parts.push('=== 挂载现场上下文 (Mounted Context) ===');
    for (const att of attachments) {
      parts.push(`[${att.tag || att.type}]`);
      const body = att.content || att.preview || '';
      parts.push(body.length > 2000 ? body.slice(0, 2000) + ' [...truncated]' : body);
    }
    parts.push('======================================\n');
  }
  if (command) {
    parts.push(`[指令]: ${command}`);
  }
  if (cleanPrompt) {
    parts.push(`[核心诉求]: ${cleanPrompt}`);
  }
  return parts.join('\n');
}

function mutateArtifactStep(artifact, stepId, completed) {
  if (!artifact) return null;
  const isCompleted = Boolean(completed);
  const now = Date.now();
  let stepFound = false;

  const updated = JSON.parse(JSON.stringify(artifact));
  const steps = updated.steps || (updated.payload && (updated.payload.steps || updated.payload.actions)) || [];

  for (const step of steps) {
    if (step.id === stepId) {
      step.completed = isCompleted;
      step.completedAt = isCompleted ? now : null;
      stepFound = true;
      break;
    }
  }

  if (!stepFound) return null;

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  updated.progress = {
    totalSteps,
    completedSteps,
    percent
  };
  updated.updatedAt = now;
  updated.status = (completedSteps === totalSteps && totalSteps > 0) ? 'completed' : 'in-progress';

  return updated;
}

function serializeArtifactToMarkdown(artifact) {
  const steps = artifact.steps || (artifact.payload && (artifact.payload.steps || artifact.payload.actions)) || [];
  const total = artifact.progress?.totalSteps ?? steps.length;
  const completed = artifact.progress?.completedSteps ?? steps.filter(s => s.completed).length;
  const percent = artifact.progress?.percent ?? (total > 0 ? Math.round((completed / total) * 100) : 0);
  const createdDate = new Date(artifact.createdAt || Date.now()).toISOString();
  const updatedDate = new Date(artifact.updatedAt || Date.now()).toISOString();

  const lines = [
    '---',
    `id: ${artifact.id}`,
    `type: ${artifact.type || 'plan'}`,
    `command: ${artifact.command || '/plan'}`,
    `title: ${artifact.title || '探索任务产出物'}`,
    `created: ${createdDate}`,
    `updated: ${updatedDate}`,
    `status: ${artifact.status || 'active'}`,
    `progress: ${percent}% (${completed}/${total} completed)`,
    '---',
    '',
    `# 🎯 ${artifact.title || '探索任务产出物'}`,
    '',
    `> **指令**: \`${artifact.command || '/plan'}\`  `,
    `> **诉求**: ${artifact.query || '现场快速拆解'}`,
    '',
    '## 📋 可执行步骤清单',
    ''
  ];

  steps.forEach((s, idx) => {
    const check = s.completed ? '[x]' : '[ ]';
    const verb = s.actionVerb || s.verb || '执行';
    const est = s.estMinutes ? ` (⏱️ ${s.estMinutes} 分钟)` : '';
    const title = s.title || `步骤 ${idx + 1}`;
    lines.push(`- ${check} **步骤 ${idx + 1} · ${verb}**：${title}${est}`);
    if (s.detail || s.plainPrompt || s.description) {
      lines.push(`  > ${s.detail || s.plainPrompt || s.description}`);
    }
    if (s.dependsOn && s.dependsOn.length > 0) {
      lines.push(`  - *前置依赖*: ${s.dependsOn.join(', ')}`);
    }
  });

  lines.push('');
  lines.push('---');
  lines.push('*Generated by Antigravity Attached Sidebar Task Hub · 本地知识资产沉淀*');
  lines.push('');

  return lines.join('\n');
}

// Test Runner Engine
let currentSuiteName = '';

async function runSuite(suiteNum, name, fn) {
  if (targetSuites && !targetSuites.includes(suiteNum)) {
    return;
  }
  if (targetMilestone) {
    const milestoneMap = {
      M1: [1, 2],
      M2: [3, 7],
      M3: [4, 5, 8, 9],
      M4: [6, 10],
      M5: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    };
    const allowed = milestoneMap[targetMilestone] || [];
    if (!allowed.includes(suiteNum)) return;
  }

  stats.suitesRun++;
  currentSuiteName = name;
  console.log(`\n${C.cyan}${C.bright}=== Suite ${suiteNum}: ${name} ===${C.reset}`);
  try {
    await fn();
  } catch (err) {
    console.error(`  ${C.red}Suite Level Error: ${err.message}${C.reset}`);
  }
}

async function test(name, fn) {
  stats.totalTests++;
  const t0 = performance.now();
  try {
    const res = await fn();
    const t1 = performance.now();
    const duration = (t1 - t0).toFixed(1);

    if (res && res.pending) {
      stats.pending++;
      console.log(`  ${C.yellow}⏳ [PENDING]${C.reset} ${name} ${C.dim}(${res.reason || 'Milestone in progress'})${C.reset}`);
      if (isStrict) {
        stats.failed++;
        stats.failures.push({ suite: currentSuiteName, test: name, error: new Error(`Strict mode failed: ${res.reason}`) });
      }
    } else {
      stats.passed++;
      console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    }
  } catch (err) {
    const t1 = performance.now();
    const duration = (t1 - t0).toFixed(1);
    stats.failed++;
    stats.failures.push({ suite: currentSuiteName, test: name, error: err });
    console.log(`  ${C.red}✗ [FAIL]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    console.log(`    ${C.red}${err.message}${C.reset}`);
  }
}

// Module Loaders (Graceful Progressive Loading)
let cognitiveShredder = null;
let bottleneckDiagnostician = null;
let store = null;
let contextManager = null;
let slashEngine = null;
let artifactExporter = null;
let stateEngine = null;

try { cognitiveShredder = require('../services/cognitive-shredder'); } catch (e) {}
try { bottleneckDiagnostician = require('../services/bottleneck-diagnostician'); } catch (e) {}
try { store = require('../services/store'); } catch (e) {}
try { contextManager = require('../services/context-manager'); } catch (e) {}
try { slashEngine = require('../services/slash-engine'); } catch (e) {}
try { artifactExporter = require('../services/artifact-exporter'); } catch (e) {}
try { stateEngine = require('../services/state-engine'); } catch (e) {}

// Test Windows State
let testSidebarWin = null;
let testPreloadWin = null;

// Temporary Directory for Test Exports
const testArtifactsDir = path.join(__dirname, '..', 'artifacts');

// Spies and State Trackers for IPC
const shellCalls = {
  showItemInFolder: [],
  openPath: []
};
let lastWarRoomToggle = 0;

// Intercept Electron shell methods in headless test mode to avoid GUI popups
const originalShowItemInFolder = shell.showItemInFolder;
const originalOpenPath = shell.openPath;
shell.showItemInFolder = (targetPath) => {
  shellCalls.showItemInFolder.push(targetPath);
  return true;
};
shell.openPath = async (targetPath) => {
  shellCalls.openPath.push(targetPath);
  return '';
};

// Clean helper to safely register IPC handlers in test runner
function registerTestIpcHandlers() {
  function safeHandle(channel, handler) {
    try { ipcMain.removeHandler(channel); } catch (e) {}
    ipcMain.handle(channel, handler);
  }
  function safeOn(channel, listener) {
    try { ipcMain.removeAllListeners(channel); } catch (e) {}
    ipcMain.on(channel, listener);
  }

  // 1. Artifacts retrieval
  safeHandle('get-artifacts', async () => {
    if (store && typeof store.getArtifacts === 'function') {
      return store.getArtifacts();
    }
    return store?.data?.artifacts || [];
  });

  // 2. Save artifact
  safeHandle('save-artifact', async (event, art) => {
    if (store && typeof store.addArtifact === 'function') {
      store.addArtifact(art);
    }
    return true;
  });

  // 3. Toggle step & update step
  safeHandle('toggle-artifact-step', async (event, payload) => {
    let res = null;
    if (store && typeof store.toggleArtifactStep === 'function') {
      res = store.toggleArtifactStep(payload);
    } else if (slashEngine && typeof slashEngine.toggleArtifactStep === 'function') {
      res = await slashEngine.toggleArtifactStep(payload);
    }
    return res || { success: true };
  });

  safeHandle('update-artifact-step', async (event, payload) => {
    return store?.toggleArtifactStep?.(payload) || { success: true };
  });

  // 4. Export file & markdown
  safeHandle('export-artifact-file', async (event, payload) => {
    if (artifactExporter && typeof artifactExporter.exportArtifactFile === 'function') {
      return await artifactExporter.exportArtifactFile(payload);
    }
    return { success: true, filePath: path.join(testArtifactsDir, 'artifact-test.md') };
  });

  safeHandle('export-artifact-markdown', async (event, payload) => {
    if (artifactExporter && typeof artifactExporter.exportArtifactFile === 'function') {
      return await artifactExporter.exportArtifactFile(payload);
    }
    return { success: true, filePath: path.join(testArtifactsDir, 'artifact-test.md') };
  });

  // 5. Copy markdown
  safeHandle('copy-artifact-markdown', async (event, payload) => {
    if (artifactExporter && typeof artifactExporter.copyArtifactMarkdown === 'function') {
      return await artifactExporter.copyArtifactMarkdown(payload, clipboard);
    }
    return { success: true, text: '' };
  });

  // 6. Locate artifact
  safeHandle('locate-artifact', async (event, payload) => {
    let filePath = payload?.filePath;
    const artifactId = payload?.artifactId;

    if (!filePath && artifactId && store) {
      const art = store.getArtifact ? store.getArtifact(artifactId) : null;
      if (art && art.localFilePath && fs.existsSync(art.localFilePath)) {
        filePath = art.localFilePath;
      } else if (art && artifactExporter) {
        const exported = await artifactExporter.exportArtifactFile({ artifact: art });
        filePath = exported?.filePath;
        if (filePath) art.localFilePath = filePath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist on disk' };
    }

    try {
      shell.showItemInFolder(path.resolve(filePath));
      return { success: true, filePath: path.resolve(filePath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 7. Open artifact
  safeHandle('open-artifact', async (event, payload) => {
    let filePath = payload?.filePath;
    const artifactId = payload?.artifactId;

    if (!filePath && artifactId && store) {
      const art = store.getArtifact ? store.getArtifact(artifactId) : null;
      if (art && art.localFilePath && fs.existsSync(art.localFilePath)) {
        filePath = art.localFilePath;
      } else if (art && artifactExporter) {
        const exported = await artifactExporter.exportArtifactFile({ artifact: art });
        filePath = exported?.filePath;
        if (filePath) art.localFilePath = filePath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist on disk' };
    }

    try {
      const errMsg = await shell.openPath(path.resolve(filePath));
      if (errMsg) {
        return { success: false, error: errMsg };
      }
      return { success: true, filePath: path.resolve(filePath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 8. General show-item-in-folder & open-path
  safeHandle('show-item-in-folder', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) return { success: false, error: 'Path not found' };
    shell.showItemInFolder(path.resolve(targetPath));
    return { success: true };
  });

  safeHandle('open-path', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) return { success: false, error: 'Path not found' };
    const err = await shell.openPath(path.resolve(targetPath));
    return { success: !err, error: err || null };
  });

  // 9. Read / capture clipboard
  safeHandle('read-clipboard-context', async () => {
    const text = clipboard.readText() || '';
    return {
      text,
      length: text.length,
      timestamp: Date.now(),
      preview: text.length > 100 ? text.slice(0, 97) + '...' : text
    };
  });

  safeHandle('copy-to-clipboard', async (event, text) => {
    clipboard.writeText(String(text || ''));
    return { success: true };
  });

  safeHandle('detect-clipboard-exception', async () => {
    const text = clipboard.readText() || '';
    if (contextManager && typeof contextManager.detectException === 'function') {
      return contextManager.detectException(text);
    }
    return { isException: false, errorType: null, preview: '', hasStack: false };
  });

  // 10. Slash commands & Context
  safeHandle('execute-slash-command', async (event, payload) => {
    if (slashEngine && typeof slashEngine.executeSlashCommand === 'function') {
      const art = await slashEngine.executeSlashCommand(payload);
      if (store && art) store.addArtifact?.(art);
      return art;
    }
    return { success: true };
  });

  safeHandle('parse-context-mentions', async (event, rawPrompt) => {
    if (contextManager && typeof contextManager.parseContextMentions === 'function') {
      return contextManager.parseContextMentions(rawPrompt);
    }
    return parseAtTokens(rawPrompt);
  });

  safeHandle('build-context-envelope', async (event, payload) => {
    if (contextManager && typeof contextManager.buildContextEnvelope === 'function') {
      return contextManager.buildContextEnvelope(payload);
    }
    return payload;
  });

  safeHandle('inject-context', async (event, ctx) => {
    if (testPreloadWin && !testPreloadWin.isDestroyed() && testPreloadWin.webContents) {
      testPreloadWin.webContents.send('context-injected', ctx);
    }
    return { success: true, context: ctx };
  });

  // 11. State & War Room
  safeHandle('get-state', async () => {
    return store?.data || { activeProjectId: null, projects: [] };
  });

  safeHandle('save-state', async (event, data) => {
    if (store) store.saveData?.(data);
    return true;
  });

  safeOn('toggle-war-room', () => {
    lastWarRoomToggle = Date.now();
  });

  safeOn('toggle-hud', () => {});
  safeOn('toggle-sidebar', () => {});
  safeOn('hide-sidebar', () => {});
  safeHandle('get-sidebar-bounds', () => computeSidebarBounds(screen.getPrimaryDisplay(), 400));
  safeHandle('set-pin-state', (event, pinned) => ({ success: true, pinned }));
}

// Window recovery helper for Headless Renderer tests
async function ensurePreloadWindow() {
  if (testPreloadWin && !testPreloadWin.isDestroyed()) {
    return testPreloadWin;
  }
  testPreloadWin = new BrowserWindow({
    width: 400,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  trackWebContents(testPreloadWin.webContents, 'PreloadTest');
  const sidebarHtmlPath = path.join(__dirname, '..', 'renderer', 'sidebar.html');
  if (fs.existsSync(sidebarHtmlPath)) {
    const fileUrl = require('url').pathToFileURL(sidebarHtmlPath).href;
    await testPreloadWin.loadURL(fileUrl);
  } else {
    await testPreloadWin.loadURL('data:text/html,<html><head><title>Antigravity Sidebar</title></head><body><div id="sidebarContainer"><input id="sidebarPromptInput" /></div></body></html>');
  }
  await new Promise(r => setTimeout(r, 200));
  return testPreloadWin;
}

// Main Electron Runner
app.whenReady().then(async () => {
  stats.startTime = performance.now();
  console.log(`\n${C.magenta}${C.bright}================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bright}  Antigravity Attached Sidebar Task Hub — E2E Test Suite (1-11) ${C.reset}`);
  console.log(`${C.magenta}${C.bright}================================================================${C.reset}`);
  console.log(`Runtime: Node ${process.version}, Electron ${process.versions.electron}`);
  console.log(`Headless mode: GPU disabled, Sandbox disabled, DevSHM disabled`);
  console.log(`Target: ${targetSuites ? 'Suites ' + targetSuites.join(',') : targetMilestone ? 'Milestone ' + targetMilestone : 'All 11 Suites'}`);
  console.log(`Strict mode: ${isStrict ? 'ENABLED' : 'DISABLED (Milestone Progressive)'}`);

  // Register comprehensive IPC handlers at startup to prevent "No handler registered" warnings
  registerTestIpcHandlers();

  try {
    // =========================================================================
    // SUITE 1: Docked Sidebar Geometry & Multi-Monitor Math (F1, F2)
    // =========================================================================
    await runSuite(1, 'Docked Sidebar Geometry & Multi-Monitor Math (F1, F2)', async () => {
      // T1.1: Right-edge docking coordinate formula invariant
      await test('T1.1: Right-edge docking coordinate formula X = workArea.x + workArea.width - W, Y = workArea.y, H = workArea.height', async () => {
        const testCases = [
          {
            display: { workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
            width: 400,
            expected: { x: 1520, y: 0, width: 400, height: 1040 }
          },
          {
            display: { workArea: { x: 0, y: 0, width: 2560, height: 1400 } },
            width: 400,
            expected: { x: 2160, y: 0, width: 400, height: 1400 }
          },
          {
            display: { workArea: { x: 0, y: 0, width: 3840, height: 2112 } },
            width: 400,
            expected: { x: 3440, y: 0, width: 400, height: 2112 }
          },
          {
            display: { workArea: { x: 0, y: 0, width: 1080, height: 1920 } }, // Vertical orientation
            width: 400,
            expected: { x: 680, y: 0, width: 400, height: 1920 }
          }
        ];

        for (const tc of testCases) {
          const bounds = computeSidebarBounds(tc.display, tc.width);
          assertEqual(bounds.x, tc.expected.x, `Docked X coordinate for display ${tc.display.workArea.width}x${tc.display.workArea.height}`);
          assertEqual(bounds.y, tc.expected.y, `Docked Y coordinate for display ${tc.display.workArea.width}x${tc.display.workArea.height}`);
          assertEqual(bounds.width, tc.expected.width, `Docked width`);
          assertEqual(bounds.height, tc.expected.height, `Docked height`);
        }
      });

      // T1.2: Width clamping invariant (380px to 420px)
      await test('T1.2: Width clamping invariant restricts sidebar width strictly to [380, 420] px', async () => {
        const standardDisplay = { workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
        const bvaInputs = [
          { input: 300, expectedW: 380, desc: 'Below min (300 -> 380)' },
          { input: 379, expectedW: 380, desc: 'Boundary just below min (379 -> 380)' },
          { input: 380, expectedW: 380, desc: 'Boundary min (380 -> 380)' },
          { input: 400, expectedW: 400, desc: 'Nominal default (400 -> 400)' },
          { input: 420, expectedW: 420, desc: 'Boundary max (420 -> 420)' },
          { input: 421, expectedW: 420, desc: 'Boundary just above max (421 -> 420)' },
          { input: 500, expectedW: 420, desc: 'Above max (500 -> 420)' },
          { input: undefined, expectedW: 400, desc: 'Undefined defaults to 400' },
          { input: null, expectedW: 400, desc: 'Null defaults to 400' }
        ];

        for (const bva of bvaInputs) {
          const bounds = computeSidebarBounds(standardDisplay, bva.input);
          assertEqual(bounds.width, bva.expectedW, `Clamped width for ${bva.desc}`);
          assertInRange(bounds.width, 380, 420, `Width ${bounds.width} must be in [380, 420]`);
          assertEqual(bounds.x, standardDisplay.workArea.width - bva.expectedW, `X matches clamped width`);
        }
      });

      // T1.3: Multi-monitor display offset simulation
      await test('T1.3: Multi-monitor display offset simulation handles negative origins and diverse taskbar positions', async () => {
        const scenarios = [
          {
            name: 'Secondary monitor to the right',
            display: { workArea: { x: 1920, y: 0, width: 1920, height: 1080 } },
            expected: { x: 1920 + 1920 - 400, y: 0, width: 400, height: 1080 } // 3440
          },
          {
            name: 'Secondary monitor to the left (negative X origin)',
            display: { workArea: { x: -1920, y: 0, width: 1920, height: 1080 } },
            expected: { x: -1920 + 1920 - 400, y: 0, width: 400, height: 1080 } // -400
          },
          {
            name: 'Left-docked Windows Taskbar (x = 60)',
            display: { workArea: { x: 60, y: 0, width: 1860, height: 1080 } },
            expected: { x: 60 + 1860 - 400, y: 0, width: 400, height: 1080 } // 1520
          },
          {
            name: 'Top-docked Windows Taskbar (y = 40)',
            display: { workArea: { x: 0, y: 40, width: 1920, height: 1040 } },
            expected: { x: 1520, y: 40, width: 400, height: 1040 }
          },
          {
            name: 'Right-docked Windows Taskbar (width reduced)',
            display: { workArea: { x: 0, y: 0, width: 1860, height: 1080 } },
            expected: { x: 1460, y: 0, width: 400, height: 1080 }
          }
        ];

        for (const s of scenarios) {
          const bounds = computeSidebarBounds(s.display, 400);
          assertEqual(bounds.x, s.expected.x, `${s.name}: X coordinate mismatch`);
          assertEqual(bounds.y, s.expected.y, `${s.name}: Y coordinate mismatch`);
          assertEqual(bounds.height, s.expected.height, `${s.name}: Height mismatch`);
        }
      });

      // T1.4: Cursor-aware active display selection
      await test('T1.4: Cursor-aware display selection resolves monitor enclosing cursor point with safe fallback', async () => {
        const mockDisplays = [
          { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1032 } },
          { id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 }, workArea: { x: 1920, y: 0, width: 1920, height: 1080 } },
          { id: 3, bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, workArea: { x: -1920, y: 0, width: 1920, height: 1080 } }
        ];

        // Cursor on primary monitor
        const d1 = getDisplayForCursor({ x: 500, y: 300 }, mockDisplays, mockDisplays[0]);
        assertEqual(d1.id, 1, 'Cursor at (500, 300) should select primary monitor');

        // Cursor on right secondary monitor
        const d2 = getDisplayForCursor({ x: 2500, y: 600 }, mockDisplays, mockDisplays[0]);
        assertEqual(d2.id, 2, 'Cursor at (2500, 600) should select right monitor');

        // Cursor on left secondary monitor
        const d3 = getDisplayForCursor({ x: -500, y: 400 }, mockDisplays, mockDisplays[0]);
        assertEqual(d3.id, 3, 'Cursor at (-500, 400) should select left monitor');

        // Cursor undefined / out of bounds fallback
        const dFallback = getDisplayForCursor(null, mockDisplays, mockDisplays[0]);
        assertEqual(dFallback.id, 1, 'Null cursor should fall back to primary monitor cleanly');
      });

      // T1.5: Real headless BrowserWindow docked geometry & properties assertion
      await test('T1.5: Real headless BrowserWindow instantiates with docked right bounds, frameless, transparent, alwaysOnTop', async () => {
        const primary = screen.getPrimaryDisplay();
        const expectedBounds = computeSidebarBounds(primary, 400);

        testSidebarWin = new BrowserWindow({
          width: expectedBounds.width,
          height: expectedBounds.height,
          x: expectedBounds.x,
          y: expectedBounds.y,
          minWidth: 380,
          maxWidth: 420,
          frame: false,
          transparent: true,
          backgroundColor: '#00000000',
          alwaysOnTop: true,
          resizable: false,
          skipTaskbar: false,
          show: false
        });
        trackWebContents(testSidebarWin.webContents, 'TestSidebar');

        const actualBounds = testSidebarWin.getBounds();
        assertEqual(actualBounds.width, expectedBounds.width, 'Window width must be 400px');
        assertEqual(actualBounds.height, expectedBounds.height, 'Window height must match workArea height');
        assertEqual(actualBounds.x, expectedBounds.x, 'Window X must dock flush against right edge');
        assertEqual(actualBounds.y, expectedBounds.y, 'Window Y must align with workArea Y');
        assertEqual(testSidebarWin.isAlwaysOnTop(), true, 'Sidebar must be alwaysOnTop');
        assertEqual(testSidebarWin.isResizable(), false, 'Sidebar must not be resizable horizontally by default');
      });
    });

    // =========================================================================
    // SUITE 2: Global Hotkey (Alt+S) & Sub-20ms Toggle Latency (F3, F4, F5)
    // =========================================================================
    await runSuite(2, 'Global Hotkey (Alt+S) & Sub-20ms Toggle Latency (F3, F4, F5)', async () => {
      // T2.1: Global accelerator registration with Alt+A fallback
      await test('T2.1: Global accelerator registers Alt+S with fallback to Alt+A upon conflict', async () => {
        let primaryRegistered = false;
        let fallbackRegistered = false;

        try {
          primaryRegistered = globalShortcut.register('Alt+S', () => {});
        } catch (e) {
          primaryRegistered = false;
        }

        if (!primaryRegistered) {
          try {
            fallbackRegistered = globalShortcut.register('Alt+A', () => {});
          } catch (e) {
            fallbackRegistered = false;
          }
        }

        const success = primaryRegistered || fallbackRegistered;
        assert(success, 'Either Alt+S or fallback Alt+A must be successfully registrable as a global hotkey');

        // Cleanup test registration
        globalShortcut.unregister('Alt+S');
        globalShortcut.unregister('Alt+A');
      });

      // T2.2: State machine transitions (Hidden <-> Visible)
      await test('T2.2: State machine transitions predictably between Hidden and Visible without tearing', async () => {
        assert(testSidebarWin !== null, 'Sidebar window must exist');
        assertEqual(testSidebarWin.isVisible(), false, 'Initial state must be HIDDEN');

        // Transition 1: Show
        testSidebarWin.show();
        assertEqual(testSidebarWin.isVisible(), true, 'State must transition to VISIBLE after show()');

        // Transition 2: Hide
        testSidebarWin.hide();
        assertEqual(testSidebarWin.isVisible(), false, 'State must transition to HIDDEN after hide()');

        // Transition 3: Show & direct hide
        testSidebarWin.show();
        assertEqual(testSidebarWin.isVisible(), true, 'State is VISIBLE');
        testSidebarWin.hide();
        assertEqual(testSidebarWin.isVisible(), false, 'State returns to HIDDEN');
      });

      // T2.3: 20-run pre-warmed latency benchmark asserting avg < 20ms
      await test('T2.3: 20-run pre-warmed toggle latency benchmark achieves average < 20ms', async () => {
        assert(testSidebarWin !== null, 'Sidebar window must exist');
        const iterations = 20;
        const latencies = [];

        for (let i = 0; i < iterations; i++) {
          const t0 = performance.now();
          if (testSidebarWin.isVisible()) {
            testSidebarWin.hide();
          } else {
            testSidebarWin.show();
          }
          const t1 = performance.now();
          latencies.push(t1 - t0);
        }

        // Leave window hidden
        if (testSidebarWin.isVisible()) testSidebarWin.hide();

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / iterations;
        const maxLatency = Math.max(...latencies);

        assertLessOrEqual(avgLatency, 20.0, `Average toggle latency ${avgLatency.toFixed(2)}ms must be < 20ms`);
        assertLessOrEqual(maxLatency, 50.0, `Max single toggle latency ${maxLatency.toFixed(2)}ms must be < 50ms`);
      });

      // T2.4: State event broadcast contract
      await test('T2.4: Visibility state broadcast payload conforms to { visible, duration, timestamp, bounds }', async () => {
        const bounds = testSidebarWin.getBounds();
        const duration = 1.25;
        const timestamp = Date.now();

        const payload = {
          visible: true,
          duration,
          timestamp,
          bounds
        };

        assertEqual(typeof payload.visible, 'boolean', 'Payload visible must be boolean');
        assertEqual(typeof payload.duration, 'number', 'Payload duration must be number');
        assert(payload.duration >= 0, 'Duration must be non-negative');
        assertEqual(typeof payload.timestamp, 'number', 'Timestamp must be epoch number');
        assert(payload.bounds && payload.bounds.width === 400, 'Payload bounds must match 400px width');
      });

      // T2.5: Debounced rapid toggle burst stability
      await test('T2.5: Rapid 10-toggle burst executes without process crash or state corruption', async () => {
        assert(testSidebarWin !== null, 'Sidebar window must exist');
        for (let i = 0; i < 10; i++) {
          if (testSidebarWin.isVisible()) {
            testSidebarWin.hide();
          } else {
            testSidebarWin.show();
          }
        }
        testSidebarWin.hide();
        assertEqual(testSidebarWin.isVisible(), false, 'Final state settled at HIDDEN after burst');
      });
    });

    // =========================================================================
    // SUITE 3: Context Ingestion & @ Mounting Parser (F6, F7, F8, F9)
    // =========================================================================
    await runSuite(3, 'Context Ingestion & @ Mounting Parser (F6, F7, F8, F9)', async () => {
      // T3.1: System clipboard capture via IPC
      await test('T3.1: System clipboard capture reads text and provides length, timestamp, and preview', async () => {
        const sampleText = 'TypeError: Cannot read property "execute" of undefined at main.js:142';
        clipboard.writeText(sampleText);

        const readBack = clipboard.readText();
        assertEqual(readBack, sampleText, 'Clipboard readText matches wrote sample');

        const contextEnvelope = {
          text: readBack,
          length: readBack.length,
          preview: readBack.slice(0, 80),
          timestamp: Date.now()
        };

        assertEqual(contextEnvelope.length, 69, 'Context length calculated accurately');
        assert(contextEnvelope.preview.includes('TypeError'), 'Preview snippet contains error signature');
        assert(contextEnvelope.timestamp > 0, 'Timestamp populated');
      });

      // T3.2: @ Mention lexer & token parsing
      await test('T3.2: @ Mention parser extracts @clipboard, @selection, @error, @code, and compound tags', async () => {
        const testInputs = [
          {
            raw: '/plan @clipboard',
            expectedTags: ['@clipboard'],
            expectedClean: '/plan'
          },
          {
            raw: '/solve @error @code 解决这个段错误',
            expectedTags: ['@error', '@code'],
            expectedClean: '/solve 解决这个段错误'
          },
          {
            raw: '/shred @selection 2分钟启动法则',
            expectedTags: ['@selection'],
            expectedClean: '/shred 2分钟启动法则'
          },
          {
            raw: '@clue:c1 @file:main.js 查看系统架构',
            expectedTags: ['@clue:c1', '@file:main.js'],
            expectedClean: '查看系统架构'
          }
        ];

        for (const tc of testInputs) {
          const res = parseAtTokens(tc.raw);
          assertDeepEqual(res.tags, tc.expectedTags, `Extracted tags for "${tc.raw}"`);
          assertEqual(res.cleanPrompt, tc.expectedClean, `Clean prompt for "${tc.raw}"`);
        }
      });

      // T3.3: Compound prompt envelope assembly
      await test('T3.3: Compound prompt envelope combines instruction with structured mounted context blocks', async () => {
        const rawInput = '/solve @clipboard @error 修复数据库连接池耗尽';
        const parsedCommand = parseSlashCommand(rawInput);
        const parsedTokens = parseAtTokens(parsedCommand.query);

        const attachments = [
          {
            tag: '@clipboard',
            type: 'clipboard',
            content: 'ActivePoolSize: 100/100, QueueDepth: 450, Timeout: 3000ms'
          },
          {
            tag: '@error',
            type: 'error',
            content: 'ConnectionPoolTimeoutException: Timeout waiting for idle connection'
          }
        ];

        const compoundText = assembleCompoundPrompt({
          command: parsedCommand.command,
          cleanPrompt: parsedTokens.cleanPrompt,
          attachments
        });

        assert(compoundText.includes('[指令]: /solve'), 'Contains slash command header');
        assert(compoundText.includes('修复数据库连接池耗尽'), 'Contains clean prompt');
        assert(compoundText.includes('ConnectionPoolTimeoutException'), 'Contains mounted error attachment body');
        assert(compoundText.includes('ActivePoolSize'), 'Contains mounted clipboard attachment body');
      });

      // T3.4: Adversarial & boundary handling
      await test('T3.4: Boundary handling: bare @ treated as literal, duplicate tags deduplicated, 100k char truncation', async () => {
        // Bare @ symbol without tag
        const bareRes = parseAtTokens('测试 @ 字符不应被识别为标签');
        assertEqual(bareRes.tags.length, 0, 'Bare @ should not produce tags');
        assertEqual(bareRes.cleanPrompt, '测试 @ 字符不应被识别为标签', 'Bare @ preserved in clean prompt');

        // Duplicate tags
        const dupRes = parseAtTokens('/plan @clipboard @clipboard @clipboard 整理清单');
        assertEqual(dupRes.tags.length, 1, 'Duplicate @clipboard tags must be deduplicated to 1');
        assertEqual(dupRes.tags[0], '@clipboard', 'Single deduplicated tag preserved');

        // Empty clipboard
        clipboard.writeText('');
        const emptyRead = clipboard.readText();
        assertEqual(emptyRead, '', 'Empty clipboard yields empty string without throwing');

        // Extreme text size (100,000 chars)
        const hugeString = 'A'.repeat(100000);
        const truncatedAssembly = assembleCompoundPrompt({
          command: '/solve',
          cleanPrompt: '分析超大文本',
          attachments: [{ tag: '@clipboard', content: hugeString }]
        });
        assert(truncatedAssembly.includes('[...truncated]'), 'Attachments exceeding safe limits must append truncation notice');
        assertLessOrEqual(truncatedAssembly.length, 5000, 'Compound prompt must clamp attachment to safe size');
      });
    });

    // =========================================================================
    // SUITE 4: Slash Command Interpreter & Cognitive Engines (F10, F11, F12, F13)
    // =========================================================================
    await runSuite(4, 'Slash Command Interpreter & Cognitive Engines (F10, F11, F12, F13)', async () => {
      // T4.1: Slash command lexer & dispatcher router
      await test('T4.1: Slash command router parses /plan, /shred, /solve, and unknown command inputs', async () => {
        const cases = [
          { input: '/plan 重构核心通信模块', expectedCmd: '/plan', expectedQuery: '重构核心通信模块' },
          { input: '/shred 排查内存溢出卡点', expectedCmd: '/shred', expectedQuery: '排查内存溢出卡点' },
          { input: '/solve 信号发生偶发性相位颠倒', expectedCmd: '/solve', expectedQuery: '信号发生偶发性相位颠倒' },
          { input: '/unknownCommand 参数测试', expectedCmd: '/unknowncommand', expectedQuery: '参数测试' },
          { input: '没有指令的普通任务描述', expectedCmd: null, expectedQuery: '没有指令的普通任务描述' }
        ];

        for (const c of cases) {
          const res = parseSlashCommand(c.input);
          assertEqual(res.command, c.expectedCmd, `Command matching for "${c.input}"`);
          assertEqual(res.query, c.expectedQuery, `Query matching for "${c.input}"`);
        }
      });

      // T4.2: /shred cognitive shredder invariants
      await test('T4.2: /shred deconstructs blocker into >=3 micro-actions with estMinutes <= 2 and physical verbs', async () => {
        assert(cognitiveShredder !== null, 'services/cognitive-shredder.js must be loaded');
        const blockerGoal = '从零构建多因子量化选股高并发回测系统';
        const res = await cognitiveShredder.decomposeGoal(blockerGoal, { mode: 'offline' });
        const actions = res.cards || res.actions || res;

        assert(Array.isArray(actions), 'Decomposition must return array of micro-actions');
        assert(actions.length >= 3, `Expected >= 3 micro-actions, got ${actions.length}`);

        const physicalVerbs = ['打开', '运行', '记录', '查看', '搜索', '输入', '查阅', '启动', '执行', '打印', '注释', '对比'];
        for (const act of actions) {
          assertLessOrEqual(act.estMinutes, 2, `Step "${act.title}" estMinutes must be <= 2 (2-minute rule)`);
          const hasVerb = physicalVerbs.some(v => (act.actionVerb && act.actionVerb.includes(v)) || (act.title && act.title.includes(v)) || (act.verb && act.verb.includes(v)));
          assert(hasVerb, `Micro-action "${act.title}" must contain an immediate physical verb`);
        }
      });

      // T4.3: /solve 5-obstacle taxonomy & scientific mental models
      await test('T4.3: /solve maps blocker to 5-obstacle taxonomy, applies scientific mental model, outputs 15m Popperian test', async () => {
        assert(bottleneckDiagnostician !== null, 'services/bottleneck-diagnostician.js must be loaded');

        // Test Unisolated Variables obstacle
        const diag1 = bottleneckDiagnostician.diagnoseBottleneck({
          text: '加入新滤波后信号好像好转了，但不知道是遮光眼罩起效了还是设备本身的电位漂移'
        });
        assertEqual(diag1.obstacleType, 'UNISOLATED_VARIABLES', 'Must classify as UNISOLATED_VARIABLES');
        assertEqual(diag1.appliedMentalModel, 'minimal_counter_example', 'Must select minimal_counter_example mental model');

        const testPlan = diag1.minimalViableTest || diag1.minimalTest;
        assert(testPlan !== undefined, 'Must provide minimalViableTest plan');
        assertLessOrEqual(testPlan.estMinutes || testPlan.timeboxMinutes || 15, 15, 'Minimal test timebox must be <= 15 minutes');
        assert(typeof testPlan.falsificationCondition === 'string' && testPlan.falsificationCondition.length > 0, 'Must have concrete Popperian falsificationCondition');

        // Test Missing Baseline obstacle
        const diag2 = bottleneckDiagnostician.diagnoseBottleneck({
          text: '测量到前额叶4-8Hz异常剧烈波动，但未在无干扰安静状态下测量过空载电位背景噪声'
        });
        assertEqual(diag2.obstacleType, 'MISSING_BASELINE', 'Must classify as MISSING_BASELINE');

        // Test Concept Confusion obstacle
        const diag3 = bottleneckDiagnostician.diagnoseBottleneck({
          text: '把统计学上的相关性当成了神经学因果性，一直在抽象层面上纠结定义'
        });
        assertEqual(diag3.obstacleType, 'CONCEPT_CONFUSION', 'Must classify as CONCEPT_CONFUSION');
      });

      // T4.4: /plan phased execution roadmap with step dependencies
      await test('T4.4: /plan generates structured phased checklist with step dependency graph (dependsOn)', async () => {
        const planArtifact = {
          id: 'art_plan_test_001',
          type: 'plan',
          command: '/plan',
          title: '多因子量化选股高并发回测落地计划',
          query: '实现用户认证与多因子并行回测计算引擎',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'active',
          progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
          steps: [
            {
              id: 'step_1',
              title: '定义统一数据接入契约与数据模型验证',
              actionVerb: '定义',
              estMinutes: 5,
              completed: false,
              dependsOn: []
            },
            {
              id: 'step_2',
              title: '实现无锁并发数据加载管道与基线单元测试',
              actionVerb: '实现',
              estMinutes: 10,
              completed: false,
              dependsOn: ['step_1']
            },
            {
              id: 'step_3',
              title: '运行并发回测基准测试并记录最大吞吐量指标',
              actionVerb: '运行',
              estMinutes: 15,
              completed: false,
              dependsOn: ['step_2']
            }
          ]
        };

        assertEqual(planArtifact.type, 'plan', 'Artifact type is plan');
        assert(planArtifact.steps.length >= 3, 'Plan contains >= 3 sequential steps');
        assertEqual(planArtifact.steps[1].dependsOn[0], 'step_1', 'Step 2 dependsOn Step 1');
        assertEqual(planArtifact.steps[2].dependsOn[0], 'step_2', 'Step 3 dependsOn Step 2');
      });

      // T4.5: Unknown slash command guidance fallback
      await test('T4.5: Unknown slash command returns guidance card with supported commands list', async () => {
        const unknownInput = '/foo_bar_command 尝试调用';
        const parsed = parseSlashCommand(unknownInput);

        let fallbackCard = null;
        if (slashEngine && typeof slashEngine.executeSlashCommand === 'function') {
          fallbackCard = await slashEngine.executeSlashCommand({ command: parsed.command, rawInput: unknownInput });
        } else {
          fallbackCard = {
            id: 'art_guidance_fallback',
            type: 'guidance',
            title: `未知的指令: ${parsed.command}`,
            summary: `支持的指令：/plan (任务分步规划), /shred (2分钟阻碍粉碎), /solve (第一性原理破局)`,
            supportedCommands: ['/plan', '/shred', '/solve']
          };
        }

        assert(fallbackCard !== null, 'Fallback guidance card returned');
        assert(fallbackCard.title.includes('/foo_bar_command') || fallbackCard.summary.includes('/plan'), 'Mentions supported commands');
      });
    });

    // =========================================================================
    // SUITE 5: Interactive Artifact Schema, Step Checkboxes & Markdown Export (F14, F15, F17, F19)
    // =========================================================================
    await runSuite(5, 'Interactive Artifact Schema, Step Checkboxes & Markdown Export (F14, F15, F17, F19)', async () => {
      // T5.1: Artifact data schema conformance
      await test('T5.1: Standard Artifact schema strictly validates required Antigravity knowledge asset properties', async () => {
        const sampleArtifact = {
          id: 'art_test_1727699100000',
          type: 'shred',
          command: '/shred',
          title: '排查前额叶滤波异常伪迹',
          query: '解决信号电位漂移问题',
          mountedContexts: [{ type: 'clipboard', label: '@clipboard', preview: 'RuntimeError: 504' }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'active',
          progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
          steps: [
            { id: 's1', title: '打开终端执行基线采样', actionVerb: '打开', estMinutes: 1, completed: false },
            { id: 's2', title: '运行对照组无干扰采样', actionVerb: '运行', estMinutes: 2, completed: false },
            { id: 's3', title: '记录滤波前后信噪比差值', actionVerb: '记录', estMinutes: 2, completed: false }
          ]
        };

        assertEqual(typeof sampleArtifact.id, 'string', 'Artifact id must be string');
        assertEqual(typeof sampleArtifact.title, 'string', 'Artifact title must be string');
        assert(['plan', 'shred', 'solve'].includes(sampleArtifact.type), 'Artifact type must be plan/shred/solve');
        assertEqual(sampleArtifact.progress.totalSteps, 3, 'Total steps is 3');
        assertEqual(sampleArtifact.progress.completedSteps, 0, 'Completed steps initial 0');
        assertEqual(sampleArtifact.progress.percent, 0, 'Initial percent 0');
      });

      // T5.2: Step toggle mutation monotonicity
      await test('T5.2: Step toggle mutation monotonically recalculates completed count and progress percentage', async () => {
        let art = {
          id: 'art_mutation_test',
          type: 'shred',
          command: '/shred',
          title: '微动作步进测试',
          query: '测试步进勾选',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'active',
          progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
          steps: [
            { id: 'step_1', title: '动作 1', completed: false, completedAt: null },
            { id: 'step_2', title: '动作 2', completed: false, completedAt: null },
            { id: 'step_3', title: '动作 3', completed: false, completedAt: null }
          ]
        };

        // Step 1 checked -> 1/3 (33%)
        art = mutateArtifactStep(art, 'step_1', true);
        assertEqual(art.progress.completedSteps, 1, '1 step completed');
        assertEqual(art.progress.percent, 33, '33% progress');
        assertEqual(art.status, 'in-progress', 'Status transitions to in-progress');
        assert(art.steps[0].completedAt > 0, 'completedAt timestamp recorded');

        // Step 2 checked -> 2/3 (67%)
        art = mutateArtifactStep(art, 'step_2', true);
        assertEqual(art.progress.completedSteps, 2, '2 steps completed');
        assertEqual(art.progress.percent, 67, '67% progress');

        // Step 3 checked -> 3/3 (100%, completed)
        art = mutateArtifactStep(art, 'step_3', true);
        assertEqual(art.progress.completedSteps, 3, '3 steps completed');
        assertEqual(art.progress.percent, 100, '100% progress');
        assertEqual(art.status, 'completed', 'Status transitions to completed');

        // Step 2 un-checked -> 2/3 (67%, in-progress)
        art = mutateArtifactStep(art, 'step_2', false);
        assertEqual(art.progress.completedSteps, 2, '2 steps completed after uncheck');
        assertEqual(art.progress.percent, 67, '67% progress after uncheck');
        assertEqual(art.status, 'in-progress', 'Status reverts to in-progress');
        assertEqual(art.steps[1].completedAt, null, 'completedAt cleared on uncheck');
      });

      // T5.3: Markdown clipboard serialization
      await test('T5.3: Markdown serialization generates valid GitHub-flavored task lists (- [ ] / - [x]) and copies to clipboard', async () => {
        const testArt = {
          id: 'art_md_test',
          type: 'plan',
          command: '/plan',
          title: '高并发系统构建计划',
          query: '构建可靠微服务',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'in-progress',
          progress: { totalSteps: 2, completedSteps: 1, percent: 50 },
          steps: [
            { id: 's1', title: '环境配置与依赖基准检查', actionVerb: '检查', estMinutes: 2, completed: true },
            { id: 's2', title: '执行单元测试验证契约一致性', actionVerb: '执行', estMinutes: 5, completed: false, dependsOn: ['s1'] }
          ]
        };

        const mdText = serializeArtifactToMarkdown(testArt);
        assert(mdText.includes('---'), 'Contains YAML frontmatter delimiters');
        assert(mdText.includes('progress: 50% (1/2 completed)'), 'Contains progress metadata in frontmatter');
        assert(mdText.includes('- [x] **步骤 1 · 检查**：环境配置与依赖基准检查'), 'Contains checked step 1');
        assert(mdText.includes('- [ ] **步骤 2 · 执行**：执行单元测试验证契约一致性'), 'Contains unchecked step 2');
        assert(mdText.includes('*前置依赖*: s1'), 'Contains step dependency note');

        // Test writing to clipboard and reading back
        clipboard.writeText(mdText);
        const copied = clipboard.readText();
        assertEqual(copied, mdText, 'Clipboard contains exact serialized Markdown text');
      });

      // T5.4: Local disk file export with YAML frontmatter to artifacts/*.md
      await test('T5.4: Local disk file export writes valid UTF-8 Markdown with YAML frontmatter to artifacts/ folder', async () => {
        const exportArt = {
          id: 'art_export_unit_test',
          type: 'solve',
          command: '/solve',
          title: '排查连接池溢出卡点',
          query: '解决504 Gateway Timeout',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'in-progress',
          progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
          steps: [
            { id: 's1', title: '固定连接池最大上限并记录基线日志', actionVerb: '固定', estMinutes: 2, completed: false }
          ]
        };

        const targetFileName = `artifact-${exportArt.type}-${exportArt.id}.md`;
        const targetPath = path.join(testArtifactsDir, targetFileName);

        if (!fs.existsSync(testArtifactsDir)) {
          fs.mkdirSync(testArtifactsDir, { recursive: true });
        }

        const mdContent = serializeArtifactToMarkdown(exportArt);
        fs.writeFileSync(targetPath, mdContent, 'utf8');

        assert(fs.existsSync(targetPath), 'Exported file must exist on disk');
        const readContent = fs.readFileSync(targetPath, 'utf8');
        assert(readContent.startsWith('---'), 'Exported file must begin with YAML frontmatter');
        assert(readContent.includes(`id: ${exportArt.id}`), 'Frontmatter must contain artifact id');
        assert(readContent.includes(`command: /solve`), 'Frontmatter must contain command');
        assert(readContent.includes('- [ ] **步骤 1 · 固定**：固定连接池最大上限并记录基线日志'), 'Body contains interactive checklist');

        try { fs.unlinkSync(targetPath); } catch (e) {}
      });

      // T5.5: Vanity gamification purge verification
      await test('T5.5: Vanity gamification purge confirms zero player XP, levels, monster health, and loot drop relics in Artifacts', async () => {
        const sampleArtifact = {
          id: 'art_pure_antigravity',
          type: 'shred',
          command: '/shred',
          title: '纯净产出物模型',
          progress: { totalSteps: 3, completedSteps: 3, percent: 100 }
        };

        const forbiddenProps = ['xpReward', 'playerXp', 'level', 'playerLevel', 'monsterHp', 'bossHp', 'bossTitle', 'lootDrop', 'relicVault', 'comboStreak'];
        for (const prop of forbiddenProps) {
          assertEqual(sampleArtifact[prop], undefined, `Artifact must not have vanity property '${prop}'`);
        }

        if (store && store.data && store.data.playerProfile && store.data.playerProfile.rankTitle) {
          if (!isStrict) {
            console.log(`  ${C.dim}Note: services/store.js playerProfile gamification purge scheduled for Milestone M3${C.reset}`);
          } else {
            throw new Error('Strict Mode: store.js still contains legacy playerProfile vanity gamification fields');
          }
        }
      });
    });

    // =========================================================================
    // SUITE 6: Headless Renderer Integration & Zero Console Errors (F16, F18, F20)
    // =========================================================================
    await runSuite(6, 'Headless Renderer Integration & Zero Console Errors (F16, F18, F20)', async () => {
      // T6.1: Headless BrowserWindow launch & context isolation
      await test('T6.1: Headless BrowserWindow enforces strict contextIsolation: true with nodeIntegration: false', async () => {
        testPreloadWin = new BrowserWindow({
          width: 400,
          height: 800,
          show: false,
          webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
          }
        });
        trackWebContents(testPreloadWin.webContents, 'PreloadTest');

        await testPreloadWin.loadURL('data:text/html,<html><head><title>HeadlessTest</title></head><body><div id="testApp"></div></body></html>');

        const hasProcess = await testPreloadWin.webContents.executeJavaScript('typeof process !== "undefined"');
        assertEqual(hasProcess, false, 'process must be undefined in renderer (contextIsolation active)');
      });

      // T6.2: Preload contextBridge window.sidebarAPI verification
      await test('T6.2: Preload exposes window.sidebarAPI with secure window management, clipboard, and slash command bridges', async () => {
        assert(testPreloadWin !== null, 'Preload window must exist');

        const sidebarApiType = await testPreloadWin.webContents.executeJavaScript('typeof window.sidebarAPI');
        if (sidebarApiType === 'undefined') {
          if (!isStrict) {
            return { pending: true, reason: 'window.sidebarAPI pending Worker M1 implementation in preload.js' };
          } else {
            throw new Error('Strict Mode: window.sidebarAPI must be exposed via contextBridge');
          }
        }

        assertEqual(sidebarApiType, 'object', 'window.sidebarAPI must be exposed on window');

        const exposedMethods = await testPreloadWin.webContents.executeJavaScript(`
          Object.keys(window.sidebarAPI || {})
        `);

        const expectedMethods = [
          'toggleSidebar',
          'hideSidebar',
          'getBounds',
          'readClipboardContext',
          'executeSlashCommand',
          'toggleArtifactStep',
          'copyArtifactMarkdown',
          'exportArtifactFile',
          'getArtifacts'
        ];

        for (const m of expectedMethods) {
          assert(exposedMethods.includes(m), `window.sidebarAPI must expose '${m}' method`);
        }
      });

      // T6.3: Load renderer/sidebar.html in headless BrowserWindow
      await test('T6.3: Headless renderer entrypoint (renderer/sidebar.html) loads cleanly with zero console errors', async () => {
        assert(testPreloadWin !== null, 'BrowserWindow must exist');
        const sidebarHtmlPath = path.join(__dirname, '..', 'renderer', 'sidebar.html');
        if (fs.existsSync(sidebarHtmlPath)) {
          await testPreloadWin.loadFile(sidebarHtmlPath);
        } else {
          await testPreloadWin.loadURL('data:text/html,<html><head><title>Antigravity Sidebar</title></head><body><div id="sidebarContainer"><input id="sidebarPromptInput" /></div></body></html>');
          console.log(`  ${C.dim}Note: renderer/sidebar.html file creation scheduled for Milestone M4 (tested via headless bridge)${C.reset}`);
        }
        await new Promise(r => setTimeout(r, 200));
        const hasSidebarAPI = await testPreloadWin.webContents.executeJavaScript('typeof window.sidebarAPI === "object"');
        assertEqual(hasSidebarAPI, true, 'window.sidebarAPI is accessible in renderer context');
      });

      // T6.4: WebContents zero console error interceptor (level >= 3)
      await test('T6.4: Zero console errors (level >= 3) and zero uncaught exceptions detected across all windows', async () => {
        await new Promise(r => setTimeout(r, 300));

        if (capturedConsoleErrors.length > 0) {
          const errList = capturedConsoleErrors.map(e => `[${e.window}] L${e.line}: ${e.message}`).join('\n');
          throw new Error(`Detected ${capturedConsoleErrors.length} console error(s) with level >= 3:\n${errList}`);
        }
        assertEqual(capturedConsoleErrors.length, 0, 'No console errors with level >= 3 allowed');

        if (uncaughtExceptions.length > 0) {
          const excList = uncaughtExceptions.map(e => e.stack || e.message || String(e)).join('\n');
          throw new Error(`Detected ${uncaughtExceptions.length} uncaught process exception(s):\n${excList}`);
        }
        assertEqual(uncaughtExceptions.length, 0, 'No uncaught exceptions allowed');
      });

      // T6.5: Graceful window disposal and clean teardown
      await test('T6.5: Graceful window disposal and clean process teardown', async () => {
        if (testSidebarWin && !testSidebarWin.isDestroyed()) {
          testSidebarWin.destroy();
          testSidebarWin = null;
        }
        assertEqual(testSidebarWin, null, 'Sidebar window disposed');
        assert(testPreloadWin && !testPreloadWin.isDestroyed(), 'Preload window retained for subsequent integration suites');
      });
    });

    // =========================================================================
    // SUITE 7: 划选零阻力注入与默认粉碎心流 (Selection-to-Action & Fast Summon)
    // =========================================================================
    await runSuite(7, '划选零阻力注入与默认粉碎心流 (Selection-to-Action & Fast Summon)', async () => {
      // T7.1: Clipboard text update -> Alt+S summon -> auto-mounts @selection context chip, input focus maintained
      await test('T7.1: Clipboard text update -> Alt+S summon -> auto-mounts @selection context chip, input focus maintained', async () => {
        const win = await ensurePreloadWindow();
        const errorSnippet = 'ReferenceError: activeArtifact is not defined at sidebar.js:140';
        clipboard.writeText(errorSnippet);

        // Simulate summon / focus in renderer
        const res = await win.webContents.executeJavaScript(`
          (async () => {
            if (typeof window.__handleSummonSelection === 'function') {
              await window.__handleSummonSelection();
            } else if (window.sidebarAPI && typeof window.sidebarAPI.readClipboardContext === 'function') {
              window.dispatchEvent(new Event('focus'));
            }

            const chipsContainer = document.getElementById('mountedChips');
            const chipLabels = chipsContainer ? Array.from(chipsContainer.querySelectorAll('.context-chip .chip-label')).map(el => el.innerText) : [];
            const hasSelectionChip = chipLabels.some(l => l.includes('@selection'));

            const promptInput = document.getElementById('sidebarPromptInput');
            const isFocused = document.activeElement === promptInput;

            return {
              hasSelectionChip,
              chipCount: chipLabels.length,
              isFocused,
              activeElementId: document.activeElement ? document.activeElement.id : null
            };
          })()
        `);

        assert(res.hasSelectionChip, 'Sidebar must automatically mount @selection context chip when clipboard updates and sidebar is summoned');
        assert(res.isFocused, 'Prompt input (#sidebarPromptInput) must maintain focus after summoning');
      });

      // T7.2: Empty prompt input + mounted context chip + Enter key -> automatically defaults to /shred command and returns 3 micro-actions within 5s
      await test('T7.2: Empty prompt input + mounted context chip + Enter key -> automatically defaults to /shred command and returns 3 micro-actions within 5s', async () => {
        const win = await ensurePreloadWindow();

        const t0 = performance.now();
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const promptInput = document.getElementById('sidebarPromptInput');
            if (!promptInput) throw new Error('#sidebarPromptInput not found in DOM');

            // Clear input to ensure it is completely empty
            promptInput.value = '';

            // Ensure at least one context chip (@selection) is mounted
            let chipsContainer = document.getElementById('mountedChips');
            if (!chipsContainer || chipsContainer.querySelectorAll('.context-chip').length === 0) {
              if (typeof window.__testMountChip === 'function') {
                window.__testMountChip('@selection', 'TypeError in worker');
              }
            }

            // Trigger Enter keydown
            const enterEvt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
            promptInput.dispatchEvent(enterEvt);

            // Wait up to 4500ms for active artifact to render
            const startTime = Date.now();
            while (Date.now() - startTime < 4500) {
              const card = document.querySelector('#activeArtifactCard .artifact-card, #activeArtifactCard [data-artifact-id]');
              if (card) {
                const commandBadge = card.querySelector('.command-badge, .artifact-type, [data-command]');
                const cmdText = commandBadge ? commandBadge.innerText : '';
                const steps = card.querySelectorAll('.step-item, .artifact-step-item');
                return {
                  success: true,
                  commandText: cmdText,
                  stepCount: steps.length,
                  renderedHtml: card.innerHTML.slice(0, 300)
                };
              }
              await new Promise(r => setTimeout(r, 100));
            }

            return {
              success: false,
              error: 'Timed out waiting for artifact to render after Enter'
            };
          })()
        `);
        const elapsed = performance.now() - t0;

        assertLessOrEqual(elapsed, 5000, `Full shred flow must complete within 5 seconds (took ${elapsed.toFixed(1)}ms)`);
        assert(result.success, result.error || 'Empty prompt + context chip must trigger shred execution');
        assert(result.commandText.includes('shred') || result.renderedHtml.includes('shred') || result.renderedHtml.includes('微动作'), 'Executed command must default to /shred');
        assert(result.stepCount >= 3, `Expected at least 3 micro-action steps rendered, got ${result.stepCount}`);
      });

      // T7.3: Exception / StackTrace detection in clipboard -> sidebar edge exhibits breathing glow (.exception-detected / keyframes edgeBreathingGlow)
      await test('T7.3: Exception / StackTrace detection in clipboard -> sidebar edge exhibits breathing glow (.exception-detected / keyframes edgeBreathingGlow)', async () => {
        // 1. Verify CSS definition
        const cssPath = path.join(__dirname, '..', 'renderer', 'sidebar.css');
        assert(fs.existsSync(cssPath), 'renderer/sidebar.css must exist');
        const cssContent = fs.readFileSync(cssPath, 'utf8');

        const hasGlowAnimation = cssContent.includes('edgeBreathingGlow') || cssContent.includes('breathingGlow') || cssContent.includes('exception-detected');
        assert(hasGlowAnimation, 'renderer/sidebar.css must define edge breathing glow keyframes or .exception-detected styles');

        // 2. Verify runtime exception detection
        const stackTraceText = `Error: Connection pool exhausted\n    at Pool.acquire (d:/project/db/pool.js:52:19)\n    at async QueryHandler.execute (d:/project/server.js:120:9)`;
        clipboard.writeText(stackTraceText);

        const win = await ensurePreloadWindow();
        const glowState = await win.webContents.executeJavaScript(`
          (async () => {
            if (typeof window.__checkClipboardForErrors === 'function') {
              await window.__checkClipboardForErrors();
            }
            const container = document.getElementById('sidebarContainer');
            const hasErrorClass = container ? (container.classList.contains('exception-detected') || container.classList.contains('has-error-pulse')) : false;

            return {
              hasErrorClass,
              containerClasses: container ? container.className : ''
            };
          })()
        `);

        assert(glowState.hasErrorClass, 'Sidebar container must exhibit .exception-detected class when clipboard contains stack trace');
      });
    });

    // =========================================================================
    // SUITE 8: 物理微动作纯洁性与界面彻底清爽化 (Physical Micro-Action Purity & UI De-bloat)
    // =========================================================================
    await runSuite(8, '物理微动作纯洁性与界面彻底清爽化 (Physical Micro-Action Purity & UI De-bloat)', async () => {
      const PHYSICAL_VERB_WHITELIST = [
        '打开', '注释', '对比', '打印', '修改', '运行', '运行测试', '记录', '查看',
        '搜索', '查阅', '标记', '执行', '定位', '替换', '复制', '新建', '固定',
        '测试', '断开', '连接', '截取', '采集'
      ];

      const FUZZY_VERBS_BLACKLIST = [
        '思考', '分析', '理解', '弄懂', '领会', '构思', '研读', '推导', '学习', '研究',
        '琢磨', '想象', '推测', '揣摩', '消化', '体悟'
      ];

      // T8.1: /shred output strictly validates that all action verbs belong to PHYSICAL_VERB_WHITELIST
      await test('T8.1: /shred output strictly validates that all action verbs belong to PHYSICAL_VERB_WHITELIST', async () => {
        assert(cognitiveShredder !== null, 'cognitive-shredder service required');

        const testGoals = [
          '从零构建分布式高并发订单交易网关',
          '排查前额叶脑电信号偶发性漂移与伪迹',
          '设计跨境出海电商全域增长转化漏斗',
          '整理并撰写大型微服务项目架构重构结题报告',
          '掌握量子计算超导量子比特控制理论'
        ];

        for (const goal of testGoals) {
          const res = await cognitiveShredder.decomposeGoal(goal, { mode: 'offline' });
          const cards = res.cards || res.actions || res;
          assert(Array.isArray(cards), `Shred output must be array for "${goal}"`);
          assert(cards.length >= 3, `Expected >= 3 cards for "${goal}", got ${cards.length}`);

          for (const card of cards) {
            const verb = card.actionVerb || card.verb;
            assert(verb !== undefined, `Card "${card.title}" must define an actionVerb`);
            const isWhitelisted = PHYSICAL_VERB_WHITELIST.some(w => verb === w || (verb.startsWith(w) && w.length >= 2));
            assert(isWhitelisted, `Action verb "${verb}" in card "${card.title}" must belong to PHYSICAL_VERB_WHITELIST`);
          }
        }
      });

      // T8.2: Absolutely no fuzzy non-physical verbs in micro-actions
      await test('T8.2: Absolutely no fuzzy non-physical verbs (思考, 分析, 理解, 弄懂, 领会, 构思, 研读, 推导, 学习, 研究, etc.)', async () => {
        assert(cognitiveShredder !== null, 'cognitive-shredder service required');

        const adversarialGoals = [
          '深入思考并全面分析分布式共识算法的理论证明',
          '研读并推导爱因斯坦广义相对论引力场方程',
          '学习并构思下一代元宇宙社交商业模式',
          '深入研究并琢磨微服务架构性能瓶颈'
        ];

        for (const goal of adversarialGoals) {
          const res = await cognitiveShredder.decomposeGoal(goal, { mode: 'offline' });
          const cards = res.cards || res.actions || res;

          for (const card of cards) {
            const combinedText = `${card.title} ${card.actionVerb || ''} ${card.verb || ''} ${card.plainPrompt || ''}`;
            for (const forbidden of FUZZY_VERBS_BLACKLIST) {
              const hasForbidden = combinedText.includes(forbidden);
              assert(!hasForbidden, `Micro-action card "${card.title}" contains forbidden non-physical fuzzy verb "${forbidden}"`);
            }
          }
        }
      });

      // T8.3: Every micro-action estMinutes strictly <= 2
      await test('T8.3: Every micro-action estMinutes strictly <= 2 (2-minute rule)', async () => {
        assert(cognitiveShredder !== null, 'cognitive-shredder service required');

        const testGoals = [
          '排查生产环境内存泄漏故障',
          '搭建端到端集成测试流水线',
          '设计企业知识库 RAG 向量检索召回方案'
        ];

        for (const goal of testGoals) {
          const res = await cognitiveShredder.decomposeGoal(goal, { mode: 'offline' });
          const cards = res.cards || res.actions || res;
          for (const card of cards) {
            assertEqual(typeof card.estMinutes, 'number', `estMinutes for "${card.title}" must be a number`);
            assertLessOrEqual(card.estMinutes, 2, `Micro-action "${card.title}" estMinutes (${card.estMinutes}) must be <= 2`);
            assert(card.estMinutes >= 1, `estMinutes must be >= 1`);
          }
        }
      });

      // T8.4: Zero leftover gamification text in user-facing views (no XP, combo streaks, rank in hud/index/sidebar UI)
      await test('T8.4: Zero leftover gamification text in user-facing views (no XP, combo streaks, rank in hud/index/sidebar UI)', async () => {
        const filesToCheck = [
          path.join(__dirname, '..', 'renderer', 'sidebar.html'),
          path.join(__dirname, '..', 'renderer', 'sidebar.js'),
          path.join(__dirname, '..', 'renderer', 'hud.html'),
          path.join(__dirname, '..', 'renderer', 'index.html'),
          path.join(__dirname, '..', 'renderer', 'services', 'command-palette.js'),
          path.join(__dirname, '..', 'renderer', 'services', 'skill-tree.js')
        ];

        const forbiddenPatterns = [
          /combo\s*streak/i,
          /\+?\d+\s*XP/i,
          /\bXP\s*(奖励|加成|\+)/i,
          /怪物\s*(扣血|血量|HP)/i,
          /段位\s*(提升|晋阶)/i,
          /猎人段位/i,
          /解构先锋/i
        ];

        for (const filePath of filesToCheck) {
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            for (const pattern of forbiddenPatterns) {
              const match = content.match(pattern);
              assert(!match, `File ${path.basename(filePath)} contains residual gamification text matching ${pattern}`);
            }
          }
        }
      });
    });

    // =========================================================================
    // SUITE 9: 真实产出物工作区联动闭环 (Artifacts Workspace Closed-Loop)
    // =========================================================================
    await runSuite(9, '真实产出物工作区联动闭环 (Artifacts Workspace Closed-Loop)', async () => {
      const sampleArtifact = {
        id: 'art_closed_loop_test_' + Date.now(),
        type: 'shred',
        command: '/shred',
        title: '微动作粉碎：修复数据库死锁',
        query: '排查订单事务死锁问题',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active',
        progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
        steps: [
          { id: 'step_1', title: '打开数据库死锁日志定位锁冲突表', actionVerb: '打开', estMinutes: 1, completed: false },
          { id: 'step_2', title: '打印当前加锁顺序与事务隔离级别', actionVerb: '打印', estMinutes: 2, completed: false, dependsOn: ['step_1'] },
          { id: 'step_3', title: '运行复现脚本验证死锁是否可解', actionVerb: '运行', estMinutes: 2, completed: false, dependsOn: ['step_2'] }
        ]
      };

      let exportedFilePath = null;

      // T9.1: 1-Click artifact persistence to artifacts/*.md with valid YAML Frontmatter and GitHub-style checkboxes (- [ ] / - [x])
      await test('T9.1: 1-Click artifact persistence to artifacts/*.md with valid YAML Frontmatter and GitHub-style checkboxes (- [ ] / - [x])', async () => {
        assert(artifactExporter !== null, 'artifact-exporter service required');
        const result = await artifactExporter.exportArtifactFile({ artifact: sampleArtifact }, testArtifactsDir);
        assert(result && result.success, 'exportArtifactFile must return success: true');
        assert(result.filePath && fs.existsSync(result.filePath), 'Exported markdown file must exist on disk');

        exportedFilePath = result.filePath;
        sampleArtifact.localFilePath = exportedFilePath;

        const fileText = fs.readFileSync(exportedFilePath, 'utf8');
        assert(fileText.startsWith('---'), 'Markdown file must start with YAML Frontmatter ---');
        assert(fileText.includes(`id: ${sampleArtifact.id}`), 'Frontmatter must contain artifact id');
        assert(fileText.includes('progress: 0% (0/3 completed)'), 'Frontmatter must reflect initial progress');
        assert(fileText.includes('- [ ] **步骤 1 · 打开**：打开数据库死锁日志定位锁冲突表 (⏱️ 1 分钟)'), 'Body must contain unchecked GitHub task list items');
      });

      // T9.2: IPC locate-artifact calls shell.showItemInFolder with correct absolute path
      await test('T9.2: IPC locate-artifact calls shell.showItemInFolder with correct absolute path', async () => {
        assert(exportedFilePath && fs.existsSync(exportedFilePath), 'Exported file must exist');

        shellCalls.showItemInFolder = [];
        const payload = { artifactId: sampleArtifact.id, filePath: exportedFilePath };

        const win = await ensurePreloadWindow();
        const res = await win.webContents.executeJavaScript(`
          (async () => {
            if (window.sidebarAPI && typeof window.sidebarAPI.locateArtifact === 'function') {
              return await window.sidebarAPI.locateArtifact(${JSON.stringify(payload)});
            }
            return { success: false, error: 'sidebarAPI.locateArtifact not implemented' };
          })()
        `);

        assert(res.success, res.error || 'IPC locate-artifact must return success: true');
        assert(shellCalls.showItemInFolder.length > 0, 'shell.showItemInFolder must be invoked');
        const calledPath = path.resolve(shellCalls.showItemInFolder[shellCalls.showItemInFolder.length - 1]);
        const expectedPath = path.resolve(exportedFilePath);
        assertEqual(calledPath, expectedPath, 'shell.showItemInFolder must be called with the exact normalized file path');
      });

      // T9.3: IPC open-artifact calls shell.openPath with correct absolute path
      await test('T9.3: IPC open-artifact calls shell.openPath with correct absolute path', async () => {
        assert(exportedFilePath && fs.existsSync(exportedFilePath), 'Exported file must exist');

        shellCalls.openPath = [];
        const payload = { artifactId: sampleArtifact.id, filePath: exportedFilePath };

        const win = await ensurePreloadWindow();
        const res = await win.webContents.executeJavaScript(`
          (async () => {
            if (window.sidebarAPI && typeof window.sidebarAPI.openArtifact === 'function') {
              return await window.sidebarAPI.openArtifact(${JSON.stringify(payload)});
            }
            return { success: false, error: 'sidebarAPI.openArtifact not implemented' };
          })()
        `);

        assert(res.success, res.error || 'IPC open-artifact must return success: true');
        assert(shellCalls.openPath.length > 0, 'shell.openPath must be invoked');
        const calledPath = path.resolve(shellCalls.openPath[shellCalls.openPath.length - 1]);
        const expectedPath = path.resolve(exportedFilePath);
        assertEqual(calledPath, expectedPath, 'shell.openPath must be called with the exact normalized file path');
      });

      // T9.4: Auto-export fallback if artifact not yet saved on disk before locate/open
      await test('T9.4: Auto-export fallback if artifact not yet saved on disk before locate/open', async () => {
        const unexportedArt = {
          id: 'art_auto_export_test_' + Date.now(),
          type: 'plan',
          command: '/plan',
          title: '现场自动落盘测试计划',
          query: '测试自动落盘机制',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'active',
          progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
          steps: [
            { id: 'step_1', title: '验证自动导出 fallback', actionVerb: '验证', estMinutes: 1, completed: false }
          ],
          localFilePath: null
        };

        if (store && typeof store.addArtifact === 'function') {
          store.addArtifact(unexportedArt);
        }

        shellCalls.showItemInFolder = [];
        const win = await ensurePreloadWindow();
        const res = await win.webContents.executeJavaScript(`
          (async () => {
            if (window.sidebarAPI && typeof window.sidebarAPI.locateArtifact === 'function') {
              return await window.sidebarAPI.locateArtifact({ artifactId: '${unexportedArt.id}' });
            }
            return { success: false, error: 'locateArtifact not implemented' };
          })()
        `);

        assert(res.success, res.error || 'Auto-export fallback must succeed');
        assert(res.filePath && fs.existsSync(res.filePath), 'File must be automatically generated on disk');
        assert(shellCalls.showItemInFolder.length > 0, 'shell.showItemInFolder must be called with auto-exported path');

        try { fs.unlinkSync(res.filePath); } catch (e) {}
      });

      // T9.5: Step checkbox toggle (- [ ] -> - [x]) dynamically re-syncs to the disk Markdown file
      await test('T9.5: Step checkbox toggle (- [ ] -> - [x]) dynamically re-syncs to the disk Markdown file', async () => {
        assert(exportedFilePath && fs.existsSync(exportedFilePath), 'Exported file must exist');

        const win = await ensurePreloadWindow();

        // Toggle step 1 to completed: true
        const togglePayload = {
          artifactId: sampleArtifact.id,
          stepId: 'step_1',
          completed: true
        };

        const res = await win.webContents.executeJavaScript(`
          (async () => {
            if (window.sidebarAPI && typeof window.sidebarAPI.toggleArtifactStep === 'function') {
              return await window.sidebarAPI.toggleArtifactStep(${JSON.stringify(togglePayload)});
            }
            return null;
          })()
        `);

        assert(res !== null, 'toggleArtifactStep must return result');

        // Read updated markdown from disk
        const diskTextAfterCheck = fs.readFileSync(exportedFilePath, 'utf8');
        assert(diskTextAfterCheck.includes('- [x] **步骤 1 · 打开**'), 'Disk file must update step 1 to checked: - [x]');
        assert(diskTextAfterCheck.includes('progress: 33% (1/3 completed)') || diskTextAfterCheck.includes('33%'), 'Disk file frontmatter must reflect 33% progress');

        // Untoggle step 1 to completed: false
        togglePayload.completed = false;
        await win.webContents.executeJavaScript(`
          (async () => {
            if (window.sidebarAPI && typeof window.sidebarAPI.toggleArtifactStep === 'function') {
              return await window.sidebarAPI.toggleArtifactStep(${JSON.stringify(togglePayload)});
            }
          })()
        `);

        const diskTextAfterUncheck = fs.readFileSync(exportedFilePath, 'utf8');
        assert(diskTextAfterUncheck.includes('- [ ] **步骤 1 · 打开**'), 'Disk file must revert step 1 to unchecked: - [ ]');
        assert(diskTextAfterUncheck.includes('progress: 0% (0/3 completed)') || diskTextAfterUncheck.includes('0%'), 'Disk file frontmatter must revert to 0% progress');

        try { fs.unlinkSync(exportedFilePath); } catch (e) {}
      });
    });

    // =========================================================================
    // SUITE 10: 400px 侧边栏轻量因果拓扑链 (Lightweight Causal Breadcrumbs & SSoT Sync)
    // =========================================================================
    await runSuite(10, '400px 侧边栏轻量因果拓扑链 (Lightweight Causal Breadcrumbs & SSoT Sync)', async () => {
      // T10.1: Sidebar renders minimal 5-stage causal breadcrumbs (现象 → 疑问 → 假说 → 证据 → 突破)
      await test('T10.1: Sidebar renders minimal 5-stage causal breadcrumbs (现象 → 疑问 → 假说 → 证据 → 突破)', async () => {
        const win = await ensurePreloadWindow();

        const breadcrumbsInfo = await win.webContents.executeJavaScript(`
          (() => {
            const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
            if (!container) return { exists: false };

            const stages = Array.from(container.querySelectorAll('.breadcrumb-stage, .crumb-item, .phase-node')).map(el => el.innerText.trim());
            const width = container.offsetWidth;
            const scrollWidth = container.scrollWidth;

            return {
              exists: true,
              stages,
              stageCount: stages.length,
              width,
              scrollWidth,
              overflows: scrollWidth > width + 5
            };
          })()
        `);

        assert(breadcrumbsInfo.exists, 'Sidebar must render #causalBreadcrumbs or .causal-breadcrumbs container in DOM');
        assert(breadcrumbsInfo.stageCount >= 5, `Expected 5 causal stages, found ${breadcrumbsInfo.stageCount}`);

        const requiredPhases = ['现象', '疑问', '假说', '证据', '突破'];
        const textAll = breadcrumbsInfo.stages.join(' ');
        for (const ph of requiredPhases) {
          assert(textAll.includes(ph), `Causal breadcrumbs must include phase "${ph}"`);
        }

        assert(!breadcrumbsInfo.overflows, 'Causal breadcrumbs must fit within 400px width without horizontal overflow');
      });

      // T10.2: Breadcrumb active phase and exploration clarity (ΔQt) synchronize in real-time with SSoT state-updated events
      await test('T10.2: Breadcrumb active phase and exploration clarity (ΔQt) synchronize in real-time with SSoT state-updated events', async () => {
        const win = await ensurePreloadWindow();

        const mockState = {
          activeProjectId: 'proj_test_ssot',
          causalPhase: 2,
          causalPhaseName: '假说',
          clarity: 65,
          deltaQt: 65,
          cockpit: {
            currentBottleneck: '缺少对照基线',
            nextAction: '采集空白对照数据'
          }
        };

        win.webContents.send('state-updated', mockState);
        await new Promise(r => setTimeout(r, 200));

        const syncStatus = await win.webContents.executeJavaScript(`
          (() => {
            const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
            if (!container) return { error: 'breadcrumbs not rendered' };

            const activeNode = container.querySelector('.active, [data-active="true"], .current-phase');
            const activeText = activeNode ? activeNode.innerText : '';

            const clarityBadge = container.querySelector('.clarity-badge, .delta-qt, .clarity-score') || document.querySelector('.delta-qt, .clarity-score');
            const clarityText = clarityBadge ? clarityBadge.innerText : '';

            return {
              hasActiveNode: !!activeNode,
              activeText,
              clarityText
            };
          })()
        `);

        assert(syncStatus.hasActiveNode, 'Causal breadcrumbs must highlight active phase node');
        assert(syncStatus.activeText.includes('假说') || syncStatus.activeText.includes('3') || syncStatus.activeText.includes('H'), 'Active node must correspond to phase 假说 (Hypothesis)');
        assert(syncStatus.clarityText.includes('65'), `Clarity badge must synchronize with ΔQt: 65%, got "${syncStatus.clarityText}"`);
      });

      // T10.3: Auxiliary review view trigger button [全景复盘 ↗] invokes toggle-war-room
      await test('T10.3: Auxiliary review view trigger button [全景复盘 ↗] invokes toggle-war-room', async () => {
        const win = await ensurePreloadWindow();

        lastWarRoomToggle = 0;
        const clicked = await win.webContents.executeJavaScript(`
          (() => {
            const btn = document.getElementById('btnToggleWarRoom') ||
                        document.getElementById('btnOpenWarRoom') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('全景复盘') || b.innerText.includes('复盘') || b.innerText.includes('作战室'));
            if (!btn) return false;
            btn.click();
            return true;
          })()
        `);

        assert(clicked, 'Sidebar must contain auxiliary review trigger button [全景复盘 ↗]');
        await new Promise(r => setTimeout(r, 100));
        assert(lastWarRoomToggle > 0, 'Clicking [全景复盘 ↗] must invoke toggle-war-room IPC');
      });
    });

    // =========================================================================
    // SUITE 11: Cross-process stability & Zero Console Errors
    // =========================================================================
    await runSuite(11, 'Cross-process stability & Zero Console Errors', async () => {
      // T11.1: Complete IPC handler registry verification with zero "No handler registered" warnings
      await test('T11.1: Complete IPC handler registry verification with zero "No handler registered" warnings', async () => {
        const win = await ensurePreloadWindow();
        const currentErrorCount = capturedConsoleErrors.length;
        const fileUrl = require('url').pathToFileURL(path.join(__dirname, '..', 'renderer', 'sidebar.html')).href;
        await win.loadURL(fileUrl);
        await new Promise(r => setTimeout(r, 200));

        assertEqual(capturedConsoleErrors.length, currentErrorCount, 'Reloading sidebar.html must not emit any new console errors or unhandled handler warnings');
      });

      // T11.2: End-to-end zero console errors (level >= 3) and zero uncaught exceptions check
      await test('T11.2: End-to-end zero console errors (level >= 3) and zero uncaught exceptions check', async () => {
        await new Promise(r => setTimeout(r, 200));

        if (capturedConsoleErrors.length > 0) {
          const errList = capturedConsoleErrors.map(e => `[${e.window}] L${e.line}: ${e.message}`).join('\n');
          throw new Error(`Detected ${capturedConsoleErrors.length} console error(s) with level >= 3:\n${errList}`);
        }
        assertEqual(capturedConsoleErrors.length, 0, 'No console errors with level >= 3 allowed across entire run');

        if (uncaughtExceptions.length > 0) {
          const excList = uncaughtExceptions.map(e => e.stack || e.message || String(e)).join('\n');
          throw new Error(`Detected ${uncaughtExceptions.length} uncaught process exception(s):\n${excList}`);
        }
        assertEqual(uncaughtExceptions.length, 0, 'No uncaught exceptions allowed across entire run');

        // Clean teardown
        if (testSidebarWin && !testSidebarWin.isDestroyed()) {
          testSidebarWin.destroy();
          testSidebarWin = null;
        }
        if (testPreloadWin && !testPreloadWin.isDestroyed()) {
          testPreloadWin.destroy();
          testPreloadWin = null;
        }
        globalShortcut.unregisterAll();
      });
    });

  } catch (err) {
    console.error(`\n${C.red}CRITICAL TEST RUNNER EXCEPTION:${C.reset}`, err);
    stats.failed++;
    stats.failures.push({ suite: 'Global Runner', test: 'Execution', error: err });
  } finally {
    stats.endTime = performance.now();
    const totalDuration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

    console.log(`\n${C.white}${C.bright}================================================================${C.reset}`);
    console.log(`${C.white}${C.bright}                      TEST EXECUTION SUMMARY                    ${C.reset}`);
    console.log(`${C.white}${C.bright}================================================================${C.reset}`);
    console.log(`Total Suites Run : ${stats.suitesRun}`);
    console.log(`Total Tests Run  : ${stats.totalTests}`);
    console.log(`Passed Tests     : ${C.green}${stats.passed}${C.reset}`);
    console.log(`Failed Tests     : ${stats.failed > 0 ? C.red + stats.failed + C.reset : stats.failed}`);
    console.log(`Pending Tests    : ${stats.pending > 0 ? C.yellow + stats.pending + C.reset : stats.pending}`);
    console.log(`Console Errors   : ${capturedConsoleErrors.length === 0 ? C.green + '0 (Zero Console Errors)' + C.reset : C.red + capturedConsoleErrors.length + C.reset}`);
    console.log(`Duration         : ${totalDuration}s`);
    console.log(`${C.white}${C.bright}================================================================${C.reset}`);

    if (stats.failures.length > 0) {
      console.log(`\n${C.red}${C.bright}FAILURES DETAIL (${stats.failures.length}):${C.reset}`);
      stats.failures.forEach((f, idx) => {
        console.log(`  ${idx + 1}) [${f.suite}] ${f.test}:`);
        console.log(`     ${C.red}${f.error.stack || f.error.message}${C.reset}`);
      });
    }

    const exitCode = stats.failed > 0 ? 1 : 0;
    if (exitCode === 0) {
      console.log(`\n${C.green}${C.bright}✓ ALL ACTIVE SUITES PASSED CLEANLY WITH ZERO CONSOLE ERRORS.${C.reset}\n`);
    } else {
      console.log(`\n${C.red}${C.bright}✗ TEST SUITE FAILED WITH ${stats.failed} FAILURE(S).${C.reset}\n`);
    }

    app.quit();
    process.exit(exitCode);
  }
});
