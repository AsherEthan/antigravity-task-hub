// scripts/verify-challenger-m3-r3.js
/**
 * Empirical Adversarial Challenger Suite for Milestone M3 (Refinement Round 3)
 * Artifacts Workspace Closed-Loop Stress Test & Invariant Verification
 * 
 * Execution:
 *   npx electron scripts/verify-challenger-m3-r3.js
 * 
 * Coverage:
 * 1. locate-artifact & open-artifact edge cases (invalid IDs, missing paths, special chars, traversal)
 * 2. Un-exported artifact auto-export fallback invariant (zero throws, disk creation, shell call)
 * 3. Step toggling disk sync & Markdown consistency invariant:
 *    - YAML frontmatter progress percentage & completed count
 *    - Status transition (active -> in-progress -> completed -> in-progress -> active)
 *    - GitHub-style checkboxes (- [ ] vs - [x]) matching 1:1 with store state
 *    - Out-of-order toggles & untoggles
 *    - 100-iteration rapid sequential random fuzzing
 * 4. Concurrent & rapid invocations under Electron Headless:
 *    - 50 concurrent locate & open requests
 *    - 50 concurrent toggleArtifactStep requests
 *    - Asserting zero crashes, zero uncaught exceptions, zero console errors (level >= 3)
 * 5. UI & Preload bridge contract verification
 */

const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
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
  dim: '\x1b[2m'
};

// Spies and Trackers
const shellCalls = {
  showItemInFolder: [],
  openPath: []
};
const capturedConsoleErrors = [];
const uncaughtExceptions = [];

shell.showItemInFolder = (targetPath) => {
  shellCalls.showItemInFolder.push(targetPath);
  return true;
};
shell.openPath = async (targetPath) => {
  shellCalls.openPath.push(targetPath);
  return '';
};

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

// Temporary artifacts directory for tests
const testArtifactsDir = path.join(__dirname, '..', 'artifacts');
if (!fs.existsSync(testArtifactsDir)) {
  fs.mkdirSync(testArtifactsDir, { recursive: true });
}

// Services
const store = require('../services/store');
const artifactExporter = require('../services/artifact-exporter');
const slashEngine = require('../services/slash-engine');

app.whenReady().then(async () => {
  console.log('\n================================================================');
  console.log('  CHALLENGER M3-R3: Artifacts Workspace Closed-Loop Stress Suite ');
  console.log('================================================================');
  console.log(`Runtime: Node ${process.versions.node}, Electron ${process.versions.electron}`);

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

  // Setup IPC Handlers matching main.js
  ipcMain.removeHandler('locate-artifact');
  ipcMain.removeHandler('open-artifact');
  ipcMain.removeHandler('toggle-artifact-step');
  ipcMain.removeHandler('export-artifact-file');
  ipcMain.removeHandler('get-artifacts');
  ipcMain.removeHandler('show-item-in-folder');
  ipcMain.removeHandler('open-path');

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
          const res = await artifactExporter.exportArtifactFile({ artifact: art });
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
          const res = await artifactExporter.exportArtifactFile({ artifact: art });
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

  ipcMain.handle('toggle-artifact-step', async (event, payload) => {
    if (store && typeof store.toggleArtifactStep === 'function') {
      return store.toggleArtifactStep(payload);
    }
    return null;
  });

  ipcMain.handle('export-artifact-file', async (event, payload) => {
    return await artifactExporter.exportArtifactFile(payload);
  });

  ipcMain.handle('get-artifacts', async () => {
    return store.getArtifacts();
  });

  ipcMain.handle('show-item-in-folder', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) return { success: false, error: 'Path not found' };
    shell.showItemInFolder(path.resolve(targetPath));
    return { success: true };
  });

  ipcMain.handle('open-path', async (event, targetPath) => {
    if (!targetPath || !fs.existsSync(targetPath)) return { success: false, error: 'Path not found' };
    const err = await shell.openPath(path.resolve(targetPath));
    return { success: !err, error: err || null };
  });

  const sidebarHtmlPath = path.join(__dirname, '..', 'renderer', 'sidebar.html');
  await testWin.loadFile(sidebarHtmlPath);

  // =========================================================================
  // Section 1: Edge Cases for locate-artifact and open-artifact
  // =========================================================================
  console.log(`\n${C.bold}=== Section 1: locate-artifact & open-artifact Edge Cases ===${C.reset}`);

  await test('1.1: locate-artifact with null, undefined, empty object, or missing payload', async () => {
    const res1 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.locateArtifact()`);
    assert(res1 && res1.success === false, 'Null payload must return success: false');
    assert(res1.error === 'File does not exist on disk', 'Should report file does not exist');

    const res2 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.locateArtifact({})`);
    assert(res2 && res2.success === false, 'Empty payload must return success: false');

    const res3 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.locateArtifact(null)`);
    assert(res3 && res3.success === false, 'Literal null must return success: false');
  });

  await test('1.2: open-artifact with null, undefined, empty object, or missing payload', async () => {
    const res1 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.openArtifact()`);
    assert(res1 && res1.success === false, 'Null payload must return success: false');
    assert(res1.error === 'File does not exist on disk', 'Should report file does not exist');

    const res2 = await testWin.webContents.executeJavaScript(`window.sidebarAPI.openArtifact({})`);
    assert(res2 && res2.success === false, 'Empty payload must return success: false');
  });

  await test('1.3: locate-artifact and open-artifact with non-existent artifact IDs', async () => {
    const invalidIds = ['art_fake_999999', '', '   ', 12345, null, undefined, '..\\..\\malicious'];
    for (const badId of invalidIds) {
      const resLocate = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.locateArtifact({ artifactId: ${JSON.stringify(badId)} })
      `);
      assert(resLocate && resLocate.success === false, `locateArtifact with id ${JSON.stringify(badId)} must fail gracefully`);

      const resOpen = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.openArtifact({ artifactId: ${JSON.stringify(badId)} })
      `);
      assert(resOpen && resOpen.success === false, `openArtifact with id ${JSON.stringify(badId)} must fail gracefully`);
    }
  });

  await test('1.4: locate-artifact and open-artifact with non-existent file path', async () => {
    const fakePaths = [
      'artifacts/non_existent_file_404.md',
      'Z:\\totally\\bogus\\path\\does_not_exist.md',
      '../../artifacts/ghost.md',
      '/tmp/does-not-exist.md'
    ];
    for (const fakePath of fakePaths) {
      const resLocate = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.locateArtifact({ filePath: ${JSON.stringify(fakePath)} })
      `);
      assert(resLocate && resLocate.success === false, `locateArtifact with missing file must fail`);

      const resOpen = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.openArtifact({ filePath: ${JSON.stringify(fakePath)} })
      `);
      assert(resOpen && resOpen.success === false, `openArtifact with missing file must fail`);
    }
  });

  await test('1.5: Special path characters (Chinese, spaces, symbols, emoji, path traversal)', async () => {
    const specialFileName = `artifact-特殊字符 测试 计划_#1 (✨🚀) [v2.0].md`;
    const specialFilePath = path.join(testArtifactsDir, specialFileName);
    fs.writeFileSync(specialFilePath, '# 特殊字符测试文件\n- [ ] 步骤 1\n', 'utf8');

    try {
      shellCalls.showItemInFolder = [];
      shellCalls.openPath = [];

      // Test locate
      const resLocate = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.locateArtifact({ filePath: ${JSON.stringify(specialFilePath)} })
      `);
      assert(resLocate && resLocate.success === true, 'locateArtifact must succeed with special path chars');
      assertEqual(path.resolve(resLocate.filePath), path.resolve(specialFilePath), 'Normalized path must match exactly');
      assert(shellCalls.showItemInFolder.length > 0, 'shell.showItemInFolder must be invoked');
      assertEqual(path.resolve(shellCalls.showItemInFolder[shellCalls.showItemInFolder.length - 1]), path.resolve(specialFilePath));

      // Test open
      const resOpen = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.openArtifact({ filePath: ${JSON.stringify(specialFilePath)} })
      `);
      assert(resOpen && resOpen.success === true, 'openArtifact must succeed with special path chars');
      assertEqual(path.resolve(resOpen.filePath), path.resolve(specialFilePath), 'Normalized path must match exactly');
      assert(shellCalls.openPath.length > 0, 'shell.openPath must be invoked');
      assertEqual(path.resolve(shellCalls.openPath[shellCalls.openPath.length - 1]), path.resolve(specialFilePath));
    } finally {
      try { fs.unlinkSync(specialFilePath); } catch (e) {}
    }
  });

  await test('1.6: Un-exported artifact auto-export fallback without throwing', async () => {
    const unexportedArt = {
      id: 'art_stress_unexported_' + Date.now(),
      type: 'shred',
      command: '/shred',
      title: '现场自动落盘容错测试',
      query: '测试无 localFilePath 时自动落盘并定位',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 2, completedSteps: 0, percent: 0 },
      steps: [
        { id: 'step_u1', title: '打开终端运行测试', actionVerb: '打开', estMinutes: 1, completed: false },
        { id: 'step_u2', title: '对比日志差异', actionVerb: '对比', estMinutes: 2, completed: false }
      ],
      localFilePath: null
    };

    store.addArtifact(unexportedArt);

    shellCalls.showItemInFolder = [];
    shellCalls.openPath = [];

    // Trigger locate on un-exported artifact
    const resLocate = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.locateArtifact({ artifactId: '${unexportedArt.id}' })
    `);
    assert(resLocate.success, resLocate.error || 'Auto-export fallback on locate must succeed');
    assert(resLocate.filePath && fs.existsSync(resLocate.filePath), 'File must be auto-created on disk');
    assert(shellCalls.showItemInFolder.length > 0, 'shell.showItemInFolder must be invoked with auto-exported path');

    // Trigger open on un-exported artifact
    const unexportedArt2 = {
      id: 'art_stress_unexported_open_' + Date.now(),
      type: 'solve',
      command: '/solve',
      title: '现场自动落盘并打开测试',
      query: '测试 openArtifact 触发自动落盘',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
      steps: [
        { id: 'step_uo1', title: '查看卡点因果', actionVerb: '查看', estMinutes: 1, completed: false }
      ],
      localFilePath: null
    };

    store.addArtifact(unexportedArt2);

    const resOpen = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.openArtifact({ artifactId: '${unexportedArt2.id}' })
    `);
    assert(resOpen.success, resOpen.error || 'Auto-export fallback on open must succeed');
    assert(resOpen.filePath && fs.existsSync(resOpen.filePath), 'File must be auto-created on disk for open');
    assert(shellCalls.openPath.length > 0, 'shell.openPath must be invoked with auto-exported path');

    // Cleanup
    try { fs.unlinkSync(resLocate.filePath); } catch (e) {}
    try { fs.unlinkSync(resOpen.filePath); } catch (e) {}
  });

  // =========================================================================
  // Section 2: Step Toggling Disk Sync & Markdown Consistency Invariant
  // =========================================================================
  console.log(`\n${C.bold}=== Section 2: Step Toggling Disk Sync & Markdown Invariants ===${C.reset}`);

  const syncTestArtifact = {
    id: 'art_disk_sync_stress_' + Date.now(),
    type: 'plan',
    command: '/plan',
    title: '全自动双向落盘同步严苛压测',
    query: '检验步骤打勾与本地 Markdown YAML 及复选框的一致性',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'active',
    progress: { totalSteps: 5, completedSteps: 0, percent: 0 },
    steps: [
      { id: 's1', title: '打开数据库连接池配置文件', actionVerb: '打开', estMinutes: 1, completed: false },
      { id: 's2', title: '注释掉异常连接重试逻辑', actionVerb: '注释', estMinutes: 2, completed: false },
      { id: 's3', title: '打印连接池当前活动句柄数', actionVerb: '打印', estMinutes: 1, completed: false },
      { id: 's4', title: '修改最大连接数上限至 50', actionVerb: '修改', estMinutes: 2, completed: false },
      { id: 's5', title: '运行集成压测脚本验证吞吐', actionVerb: '运行', estMinutes: 2, completed: false }
    ],
    localFilePath: null
  };

  store.addArtifact(syncTestArtifact);

  // Initial export to disk
  const exportResult = await artifactExporter.exportArtifactFile({ artifact: syncTestArtifact });
  const diskPath = exportResult.filePath;
  syncTestArtifact.localFilePath = diskPath;

  await test('2.1: Initial export file matches 0% progress and all unchecked - [ ] checkboxes', async () => {
    assert(fs.existsSync(diskPath), 'Exported file must exist on disk');
    const content = fs.readFileSync(diskPath, 'utf8');
    assert(content.includes('progress: 0% (0/5 completed)'), 'Initial frontmatter must be 0% (0/5 completed)');
    assert(content.includes('status: active'), 'Initial status must be active');
    for (let i = 1; i <= 5; i++) {
      assert(content.includes(`- [ ] **步骤 ${i} ·`), `Step ${i} must be unchecked - [ ]`);
    }
    assert(!content.includes('- [x]'), 'No steps should be checked initially');
  });

  await test('2.2: Forward sequential toggling maintains exact progress %, count, and - [x] markers', async () => {
    const expectedProg = [
      { step: 's1', idx: 1, count: 1, percent: 20, status: 'in-progress' },
      { step: 's2', idx: 2, count: 2, percent: 40, status: 'in-progress' },
      { step: 's3', idx: 3, count: 3, percent: 60, status: 'in-progress' },
      { step: 's4', idx: 4, count: 4, percent: 80, status: 'in-progress' },
      { step: 's5', idx: 5, count: 5, percent: 100, status: 'completed' }
    ];

    for (const exp of expectedProg) {
      const payload = {
        artifactId: syncTestArtifact.id,
        stepId: exp.step,
        completed: true
      };

      const res = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.toggleArtifactStep(${JSON.stringify(payload)})
      `);
      assert(res !== null, `toggleArtifactStep for ${exp.step} must return updated artifact`);
      assertEqual(res.progress.completedSteps, exp.count, `Store completedSteps should be ${exp.count}`);
      assertEqual(res.progress.percent, exp.percent, `Store percent should be ${exp.percent}`);
      assertEqual(res.status, exp.status, `Store status should be ${exp.status}`);

      // Verify Disk File
      const diskContent = fs.readFileSync(diskPath, 'utf8');
      assert(diskContent.includes(`progress: ${exp.percent}% (${exp.count}/5 completed)`),
        `Disk frontmatter must reflect ${exp.percent}% (${exp.count}/5 completed)`);
      assert(diskContent.includes(`status: ${exp.status}`), `Disk frontmatter status must be ${exp.status}`);

      // Verify checkboxes on disk
      for (let i = 1; i <= 5; i++) {
        if (i <= exp.idx) {
          assert(diskContent.includes(`- [x] **步骤 ${i} ·`), `Step ${i} on disk must be checked: - [x]`);
        } else {
          assert(diskContent.includes(`- [ ] **步骤 ${i} ·`), `Step ${i} on disk must be unchecked: - [ ]`);
        }
      }
    }
  });

  await test('2.3: Out-of-order unchecking & re-checking maintains exact disk consistency', async () => {
    // Untoggle step 3
    await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: '${syncTestArtifact.id}', stepId: 's3', completed: false })
    `);
    let content = fs.readFileSync(diskPath, 'utf8');
    assert(content.includes('progress: 80% (4/5 completed)'), 'Untoggling s3 must reduce progress to 80% (4/5 completed)');
    assert(content.includes('status: in-progress'), 'Status must revert to in-progress');
    assert(content.includes('- [ ] **步骤 3 · 打印**'), 'Step 3 must be - [ ]');
    assert(content.includes('- [x] **步骤 1 · 打开**'), 'Step 1 must still be - [x]');
    assert(content.includes('- [x] **步骤 2 · 注释**'), 'Step 2 must still be - [x]');
    assert(content.includes('- [x] **步骤 4 · 修改**'), 'Step 4 must still be - [x]');
    assert(content.includes('- [x] **步骤 5 · 运行**'), 'Step 5 must still be - [x]');

    // Untoggle step 1 and step 5
    await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: '${syncTestArtifact.id}', stepId: 's1', completed: false })
    `);
    await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: '${syncTestArtifact.id}', stepId: 's5', completed: false })
    `);
    content = fs.readFileSync(diskPath, 'utf8');
    assert(content.includes('progress: 40% (2/5 completed)'), 'Progress must reflect 40% (2/5 completed)');
    assert(content.includes('- [ ] **步骤 1 · 打开**'), 'Step 1 must be - [ ]');
    assert(content.includes('- [x] **步骤 2 · 注释**'), 'Step 2 must be - [x]');
    assert(content.includes('- [ ] **步骤 3 · 打印**'), 'Step 3 must be - [ ]');
    assert(content.includes('- [x] **步骤 4 · 修改**'), 'Step 4 must be - [x]');
    assert(content.includes('- [ ] **步骤 5 · 运行**'), 'Step 5 must be - [ ]');

    // Untoggle all remaining (s2, s4)
    await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: '${syncTestArtifact.id}', stepId: 's2', completed: false })
    `);
    await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: '${syncTestArtifact.id}', stepId: 's4', completed: false })
    `);
    content = fs.readFileSync(diskPath, 'utf8');
    assert(content.includes('progress: 0% (0/5 completed)'), 'Progress must revert to 0% (0/5 completed)');
    assert(content.includes('status: active'), 'Status must revert to active');
    for (let i = 1; i <= 5; i++) {
      assert(content.includes(`- [ ] **步骤 ${i} ·`), `Step ${i} must be - [ ]`);
    }
  });

  await test('2.4: 100-iteration rapid sequential random fuzzing maintains perfect disk invariants', async () => {
    const stepIds = ['s1', 's2', 's3', 's4', 's5'];
    const currentStates = { s1: false, s2: false, s3: false, s4: false, s5: false };

    for (let iter = 0; iter < 100; iter++) {
      const randomStep = stepIds[Math.floor(Math.random() * stepIds.length)];
      const nextVal = !currentStates[randomStep];
      currentStates[randomStep] = nextVal;

      const res = await testWin.webContents.executeJavaScript(`
        window.sidebarAPI.toggleArtifactStep({
          artifactId: '${syncTestArtifact.id}',
          stepId: '${randomStep}',
          completed: ${nextVal}
        })
      `);

      const expectedCompleted = Object.values(currentStates).filter(Boolean).length;
      const expectedPercent = Math.round((expectedCompleted / 5) * 100);
      const expectedStatus = expectedCompleted === 5 ? 'completed' : (expectedCompleted > 0 ? 'in-progress' : 'active');

      assertEqual(res.progress.completedSteps, expectedCompleted, `Iteration ${iter}: completedSteps mismatch`);
      assertEqual(res.progress.percent, expectedPercent, `Iteration ${iter}: percent mismatch`);
      assertEqual(res.status, expectedStatus, `Iteration ${iter}: status mismatch`);

      // Spot check disk file every 10 iterations and on final iteration
      if (iter % 10 === 0 || iter === 99) {
        const diskContent = fs.readFileSync(diskPath, 'utf8');
        assert(diskContent.includes(`progress: ${expectedPercent}% (${expectedCompleted}/5 completed)`),
          `Disk mismatch on iter ${iter}: expected ${expectedPercent}% (${expectedCompleted}/5 completed)`);
        assert(diskContent.includes(`status: ${expectedStatus}`), `Disk status mismatch on iter ${iter}`);

        stepIds.forEach((sid, idx) => {
          const mark = currentStates[sid] ? '- [x]' : '- [ ]';
          assert(diskContent.includes(`${mark} **步骤 ${idx + 1} ·`),
            `Checkbox mismatch on iter ${iter} for step ${sid}`);
        });
      }
    }
  });

  await test('2.5: Step toggling edge cases (invalid stepId, invalid artifactId, 0 steps)', async () => {
    // Non-existent stepId
    const resBadStep = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: '${syncTestArtifact.id}', stepId: 'ghost_step', completed: true })
    `);
    assert(resBadStep !== null, 'Bad stepId must not crash and return artifact');

    // Non-existent artifactId
    const resBadArt = await testWin.webContents.executeJavaScript(`
      window.sidebarAPI.toggleArtifactStep({ artifactId: 'ghost_artifact', stepId: 's1', completed: true })
    `);
    assert(resBadArt === null || resBadArt.success !== false, 'Bad artifactId must return null/safe object');

    // 0 steps artifact
    const zeroStepArt = {
      id: 'art_zero_step_' + Date.now(),
      type: 'shred',
      command: '/shred',
      title: '零步骤卡片',
      query: '边界测试',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 0, completedSteps: 0, percent: 0 },
      steps: [],
      localFilePath: null
    };
    store.addArtifact(zeroStepArt);
    const zeroExport = await artifactExporter.exportArtifactFile({ artifact: zeroStepArt });
    const zeroDiskContent = fs.readFileSync(zeroExport.filePath, 'utf8');
    assert(zeroDiskContent.includes('progress: 0% (0/0 completed)'), 'Zero steps must not produce NaN or error');
    assert(!zeroDiskContent.includes('NaN'), 'No NaN in zero steps export');

    try { fs.unlinkSync(zeroExport.filePath); } catch (e) {}
  });

  // Cleanup diskPath
  try { fs.unlinkSync(diskPath); } catch (e) {}

  // =========================================================================
  // Section 3: Concurrent & Rapid Invocations Under Electron Headless
  // =========================================================================
  console.log(`\n${C.bold}=== Section 3: Concurrent & Rapid Invocations Under Electron Headless ===${C.reset}`);

  await test('3.1: 50 concurrent rapid locate-artifact and open-artifact requests', async () => {
    // Create 5 real test files
    const testFiles = [];
    for (let i = 0; i < 5; i++) {
      const fp = path.join(testArtifactsDir, `concurrent-test-file-${i}-${Date.now()}.md`);
      fs.writeFileSync(fp, `# Concurrent File ${i}\n`, 'utf8');
      testFiles.push(fp);
    }

    try {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const file = testFiles[i % testFiles.length];
        const isLocate = i % 2 === 0;
        promises.push(
          testWin.webContents.executeJavaScript(`
            (async () => {
              if (${isLocate}) {
                return await window.sidebarAPI.locateArtifact({ filePath: ${JSON.stringify(file)} });
              } else {
                return await window.sidebarAPI.openArtifact({ filePath: ${JSON.stringify(file)} });
              }
            })()
          `)
        );
      }

      const results = await Promise.all(promises);
      assertEqual(results.length, 50, 'All 50 promises must resolve');
      for (const res of results) {
        assert(res && res.success === true, 'Each concurrent call must succeed');
      }
    } finally {
      testFiles.forEach(f => {
        try { fs.unlinkSync(f); } catch (e) {}
      });
    }
  });

  await test('3.2: 50 concurrent rapid step toggles on store', async () => {
    const concurrentArt = {
      id: 'art_concurrent_toggles_' + Date.now(),
      type: 'plan',
      command: '/plan',
      title: '并发打勾压测',
      query: '并发请求完整性',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 10, completedSteps: 0, percent: 0 },
      steps: Array.from({ length: 10 }, (_, i) => ({
        id: `c_step_${i}`,
        title: `并发动作 ${i + 1}`,
        actionVerb: '执行',
        estMinutes: 1,
        completed: false
      })),
      localFilePath: null
    };

    store.addArtifact(concurrentArt);
    const exp = await artifactExporter.exportArtifactFile({ artifact: concurrentArt });
    concurrentArt.localFilePath = exp.filePath;

    const promises = [];
    for (let i = 0; i < 50; i++) {
      const stepIdx = i % 10;
      const toggleVal = i % 2 === 0;
      promises.push(
        testWin.webContents.executeJavaScript(`
          window.sidebarAPI.toggleArtifactStep({
            artifactId: '${concurrentArt.id}',
            stepId: 'c_step_${stepIdx}',
            completed: ${toggleVal}
          })
        `)
      );
    }

    const results = await Promise.all(promises);
    assertEqual(results.length, 50, 'All 50 concurrent toggles must resolve without hang');
    for (const res of results) {
      assert(res !== null, 'Returned artifact must not be null');
      assert(typeof res.progress.percent === 'number', 'Percent must be valid number');
      assert(res.progress.percent >= 0 && res.progress.percent <= 100, 'Percent in [0, 100]');
    }

    // Verify disk file is intact and not corrupted
    assert(fs.existsSync(exp.filePath), 'Disk file must exist');
    const diskContent = fs.readFileSync(exp.filePath, 'utf8');
    assert(diskContent.startsWith('---'), 'Markdown must start with frontmatter');
    assert(diskContent.includes(`id: ${concurrentArt.id}`), 'Must include artifact ID');

    try { fs.unlinkSync(exp.filePath); } catch (e) {}
  });

  // =========================================================================
  // Section 4: Renderer UI & CSS Contract Verification
  // =========================================================================
  console.log(`\n${C.bold}=== Section 4: Renderer UI Elements & CSS Contract Verification ===${C.reset}`);

  await test('4.1: Sidebar UI includes btnLocateFile and btnOpenFile with active card event bindings', async () => {
    const uiInspection = await testWin.webContents.executeJavaScript(`
      (() => {
        // Render dummy artifact to test DOM buttons
        const dummyArt = {
          id: 'art_ui_test',
          type: 'plan',
          command: '/plan',
          title: 'UI 按钮测试卡片',
          query: '测试定位与打开按钮',
          status: 'active',
          progress: { totalSteps: 2, completedSteps: 0, percent: 0 },
          steps: [
            { id: 's1', title: '步骤1', actionVerb: '打开', estMinutes: 1, completed: false },
            { id: 's2', title: '步骤2', actionVerb: '运行', estMinutes: 1, completed: false }
          ]
        };

        if (window.__sidebarState && typeof renderActiveArtifact === 'function') {
          renderActiveArtifact(dummyArt);
        }

        const locateBtn = document.querySelector('#btnLocateFile') || document.querySelector('#btnLocateArtifact');
        const openBtn = document.querySelector('#btnOpenFile') || document.querySelector('#btnOpenArtifact');

        return {
          hasLocateBtn: Boolean(locateBtn),
          hasOpenBtn: Boolean(openBtn),
          locateClasses: locateBtn ? locateBtn.className : '',
          openClasses: openBtn ? openBtn.className : ''
        };
      })()
    `);

    assert(uiInspection.hasLocateBtn, 'Card footer must contain #btnLocateFile or #btnLocateArtifact');
    assert(uiInspection.hasOpenBtn, 'Card footer must contain #btnOpenFile or #btnOpenArtifact');
    assert(uiInspection.locateClasses.includes('btn-locate'), 'Locate button must have btn-locate class');
    assert(uiInspection.openClasses.includes('btn-open'), 'Open button must have btn-open class');
  });

  await test('4.2: Sidebar CSS contains styling for .btn-locate and .btn-open', async () => {
    const cssPath = path.join(__dirname, '..', 'renderer', 'sidebar.css');
    assert(fs.existsSync(cssPath), 'sidebar.css must exist');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert(cssContent.includes('.btn-locate'), 'sidebar.css must contain rules for .btn-locate');
    assert(cssContent.includes('.btn-open'), 'sidebar.css must contain rules for .btn-open');
    assert(cssContent.includes('.btn-locate:hover') || cssContent.includes('.footer-btn:hover'),
      'sidebar.css must contain hover state styling');
  });

  // =========================================================================
  // Section 5: Stability, Uncaught Exceptions & Console Errors Invariant
  // =========================================================================
  console.log(`\n${C.bold}=== Section 5: Zero Console Errors & Zero Uncaught Exceptions Invariant ===${C.reset}`);

  await test('5.1: Zero uncaught exceptions detected across entire challenge suite', async () => {
    assertEqual(uncaughtExceptions.length, 0, `Detected uncaught exceptions: ${JSON.stringify(uncaughtExceptions)}`);
  });

  await test('5.2: Zero console errors (level >= 3) detected across all renderers', async () => {
    assertEqual(capturedConsoleErrors.length, 0, `Captured console errors: ${JSON.stringify(capturedConsoleErrors)}`);
  });

  // Final Summary
  console.log('\n================================================================');
  console.log('                 CHALLENGE SUITE EXECUTION SUMMARY               ');
  console.log('================================================================');
  console.log(`Total Tests Run : ${totalTests}`);
  console.log(`Passed Tests    : ${C.green}${passedTests}${C.reset}`);
  console.log(`Failed Tests    : ${failedTests > 0 ? C.red + failedTests + C.reset : C.green + '0' + C.reset}`);
  console.log(`Console Errors  : ${capturedConsoleErrors.length === 0 ? C.green + '0 (Zero Console Errors)' + C.reset : C.red + capturedConsoleErrors.length + C.reset}`);
  console.log(`Uncaught Errors : ${uncaughtExceptions.length === 0 ? C.green + '0' + C.reset : C.red + uncaughtExceptions.length + C.reset}`);
  console.log('================================================================\n');

  if (testWin && !testWin.isDestroyed()) {
    testWin.destroy();
  }

  if (failedTests === 0 && capturedConsoleErrors.length === 0 && uncaughtExceptions.length === 0) {
    console.log(`${C.green}✓ ALL ADVERSARIAL STRESS TESTS PASSED WITH ZERO CONSOLE ERRORS.${C.reset}\n`);
    app.exit(0);
  } else {
    console.error(`${C.red}✗ ADVERSARIAL STRESS TEST FAILED.${C.reset}\n`);
    app.exit(1);
  }
});
