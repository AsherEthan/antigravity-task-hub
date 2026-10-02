// scripts/stress-sidebar-m3-challenger.js
/**
 * Empirical Adversarial Stress Test & Popperian Invariant Benchmark Harness
 * Milestone M3: Slash Commands & Interactive Cognitive Artifacts Engine
 * 
 * Conducts exhaustive empirical stress testing across:
 * 1. Command Router & Boundary Stress:
 *    - Empty, null, undefined, whitespace, tabs, newlines
 *    - Bare slashes: '/', '//', '///', '/   '
 *    - 100,000-character extreme inputs (ReDoS safety & buffer handling)
 *    - Unknown commands: /unknown, /123, /-xyz-, /help, /sudo_rm_rf (returns guidance card)
 *    - Case insensitivity & special chars (XSS, SQLi, emojis, zero-width, newlines)
 *    - Polymorphic payload objects (command, rawInput, query, options, attachments)
 * 2. Step Mutation Monotonicity & Invariants:
 *    - Multi-step toggle cycles (0% -> 33% -> 67% -> 100% -> 67% -> 33% -> 0%)
 *    - Mathematical invariants: 0 <= completedSteps <= totalSteps, 0 <= percent <= 100
 *    - State transitions: active <-> in-progress <-> completed
 *    - Toggle idempotency (consecutive true / false toggles)
 *    - 500-iteration randomized fuzzing harness asserting monotonic consistency
 *    - Edge cases: non-existent stepId, 0 steps (no NaN/division-by-zero), null artifact
 *    - Sub-payload synchronization (steps vs payload.steps / payload.actions)
 * 3. Popperian Falsification Engine in /solve:
 *    - Full 5-obstacle taxonomy validation (CONCEPT_CONFUSION, MISSING_BASELINE, UNISOLATED_VARIABLES, ACTION_ZERO_PARALYSIS, PREMATURE_CONVERGENCE)
 *    - Strict verification of genuine Popperian falsification conditions
 *    - 15-minute timebox enforcement (estMinutes <= 15)
 *    - Executable interactive testing steps generation
 * 4. /shred 2-Minute Physical Micro-Action Invariant:
 *    - 10 macroscopic blocker goals across diverse domains
 *    - Strict 3 micro-actions constraint
 *    - Strict estMinutes <= 2 constraint (2-minute rule)
 *    - Immediate physical action verbs validation
 *    - Step dependency DAG integrity (prerequisite step ID resolution)
 * 5. /plan Roadmap & Vanity Gamification Purge Invariant:
 *    - 3-phase sequenced execution roadmap with prerequisite dependency tracking (dependsOn)
 *    - Deep scan asserting 0 relics of player XP, monster health, levels, combo streaks, and loot vaults
 *    - Store completedStepsCount authentic productivity synchronization
 * 6. Knowledge Asset Serialization & High-Resolution Latency Benchmarks:
 *    - GitHub-flavored Markdown with valid YAML frontmatter (---)
 *    - File system disk export & safe directory creation
 *    - High-resolution performance benchmarks (Min, Mean, Median, p95, p99, Max, StdDev)
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const slashEngine = require('../services/slash-engine');
const artifactExporter = require('../services/artifact-exporter');
const store = require('../services/store');
const cognitiveShredder = require('../services/cognitive-shredder');
const bottleneckDiagnostician = require('../services/bottleneck-diagnostician');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  failures: [],
  benchmarks: {}
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed [${message}]: Expected "${expected}", got "${actual}"`);
  }
}

function assertLessOrEqual(actual, max, message) {
  if (actual > max) {
    throw new Error(`Assertion Failed [${message}]: Expected <= ${max}, got ${actual}`);
  }
}

function assertGreaterOrEqual(actual, min, message) {
  if (actual < min) {
    throw new Error(`Assertion Failed [${message}]: Expected >= ${min}, got ${actual}`);
  }
}

async function test(name, fn) {
  results.totalTests++;
  const t0 = performance.now();
  try {
    await fn();
    const duration = (performance.now() - t0).toFixed(2);
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    results.passed++;
  } catch (err) {
    const duration = (performance.now() - t0).toFixed(2);
    console.log(`  ${C.red}✗ [FAIL]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    console.log(`    ${C.red}Error: ${err.message}${C.reset}`);
    results.failed++;
    results.failures.push({ name, error: err.message, stack: err.stack });
  }
}

function computeStats(samples) {
  if (!samples || samples.length === 0) return { min: 0, mean: 0, median: 0, p95: 0, p99: 0, max: 0, stdDev: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
  const p99 = sorted[Math.min(n - 1, Math.floor(n * 0.99))];
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  return { min, mean, median, p95, p99, max, stdDev };
}

async function runAllSuites() {
  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Empirical Stress Test & Popperian Invariant Benchmark (M3)    ${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`Target: services/slash-engine.js, services/artifact-exporter.js, services/store.js`);
  console.log(`Runtime: Node ${process.version}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // =========================================================================
  // SUITE 1: Slash Command Lexer & Router Boundary Stress
  // =========================================================================
  console.log(`${C.bold}${C.blue}=== Suite 1: Command Router & Boundary Input Stress ===${C.reset}`);

  await test('S1.1: Degenerate inputs (null, undefined, empty, whitespace, newlines, bare slashes)', async () => {
    const degenerates = [
      '',
      null,
      undefined,
      '   ',
      '\t\t\n\r\n',
      '/',
      '//',
      '///',
      '/   ',
      '/\t\n\r',
      '/ 123',
      '/   plan'
    ];

    for (const input of degenerates) {
      const parsed = slashEngine.parseSlashCommand(input);
      assert(typeof parsed === 'object', 'Must return an object');
      assert('command' in parsed, 'Must have command property');
      assert('query' in parsed, 'Must have query property');

      // Execute through router
      const art = await slashEngine.executeSlashCommand(input);
      assert(art !== null && typeof art === 'object', 'Execution must never throw and return guidance or artifact');
      assert(typeof art.id === 'string', 'Returned artifact must have valid ID');
      assert(['guidance', 'plan', 'shred', 'solve'].includes(art.type), `Type must be valid, got ${art.type}`);
    }
  });

  await test('S1.2: Extreme 100,000-character inputs (ReDoS safety & buffer handling)', async () => {
    const hugeQuery = 'X'.repeat(100000);
    const hugeCmd = '/' + 'Y'.repeat(100000) + ' ' + hugeQuery;

    // Test parser with 100k query
    const t0 = performance.now();
    const parsed1 = slashEngine.parseSlashCommand(`/plan ${hugeQuery}`);
    const parseTime = performance.now() - t0;
    assertLessOrEqual(parseTime, 50, `100k parse latency must be <= 50ms (ReDoS check), got ${parseTime.toFixed(2)}ms`);
    assertEqual(parsed1.command, '/plan', 'Command parsed correctly despite 100k query');
    assertEqual(parsed1.query.length, 100000, 'Query preserves 100k length');

    // Test execution with 100k input
    const art = await slashEngine.executeSlashCommand({ command: '/plan', query: hugeQuery });
    assert(art !== null, 'Execution on 100k payload must succeed');
    assert(art.steps.length >= 3, 'Must produce phased steps even for 100k query');

    // Test parser on 100k command name
    const parsed2 = slashEngine.parseSlashCommand(hugeCmd);
    assert(parsed2.command !== null, '100k command name handled without crashing regex');
    const guidance = await slashEngine.executeSlashCommand(hugeCmd);
    assertEqual(guidance.type, 'guidance', 'Unknown 100k command resolves to guidance card');
  });

  await test('S1.3: Non-existent and bizarre commands fallback to guidance card', async () => {
    const invalidCommands = [
      '/unknown',
      '/foobar',
      '/12345',
      '/-hyphen-command-',
      '/help',
      '/exit',
      '/sudo_rm_rf',
      '/select_star_from_users'
    ];

    for (const cmd of invalidCommands) {
      const art = await slashEngine.executeSlashCommand(cmd);
      assertEqual(art.type, 'guidance', `Command "${cmd}" must return type: "guidance"`);
      assert(art.title.includes(cmd.toLowerCase()) || art.summary.includes('/plan'), `Guidance card must list supported commands`);
      assert(Array.isArray(art.supportedCommands) && art.supportedCommands.includes('/plan'), 'Includes supported commands list');
      assertEqual(art.progress.totalSteps, 0, 'Guidance card has 0 steps');
    }
  });

  await test('S1.4: Special characters, SQLi, XSS, Unicode, Emojis, and Zero-width spaces', async () => {
    const adversarialQueries = [
      { cmd: '/plan', query: '<script>alert("xss")</script><img src=x onerror=alert(1)>' },
      { cmd: '/shred', query: "'; DROP TABLE artifacts; DROP TABLE clues; --" },
      { cmd: '/solve', query: 'C:\\Windows\\System32\\cmd.exe /c calc.exe & dir' },
      { cmd: '/plan', query: '🚀 🧠 💥 🎯 闭环因果图谱与神经伪迹剥离' },
      { cmd: '/solve', query: '零宽字符测试\u200B\u200C\u200D\uFEFF与控制符\x00\x08\x1B' },
      { cmd: '/shred', query: '多行任务描述\n第二行细化指标\r\n第三行边界约束' }
    ];

    for (const item of adversarialQueries) {
      const art = await slashEngine.executeSlashCommand({ command: item.cmd, query: item.query });
      assert(art !== null, `Must succeed for query: ${item.query.slice(0, 30)}`);
      assert(typeof art.title === 'string' && art.title.length > 0, 'Title generated');
      assert(art.steps.length >= 3, 'Steps array generated');
    }
  });

  await test('S1.5: Case-insensitivity & query-embedded slash commands', async () => {
    // Upper / mixed cases
    const upperCases = ['/PLAN', '/Plan', '/pLaN', '/SHRED', '/ShReD', '/SOLVE', '/SoLvE'];
    for (const c of upperCases) {
      const parsed = slashEngine.parseSlashCommand(`${c} 测试任务`);
      assertEqual(parsed.command, c.toLowerCase(), `Normalized ${c} -> ${c.toLowerCase()}`);
      const art = await slashEngine.executeSlashCommand(`${c} 测试任务`);
      assertEqual(art.type, c.toLowerCase().replace('/', ''), `Type matches for ${c}`);
    }

    // Embedded slash in query
    const embedded = '/plan 部署微服务 /shred 阻碍 /solve 难关 https://github.com/org/repo';
    const parsedEmbedded = slashEngine.parseSlashCommand(embedded);
    assertEqual(parsedEmbedded.command, '/plan', 'First slash captured as primary command');
    assert(parsedEmbedded.query.includes('/shred') && parsedEmbedded.query.includes('/solve'), 'Subsequent slashes preserved in query');
  });

  await test('S1.6: Polymorphic payload structure dispatch', async () => {
    // 1. Raw string
    const r1 = await slashEngine.executeSlashCommand('/shred 快速测试1');
    assertEqual(r1.type, 'shred', 'Dispatched from raw string');

    // 2. Object with { rawInput }
    const r2 = await slashEngine.executeSlashCommand({ rawInput: '/solve 快速测试2' });
    assertEqual(r2.type, 'solve', 'Dispatched from object.rawInput');

    // 3. Object with { command, query }
    const r3 = await slashEngine.executeSlashCommand({ command: '/plan', query: '快速测试3' });
    assertEqual(r3.type, 'plan', 'Dispatched from object.command + query');

    // 4. Object with attachments
    const r4 = await slashEngine.executeSlashCommand({
      command: '/shred',
      query: '带上下文测试',
      attachments: [{ tag: '@clipboard', content: 'Err 500' }]
    });
    assertEqual(r4.mountedContexts.length, 1, 'Mounted context attached to artifact');

    // 5. Primitives
    const r5 = await slashEngine.executeSlashCommand(12345);
    assertEqual(r5.type, 'guidance', 'Primitive number resolves safely to guidance');
    const r6 = await slashEngine.executeSlashCommand(true);
    assertEqual(r6.type, 'guidance', 'Primitive boolean resolves safely to guidance');
  });

  // =========================================================================
  // SUITE 2: Step Mutation Monotonicity & Invariant Verification
  // =========================================================================
  console.log(`\n${C.bold}${C.blue}=== Suite 2: Step Mutation Monotonicity & Invariants ===${C.reset}`);

  await test('S2.1: Canonical 3-step toggle cycle (0% -> 33% -> 67% -> 100% -> 67% -> 33% -> 0%)', async () => {
    let art = {
      id: 'art_mono_test',
      type: 'shred',
      title: '单调性验证产物',
      status: 'active',
      progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
      steps: [
        { id: 's1', title: '步骤 1', completed: false, completedAt: null },
        { id: 's2', title: '步骤 2', completed: false, completedAt: null },
        { id: 's3', title: '步骤 3', completed: false, completedAt: null }
      ]
    };

    // Initial state: 0/3 (0%), active
    assertEqual(art.progress.completedSteps, 0, 'Initial 0 completed');
    assertEqual(art.progress.percent, 0, 'Initial 0%');
    assertEqual(art.status, 'active', 'Initial status: active');

    // Forward cycle: Step 1 -> 1/3 (33%, in-progress)
    art = slashEngine.mutateArtifactStep(art, 's1', true);
    assertEqual(art.progress.completedSteps, 1, 'Forward 1/3 completed');
    assertEqual(art.progress.percent, 33, 'Forward 33%');
    assertEqual(art.status, 'in-progress', 'Status: in-progress');
    assert(art.steps[0].completed === true, 'Step 1 is completed');
    assert(art.steps[0].completedAt > 0, 'Step 1 completedAt set');

    // Step 2 -> 2/3 (67%, in-progress)
    art = slashEngine.mutateArtifactStep(art, 's2', true);
    assertEqual(art.progress.completedSteps, 2, 'Forward 2/3 completed');
    assertEqual(art.progress.percent, 67, 'Forward 67%');
    assertEqual(art.status, 'in-progress', 'Status: in-progress');

    // Step 3 -> 3/3 (100%, completed)
    art = slashEngine.mutateArtifactStep(art, 's3', true);
    assertEqual(art.progress.completedSteps, 3, 'Forward 3/3 completed');
    assertEqual(art.progress.percent, 100, 'Forward 100%');
    assertEqual(art.status, 'completed', 'Status: completed');

    // Reverse cycle: Step 2 unticked -> 2/3 (67%, in-progress)
    art = slashEngine.mutateArtifactStep(art, 's2', false);
    assertEqual(art.progress.completedSteps, 2, 'Reverse 2/3 completed');
    assertEqual(art.progress.percent, 67, 'Reverse 67%');
    assertEqual(art.status, 'in-progress', 'Status: in-progress');
    assert(art.steps[1].completed === false, 'Step 2 completed is false');
    assert(art.steps[1].completedAt === null, 'Step 2 completedAt is null');

    // Step 1 unticked -> 1/3 (33%, in-progress)
    art = slashEngine.mutateArtifactStep(art, 's1', false);
    assertEqual(art.progress.completedSteps, 1, 'Reverse 1/3 completed');
    assertEqual(art.progress.percent, 33, 'Reverse 33%');
    assertEqual(art.status, 'in-progress', 'Status: in-progress');

    // Step 3 unticked -> 0/3 (0%, active)
    art = slashEngine.mutateArtifactStep(art, 's3', false);
    assertEqual(art.progress.completedSteps, 0, 'Reverse 0/3 completed');
    assertEqual(art.progress.percent, 0, 'Reverse 0%');
    assertEqual(art.status, 'active', 'Status: active');
  });

  await test('S2.2: Toggle idempotency (consecutive true and false toggles)', async () => {
    let art = {
      id: 'art_idempotent_test',
      type: 'plan',
      status: 'active',
      progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
      steps: [
        { id: 'step_1', title: 'Step 1', completed: false, completedAt: null },
        { id: 'step_2', title: 'Step 2', completed: false, completedAt: null },
        { id: 'step_3', title: 'Step 3', completed: false, completedAt: null }
      ]
    };

    // Toggle step_1 to true 5 times
    for (let i = 0; i < 5; i++) {
      art = slashEngine.mutateArtifactStep(art, 'step_1', true);
      assertEqual(art.progress.completedSteps, 1, `After ${i + 1} redundant true toggles, completedSteps must remain 1`);
      assertEqual(art.progress.percent, 33, `After ${i + 1} redundant true toggles, percent must remain 33`);
    }

    // Toggle step_1 to false 5 times
    for (let i = 0; i < 5; i++) {
      art = slashEngine.mutateArtifactStep(art, 'step_1', false);
      assertEqual(art.progress.completedSteps, 0, `After ${i + 1} redundant false toggles, completedSteps must remain 0`);
      assertEqual(art.progress.percent, 0, `After ${i + 1} redundant false toggles, percent must remain 0`);
      assertEqual(art.status, 'active', 'Status remains active');
    }
  });

  await test('S2.3: Non-existent stepId & empty step list boundary safety', async () => {
    const art = {
      id: 'art_boundary_test',
      type: 'shred',
      status: 'active',
      progress: { totalSteps: 2, completedSteps: 0, percent: 0 },
      steps: [
        { id: 'valid_1', completed: false },
        { id: 'valid_2', completed: false }
      ]
    };

    // Unknown stepId returns null from mutateArtifactStep (leaves original unchanged)
    const res = slashEngine.mutateArtifactStep(art, 'non_existent_step', true);
    assertEqual(res, null, 'Mutating non-existent step returns null');

    // Artifact with 0 steps
    const emptyArt = {
      id: 'art_empty_steps',
      type: 'plan',
      status: 'active',
      progress: { totalSteps: 0, completedSteps: 0, percent: 0 },
      steps: []
    };
    const emptyRes = slashEngine.mutateArtifactStep(emptyArt, 'any', true);
    assertEqual(emptyRes, null, 'Empty steps returns null without division by zero');

    // Mutating null artifact
    assertEqual(slashEngine.mutateArtifactStep(null, 's1', true), null, 'Null artifact returns null');
  });

  await test('S2.4: 500-Iteration Randomized Step Mutation Fuzzing Harness', async () => {
    // Generate artifact with 10 steps
    const stepCount = 10;
    const steps = Array.from({ length: stepCount }, (_, i) => ({
      id: `fuzz_step_${i + 1}`,
      title: `Fuzz Step ${i + 1}`,
      completed: false,
      completedAt: null
    }));

    let art = {
      id: 'art_fuzz_100',
      type: 'plan',
      status: 'active',
      progress: { totalSteps: stepCount, completedSteps: 0, percent: 0 },
      steps
    };

    let previousCompleted = 0;

    for (let iter = 0; iter < 500; iter++) {
      const targetStepIdx = Math.floor(Math.random() * stepCount);
      const targetStepId = steps[targetStepIdx].id;
      const targetCompleted = Math.random() > 0.5;

      art = slashEngine.mutateArtifactStep(art, targetStepId, targetCompleted);
      assert(art !== null, `Iteration ${iter}: Mutation must not return null for valid step`);

      const actualCompleted = art.steps.filter(s => s.completed).length;
      assertEqual(art.progress.completedSteps, actualCompleted, `Iteration ${iter}: completedSteps invariant violated`);

      // Delta invariant: |completed - previous| <= 1
      const delta = Math.abs(art.progress.completedSteps - previousCompleted);
      assertLessOrEqual(delta, 1, `Iteration ${iter}: Delta step jump violated (${delta})`);
      previousCompleted = art.progress.completedSteps;

      // Mathematical percentage invariant: round((completed / total) * 100)
      const expectedPercent = Math.round((actualCompleted / stepCount) * 100);
      assertEqual(art.progress.percent, expectedPercent, `Iteration ${iter}: percent calculation invariant violated`);
      assertGreaterOrEqual(art.progress.percent, 0, 'percent >= 0');
      assertLessOrEqual(art.progress.percent, 100, 'percent <= 100');

      // Status transition invariant
      if (actualCompleted === stepCount) {
        assertEqual(art.status, 'completed', `Iteration ${iter}: 100% must have status 'completed'`);
      } else if (actualCompleted > 0) {
        assertEqual(art.status, 'in-progress', `Iteration ${iter}: Partial completion must have status 'in-progress'`);
      } else {
        assertEqual(art.status, 'active', `Iteration ${iter}: 0% completion must have status 'active'`);
      }
    }
  });

  await test('S2.5: Store persistence synchronization & playerProfile completedStepsCount', async () => {
    const plan = await slashEngine.executeSlashCommand({ command: '/plan', query: 'Store同步测试任务' });
    store.addArtifact(plan);

    // Initial check
    const stepId = plan.steps[0].id;
    const updated1 = store.toggleArtifactStep(plan.id, stepId, true);
    assert(updated1 !== null, 'Store toggleArtifactStep succeeded');
    assertEqual(updated1.progress.completedSteps, 1, '1 step completed in store');
    assertGreaterOrEqual(store.data.playerProfile.completedStepsCount, 1, 'Store playerProfile completedStepsCount updated');

    // Untick
    const updated2 = store.toggleArtifactStep(plan.id, stepId, false);
    assertEqual(updated2.progress.completedSteps, 0, '0 steps completed after untick');

    // Clean up store
    store.deleteArtifact(plan.id);
  });

  await test('S2.6: [ADVERSARIAL CHALLENGE] Sub-payload step synchronization (steps vs payload.steps / payload.actions)', async () => {
    // When mutateArtifactStep is called, check if payload.steps or payload.actions get mutated or desync
    const art = await slashEngine.executeSlashCommand('/shred 载荷同步排查任务');
    const mutated = slashEngine.mutateArtifactStep(art, art.steps[0].id, true);

    const rootStepCompleted = mutated.steps[0].completed;
    const payloadStepCompleted = mutated.payload?.steps ? mutated.payload.steps[0].completed : rootStepCompleted;
    const payloadActionCompleted = mutated.payload?.actions ? mutated.payload.actions[0].completed : rootStepCompleted;

    // Document whether desynchronization occurs
    if (rootStepCompleted !== payloadStepCompleted || rootStepCompleted !== payloadActionCompleted) {
      throw new Error(`State Desynchronization Detected: root steps[0].completed is ${rootStepCompleted}, but payload.steps[0].completed is ${payloadStepCompleted} and payload.actions[0].completed is ${payloadActionCompleted}`);
    }
  });

  // =========================================================================
  // SUITE 3: Karl Popper Falsification Engine in /solve
  // =========================================================================
  console.log(`\n${C.bold}${C.blue}=== Suite 3: Karl Popper Falsification Engine in /solve ===${C.reset}`);

  await test('S3.1: Complete 5-obstacle taxonomy diagnosis and mental model mapping', async () => {
    const obstacleScenarios = [
      {
        text: '一直在抽象层面上纠结概念定义，把相关性当成了因果性，同名异物导致理解完全错位',
        expectedType: 'CONCEPT_CONFUSION',
        expectedModel: 'first_principles'
      },
      {
        text: '测试前额叶4-8Hz异常剧烈波动，但在没有外界刺激和无干扰静息状态下从未记录过对照基线',
        expectedType: 'MISSING_BASELINE',
        expectedModel: 'first_principles'
      },
      {
        text: '加入滤波后信号好转，但无法确定是遮光眼罩生效还是硬件电位漂移或室内工频干扰，变量没有隔离',
        expectedType: 'UNISOLATED_VARIABLES',
        expectedModel: 'minimal_counter_example'
      },
      {
        text: '连续读了15篇文献、做了厚厚的笔记，陷入了虚假忙碌，但不敢写一行测试代码，停滞不前',
        expectedType: 'ACTION_ZERO_PARALYSIS',
        expectedModel: 'feynman_technique'
      },
      {
        text: '坚决死守原有的假说不放，遇到异常测试读数就认为是仪器误差，拒绝考虑任何反例假说',
        expectedType: 'PREMATURE_CONVERGENCE',
        expectedModel: 'minimal_counter_example'
      }
    ];

    for (const sc of obstacleScenarios) {
      const art = await slashEngine.executeSlashCommand({ command: '/solve', query: sc.text });
      assertEqual(art.type, 'solve', 'Artifact type is solve');
      const diag = art.payload.diagnosis;
      assert(diag !== undefined, 'Contains diagnosis in payload');
      assertEqual(diag.obstacleType, sc.expectedType, `Correct obstacle classification for "${sc.expectedType}"`);
      assertEqual(diag.appliedMentalModel, sc.expectedModel, `Correct mental model for "${sc.expectedType}"`);
    }
  });

  await test('S3.2: Genuine Popperian falsification condition stringency check', async () => {
    const refutationKeywords = ['若', '则', '证伪', '推翻', '否定', '失效'];
    const testCases = [
      '因果混淆伪迹',
      '缺少基线数据对照',
      '变量并发耦合无法分离',
      '行动停滞虚假忙碌',
      '证实偏差拒绝反例'
    ];

    for (const query of testCases) {
      const art = await slashEngine.executeSlashCommand({ command: '/solve', query });
      const testPlan = art.payload.minimalViableTest || art.payload.diagnosis?.minimalViableTest;
      assert(testPlan !== undefined, `Minimal test plan must be defined for "${query}"`);

      // 1. Timebox requirement: <= 15 minutes
      const estMinutes = testPlan.estMinutes || testPlan.timeboxMinutes || 15;
      assertLessOrEqual(estMinutes, 15, `Minimal test timebox must be <= 15 minutes, got ${estMinutes}`);

      // 2. Popperian falsification condition must exist and be non-empty
      const fCond = testPlan.falsificationCondition;
      assert(typeof fCond === 'string' && fCond.trim().length > 10, `Falsification condition must be substantial, got: "${fCond}"`);

      // 3. Must contain genuine empirical demarcation criteria (If X, then hypothesis H is refuted)
      const hasPopperianDemarcation = refutationKeywords.some(kw => fCond.includes(kw));
      assert(hasPopperianDemarcation, `Falsification condition must contain scientific falsification phrasing, got: "${fCond}"`);
    }
  });

  await test('S3.3: Executable interactive checklist steps synthesis in /solve', async () => {
    const art = await slashEngine.executeSlashCommand({ command: '/solve', query: '信号与噪声耦合严重，无法区分有效刺激' });
    assert(Array.isArray(art.steps), 'Artifact must include steps array');
    assert(art.steps.length >= 3, `Expected >= 3 executable verification steps, got ${art.steps.length}`);

    // Every step must have valid properties
    for (let i = 0; i < art.steps.length; i++) {
      const step = art.steps[i];
      assert(typeof step.id === 'string' && step.id.length > 0, `Step ${i} must have valid id`);
      assert(typeof step.title === 'string' && step.title.length > 0, `Step ${i} must have title`);
      assertEqual(step.completed, false, `Step ${i} starts uncompleted`);
      assertLessOrEqual(step.estMinutes, 15, `Step ${i} estMinutes <= 15`);
    }
  });

  // =========================================================================
  // SUITE 4: /shred 2-Minute Physical Micro-Action Invariant
  // =========================================================================
  console.log(`\n${C.bold}${C.blue}=== Suite 4: /shred 2-Minute Physical Micro-Action Invariant ===${C.reset}`);

  await test('S4.1: Exhaustive verification across 10 diverse macro blocker goals', async () => {
    const macroGoals = [
      '从零构建多因子量化选股高并发回测系统',
      '重构分布式数据库一致性共识Raft算法',
      '解决消费级脑电仪4-8Hz频段前额叶肌电伪迹污染',
      '优化大模型本地推理量化显存占用从16GB降至6GB',
      '排查Node.js微服务在生产环境每隔48小时发生的偶发性OOM内存泄漏',
      '编写科研论文引言段落并系统性梳理30篇前沿文献',
      '从零实现轻量级WebGL三维因果线索图拓扑力导向渲染器',
      '设计支持10万并发长连接的WebSocket现场消息网关',
      '解决跨平台Windows贴附侧边栏在DPI缩放150%时的边缘毛刺问题',
      '排查自动化CI构建流在Windows Runner上的死锁假死问题'
    ];

    const allowedVerbs = ['打开', '运行', '记录', '查看', '搜索', '输入', '查阅', '启动', '执行', '打印', '注释', '对比', '固定'];

    for (const goal of macroGoals) {
      const art = await slashEngine.executeSlashCommand({ command: '/shred', query: goal });
      assertEqual(art.type, 'shred', 'Artifact type is shred');

      // Invariant 1: Strictly 3 physical micro-actions
      assertEqual(art.steps.length, 3, `Goal "${goal.slice(0, 15)}..." must produce strictly 3 steps, got ${art.steps.length}`);

      // Invariant 2: estMinutes <= 2 (2-minute rule)
      for (const step of art.steps) {
        assertLessOrEqual(step.estMinutes, 2, `Step "${step.title}" estMinutes must be <= 2, got ${step.estMinutes}`);
        assertGreaterOrEqual(step.estMinutes, 1, `Step "${step.title}" estMinutes must be >= 1, got ${step.estMinutes}`);

        // Invariant 3: Immediate physical action verb
        const hasVerb = allowedVerbs.some(v => 
          (step.actionVerb && step.actionVerb.includes(v)) ||
          (step.verb && step.verb.includes(v)) ||
          (step.title && step.title.includes(v))
        );
        assert(hasVerb, `Step "${step.title}" must contain an immediate physical verb from allowed list`);
      }
    }
  });

  await test('S4.2: [ADVERSARIAL CHALLENGE] Prerequisite dependency DAG integrity in /shred', async () => {
    const art = await slashEngine.executeSlashCommand({ command: '/shred', query: '前置依赖关系拓扑核查' });
    const step0Id = art.steps[0].id;
    const step1DependsOn = art.steps[1].dependsOn;

    // Check if step 1 dependsOn references the actual ID of step 0
    if (!step1DependsOn.includes(step0Id)) {
      throw new Error(`Dangling Prerequisite Dependency in /shred: Step 1 dependsOn is [${step1DependsOn.join(', ')}], but Step 0 actual ID is "${step0Id}". Dependency graph contains dangling pointers.`);
    }
  });

  // =========================================================================
  // SUITE 5: /plan Roadmap & Vanity Gamification Purge Invariant
  // =========================================================================
  console.log(`\n${C.bold}${C.blue}=== Suite 5: /plan Roadmap & Vanity Gamification Purge Invariant ===${C.reset}`);

  await test('S5.1: /plan phased roadmap structure and dependency graph', async () => {
    const plan = await slashEngine.executeSlashCommand({ command: '/plan', query: '研发分布式日志收集器' });
    assertEqual(plan.type, 'plan', 'Artifact type is plan');
    assert(plan.payload && Array.isArray(plan.payload.phases), 'Plan includes phases array');
    assertEqual(plan.payload.phases.length, 3, 'Plan contains strictly 3 sequenced phases');
    assertEqual(plan.steps.length, 3, 'Plan contains 3 flattened checklist steps');

    // Verify dependencies
    assertEqual(plan.steps[0].dependsOn.length, 0, 'Step 1 has 0 dependencies');
    assertEqual(plan.steps[1].dependsOn[0], plan.steps[0].id, 'Step 2 depends on Step 1');
    assertEqual(plan.steps[2].dependsOn[0], plan.steps[1].id, 'Step 3 depends on Step 2');
  });

  await test('S5.2: Absolute elimination of vanity gamification relics in Artifacts & Store', async () => {
    const forbiddenGamificationTerms = [
      'monsterHealth', 'monsterHp', 'bossHp', 'playerXp', 'totalXp',
      'nextRankXp', 'rankTitle', 'playerLevel', 'comboStreak', 'maxCombo',
      'relicVault', 'droppedRelic', 'lootVault', 'xpReward'
    ];

    // 1. Audit generated artifacts from all command types
    const commands = ['/plan 计划任务', '/shred 粉碎任务', '/solve 诊断任务', '/unknown 未知指令'];
    for (const cmd of commands) {
      const art = await slashEngine.executeSlashCommand(cmd);
      const artJson = JSON.stringify(art);
      for (const term of forbiddenGamificationTerms) {
        assert(!artJson.includes(`"${term}"`), `Artifact for "${cmd}" must not contain gamification key "${term}"`);
      }
    }

    // 2. Audit store playerProfile
    const profile = store.data.playerProfile;
    assert(profile.rankTitle === undefined, 'store.data.playerProfile.rankTitle must be undefined');
    assert(profile.totalXp === undefined, 'store.data.playerProfile.totalXp must be undefined');
    assert(profile.comboStreak === undefined, 'store.data.playerProfile.comboStreak must be undefined');
    assert(profile.relicVault === undefined, 'store.data.playerProfile.relicVault must be undefined');
    assert(typeof profile.completedStepsCount === 'number', 'store.data.playerProfile.completedStepsCount must track authentic work');
  });

  // =========================================================================
  // SUITE 6: Serialization Integrity & High-Resolution Latency Profiling
  // =========================================================================
  console.log(`\n${C.bold}${C.blue}=== Suite 6: Serialization Integrity & High-Resolution Latency Benchmarks ===${C.reset}`);

  await test('S6.1: Markdown serialization with YAML frontmatter header (---) and task lists', async () => {
    const solveArt = await slashEngine.executeSlashCommand({
      command: '/solve',
      query: '信号存在高频伪迹干扰',
      attachments: [{ tag: '@clipboard', type: 'clipboard', content: 'ADC buffer overflow' }]
    });

    const md = artifactExporter.formatArtifactMarkdown(solveArt);
    assert(md.startsWith('---\n'), 'Markdown must start with YAML frontmatter delimiter (---)');
    assert(md.includes('\n---\n'), 'Markdown must close YAML frontmatter with delimiter (---)');
    assert(md.includes('id: ' + solveArt.id), 'Frontmatter includes id');
    assert(md.includes('command: /solve'), 'Frontmatter includes command');
    assert(md.includes('progress: 0%'), 'Frontmatter includes progress');
    assert(md.includes('@clipboard'), 'Includes mounted context tag');
    assert(md.includes('波普尔证伪准则'), 'Includes Popperian falsification condition');
    assert(md.includes('- [ ] **步骤 1'), 'Includes unchecked step');

    // Mutate step 1 to completed and re-serialize
    const tickedArt = slashEngine.mutateArtifactStep(solveArt, solveArt.steps[0].id, true);
    const tickedMd = artifactExporter.formatArtifactMarkdown(tickedArt);
    assert(tickedMd.includes('- [x] **步骤 1'), 'Includes checked step [x]');
    assert(tickedMd.includes('progress: 33%'), 'Frontmatter progress updated to 33%');
  });

  await test('S6.2: Local disk file persistence to artifacts/*.md', async () => {
    const testArt = await slashEngine.executeSlashCommand('/shred 磁盘导出压力测试');
    const tempDir = path.join(__dirname, '..', 'artifacts');
    const res = artifactExporter.exportToDisk(testArt, tempDir);

    assert(res.success === true, 'exportToDisk returns success');
    assert(fs.existsSync(res.filePath), `Exported file must exist at ${res.filePath}`);
    const diskContent = fs.readFileSync(res.filePath, 'utf8');
    assert(diskContent.includes(testArt.id), 'Disk content contains artifact ID');
    assert(diskContent.startsWith('---'), 'Disk content has YAML frontmatter');

    // Clean up test file
    try {
      fs.unlinkSync(res.filePath);
    } catch (e) {}
  });

  await test('S6.3: High-resolution latency profiling benchmarks', async () => {
    // 1. parseSlashCommand (1,000 iterations)
    const parseSamples = [];
    const testInputs = [
      '/plan 重构模块',
      '/shred 排查卡点',
      '/solve 变量混淆',
      '/unknown 参数测试',
      '普通文本描述没有斜杠'
    ];
    for (let i = 0; i < 1000; i++) {
      const inp = testInputs[i % testInputs.length];
      const t0 = performance.now();
      slashEngine.parseSlashCommand(inp);
      parseSamples.push(performance.now() - t0);
    }
    const parseStats = computeStats(parseSamples);
    results.benchmarks['parseSlashCommand'] = parseStats;
    assertLessOrEqual(parseStats.mean, 0.05, `parseSlashCommand mean latency <= 0.05ms, got ${parseStats.mean.toFixed(4)}ms`);

    // 2. /shred execution (100 iterations)
    const shredSamples = [];
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now();
      await slashEngine.executeSlashCommand('/shred 快速基准测试任务');
      shredSamples.push(performance.now() - t0);
    }
    const shredStats = computeStats(shredSamples);
    results.benchmarks['executeSlashCommand_shred'] = shredStats;
    assertLessOrEqual(shredStats.mean, 5.0, `/shred mean latency <= 5.0ms, got ${shredStats.mean.toFixed(2)}ms`);

    // 3. /solve execution (100 iterations)
    const solveSamples = [];
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now();
      await slashEngine.executeSlashCommand('/solve 快速基准排查卡点');
      solveSamples.push(performance.now() - t0);
    }
    const solveStats = computeStats(solveSamples);
    results.benchmarks['executeSlashCommand_solve'] = solveStats;
    assertLessOrEqual(solveStats.mean, 5.0, `/solve mean latency <= 5.0ms, got ${solveStats.mean.toFixed(2)}ms`);

    // 4. mutateArtifactStep (1,000 iterations)
    let sampleArt = await slashEngine.executeSlashCommand('/shred 步进测试');
    const mutateSamples = [];
    const stepId = sampleArt.steps[0].id;
    for (let i = 0; i < 1000; i++) {
      const state = i % 2 === 0;
      const t0 = performance.now();
      sampleArt = slashEngine.mutateArtifactStep(sampleArt, stepId, state);
      mutateSamples.push(performance.now() - t0);
    }
    const mutateStats = computeStats(mutateSamples);
    results.benchmarks['mutateArtifactStep'] = mutateStats;
    assertLessOrEqual(mutateStats.mean, 0.1, `mutateArtifactStep mean latency <= 0.1ms, got ${mutateStats.mean.toFixed(4)}ms`);

    // 5. formatArtifactMarkdown (500 iterations)
    const formatSamples = [];
    for (let i = 0; i < 500; i++) {
      const t0 = performance.now();
      artifactExporter.formatArtifactMarkdown(sampleArt);
      formatSamples.push(performance.now() - t0);
    }
    const formatStats = computeStats(formatSamples);
    results.benchmarks['formatArtifactMarkdown'] = formatStats;
    assertLessOrEqual(formatStats.mean, 0.5, `formatArtifactMarkdown mean latency <= 0.5ms, got ${formatStats.mean.toFixed(4)}ms`);
  });

  // =========================================================================
  // BENCHMARK REPORT
  // =========================================================================
  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}                 HIGH-RESOLUTION LATENCY PROFILING              ${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${'Operation'.padEnd(30)} ${'Mean'.padStart(9)} ${'Median'.padStart(9)} ${'p95'.padStart(9)} ${'p99'.padStart(9)} ${'Max'.padStart(9)} ${'StdDev'.padStart(9)}`);
  console.log('-'.repeat(88));
  for (const [op, s] of Object.entries(results.benchmarks)) {
    console.log(
      `${op.padEnd(30)} ` +
      `${(s.mean.toFixed(3) + 'ms').padStart(9)} ` +
      `${(s.median.toFixed(3) + 'ms').padStart(9)} ` +
      `${(s.p95.toFixed(3) + 'ms').padStart(9)} ` +
      `${(s.p99.toFixed(3) + 'ms').padStart(9)} ` +
      `${(s.max.toFixed(3) + 'ms').padStart(9)} ` +
      `${(s.stdDev.toFixed(3) + 'ms').padStart(9)}`
    );
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}                      EMPIRICAL TEST SUMMARY                    ${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`Total Test Cases   : ${results.totalTests}`);
  console.log(`Passed Test Cases  : ${C.green}${results.passed}${C.reset}`);
  console.log(`Failed Test Cases  : ${results.failed > 0 ? C.red : C.green}${results.failed}${C.reset}`);
  console.log(`Overall Pass Rate  : ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log(`\n${C.red}${C.bold}FAILURES DETAIL (${results.failed}):${C.reset}`);
    results.failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}) ${f.name}`);
      console.log(`     ${f.error}`);
    });
    console.log(`\n${C.red}${C.bold}VERDICT: REJECT${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bold}✓ ALL EMPIRICAL STRESS TESTS PASSED WITH ZERO FAILURES.${C.reset}`);
    console.log(`${C.green}${C.bold}VERDICT: APPROVE${C.reset}\n`);
    process.exit(0);
  }
}

if (require.main === module) {
  runAllSuites().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAllSuites };
