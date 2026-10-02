// scripts/verify-m2-diagnostician.js
/**
 * Dedicated Verification Suite for Milestone M2:
 * Proactive Bottleneck Diagnostician & Scientific Mental Models (Features F4, F5)
 *
 * Can run standalone via Node: node scripts/verify-m2-diagnostician.js
 * Or via Electron: npx electron scripts/verify-m2-diagnostician.js
 */

const http = require('http');
const { performance } = require('perf_hooks');
const diagnostician = require('../services/bottleneck-diagnostician');

// ANSI Terminal Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

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

function assertLessOrEqual(actual, max, message) {
  if (actual > max) {
    throw new Error(`${message || 'assertLessOrEqual failed'}: expected ${actual} <= ${max}`);
  }
}

async function runTest(name, fn) {
  stats.total++;
  const t0 = performance.now();
  try {
    await fn();
    const duration = (performance.now() - t0).toFixed(2);
    stats.passed++;
    console.log(`  ${C.green}✓ [PASS]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
  } catch (err) {
    const duration = (performance.now() - t0).toFixed(2);
    stats.failed++;
    stats.failures.push({ test: name, error: err });
    console.log(`  ${C.red}✗ [FAIL]${C.reset} ${name} ${C.dim}(${duration}ms)${C.reset}`);
    console.log(`    ${C.red}${err.message}${C.reset}`);
  }
}

// In-Memory Mock LLM Server for testing online dual-core flow
class LocalMockLlmServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.mode = 'normal'; // 'normal' | 'error_500' | 'timeout' | 'malformed'
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          if (this.mode === 'timeout') {
            // Do not respond to simulate timeout
            return;
          }
          if (this.mode === 'error_500') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Internal Server Error' } }));
            return;
          }
          if (this.mode === 'malformed') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"obstacleType": "UNCLOSED');
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          const responsePayload = {
            id: 'mock-diag-' + Date.now(),
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify({
                    obstacleType: 'UNISOLATED_VARIABLES',
                    confidence: 0.94,
                    title: '变量未隔离：多因并发伪迹',
                    analysis: '核心信号与环境扰动发生共模耦合，属于仪器伪迹。',
                    mentalModel: 'minimal_counter_example',
                    mentalModelName: '极简反例法',
                    breakthroughGuidance: '固定其他变量，仅针对最可疑的单一干扰做A/B隔离。',
                    minimalViableTest: {
                      title: '15分钟单一变量A/B极简对照测试',
                      description: '屏蔽遮光眼罩，测量信号差分',
                      instructions: ['保持设备不动', '仅移除眼罩', '比对读数'],
                      estMinutes: 15,
                      timeboxMinutes: 15,
                      falsificationCondition: '若移除后无变化，则证伪眼罩干扰',
                      expectedOutcome: '确认干扰源'
                    }
                  })
                }
              }
            ]
          };
          res.end(JSON.stringify(responsePayload));
        });
      });

      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        resolve(`http://127.0.0.1:${this.port}`);
      });
      this.server.on('error', reject);
    });
  }

  setMode(mode) {
    this.mode = mode;
  }

  getUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  async stop() {
    if (!this.server) return;
    return new Promise(resolve => this.server.close(resolve));
  }
}

async function main() {
  console.log(`\n${C.cyan}${C.bright}================================================================${C.reset}`);
  console.log(`${C.cyan}${C.bright}  M2 Dedicated Verification: Bottleneck Diagnostician & Mental Models ${C.reset}`);
  console.log(`${C.cyan}${C.bright}================================================================${C.reset}\n`);

  const mockServer = new LocalMockLlmServer();
  const mockUrl = await mockServer.start();

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: 5 Obstacle Archetypes Classification
    // -------------------------------------------------------------------------
    console.log(`${C.bright}--- Section 1: 5 Obstacle Archetypes Classification ---${C.reset}`);

    await runTest('1.1: UNISOLATED_VARIABLES archetype classification', () => {
      const inputs = [
        '加入新滤波后信号好像好转了，但不知道是遮光眼罩起效了还是设备本身的电位漂移',
        '同时改了微服务超时时间和数据库连接池大小，报错少了，但到底是哪个起效？',
        '实验变量未隔离，多因并发导致归因混乱，出现严重共模干扰'
      ];
      for (const text of inputs) {
        const res = diagnostician.diagnoseBottleneck({ text });
        assertEqual(res.obstacleType, 'UNISOLATED_VARIABLES', `Failed on: ${text}`);
        assertEqual(res.type, 'UNISOLATED_VARIABLES');
        assert(res.confidence >= 0.70, 'Confidence must be >= 0.70');
      }
    });

    await runTest('1.2: MISSING_BASELINE archetype classification', () => {
      const inputs = [
        '测量到前额叶4-8Hz异常剧烈波动，但未在无干扰安静状态下测量过空载电位背景噪声',
        '没有设置对照基线，不知道空载零点漂移是多少就直接上机测试',
        '缺乏对照基线，未记录原始状态，无法确定读数是否为真实信号'
      ];
      for (const text of inputs) {
        const res = diagnostician.diagnoseBottleneck({ text });
        assertEqual(res.obstacleType, 'MISSING_BASELINE', `Failed on: ${text}`);
        assertEqual(res.type, 'MISSING_BASELINE');
        assert(res.confidence >= 0.70);
      }
    });

    await runTest('1.3: CONCEPT_CONFUSION archetype classification', () => {
      const inputs = [
        '把统计学上的相关性当成了神经学因果性，一直在抽象层面上纠结定义',
        '团队在名词定义上争吵不休，概念混淆，根本没有触及底层数据通信通道',
        '被高阶学术黑话包裹的伪问题，同名异物导致概念定义模糊'
      ];
      for (const text of inputs) {
        const res = diagnostician.diagnoseBottleneck({ text });
        assertEqual(res.obstacleType, 'CONCEPT_CONFUSION', `Failed on: ${text}`);
        assertEqual(res.type, 'CONCEPT_CONFUSION');
        assert(res.confidence >= 0.70);
      }
    });

    await runTest('1.4: ACTION_ZERO_PARALYSIS archetype classification', () => {
      const inputs = [
        '连续读了15篇高并发理论论文，写了大量读书笔记，但没有写一行测试代码',
        '准备过度导致行动瘫痪，刷了一下午架构文档，至今还没开始搭测试集群',
        '陷入虚假忙碌，零行动瘫痪，面对庞大系统不知如何下手'
      ];
      for (const text of inputs) {
        const res = diagnostician.diagnoseBottleneck({ text });
        assertEqual(res.obstacleType, 'ACTION_ZERO_PARALYSIS', `Failed on: ${text}`);
        assertEqual(res.type, 'ACTION_ZERO_PARALYSIS');
        assert(res.confidence >= 0.70);
      }
    });

    await runTest('1.5: PREMATURE_CONVERGENCE archetype classification', () => {
      const inputs = [
        '死守第一个假说不放，排斥所有反面证据，认定只有这一种可能',
        '过早收敛，陷入严重证实偏差，对测试暴露出的明显反例视而不见',
        '坚信只有现有理论是对的，盲目乐观，不接受任何竞争性假说'
      ];
      for (const text of inputs) {
        const res = diagnostician.diagnoseBottleneck({ text });
        assertEqual(res.obstacleType, 'PREMATURE_CONVERGENCE', `Failed on: ${text}`);
        assertEqual(res.type, 'PREMATURE_CONVERGENCE');
        assert(res.confidence >= 0.70);
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 2: 3 Scientific Mental Models & Breakthrough Guidance
    // -------------------------------------------------------------------------
    console.log(`\n${C.bright}--- Section 2: 3 Scientific Mental Models & Breakthrough Guidance ---${C.reset}`);

    await runTest('2.1: First Principles model mapping and guidance', () => {
      const res = diagnostician.diagnoseBottleneck({ text: '概念混淆，一直在抽象层面上纠结定义' });
      assertEqual(res.mentalModel, 'first_principles');
      assertEqual(res.appliedMentalModel, 'first_principles');
      assertEqual(res.mentalModelName, '第一性原理');
      assert(res.mentalModelMeta && res.mentalModelMeta.coreQuestion, 'Must include mental model metadata');
      assert(res.breakthroughGuidance.includes('第一性原理'), 'Guidance must mention first principles');
    });

    await runTest('2.2: Minimal Counter-Example model mapping and guidance', () => {
      const res = diagnostician.diagnoseBottleneck({ text: '不知道是遮光眼罩起效了还是设备本身的电位漂移' });
      assertEqual(res.mentalModel, 'minimal_counter_example');
      assertEqual(res.appliedMentalModel, 'minimal_counter_example');
      assertEqual(res.mentalModelName, '极简反例法');
      assert(res.breakthroughGuidance.includes('极简反例法'), 'Guidance must mention minimal counter-example');
    });

    await runTest('2.3: Feynman Technique model mapping and guidance', () => {
      const res = diagnostician.diagnoseBottleneck({ text: '连续读了15篇高并发理论论文，写了大量读书笔记，但没有写一行测试代码' });
      assertEqual(res.mentalModel, 'feynman_technique');
      assertEqual(res.appliedMentalModel, 'feynman_technique');
      assertEqual(res.mentalModelName, '费曼技巧');
      assert(res.breakthroughGuidance.includes('费曼技巧'), 'Guidance must mention Feynman technique');
    });

    // -------------------------------------------------------------------------
    // SECTION 3: 15-Minute Minimal Falsifiable Test Design
    // -------------------------------------------------------------------------
    console.log(`\n${C.bright}--- Section 3: 15-Minute Minimal Falsifiable Test Design ---${C.reset}`);

    await runTest('3.1: Minimal test strict constraints (estMinutes <= 15, falsificationCondition)', () => {
      const res = diagnostician.diagnoseBottleneck({ text: '测试环境数据异常，可能是跨时区时间戳格式化错误' });
      const test = res.minimalTest;
      assert(test !== null && typeof test === 'object', 'minimalTest must exist');
      assertEqual(res.minimalViableTest, test, 'minimalViableTest must mirror minimalTest');
      assertLessOrEqual(test.estMinutes, 15, 'estMinutes must be <= 15');
      assertLessOrEqual(test.timeboxMinutes, 15, 'timeboxMinutes must be <= 15');
      assert(typeof test.falsificationCondition === 'string' && test.falsificationCondition.length > 5, 'falsificationCondition must be a substantive string');
      assert(Array.isArray(test.instructions) && test.instructions.length >= 2, 'instructions must be a multi-step array');
      assert(typeof test.expectedOutcome === 'string' && test.expectedOutcome.length > 0, 'expectedOutcome must exist');
    });

    // -------------------------------------------------------------------------
    // SECTION 4: Boundary Cases & Robustness
    // -------------------------------------------------------------------------
    console.log(`\n${C.bright}--- Section 4: Boundary Cases & Robustness ---${C.reset}`);

    await runTest('4.1: Graceful handling of empty, whitespace, null, and non-object inputs', () => {
      const emptyRes = diagnostician.diagnoseBottleneck('');
      assert(emptyRes.success === true, 'Empty string must succeed');

      const nullRes = diagnostician.diagnoseBottleneck(null);
      assert(nullRes.success === true, 'null input must succeed');

      const undefRes = diagnostician.diagnoseBottleneck(undefined);
      assert(undefRes.success === true, 'undefined input must succeed');

      const wsRes = diagnostician.diagnoseBottleneck('    \n\t   ');
      assert(wsRes.success === true, 'whitespace input must succeed');

      const numRes = diagnostician.diagnoseBottleneck(12345);
      assert(numRes.success === true, 'number input must succeed');
    });

    await runTest('4.2: Handling 3000-character long diagnostic input without stack overflow', () => {
      const longText = '系统在极高并发压力下偶发超时504，可能是连接池耗尽或是垃圾回收挂起：' + '详细日志排查记录，变量未隔离，未设对照基线。'.repeat(100);
      const res = diagnostician.diagnoseBottleneck({ text: longText });
      assert(res.success === true, 'Long text diagnosis must succeed');
      assert(res.obstacleType.length > 0, 'Obstacle type must be defined');
    });

    // -------------------------------------------------------------------------
    // SECTION 5: Proactive Triggers Detection (detectProactiveTriggers)
    // -------------------------------------------------------------------------
    console.log(`\n${C.bright}--- Section 5: Proactive Triggers Detection ---${C.reset}`);

    await runTest('5.1: Fluff activity trigger (observations >= 3, evidence == 0)', () => {
      const projectState = {
        clues: [
          { type: 'observation', title: '文献笔记 1' },
          { type: 'observation', title: '文献笔记 2' },
          { type: 'observation', title: '文献笔记 3' }
        ],
        stagnationMinutes: 5
      };
      const trigger = diagnostician.detectProactiveTriggers(projectState);
      assertEqual(trigger.triggered, true, 'Trigger must fire');
      assertEqual(trigger.triggerType, 'fluff_activity');
      assertEqual(trigger.urgency, 'critical');
      assert(trigger.reason.includes('虚假忙碌'), 'Reason must mention fluff activity');
      assertEqual(trigger.suggestedMentalModel, 'feynman_technique');
    });

    await runTest('5.2: Stagnation trigger (> 15 minutes)', () => {
      const projectState = {
        clues: [{ type: 'observation', title: '现象 1' }],
        stagnationMinutes: 25
      };
      const trigger = diagnostician.detectProactiveTriggers(projectState);
      assertEqual(trigger.triggered, true, 'Trigger must fire');
      assertEqual(trigger.triggerType, 'stagnation');
      assertEqual(trigger.urgency, 'high');
      assert(trigger.reason.includes('25 分钟'), 'Reason must report stagnation minutes');
    });

    await runTest('5.3: Unverified hypotheses trigger (hypotheses >= 2, evidence == 0)', () => {
      const projectState = {
        clues: [
          { type: 'hypothesis', title: '假说 A' },
          { type: 'hypothesis', title: '假说 B' }
        ],
        stagnationMinutes: 5
      };
      const trigger = diagnostician.detectProactiveTriggers(projectState);
      assertEqual(trigger.triggered, true, 'Trigger must fire');
      assertEqual(trigger.triggerType, 'unverified_hypotheses');
      assertEqual(trigger.suggestedMentalModel, 'minimal_counter_example');
    });

    await runTest('5.4: Unconverged questions trigger (questions >= 2, hypotheses == 0)', () => {
      const projectState = {
        clues: [
          { type: 'question', title: '为什么报错？' },
          { type: 'question', title: '吞吐量为何下降？' }
        ],
        stagnationMinutes: 5
      };
      const trigger = diagnostician.detectProactiveTriggers(projectState);
      assertEqual(trigger.triggered, true, 'Trigger must fire');
      assertEqual(trigger.triggerType, 'unconverged_questions');
      assertEqual(trigger.suggestedMentalModel, 'first_principles');
    });

    await runTest('5.5: Normal state produces no false positive triggers', () => {
      const healthyProject = {
        clues: [
          { type: 'observation', title: '观测' },
          { type: 'question', title: '疑问' },
          { type: 'hypothesis', title: '假说' },
          { type: 'evidence', title: '实测证据' }
        ],
        stagnationMinutes: 2
      };
      const trigger = diagnostician.detectProactiveTriggers(healthyProject);
      assertEqual(trigger.triggered, false, 'Healthy project must not trigger');
      assertEqual(trigger.triggerType, 'none');
    });

    // -------------------------------------------------------------------------
    // SECTION 6: Dual-Core Architecture & Resilience
    // -------------------------------------------------------------------------
    console.log(`\n${C.bright}--- Section 6: Dual-Core Architecture & Resilience ---${C.reset}`);

    await runTest('6.1: Online LLM simulation via Mock server', async () => {
      mockServer.setMode('normal');
      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '测试环境信号异常未知干扰' },
        {
          mode: 'api',
          apiKey: 'mock-key',
          baseUrl: mockUrl,
          model: 'mock-model'
        }
      );
      assertEqual(res.success, true);
      assertEqual(res.isAiGenerated, true);
      assertEqual(res.source, 'online_llm');
      assertEqual(res.obstacleType, 'UNISOLATED_VARIABLES');
      assertEqual(res.mentalModel, 'minimal_counter_example');
    });

    await runTest('6.2: Graceful fallback on API 500 error to offline heuristics', async () => {
      mockServer.setMode('error_500');
      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '测量到前额叶4-8Hz异常剧烈波动，但未在无干扰安静状态下测量过空载电位背景噪声' },
        {
          mode: 'api',
          apiKey: 'mock-key',
          baseUrl: mockUrl,
          model: 'mock-model'
        }
      );
      assertEqual(res.success, true);
      assertEqual(res.isAiGenerated, false);
      assertEqual(res.source, 'offline_heuristic');
      assertEqual(res.obstacleType, 'MISSING_BASELINE');
    });

    await runTest('6.3: Graceful fallback on malformed JSON to offline heuristics', async () => {
      mockServer.setMode('malformed');
      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '连续读了15篇高并发理论论文，写了大量读书笔记，但没有写一行测试代码' },
        {
          mode: 'api',
          apiKey: 'mock-key',
          baseUrl: mockUrl,
          model: 'mock-model'
        }
      );
      assertEqual(res.success, true);
      assertEqual(res.isAiGenerated, false);
      assertEqual(res.source, 'offline_heuristic');
      assertEqual(res.obstacleType, 'ACTION_ZERO_PARALYSIS');
    });

    // -------------------------------------------------------------------------
    // SECTION 7: Latency & Performance Benchmark
    // -------------------------------------------------------------------------
    console.log(`\n${C.bright}--- Section 7: Latency & Performance Benchmark ---${C.reset}`);

    await runTest('7.1: Instantaneous latency: 100 consecutive diagnoses average < 1ms', () => {
      const iterations = 100;
      const t0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        diagnostician.diagnoseBottleneck({ text: '不知道是遮光眼罩起效了还是设备本身的电位漂移' });
      }
      const totalTime = performance.now() - t0;
      const avgTime = totalTime / iterations;
      assertLessOrEqual(avgTime, 1.0, `Average diagnosis latency was ${avgTime.toFixed(3)}ms (expected < 1ms)`);
    });

  } finally {
    await mockServer.stop();
  }

  console.log(`\n${C.cyan}${C.bright}================================================================${C.reset}`);
  console.log(`${C.cyan}${C.bright}                      SUMMARY FOR M2 VERIFICATION               ${C.reset}`);
  console.log(`${C.cyan}${C.bright}================================================================${C.reset}`);
  console.log(`Total Tests  : ${stats.total}`);
  console.log(`Passed Tests : ${C.green}${stats.passed}${C.reset}`);
  console.log(`Failed Tests : ${stats.failed > 0 ? C.red + stats.failed + C.reset : '0'}`);
  console.log(`${C.cyan}${C.bright}================================================================${C.reset}\n`);

  if (stats.failed > 0) {
    process.exit(1);
  } else {
    console.log(`${C.green}${C.bright}✓ ALL M2 VERIFICATION TESTS PASSED PERFECTLY.${C.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
