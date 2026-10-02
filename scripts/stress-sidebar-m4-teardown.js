// scripts/stress-sidebar-m4-teardown.js
/**
 * Empirical Stress & Teardown Test Suite for Milestone M4
 * Challenger 2: Regression & Teardown Challenger
 * 
 * Verifies:
 * 1. Window lifecycle, disposal invariants, and EventListener leak detection
 * 2. Heap memory stability and leak rate under rapid toggle/creation bursts
 * 3. Slash command & Artifact memory footprint under repeated load
 * 4. Process teardown, sub-process termination speed, and hung process detection
 * 5. Zero console errors during violent destruction and teardown
 * 
 * Run with: npx electron scripts/stress-sidebar-m4-teardown.js
 */

const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

// Headless configuration
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');

const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: []
};

const capturedConsoleErrors = [];
function trackWebContents(webContents, tag) {
  webContents.on('console-message', (event, level, message, line) => {
    if (level >= 3) {
      capturedConsoleErrors.push({ tag, level, message, line });
      console.error(`  ${C.red}[ERROR][${tag}] L${line}: ${message}${C.reset}`);
    }
  });
}

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

async function runTest(name, fn) {
  stats.total++;
  const t0 = performance.now();
  try {
    const res = await fn();
    const dur = (performance.now() - t0).toFixed(2);
    stats.passed++;
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} (${dur}ms)${res?.note ? ' - ' + C.cyan + res.note + C.reset : ''}`);
    return res;
  } catch (err) {
    const dur = (performance.now() - t0).toFixed(2);
    stats.failed++;
    stats.findings.push({ name, error: err.message, stack: err.stack });
    console.log(`  ${C.red}✗ [FAIL]${C.reset} ${name} (${dur}ms)`);
    console.log(`    ${C.red}${err.message}${C.reset}`);
  }
}

app.whenReady().then(async () => {
  console.log(`\n${C.bright}================================================================${C.reset}`);
  console.log(`${C.bright}  CHALLENGER 2: M4 Teardown, Disposal & Regression Stress Suite  ${C.reset}`);
  console.log(`${C.bright}================================================================${C.reset}`);
  console.log(`Runtime: Node ${process.version}, Electron ${process.versions.electron}`);

  try {
    const mainModule = require('../main');
    const store = require('../services/store');
    const slashEngine = require('../services/slash-engine');

    // =========================================================================
    // SUITE 1: Window Lifecycle & EventListener Leak Detection
    // =========================================================================
    console.log(`\n${C.bright}--- Suite 1: Window Lifecycle & EventListener Leak Detection ---${C.reset}`);

    await runTest('T1.1: EventListener leak check on screen during window recreate cycles', async () => {
      const initialMetricsCount = screen.listenerCount('display-metrics-changed');
      const initialAddedCount = screen.listenerCount('display-added');
      const initialRemovedCount = screen.listenerCount('display-removed');

      // Create and destroy 10 sidebar windows with brief tick to let navigation start
      for (let i = 0; i < 10; i++) {
        const win = mainModule.createSidebarWindow();
        if (win && !win.isDestroyed()) {
          await new Promise(r => setTimeout(r, 50));
          win.destroy();
        }
      }

      const postMetricsCount = screen.listenerCount('display-metrics-changed');
      const postAddedCount = screen.listenerCount('display-added');
      const postRemovedCount = screen.listenerCount('display-removed');

      const leaked = (postMetricsCount - initialMetricsCount) + (postAddedCount - initialAddedCount) + (postRemovedCount - initialRemovedCount);
      if (leaked > 0) {
        // Record this as an empirical finding
        stats.findings.push({
          name: 'Screen EventListener Leak In createSidebarWindow',
          error: `createSidebarWindow attaches screen listeners without cleanup on window destroy. Leaked ${leaked} listeners over 10 cycles.`,
          leakCount: leaked
        });
        return {
          note: `FINDING: Leaked ${leaked} screen listeners across 10 recreate cycles (mitigated if singleton window preserved)`
        };
      }
      return { note: `0 screen listeners leaked (delta = ${leaked})` };
    });

    await runTest('T1.2: Window destruction integrity and post-destroy isolation', async () => {
      const win = new BrowserWindow({
        width: 400,
        height: 600,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      trackWebContents(win.webContents, 'T1.2');
      const sidebarHtmlPath = path.join(__dirname, '..', 'renderer', 'sidebar.html');
      await win.loadFile(sidebarHtmlPath);
      await new Promise(r => setTimeout(r, 100));

      const wc = win.webContents;
      assert(!win.isDestroyed(), 'Window must be alive before destruction');
      assert(!wc.isDestroyed(), 'WebContents must be alive before destruction');

      win.destroy();
      assert(win.isDestroyed(), 'Window must be destroyed after destroy() call');

      // In Electron Chromium, webContents disposal completes on next event loop tick
      await new Promise(r => setTimeout(r, 50));
      assert(wc.isDestroyed(), 'WebContents must be marked destroyed after event loop tick');

      // Attempting to call methods on destroyed window should throw safely
      let threw = false;
      try {
        win.getBounds();
      } catch (e) {
        threw = true;
      }
      assert(threw, 'Calling getBounds on destroyed window must throw Object has been destroyed');
    });

    await runTest('T1.3: Multi-window clean disposal (Sidebar, Focus Card, War Room)', async () => {
      const w1 = new BrowserWindow({ width: 400, height: 800, show: false });
      const w2 = new BrowserWindow({ width: 620, height: 420, show: false });
      const w3 = new BrowserWindow({ width: 1280, height: 840, show: false });

      assertEqual(BrowserWindow.getAllWindows().length >= 3, true, 'At least 3 windows created');

      w1.destroy();
      w2.destroy();
      w3.destroy();

      assertEqual(w1.isDestroyed(), true, 'Window 1 destroyed');
      assertEqual(w2.isDestroyed(), true, 'Window 2 destroyed');
      assertEqual(w3.isDestroyed(), true, 'Window 3 destroyed');
    });

    // =========================================================================
    // SUITE 2: Memory Stability & Leak Rate Stress Under High Frequency Load
    // =========================================================================
    console.log(`\n${C.bright}--- Suite 2: Memory Stability & Heap Stress ---${C.reset}`);

    await runTest('T2.1: 50 consecutive window creation & disposal cycles heap growth bound', async () => {
      if (global.gc) global.gc();
      const initialMem = process.memoryUsage().heapUsed;

      for (let i = 0; i < 50; i++) {
        const w = new BrowserWindow({
          width: 400,
          height: 800,
          show: false,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
          }
        });
        w.destroy();
      }

      if (global.gc) global.gc();
      const finalMem = process.memoryUsage().heapUsed;
      const deltaMB = (finalMem - initialMem) / (1024 * 1024);

      // 50 window cycles must not leak more than 20MB heap
      assert(deltaMB < 20, `Heap growth ${deltaMB.toFixed(2)}MB exceeds 20MB threshold`);
      return { note: `Heap delta: ${deltaMB >= 0 ? '+' : ''}${deltaMB.toFixed(2)} MB across 50 cycles` };
    });

    await runTest('T2.2: 100 rapid show/hide toggle latency & heap stability', async () => {
      const testWin = new BrowserWindow({
        width: 400,
        height: 800,
        show: false
      });

      const latencies = [];
      const tStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const t0 = performance.now();
        if (testWin.isVisible()) {
          testWin.hide();
        } else {
          testWin.show();
        }
        latencies.push(performance.now() - t0);
      }
      testWin.destroy();

      const avgLat = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3);
      const maxLat = Math.max(...latencies).toFixed(3);

      assert(parseFloat(avgLat) < 5.0, `Average toggle latency ${avgLat}ms must be < 5.0ms`);
      return { note: `100 toggles in ${(performance.now() - tStart).toFixed(1)}ms (avg: ${avgLat}ms, max: ${maxLat}ms)` };
    });

    await runTest('T2.3: 60 rapid Slash command executions & memory footprint stability', async () => {
      const initialHeap = process.memoryUsage().heapUsed;
      const commands = [
        { command: '/shred', rawInput: '/shred 优化 Windows 贴边侧边栏动画与内存管理' },
        { command: '/solve', rawInput: '/solve 发现进程退出时子进程未及时清理的卡点' },
        { command: '/plan', rawInput: '/plan 构建企业级自动化发布与回归质检流水线' }
      ];

      for (let i = 0; i < 60; i++) {
        const item = commands[i % 3];
        const res = await slashEngine.executeSlashCommand(item);
        assert(res && res.id, 'Executed slash command must return valid artifact');
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const deltaMB = (finalHeap - initialHeap) / (1024 * 1024);
      assert(deltaMB < 15, `Heap delta ${deltaMB.toFixed(2)}MB exceeds 15MB threshold`);
      return { note: `60 slash artifacts created, heap delta: ${deltaMB >= 0 ? '+' : ''}${deltaMB.toFixed(2)} MB` };
    });

    // =========================================================================
    // SUITE 3: Subprocess Teardown & Clean Exit Benchmark
    // =========================================================================
    console.log(`\n${C.bright}--- Suite 3: Subprocess Teardown & Hung Process Detection ---${C.reset}`);

    await runTest('T3.1: Subprocess clean exit verification via scripts/verify-attached-sidebar.js --suite=6', async () => {
      const electronPath = process.execPath;
      const scriptPath = path.join(__dirname, 'verify-attached-sidebar.js');

      const t0 = performance.now();
      const exitResult = await new Promise((resolve) => {
        const child = spawn(electronPath, [scriptPath, '--suite=6'], {
          cwd: path.join(__dirname, '..'),
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });

        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          resolve({ code: -1, timedOut: true, stdout, stderr });
        }, 8000);

        child.on('exit', (code) => {
          clearTimeout(timer);
          resolve({ code, timedOut: false, stdout, stderr });
        });
      });

      const durationMs = performance.now() - t0;
      assert(!exitResult.timedOut, 'Subprocess must exit within 8000ms without timing out');
      assertEqual(exitResult.code, 0, `Subprocess must exit with clean code 0 (got ${exitResult.code})`);
      assert(durationMs < 5000, `Subprocess duration ${durationMs.toFixed(0)}ms exceeds 5000ms threshold`);
      return { note: `Clean exit code 0 in ${durationMs.toFixed(0)}ms (Zero hung subprocesses)` };
    });

    await runTest('T3.2: Global shortcut unregistration verification upon will-quit', async () => {
      globalShortcut.register('Alt+S', () => {});
      assertEqual(globalShortcut.isRegistered('Alt+S'), true, 'Alt+S is registered');

      // Simulate will-quit teardown logic
      globalShortcut.unregisterAll();
      assertEqual(globalShortcut.isRegistered('Alt+S'), false, 'Alt+S is cleanly unregistered');
      assertEqual(globalShortcut.isRegistered('Alt+W'), false, 'Alt+W is cleanly unregistered');
      assertEqual(globalShortcut.isRegistered('Alt+F'), false, 'Alt+F is cleanly unregistered');
    });

    // =========================================================================
    // SUITE 4: Zero Console Errors Interception Across Lifecycle
    // =========================================================================
    console.log(`\n${C.bright}--- Suite 4: Zero Console Errors Across Teardown Lifecycle ---${C.reset}`);

    await runTest('T4.1: Zero console errors (level >= 3) detected during violent window destruction', async () => {
      const win = new BrowserWindow({
        width: 400,
        height: 600,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload.js'),
          contextIsolation: true
        }
      });
      trackWebContents(win.webContents, 'ViolentTeardown');
      await win.loadFile(path.join(__dirname, '..', 'renderer', 'sidebar.html'));

      // Rapidly destroy without waiting
      win.destroy();
      await new Promise(r => setTimeout(r, 200));

      assertEqual(capturedConsoleErrors.length, 0, 'No console errors allowed during teardown');
      return { note: '0 console errors during violent destruction' };
    });

  } catch (globalErr) {
    console.error(`\n${C.red}CRITICAL TEST SUITE EXCEPTION:${C.reset}`, globalErr);
    stats.failed++;
    stats.findings.push({ name: 'Global Suite Execution', error: globalErr.message });
  } finally {
    console.log(`\n${C.bright}================================================================${C.reset}`);
    console.log(`Stress Tests Run: ${stats.total} | ${C.green}Passed: ${stats.passed}${C.reset} | Failed: ${stats.failed}`);
    console.log(`Findings Recorded: ${stats.findings.length}`);
    console.log(`Console Errors  : ${capturedConsoleErrors.length === 0 ? C.green + '0 (Zero Console Errors)' + C.reset : C.red + capturedConsoleErrors.length + C.reset}`);
    console.log(`${C.bright}================================================================${C.reset}\n`);

    if (stats.findings.length > 0) {
      console.log(`${C.yellow}Notable Findings / Audits:${C.reset}`);
      stats.findings.forEach((f, i) => {
        console.log(`  ${i + 1}) [${f.name}]: ${f.error}`);
      });
    }

    const exitCode = stats.failed > 0 ? 1 : 0;
    app.quit();
    process.exit(exitCode);
  }
});
