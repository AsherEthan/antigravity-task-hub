// scripts/verify-m1-shredder.js
const http = require('http');
const assert = require('assert');
const cognitiveShredder = require('../services/cognitive-shredder');
const aiAdvisor = require('../services/ai-advisor');

async function runTests() {
  console.log('=== [M1 Verification Suite: Cognitive Shredder & Dual-Core Engine] ===\n');
  let passed = 0;
  let failed = 0;

  function report(name, fn) {
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function reportAsync(name, fn) {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Domain Classification & Topic Extraction
  // -------------------------------------------------------------
  report('Intent & Domain Classifier recognizes 5 core domains', () => {
    assert.strictEqual(cognitiveShredder.classifyDomain('搞定高并发缓存穿透问题'), 'DEV_DEBUG');
    assert.strictEqual(cognitiveShredder.classifyDomain('调研脑电信号肌电伪迹消除'), 'RESEARCH_EXPERIMENT');
    assert.strictEqual(cognitiveShredder.classifyDomain('独立开发者产品商业化MVP验证'), 'PRODUCT_BUSINESS');
    assert.strictEqual(cognitiveShredder.classifyDomain('撰写脑电冥想神经机制开题报告'), 'WRITING_SYNTHESIS');
    assert.strictEqual(cognitiveShredder.classifyDomain('学习Rust生命周期与并发'), 'GENERAL_EXPLORATION');
  });

  report('Core topic extraction strips fuzzy buzzwords', () => {
    const topic1 = cognitiveShredder.extractCoreTopic('如何彻底搞定高并发缓存穿透问题？');
    assert.strictEqual(topic1, '高并发缓存穿透问题');
    const topic2 = cognitiveShredder.extractCoreTopic('深入研究脑电信号肌电伪迹消除');
    assert.strictEqual(topic2, '脑电信号肌电伪迹消除');
  });

  // -------------------------------------------------------------
  // Test 2: Offline Goal Decomposition & 2-Minute Rule
  // -------------------------------------------------------------
  await reportAsync('Offline decomposition produces >= 3 micro-actions satisfying 2-minute rule', async () => {
    const start = Date.now();
    const result = await cognitiveShredder.decomposeGoal('搞定高并发缓存穿透问题', { mode: 'offline' });
    const duration = Date.now() - start;

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mode, 'offline');
    assert.strictEqual(result.isAiGenerated, false);
    assert.strictEqual(result.domain, 'DEV_DEBUG');
    assert.ok(duration < 50, `Offline response took ${duration}ms, expected < 50ms`);

    const cards = result.cards;
    assert.ok(Array.isArray(cards), 'cards must be an array');
    assert.ok(cards.length >= 3, `Expected >= 3 cards, got ${cards.length}`);
    assert.strictEqual(result.actions.length, cards.length, 'actions and cards should match');

    // Verify each card conforms to 2-minute rule and MicroActionCard schema
    const allowedVerbs = ['打开', '打印', '运行', '记录', '查阅', '搜索', '标记', '注释', '对比'];
    cards.forEach((card, idx) => {
      assert.ok(card.id, `Card #${idx} missing id`);
      assert.ok(card.title, `Card #${idx} missing title`);
      assert.ok(card.plainPrompt, `Card #${idx} missing plainPrompt`);
      assert.ok(card.verb, `Card #${idx} missing verb`);
      assert.strictEqual(card.verb, card.actionVerb, `Card #${idx} verb and actionVerb must match`);
      assert.ok(allowedVerbs.includes(card.verb), `Card #${idx} verb "${card.verb}" not in allowed immediate physical verbs`);
      assert.ok(card.estMinutes <= 2, `Card #${idx} estMinutes (${card.estMinutes}) violates 2-minute rule (must be <= 2)`);
      assert.ok(card.estMinutes >= 1, `Card #${idx} estMinutes (${card.estMinutes}) must be >= 1`);
      assert.ok(card.reasoning, `Card #${idx} missing reasoning`);
      assert.ok(['probe', 'isolate', 'record', 'verify'].includes(card.flowStage), `Card #${idx} invalid flowStage: ${card.flowStage}`);
      assert.strictEqual(card.order, idx + 1);
      assert.strictEqual(card.stepIndex, idx + 1);
      assert.strictEqual(card.totalSteps, cards.length);
      if (idx === 0) {
        assert.strictEqual(card.status, 'active');
      } else {
        assert.strictEqual(card.status, 'pending');
      }
    });
  });

  await reportAsync('Offline decomposition across all domains conforms to 2-minute rule', async () => {
    const goals = [
      '调研脑电信号肌电伪迹消除',
      '独立开发者产品商业化MVP验证',
      '撰写脑电冥想神经机制开题报告',
      '搞懂量子计算超导量子比特'
    ];

    for (const goal of goals) {
      const res = await cognitiveShredder.decomposeGoal(goal, { mode: 'offline' });
      assert.ok(res.cards.length >= 3, `Goal "${goal}" yielded < 3 cards`);
      for (const card of res.cards) {
        assert.ok(card.estMinutes <= 2, `Card "${card.title}" estMinutes > 2`);
        assert.ok(card.verb.length >= 1, `Card "${card.title}" missing physical verb`);
      }
    }
  });

  // -------------------------------------------------------------
  // Test 3: Flow Flywheel (recommendNextAction)
  // -------------------------------------------------------------
  report('Flywheel advances pending cards from current project state', () => {
    const projectState = {
      cards: [
        { id: 'act_1', title: '步骤1', status: 'completed', estMinutes: 1, verb: '打开', order: 1 },
        { id: 'act_2', title: '步骤2', status: 'pending', estMinutes: 2, verb: '打印', order: 2 },
        { id: 'act_3', title: '步骤3', status: 'pending', estMinutes: 2, verb: '运行', order: 3 }
      ]
    };

    const nextAction = cognitiveShredder.recommendNextAction(projectState.cards[0], projectState);
    assert.strictEqual(nextAction.id, 'act_2');
    assert.strictEqual(nextAction.status, 'active');
    assert.strictEqual(nextAction.verb, '打印');
    assert.ok(nextAction.estMinutes <= 2);
  });

  report('Flywheel dynamically synthesizes next stage when chain completes', () => {
    // 1. Completed probe -> next should be isolate
    const probeAction = { flowStage: 'probe', verb: '打开', title: '打开入口文件', order: 1, stepIndex: 1, totalSteps: 3 };
    const isolateAction = cognitiveShredder.recommendNextAction(probeAction, {});
    assert.strictEqual(isolateAction.flowStage, 'isolate');
    assert.strictEqual(isolateAction.verb, '打印');
    assert.ok(isolateAction.estMinutes <= 2);

    // 2. Completed isolate -> next should be record
    const recordAction = cognitiveShredder.recommendNextAction(isolateAction, {});
    assert.strictEqual(recordAction.flowStage, 'record');
    assert.strictEqual(recordAction.verb, '运行');
    assert.ok(recordAction.estMinutes <= 2);

    // 3. Completed record -> next should be verify
    const verifyAction = cognitiveShredder.recommendNextAction(recordAction, {});
    assert.strictEqual(verifyAction.flowStage, 'verify');
    assert.strictEqual(verifyAction.verb, '对比');
    assert.ok(verifyAction.estMinutes <= 2);

    // 4. Completed verify -> next cycle or address bottleneck
    const projectWithBoss = { cockpit: { currentBottleneck: '肌电伪迹耦合', actionCompleted: false } };
    const bossAction = cognitiveShredder.recommendNextAction(verifyAction, projectWithBoss);
    assert.ok(bossAction.title.includes('肌电伪迹耦合'));
    assert.ok(bossAction.estMinutes <= 2);
  });

  // -------------------------------------------------------------
  // Test 4: AI Advisor HTTP/HTTPS Protocol Agnosticism & Mock API
  // -------------------------------------------------------------
  const mockPort = 38991;
  const mockServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parsedBody = JSON.parse(body || '{}');
      // 返回大模型模拟响应
      const mockReply = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                cards: [
                  {
                    title: '打开系统配置查看连接池参数',
                    plainPrompt: '打开 application.yml 查看 database pool 初始大小与最大连接数',
                    actionVerb: '打开',
                    contextTarget: '配置文件',
                    estMinutes: 2,
                    flowStage: 'probe',
                    reasoning: '直接目击参数基线'
                  },
                  {
                    title: '注释掉连接泄漏检查代码行',
                    plainPrompt: '临时注释泄漏监控以隔离告警噪声',
                    actionVerb: '注释',
                    contextTarget: '连接监控代码',
                    estMinutes: 2,
                    flowStage: 'isolate',
                    reasoning: '单变量排除'
                  },
                  {
                    title: '运行单次并发模拟命令',
                    plainPrompt: '在终端执行 ab -n 10 -c 2 观察连接释放速度',
                    actionVerb: '运行',
                    contextTarget: 'ab 压测命令',
                    estMinutes: 2,
                    flowStage: 'record',
                    reasoning: '获得即时读数'
                  }
                ]
              })
            }
          }
        ]
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockReply));
    });
  });

  await new Promise(resolve => mockServer.listen(mockPort, resolve));

  await reportAsync('aiAdvisor protocol-agnostic client supports HTTP local endpoint', async () => {
    const rawReply = await aiAdvisor.requestLlm(
      `http://localhost:${mockPort}/v1`,
      'mock-test-key',
      'test-model',
      [{ role: 'user', content: 'test ping' }]
    );
    assert.ok(typeof rawReply === 'string');
    assert.ok(rawReply.includes('打开系统配置查看连接池参数'));
  });

  await reportAsync('decomposeGoal against Mock API produces verified MicroActionCards', async () => {
    const result = await cognitiveShredder.decomposeGoal('排查连接池打满问题', {
      settings: {
        baseUrl: `http://localhost:${mockPort}/v1`,
        apiKey: 'mock-key',
        model: 'test-model'
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mode, 'api');
    assert.strictEqual(result.isAiGenerated, true);
    assert.strictEqual(result.cards.length, 3);
    assert.strictEqual(result.cards[0].verb, '打开');
    assert.strictEqual(result.cards[1].verb, '注释');
    assert.strictEqual(result.cards[2].verb, '运行');
    result.cards.forEach(c => assert.ok(c.estMinutes <= 2));
  });

  await new Promise(resolve => mockServer.close(resolve));

  // -------------------------------------------------------------
  // Test 5: Timeout & Network Error Graceful Fallback
  // -------------------------------------------------------------
  const slowPort = 38992;
  const slowServer = http.createServer((req, res) => {
    // 故意挂起不返回，模拟大模型网络超时
  });
  await new Promise(resolve => slowServer.listen(slowPort, resolve));

  await reportAsync('Timeout gracefully falls back to offline heuristics without crashing', async () => {
    const result = await cognitiveShredder.decomposeGoal('处理高并发死锁', {
      settings: {
        baseUrl: `http://localhost:${slowPort}/v1`,
        apiKey: 'mock-key',
        timeout: 100 // 100ms 快速超时
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mode, 'offline');
    assert.strictEqual(result.isAiGenerated, false);
    assert.strictEqual(result.fallbackFromApi, true);
    assert.ok(result.cards.length >= 3);
    result.cards.forEach(c => assert.ok(c.estMinutes <= 2));
  });

  await new Promise(resolve => slowServer.close(resolve));

  // -------------------------------------------------------------
  // Test 6: aiAdvisor Tactical Lens & Offline Insights
  // -------------------------------------------------------------
  await reportAsync('aiAdvisor castLens operates seamlessly with offline heuristics', async () => {
    const lenses = ['socratic', 'hypotheses', 'test', 'attribution'];
    for (const lens of lenses) {
      const res = await aiAdvisor.castLens(lens, { content: '脑电数据中 Theta 波剧烈波动' }, { apiKey: '' });
      assert.ok(res.title.length > 0);
      assert.ok(res.output.length > 20);
      assert.strictEqual(res.isAiGenerated, false);
    }
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
