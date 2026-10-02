// scripts/verify-r3-adversarial.js
/**
 * Adversarial Stress & Edge-Case Verification for Milestone M3 (R3)
 * Artifacts Workspace Closed-Loop
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const store = require('../services/store');
const artifactExporter = require('../services/artifact-exporter');

console.log('=== STARTING R3 ADVERSARIAL STRESS TEST ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runAll() {
  // Test 1: Store toggleArtifactStep robustness with null / undefined / empty
  test('A1: store.toggleArtifactStep with null/undefined payload', () => {
    assert.strictEqual(store.toggleArtifactStep(null), null);
    assert.strictEqual(store.toggleArtifactStep(undefined), null);
    assert.strictEqual(store.toggleArtifactStep({}), null);
    assert.strictEqual(store.toggleArtifactStep({ artifactId: 'non_existent_id' }), null);
  });

  // Test 2: Unexported artifact step toggling does not fail and updates in-memory state
  test('A2: Unexported artifact toggling updates memory and does not crash on missing disk file', () => {
    const unexported = {
      id: 'art_adv_unexported_' + Date.now(),
      type: 'shred',
      command: '/shred',
      title: '未导出产出物测试',
      status: 'active',
      progress: { totalSteps: 2, completedSteps: 0, percent: 0 },
      steps: [
        { id: 's1', title: '微动作 1', actionVerb: '打开', estMinutes: 1, completed: false },
        { id: 's2', title: '微动作 2', actionVerb: '记录', estMinutes: 2, completed: false }
      ]
    };
    store.addArtifact(unexported);

    const updated1 = store.toggleArtifactStep(unexported.id, 's1', true);
    assert.strictEqual(updated1.progress.completedSteps, 1);
    assert.strictEqual(updated1.progress.percent, 50);
    assert.strictEqual(updated1.status, 'in-progress');
    assert.strictEqual(updated1.steps[0].completed, true);
    assert.strictEqual(updated1.steps[1].completed, false);

    // Toggle second step to complete 100%
    const updated2 = store.toggleArtifactStep(unexported.id, 's2', true);
    assert.strictEqual(updated2.progress.completedSteps, 2);
    assert.strictEqual(updated2.progress.percent, 100);
    assert.strictEqual(updated2.status, 'completed');

    // Clean up
    store.deleteArtifact(unexported.id);
  });

  // Test 3: Exported artifact disk synchronization and rapid consecutive toggling
  await asyncTest('A3: Exported artifact rapid 20-toggle disk consistency', async () => {
    const art = {
      id: 'art_adv_rapid_' + Date.now(),
      type: 'shred',
      command: '/shred',
      title: '并发打勾磁盘同步测试',
      query: '高频勾选与取消勾选',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
      steps: [
        { id: 'step_a', title: '打开测试文件', actionVerb: '打开', estMinutes: 1, completed: false },
        { id: 'step_b', title: '打印诊断信息', actionVerb: '打印', estMinutes: 2, completed: false },
        { id: 'step_c', title: '运行验证命令', actionVerb: '运行', estMinutes: 2, completed: false }
      ]
    };

    store.addArtifact(art);
    const exportRes = await artifactExporter.exportArtifactFile({ artifact: art });
    assert.ok(exportRes.success);
    const diskPath = exportRes.filePath;
    assert.ok(fs.existsSync(diskPath));

    // Rapid toggle loop: 20 toggles across step_a, step_b, step_c
    for (let i = 0; i < 20; i++) {
      const targetStep = i % 3 === 0 ? 'step_a' : (i % 3 === 1 ? 'step_b' : 'step_c');
      const targetState = i % 2 === 0; // alternate true / false
      store.toggleArtifactStep(art.id, targetStep, targetState);

      // Verify disk content immediately
      const diskContent = fs.readFileSync(diskPath, 'utf8');
      const inMemoryArt = store.getArtifact(art.id);
      const expectedStep = inMemoryArt.steps.find(s => s.id === targetStep);
      const checkTag = expectedStep.completed ? '- [x]' : '- [ ]';
      assert.ok(
        diskContent.includes(`${checkTag} **步骤 ${targetStep === 'step_a' ? 1 : (targetStep === 'step_b' ? 2 : 3)} ·`),
        `Disk markdown must match step completion status at toggle iteration ${i}`
      );
      assert.ok(
        diskContent.includes(`progress: ${inMemoryArt.progress.percent}%`),
        `Disk YAML frontmatter must reflect accurate percent at iteration ${i}`
      );
    }

    // Clean up
    try { fs.unlinkSync(diskPath); } catch (e) {}
    store.deleteArtifact(art.id);
  });

  // Test 4: Format Markdown escape and special characters resilience
  test('A4: Markdown formatting with special characters, backticks and quotes', () => {
    const maliciousArt = {
      id: 'art_malicious_123',
      type: 'shred',
      command: '/shred',
      title: '测试注入 <script>alert(1)</script> & "quotes" \'single\' `code`',
      query: '特殊符号: *asterisk* _underscore_ [link](url) #hash',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
      steps: [
        {
          id: 's1',
          title: '运行 `npm test -- --grep "foo"` 验证',
          actionVerb: '运行',
          estMinutes: 2,
          detail: '注意：包含 > 引用符与 | 管道符',
          completed: false
        }
      ]
    };

    const md = artifactExporter.formatArtifactMarkdown(maliciousArt);
    assert.ok(md.startsWith('---'));
    assert.ok(md.includes('id: art_malicious_123'));
    assert.ok(md.includes('- [ ] **步骤 1 · 运行**：运行 `npm test -- --grep "foo"` 验证 (⏱️ 2 分钟)'));
    assert.ok(md.includes('> 注意：包含 > 引用符与 | 管道符'));
  });

  // Test 5: Verify preload window.sidebarAPI contract coverage
  test('A5: Verify preload exposed interface coverage in preload.js source', () => {
    const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
    assert.ok(preloadSource.includes('locateArtifact:'), 'preload must expose locateArtifact');
    assert.ok(preloadSource.includes('openArtifact:'), 'preload must expose openArtifact');
    assert.ok(preloadSource.includes('showItemInFolder:'), 'preload must expose showItemInFolder');
    assert.ok(preloadSource.includes('openPath:'), 'preload must expose openPath');
    assert.ok(preloadSource.includes('toggleArtifactStep:'), 'preload must expose toggleArtifactStep');
  });

  console.log(`\n=================================================`);
  console.log(`R3 ADVERSARIAL STRESS TEST SUMMARY: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log(`=================================================`);

  if (failed > 0) process.exit(1);
}

runAll().catch(e => {
  console.error(e);
  process.exit(1);
});
