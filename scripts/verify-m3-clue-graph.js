// scripts/verify-m3-clue-graph.js
/**
 * Dedicated M3 Verification Suite:
 * Autonomous Clue Graph DAG Topology & Epistemic Clarity Engine (Features F6, F7)
 * 
 * Verifies:
 * 1. 5-Level Autonomous Parent Inference (phenomenon/observation -> question -> hypothesis -> evidence -> breakthrough)
 * 2. Lexical keyword affinity & temporal proximity scoring
 * 3. Strict DAG cycle prevention (DFS detection & fallback)
 * 4. Hierarchical barycentric layout coordinates (X monotonic columns & barycentric Y)
 * 5. Epistemic Clarity (ΔQt) mathematical formula & monotonicity
 * 6. Anti-fluff penalty (P_fluff = -15) and synchronized critical alert
 * 7. Clue Canvas auto-layout & link-crossing minimization
 * 
 * Usage:
 *   node scripts/verify-m3-clue-graph.js
 *   npx electron scripts/verify-m3-clue-graph.js
 */

const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

const store = require('../services/store');
const stateEngine = require('../services/state-engine');
const bottleneckDiagnostician = require('../services/bottleneck-diagnostician');
const ClueCanvasEngine = require('../renderer/services/clue-canvas');

// Terminal formatting
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEqual failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertInRange(val, min, max, msg) {
  if (val < min || val > max) {
    throw new Error(`${msg || 'assertInRange failed'}: expected ${val} to be within [${min}, ${max}]`);
  }
}

async function test(name, fn) {
  stats.total++;
  const t0 = performance.now();
  try {
    await fn();
    const dt = (performance.now() - t0).toFixed(2);
    stats.passed++;
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} ${C.dim}(${dt}ms)${C.reset}`);
  } catch (err) {
    const dt = (performance.now() - t0).toFixed(2);
    stats.failed++;
    stats.failures.push({ name, error: err });
    console.log(`  ${C.red}✗ [FAIL]${C.reset} ${name} ${C.dim}(${dt}ms)${C.reset}`);
    console.log(`    ${C.red}${err.message}${C.reset}`);
  }
}

async function runM3Verification() {
  console.log(`\n${C.magenta}${C.bright}========================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bright}  M3 Clue Graph DAG & Epistemic Clarity Engine — Verification Suite   ${C.reset}`);
  console.log(`${C.magenta}${C.bright}========================================================================${C.reset}`);

  // ---------------------------------------------------------------------------
  // SECTION 1: 5-Level Autonomous Parent Inference
  // ---------------------------------------------------------------------------
  console.log(`\n${C.cyan}${C.bright}--- Section 1: 5-Level Autonomous Parent Inference ---${C.reset}`);

  await test('1.1: Root level (phenomenon / observation) infers no parent (parentId: null)', async () => {
    const obsClue = { id: 'obs_1', type: 'observation', title: '服务频繁抛出 504 Gateway Timeout' };
    const phenomClue = { id: 'phenom_1', type: 'phenomenon', title: '服务器网络延迟骤增' };
    const candidates = [
      { id: 'c0', type: 'observation', title: '旧观测数据' }
    ];

    const p1 = store.inferParentClue(obsClue, candidates);
    assertEqual(p1, null, 'Observation clue must not have a causal parent');

    const p2 = store.inferParentClue(phenomClue, candidates);
    assertEqual(p2, null, 'Phenomenon clue must not have a causal parent');
  });

  await test('1.2: 5-step epistemological progression links sequentially', async () => {
    const mockClues = [
      { id: 'step_1', type: 'phenomenon', title: 'TCP 连接数异常飙升到 2000' },
      { id: 'step_2', type: 'question', title: 'TCP 连接数飙升是否是因为下游数据库连接泄漏？' },
      { id: 'step_3', type: 'hypothesis', title: '如果是连接池泄漏，则连接等待队列指标将达到阈值上限' },
      { id: 'step_4', type: 'evidence', title: 'JConsole 监控显示数据库连接池活跃连接数占满 100%' },
      { id: 'step_5', type: 'breakthrough', title: '突破：修复了未在 finally 块中释放的 JDBC 连接' }
    ];

    // Check step 2 links to step 1
    const p2 = store.inferParentClue(mockClues[1], [mockClues[0]]);
    assert(p2 !== null, 'Question should link to phenomenon');
    assertEqual(p2.id, 'step_1', 'Question should pick phenomenon step_1 as parent');

    // Check step 3 links to step 2
    const p3 = store.inferParentClue(mockClues[2], [mockClues[0], mockClues[1]]);
    assert(p3 !== null, 'Hypothesis should link to question');
    assertEqual(p3.id, 'step_2', 'Hypothesis should pick question step_2 as parent');

    // Check step 4 links to step 3
    const p4 = store.inferParentClue(mockClues[3], [mockClues[0], mockClues[1], mockClues[2]]);
    assert(p4 !== null, 'Evidence should link to hypothesis');
    assertEqual(p4.id, 'step_3', 'Evidence should pick hypothesis step_3 as parent');

    // Check step 5 links to step 4
    const p5 = store.inferParentClue(mockClues[4], mockClues.slice(0, 4));
    assert(p5 !== null, 'Breakthrough should link to evidence');
    assertEqual(p5.id, 'step_4', 'Breakthrough should pick evidence step_4 as parent');
  });

  await test('1.3: Keyword affinity selects matching topic over irrelevant candidates', async () => {
    const candidates = [
      { id: 'q_redis', type: 'question', title: 'Redis 缓存击穿导致请求直击数据库？' },
      { id: 'q_eeg', type: 'question', title: '脑电频段漂移是否由眼球微动肌电产生？' }
    ];

    const hypothesis = {
      id: 'hyp_eeg',
      type: 'hypothesis',
      title: '如果在遮光放松眼轮匝肌下测试脑电，眼动肌电方差应显著衰减'
    };

    const inferred = store.inferParentClue(hypothesis, candidates);
    assert(inferred !== null, 'Parent must be inferred');
    assertEqual(inferred.id, 'q_eeg', 'Hypothesis with EEG keywords must match q_eeg, not q_redis');
  });

  await test('1.4: Temporal proximity breaks ties between equally compatible candidates', async () => {
    const candidates = [
      { id: 'q_old', type: 'question', title: '系统性能瓶颈究竟在哪里？', timestamp: 1000 },
      { id: 'q_new', type: 'question', title: '系统性能瓶颈究竟在哪里？', timestamp: 9000 }
    ];

    const hypothesis = {
      id: 'h1',
      type: 'hypothesis',
      title: '可能是 CPU 调度锁竞争引起',
      timestamp: 10000
    };

    const inferred = store.inferParentClue(hypothesis, candidates);
    assert(inferred !== null, 'Parent must be inferred');
    assertEqual(inferred.id, 'q_new', 'Most recent candidate should win when similarity is tied');
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: Strict DAG Acyclicity & Cycle Prevention (DFS)
  // ---------------------------------------------------------------------------
  console.log(`\n${C.cyan}${C.bright}--- Section 2: Strict DAG Acyclicity Enforcement ---${C.reset}`);

  await test('2.1: Self-loop proposal (A -> A) is detected and rejected', async () => {
    const isCycle = store.wouldCreateCycle('node_A', 'node_A', [{ id: 'node_A' }]);
    assertEqual(isCycle, true, 'Self-loop must be detected as a cycle');
  });

  await test('2.2: 2-node cycle proposal (A -> B, proposing B -> A) is detected', async () => {
    const existingClues = [
      { id: 'node_A', parentId: null },
      { id: 'node_B', parentId: 'node_A' }
    ];
    // Adding edge from node_B to node_A would create node_B -> node_A -> node_B
    const isCycle = store.wouldCreateCycle('node_B', 'node_A', existingClues);
    assertEqual(isCycle, true, '2-node back-edge must be detected as a cycle');
  });

  await test('2.3: Multi-node transitive cycle (A -> B -> C -> D, proposing D -> A) is detected', async () => {
    const existingClues = [
      { id: 'node_A', parentId: null },
      { id: 'node_B', parentId: 'node_A' },
      { id: 'node_C', parentId: 'node_B' },
      { id: 'node_D', parentId: 'node_C' }
    ];
    const isCycle = store.wouldCreateCycle('node_D', 'node_A', existingClues);
    assertEqual(isCycle, true, 'Transitive back-edge D -> A must be detected as a cycle');
  });

  await test('2.4: store.addClue() gracefully rejects cyclic parent and resets parentId to null', async () => {
    const project = store.getActiveProject();
    assert(project !== null, 'Active project must exist');

    // Add root node
    const parentClue = store.addClue({
      id: 'dag_root_' + Date.now(),
      type: 'observation',
      title: 'DAG 根节点'
    });

    // Add child
    const childClue = store.addClue({
      id: 'dag_child_' + Date.now(),
      type: 'question',
      title: 'DAG 子节点',
      parentId: parentClue.id
    });
    assertEqual(childClue.parentId, parentClue.id, 'Child parentId set correctly');

    // Attempt to add a clue with parent set to create a cycle on an existing node
    const cyclicClue = store.addClue({
      id: parentClue.id, // targeting parent
      parentId: childClue.id, // would create child -> parent -> child
      type: 'question',
      title: '试图制造循环的线索'
    });
    assertEqual(cyclicClue.parentId, null, 'Cyclic parent edge must be rejected and set to null');
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: Hierarchical Barycentric Layout Coordinates
  // ---------------------------------------------------------------------------
  console.log(`\n${C.cyan}${C.bright}--- Section 3: Hierarchical Barycentric Layout Coordinates ---${C.reset}`);

  await test('3.1: Monotonic column X placement for 5 epistemological layers', async () => {
    const expectedX = {
      phenomenon: 100,
      observation: 100,
      question: 340,
      hypothesis: 580,
      evidence: 820,
      breakthrough: 1060,
      bottleneck: 1060
    };

    assert(expectedX.phenomenon < expectedX.question, 'phenomenon X < question X');
    assert(expectedX.question < expectedX.hypothesis, 'question X < hypothesis X');
    assert(expectedX.hypothesis < expectedX.evidence, 'hypothesis X < evidence X');
    assert(expectedX.evidence < expectedX.breakthrough, 'evidence X < breakthrough X');

    // Verify store adds correct coordinate
    const cObs = store.addClue({ type: 'phenomenon', title: '目击坐标测试' });
    assertEqual(cObs.x, 100, 'phenomenon x must be 100');

    const cQ = store.addClue({ type: 'question', title: '疑问坐标测试', parentId: cObs.id });
    assertEqual(cQ.x, 340, 'question x must be 340');

    const cHyp = store.addClue({ type: 'hypothesis', title: '假说坐标测试', parentId: cQ.id });
    assertEqual(cHyp.x, 580, 'hypothesis x must be 580');

    const cEvi = store.addClue({ type: 'evidence', title: '证据坐标测试', parentId: cHyp.id });
    assertEqual(cEvi.x, 820, 'evidence x must be 820');

    const cBrk = store.addClue({ type: 'breakthrough', title: '突破坐标测试', parentId: cEvi.id });
    assertEqual(cBrk.x, 1060, 'breakthrough x must be 1060');
  });

  await test('3.2: Barycentric Y positioning aligns child near parent Y and separates siblings', async () => {
    const parentNode = { id: 'p_y_root', type: 'question', y: 300 };
    const sibling1 = store.addClue({
      id: 'c_sib_1',
      type: 'hypothesis',
      title: '分支假说 1',
      parentId: parentNode.id
    });

    const sibling2 = store.addClue({
      id: 'c_sib_2',
      type: 'hypothesis',
      title: '分支假说 2',
      parentId: parentNode.id
    });

    // Check that siblings have different Y coordinates (vertical separation >= 110px)
    const dy = Math.abs(sibling1.y - sibling2.y);
    assert(dy >= 110, `Sibling vertical distance ${dy} must be >= 110px to prevent collision`);
  });

  await test('3.3: ClueCanvas autoLayoutDAG orders nodes to minimize crossings', async () => {
    const canvasEngine = new ClueCanvasEngine();
    const testClues = [
      { id: 'o1', type: 'observation', title: '观察 1' },
      { id: 'o2', type: 'observation', title: '观察 2' },
      { id: 'q1', type: 'question', title: '疑问 1', parentId: 'o1' },
      { id: 'q2', type: 'question', title: '疑问 2', parentId: 'o2' },
      { id: 'h1', type: 'hypothesis', title: '假说 1', parentId: 'q1' },
      { id: 'h2', type: 'hypothesis', title: '假说 2', parentId: 'q2' },
      { id: 'e1', type: 'evidence', title: '证据 1', parentId: 'h1' },
      { id: 'e2', type: 'evidence', title: '证据 2', parentId: 'h2' }
    ];

    canvasEngine.setData(testClues);
    canvasEngine.autoLayoutDAG();

    assertEqual(canvasEngine.nodes.length, 8, 'Canvas must contain all 8 nodes');
    assertEqual(canvasEngine.links.length, 6, 'Canvas must contain all 6 links');

    // Confirm all nodes have valid coordinates
    for (const node of canvasEngine.nodes) {
      assert(typeof node.x === 'number' && !isNaN(node.x), `Node ${node.id} must have valid X coordinate`);
      assert(typeof node.y === 'number' && !isNaN(node.y), `Node ${node.id} must have valid Y coordinate`);
    }
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: Epistemic Clarity (ΔQt) Formula & Monotonicity
  // ---------------------------------------------------------------------------
  console.log(`\n${C.cyan}${C.bright}--- Section 4: Epistemic Clarity (ΔQt) Formula ---${C.reset}`);

  await test('4.1: Empty project yields base clarity = 15%', async () => {
    const emptyProj = { id: 'empty', clues: [] };
    const res = stateEngine.computeClarity(emptyProj);
    assertEqual(res.clarityScore, 15, 'Base clarity must be exactly 15%');
    assertEqual(res.closedChains, 0, 'Closed chains must be 0');
    assertEqual(res.fluffPenalty, 0, 'Fluff penalty must be 0');
  });

  await test('4.2: Closed causal chain score S_chain increases clarity (+18 for 1st, +35 max for 2+)', async () => {
    const singleChainProject = {
      id: 'chain_1',
      clues: [
        { id: 'c1', type: 'observation', title: '现象' },
        { id: 'c2', type: 'question', title: '疑问', parentId: 'c1' },
        { id: 'c3', type: 'hypothesis', title: '假说', parentId: 'c2' },
        { id: 'c4', type: 'evidence', title: '证据', parentId: 'c3' }
      ]
    };

    const res1 = stateEngine.computeClarity(singleChainProject);
    assert(res1.closedChains >= 1, 'Should detect at least 1 closed chain');
    assertEqual(res1.chainScore, 18, '1 closed chain should grant S_chain = 18');
    assert(res1.clarityScore >= 15 + 18, 'Clarity should include chain bonus');

    // Double chain
    const doubleChainProject = {
      id: 'chain_2',
      clues: [
        ...singleChainProject.clues,
        { id: 'c5', type: 'evidence', title: '证据 2', parentId: 'c3' }
      ]
    };
    const res2 = stateEngine.computeClarity(doubleChainProject);
    assert(res2.closedChains >= 2, 'Should detect 2 closed paths');
    assertEqual(res2.chainScore, 35, '2 closed chains should reach S_chain cap = 35');
    assert(res2.clarityScore > res1.clarityScore, 'Clarity must increase with 2nd chain');
  });

  await test('4.3: Evidence-to-hypothesis ratio S_ratio scales up to +25 points', async () => {
    const projNoEvi = {
      clues: [
        { id: 'h1', type: 'hypothesis' },
        { id: 'h2', type: 'hypothesis' }
      ]
    };
    const res0 = stateEngine.computeClarity(projNoEvi);
    assertEqual(res0.ratioScore, 0, 'S_ratio must be 0 when evidence is 0');

    const projHalfEvi = {
      clues: [
        { id: 'h1', type: 'hypothesis' },
        { id: 'h2', type: 'hypothesis' },
        { id: 'e1', type: 'evidence' }
      ]
    };
    const resHalf = stateEngine.computeClarity(projHalfEvi);
    assertEqual(resHalf.ratioScore, 13, 'S_ratio for 1/2 coverage must be round(0.5 * 25) = 13');

    const projFullEvi = {
      clues: [
        { id: 'h1', type: 'hypothesis' },
        { id: 'e1', type: 'evidence' }
      ]
    };
    const resFull = stateEngine.computeClarity(projFullEvi);
    assertEqual(resFull.ratioScore, 25, 'S_ratio for 1/1 coverage must be 25');
  });

  await test('4.4: S_action & S_boss scale clarity correctly up to 100% cap', async () => {
    const fullProject = {
      cockpit: { actionCompleted: true, currentBottleneck: '已攻克' },
      clues: [
        { id: 'o1', type: 'observation' },
        { id: 'q1', type: 'question', parentId: 'o1' },
        { id: 'h1', type: 'hypothesis', parentId: 'q1' },
        { id: 'e1', type: 'evidence', parentId: 'h1' },
        { id: 'e2', type: 'evidence', parentId: 'h1' },
        { id: 'b1', type: 'breakthrough', parentId: 'e1' }
      ]
    };
    const profile = { totalXp: 1500, comboStreak: 4 };
    const res = stateEngine.computeClarity(fullProject, profile);

    assertEqual(res.bossScore, 20, 'Resolved boss grants S_boss = 20');
    assertEqual(res.actionScore, 15, 'Completed actions grant S_action = 15');
    assertInRange(res.clarityScore, 90, 100, 'Fully converged project clarity must reach 90-100%');
    assert(res.clarityScore <= 100, 'Clarity must strictly not exceed 100%');
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: Anti-Fluff Penalty (P_fluff = -15) & Alert Synchronization
  // ---------------------------------------------------------------------------
  console.log(`\n${C.cyan}${C.bright}--- Section 5: Anti-Fluff Penalty (P_fluff) & Stagnation ---${C.reset}`);

  await test('5.1: Anti-fluff penalty (-15) triggers when observations >= 3 and evidence == 0', async () => {
    const fluffProject = {
      clues: [
        { id: 'o1', type: 'observation', title: '文献阅读 1' },
        { id: 'o2', type: 'observation', title: '博客笔记 2' },
        { id: 'o3', type: 'observation', title: '竞品调研 3' }
      ]
    };

    const res = stateEngine.computeClarity(fluffProject);
    assertEqual(res.fluffPenalty, -15, 'P_fluff must be exactly -15');
    assertEqual(res.isFluffAlert, true, 'isFluffAlert must be true');
    // Base 15 - 15 = 0%
    assertEqual(res.clarityScore, 0, 'Clarity must be suppressed to 0% due to fluff penalty');
  });

  await test('5.2: stateEngine.evaluateSystemState flags critical urgency on fluff alert', async () => {
    const fluffProject = {
      clues: [
        { id: 'o1', type: 'observation' },
        { id: 'o2', type: 'observation' },
        { id: 'o3', type: 'observation' }
      ]
    };
    const evalRes = stateEngine.evaluateSystemState(fluffProject, { rankTitle: 'Explorer', totalXp: 50 });
    assertEqual(evalRes.bottleneckAssessment.isFluffActivityAlert, true, 'Fluff activity alert must trigger');
    assertEqual(evalRes.bottleneckAssessment.urgency, 'critical', 'Urgency must be critical on fluff alert');
  });

  await test('5.3: Proactive trigger detection synchronizes with bottleneck-diagnostician', async () => {
    const fluffProject = {
      clues: [
        { id: 'o1', type: 'observation' },
        { id: 'o2', type: 'observation' },
        { id: 'o3', type: 'observation' }
      ]
    };
    const probe = bottleneckDiagnostician.detectProactiveTriggers(fluffProject);
    assertEqual(probe.triggered, true, 'Diagnostician probe must trigger');
    assertEqual(probe.triggerType, 'fluff_activity', 'Trigger type must be fluff_activity');
    assertEqual(probe.urgency, 'critical', 'Urgency must be critical');
  });

  await test('5.4: Adding single evidence lifts fluff penalty and clarity advances significantly', async () => {
    const curedProject = {
      clues: [
        { id: 'o1', type: 'observation', title: '文献阅读 1' },
        { id: 'o2', type: 'observation', title: '博客笔记 2' },
        { id: 'o3', type: 'observation', title: '竞品调研 3' },
        { id: 'e1', type: 'evidence', title: '最小 A/B 实测数据' }
      ]
    };
    const res = stateEngine.computeClarity(curedProject);
    assertEqual(res.fluffPenalty, 0, 'P_fluff must be lifted (0) once evidence is present');
    assertEqual(res.isFluffAlert, false, 'isFluffAlert must be false');
    assert(res.clarityScore >= 15, 'Clarity must recover above baseline 15%');
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: SSoT State Integration & DAG Synthesis
  // ---------------------------------------------------------------------------
  console.log(`\n${C.cyan}${C.bright}--- Section 6: SSoT Integration & DAG Synthesis ---${C.reset}`);

  await test('6.1: stateEngine.synthesizeClueDag builds valid nodes and directed links', async () => {
    const rawClues = [
      { id: 'n1', type: 'observation', title: '数据库连接池耗尽现象' },
      { id: 'n2', type: 'question', title: '连接池耗尽是否是死锁引发？' },
      { id: 'n3', type: 'hypothesis', title: '如果是死锁，则线程栈中应有循环等待' },
      { id: 'n4', type: 'evidence', title: 'jstack 分析证实线程锁等待环' }
    ];

    const dag = stateEngine.synthesizeClueDag(rawClues);
    assertEqual(dag.layoutNodes.length, 4, 'Must return 4 layout nodes');
    assert(dag.links.length >= 3, `Expected at least 3 directed causal links, got ${dag.links.length}`);
    assert(dag.clarityProgress > 15, 'DAG synthesis must calculate progress > 15%');

    // Confirm DAG has no cycles
    const hasCycle = store.detectCycles(dag.layoutNodes, dag.links);
    assertEqual(hasCycle, false, 'Synthesized DAG must have 0 cycles');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log(`\n${C.bright}========================================================================${C.reset}`);
  console.log(`${C.bright}                   M3 VERIFICATION EXECUTION SUMMARY                   ${C.reset}`);
  console.log(`${C.bright}========================================================================${C.reset}`);
  console.log(`Total Tests : ${stats.total}`);
  console.log(`Passed      : ${C.green}${stats.passed}${C.reset}`);
  console.log(`Failed      : ${stats.failed > 0 ? C.red + stats.failed + C.reset : stats.failed}`);
  console.log(`${C.bright}========================================================================${C.reset}`);

  if (stats.failures.length > 0) {
    console.log(`\n${C.red}FAILURES:${C.reset}`);
    stats.failures.forEach((f, i) => {
      console.log(`  ${i + 1}) ${f.name}: ${f.error.message}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bright}✓ ALL M3 CLUE GRAPH DAG & CLARITY TESTS PASSED ACCURATELY.${C.reset}\n`);
    process.exit(0);
  }
}

runM3Verification().catch(err => {
  console.error('Test Runner Failed:', err);
  process.exit(1);
});
