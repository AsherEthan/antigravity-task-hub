// scripts/verify-challenger-m4-r3.js
/**
 * Empirical Adversarial Challenger Suite for Milestone M4 (Refinement Round 3)
 * Lightweight Causal Breadcrumbs & SSoT Sync Stress Test & Invariant Verification
 * 
 * Target: Electron Headless Runner
 * Execution:
 *   npx electron scripts/verify-challenger-m4-r3.js
 * 
 * Coverage:
 * 1. SSoT state-updated event injection & Phase Mapping Stress Test:
 *    - Canonical integer phases (0..4) and visual class triplets (.active, .current-phase, .completed)
 *    - String representation of numbers ("0".."4")
 *    - Chinese phase names (现象, 疑问, 假说, 证据, 突破)
 *    - Boundary and out-of-bounds phases (-5, 99, 1000, "-10", "unknown")
 *    - 100-event rapid burst injection with final state consistency guarantee
 * 2. Epistemic Clarity (ΔQt) Boundary & Data Type Resilience Stress Test:
 *    - 0%, 100%, float values (e.g. 73.6%, 42.125%)
 *    - Missing clarity, null clarity, undefined clarity
 *    - Strict assertion: zero 'NaN' and zero 'undefined' in any badge text
 * 3. 400px, 380px, and 360px Viewport Geometry & Horizontal Containment:
 *    - Verification under 400px, 380px, 360px widths
 *    - Asserting scrollWidth <= offsetWidth + 5 across all widths
 *    - Dynamic rapid resize cycling (400 -> 380 -> 360 -> 420 -> 400)
 * 4. Auxiliary War Room Trigger ([全景复盘 ↗]) Concurrency & Race Condition Test:
 *    - Single click clean IPC emission
 *    - 50 rapid burst clicks within sub-100ms
 *    - Interleaved concurrent clicks + state-updated bursts
 * 5. Headless Process Stability, Lifecycle & Zero Console Errors:
 *    - Zero console errors (level >= 3)
 *    - Zero uncaught exceptions and zero unhandled rejections
 */

const { app, BrowserWindow, ipcMain, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Headless and performance flags
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Terminal Formatting
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

// Error & Event Tracking
const capturedConsoleErrors = [];
const uncaughtExceptions = [];
let warRoomToggleCount = 0;

process.on('uncaughtException', (err) => {
  uncaughtExceptions.push(err);
  console.error(`${C.red}[UNCAUGHT EXCEPTION] ${err.stack || err.message}${C.reset}`);
});
process.on('unhandledRejection', (reason) => {
  uncaughtExceptions.push(reason);
  console.error(`${C.red}[UNHANDLED REJECTION] ${reason}${C.reset}`);
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testFailures = [];

async function test(name, fn) {
  totalTests++;
  const t0 = performance.now();
  try {
    await fn();
    const duration = (performance.now() - t0).toFixed(1);
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    passedTests++;
  } catch (err) {
    const duration = (performance.now() - t0).toFixed(1);
    console.error(`  ${C.red}✗ [FAIL]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}: ${err.message}`);
    failedTests++;
    testFailures.push({ name, error: err.message, stack: err.stack });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
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


// Services
const store = require('../services/store');
const stateEngine = require('../services/state-engine');

app.whenReady().then(async () => {
  console.log('\n================================================================');
  console.log('  CHALLENGER M4-R3: Lightweight Causal Breadcrumbs & SSoT Sync  ');
  console.log('================================================================');
  console.log(`Runtime: Node ${process.versions.node}, Electron ${process.versions.electron}`);

  // Register Mock IPC Handlers to prevent missing handler errors
  ipcMain.removeHandler('get-state');
  ipcMain.removeHandler('detect-clipboard-exception');
  ipcMain.removeHandler('read-clipboard-context');
  ipcMain.removeHandler('get-artifacts');
  ipcMain.removeHandler('get-sidebar-bounds');
  ipcMain.removeHandler('set-pin-state');
  ipcMain.removeAllListeners('toggle-war-room');
  ipcMain.removeAllListeners('toggle-sidebar');
  ipcMain.removeAllListeners('hide-sidebar');

  ipcMain.handle('get-state', async () => {
    return {
      activeProjectId: 'proj_challenger_ssot',
      causalPhase: 0,
      causalPhaseName: '现象',
      deltaQt: 58,
      clarity: 58,
      playerProfile: { convergenceRate: 58 }
    };
  });

  ipcMain.handle('detect-clipboard-exception', async () => ({
    hasException: false,
    errorType: null,
    preview: '',
    hasStack: false
  }));

  ipcMain.handle('read-clipboard-context', async () => ({
    text: '',
    length: 0,
    timestamp: Date.now(),
    preview: ''
  }));

  ipcMain.handle('get-artifacts', async () => []);
  ipcMain.handle('get-sidebar-bounds', async () => ({ x: 1520, y: 0, width: 400, height: 1040 }));
  ipcMain.handle('set-pin-state', async (event, pinned) => ({ success: true, pinned }));

  ipcMain.on('toggle-war-room', () => {
    warRoomToggleCount++;
  });
  ipcMain.on('toggle-sidebar', () => {});
  ipcMain.on('hide-sidebar', () => {});

  // Create Preload Test Window
  const testWin = new BrowserWindow({
    width: 400,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  testWin.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 3) {
      capturedConsoleErrors.push({ level, message, line, sourceId });
      console.error(`  ${C.red}[RENDERER CONSOLE ERROR] L${line}: ${message}${C.reset}`);
    }
  });

  const sidebarHtmlPath = path.join(__dirname, '..', 'renderer', 'sidebar.html');
  const fileUrl = require('url').pathToFileURL(sidebarHtmlPath).href;
  await testWin.loadURL(fileUrl);
  await new Promise(r => setTimeout(r, 300));

  try {
    // =========================================================================
    // SUITE 1: SSoT state-updated Phase Mapping & Rapid Burst Stress Test
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite 1: SSoT Phase Mapping & Rapid Burst Stress Test ===${C.reset}`);

    // Helper to query breadcrumb DOM state
    const getDomBreadcrumbs = async () => {
      return await testWin.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
          if (!container) return { exists: false };
          const nodes = Array.from(container.querySelectorAll('.crumb-item, .phase-node, .breadcrumb-stage'));
          const nodeData = nodes.map(n => ({
            text: (n.innerText || '').trim(),
            phase: n.getAttribute('data-phase'),
            isActive: n.classList.contains('active') || n.classList.contains('current-phase') || n.dataset.active === 'true',
            isCompleted: n.classList.contains('completed')
          }));
          const activeNode = nodeData.find(n => n.isActive);
          const clarityBadges = Array.from(container.querySelectorAll('.clarity-badge, .delta-qt, .clarity-score')).map(b => b.innerText.trim());
          return {
            exists: true,
            nodeCount: nodeData.length,
            nodes: nodeData,
            activeNode,
            activeText: activeNode ? activeNode.text : null,
            activePhase: activeNode ? activeNode.phase : null,
            clarityBadges
          };
        })()
      `);
    };

    // 1.1 Canonical Integer Phases 0..4
    await test('T1.1: Canonical integer phases 0 to 4 correctly transition active and completed states', async () => {
      const phaseNames = ['现象', '疑问', '假说', '证据', '突破'];
      for (let p = 0; p <= 4; p++) {
        testWin.webContents.send('state-updated', { causalPhase: p, deltaQt: 50 + p * 10 });
        await new Promise(r => setTimeout(r, 60));
        const dom = await getDomBreadcrumbs();
        assert(dom.exists, 'Causal breadcrumbs container must exist');
        assert(dom.activeNode, `Phase ${p} (${phaseNames[p]}) must have an active node`);
        assert(dom.activeText.includes(phaseNames[p]), `Active node for phase ${p} must contain "${phaseNames[p]}", got "${dom.activeText}"`);
        
        // Check completed status of previous nodes
        for (let prev = 0; prev < p; prev++) {
          assert(dom.nodes[prev].isCompleted, `Node ${prev} (${phaseNames[prev]}) must be marked .completed when active phase is ${p}`);
        }
        // Check future nodes are neither active nor completed
        for (let fut = p + 1; fut <= 4; fut++) {
          assert(!dom.nodes[fut].isActive && !dom.nodes[fut].isCompleted, `Future node ${fut} must not be active or completed`);
        }
      }
    });

    // 1.2 String representation of numbers ("0".."4")
    await test('T1.2: String-encoded integer phases ("0".."4") parse and render correctly', async () => {
      const phaseNames = ['现象', '疑问', '假说', '证据', '突破'];
      for (let p = 0; p <= 4; p++) {
        testWin.webContents.send('state-updated', { causalPhase: String(p), deltaQt: 60 });
        await new Promise(r => setTimeout(r, 50));
        const dom = await getDomBreadcrumbs();
        assert(dom.activeNode, `String phase "${p}" must highlight active node`);
        assert(dom.activeText.includes(phaseNames[p]), `String phase "${p}" must resolve to ${phaseNames[p]}, got "${dom.activeText}"`);
      }
    });

    // 1.3 Chinese Phase Name Payloads
    await test('T1.3: Chinese phase name payloads (causalPhase and causalPhaseName) map accurately', async () => {
      const phases = [
        { name: '现象', expectedIdx: '0' },
        { name: '疑问', expectedIdx: '1' },
        { name: '假说', expectedIdx: '2' },
        { name: '证据', expectedIdx: '3' },
        { name: '突破', expectedIdx: '4' }
      ];
      for (const item of phases) {
        // Test causalPhase as Chinese string
        testWin.webContents.send('state-updated', { causalPhase: item.name, deltaQt: 70 });
        await new Promise(r => setTimeout(r, 50));
        let dom = await getDomBreadcrumbs();
        assert(dom.activeText.includes(item.name), `causalPhase: "${item.name}" must activate "${item.name}" node`);

        // Test causalPhaseName property
        testWin.webContents.send('state-updated', { causalPhaseName: item.name, deltaQt: 72 });
        await new Promise(r => setTimeout(r, 50));
        dom = await getDomBreadcrumbs();
        assert(dom.activeText.includes(item.name), `causalPhaseName: "${item.name}" must activate "${item.name}" node`);
      }

      // Test legacy phase property
      testWin.webContents.send('state-updated', { phase: 3, deltaQt: 75 });
      await new Promise(r => setTimeout(r, 50));
      const domLegacy = await getDomBreadcrumbs();
      assert(domLegacy.activeText.includes('证据'), 'legacy phase: 3 must activate 证据 node');
    });

    // 1.4 Out-of-bounds phases clamping & safe fallback
    await test('T1.4: Out-of-bounds phases (-5, 99, "-10", "999", "invalid") gracefully clamp or fallback', async () => {
      // Negative integer: should clamp to 0 (现象)
      testWin.webContents.send('state-updated', { causalPhase: -5, deltaQt: 20 });
      await new Promise(r => setTimeout(r, 50));
      let dom = await getDomBreadcrumbs();
      assert(dom.activeText.includes('现象'), 'Negative causalPhase -5 must clamp to 现象');

      // Large integer: should clamp to 4 (突破)
      testWin.webContents.send('state-updated', { causalPhase: 99, deltaQt: 95 });
      await new Promise(r => setTimeout(r, 50));
      dom = await getDomBreadcrumbs();
      assert(dom.activeText.includes('突破'), 'Oversized causalPhase 99 must clamp to 突破');

      // String negative "-10": fallback to 0
      testWin.webContents.send('state-updated', { causalPhase: '-10', deltaQt: 30 });
      await new Promise(r => setTimeout(r, 50));
      dom = await getDomBreadcrumbs();
      assert(dom.activeText.includes('现象'), 'String "-10" out of range must fallback safely to 现象');

      // Arbitrary unknown string: fallback to 0
      testWin.webContents.send('state-updated', { causalPhase: 'completely_unknown_stage_name', deltaQt: 40 });
      await new Promise(r => setTimeout(r, 50));
      dom = await getDomBreadcrumbs();
      assert(dom.activeText.includes('现象'), 'Unknown phase string must fallback safely to 现象');
    });

    // 1.5 Rapid Burst Injection (100 events in rapid succession)
    await test('T1.5: Rapid burst injection of 100 state-updated events maintains consistency without desync', async () => {
      const burstCount = 100;
      for (let i = 0; i < burstCount; i++) {
        const randPhase = i % 5;
        testWin.webContents.send('state-updated', {
          causalPhase: randPhase,
          deltaQt: (i * 3) % 100
        });
      }
      // Follow immediately with a final authoritative anchor state
      testWin.webContents.send('state-updated', {
        causalPhase: 3,
        causalPhaseName: '证据',
        deltaQt: 88,
        clarity: 88
      });
      await new Promise(r => setTimeout(r, 200));

      const dom = await getDomBreadcrumbs();
      assert(dom.activeText.includes('证据'), `Final state must be 证据 after 100-event burst, got "${dom.activeText}"`);
      assert(dom.nodes[0].isCompleted && dom.nodes[1].isCompleted && dom.nodes[2].isCompleted, 'Nodes 0..2 must be completed');
      assert(!dom.nodes[4].isActive && !dom.nodes[4].isCompleted, 'Node 4 (突破) must be inactive');
      assert(dom.clarityBadges[0].includes('88'), `Clarity badge must reflect 88%, got "${dom.clarityBadges[0]}"`);
    });

    // =========================================================================
    // SUITE 2: Epistemic Clarity (ΔQt) Boundary & Data Type Resilience
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite 2: Epistemic Clarity (ΔQt) Boundary & Data Type Resilience ===${C.reset}`);

    // Helper to query clarity badges
    const getClarityBadgeTexts = async () => {
      return await testWin.webContents.executeJavaScript(`
        (() => {
          const badges = Array.from(document.querySelectorAll('#breadcrumbClarity, .clarity-badge, .delta-qt, .clarity-score'));
          return badges.map(b => b.innerText.trim());
        })()
      `);
    };

    // 2.1 Boundary values 0 and 100
    await test('T2.1: Clarity boundary values 0% and 100% reflect precisely without false fallbacks', async () => {
      testWin.webContents.send('state-updated', { deltaQt: 0, causalPhase: 0 });
      await new Promise(r => setTimeout(r, 50));
      let texts = await getClarityBadgeTexts();
      assert(texts.length > 0, 'At least one clarity badge must be found');
      assertEqual(texts[0], 'ΔQt: 0%', 'Clarity 0 must display exactly "ΔQt: 0%" without being overridden by default 58');

      testWin.webContents.send('state-updated', { deltaQt: 100, causalPhase: 4 });
      await new Promise(r => setTimeout(r, 50));
      texts = await getClarityBadgeTexts();
      assertEqual(texts[0], 'ΔQt: 100%', 'Clarity 100 must display exactly "ΔQt: 100%"');
    });

    // 2.2 Float clarity values
    await test('T2.2: Float clarity values (73.6, 42.125) render cleanly without "NaN" or "undefined"', async () => {
      const floatValues = [73.6, 42.125, 88.8888, 12.5];
      for (const f of floatValues) {
        testWin.webContents.send('state-updated', { deltaQt: f });
        await new Promise(r => setTimeout(r, 50));
        const texts = await getClarityBadgeTexts();
        assert(!texts[0].includes('NaN'), `Clarity for float ${f} must NOT contain "NaN", got "${texts[0]}"`);
        assert(!texts[0].includes('undefined'), `Clarity for float ${f} must NOT contain "undefined", got "${texts[0]}"`);
        assert(texts[0].includes(String(f)), `Clarity badge must contain float string "${f}", got "${texts[0]}"`);
      }
    });

    // 2.3 Missing clarity fields fallback
    await test('T2.3: Missing clarity in payload falls back gracefully to default without NaN/undefined', async () => {
      testWin.webContents.send('state-updated', { causalPhase: 2 }); // No deltaQt, clarity, epistemicClarity
      await new Promise(r => setTimeout(r, 50));
      const texts = await getClarityBadgeTexts();
      assert(!texts[0].includes('NaN'), `Clarity badge must not contain NaN on missing field, got "${texts[0]}"`);
      assert(!texts[0].includes('undefined'), `Clarity badge must not contain undefined on missing field, got "${texts[0]}"`);
      assert(texts[0].includes('58') || texts[0].startsWith('ΔQt:'), `Clarity badge should contain valid percentage, got "${texts[0]}"`);
    });

    // 2.4 Null clarity field resilience
    await test('T2.4: Null clarity and null deltaQt do NOT produce "NaN" or "undefined"', async () => {
      testWin.webContents.send('state-updated', { deltaQt: null, causalPhase: 2 });
      await new Promise(r => setTimeout(r, 50));
      let texts = await getClarityBadgeTexts();
      assert(!texts[0].includes('NaN'), `Null deltaQt must NOT produce NaN, got "${texts[0]}"`);
      assert(!texts[0].includes('undefined'), `Null deltaQt must NOT produce undefined, got "${texts[0]}"`);

      testWin.webContents.send('state-updated', { deltaQt: undefined, clarity: null, causalPhase: 2 });
      await new Promise(r => setTimeout(r, 50));
      texts = await getClarityBadgeTexts();
      assert(!texts[0].includes('NaN'), `Null clarity must NOT produce NaN, got "${texts[0]}"`);
      assert(!texts[0].includes('undefined'), `Null clarity must NOT produce undefined, got "${texts[0]}"`);
    });

    // 2.5 Fallback priority hierarchy (deltaQt > clarity > epistemicClarity)
    await test('T2.5: Priority hierarchy strictly honors deltaQt > clarity > epistemicClarity', async () => {
      // 1) All three present: deltaQt wins
      testWin.webContents.send('state-updated', { deltaQt: 91, clarity: 82, epistemicClarity: 73 });
      await new Promise(r => setTimeout(r, 50));
      let texts = await getClarityBadgeTexts();
      assert(texts[0].includes('91'), `deltaQt should take precedence (expected 91%, got "${texts[0]}")`);

      // 2) deltaQt missing: clarity wins
      testWin.webContents.send('state-updated', { clarity: 82, epistemicClarity: 73 });
      await new Promise(r => setTimeout(r, 50));
      texts = await getClarityBadgeTexts();
      assert(texts[0].includes('82'), `clarity should take precedence when deltaQt is missing (expected 82%, got "${texts[0]}")`);

      // 3) deltaQt & clarity missing: epistemicClarity wins
      testWin.webContents.send('state-updated', { epistemicClarity: 73 });
      await new Promise(r => setTimeout(r, 50));
      texts = await getClarityBadgeTexts();
      assert(texts[0].includes('73'), `epistemicClarity should take precedence when others missing (expected 73%, got "${texts[0]}")`);
    });

    // =========================================================================
    // SUITE 3: 400px, 380px, and 360px Viewport Geometry & No-Overflow Verification
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite 3: 400px, 380px, and 360px Viewport Geometry Stress Test ===${C.reset}`);

    // Helper to evaluate layout metrics under simulated container width
    const measureGeometryAtWidth = async (targetWidth) => {
      return await testWin.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
          const sidebarContainer = document.getElementById('sidebarContainer') || document.body;
          if (!container) return { error: 'container not found' };

          // Temporarily set container width
          const prevWidth = sidebarContainer.style.width;
          const prevMaxWidth = container.style.maxWidth;
          sidebarContainer.style.width = '${targetWidth}px';
          container.style.maxWidth = '${targetWidth}px';

          // Force reflow
          const offsetWidth = container.offsetWidth;
          const scrollWidth = container.scrollWidth;
          const clientWidth = container.clientWidth;

          const track = container.querySelector('.breadcrumbs-track');
          const trackScroll = track ? track.scrollWidth : 0;
          const trackOffset = track ? track.offsetWidth : 0;

          const meta = container.querySelector('.breadcrumbs-meta');
          const metaScroll = meta ? meta.scrollWidth : 0;
          const metaOffset = meta ? meta.offsetWidth : 0;

          // Restore
          sidebarContainer.style.width = prevWidth;
          container.style.maxWidth = prevMaxWidth;

          return {
            targetWidth: ${targetWidth},
            offsetWidth,
            scrollWidth,
            clientWidth,
            overflows: scrollWidth > offsetWidth + 5,
            trackScroll,
            trackOffset,
            trackOverflows: trackScroll > trackOffset + 5,
            metaScroll,
            metaOffset,
            metaOverflows: metaScroll > metaOffset + 5
          };
        })()
      `);
    };

    // 3.1 400px Standard Docked Width
    await test('T3.1: #causalBreadcrumbs fits cleanly at 400px standard width (scrollWidth <= offsetWidth + 5)', async () => {
      testWin.setBounds({ width: 400, height: 800 });
      await new Promise(r => setTimeout(r, 60));
      const m = await measureGeometryAtWidth(400);
      assert(!m.overflows, `At 400px: container scrollWidth (${m.scrollWidth}) must be <= offsetWidth + 5 (${m.offsetWidth + 5})`);
      assert(!m.trackOverflows, `At 400px: track scrollWidth (${m.trackScroll}) must be <= offsetWidth + 5 (${m.trackOffset + 5})`);
      assert(!m.metaOverflows, `At 400px: meta scrollWidth (${m.metaScroll}) must be <= offsetWidth + 5 (${m.metaOffset + 5})`);
    });

    // 3.2 380px Minimum Attached Dock Width
    await test('T3.2: #causalBreadcrumbs fits cleanly at 380px minimum width (scrollWidth <= offsetWidth + 5)', async () => {
      testWin.setBounds({ width: 380, height: 800 });
      await new Promise(r => setTimeout(r, 60));
      const m = await measureGeometryAtWidth(380);
      assert(!m.overflows, `At 380px: container scrollWidth (${m.scrollWidth}) must be <= offsetWidth + 5 (${m.offsetWidth + 5})`);
      assert(!m.trackOverflows, `At 380px: track scrollWidth (${m.trackScroll}) must be <= offsetWidth + 5 (${m.trackOffset + 5})`);
      assert(!m.metaOverflows, `At 380px: meta scrollWidth (${m.metaScroll}) must be <= offsetWidth + 5 (${m.metaOffset + 5})`);
    });

    // 3.3 360px Ultra-narrow Dock Width
    await test('T3.3: #causalBreadcrumbs fits cleanly at 360px ultra-narrow width (scrollWidth <= offsetWidth + 5)', async () => {
      testWin.setBounds({ width: 360, height: 800 });
      await new Promise(r => setTimeout(r, 60));
      const m = await measureGeometryAtWidth(360);
      assert(!m.overflows, `At 360px: container scrollWidth (${m.scrollWidth}) must be <= offsetWidth + 5 (${m.offsetWidth + 5})`);
      assert(!m.trackOverflows, `At 360px: track scrollWidth (${m.trackScroll}) must be <= offsetWidth + 5 (${m.trackOffset + 5})`);
      assert(!m.metaOverflows, `At 360px: meta scrollWidth (${m.metaScroll}) must be <= offsetWidth + 5 (${m.metaOffset + 5})`);
    });

    // 3.4 Dynamic Rapid Resize Stress Cycling
    await test('T3.4: Dynamic rapid resize stress cycling (400px -> 380px -> 360px -> 420px -> 400px) causes zero overflow', async () => {
      const widths = [400, 380, 360, 420, 390, 400, 380, 360, 400];
      for (const w of widths) {
        testWin.setBounds({ width: w, height: 800 });
        const m = await measureGeometryAtWidth(w);
        assert(!m.overflows, `During cycling at ${w}px: container scrollWidth (${m.scrollWidth}) exceeded offsetWidth + 5 (${m.offsetWidth + 5})`);
      }
    });

    // =========================================================================
    // SUITE 4: Auxiliary War Room Trigger Concurrency & Race Condition Test
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite 4: Auxiliary War Room Trigger Concurrency & Race Condition Test ===${C.reset}`);

    // 4.1 Single click emits toggle-war-room
    await test('T4.1: Single click on [全景复盘 ↗] emits toggle-war-room IPC cleanly', async () => {
      const prevCount = warRoomToggleCount;
      const clicked = await testWin.webContents.executeJavaScript(`
        (() => {
          const btn = document.getElementById('btnToggleWarRoom') ||
                      document.getElementById('btnOpenWarRoom') ||
                      Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('全景复盘'));
          if (!btn) return false;
          btn.click();
          return true;
        })()
      `);
      assert(clicked, 'Button [全景复盘 ↗] must exist and be clickable');
      await new Promise(r => setTimeout(r, 60));
      assertEqual(warRoomToggleCount, prevCount + 1, 'Clicking [全景复盘 ↗] must increment toggle-war-room count by 1');
    });

    // 4.2 Rapid Burst Clicks (50 rapid clicks)
    await test('T4.2: 50 rapid burst clicks execute without race condition or dropped events', async () => {
      const prevCount = warRoomToggleCount;
      const burstClicks = 50;

      const clickResult = await testWin.webContents.executeJavaScript(`
        (() => {
          const btn = document.getElementById('btnToggleWarRoom') ||
                      document.getElementById('btnOpenWarRoom') ||
                      Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('全景复盘'));
          if (!btn) return { count: 0 };
          let executed = 0;
          for (let i = 0; i < ${burstClicks}; i++) {
            btn.click();
            executed++;
          }
          return { count: executed };
        })()
      `);

      assertEqual(clickResult.count, burstClicks, 'Must execute 50 DOM clicks');
      await new Promise(r => setTimeout(r, 150));
      assertEqual(warRoomToggleCount, prevCount + burstClicks, `All ${burstClicks} IPC events must be cleanly delivered to main process`);
    });

    // 4.3 Concurrent clicks + state-updated bursts
    await test('T4.3: Interleaved concurrent clicks and state-updated bursts execute with zero deadlock or errors', async () => {
      const prevCount = warRoomToggleCount;
      const iterations = 30;

      for (let i = 0; i < iterations; i++) {
        // Send state update
        testWin.webContents.send('state-updated', {
          causalPhase: i % 5,
          deltaQt: (i * 7) % 100
        });
        // Click button
        testWin.webContents.executeJavaScript(`
          (() => {
            const btn = document.getElementById('btnToggleWarRoom') || document.getElementById('btnOpenWarRoom');
            if (btn) btn.click();
          })()
        `);
      }

      await new Promise(r => setTimeout(r, 200));
      assertEqual(warRoomToggleCount, prevCount + iterations, `All ${iterations} interleaved clicks must be processed`);
      
      // Verify breadcrumbs still responsive
      const dom = await getDomBreadcrumbs();
      assert(dom.exists && dom.activeNode, 'Breadcrumbs must remain responsive and intact after concurrent stress');
    });

    // =========================================================================
    // SUITE 5: Headless Process Stability, Lifecycle & Zero Console Errors
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite 5: Process Stability & Zero Console Errors ===${C.reset}`);

    // 5.1 Reload lifecycle resilience
    await test('T5.1: Multiple page reloads re-initialize breadcrumb state without duplicate listeners or crashes', async () => {
      for (let i = 0; i < 3; i++) {
        await testWin.loadURL(fileUrl);
        await new Promise(r => setTimeout(r, 100));
        const dom = await getDomBreadcrumbs();
        assert(dom.exists, `Breadcrumbs must exist on reload ${i + 1}`);
        assert(dom.activeNode, `Active node must be initialized on reload ${i + 1}`);
      }
    });

    // 5.2 Zero Console Errors (Level >= 3)
    await test('T5.2: Zero console errors (level >= 3) recorded throughout entire challenger run', async () => {
      assertEqual(capturedConsoleErrors.length, 0, `Expected 0 console errors, recorded ${capturedConsoleErrors.length}: ${JSON.stringify(capturedConsoleErrors)}`);
    });

    // =========================================================================
    // SUITE 6: Advanced Adversarial Edge Cases & Semantic DOM Integrity
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite 6: Advanced Adversarial Edge Cases & Semantic DOM Integrity ===${C.reset}`);

    // 6.1 Zoom / DPI scaling 1.25x geometry resilience at 360px width
    await test('T6.1: Zoom 1.25x scaling maintains containment at 360px simulated width (scrollWidth <= offsetWidth + 5)', async () => {
      const zoomResult = await testWin.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
          const sidebarContainer = document.getElementById('sidebarContainer') || document.body;
          if (!container) return { error: 'container not found' };

          document.body.style.zoom = '1.25';
          sidebarContainer.style.width = '360px';
          container.style.maxWidth = '360px';

          const offsetWidth = container.offsetWidth;
          const scrollWidth = container.scrollWidth;

          document.body.style.zoom = '1.0';
          sidebarContainer.style.width = '';
          container.style.maxWidth = '';

          return {
            offsetWidth,
            scrollWidth,
            overflows: scrollWidth > offsetWidth + 5
          };
        })()
      `);
      assert(!zoomResult.overflows, `Zoom 1.25x at 360px: scrollWidth (${zoomResult.scrollWidth}) exceeded offsetWidth + 5 (${zoomResult.offsetWidth + 5})`);
    });

    // 6.2 Semantic DOM contract & accessibility verification
    await test('T6.2: Semantic DOM contract: aria-label, data-phase 0..4, and node class invariants', async () => {
      const contract = await testWin.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('causalBreadcrumbs');
          if (!container) return { exists: false };
          const ariaLabel = container.getAttribute('aria-label');
          const nodes = Array.from(container.querySelectorAll('.crumb-item.phase-node.breadcrumb-stage'));
          const phases = nodes.map(n => n.getAttribute('data-phase'));
          const separators = Array.from(container.querySelectorAll('.crumb-separator')).map(s => s.innerText.trim());
          const btn = document.getElementById('btnToggleWarRoom');

          return {
            exists: true,
            hasAriaLabel: !!ariaLabel && ariaLabel.includes('因果'),
            nodeCount: nodes.length,
            phases,
            separatorCount: separators.length,
            separatorsMatch: separators.every(s => s === '→'),
            btnExists: !!btn,
            btnText: btn ? btn.innerText : '',
            btnTitle: btn ? btn.title : ''
          };
        })()
      `);

      assert(contract.exists, 'DOM container #causalBreadcrumbs must exist');
      assert(contract.hasAriaLabel, 'Container must have descriptive aria-label for accessibility');
      assertEqual(contract.nodeCount, 5, 'Must have exactly 5 causal stage nodes');
      assertDeepEqual(contract.phases, ['0', '1', '2', '3', '4'], 'Stages must have data-phase="0" through "4"');
      assertEqual(contract.separatorCount, 4, 'Must have 4 separator elements');
      assert(contract.separatorsMatch, 'All separators must be "→"');
      assert(contract.btnExists, 'Button #btnToggleWarRoom must exist');
      assert(contract.btnText.includes('全景复盘'), `Button text must include "全景复盘", got "${contract.btnText}"`);
    });

    // 6.3 200-event chaos flood stress test & single-active-node invariant
    await test('T6.3: 200-event chaos flood stress test guarantees strictly single active node and no DOM corruption', async () => {
      const chaosCount = 200;
      for (let i = 0; i < chaosCount; i++) {
        const chaosPayloads = [
          { causalPhase: i % 5, deltaQt: (i * 11) % 100 },
          { causalPhase: String((i + 1) % 5), clarity: (i * 7) % 100 },
          { causalPhase: -99, deltaQt: 10 },
          { causalPhase: 999, clarity: 99 },
          { causalPhase: '假说', deltaQt: 55 },
          { causalPhaseName: '突破', deltaQt: 100 },
          { phase: (i * 2) % 5, deltaQt: 45 },
          { deltaQt: null, causalPhase: 1 },
          { deltaQt: 0, causalPhase: 0 }
        ];
        testWin.webContents.send('state-updated', chaosPayloads[i % chaosPayloads.length]);
      }

      // Conclude with target anchor: Phase 1 (疑问)
      testWin.webContents.send('state-updated', {
        causalPhase: 1,
        causalPhaseName: '疑问',
        deltaQt: 45
      });
      await new Promise(r => setTimeout(r, 200));

      const dom = await getDomBreadcrumbs();
      const activeCount = dom.nodes.filter(n => n.isActive).length;
      assertEqual(activeCount, 1, `Exactly 1 node must be active after chaos flood, found ${activeCount}`);
      assert(dom.activeText.includes('疑问'), `Active node must be 疑问, got "${dom.activeText}"`);
      assert(dom.nodes[0].isCompleted, 'Node 0 (现象) must be marked .completed');
      assert(!dom.nodes[2].isCompleted && !dom.nodes[2].isActive, 'Node 2 (假说) must be neither active nor completed');
      assert(!dom.nodes[3].isCompleted && !dom.nodes[3].isActive, 'Node 3 (证据) must be neither active nor completed');
      assert(!dom.nodes[4].isCompleted && !dom.nodes[4].isActive, 'Node 4 (突破) must be neither active nor completed');
      assertEqual(dom.clarityBadges[0], 'ΔQt: 45%', 'Clarity badge must accurately reflect 45%');
    });

    // 6.4 Zero Uncaught Exceptions / Unhandled Rejections
    await test('T6.4: Zero uncaught exceptions and zero unhandled rejections recorded across all suites', async () => {
      assertEqual(uncaughtExceptions.length, 0, `Expected 0 uncaught exceptions, recorded ${uncaughtExceptions.length}: ${JSON.stringify(uncaughtExceptions)}`);
    });


  } finally {
    if (testWin && !testWin.isDestroyed()) {
      testWin.destroy();
    }
  }


  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n================================================================');
  console.log('                 CHALLENGER EXECUTION SUMMARY                   ');
  console.log('================================================================');
  console.log(`Total Tests Run  : ${totalTests}`);
  console.log(`Passed Tests     : ${passedTests}`);
  console.log(`Failed Tests     : ${failedTests}`);
  console.log(`Console Errors   : ${capturedConsoleErrors.length}`);
  console.log(`Uncaught Errors  : ${uncaughtExceptions.length}`);
  console.log('================================================================');

  if (failedTests > 0 || capturedConsoleErrors.length > 0 || uncaughtExceptions.length > 0) {
    console.error(`\n${C.red}${C.bold}VERDICT: REQUEST_CHANGES — Found ${failedTests} failures, ${capturedConsoleErrors.length} console errors.${C.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bold}VERDICT: APPROVE — All stress-test suites passed cleanly with 0 errors.${C.reset}`);
    process.exit(0);
  }
});
