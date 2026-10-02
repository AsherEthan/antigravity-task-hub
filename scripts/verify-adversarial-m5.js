// scripts/verify-adversarial-m5.js
/**
 * Comprehensive Cross-Subsystem Adversarial Stress Test Suite for Milestone M5
 * Final Acceptance & Adversarial Hardening (R1 + R2 + R3 + R4 Combined Workflows)
 *
 * Target: Electron Headless Runner
 * Execution: npx electron scripts/verify-adversarial-m5.js
 */

const { app, BrowserWindow, ipcMain, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Configure headless flags
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Terminal colors
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

// Global error tracking
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

const stats = {
  suitesRun: 0,
  totalTests: 0,
  passed: 0,
  failed: 0,
  failures: [],
  startTime: 0,
  endTime: 0
};

async function test(name, fn) {
  stats.totalTests++;
  const t0 = performance.now();
  try {
    await fn();
    const duration = (performance.now() - t0).toFixed(1);
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    stats.passed++;
  } catch (err) {
    const duration = (performance.now() - t0).toFixed(1);
    console.error(`  ${C.red}✗ [FAIL]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}: ${err.message}`);
    stats.failed++;
    stats.failures.push({ name, error: err.message, stack: err.stack });
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

// Load core services
const contextManager = require('../services/context-manager');
const cognitiveShredder = require('../services/cognitive-shredder');
const slashEngine = require('../services/slash-engine');
const artifactExporter = require('../services/artifact-exporter');
const store = require('../services/store');

// Whitelist and blacklist definitions
const PHYSICAL_VERB_WHITELIST = [
  '打开', '注释', '对比', '打印', '修改', '运行', '运行测试', '记录', '查看',
  '搜索', '查阅', '标记', '执行', '定位', '替换', '复制', '新建', '固定',
  '测试', '断开', '连接', '截取', '采集'
];

const FUZZY_VERB_BLACKLIST = [
  '思考', '分析', '理解', '弄懂', '领会', '构思', '研读', '推导', '揣摩',
  '琢磨', '领悟', '体会', '研究', '策划', '探讨', '规划', '梳理', '总结',
  '学习', '反思', '评估', '考察', '想象', '推测', '消化', '体悟'
];

// Spied shell calls
const spiedShellCalls = {
  showItemInFolder: [],
  openPath: []
};

// Safe IPC registering
function safeHandle(channel, handler) {
  try { ipcMain.removeHandler(channel); } catch (e) {}
  ipcMain.handle(channel, handler);
}

function safeOn(channel, listener) {
  try { ipcMain.removeAllListeners(channel); } catch (e) {}
  ipcMain.on(channel, listener);
}

// Initialize test IPC mock registry
function initMockIpc() {
  safeHandle('get-artifacts', async () => store.getArtifacts());
  safeHandle('save-artifact', async (event, art) => store.addArtifact(art));
  safeHandle('get-state', async () => store.data);
  safeHandle('save-state', async (event, data) => { store.data = data; store.saveData(); return true; });
  safeHandle('read-clipboard-context', async () => {
    const text = clipboard.readText() || '';
    return {
      text,
      length: text.length,
      timestamp: Date.now(),
      preview: text.length > 100 ? text.slice(0, 97) + '...' : text
    };
  });
  safeHandle('detect-clipboard-exception', async () => {
    const text = clipboard.readText() || '';
    return contextManager.detectException(text);
  });
  safeHandle('copy-to-clipboard', async (event, text) => {
    clipboard.writeText(String(text || ''));
    return { success: true };
  });
  safeHandle('execute-slash-command', async (event, payload) => {
    const art = await slashEngine.executeSlashCommand(payload);
    if (art) store.addArtifact(art);
    return art;
  });
  safeHandle('toggle-artifact-step', async (event, payload) => {
    return store.toggleArtifactStep(payload);
  });
  safeHandle('copy-artifact-markdown', async (event, payload) => {
    return artifactExporter.copyArtifactMarkdown(payload, clipboard);
  });
  safeHandle('export-artifact-file', async (event, payload) => {
    return artifactExporter.exportArtifactFile(payload);
  });
  safeHandle('export-artifact-markdown', async (event, payload) => {
    return artifactExporter.exportArtifactMarkdown(payload);
  });
  safeHandle('locate-artifact', async (event, payload) => {
    let filePath = payload?.filePath;
    const artifactId = payload?.artifactId;
    let art = null;
    if (artifactId) art = store.getArtifact(artifactId);

    if (!filePath && art?.localFilePath && fs.existsSync(art.localFilePath)) {
      filePath = art.localFilePath;
    }
    if ((!filePath || !fs.existsSync(filePath)) && art) {
      const res = await artifactExporter.exportArtifactFile({ artifact: art });
      filePath = res?.filePath;
      if (filePath) {
        art.localFilePath = filePath;
        store.saveData();
      }
    }
    if (filePath && fs.existsSync(filePath)) {
      const resolved = path.resolve(filePath);
      spiedShellCalls.showItemInFolder.push(resolved);
      try { shell.showItemInFolder(resolved); } catch (e) {}
      return { success: true, filePath: resolved };
    }
    return { success: false, error: 'File does not exist on disk' };
  });

  safeHandle('open-artifact', async (event, payload) => {
    let filePath = payload?.filePath;
    const artifactId = payload?.artifactId;
    let art = null;
    if (artifactId) art = store.getArtifact(artifactId);

    if (!filePath && art?.localFilePath && fs.existsSync(art.localFilePath)) {
      filePath = art.localFilePath;
    }
    if ((!filePath || !fs.existsSync(filePath)) && art) {
      const res = await artifactExporter.exportArtifactFile({ artifact: art });
      filePath = res?.filePath;
      if (filePath) {
        art.localFilePath = filePath;
        store.saveData();
      }
    }
    if (filePath && fs.existsSync(filePath)) {
      const resolved = path.resolve(filePath);
      spiedShellCalls.openPath.push(resolved);
      let errMsg = null;
      try { errMsg = await shell.openPath(resolved); } catch (e) { errMsg = e.message; }
      return { success: !errMsg, filePath: resolved, error: errMsg };
    }
    return { success: false, error: 'File does not exist on disk' };
  });

  safeHandle('show-item-in-folder', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) return { success: false, error: 'Path not found' };
    const resolved = path.resolve(targetPath);
    spiedShellCalls.showItemInFolder.push(resolved);
    try { shell.showItemInFolder(resolved); } catch (e) {}
    return { success: true };
  });

  safeHandle('open-path', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) return { success: false, error: 'Path not found' };
    const resolved = path.resolve(targetPath);
    spiedShellCalls.openPath.push(resolved);
    let err = null;
    try { err = await shell.openPath(resolved); } catch (e) { err = e.message; }
    return { success: !err, error: err };
  });

  safeOn('toggle-war-room', () => {
    warRoomToggleCount++;
  });
  safeOn('toggle-sidebar', () => {});
  safeOn('hide-sidebar', () => {});
  safeHandle('get-sidebar-bounds', () => ({ x: 1520, y: 0, width: 400, height: 1040 }));
  safeHandle('set-pin-state', (event, pinned) => ({ success: true, pinned }));
}

// Window management
let sidebarWin = null;

async function createHeadlessSidebar(width = 400, height = 800) {
  if (sidebarWin && !sidebarWin.isDestroyed()) {
    sidebarWin.destroy();
  }
  sidebarWin = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  trackWebContents(sidebarWin.webContents, 'AdversarialSidebar');
  const sidebarHtml = path.join(__dirname, '..', 'renderer', 'sidebar.html');
  const fileUrl = require('url').pathToFileURL(sidebarHtml).href;
  await sidebarWin.loadURL(fileUrl);
  await new Promise(r => setTimeout(r, 200));
  return sidebarWin;
}

// Main execution block
app.whenReady().then(async () => {
  stats.startTime = performance.now();
  console.log(`\n${C.magenta}${C.bold}================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bold}  Antigravity Final Adversarial Stress Suite (Milestone M5)      ${C.reset}`);
  console.log(`${C.magenta}${C.bold}================================================================${C.reset}`);
  console.log(`Node: ${process.version}, Electron: ${process.versions.electron}, Arch: ${process.arch}`);

  initMockIpc();

  try {
    // =========================================================================
    // SUITE A: Rapid Alt+S Toggling with Clipboard Mutation & Exception Glow
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite A: Rapid Alt+S Toggling with Clipboard Mutation ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      const win = await createHeadlessSidebar(400, 800);

      await test('A1: Stack trace clipboard mutation -> auto-mounts @selection [error] & activates edge breathing glow', async () => {
        const stackTrace = `TypeError: Cannot read properties of undefined (reading 'digest')
    at TokenParser.parse (d:/project/parser.js:142:25)
    at runProcess (d:/project/core.js:89:12)`;
        clipboard.writeText(stackTrace);

        const res = await win.webContents.executeJavaScript(`
          (async () => {
            await window.__handleSummonSelection();
            await window.__checkClipboardForErrors();
            const container = document.getElementById('sidebarContainer');
            const chips = Array.from(document.querySelectorAll('#mountedChips .context-chip'));
            const input = document.getElementById('sidebarPromptInput');
            const hasGlow = container.classList.contains('exception-detected');
            const lastChip = chips[chips.length - 1];
            return {
              chipCount: chips.length,
              chipTag: lastChip ? lastChip.querySelector('.chip-tag')?.innerText : null,
              chipType: lastChip ? lastChip.dataset.type : null,
              hasGlow,
              inputFocused: document.activeElement === input
            };
          })()
        `);

        assertEqual(res.chipTag, '@selection', 'Auto-mounted chip must have @selection tag');
        assertEqual(res.chipType, 'error', 'Exception snippet must classify as error type');
        assert(res.hasGlow, 'Sidebar container must exhibit .exception-detected breathing glow');
        assert(res.inputFocused, 'Focus must remain on #sidebarPromptInput');
      });

      await test('A2: Code snippet clipboard mutation -> auto-mounts @selection [code] & removes exception glow', async () => {
        const codeSnippet = `function calculateClarity(stages, weights) {
  return stages.reduce((acc, s, idx) => acc + (s.completed ? weights[idx] : 0), 0);
}`;
        clipboard.writeText(codeSnippet);

        const res = await win.webContents.executeJavaScript(`
          (async () => {
            await window.__handleSummonSelection();
            await window.__checkClipboardForErrors();
            const container = document.getElementById('sidebarContainer');
            const chips = Array.from(document.querySelectorAll('#mountedChips .context-chip'));
            const lastChip = chips[chips.length - 1];
            return {
              chipTag: lastChip ? lastChip.querySelector('.chip-tag')?.innerText : null,
              chipType: lastChip ? lastChip.dataset.type : null,
              hasGlow: container.classList.contains('exception-detected')
            };
          })()
        `);

        assertEqual(res.chipTag, '@selection', 'Auto-mounted chip must have @selection tag');
        assertEqual(res.chipType, 'code', 'JS code snippet must classify as code type');
        assert(!res.hasGlow, 'Code snippet must NOT activate exception breathing glow');
      });

      await test('A3: Plain text clipboard mutation -> auto-mounts @selection [selection] & no exception glow', async () => {
        const plainText = '用户反馈在多显示器环境下点击右侧边缘响应略有迟滞';
        clipboard.writeText(plainText);

        const res = await win.webContents.executeJavaScript(`
          (async () => {
            await window.__handleSummonSelection();
            await window.__checkClipboardForErrors();
            const container = document.getElementById('sidebarContainer');
            const chips = Array.from(document.querySelectorAll('#mountedChips .context-chip'));
            const lastChip = chips[chips.length - 1];
            return {
              chipTag: lastChip ? lastChip.querySelector('.chip-tag')?.innerText : null,
              chipType: lastChip ? lastChip.dataset.type : null,
              hasGlow: container.classList.contains('exception-detected')
            };
          })()
        `);

        assertEqual(res.chipTag, '@selection', 'Auto-mounted chip must have @selection tag');
        assertEqual(res.chipType, 'selection', 'Plain text must classify as standard selection type');
        assert(!res.hasGlow, 'Plain text must NOT activate exception breathing glow');
      });

      await test('A4: 25-cycle rapid burst Alt+S toggling with interleaved clipboard mutations', async () => {
        const mutations = [
          'Panic: runtime error: index out of range [3] with length 2\ngoroutine 1 [running]:\nmain.main()',
          'const computeMetrics = (data) => Object.keys(data).length;',
          '普通工作事项记录：完成第四阶段因果图重构',
          'File "train.py", line 84, in <module>\n    loss.backward()\nRuntimeError: CUDA out of memory.',
          '<div class="adversarial-xss-test"><script>alert(1)</script></div>'
        ];

        for (let i = 0; i < 25; i++) {
          const sample = mutations[i % mutations.length];
          clipboard.writeText(sample);
          await win.webContents.executeJavaScript(`window.__handleSummonSelection(); window.__checkClipboardForErrors();`);
        }

        const stateCheck = await win.webContents.executeJavaScript(`
          (() => {
            const container = document.getElementById('sidebarContainer');
            const input = document.getElementById('sidebarPromptInput');
            return {
              containerExists: Boolean(container),
              inputExists: Boolean(input)
            };
          })()
        `);

        assert(stateCheck.containerExists && stateCheck.inputExists, 'DOM must remain intact after 25 rapid toggle cycles');
      });
    })();

    // =========================================================================
    // SUITE B: Empty Prompt Enter Defaults to /shred Breakdown within 5s SLA
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite B: Empty Prompt Enter -> Instant /shred Breakdown ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      const win = await createHeadlessSidebar(400, 800);

      await test('B1: Empty input + mounted @selection chip + Enter -> defaults to /shred within 5s SLA', async () => {
        clipboard.writeText('Uncaught ReferenceError: stateEngine is not defined at store.js:42');

        const startTime = performance.now();
        const shredResult = await win.webContents.executeJavaScript(`
          (async () => {
            await window.__handleSummonSelection();
            const input = document.getElementById('sidebarPromptInput');
            input.value = ''; // Explicit empty prompt

            // Simulate Enter keydown
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true
            });
            input.dispatchEvent(enterEvent);

            // Wait for active artifact to be rendered
            const maxWait = 5000;
            const pollInterval = 40;
            let elapsed = 0;
            while (elapsed < maxWait) {
              const card = document.querySelector('#activeArtifactCard .interactive-artifact-card');
              if (card) {
                const badge = card.querySelector('.command-badge')?.innerText;
                const steps = Array.from(card.querySelectorAll('.step-item'));
                if (steps.length >= 3) {
                  return {
                    success: true,
                    commandBadge: badge,
                    stepCount: steps.length,
                    stepTitles: steps.map(s => s.querySelector('.step-text')?.innerText || '')
                  };
                }
              }
              await new Promise(r => setTimeout(r, pollInterval));
              elapsed += pollInterval;
            }
            return { success: false, timeout: true };
          })()
        `);
        const duration = performance.now() - startTime;

        assert(shredResult.success, 'Empty Enter with mounted context must deconstruct into artifact');
        assert(duration < 5000, `Execution took ${duration.toFixed(1)}ms, exceeding 5000ms SLA`);
        assertEqual(shredResult.commandBadge, '/shred', 'Default command must be /shred');
        assert(shredResult.stepCount >= 3, `Expected >= 3 micro-actions, got ${shredResult.stepCount}`);
      });

      await test('B2: Whitespace-only input ("   ") also defaults to /shred when context is mounted', async () => {
        const shredResult = await win.webContents.executeJavaScript(`
          (async () => {
            const input = document.getElementById('sidebarPromptInput');
            input.value = '     '; // Whitespace only

            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true });
            input.dispatchEvent(enterEvent);

            for (let i = 0; i < 50; i++) {
              const card = document.querySelector('#activeArtifactCard .interactive-artifact-card');
              if (card && card.querySelector('.command-badge')?.innerText === '/shred') {
                return { success: true };
              }
              await new Promise(r => setTimeout(r, 40));
            }
            return { success: false };
          })()
        `);

        assert(shredResult.success, 'Whitespace input must trigger default /shred breakdown');
      });
    })();

    // =========================================================================
    // SUITE C: Physical Verb Purity Invariant & Cognitive Shredder Hardening
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite C: Physical Verb Purity Invariant & Cognitive Shredder ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      await test('C1: Whitelist check: 100% of micro-action verbs must belong to 23-whitelist', async () => {
        const testGoals = [
          '排查 Windows 贴边窗口 Alt+S 呼出延迟偶发大于 20ms 问题',
          '解决 WebGL 渲染管线内存泄漏与上下文丢失',
          '重构数据存储层以支持原子化落盘与高并发读写',
          '定位 WebSocket 连接心跳超时与断线自动重连失败'
        ];

        for (const goal of testGoals) {
          const res = await cognitiveShredder.decomposeGoal(goal);
          assert(res && Array.isArray(res.actions) && res.actions.length >= 3, 'Actions array must be >= 3');
          for (const act of res.actions) {
            const verb = act.actionVerb || act.verb;
            assert(
              PHYSICAL_VERB_WHITELIST.includes(verb),
              `Action verb "${verb}" does not belong to PHYSICAL_VERB_WHITELIST (23 verbs)`
            );
          }
        }
      });

      await test('C2: Blacklist check: 0% fuzzy non-physical verbs in verbs, titles, and prompts', async () => {
        const fuzzyAdversarialGoals = [
          '深入思考架构设计与重构方案，认真分析系统卡点',
          '仔细理解并领会分布式共识协议，研读论文并推导数学模型',
          '揣摩琢磨用户心智模型，体会领悟交互精髓',
          '全面研究策划新特性，探讨规划演进路线，梳理总结经验',
          '认真学习反思失败教训，评估考察候选方案，充分想象推测可能瓶颈'
        ];

        for (const goal of fuzzyAdversarialGoals) {
          const res = await cognitiveShredder.decomposeGoal(goal);
          assert(res && Array.isArray(res.actions), 'Decomposition must succeed');
          for (const act of res.actions) {
            const verb = act.actionVerb || act.verb || '';
            const title = act.title || '';
            const plainPrompt = act.plainPrompt || '';

            for (const fuzzy of FUZZY_VERB_BLACKLIST) {
              assert(
                !verb.includes(fuzzy),
                `Action verb "${verb}" contains forbidden fuzzy word "${fuzzy}"`
              );
              assert(
                !title.includes(fuzzy),
                `Action title "${title}" contains forbidden fuzzy word "${fuzzy}"`
              );
              assert(
                !plainPrompt.includes(fuzzy),
                `Action plainPrompt "${plainPrompt}" contains forbidden fuzzy word "${fuzzy}"`
              );
            }
          }
        }
      });

      await test('C3: Duration invariant: every micro-action estMinutes strictly <= 2 (2-minute rule)', async () => {
        const goals = [
          '从零搭建完整的生产级分布式任务调度集群',
          '编写 1000 个单元测试并提升覆盖率至 95%',
          '重构整个桌面端 UI 框架为全新渲染引擎'
        ];

        for (const goal of goals) {
          const res = await cognitiveShredder.decomposeGoal(goal);
          for (const act of res.actions) {
            assert(
              typeof act.estMinutes === 'number' && act.estMinutes <= 2 && act.estMinutes >= 1,
              `Micro-action estMinutes (${act.estMinutes}) must be <= 2 and >= 1`
            );
          }
        }
      });

      await test('C4: Vanity gamification purge: zero xpReward, combo, rank, monsterHp in actions/artifacts', async () => {
        const res = await cognitiveShredder.decomposeGoal('排查多线程死锁');
        for (const act of res.actions) {
          assertEqual(act.xpReward, undefined, 'xpReward must be purged from micro-action');
          assertEqual(act.combo, undefined, 'combo must be purged from micro-action');
          assertEqual(act.rank, undefined, 'rank must be purged from micro-action');
          assertEqual(act.monsterHp, undefined, 'monsterHp must be purged from micro-action');
        }

        const art = await slashEngine.executeSlashCommand({
          command: '/shred',
          query: '排查多线程死锁',
          rawInput: '/shred 排查多线程死锁'
        });

        assertEqual(art.xpReward, undefined, 'xpReward must be purged from artifact');
        assertEqual(art.loot, undefined, 'loot must be purged from artifact');
      });

      await test('C5: 50-item adversarial fuzzy corpus batch stress test', async () => {
        const corpus = [];
        for (let i = 0; i < 50; i++) {
          const fuzzyVerb = FUZZY_VERB_BLACKLIST[i % FUZZY_VERB_BLACKLIST.length];
          corpus.push(`请你${fuzzyVerb}第 ${i + 1} 项系统异常并给出破局思路`);
        }

        for (const query of corpus) {
          const res = await cognitiveShredder.decomposeGoal(query);
          for (const act of res.actions) {
            const verb = act.actionVerb || act.verb;
            assert(PHYSICAL_VERB_WHITELIST.includes(verb), `Verb "${verb}" must be in whitelist`);
            assert(act.estMinutes <= 2, 'Duration must be <= 2m');
          }
        }
      });
    })();

    // =========================================================================
    // SUITE D: UI De-bloat: Regex Scan Renderer Files and Live DOM
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite D: UI De-bloat: Regex Scan Files and DOM ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      await test('D1: Source code regex scan of renderer files for residual gamification text', async () => {
        const filesToScan = [
          path.join(__dirname, '..', 'renderer', 'sidebar.html'),
          path.join(__dirname, '..', 'renderer', 'hud.html'),
          path.join(__dirname, '..', 'renderer', 'hud.js')
        ];

        // Specific gamification regexes to check in user-visible strings
        const gamificationPatterns = [
          /\bXP\s*\+\d+/i,
          /连击倍率/i,
          /连击加成/i,
          /打卡奖励/i,
          /怪兽血量/i,
          /BOSS\s*血量/i
        ];

        for (const filePath of filesToScan) {
          if (!fs.existsSync(filePath)) continue;
          const content = fs.readFileSync(filePath, 'utf8');
          for (const pattern of gamificationPatterns) {
            const match = content.match(pattern);
            assert(!match, `Found residual gamification text "${match?.[0]}" in ${path.basename(filePath)}`);
          }
        }
      });

      await test('D2: Live DOM scan across headless window for residual gamification strings', async () => {
        const win = await createHeadlessSidebar(400, 800);

        const domAudit = await win.webContents.executeJavaScript(`
          (() => {
            const allElements = document.querySelectorAll('*');
            const violations = [];
            const bannedKeywords = ['XP +', '怪兽', '打卡', '连击倍率', '击杀BOSS'];

            for (const el of allElements) {
              const text = el.innerText || '';
              for (const kw of bannedKeywords) {
                if (text.includes(kw)) {
                  violations.push({ tag: el.tagName, id: el.id, class: el.className, keyword: kw });
                }
              }
            }
            return violations;
          })()
        `);

        assertEqual(domAudit.length, 0, `DOM contains residual gamification elements: ${JSON.stringify(domAudit)}`);
      });
    })();

    // =========================================================================
    // SUITE E: Step Ticking Workspace Disk Sync (artifacts/*.md)
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite E: Step Ticking Workspace Disk Sync ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      const artifactsDir = path.join(__dirname, '..', 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      const testArtifactId = 'art_stress_sync_' + Date.now();
      const testArtifact = {
        id: testArtifactId,
        type: 'shred',
        command: '/shred',
        title: '压力测试步骤勾选落盘闭环',
        query: '验证微动作勾选与 Markdown 文件的双向同步',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active',
        progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
        steps: [
          { id: 'step_1', title: '打开配置文件确认端口', actionVerb: '打开', estMinutes: 1, completed: false },
          { id: 'step_2', title: '修改环境变量并保存', actionVerb: '修改', estMinutes: 2, completed: false },
          { id: 'step_3', title: '运行测试用例验证回归', actionVerb: '运行测试', estMinutes: 2, completed: false }
        ]
      };

      store.addArtifact(testArtifact);

      // Export file initially
      const exportRes = await artifactExporter.exportArtifactFile({ artifact: testArtifact });
      assert(exportRes && exportRes.success && exportRes.filePath, 'Initial file export must succeed');
      const targetDiskPath = exportRes.filePath;
      assert(fs.existsSync(targetDiskPath), 'Target markdown file must exist on disk');

      await test('E1: Initial disk Markdown contains three unchecked boxes (- [ ]) and status active', async () => {
        const content = fs.readFileSync(targetDiskPath, 'utf8');
        assert(content.includes('- [ ] **步骤 1 · 打开**'), 'Step 1 must be unchecked');
        assert(content.includes('- [ ] **步骤 2 · 修改**'), 'Step 2 must be unchecked');
        assert(content.includes('- [ ] **步骤 3 · 运行测试**'), 'Step 3 must be unchecked');
        assert(content.includes('status: active'), 'Initial frontmatter status must be active');
        assert(content.includes('progress: 0% (0/3 completed)'), 'Initial progress must be 0%');
      });

      await test('E2: Tick step 1 -> immediately synchronizes to disk with - [x] and 33% progress', async () => {
        const updatedArt = store.toggleArtifactStep({
          artifactId: testArtifactId,
          stepId: 'step_1',
          completed: true
        });

        assert(updatedArt && updatedArt.progress.completedSteps === 1, 'Store must reflect 1 completed step');

        // Verify disk file
        const content = fs.readFileSync(targetDiskPath, 'utf8');
        assert(content.includes('- [x] **步骤 1 · 打开**'), 'Step 1 must be marked as checked on disk');
        assert(content.includes('- [ ] **步骤 2 · 修改**'), 'Step 2 must remain unchecked on disk');
        assert(content.includes('progress: 33% (1/3 completed)'), 'Frontmatter must update to 33% (1/3 completed)');
        assert(content.includes('status: in-progress'), 'Frontmatter status must transition to in-progress');
      });

      await test('E3: Tick steps 2 and 3 -> disk updates to 100% completed and status: completed', async () => {
        store.toggleArtifactStep({ artifactId: testArtifactId, stepId: 'step_2', completed: true });
        store.toggleArtifactStep({ artifactId: testArtifactId, stepId: 'step_3', completed: true });

        const content = fs.readFileSync(targetDiskPath, 'utf8');
        assert(content.includes('- [x] **步骤 1 · 打开**'), 'Step 1 checked');
        assert(content.includes('- [x] **步骤 2 · 修改**'), 'Step 2 checked');
        assert(content.includes('- [x] **步骤 3 · 运行测试**'), 'Step 3 checked');
        assert(content.includes('progress: 100% (3/3 completed)'), 'Frontmatter must update to 100%');
        assert(content.includes('status: completed'), 'Frontmatter status must transition to completed');
      });

      await test('E4: Untick step 2 -> disk updates back to 67% and status: in-progress', async () => {
        store.toggleArtifactStep({ artifactId: testArtifactId, stepId: 'step_2', completed: false });

        const content = fs.readFileSync(targetDiskPath, 'utf8');
        assert(content.includes('- [x] **步骤 1 · 打开**'), 'Step 1 remains checked');
        assert(content.includes('- [ ] **步骤 2 · 修改**'), 'Step 2 reverts to unchecked');
        assert(content.includes('- [x] **步骤 3 · 运行测试**'), 'Step 3 remains checked');
        assert(content.includes('progress: 67% (2/3 completed)'), 'Frontmatter must update to 67% (2/3 completed)');
        assert(content.includes('status: in-progress'), 'Frontmatter status must return to in-progress');
      });

      await test('E5: Rapid concurrent 10-toggle burst executes cleanly without file lock/corruption', async () => {
        for (let i = 0; i < 10; i++) {
          store.toggleArtifactStep({
            artifactId: testArtifactId,
            stepId: 'step_1',
            completed: i % 2 === 0
          });
        }
        const content = fs.readFileSync(targetDiskPath, 'utf8');
        assert(content.startsWith('---') && content.includes('progress:'), 'File must retain valid frontmatter');
      });
    })();

    // =========================================================================
    // SUITE F: Shell IPC Robustness & Auto-Export Fallback
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite F: Shell IPC Robustness & Auto-Export Fallback ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      spiedShellCalls.showItemInFolder = [];
      spiedShellCalls.openPath = [];

      const unexportedId = 'art_unexported_' + Date.now();
      const unexportedArt = {
        id: unexportedId,
        type: 'plan',
        command: '/plan',
        title: '未导出的实时计划',
        query: '测试自动兜底导出',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active',
        progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
        steps: [{ id: 's1', title: '查看运行日志', actionVerb: '查看', estMinutes: 1, completed: false }],
        localFilePath: null // Intentionally null
      };
      store.addArtifact(unexportedArt);

      const win = await createHeadlessSidebar(400, 800);

      await test('F1: locate-artifact on unexported artifact triggers auto-export fallback and shell.showItemInFolder', async () => {
        const res = await win.webContents.executeJavaScript(`
          window.sidebarAPI.locateArtifact({ artifactId: '${unexportedId}' })
        `);

        assert(res.success, 'locateArtifact must succeed via auto-export fallback');
        assert(res.filePath && fs.existsSync(res.filePath), 'File must be created on disk');
        assert(spiedShellCalls.showItemInFolder.length > 0, 'shell.showItemInFolder must be invoked');
        assert(spiedShellCalls.showItemInFolder.includes(path.resolve(res.filePath)), 'Path must match');
      });

      await test('F2: open-artifact on already exported artifact cleanly invokes shell.openPath', async () => {
        const res = await win.webContents.executeJavaScript(`
          window.sidebarAPI.openArtifact({ artifactId: '${unexportedId}' })
        `);

        assert(res.success, 'openArtifact must succeed');
        assert(spiedShellCalls.openPath.length > 0, 'shell.openPath must be invoked');
      });

      await test('F3: locate-artifact & open-artifact handle non-existent artifacts gracefully without throwing', async () => {
        const resLocate = await win.webContents.executeJavaScript(`
          window.sidebarAPI.locateArtifact({ artifactId: 'non_existent_id_9999' })
        `);
        assert(!resLocate.success, 'locateArtifact must return success: false for non-existent artifact');

        const resOpen = await win.webContents.executeJavaScript(`
          window.sidebarAPI.openArtifact({ artifactId: 'non_existent_id_9999' })
        `);
        assert(!resOpen.success, 'openArtifact must return success: false for non-existent artifact');
      });

      await test('F4: Malformed payloads to shell APIs return gracefully', async () => {
        const res1 = await win.webContents.executeJavaScript(`window.sidebarAPI.showItemInFolder(null)`);
        assert(!res1.success, 'showItemInFolder(null) must return success: false');

        const res2 = await win.webContents.executeJavaScript(`window.sidebarAPI.openPath('')`);
        assert(!res2.success, 'openPath("") must return success: false');
      });
    })();

    // =========================================================================
    // SUITE G: 400px Causal Breadcrumbs & SSoT Synchronization
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite G: 400px Causal Breadcrumbs & SSoT Synchronization ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      const win = await createHeadlessSidebar(400, 800);

      await test('G1: Breadcrumbs render all 5 stages in canonical order (现象 → 疑问 → 假说 → 证据 → 突破)', async () => {
        const stages = await win.webContents.executeJavaScript(`
          (() => {
            const nodes = Array.from(document.querySelectorAll('#causalBreadcrumbs .crumb-item.phase-node'));
            return nodes.map(n => n.innerText.trim());
          })()
        `);

        assertEqual(stages, ['现象', '疑问', '假说', '证据', '突破'], 'Stages must match 5 canonical levels');
      });

      await test('G2: Geometry containment: scrollWidth <= clientWidth + 5 across 400px, 380px, 420px', async () => {
        const widthsToTest = [400, 380, 420];
        for (const w of widthsToTest) {
          win.setSize(w, 800);
          await new Promise(r => setTimeout(r, 60));

          const overflowCheck = await win.webContents.executeJavaScript(`
            (() => {
              const el = document.getElementById('causalBreadcrumbs');
              return {
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                hasOverflow: el.scrollWidth > el.clientWidth + 5
              };
            })()
          `);

          assert(
            !overflowCheck.hasOverflow,
            `Breadcrumbs overflow detected at width ${w}px: scrollWidth=${overflowCheck.scrollWidth}, clientWidth=${overflowCheck.clientWidth}`
          );
        }
      });

      await test('G3: SSoT state updates synchronize active stage and ΔQt clarity score without NaN/undefined', async () => {
        const testStates = [
          { phase: 0, deltaQt: 20, name: '现象' },
          { phase: 1, deltaQt: 45, name: '疑问' },
          { phase: 2, deltaQt: 68, name: '假说' },
          { phase: 3, deltaQt: 85, name: '证据' },
          { phase: 4, deltaQt: 100, name: '突破' }
        ];

        for (const s of testStates) {
          // Broadcast state-updated to renderer
          win.webContents.send('state-updated', {
            causalPhase: s.phase,
            causalPhaseName: s.name,
            deltaQt: s.deltaQt
          });
          await new Promise(r => setTimeout(r, 60));

          const check = await win.webContents.executeJavaScript(`
            (() => {
              const activeNode = document.querySelector('#causalBreadcrumbs .crumb-item.active, #causalBreadcrumbs .crumb-item.current-phase');
              const clarityBadge = document.querySelector('#causalBreadcrumbs .clarity-badge, #causalBreadcrumbs .delta-qt');
              return {
                activeText: activeNode ? activeNode.innerText.trim() : null,
                clarityText: clarityBadge ? clarityBadge.innerText.trim() : null
              };
            })()
          `);

          assertEqual(check.activeText, s.name, `Active breadcrumb stage must be ${s.name}`);
          assertEqual(check.clarityText, `ΔQt: ${s.deltaQt}%`, `Clarity score badge must be ΔQt: ${s.deltaQt}%`);
          assert(!check.clarityText.includes('NaN'), 'Clarity badge must not contain NaN');
          assert(!check.clarityText.includes('undefined'), 'Clarity badge must not contain undefined');
        }
      });

      await test('G4: Auxiliary review view trigger button [全景复盘 ↗] invokes toggle-war-room IPC', async () => {
        warRoomToggleCount = 0;
        const clicked = await win.webContents.executeJavaScript(`
          (() => {
            const btn = document.getElementById('btnToggleWarRoom');
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          })()
        `);

        assert(clicked, 'Button #btnToggleWarRoom must exist');
        await new Promise(r => setTimeout(r, 60));
        assert(warRoomToggleCount > 0, 'Clicking [全景复盘 ↗] must send toggle-war-room IPC');
      });
    })();

    // =========================================================================
    // SUITE H: Zero Console Errors & Global Process Invariant Check
    // =========================================================================
    console.log(`\n${C.cyan}${C.bold}=== Suite H: Zero Console Errors & Process Invariants ===${C.reset}`);
    stats.suitesRun++;
    await (async () => {
      await test('H1: Zero console errors (level >= 3) across entire adversarial stress test run', async () => {
        if (capturedConsoleErrors.length > 0) {
          const formatted = capturedConsoleErrors.map(e => `[${e.window}] L${e.line}: ${e.message}`).join('\n');
          throw new Error(`Encountered ${capturedConsoleErrors.length} console error(s) (level >= 3):\n${formatted}`);
        }
        assertEqual(capturedConsoleErrors.length, 0, 'capturedConsoleErrors must be 0');
      });

      await test('H2: Zero uncaught exceptions or unhandled rejections across process lifecycle', async () => {
        if (uncaughtExceptions.length > 0) {
          const formatted = uncaughtExceptions.map(e => e.stack || e.message || String(e)).join('\n');
          throw new Error(`Encountered ${uncaughtExceptions.length} uncaught exception(s):\n${formatted}`);
        }
        assertEqual(uncaughtExceptions.length, 0, 'uncaughtExceptions must be 0');
      });
    })();

  } catch (err) {
    console.error(`\n${C.red}FATAL ADVERSARIAL RUNNER EXCEPTION:${C.reset}`, err);
    stats.failed++;
    stats.failures.push({ name: 'Adversarial Runner Global', error: err.message, stack: err.stack });
  } finally {
    stats.endTime = performance.now();
    const durationSec = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

    console.log(`\n${C.magenta}${C.bold}================================================================${C.reset}`);
    console.log(`${C.magenta}${C.bold}              ADVERSARIAL STRESS TEST SUMMARY                   ${C.reset}`);
    console.log(`${C.magenta}${C.bold}================================================================${C.reset}`);
    console.log(`Total Suites Run : ${stats.suitesRun}`);
    console.log(`Total Tests Run  : ${stats.totalTests}`);
    console.log(`Passed Tests     : ${C.green}${stats.passed}${C.reset}`);
    console.log(`Failed Tests     : ${stats.failed > 0 ? C.red + stats.failed + C.reset : stats.failed}`);
    console.log(`Console Errors   : ${capturedConsoleErrors.length === 0 ? C.green + '0 (Zero Console Errors)' + C.reset : C.red + capturedConsoleErrors.length + C.reset}`);
    console.log(`Uncaught Errors  : ${uncaughtExceptions.length === 0 ? C.green + '0 (Clean)' + C.reset : C.red + uncaughtExceptions.length + C.reset}`);
    console.log(`Execution Time   : ${durationSec}s`);
    console.log(`${C.magenta}${C.bold}================================================================${C.reset}`);

    if (stats.failures.length > 0) {
      console.log(`\n${C.red}${C.bold}FAILURES (${stats.failures.length}):${C.reset}`);
      stats.failures.forEach((f, idx) => {
        console.log(`  ${idx + 1}) ${f.name}:`);
        console.log(`     ${C.red}${f.error}${C.reset}`);
      });
    }

    if (sidebarWin && !sidebarWin.isDestroyed()) {
      sidebarWin.destroy();
      sidebarWin = null;
    }

    const exitCode = stats.failed > 0 ? 1 : 0;
    if (exitCode === 0) {
      console.log(`\n${C.green}${C.bold}✓ ALL ADVERSARIAL CHALLENGE STRESS TESTS PASSED CLEANLY.${C.reset}\n`);
    } else {
      console.log(`\n${C.red}${C.bold}✗ ADVERSARIAL STRESS TEST FAILED WITH ${stats.failed} FAILING TESTS.${C.reset}\n`);
    }

    app.quit();
    process.exit(exitCode);
  }
});
