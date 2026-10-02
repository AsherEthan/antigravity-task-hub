// scripts/test-m3-adversarial.js
/**
 * Adversarial Stress-Test Suite for Milestone M3
 * Evaluates edge cases, input attacks, boundary values, and integrity invariants.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const store = require('../services/store');
const slashEngine = require('../services/slash-engine');
const { parseSlashCommand, mutateArtifactStep, SlashEngine } = slashEngine;
const artifactExporter = require('../services/artifact-exporter');
const { formatArtifactMarkdown, exportToDisk, copyToClipboard } = artifactExporter;

console.log('=== STARTING ADVERSARIAL STRESS TEST FOR M3 ===\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  // -------------------------------------------------------------
  // Section 1: Slash Command Parser Adversarial Attacks
  // -------------------------------------------------------------
  console.log('--- Section 1: Slash Command Parser Adversarial Attacks ---');

  runTest('1.1: Empty and null inputs', () => {
    assert.strictEqual(parseSlashCommand('').command, null);
    assert.strictEqual(parseSlashCommand(null).command, null);
    assert.strictEqual(parseSlashCommand(undefined).command, null);
    assert.strictEqual(parseSlashCommand('   ').command, null);
  });

  runTest('1.2: Malformed slash inputs (bare slash, double slash, slash with spaces)', () => {
    assert.strictEqual(parseSlashCommand('/').command, null);
    assert.strictEqual(parseSlashCommand('/   ').command, null);
    const double = parseSlashCommand('//plan');
    // should not parse as /plan
    assert.notStrictEqual(double.command, '/plan');
  });

  runTest('1.3: Case insensitivity and whitespace stripping', () => {
    const p1 = parseSlashCommand('  /PLAN   构建系统   ');
    assert.strictEqual(p1.command, '/plan');
    assert.strictEqual(p1.query, '构建系统');

    const p2 = parseSlashCommand('/ShReD   解决卡点\n换行测试  ');
    assert.strictEqual(p2.command, '/shred');
    assert.ok(p2.query.includes('解决卡点'));
  });

  runTest('1.4: Commands with complex @ mentions and code blocks', () => {
    const input = '/solve 优化 @code:server.js 中的死锁问题 @error:504';
    const p = parseSlashCommand(input);
    assert.strictEqual(p.command, '/solve');
    assert.ok(p.query.includes('@code:server.js'));
    assert.ok(p.query.includes('@error:504'));
  });

  // -------------------------------------------------------------
  // Section 2: Cognitive Engine Constraints Stress-Testing
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Cognitive Engine Constraints Stress-Testing ---');

  await runAsyncTest('2.1: /shred strictly enforces 3 micro-actions, physical verbs, estMinutes <= 2', async () => {
    const testCases = [
      '完全模糊的大目标：我想成为世界顶级AI科学家并彻底颠覆认知哲学',
      '极简输入：卡住',
      '技术性目标：排查分布式锁死锁与高频GC停顿异常',
      '非技术性目标：写完毕业论文第三章文献综述',
      '英文输入：Refactor database connection pool and fix leak'
    ];

    for (const testGoal of testCases) {
      const art = await slashEngine.executeSlashCommand({ command: '/shred', query: testGoal });
      assert.strictEqual(art.type, 'shred');
      assert.strictEqual(art.command, '/shred');
      assert.strictEqual(art.steps.length, 3, `Steps length must be strictly 3, got ${art.steps.length}`);
      assert.strictEqual(art.progress.totalSteps, 3);
      assert.strictEqual(art.progress.completedSteps, 0);
      assert.strictEqual(art.progress.percent, 0);

      const allowedPhysicalVerbs = ['打开', '运行', '记录', '查看', '搜索', '输入', '查阅', '启动', '执行', '打印', '注释', '对比', '固定'];
      for (const step of art.steps) {
        assert.ok(step.estMinutes <= 2, `estMinutes must be <= 2, got ${step.estMinutes}`);
        assert.ok(step.estMinutes >= 1, `estMinutes must be >= 1, got ${step.estMinutes}`);
        const hasVerb = allowedPhysicalVerbs.some(v => step.actionVerb?.includes(v) || step.title?.includes(v));
        assert.ok(hasVerb, `Step must contain physical verb: ${step.title}`);
      }
    }
  });

  await runAsyncTest('2.2: /solve outputs 5-obstacle taxonomy, mental model, and Popperian falsifiable test', async () => {
    const blockers = [
      '不知道为什么加了缓存后QPS反而暴跌，同时有5个模块在报错',
      '冥想时前额叶脑电信号剧烈漂移，怀疑是眼动但无法确定',
      '面对这个几万行祖传代码库完全不敢动手，大脑一片空白',
      '方案A和方案B到底选哪个，感觉都有道理陷入无休止纠结',
      '只看了10篇论文没写一行代码就断定这套方案不可行'
    ];

    for (const b of blockers) {
      const art = await slashEngine.executeSlashCommand({ command: '/solve', query: b });
      assert.strictEqual(art.type, 'solve');
      assert.ok(art.payload?.diagnosis, 'Payload must contain diagnosis');
      assert.ok(art.payload?.minimalViableTest, 'Payload must contain minimalViableTest');
      assert.ok(art.payload.minimalViableTest.falsificationCondition, 'Must have falsificationCondition');
      assert.ok(art.steps.length >= 1, 'Must have steps for minimal test');
    }
  });

  await runAsyncTest('2.3: /plan outputs 3 phased milestones with dependency chain', async () => {
    const plans = [
      '开发高性能贴边侧边栏',
      '建立闭眼静息脑电基线对照体系',
      '构建通用任务编排工作流系统'
    ];

    for (const p of plans) {
      const art = await slashEngine.executeSlashCommand({ command: '/plan', query: p });
      assert.strictEqual(art.type, 'plan');
      assert.ok(art.payload?.phases?.length === 3, 'Plan must have 3 phases');
      assert.ok(art.steps.length >= 3, 'Plan must have >= 3 steps');

      // Check dependency chain: step 2 depends on step 1, step 3 depends on step 2
      const step1 = art.steps.find(s => s.id === 'step_1' || s.order === 1);
      const step2 = art.steps.find(s => s.id === 'step_2' || s.order === 2);
      const step3 = art.steps.find(s => s.id === 'step_3' || s.order === 3);

      assert.ok(step1, 'Step 1 exists');
      assert.ok(step2, 'Step 2 exists');
      assert.ok(step3, 'Step 3 exists');
      assert.deepStrictEqual(step1.dependsOn, [], 'Step 1 has no prerequisites');
      assert.ok(step2.dependsOn.includes(step1.id), `Step 2 must depend on ${step1.id}`);
      assert.ok(step3.dependsOn.includes(step2.id), `Step 3 must depend on ${step2.id}`);
    }
  });

  // -------------------------------------------------------------
  // Section 3: Step Mutation Monotonicity & Boundary Invariants
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Step Mutation Monotonicity & Boundary Invariants ---');

  runTest('3.1: Monotonicity with 1, 2, 3, 4, 7 steps', () => {
    for (const n of [1, 2, 3, 4, 7]) {
      const steps = [];
      for (let i = 1; i <= n; i++) {
        steps.push({ id: `s_${i}`, title: `Step ${i}`, completed: false });
      }
      let art = {
        id: `art_${n}`,
        type: 'shred',
        steps,
        progress: { totalSteps: n, completedSteps: 0, percent: 0 }
      };

      let lastPercent = -1;
      for (let i = 0; i < n; i++) {
        art = mutateArtifactStep(art, `s_${i + 1}`, true);
        assert.ok(art.progress.percent >= 0 && art.progress.percent <= 100, `Percent must be within [0, 100], got ${art.progress.percent}`);
        assert.ok(art.progress.percent >= lastPercent, `Percent must increase monotonically (${art.progress.percent} >= ${lastPercent})`);
        assert.strictEqual(art.progress.completedSteps, i + 1);
        lastPercent = art.progress.percent;
      }
      assert.strictEqual(art.progress.percent, 100);
      assert.strictEqual(art.status, 'completed');

      // Now uncheck backwards
      for (let i = n - 1; i >= 0; i--) {
        art = mutateArtifactStep(art, `s_${i + 1}`, false);
        assert.ok(art.progress.percent >= 0 && art.progress.percent <= 100);
        assert.ok(art.progress.percent <= lastPercent);
        assert.strictEqual(art.progress.completedSteps, i);
        lastPercent = art.progress.percent;
      }
      assert.strictEqual(art.progress.percent, 0);
      assert.strictEqual(art.status, 'active');
    }
  });

  runTest('3.2: Non-existent stepId returns null / does not corrupt', () => {
    const art = {
      id: 'art_non_exist',
      type: 'shred',
      steps: [{ id: 's1', title: 'S1', completed: false }],
      progress: { totalSteps: 1, completedSteps: 0, percent: 0 }
    };
    const res = mutateArtifactStep(art, 'ghost_step_id', true);
    assert.strictEqual(res, null, 'mutateArtifactStep returns null for missing step');
  });

  runTest('3.3: Store step toggle and completedStepsCount aggregation', () => {
    const artId = 'art_store_test_' + Date.now();
    const art = {
      id: artId,
      type: 'shred',
      command: '/shred',
      title: 'Store Step Test',
      steps: [
        { id: 'st1', title: 'Step 1', completed: false },
        { id: 'st2', title: 'Step 2', completed: false }
      ],
      progress: { totalSteps: 2, completedSteps: 0, percent: 0 }
    };

    store.addArtifact(art);
    assert.strictEqual(store.getArtifact(artId).id, artId);

    // Toggle step 1
    const t1 = store.toggleArtifactStep(artId, 'st1', true);
    assert.strictEqual(t1.progress.completedSteps, 1);
    assert.strictEqual(t1.progress.percent, 50);
    assert.strictEqual(t1.status, 'in-progress');

    // Toggle step 2
    const t2 = store.toggleArtifactStep(artId, 'st2', true);
    assert.strictEqual(t2.progress.completedSteps, 2);
    assert.strictEqual(t2.progress.percent, 100);
    assert.strictEqual(t2.status, 'completed');

    // Delete artifact cleanup
    store.deleteArtifact(artId);
    assert.strictEqual(store.getArtifact(artId), null);
  });

  // -------------------------------------------------------------
  // Section 4: Artifact Markdown Serialization & Disk Export
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Artifact Markdown Serialization & Disk Export ---');

  runTest('4.1: YAML frontmatter format and escaping', () => {
    const art = {
      id: 'art_yaml_test',
      type: 'plan',
      command: '/plan',
      title: '特殊符号测试: [重要] "双引号" 与 \'单引号\' 及 <HTML> & 换行',
      query: '测试特殊符号输入: & < > \' " \\ /',
      createdAt: 1727700000000,
      updatedAt: 1727700000000,
      status: 'active',
      mountedContexts: [{ tag: '@clipboard', type: 'clipboard' }],
      progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
      steps: [
        { id: 's1', title: '测试步骤 1', actionVerb: '打开', estMinutes: 2, completed: false, dependsOn: [] }
      ]
    };

    const md = formatArtifactMarkdown(art);
    assert.ok(md.startsWith('---\n'), 'Must start with --- header');
    assert.ok(md.includes('id: art_yaml_test\n'), 'Frontmatter contains id');
    assert.ok(md.includes('type: plan\n'), 'Frontmatter contains type');
    assert.ok(md.includes('command: /plan\n'), 'Frontmatter contains command');
    assert.ok(md.includes('progress: 0% (0/1 completed)\n'), 'Frontmatter contains progress');
    assert.ok(md.includes('\n---\n'), 'Frontmatter closes with ---');
    assert.ok(md.includes('- [ ] **步骤 1 · 打开**：测试步骤 1 (⏱️ 2 分钟)'), 'Task checkbox format matches');
    assert.ok(md.includes('> **挂载上下文**: @clipboard'), 'Mounted contexts rendered');
  });

  runTest('4.2: Disk export to custom directory and file unlinking', () => {
    const tempDir = path.join(__dirname, '..', 'artifacts', 'temp_stress_dir');
    const art = {
      id: 'art_disk_stress',
      type: 'solve',
      command: '/solve',
      title: '磁盘写入压力测试',
      query: '测试文件创建',
      steps: [{ id: 's1', title: '步骤1', completed: false }]
    };

    const exp = exportToDisk(art, tempDir);
    assert.strictEqual(exp.success, true);
    assert.ok(fs.existsSync(exp.filePath), `File must exist at ${exp.filePath}`);
    const content = fs.readFileSync(exp.filePath, 'utf8');
    assert.ok(content.startsWith('---'));
    assert.ok(content.includes('id: art_disk_stress'));

    // Clean up
    fs.unlinkSync(exp.filePath);
    fs.rmdirSync(tempDir);
  });

  runTest('4.3: Clipboard copy with mock object and without electron', () => {
    let mockClipboardText = '';
    const mockClip = {
      writeText: (t) => { mockClipboardText = t; },
      readText: () => mockClipboardText
    };

    const art = {
      id: 'art_clip_test',
      type: 'shred',
      title: '剪贴板测试',
      steps: [{ id: 's1', title: '复制步骤', completed: true }]
    };

    const res = copyToClipboard(art, mockClip);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockClipboardText, res.text);
    assert.ok(mockClipboardText.includes('- [x]'));
  });

  // -------------------------------------------------------------
  // Section 5: Gamification Purge Forensic Verification
  // -------------------------------------------------------------
  console.log('\n--- Section 5: Gamification Purge Forensic Verification ---');

  runTest('5.1: Store data has zero gamification fields', () => {
    const p = store.data.playerProfile;
    assert.strictEqual(p.rankTitle, undefined, 'rankTitle must be undefined');
    assert.strictEqual(p.totalXp, undefined, 'totalXp must be undefined');
    assert.strictEqual(p.nextRankXp, undefined, 'nextRankXp must be undefined');
    assert.strictEqual(p.comboStreak, undefined, 'comboStreak must be undefined');
    assert.strictEqual(p.maxCombo, undefined, 'maxCombo must be undefined');
    assert.strictEqual(p.relicVault, undefined, 'relicVault must be undefined');
    assert.strictEqual(p.droppedRelic, undefined, 'droppedRelic must be undefined');
  });

  runTest('5.2: Store getDefaultData() has zero gamification fields', () => {
    const def = store.getDefaultData();
    const p = def.playerProfile;
    assert.strictEqual(p.rankTitle, undefined, 'def rankTitle must be undefined');
    assert.strictEqual(p.totalXp, undefined, 'def totalXp must be undefined');
    assert.strictEqual(p.relicVault, undefined, 'def relicVault must be undefined');
    assert.strictEqual(p.comboStreak, undefined, 'def comboStreak must be undefined');
  });

  console.log(`\n=================================================`);
  console.log(`STRESS TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log(`=================================================`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal stress test error:', err);
  process.exit(1);
});
