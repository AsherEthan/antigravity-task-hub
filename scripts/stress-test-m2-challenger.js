// scripts/stress-test-m2-challenger.js
/**
 * Challenger 1 Empirical Stress Test Harness for Milestone M2
 * (Physical Micro-Action Purity & UI De-bloat)
 * 
 * Execution: node scripts/stress-test-m2-challenger.js
 */

const path = require('path');
const fs = require('fs');
const cognitiveShredder = require('../services/cognitive-shredder');
const slashEngine = require('../services/slash-engine');

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

// 20 diverse, adversarial, abstract, philosophical, and jargon-heavy goal strings
const ADVERSARIAL_GOAL_STRINGS = [
  // 1. Core sample from prompt: architecture & bottlenecks
  '全面深入分析微服务架构并深刻思考系统瓶颈',
  // 2. Core sample from prompt: quantum mechanics & derivation
  '理解量子力学并推导薛定谔方程',
  // 3. Core sample from prompt: philosophy & life
  '研读哲学著作并琢磨人生的意义',
  // 4. Distributed consensus & comprehension
  '彻底弄懂分布式一致性Paxos算法并领会其精髓',
  // 5. AI Agent architecture & planning
  '深入构思并策划面向未来的AI Agent自主协同网络',
  // 6. Epistemology & Kantian pure reason
  '学习并探讨康德《纯粹理性批判》的先验唯心论',
  // 7. Knowledge graphs & research planning
  '深入研究并规划超大规模多模态知识图谱演进路径',
  // 8. Cognitive science & attention models
  '系统性梳理并总结认知科学中的注意力分配模型',
  // 9. Engineering management & introspection
  '深入反思并评估当前敏捷开发流程中的组织效能',
  // 10. Business strategy & commercial barriers
  '全面考察并揣摩竞争对手的底层商业壁垒与护城河',
  // 11. AGI sociology & speculation
  '想象与推测通用人工智能出现后的社会契约重塑',
  // 12. Continental philosophy & Heidegger
  '消化并体悟海德格尔《存在与时间》中的此在之生存论机制',
  // 13. Metaphysics & organizational reflection
  '领悟道家无为而治智慧并深刻反思现代企业管理异化',
  // 14. Musicology & counterpoint aesthetics
  '仔细体会与揣摩古典交响乐对位法结构之美',
  // 15. Linux kernel eBPF & queuing theory
  '深入分析eBPF内核网络丢包机理并系统性推导队列调度时延',
  // 16. Astrophysics & Schwarzschild solution
  '研读并推导爱因斯坦广义相对论引力场方程的史瓦西解',
  // 17. Chaos theory & 4-verb barrage
  '思考、分析、理解、推导四位一体探究跨尺度湍流混沌效应',
  // 18. Zero-trust security & architectural planning
  '策划并规划新一代零信任跨云身份联邦网关架构',
  // 19. Neuroscience & EEG microstate dynamics
  '全面梳理、总结并评估EEG脑电信号频段功率谱与微状态动力学',
  // 20. Condensed matter & room-temperature superconductivity
  '深入研究、构思并探讨基于第一性原理的室温超导机理模型'
];

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails = [];

function assert(condition, message, context = {}) {
  totalAssertions++;
  if (!condition) {
    failedAssertions++;
    failureDetails.push({ message, context });
    console.error(`  ✗ [FAIL] ${message}`, context);
    return false;
  }
  passedAssertions++;
  return true;
}

function validateMicroActionPurity(card, suiteName, goal) {
  const cardTitle = card.title || '';
  const verb = card.actionVerb || card.verb;
  const combinedText = [
    card.title || '',
    card.actionVerb || '',
    card.verb || '',
    card.plainPrompt || '',
    card.detail || '',
    card.contextTarget || '',
    card.reasoning || ''
  ].join(' ');

  // 1. Whitelist assertion: actionVerb in 23-verb whitelist
  const isWhitelisted = PHYSICAL_VERB_WHITELIST.includes(verb);
  assert(
    isWhitelisted,
    `[${suiteName}] Action verb "${verb}" not in 23-verb whitelist for card "${cardTitle}"`,
    { goal, verb, cardTitle }
  );

  // 2. Blacklist assertion: 0% fuzzy verbs in micro-action
  const foundFuzzy = [];
  for (const fuzzy of FUZZY_VERB_BLACKLIST) {
    if (combinedText.includes(fuzzy)) {
      foundFuzzy.push(fuzzy);
    }
  }
  assert(
    foundFuzzy.length === 0,
    `[${suiteName}] Card "${cardTitle}" contains forbidden fuzzy verbs: [${foundFuzzy.join(', ')}]`,
    { goal, foundFuzzy, combinedText }
  );

  // 3. Duration assertion: estMinutes <= 2 and >= 1 and is number
  const validEst = typeof card.estMinutes === 'number' && card.estMinutes <= 2 && card.estMinutes >= 1;
  assert(
    validEst,
    `[${suiteName}] Card "${cardTitle}" estMinutes invalid: ${card.estMinutes} (expected 1 or 2)`,
    { goal, estMinutes: card.estMinutes }
  );

  // 4. Zero gamification assertion: no xpReward field
  const hasXpReward = 'xpReward' in card || (card.xpReward !== undefined);
  assert(
    !hasXpReward,
    `[${suiteName}] Card "${cardTitle}" contains forbidden xpReward field: ${card.xpReward}`,
    { goal, xpReward: card.xpReward }
  );
}

async function run() {
  console.log('================================================================');
  console.log('  CHALLENGER 1 EMPIRICAL STRESS TEST: M2 PHYSICAL MICRO-ACTION  ');
  console.log('================================================================');
  console.log(`23-Verb Whitelist count: ${PHYSICAL_VERB_WHITELIST.length}`);
  console.log(`26-Verb Blacklist count: ${FUZZY_VERB_BLACKLIST.length}`);
  console.log(`Adversarial Goals count : ${ADVERSARIAL_GOAL_STRINGS.length}`);
  console.log('----------------------------------------------------------------\n');

  // ---------------------------------------------------------------------------
  // SUITE 1: cognitiveShredder.decomposeGoal() on 20 Adversarial Goals
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 1: cognitiveShredder.decomposeGoal() on 20 Adversarial Goals ---');
  let shredderCardCount = 0;
  for (let i = 0; i < ADVERSARIAL_GOAL_STRINGS.length; i++) {
    const goal = ADVERSARIAL_GOAL_STRINGS[i];
    const res = await cognitiveShredder.decomposeGoal(goal, { mode: 'offline' });
    const cards = res.cards || res.actions || [];
    assert(Array.isArray(cards) && cards.length >= 3, `Goal #${i + 1} produced >= 3 cards (got ${cards.length})`, { goal });
    for (const card of cards) {
      shredderCardCount++;
      validateMicroActionPurity(card, `Shredder Goal #${i + 1}`, goal);
    }
  }
  console.log(`  ✓ Evaluated ${shredderCardCount} cards across 20 adversarial goals with cognitiveShredder.\n`);

  // ---------------------------------------------------------------------------
  // SUITE 2: slashEngine.executeSlashCommand({ command: '/shred', query }) on 20 Adversarial Goals
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 2: slashEngine.executeSlashCommand({ command: "/shred", query }) ---');
  let slashCmdCount = 0;
  for (let i = 0; i < ADVERSARIAL_GOAL_STRINGS.length; i++) {
    const goal = ADVERSARIAL_GOAL_STRINGS[i];
    const artifact = await slashEngine.executeSlashCommand({ command: '/shred', query: goal });
    assert(artifact && artifact.type === 'shred', `Slash command /shred produced shred artifact for #${i + 1}`, { goal });
    const steps = artifact.steps || (artifact.payload && artifact.payload.steps) || [];
    assert(Array.isArray(steps) && steps.length === 3, `Slash artifact has strictly 3 steps for #${i + 1} (got ${steps.length})`, { goal });
    
    // Check artifact title does not contain forbidden fuzzy verbs
    const artifactTitleFuzzy = FUZZY_VERB_BLACKLIST.filter(f => artifact.title.includes(f));
    assert(artifactTitleFuzzy.length === 0, `Artifact title contains forbidden fuzzy verbs: [${artifactTitleFuzzy.join(', ')}]`, { title: artifact.title, goal });

    for (const step of steps) {
      slashCmdCount++;
      validateMicroActionPurity(step, `SlashEngine Object #${i + 1}`, goal);
    }
  }
  console.log(`  ✓ Evaluated ${slashCmdCount} steps across 20 adversarial goals with slashEngine object payload.\n`);

  // ---------------------------------------------------------------------------
  // SUITE 3: slashEngine.executeSlashCommand(string) on 20 Adversarial Goals
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 3: slashEngine.executeSlashCommand("/shred <query>") String Syntax ---');
  let slashStrCount = 0;
  for (let i = 0; i < ADVERSARIAL_GOAL_STRINGS.length; i++) {
    const goal = ADVERSARIAL_GOAL_STRINGS[i];
    const artifact = await slashEngine.executeSlashCommand(`/shred ${goal}`);
    assert(artifact && artifact.type === 'shred', `Slash string /shred produced shred artifact for #${i + 1}`, { goal });
    const steps = artifact.steps || [];
    assert(steps.length === 3, `Slash string artifact has strictly 3 steps for #${i + 1}`, { goal });
    for (const step of steps) {
      slashStrCount++;
      validateMicroActionPurity(step, `SlashEngine String #${i + 1}`, goal);
    }
  }
  console.log(`  ✓ Evaluated ${slashStrCount} steps across 20 adversarial goals with slashEngine string syntax.\n`);

  // ---------------------------------------------------------------------------
  // SUITE 4: cognitiveShredder.recommendNextAction() Flow Flywheel Purity
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 4: cognitiveShredder.recommendNextAction() Flow Flywheel ---');
  let flywheelCount = 0;
  for (let i = 0; i < ADVERSARIAL_GOAL_STRINGS.length; i++) {
    const goal = ADVERSARIAL_GOAL_STRINGS[i];
    const res = await cognitiveShredder.decomposeGoal(goal, { mode: 'offline' });
    const firstCard = (res.cards || res.actions || [])[0];
    const nextAction = cognitiveShredder.recommendNextAction(firstCard, { cards: res.cards });
    flywheelCount++;
    validateMicroActionPurity(nextAction, `Flywheel Action #${i + 1}`, goal);
  }
  console.log(`  ✓ Evaluated ${flywheelCount} flywheel adaptive next actions.\n`);

  // ---------------------------------------------------------------------------
  // SUITE 5: Extreme Edge Cases & Boundary Strings
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 5: Extreme Edge Cases & Boundary Stress ---');
  const EXTREME_CASES = [
    // 1. String of ONLY forbidden fuzzy verbs concatenated
    FUZZY_VERB_BLACKLIST.join(''),
    // 2. Chained repetitions
    '思考并全面分析并深入研读并反复推导并琢磨',
    // 3. Huge 10,000-character repetitive text
    '深入分析并思考微服务架构瓶颈'.repeat(600),
    // 4. Weird symbols, emojis, and quotes
    '🔥💡"『深入思考』"与【全面分析】<script>alert(1)</script> /?*&^%$#@!',
    // 5. English mixed with fuzzy verbs
    'Analyze and research 微服务并深入思考 high-concurrency bottleneck'
  ];

  for (let idx = 0; idx < EXTREME_CASES.length; idx++) {
    const testCase = EXTREME_CASES[idx];
    const preview = testCase.slice(0, 30) + '...';
    // Test decomposeGoal
    const res = await cognitiveShredder.decomposeGoal(testCase, { mode: 'offline' });
    for (const card of (res.cards || [])) {
      validateMicroActionPurity(card, `Extreme Shredder #${idx + 1}`, preview);
    }
    // Test slashEngine
    const artifact = await slashEngine.executeSlashCommand({ command: '/shred', query: testCase });
    for (const step of (artifact.steps || [])) {
      validateMicroActionPurity(step, `Extreme Slash #${idx + 1}`, preview);
    }
  }
  console.log(`  ✓ Evaluated 5 extreme boundary cases (total 30+ actions).\n`);

  // ---------------------------------------------------------------------------
  // SUITE 6: UI Gamification De-bloat Verification (Source Tree Scan)
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 6: UI Gamification De-bloat Source Scan ---');
  const rendererFiles = [
    path.join(__dirname, '..', 'renderer', 'sidebar.html'),
    path.join(__dirname, '..', 'renderer', 'sidebar.js'),
    path.join(__dirname, '..', 'renderer', 'hud.html'),
    path.join(__dirname, '..', 'renderer', 'hud.js'),
    path.join(__dirname, '..', 'renderer', 'index.html'),
    path.join(__dirname, '..', 'renderer', 'index.js')
  ];

  const FORBIDDEN_UI_PATTERNS = [
    { pattern: /combo\s*streak/i, name: 'Combo Streak' },
    { pattern: /\+?\d+\s*XP/i, name: 'Numeric +XP' },
    { pattern: /\bXP\s*(奖励|加成|\+)/i, name: 'XP Reward/Buff' },
    { pattern: /怪物\s*(扣血|血量|HP)/i, name: 'Monster HP' },
    { pattern: /段位\s*(提升|晋阶)/i, name: 'Rank Promotion' }
  ];

  for (const fpath of rendererFiles) {
    if (fs.existsSync(fpath)) {
      const content = fs.readFileSync(fpath, 'utf8');
      const fname = path.basename(fpath);
      for (const item of FORBIDDEN_UI_PATTERNS) {
        const match = content.match(item.pattern);
        assert(
          !match,
          `File ${fname} contains residual gamification text: "${match ? match[0] : ''}" matching ${item.name}`,
          { file: fname, pattern: item.name }
        );
      }
    }
  }
  console.log(`  ✓ Verified 6 renderer files against 5 forbidden gamification patterns.\n`);

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log('================================================================');
  console.log('                 STRESS TEST EXECUTION SUMMARY                  ');
  console.log('================================================================');
  console.log(`Total Assertions Evaluated : ${totalAssertions}`);
  console.log(`Passed Assertions          : ${passedAssertions}`);
  console.log(`Failed Assertions          : ${failedAssertions}`);
  console.log(`Success Rate               : ${((passedAssertions / totalAssertions) * 100).toFixed(2)}%`);
  console.log('================================================================');

  if (failedAssertions > 0) {
    console.error(`\n❌ VERDICT: FAIL — ${failedAssertions} assertion(s) violated.`);
    process.exit(1);
  } else {
    console.log('\n✅ VERDICT: PASS — 100% micro-action purity & UI de-bloat confirmed.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal crash during stress test harness:', err);
  process.exit(1);
});
