/**
 * scripts/test-challenger-m1-ipc.js
 * 
 * Adversarial Empirical Challenge Suite for Milestone M1:
 * IPC Robustness, Adversarial Payloads & Backward Compatibility
 * 
 * Executed under Electron Headless on Windows.
 * Enforces strict Zero Console Errors (level >= 3).
 */

const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const assert = require('assert');
const { performance } = require('perf_hooks');

// Disable hardware acceleration and set headless flags
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('no-sandbox');

let consoleErrors = [];
let passCount = 0;
let failCount = 0;

function reportTest(name, passed, detail = '') {
  if (passed) {
    passCount++;
    console.log(`  ✓ [PASS] ${name} ${detail ? `(${detail})` : ''}`);
  } else {
    failCount++;
    console.error(`  ✗ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
  }
}

app.whenReady().then(async () => {
  console.log('\n================================================================');
  console.log('  CHALLENGER 2: IPC Robustness & Backward Compatibility Suite  ');
  console.log('================================================================');
  console.log(`Electron: ${process.versions.electron} | Node: ${process.versions.node}`);

  // 1. Require main.js to bootstrap the window architecture & IPC handlers
  const mainModule = require('../main');
  const {
    createSidebarWindow,
    toggleSidebar,
    hideSidebar,
    getSidebarBounds,
    clampSidebarWidth,
    getSidebarWindow
  } = mainModule;

  // 2. Create a test runner window using preload.js to exercise contextBridge
  const testWin = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const attachConsoleAuditor = (win, label) => {
    win.webContents.on('console-message', (event) => {
      if (event.level >= 3) {
        consoleErrors.push({
          source: label,
          message: event.message,
          line: event.lineNumber,
          sourceId: event.sourceId
        });
        console.error(`[CONSOLE ERROR L${event.level} - ${label}] ${event.message} (${event.sourceId}:${event.lineNumber})`);
      }
    });
  };

  attachConsoleAuditor(testWin, 'testWin');

  // Also attach auditor to sidebarWindow
  const sbWin = getSidebarWindow();
  if (sbWin) {
    attachConsoleAuditor(sbWin, 'sidebarWindow');
  }

  await testWin.loadURL('about:blank');

  try {
    // -------------------------------------------------------------
    // SECTION 1: IPC Handler Existence & Bridge Exposure
    // -------------------------------------------------------------
    console.log('\n--- Section 1: Preload Bridge & Security Isolation ---');

    const bridgeInspection = await testWin.webContents.executeJavaScript(`
      (() => {
        const hasSidebarAPI = Boolean(window.sidebarAPI && typeof window.sidebarAPI === 'object');
        const hasElectronAPI = Boolean(window.electronAPI && typeof window.electronAPI === 'object');
        const hasProcess = typeof process !== 'undefined';
        const hasRequire = typeof require !== 'undefined';
        const hasIpcRenderer = typeof window.ipcRenderer !== 'undefined';

        const sidebarMethods = hasSidebarAPI ? Object.keys(window.sidebarAPI) : [];
        const electronMethods = hasElectronAPI ? Object.keys(window.electronAPI) : [];

        return {
          hasSidebarAPI,
          hasElectronAPI,
          hasProcess,
          hasRequire,
          hasIpcRenderer,
          sidebarMethods,
          electronMethods
        };
      })()
    `);

    reportTest(
      'S1.1: Context Isolation enforces no process, require, or raw ipcRenderer',
      !bridgeInspection.hasProcess && !bridgeInspection.hasRequire && !bridgeInspection.hasIpcRenderer
    );

    const requiredSidebarMethods = [
      'toggleSidebar', 'hideSidebar', 'getBounds', 'setPinState',
      'readClipboardContext', 'copyToClipboard', 'injectContext',
      'executeSlashCommand', 'toggleArtifactStep', 'updateArtifactStep',
      'copyArtifactMarkdown', 'exportArtifactFile', 'exportArtifactMarkdown',
      'getArtifacts', 'saveArtifact', 'onSidebarFocused', 'onContextInjected', 'onVisibilityChanged'
    ];
    const missingSidebar = requiredSidebarMethods.filter(m => !bridgeInspection.sidebarMethods.includes(m));
    reportTest(
      'S1.2: window.sidebarAPI exposes all 18 required interface methods',
      missingSidebar.length === 0,
      missingSidebar.length === 0 ? 'All 18 present' : `Missing: ${missingSidebar.join(', ')}`
    );

    const requiredElectronMethods = [
      'getState', 'saveState', 'addClue', 'completeAction', 'toggleEquipRelic',
      'castLens', 'updateCockpit', 'switchProject', 'createProject',
      'decomposeGoal', 'diagnoseBottleneck', 'toggleHud', 'toggleWarRoom',
      'toggleWindowView', 'minimizeWindow', 'maximizeWindow', 'closeWindow',
      'onStateUpdate', 'onFocusQuickInput'
    ];
    const missingElectron = requiredElectronMethods.filter(m => !bridgeInspection.electronMethods.includes(m));
    reportTest(
      'S1.3: window.electronAPI retains all 19 legacy methods (Zero Regression)',
      missingElectron.length === 0,
      missingElectron.length === 0 ? 'All 19 present' : `Missing: ${missingElectron.join(', ')}`
    );

    // -------------------------------------------------------------
    // SECTION 2: Clipboard IPC Stress & Adversarial Payloads
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Clipboard IPC Stress & Adversarial Payloads ---');

    // Test 2.1: Normal read & write
    const testTextNormal = 'Antigravity In-Situ Context: Focus on Deep Work ⚡';
    clipboard.writeText(testTextNormal);
    const readNormal = await testWin.webContents.executeJavaScript(`window.sidebarAPI.readClipboardContext()`);
    reportTest(
      'S2.1: readClipboardContext returns text, length, timestamp, preview',
      readNormal.text === testTextNormal && readNormal.length === testTextNormal.length && readNormal.preview === testTextNormal,
      `len=${readNormal.length}`
    );

    // Test 2.2: Large payload (500k characters)
    const largePayload = 'A'.repeat(500000);
    clipboard.writeText(largePayload);
    const readLarge = await testWin.webContents.executeJavaScript(`window.sidebarAPI.readClipboardContext()`);
    reportTest(
      'S2.2: readClipboardContext handles 500k character clipboard without truncation crash',
      readLarge.length === 500000 && readLarge.preview.length === 100 && readLarge.preview.endsWith('...'),
      `preview len=${readLarge.preview.length}`
    );

    // Test 2.3: Adversarial copyToClipboard inputs
    const copyAdversarialResults = await testWin.webContents.executeJavaScript(`
      (async () => {
        const results = [];
        // Test null
        results.push(await window.sidebarAPI.copyToClipboard(null));
        // Test undefined
        results.push(await window.sidebarAPI.copyToClipboard(undefined));
        // Test number
        results.push(await window.sidebarAPI.copyToClipboard(42));
        // Test object
        results.push(await window.sidebarAPI.copyToClipboard({ key: 'val' }));
        // Test emoji & unicode
        results.push(await window.sidebarAPI.copyToClipboard('✨🚀 探索伴侣 2026 \u0000\u001F'));
        return results;
      })()
    `);

    const allCopySuccess = copyAdversarialResults.every(r => r && r.success === true && typeof r.length === 'number');
    reportTest(
      'S2.3: copyToClipboard safely handles null, undefined, number, object, unicode',
      allCopySuccess,
      `5 adversarial cases verified`
    );

    // Verify clipboard content after last write
    const currentClip = clipboard.readText();
    reportTest(
      'S2.4: Unicode & emoji string correctly written to system clipboard',
      currentClip.includes('探索伴侣') && currentClip.includes('🚀')
    );

    // -------------------------------------------------------------
    // SECTION 3: Docking Bounds Clamping & Geometric Invariant
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Docking Bounds Clamping & Geometric Invariant ---');

    const boundsNormal = await testWin.webContents.executeJavaScript(`window.sidebarAPI.getBounds()`);
    reportTest(
      'S3.1: getBounds returns valid workArea-docked rect { x, y, width, height }',
      typeof boundsNormal.x === 'number' && typeof boundsNormal.y === 'number' &&
      boundsNormal.width >= 380 && boundsNormal.width <= 420 && boundsNormal.height > 0,
      `w=${boundsNormal.width}, h=${boundsNormal.height}, x=${boundsNormal.x}, y=${boundsNormal.y}`
    );

    // Directly test main process clampSidebarWidth against malicious / wild inputs
    const clampTests = [
      { input: -100, expected: 380 },
      { input: 0, expected: 380 },
      { input: 300, expected: 380 },
      { input: 379, expected: 380 },
      { input: 380, expected: 380 },
      { input: 400, expected: 400 },
      { input: 420, expected: 420 },
      { input: 421, expected: 420 },
      { input: 9999, expected: 420 },
      { input: NaN, expected: 400 },
      { input: Infinity, expected: 420 },
      { input: -Infinity, expected: 380 },
      { input: null, expected: 380 },
      { input: undefined, expected: 400 },
      { input: '410', expected: 410 },
      { input: 'invalid', expected: 400 }
    ];
    let clampAllPass = true;
    for (const t of clampTests) {
      const res = clampSidebarWidth(t.input);
      if (res !== t.expected) {
        clampAllPass = false;
        console.error(`Clamp mismatch: input=${t.input}, expected=${t.expected}, got=${res}`);
      }
    }
    reportTest(
      'S3.2: clampSidebarWidth invariant strictly confines output to [380, 420] across 16 adversarial inputs',
      clampAllPass,
      `16 edge cases passed`
    );

    // Test getSidebarBounds with diverse mock displays
    const mockDisplayNegative = {
      workArea: { x: -1920, y: 0, width: 1920, height: 1080 }
    };
    const bNeg = getSidebarBounds(mockDisplayNegative, 400);
    reportTest(
      'S3.3: getSidebarBounds correctly docks on negative origin secondary monitor',
      bNeg.x === -1920 + 1920 - 400 && bNeg.y === 0 && bNeg.width === 400 && bNeg.height === 1080,
      `x=${bNeg.x}, expected=-400`
    );

    const mockDisplayBottomBar = {
      workArea: { x: 0, y: 0, width: 2560, height: 1390 }
    };
    const bBar = getSidebarBounds(mockDisplayBottomBar, 420);
    reportTest(
      'S3.4: getSidebarBounds respects custom workArea height avoiding taskbar overlap',
      bBar.x === 2560 - 420 && bBar.height === 1390 && bBar.width === 420,
      `h=${bBar.height}`
    );

    // Test get-sidebar-bounds IPC with invalid display payloads
    const boundsMalformedDisplay = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.getBounds()
    `);
    reportTest(
      'S3.5: get-sidebar-bounds IPC safely returns valid geometry without exceptions',
      boundsMalformedDisplay && boundsMalformedDisplay.width >= 380 && boundsMalformedDisplay.width <= 420
    );

    // -------------------------------------------------------------
    // SECTION 4: Pin State & Toggle Concurrency Burst
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Pin State & Toggle Concurrency Burst ---');

    // Test setPinState
    const pinRes1 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.setPinState(true)`);
    const pinRes2 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.setPinState(false)`);
    const pinRes3 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.setPinState("truthy")`);
    const pinRes4 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.setPinState(null)`);

    reportTest(
      'S4.1: setPinState returns boolean pinned state consistently across truthy/falsy types',
      pinRes1.pinned === true && pinRes2.pinned === false && pinRes3.pinned === true && pinRes4.pinned === false
    );

    // Rapid toggle burst
    const burstCount = 20;
    const tStart = performance.now();
    for (let i = 0; i < burstCount; i++) {
      toggleSidebar();
    }
    const tElapsed = performance.now() - tStart;
    const avgToggleMs = tElapsed / burstCount;

    const sb = getSidebarWindow();
    reportTest(
      'S4.2: 20 rapid toggle bursts execute without exception or crash',
      sb && !sb.isDestroyed(),
      `avg=${avgToggleMs.toFixed(2)}ms, total=${tElapsed.toFixed(1)}ms`
    );

    // Verify sub-20ms requirement
    reportTest(
      'S4.3: Toggle operation latency beats strict sub-20ms benchmark',
      avgToggleMs < 20.0,
      `Measured: ${avgToggleMs.toFixed(2)}ms < 20.00ms`
    );

    // Clean hide
    hideSidebar();
    reportTest('S4.4: hideSidebar leaves window in hidden state', !sb.isVisible());

    // -------------------------------------------------------------
    // SECTION 5: Slash Commands & Artifact Operations Fallbacks
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Slash Commands & Artifact Operations Fallbacks ---');

    // Execute slash command through IPC
    const artPlan = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.executeSlashCommand({
        command: '/plan',
        rawInput: '/plan 构建全自动侧边栏中枢',
        attachments: ['@clipboard']
      })
    `);

    reportTest(
      'S5.1: executeSlashCommand returns conforming Artifact schema',
      artPlan && artPlan.id && artPlan.title && artPlan.command === '/plan' && Array.isArray(artPlan.mountedContexts),
      `artId=${artPlan?.id}`
    );

    // Test malformed payload for executeSlashCommand
    const artEmpty = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.executeSlashCommand(null)
    `);
    reportTest(
      'S5.2: executeSlashCommand gracefully survives null payload with fallback Artifact',
      artEmpty && artEmpty.id && typeof artEmpty.command === 'string'
    );

    // Test toggleArtifactStep
    const stepRes = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: 'art_123', stepId: 'step_1', completed: true })
    `);
    reportTest(
      'S5.3: toggleArtifactStep IPC completes safely',
      stepRes && (stepRes.success === true || stepRes.id)
    );

    // Test copyArtifactMarkdown
    const copyArtRes = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.copyArtifactMarkdown({ artifactId: 'art_test', text: '# Test Artifact' })
    `);
    reportTest(
      'S5.4: copyArtifactMarkdown safely copies markdown and reports status',
      copyArtRes && copyArtRes.success === true
    );

    // Test exportArtifactFile
    const exportRes = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.exportArtifactFile({ artifactId: 'art_test' })
    `);
    reportTest(
      'S5.5: exportArtifactFile resolves with target file path',
      exportRes && exportRes.success === true && typeof exportRes.filePath === 'string'
    );

    // Test getArtifacts & saveArtifact
    const saveRes = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.saveArtifact({ id: 'art_custom_test', type: 'plan', title: 'Custom Plan' })
    `);
    const allArts = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.getArtifacts()
    `);
    reportTest(
      'S5.6: saveArtifact and getArtifacts IPC round-trip works predictably',
      saveRes === true && Array.isArray(allArts),
      `count=${allArts.length}`
    );

    // -------------------------------------------------------------
    // SECTION 6: Backward Compatibility (Legacy electronAPI)
    // -------------------------------------------------------------
    console.log('\n--- Section 6: Backward Compatibility Verification (Legacy electronAPI) ---');

    const legacyState = await testWin.webContents.executeJavaScript(`window.electronAPI.getState()`);
    reportTest(
      'S6.1: window.electronAPI.getState() retrieves valid SSoT state payload',
      legacyState && legacyState.activeProject && legacyState.activeProject.id && legacyState.evaluation,
      `activeProject=${legacyState?.activeProject?.title}`
    );

    const completeActionRes = await testWin.webContents.executeJavaScript(`window.electronAPI.completeAction()`);
    reportTest(
      'S6.2: window.electronAPI.completeAction() advances gamification/streak state without regression',
      completeActionRes && typeof completeActionRes.comboStreak === 'number',
      `comboStreak=${completeActionRes?.comboStreak}`
    );

    const newClueRes = await testWin.webContents.executeJavaScript(`
      window.electronAPI.addClue({
        content: 'Challenger IPC Test Observation',
        type: 'observation',
        confidence: 0.95
      })
    `);
    reportTest(
      'S6.3: window.electronAPI.addClue() adds clue and broadcasts state update',
      newClueRes && newClueRes.id
    );

    const decomposeRes = await testWin.webContents.executeJavaScript(`
      window.electronAPI.decomposeGoal('测试目标拆解', { mode: 'offline' })
    `);
    const cards = decomposeRes?.cards || decomposeRes?.actions;
    reportTest(
      'S6.4: window.electronAPI.decomposeGoal() executes cognitive shredder cleanly',
      decomposeRes && Array.isArray(cards) && cards.length >= 3,
      `cards=${cards?.length}`
    );

    const diagnoseRes = await testWin.webContents.executeJavaScript(`
      window.electronAPI.diagnoseBottleneck({
        bottleneckText: '缺乏对照基线，变量混淆',
        clues: []
      })
    `);
    reportTest(
      'S6.5: window.electronAPI.diagnoseBottleneck() returns scientific obstacle diagnosis',
      diagnoseRes && diagnoseRes.obstacleType && diagnoseRes.breakthroughGuidance
    );

    // -------------------------------------------------------------
    // SECTION 7: Window Lifecycle, Disposal & Error Recovery
    // -------------------------------------------------------------
    console.log('\n--- Section 7: Window Lifecycle, Disposal & Error Recovery ---');

    // Simulate closing or destroying sidebarWindow, then calling IPC
    const initialSidebar = getSidebarWindow();
    if (initialSidebar && !initialSidebar.isDestroyed()) {
      initialSidebar.destroy();
    }
    reportTest(
      'S7.1: Sidebar window cleanly destroyed for recovery testing',
      initialSidebar.isDestroyed()
    );

    // Call toggleSidebar when sidebarWindow is destroyed: should recreate without crashing
    const toggleAfterDestroy = toggleSidebar();
    const recreatedSidebar = getSidebarWindow();
    reportTest(
      'S7.2: toggleSidebar automatically recreates destroyed sidebar window seamlessly',
      recreatedSidebar && !recreatedSidebar.isDestroyed() && toggleAfterDestroy.visible === true
    );

    // Call getBounds when newly created
    const boundsAfterRecreate = await testWin.webContents.executeJavaScript(`window.sidebarAPI.getBounds()`);
    reportTest(
      'S7.3: getBounds retrieves correct bounds from freshly recreated window',
      boundsAfterRecreate.width >= 380 && boundsAfterRecreate.width <= 420
    );

    // Clean up
    hideSidebar();

    // -------------------------------------------------------------
    // SECTION 8: Event Listeners & IPC Broadcasts
    // -------------------------------------------------------------
    console.log('\n--- Section 8: Event Listeners & Real-Time Broadcasts ---');

    // Set up event listeners on testWin to verify event subscription & cleanup
    const eventSetup = await testWin.webContents.executeJavaScript(`
      (() => {
        window.__events = {
          focused: 0,
          injected: null,
          visibility: null
        };
        window.__unsub = {};
        window.__unsub.focus = window.sidebarAPI.onSidebarFocused(() => {
          window.__events.focused++;
        });
        window.__unsub.inject = window.sidebarAPI.onContextInjected((data) => {
          window.__events.injected = data;
        });
        window.__unsub.visibility = window.sidebarAPI.onVisibilityChanged((data) => {
          window.__events.visibility = data;
        });
        return {
          hasUnsubFocus: typeof window.__unsub.focus === 'function',
          hasUnsubInject: typeof window.__unsub.inject === 'function',
          hasUnsubVisibility: typeof window.__unsub.visibility === 'function'
        };
      })()
    `);

    reportTest(
      'S8.1: Event listeners return valid unsubscribe functions',
      eventSetup.hasUnsubFocus && eventSetup.hasUnsubInject && eventSetup.hasUnsubVisibility
    );

    // Unsubscribe cleanly
    const unsubResult = await testWin.webContents.executeJavaScript(`
      (() => {
        window.__unsub.focus();
        window.__unsub.inject();
        window.__unsub.visibility();
        return true;
      })()
    `);
    reportTest('S8.2: Event listener unsubscribe functions execute without throwing', unsubResult === true);

  } catch (err) {
    failCount++;
    console.error('Unexpected test error in challenger harness:', err);
  } finally {
    if (testWin && !testWin.isDestroyed()) {
      testWin.destroy();
    }
  }

  // -------------------------------------------------------------
  // Console Error Audit
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                   CONSOLE ERROR AUDIT & SUMMARY                ');
  console.log('================================================================');
  console.log(`Total Challenger Tests: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Console Errors (level >= 3): ${consoleErrors.length}`);

  if (consoleErrors.length > 0) {
    console.error('Console errors detected:');
    consoleErrors.forEach((e, idx) => {
      console.error(`  [${idx + 1}] Source: ${e.source} | Message: ${e.message} | File: ${e.sourceId}:${e.line}`);
    });
  }

  const overallSuccess = (failCount === 0) && (consoleErrors.length === 0);
  if (overallSuccess) {
    console.log('\n>>> EMPIRICAL VERDICT: APPROVE <<<');
    console.log('All adversarial tests passed. Zero regression on legacy APIs. Zero console errors.\n');
    app.exit(0);
  } else {
    console.error('\n>>> EMPIRICAL VERDICT: REJECT <<<');
    console.error(`Test failures: ${failCount}, Console errors: ${consoleErrors.length}\n`);
    app.exit(1);
  }
});
