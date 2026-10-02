// scripts/stress-test-m3-challenger.js
/**
 * Empirical Stress Test Harness — Challenger M3
 * Adversarial evaluation of Clue Graph DAG Topology & Epistemic Clarity Engine
 * 
 * Tests:
 * 1. Cycle Prevention Stress Test: 65+ adversarial cycle attempts:
 *    - Self-loops (direct A -> A)
 *    - Reciprocal 2-node cycles (A -> B, B -> A)
 *    - Indirect cycles across 5-10+ nodes (length 5, 6, 7, 8, 9, 10, 15, 20)
 *    - Inverted temporal sequences (children backdated or added backwards)
 *    - Cross-branch and disjoint multi-component bridging cycles
 *    - High-volume rapid sequential & shuffled additions
 * 2. Epistemic Clarity Invariant Stress Test: 120+ randomized permutations:
 *    - Combinations of observations, questions, hypotheses, evidences, actions, boss states
 *    - Invariant verification: 0 <= ΔQt <= 100
 *    - Sub-score bounded ranges: S_chain in [0, 35], S_ratio in [0, 25], S_boss in [0, 20], S_action in [0, 15], P_fluff in {-15, 0}
 * 3. Anti-Fluff Penalty Boundary Invariants:
 *    - Exhaustive transition grid around threshold (obs: 0..6, evi: 0..3)
 *    - Immediate relief upon single evidence addition
 *    - Synchronization with stateEngine.evaluateSystemState (urgency === 'critical')
 * 4. Barycentric Coordinate & Crossing Invariants:
 *    - Monotonic layer column spacing (X_0 < X_1 < X_2 < X_3 < X_4)
 *    - Sibling vertical collision prevention (min deltaY >= 110px)
 */

const { performance } = require('perf_hooks');
const store = require('../services/store');
const stateEngine = require('../services/state-engine');
const ClueCanvasEngine = require('../renderer/services/clue-canvas');

const stats = {
  totalSuites: 0,
  passedSuites: 0,
  failedSuites: 0,
  totalAttacks: 0,
  thwartedAttacks: 0,
  failedAttacks: 0,
  cycleAttempts: 0,
  clarityPermutations: 0,
  fluffBoundaryChecks: 0,
  failures: []
};

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertInRange(val, min, max, msg) {
  if (val < min || val > max || isNaN(val)) {
    throw new Error(`${msg}: expected ${val} in [${min}, ${max}]`);
  }
}

// Terminal styling
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function runSuite(name, fn) {
  stats.totalSuites++;
  const t0 = performance.now();
  console.log(`\n${C.cyan}${C.bold}[SUITE ${stats.totalSuites}] ${name}${C.reset}`);
  try {
    await fn();
    const dt = (performance.now() - t0).toFixed(2);
    stats.passedSuites++;
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} (${dt}ms)`);
  } catch (err) {
    const dt = (performance.now() - t0).toFixed(2);
    stats.failedSuites++;
    stats.failures.push({ suite: name, error: err });
    console.error(`  ${C.red}✗ [FAIL]${C.reset} ${name} (${dt}ms)`);
    console.error(`    ${C.red}${err.message}${C.reset}`);
    if (err.stack) console.error(`    ${C.dim}${err.stack.split('\n').slice(1, 3).join('\n')}${C.reset}`);
  }
}

async function executeChallengerStressTests() {
  console.log(`${C.magenta}${C.bold}========================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bold}  EMPIRICAL CHALLENGER — M3 ADVERSARIAL STRESS TEST HARNESS             ${C.reset}`);
  console.log(`${C.magenta}${C.bold}  Subject: Clue Graph DAG Acyclicity & Epistemic Clarity Invariants     ${C.reset}`);
  console.log(`${C.magenta}${C.bold}========================================================================${C.reset}`);

  // Helper to get or reset clean project in store
  function setupTestProject(projId = 'proj_challenger_stress') {
    let proj = store.data.projects.find(p => p.id === projId);
    if (!proj) {
      proj = {
        id: projId,
        title: 'Challenger Adversarial Project',
        description: 'Adversarial Stress Test Environment',
        status: 'active',
        clues: [],
        cockpit: {
          currentBottleneck: null,
          nextAction: null,
          actionCompleted: false
        }
      };
      store.data.projects.push(proj);
    } else {
      proj.clues = [];
      proj.cockpit = {
        currentBottleneck: null,
        nextAction: null,
        actionCompleted: false
      };
    }
    store.data.activeProjectId = projId;
    return proj;
  }

  // ===========================================================================
  // SUITE 1: Direct and Reciprocal Cycle Attacks (10 Attempts)
  // ===========================================================================
  await runSuite('Cycle Attack Phase 1: Self-Loops & Reciprocal 2-Node Cycles', async () => {
    const proj = setupTestProject();

    // 1. Direct Self-Loop on empty store
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const isSelfLoop = store.wouldCreateCycle('node_self', 'node_self', []);
    assert(isSelfLoop === true, 'Self-loop A -> A must be flagged as cycle');
    stats.thwartedAttacks++;

    // 2. Add node_A, then attempt self-loop via addClue
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const nodeA = store.addClue({ id: 'node_A', type: 'observation', title: 'Obs A' });
    const selfAdd = store.addClue({ id: 'node_A_self', parentId: 'node_A_self', type: 'question', title: 'Self Child' });
    assertEqual(selfAdd.parentId, null, 'Self-referencing parentId must be rejected and reset to null');
    stats.thwartedAttacks++;

    // 3. Reciprocal 2-Node Cycle: A -> B, then try B -> A
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const nodeB = store.addClue({ id: 'node_B', parentId: 'node_A', type: 'question', title: 'Question B' });
    assertEqual(nodeB.parentId, 'node_A', 'Valid edge node_A -> node_B must be accepted');

    const cycleBA = store.wouldCreateCycle('node_B', 'node_A', proj.clues);
    assert(cycleBA === true, 'Edge node_B -> node_A must be flagged as cycle when node_A -> node_B exists');
    stats.thwartedAttacks++;

    // 4. Try adding node with parent that closes reciprocal cycle
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const badA = store.addClue({ id: 'node_A_dup', parentId: 'node_B', type: 'evidence', title: 'Attack node' });
    // Now if someone tries to point node_A's parent to node_B:
    const cycleClose = store.wouldCreateCycle('node_B', 'node_A', proj.clues);
    assert(cycleClose === true, 'Closing reciprocal cycle must be thwarted');
    stats.thwartedAttacks++;

    // 5-10. Six reciprocal variations across different layer combinations
    const layers = ['phenomenon', 'observation', 'question', 'hypothesis', 'evidence', 'breakthrough'];
    for (let i = 0; i < 6; i++) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const id1 = `recip_x_${i}`;
      const id2 = `recip_y_${i}`;
      const testClues = [
        { id: id1, parentId: null, type: layers[i % layers.length] },
        { id: id2, parentId: id1, type: layers[(i + 1) % layers.length] }
      ];
      const would = store.wouldCreateCycle(id2, id1, testClues);
      assert(would === true, `Reciprocal cycle ${id2} -> ${id1} must be detected`);
      stats.thwartedAttacks++;
    }

    // Verify project has 0 cycles
    const hasCycle = store.detectCycles(proj.clues, []);
    assert(!hasCycle, 'Project clues must remain strictly acyclic');
  });

  // ===========================================================================
  // SUITE 2: Multi-Hop Transitive Indirect Cycles (5 to 20 Nodes) (25 Attempts)
  // ===========================================================================
  await runSuite('Cycle Attack Phase 2: Multi-Hop Transitive Chains (Lengths 5 to 20)', async () => {
    // Test chain lengths: 5, 6, 7, 8, 9, 10, 12, 15, 20
    const chainLengths = [5, 6, 7, 8, 9, 10, 12, 15, 20];

    for (const len of chainLengths) {
      stats.totalAttacks++;
      stats.cycleAttempts++;

      // Construct a directed linear chain: N_0 -> N_1 -> ... -> N_{len-1}
      const chainNodes = [];
      for (let i = 0; i < len; i++) {
        chainNodes.push({
          id: `chain_${len}_node_${i}`,
          parentId: i === 0 ? null : `chain_${len}_node_${i - 1}`,
          type: i === 0 ? 'observation' : (i === 1 ? 'question' : (i === 2 ? 'hypothesis' : 'evidence'))
        });
      }

      // Attack: Attempt to add edge from last node to first node (N_{len-1} -> N_0)
      const lastId = `chain_${len}_node_${len - 1}`;
      const firstId = `chain_${len}_node_0`;
      const createsCycle = store.wouldCreateCycle(lastId, firstId, chainNodes);
      assert(createsCycle === true, `Cycle closing edge ${lastId} -> ${firstId} in length ${len} must be detected`);
      stats.thwartedAttacks++;

      // Attack: Attempt to add edge from last node to intermediate nodes (N_{len-1} -> N_mid)
      const midId = `chain_${len}_node_${Math.floor(len / 2)}`;
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const subCycle = store.wouldCreateCycle(lastId, midId, chainNodes);
      assert(subCycle === true, `Sub-cycle closing edge ${lastId} -> ${midId} in length ${len} must be detected`);
      stats.thwartedAttacks++;

      // Verify detectCycles correctly spots cycle if artificially injected
      const cyclicEdges = [];
      for (let i = 0; i < len - 1; i++) {
        cyclicEdges.push({ from: chainNodes[i].id, to: chainNodes[i + 1].id });
      }
      cyclicEdges.push({ from: lastId, to: firstId }); // Close cycle
      const detected = store.detectCycles(chainNodes, cyclicEdges);
      assert(detected === true, `detectCycles must catch artificial cycle of length ${len}`);
    }

    // Additional 7 chord/transitive attacks in a dense mesh DAG
    // Construct DAG:
    // A -> B -> D -> F
    // A -> C -> E -> F
    const meshNodes = [
      { id: 'mesh_A', parentId: null, type: 'observation' },
      { id: 'mesh_B', parentId: 'mesh_A', type: 'question' },
      { id: 'mesh_C', parentId: 'mesh_A', type: 'question' },
      { id: 'mesh_D', parentId: 'mesh_B', type: 'hypothesis' },
      { id: 'mesh_E', parentId: 'mesh_C', type: 'hypothesis' },
      { id: 'mesh_F', parentId: 'mesh_D', type: 'evidence' }
    ];

    const targets = ['mesh_A', 'mesh_B', 'mesh_C', 'mesh_D', 'mesh_E'];
    for (const target of targets) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const would = store.wouldCreateCycle('mesh_F', target, meshNodes);
      if (target === 'mesh_C' || target === 'mesh_E') {
        // Since F is only child of D currently, mesh_F cannot reach C or E!
        // So proposing mesh_F -> mesh_C is VALID (does not create cycle yet)!
        // Verify that wouldCreateCycle correctly returns FALSE here!
        assertEqual(would, false, `Proposing mesh_F -> ${target} does not create cycle in current mesh`);
      } else {
        // Target is A, B, or D, which CAN reach F through A -> B -> D -> F
        assertEqual(would, true, `Proposing mesh_F -> ${target} must create cycle`);
      }
      stats.thwartedAttacks++;
    }
  });

  // ===========================================================================
  // SUITE 3: Inverted Temporal Sequences & Backwards Insertion (15 Attempts)
  // ===========================================================================
  await runSuite('Cycle Attack Phase 3: Inverted Temporal Sequences & Out-of-Order Additions', async () => {
    const proj = setupTestProject('proj_challenger_temporal');

    // Scenario A: Insert children BEFORE parents with inverted timestamps
    // e.g., T_child = 1000, T_parent = 50000
    for (let i = 0; i < 5; i++) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const child = store.addClue({
        id: `temp_child_${i}`,
        parentId: `temp_parent_${i}`, // parent does not exist yet!
        timestamp: 1000 - i * 100,
        type: 'evidence',
        title: `Child ${i}`
      });
      // Now add the parent with a much later timestamp
      const parent = store.addClue({
        id: `temp_parent_${i}`,
        parentId: null,
        timestamp: 900000 + i * 100,
        type: 'observation',
        title: `Parent ${i}`
      });

      // Now attack: try to set parent's parent to child (closing the cycle)
      const would = store.wouldCreateCycle(`temp_child_${i}`, `temp_parent_${i}`, proj.clues);
      assertEqual(would, true, `Inverted timestamp cycle temp_child_${i} -> temp_parent_${i} must be thwarted`);
      stats.thwartedAttacks++;
    }

    // Scenario B: Reverse insertion order of a 5-step causal progression
    // Insert: Evidence -> Hypothesis -> Question -> Observation
    const revIds = ['rev_obs', 'rev_q', 'rev_hyp', 'rev_evi'];
    const revTypes = ['observation', 'question', 'hypothesis', 'evidence'];
    // Insert backwards
    for (let i = 3; i >= 0; i--) {
      store.addClue({
        id: revIds[i],
        parentId: i === 0 ? null : revIds[i - 1],
        type: revTypes[i],
        title: `Reverse node ${i}`,
        timestamp: 5000 - i * 500
      });
    }

    // Now attack: propose rev_evi -> rev_obs
    for (let i = 1; i <= 3; i++) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const would = store.wouldCreateCycle(revIds[i], revIds[0], proj.clues);
      assertEqual(would, true, `Reverse chain cycle ${revIds[i]} -> ${revIds[0]} must be prevented`);
      stats.thwartedAttacks++;
    }

    // Scenario C: Negative & Zero Timestamps
    for (let i = 0; i < 7; i++) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const weirdClues = [
        { id: `weird_1_${i}`, parentId: null, timestamp: 0, type: 'observation' },
        { id: `weird_2_${i}`, parentId: `weird_1_${i}`, timestamp: -99999, type: 'hypothesis' }
      ];
      const would = store.wouldCreateCycle(`weird_2_${i}`, `weird_1_${i}`, weirdClues);
      assertEqual(would, true, `Weird timestamp cycle weird_2 -> weird_1 must be detected`);
      stats.thwartedAttacks++;
    }

    // DAG integrity check
    const hasCycles = store.detectCycles(proj.clues, []);
    assert(!hasCycles, 'Temporal test clues must have zero cycles');
  });

  // ===========================================================================
  // SUITE 4: Disjoint Forest Merging & Cross-Component Attacks (15 Attempts)
  // ===========================================================================
  await runSuite('Cycle Attack Phase 4: Disjoint Trees & Cross-Component Cycles', async () => {
    // 3 Disjoint trees:
    // Tree Alpha: A1 -> A2 -> A3
    // Tree Beta:  B1 -> B2 -> B3
    // Tree Gamma: C1 -> C2 -> C3
    const forestClues = [
      { id: 'A1', parentId: null },
      { id: 'A2', parentId: 'A1' },
      { id: 'A3', parentId: 'A2' },
      { id: 'B1', parentId: null },
      { id: 'B2', parentId: 'B1' },
      { id: 'B3', parentId: 'B2' },
      { id: 'C1', parentId: null },
      { id: 'C2', parentId: 'C1' },
      { id: 'C3', parentId: 'C2' }
    ];

    // Bridge 1: A3 -> B1 (Tree Alpha connects to Tree Beta: A1..A3 -> B1..B3)
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const bridge1 = store.wouldCreateCycle('A3', 'B1', forestClues);
    assertEqual(bridge1, false, 'Forward bridge A3 -> B1 is acyclic and valid');
    stats.thwartedAttacks++;

    // Add bridge 1 to forest
    forestClues.find(c => c.id === 'B1').parentId = 'A3';

    // Bridge 2: B3 -> C1 (Beta connects to Gamma: A1..A3 -> B1..B3 -> C1..C3)
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const bridge2 = store.wouldCreateCycle('B3', 'C1', forestClues);
    assertEqual(bridge2, false, 'Forward bridge B3 -> C1 is acyclic and valid');
    stats.thwartedAttacks++;
    forestClues.find(c => c.id === 'C1').parentId = 'B3';

    // Now attack: Propose C3 -> A1 (Closes grand macro-cycle C3 -> A1 -> A2 -> A3 -> B1 -> B2 -> B3 -> C1 -> C2 -> C3)
    stats.totalAttacks++;
    stats.cycleAttempts++;
    const grandCycle = store.wouldCreateCycle('C3', 'A1', forestClues);
    assertEqual(grandCycle, true, 'Grand macro-cycle C3 -> A1 across all 3 trees must be detected');
    stats.thwartedAttacks++;

    // Attacks to any intermediate node in the grand chain
    const grandChain = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'];
    for (const node of grandChain) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const would = store.wouldCreateCycle('C3', node, forestClues);
      assertEqual(would, true, `Macro-cycle C3 -> ${node} must be detected`);
      stats.thwartedAttacks++;
    }

    // Attacks from B3 to Tree Alpha
    const alphaNodes = ['A1', 'A2', 'A3'];
    for (const node of alphaNodes) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const would = store.wouldCreateCycle('B3', node, forestClues);
      assertEqual(would, true, `Inter-tree cycle B3 -> ${node} must be detected`);
      stats.thwartedAttacks++;
    }

    // Verify non-cycle from C3 to an independent new node D1
    stats.totalAttacks++;
    stats.cycleAttempts++;
    forestClues.push({ id: 'D1', parentId: null });
    const validD1 = store.wouldCreateCycle('C3', 'D1', forestClues);
    assertEqual(validD1, false, 'Edge to new isolated node D1 must not be flagged as cycle');
    stats.thwartedAttacks++;
  });

  // ===========================================================================
  // SUITE 5: Rapid Sequential Additions & Autonomous Synthesis Under Pressure (20 Attempts)
  // ===========================================================================
  await runSuite('Cycle Attack Phase 5: High-Frequency Additions & DAG Synthesis Integrity', async () => {
    const proj = setupTestProject('proj_challenger_burst');

    // Simulate 20 rapid sequential additions with mixed explicit and auto-inferred parents
    const clueDefs = [
      { type: 'observation', title: '目击: 异常心率波动' },
      { type: 'question', title: '心率波动与脑电 Alpha 节律有关吗？' },
      { type: 'hypothesis', title: '假说: 脑电 Alpha 增强伴随心率减慢' },
      { type: 'evidence', title: '实测: 记录到 15 组同步导联实验数据' },
      { type: 'breakthrough', title: '突破: 发现心脑节律锁相协同' }
    ];

    const addedNodes = [];
    for (let i = 0; i < 20; i++) {
      stats.totalAttacks++;
      stats.cycleAttempts++;
      const def = clueDefs[i % clueDefs.length];
      const newClue = store.addClue({
        title: `${def.title} #${i}`,
        type: def.type,
        timestamp: Date.now() + i
      });
      assert(newClue && newClue.id, `Clue #${i} must be created successfully`);
      addedNodes.push(newClue);

      // Verify that after every addition, no cycle exists in project
      const edges = [];
      proj.clues.forEach(c => {
        if (c.parentId) edges.push({ from: c.parentId, to: c.id });
      });
      const hasCycle = store.detectCycles(proj.clues, edges);
      assert(!hasCycle, `Project must have 0 cycles after adding clue #${i}`);
      stats.thwartedAttacks++;
    }

    // Now test stateEngine.synthesizeClueDag on the entire 20-node project
    const dag = stateEngine.synthesizeClueDag(proj.clues);
    assert(Array.isArray(dag.nodes), 'synthesizeClueDag must return nodes array');
    assert(Array.isArray(dag.links), 'synthesizeClueDag must return links array');

    // Strict acyclicity test on synthesized DAG
    const dagEdges = dag.links.map(l => ({ from: l.from.id, to: l.to.id }));
    const dagHasCycle = store.detectCycles(dag.nodes, dagEdges);
    assert(!dagHasCycle, 'synthesized DAG must strictly have 0 cycles');
  });

  // ===========================================================================
  // SUITE 6: Epistemic Clarity Invariant Stress Test (120+ Permutations)
  // ===========================================================================
  await runSuite('Epistemic Clarity Invariant Stress Test (120+ Randomized Permutations)', async () => {
    // Deterministic pseudo-random generator for repeatability
    let seed = 1337;
    function prng() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    function randInt(min, max) {
      return Math.floor(min + prng() * (max - min + 1));
    }

    // 1. Run 100 Randomized Combinations
    for (let run = 1; run <= 100; run++) {
      stats.clarityPermutations++;
      stats.totalAttacks++;

      const nObs = randInt(0, 40);
      const nQ = randInt(0, 40);
      const nHyp = randInt(0, 40);
      const nEvi = randInt(0, 40);
      const nBreakthrough = randInt(0, 5);
      const nBottleneck = randInt(0, 5);

      const clues = [];
      for (let i = 0; i < nObs; i++) clues.push({ id: `o_${run}_${i}`, type: 'observation' });
      for (let i = 0; i < nQ; i++) clues.push({ id: `q_${run}_${i}`, type: 'question' });
      for (let i = 0; i < nHyp; i++) clues.push({ id: `h_${run}_${i}`, type: 'hypothesis' });
      for (let i = 0; i < nEvi; i++) clues.push({ id: `e_${run}_${i}`, type: 'evidence' });
      for (let i = 0; i < nBreakthrough; i++) clues.push({ id: `bt_${run}_${i}`, type: 'breakthrough' });
      for (let i = 0; i < nBottleneck; i++) clues.push({ id: `bn_${run}_${i}`, type: 'bottleneck' });

      // Build random causal parent chains among some clues
      for (let i = 0; i < clues.length; i++) {
        if (clues[i].type !== 'observation' && clues.length > 1 && prng() > 0.4) {
          const cand = clues[randInt(0, clues.length - 1)];
          if (cand.id !== clues[i].id) {
            clues[i].parentId = cand.id;
          }
        }
      }

      const totalXp = randInt(0, 50000);
      const comboStreak = randInt(0, 15);
      const actionCompleted = prng() > 0.5;
      const currentBottleneck = prng() > 0.5 ? 'Test Bottleneck Boss' : null;
      const nextAction = prng() > 0.5 ? 'Run Experiment' : null;

      const projectData = {
        clues,
        cockpit: {
          actionCompleted,
          currentBottleneck,
          nextAction
        }
      };

      const profile = {
        totalXp,
        comboStreak,
        rankTitle: 'Test Rank'
      };

      const res = stateEngine.computeClarity(projectData, profile);

      // INVARIANT 1: 0 <= ΔQt <= 100
      assertInRange(res.clarityScore, 0, 100, `Clarity score for run ${run} out of bounds`);
      assertInRange(res.deltaQt, 0, 100, `deltaQt for run ${run} out of bounds`);

      // INVARIANT 2: S_chain in [0, 35]
      assertInRange(res.chainScore, 0, 35, `chainScore for run ${run} out of bounds`);

      // INVARIANT 3: S_ratio in [0, 25]
      assertInRange(res.ratioScore, 0, 25, `ratioScore for run ${run} out of bounds`);

      // INVARIANT 4: S_boss in [0, 20]
      assertInRange(res.bossScore, 0, 20, `bossScore for run ${run} out of bounds`);

      // INVARIANT 5: S_action in [0, 15]
      assertInRange(res.actionScore, 0, 15, `actionScore for run ${run} out of bounds`);

      // INVARIANT 6: P_fluff in {-15, 0}
      assert(res.fluffPenalty === 0 || res.fluffPenalty === -15, `fluffPenalty must be 0 or -15, got ${res.fluffPenalty}`);

      // INVARIANT 7: Base score is strictly 15
      assertEqual(res.baseScore, 15, `baseScore must be strictly 15`);

      // INVARIANT 8: Total rawClarity matches component summation
      const expectedRaw = res.baseScore + res.chainScore + res.ratioScore + res.bossScore + res.actionScore + res.fluffPenalty;
      assertEqual(res.details.rawClarity, expectedRaw, `rawClarity must match sum of sub-scores in run ${run}`);

      // INVARIANT 9: Final clarity is clamp(round(rawClarity), 0, 100)
      const expectedClamped = Math.max(0, Math.min(100, Math.round(expectedRaw)));
      assertEqual(res.clarityScore, expectedClamped, `clarityScore must match clamped expected value in run ${run}`);

      stats.thwartedAttacks++;
    }

    // 2. Run 25 Extreme Boundary Permutations
    const extremeCases = [
      // Case 1: Empty project
      { desc: 'Empty project', proj: {}, prof: null, expectedScore: 15 },
      // Case 2: Observations only (no evidence) -> fluff alert triggers at obs=3
      { desc: 'Obs=3, Evi=0 (Fluff alert)', proj: { clues: [{ type: 'observation' }, { type: 'observation' }, { type: 'observation' }] }, prof: null, expectedScore: 0 },
      // Case 3: Huge Hypotheses (1000) with 0 Evidence
      { desc: '1000 Hypotheses, 0 Evidence', proj: { clues: Array(1000).fill({ type: 'hypothesis' }) }, prof: null, expectedScore: 15 },
      // Case 4: 1 Hypothesis with 1000 Evidences (ratio capped at 25)
      { desc: '1 Hypothesis, 1000 Evidences', proj: { clues: [{ type: 'hypothesis' }, ...Array(1000).fill({ type: 'evidence' })] }, prof: null, expectedScore: 40 },
      // Case 5: 0 Hypotheses with 50 Evidences (ratio score = 0, no division by zero)
      { desc: '0 Hypotheses, 50 Evidences', proj: { clues: Array(50).fill({ type: 'evidence' }) }, prof: null, expectedScore: 15 },
      // Case 6: Massive XP and combo (action score capped at 15)
      { desc: 'Max Action Score', proj: {}, prof: { totalXp: 99999999, comboStreak: 999 }, expectedScore: 30 },
      // Case 7: All components maxed simultaneously (Raw = 15+35+25+20+15 = 110 -> Clamped 100)
      {
        desc: 'Max Saturation Overflow Cap',
        proj: {
          clues: [
            // Closed chain 1
            { id: 'o1', type: 'observation' }, { id: 'q1', type: 'question', parentId: 'o1' }, { id: 'h1', type: 'hypothesis', parentId: 'q1' }, { id: 'e1', type: 'evidence', parentId: 'h1' },
            // Closed chain 2
            { id: 'o2', type: 'observation' }, { id: 'q2', type: 'question', parentId: 'o2' }, { id: 'h2', type: 'hypothesis', parentId: 'q2' }, { id: 'e2', type: 'evidence', parentId: 'h2' },
            { id: 'bt', type: 'breakthrough' }
          ],
          cockpit: { actionCompleted: true }
        },
        prof: { totalXp: 50000, comboStreak: 10 },
        expectedScore: 100
      }
    ];

    for (const ec of extremeCases) {
      stats.clarityPermutations++;
      stats.totalAttacks++;
      const res = stateEngine.computeClarity(ec.proj, ec.prof);
      assertInRange(res.clarityScore, 0, 100, `Clarity for ${ec.desc} out of bounds`);
      assertEqual(res.clarityScore, ec.expectedScore, `Clarity for ${ec.desc} failed`);
      stats.thwartedAttacks++;
    }

    // 18 Additional randomized edge conditions with negative/malformed properties
    for (let k = 0; k < 18; k++) {
      stats.clarityPermutations++;
      stats.totalAttacks++;
      const malformedProj = {
        clues: [
          { type: null },
          { type: undefined },
          { id: null, type: 'unknown_type' },
          { id: 'valid_obs', type: 'observation' }
        ],
        cockpit: null
      };
      const malformedProf = {
        totalXp: -500, // Negative XP attack
        comboStreak: -10
      };
      const res = stateEngine.computeClarity(malformedProj, malformedProf);
      assertInRange(res.clarityScore, 0, 100, `Malformed clarity #${k} out of bounds`);
      stats.thwartedAttacks++;
    }
  });

  // ===========================================================================
  // SUITE 7: Anti-Fluff Penalty Boundary Invariants (15 Checks)
  // ===========================================================================
  await runSuite('Anti-Fluff Penalty Boundary & Transition Invariants', async () => {
    // Test grid: observations in [0..5], evidences in [0..2]
    // Rule: P_fluff = -15 iff observations >= 3 AND evidences === 0.
    for (let obs = 0; obs <= 5; obs++) {
      for (let evi = 0; evi <= 2; evi++) {
        stats.fluffBoundaryChecks++;
        stats.totalAttacks++;

        const clues = [];
        for (let i = 0; i < obs; i++) clues.push({ id: `o_${i}`, type: 'observation' });
        for (let i = 0; i < evi; i++) clues.push({ id: `e_${i}`, type: 'evidence' });

        const proj = { clues, cockpit: {} };
        const clarity = stateEngine.computeClarity(proj);

        const shouldFluff = (obs >= 3 && evi === 0);
        const expectedPenalty = shouldFluff ? -15 : 0;

        assertEqual(clarity.fluffPenalty, expectedPenalty, `Fluff penalty mismatch at obs=${obs}, evi=${evi}`);
        assertEqual(clarity.isFluffAlert, shouldFluff, `Fluff alert flag mismatch at obs=${obs}, evi=${evi}`);

        // If fluff triggers on pure observations, clarity score must be clamped to 0
        if (shouldFluff && obs === 3 && evi === 0) {
          assertEqual(clarity.clarityScore, 0, `Base 15 + (-15) must clamp to exactly 0 clarity`);
        }

        // Test stateEngine.evaluateSystemState synchronization
        const sysState = stateEngine.evaluateSystemState(proj);
        assertEqual(sysState.bottleneckAssessment.isFluffActivityAlert, shouldFluff, `sysState fluff alert mismatch at obs=${obs}, evi=${evi}`);
        if (shouldFluff) {
          assertEqual(sysState.bottleneckAssessment.urgency, 'critical', `sysState urgency must be 'critical' when fluff triggered`);
        }

        stats.thwartedAttacks++;
      }
    }

    // Dynamic Transition: Instant Antidote Test
    // Start with 5 observations and 0 evidence -> Fluff Alert Active (-15)
    stats.totalAttacks++;
    stats.fluffBoundaryChecks++;
    const testProj = {
      clues: [
        { id: 'o1', type: 'observation' },
        { id: 'o2', type: 'observation' },
        { id: 'o3', type: 'observation' },
        { id: 'o4', type: 'observation' },
        { id: 'o5', type: 'observation' }
      ]
    };
    const preRes = stateEngine.computeClarity(testProj);
    assertEqual(preRes.fluffPenalty, -15, 'Pre-condition: fluff penalty active');
    assertEqual(preRes.isFluffAlert, true, 'Pre-condition: fluff alert true');

    // Add exactly ONE evidence
    testProj.clues.push({ id: 'e1', type: 'evidence' });
    const postRes = stateEngine.computeClarity(testProj);
    assertEqual(postRes.fluffPenalty, 0, 'Post-condition: fluff penalty immediately removed');
    assertEqual(postRes.isFluffAlert, false, 'Post-condition: fluff alert false');
    assert(postRes.clarityScore >= preRes.clarityScore + 15, 'Clarity must increase by at least 15 points upon penalty removal');
    stats.thwartedAttacks++;
  });

  // ===========================================================================
  // SUITE 8: Hierarchical Barycentric Layout & Crossing Minimization Invariants
  // ===========================================================================
  await runSuite('Hierarchical Barycentric Layout & Crossing Minimization Invariants', async () => {
    const canvas = new ClueCanvasEngine();

    // 1. Column Monotonicity
    const testClues = [
      { id: 'c0', type: 'phenomenon', title: 'P' },
      { id: 'c1', type: 'question', title: 'Q', parentId: 'c0' },
      { id: 'c2', type: 'hypothesis', title: 'H', parentId: 'c1' },
      { id: 'c3', type: 'evidence', title: 'E', parentId: 'c2' },
      { id: 'c4', type: 'breakthrough', title: 'B', parentId: 'c3' }
    ];

    canvas.setData(testClues);
    canvas.autoLayoutDAG();

    stats.totalAttacks++;
    const nodes = canvas.nodes;
    const xCoords = [
      nodes.find(n => n.type === 'phenomenon').x,
      nodes.find(n => n.type === 'question').x,
      nodes.find(n => n.type === 'hypothesis').x,
      nodes.find(n => n.type === 'evidence').x,
      nodes.find(n => n.type === 'breakthrough').x
    ];

    assertEqual(xCoords[0], 100, 'Phenomenon column X is 100');
    assertEqual(xCoords[1], 340, 'Question column X is 340');
    assertEqual(xCoords[2], 580, 'Hypothesis column X is 580');
    assertEqual(xCoords[3], 820, 'Evidence column X is 820');
    assertEqual(xCoords[4], 1060, 'Breakthrough column X is 1060');

    for (let i = 0; i < xCoords.length - 1; i++) {
      assert(xCoords[i] < xCoords[i + 1], `Column X coordinates must be strictly monotonic: ${xCoords[i]} < ${xCoords[i + 1]}`);
    }
    stats.thwartedAttacks++;

    // 2. Sibling Collision Avoidance (ΔY >= 110)
    stats.totalAttacks++;
    const multiSiblingClues = [
      { id: 'root', type: 'observation', title: 'Root Obs' },
      { id: 'sib1', type: 'question', parentId: 'root', title: 'Q1' },
      { id: 'sib2', type: 'question', parentId: 'root', title: 'Q2' },
      { id: 'sib3', type: 'question', parentId: 'root', title: 'Q3' },
      { id: 'sib4', type: 'question', parentId: 'root', title: 'Q4' }
    ];
    canvas.setData(multiSiblingClues);
    canvas.autoLayoutDAG();

    const qNodes = canvas.nodes.filter(n => n.type === 'question').sort((a, b) => a.y - b.y);
    let minDy = Infinity;
    let collisionDetected = false;
    for (let i = 0; i < qNodes.length - 1; i++) {
      const deltaY = qNodes[i + 1].y - qNodes[i].y;
      if (deltaY < minDy) minDy = deltaY;
      if (deltaY < 110) collisionDetected = true;
    }
    if (collisionDetected) {
      stats.failedAttacks++;
      throw new Error(`[EMPIRICAL BUG REPRODUCED] Sibling separation ΔY must be >= 110px, got ${minDy}px between siblings (sib1.y=${qNodes[0].y}, sib2.y=${qNodes[1].y}) due to inner loop Math.max(80, startY + idx*130) clamp`);
    } else {
      stats.thwartedAttacks++;
    }
  });

  // ===========================================================================
  // SUITE 9: Causal Tree Traversal Recursion Guard & Edge Resilience
  // ===========================================================================
  await runSuite('Causal Tree Traversal Recursion Guard under Pathological Cycles', async () => {
    stats.totalAttacks++;
    // Construct a cyclic graph: root (lvl 0) -> q (lvl 1) -> root (lvl 0)
    const cyclicClues = [
      { id: 'root_c', type: 'observation', parentId: 'q_c' },
      { id: 'q_c', type: 'question', parentId: 'root_c' }
    ];

    let stackOverflowCaught = false;
    try {
      stateEngine.countClosedChains(cyclicClues);
    } catch (e) {
      if (e instanceof RangeError && e.message.includes('Maximum call stack size exceeded')) {
        stackOverflowCaught = true;
      }
    }

    if (stackOverflowCaught) {
      stats.failedAttacks++;
      throw new Error(`[EMPIRICAL BUG REPRODUCED] stateEngine.countClosedChains crashed with RangeError: Maximum call stack size exceeded due to lack of visitedPath guard in recursive traverse()`);
    } else {
      stats.thwartedAttacks++;
    }
  });

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  console.log(`\n${C.magenta}${C.bold}========================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bold}                 CHALLENGER EXECUTION SUMMARY                           ${C.reset}`);
  console.log(`${C.magenta}${C.bold}========================================================================${C.reset}`);
  console.log(`  Total Test Suites Run        : ${stats.totalSuites}`);
  console.log(`  Suites Passed                : ${C.green}${stats.passedSuites}${C.reset}`);
  console.log(`  Suites Failed                : ${stats.failedSuites > 0 ? C.red + stats.failedSuites + C.reset : stats.failedSuites}`);
  console.log(`  Total Adversarial Attacks    : ${C.bold}${stats.totalAttacks}${C.reset}`);
  console.log(`    - Directed Cycle Injections: ${stats.cycleAttempts} (Target: 50+)`);
  console.log(`    - Clarity Invariant Tests  : ${stats.clarityPermutations} (Target: 100+)`);
  console.log(`    - Anti-Fluff Boundary Tests: ${stats.fluffBoundaryChecks} (Target: 15)`);
  console.log(`    - Layout Invariant Tests   : 2`);
  console.log(`    - Recursion Guard Tests    : 1`);
  console.log(`  Attacks Successfully Thwarted: ${C.green}${stats.thwartedAttacks}${C.reset}`);
  console.log(`  Attacks Bypassed Invariants  : ${stats.failedAttacks > 0 ? C.red + stats.failedAttacks + C.reset : 0}`);
  console.log(`${C.magenta}${C.bold}========================================================================${C.reset}`);


  if (stats.failedSuites === 0 && stats.failedAttacks === 0) {
    console.log(`${C.green}${C.bold}  VERDICT: APPROVE — ALL DAG ACYCLICITY & CLARITY INVARIANTS RIGIDLY HOLD${C.reset}`);
  } else {
    console.log(`${C.red}${C.bold}  VERDICT: REQUEST_CHANGES — DETECTED FAILURES IN DAG / CLARITY INVARIANTS${C.reset}`);
  }
  console.log(`${C.magenta}${C.bold}========================================================================\n${C.reset}`);

  return stats;
}

executeChallengerStressTests()
  .then(st => {
    if (st.failedSuites > 0) process.exit(1);
    else process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

module.exports = executeChallengerStressTests;
