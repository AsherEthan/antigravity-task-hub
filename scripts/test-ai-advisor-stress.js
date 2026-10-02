// scripts/test-ai-advisor-stress.js
const http = require('http');
const net = require('net');
const assert = require('assert');
const aiAdvisor = require('../services/ai-advisor');
const cognitiveShredder = require('../services/cognitive-shredder');

// Track any unhandled rejections or exceptions
let unhandledErrors = [];
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  unhandledErrors.push({ type: 'unhandledRejection', reason });
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  unhandledErrors.push({ type: 'uncaughtException', err });
});

async function runStressSuite() {
  console.log('================================================================');
  console.log('  ADVERSARIAL EMPIRICAL STRESS SUITE: services/ai-advisor.js');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  // Helper with hard deadline safety wrapper (5000ms max per individual test step, or custom)
  async function test(name, fn, maxAllowedMs = 6000) {
    const t0 = Date.now();
    let timerId;
    const safetyPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`TEST TIMEOUT: Execution hung past ${maxAllowedMs}ms deadline (socket or promise leak)`));
      }, maxAllowedMs);
    });

    try {
      await Promise.race([fn(), safetyPromise]);
      clearTimeout(timerId);
      const elapsed = Date.now() - t0;
      console.log(`✓ [PASS] (${elapsed}ms) ${name}`);
      passed++;
      results.push({ name, status: 'PASS', elapsed, error: null });
    } catch (err) {
      clearTimeout(timerId);
      const elapsed = Date.now() - t0;
      console.error(`✗ [FAIL] (${elapsed}ms) ${name}: ${err.message}`);
      failed++;
      results.push({ name, status: 'FAIL', elapsed, error: err.message });
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: Protocol Agnosticism & Localhost
  // -------------------------------------------------------------
  console.log('\n--- SUITE 1: Protocol Agnosticism & Addressing ---');

  let mockServer;
  let mockPort;

  await test('Setup ephemeral HTTP mock server on random port', async () => {
    await new Promise((resolve) => {
      mockServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          if (req.url === '/v1/chat/completions') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              choices: [{ message: { content: 'Echo from mock server' } }]
            }));
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        });
      });
      mockServer.listen(0, '127.0.0.1', () => {
        mockPort = mockServer.address().port;
        resolve();
      });
    });
    assert.ok(mockPort > 0, 'Port must be assigned');
  });

  await test('HTTP requests to http://localhost:<port> without TLS errors', async () => {
    const reply = await aiAdvisor.requestLlm(
      `http://localhost:${mockPort}/v1`,
      'test-key',
      'deepseek-chat',
      [{ role: 'user', content: 'Ping' }],
      { timeout: 2000 }
    );
    assert.strictEqual(reply, 'Echo from mock server');
  });

  await test('HTTP requests to http://127.0.0.1:<port> without API Key (IPv4 localhost bypass)', async () => {
    const reply = await aiAdvisor.requestLlm({
      apiUrl: `http://127.0.0.1:${mockPort}/v1`,
      apiKey: '',
      model: 'ollama-model',
      prompt: 'Ping from local'
    });
    assert.strictEqual(reply, 'Echo from mock server');
  });

  await test('URL normalization with trailing slashes and without /chat/completions', async () => {
    const reply = await aiAdvisor.requestLlm({
      apiUrl: `http://localhost:${mockPort}/v1///`,
      prompt: 'Ping with trailing slashes'
    });
    assert.strictEqual(reply, 'Echo from mock server');
  });

  // Test IPv6 localhost
  await test('IPv6 localhost (http://[::1]:<port>) without API Key bypass', async () => {
    let ipv6Server;
    let ipv6Port;
    try {
      await new Promise((resolve, reject) => {
        ipv6Server = http.createServer((req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ choices: [{ message: { content: 'IPv6 response' } }] }));
        });
        ipv6Server.on('error', reject);
        ipv6Server.listen(0, '::1', () => {
          ipv6Port = ipv6Server.address().port;
          resolve();
        });
      });

      const reply = await aiAdvisor.requestLlm({
        apiUrl: `http://[::1]:${ipv6Port}/v1`,
        apiKey: '',
        prompt: 'Ping IPv6'
      });
      assert.strictEqual(reply, 'IPv6 response');
    } finally {
      if (ipv6Server) ipv6Server.close();
    }
  });

  // Test prompt containing URL in signature 2: requestLlm(prompt, systemPrompt, options)
  await test('Signature 2: Prompt containing URL or "://" must not be parsed as apiUrl', async () => {
    const reply = await aiAdvisor.requestLlm(
      '请分析 https://example.com/api 的架构设计',
      '你是一位架构师',
      { baseUrl: `http://127.0.0.1:${mockPort}/v1` }
    );
    assert.strictEqual(reply, 'Echo from mock server');
  });

  mockServer.close();

  // -------------------------------------------------------------
  // SUITE 2: Timeout Scenarios & Socket Destruction
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Timeout & Clean Aborts ---');

  let delayServer;
  let delayPort;

  await test('Setup delayed mock server (delays by 6000ms)', async () => {
    await new Promise((resolve) => {
      delayServer = http.createServer((req, res) => {
        const timer = setTimeout(() => {
          if (!res.writableEnded) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ choices: [{ message: { content: 'Late response' } }] }));
          }
        }, 6000);
        req.on('close', () => clearTimeout(timer));
      });
      delayServer.listen(0, '127.0.0.1', () => {
        delayPort = delayServer.address().port;
        resolve();
      });
    });
  });

  await test('Custom timeout (300ms): cleanly aborts at ~300ms without unhandled rejection', async () => {
    const t0 = Date.now();
    let caughtError = null;
    try {
      await aiAdvisor.requestLlm({
        apiUrl: `http://localhost:${delayPort}/v1`,
        prompt: 'Testing quick timeout',
        timeout: 300
      });
    } catch (err) {
      caughtError = err;
    }
    const elapsed = Date.now() - t0;
    assert.ok(caughtError, 'Must throw timeout error');
    assert.ok(caughtError.message.includes('超时 (300ms)'), `Error message mismatch: ${caughtError.message}`);
    assert.ok(elapsed >= 280 && elapsed < 800, `Elapsed ${elapsed}ms should be around 300ms`);
  });

  await test('Default 5000ms timeout: mock delaying 6000ms cleanly aborts at ~5000ms', async () => {
    const t0 = Date.now();
    let caughtError = null;
    try {
      await aiAdvisor.requestLlm({
        apiUrl: `http://localhost:${delayPort}/v1`,
        prompt: 'Testing 5000ms timeout',
        timeout: 5000
      });
    } catch (err) {
      caughtError = err;
    }
    const elapsed = Date.now() - t0;
    assert.ok(caughtError, 'Must throw timeout error');
    assert.ok(caughtError.message.includes('超时 (5000ms)'), `Error message mismatch: ${caughtError.message}`);
    assert.ok(elapsed >= 4800 && elapsed < 5800, `Elapsed ${elapsed}ms should be around 5000ms`);
  }, 7000);

  delayServer.close();

  // -------------------------------------------------------------
  // SUITE 3: Connection Drops, ECONNREFUSED, ENOTFOUND
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Connection Drops & Network Errors ---');

  await test('ECONNREFUSED: Connecting to closed port throws clean network error', async () => {
    let caughtError = null;
    try {
      await aiAdvisor.requestLlm({
        apiUrl: 'http://127.0.0.1:49999/v1',
        prompt: 'Ping dead port',
        timeout: 1000
      });
    } catch (err) {
      caughtError = err;
    }
    assert.ok(caughtError, 'Must catch error');
    assert.ok(caughtError.message.includes('ECONNREFUSED') || caughtError.message.includes('网络异常'), `Expected ECONNREFUSED in: ${caughtError.message}`);
  });

  await test('ENOTFOUND: Connecting to non-existent domain throws clean network error', async () => {
    let caughtError = null;
    try {
      await aiAdvisor.requestLlm({
        apiUrl: 'http://non-existent-domain-xyz-abc-123456.com/v1',
        apiKey: 'test-key',
        prompt: 'Ping invalid host',
        timeout: 1500
      });
    } catch (err) {
      caughtError = err;
    }
    assert.ok(caughtError, 'Must catch error');
    assert.ok(caughtError.message.includes('ENOTFOUND') || caughtError.message.includes('网络异常'), `Expected ENOTFOUND in: ${caughtError.message}`);
  });

  let abruptServer;
  let abruptPort;

  await test('Immediate TCP connection reset (server destroys socket on connect)', async () => {
    await new Promise((resolve) => {
      abruptServer = net.createServer((socket) => {
        socket.destroy();
      });
      abruptServer.listen(0, '127.0.0.1', () => {
        abruptPort = abruptServer.address().port;
        resolve();
      });
    });

    let caughtError = null;
    try {
      await aiAdvisor.requestLlm({
        apiUrl: `http://127.0.0.1:${abruptPort}/v1`,
        prompt: 'Ping abrupt drop',
        timeout: 1000
      });
    } catch (err) {
      caughtError = err;
    }
    assert.ok(caughtError, 'Must catch error on abrupt socket drop');
    assert.ok(caughtError.message.includes('网络异常'), `Message should state network error: ${caughtError.message}`);
  });

  abruptServer.close();

  let midStreamServer;
  let midStreamPort;

  await test('Mid-stream connection drop: socket destroyed after headers sent must reject without hanging', async () => {
    await new Promise((resolve) => {
      midStreamServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write('{"choices":[{"message":');
        setTimeout(() => {
          req.socket.destroy();
        }, 50);
      });
      midStreamServer.listen(0, '127.0.0.1', () => {
        midStreamPort = midStreamServer.address().port;
        resolve();
      });
    });

    let caughtError = null;
    try {
      await aiAdvisor.requestLlm({
        apiUrl: `http://127.0.0.1:${midStreamPort}/v1`,
        prompt: 'Ping mid-stream drop',
        timeout: 1000
      });
    } catch (err) {
      caughtError = err;
    }
    assert.ok(caughtError, 'Must catch error on mid-stream drop');
    assert.ok(!caughtError.message.includes('TEST TIMEOUT'), 'Must not hang indefinitely on mid-stream drop');
  }, 2500);

  midStreamServer.close();

  // -------------------------------------------------------------
  // SUITE 4: HTTP Status Error Codes
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: HTTP Status Errors (500, 502, 504, 401, 429) ---');

  let statusServer;
  let statusPort;
  let targetStatusCode = 500;
  let targetResponseBody = '';

  await test('Setup status test mock server', async () => {
    await new Promise((resolve) => {
      statusServer = http.createServer((req, res) => {
        res.writeHead(targetStatusCode, { 'Content-Type': 'text/plain' });
        res.end(targetResponseBody);
      });
      statusServer.listen(0, '127.0.0.1', () => {
        statusPort = statusServer.address().port;
        resolve();
      });
    });
  });

  const statusCases = [
    { code: 500, body: 'Internal Server Error: DB connection failed' },
    { code: 502, body: 'Bad Gateway: upstream offline' },
    { code: 504, body: 'Gateway Timeout: upstream didn\'t respond' },
    { code: 401, body: 'Unauthorized: Invalid API key' },
    { code: 429, body: 'Too Many Requests: Rate limit exceeded' }
  ];

  for (const sc of statusCases) {
    await test(`HTTP ${sc.code} response cleanly rejected with status code`, async () => {
      targetStatusCode = sc.code;
      targetResponseBody = sc.body;

      let caughtError = null;
      try {
        await aiAdvisor.requestLlm({
          apiUrl: `http://localhost:${statusPort}/v1`,
          prompt: `Test ${sc.code}`,
          timeout: 1000
        });
      } catch (err) {
        caughtError = err;
      }
      assert.ok(caughtError, `Must reject on HTTP ${sc.code}`);
      assert.ok(caughtError.message.includes(`API Error [${sc.code}]`), `Error message should contain [${sc.code}], got: ${caughtError.message}`);
      assert.ok(caughtError.message.includes(sc.body), `Error message should contain response body, got: ${caughtError.message}`);
    });
  }

  statusServer.close();

  // -------------------------------------------------------------
  // SUITE 5: Response Payloads & Parsers
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Response Payloads & Parsers ---');

  let formatServer;
  let formatPort;
  let formatPayload = '';

  await test('Setup format mock server', async () => {
    await new Promise((resolve) => {
      formatServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(formatPayload);
      });
      formatServer.listen(0, '127.0.0.1', () => {
        formatPort = formatServer.address().port;
        resolve();
      });
    });
  });

  await test('Parses OpenAI standard format: choices[0].message.content', async () => {
    formatPayload = JSON.stringify({ choices: [{ message: { content: 'OpenAI output' } }] });
    const reply = await aiAdvisor.requestLlm({ apiUrl: `http://localhost:${formatPort}/v1`, prompt: 'hi' });
    assert.strictEqual(reply, 'OpenAI output');
  });

  await test('Parses Ollama format: response field', async () => {
    formatPayload = JSON.stringify({ response: 'Ollama raw response output' });
    const reply = await aiAdvisor.requestLlm({ apiUrl: `http://localhost:${formatPort}/v1`, prompt: 'hi' });
    assert.strictEqual(reply, 'Ollama raw response output');
  });

  await test('Parses Ollama chat format: message.content field', async () => {
    formatPayload = JSON.stringify({ message: { content: 'Ollama chat output' } });
    const reply = await aiAdvisor.requestLlm({ apiUrl: `http://localhost:${formatPort}/v1`, prompt: 'hi' });
    assert.strictEqual(reply, 'Ollama chat output');
  });

  await test('Handles non-JSON raw text response gracefully', async () => {
    formatPayload = 'Plain text response without JSON';
    const reply = await aiAdvisor.requestLlm({ apiUrl: `http://localhost:${formatPort}/v1`, prompt: 'hi' });
    assert.strictEqual(reply, 'Plain text response without JSON');
  });

  await test('Handles large payload (100KB) without socket truncating', async () => {
    const largeContent = 'A'.repeat(100 * 1024);
    formatPayload = JSON.stringify({ choices: [{ message: { content: largeContent } }] });
    const reply = await aiAdvisor.requestLlm({ apiUrl: `http://localhost:${formatPort}/v1`, prompt: 'hi' });
    assert.strictEqual(reply.length, 100 * 1024);
  });

  formatServer.close();

  // -------------------------------------------------------------
  // SUITE 6: Offline Heuristic Fallback Integration
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Offline Heuristic Fallbacks ---');

  let failServer;
  let failPort;

  await test('Setup fail mock server (503 Service Unavailable)', async () => {
    await new Promise((resolve) => {
      failServer = http.createServer((req, res) => {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Service Unavailable');
      });
      failServer.listen(0, '127.0.0.1', () => {
        failPort = failServer.address().port;
        resolve();
      });
    });
  });

  await test('aiAdvisor.castLens falls back smoothly to offline heuristics on HTTP 503', async () => {
    const lensResult = await aiAdvisor.castLens('socratic', { content: '探索脑电信号高阶相变' }, {
      baseUrl: `http://localhost:${failPort}/v1`,
      timeout: 500
    });
    assert.ok(lensResult, 'Must return insight object');
    assert.strictEqual(lensResult.isAiGenerated, false, 'isAiGenerated must be false');
    assert.ok(lensResult.output.includes('战术本质性剥离'), 'Must contain offline socratic content');
  });

  await test('aiAdvisor.castLens falls back to offline heuristics when missing API key on remote server', async () => {
    const lensResult = await aiAdvisor.castLens('hypotheses', { content: '系统偶发死锁' }, {
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      timeout: 500
    });
    assert.ok(lensResult);
    assert.strictEqual(lensResult.isAiGenerated, false);
    assert.ok(lensResult.output.includes('竞争性假说矩阵'));
  });

  await test('cognitiveShredder.decomposeGoal falls back to offline heuristic cards on HTTP 503', async () => {
    const result = await cognitiveShredder.decomposeGoal('排查Redis缓存击穿问题', {
      settings: {
        baseUrl: `http://localhost:${failPort}/v1`,
        timeout: 500
      }
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mode, 'offline');
    assert.strictEqual(result.isAiGenerated, false);
    assert.ok(result.actions.length >= 3, `Expected >= 3 cards, got ${result.actions.length}`);
    for (const card of result.actions) {
      assert.ok(card.estMinutes <= 2, `Card ${card.title} estMinutes ${card.estMinutes} exceeds 2`);
    }
  });

  await test('cognitiveShredder.decomposeGoal falls back on ECONNREFUSED without crashing', async () => {
    const result = await cognitiveShredder.decomposeGoal('调研脑电信号肌电伪迹消除', {
      settings: {
        baseUrl: 'http://127.0.0.1:49998/v1',
        timeout: 500
      }
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mode, 'offline');
    assert.ok(result.actions.length >= 3);
  });

  failServer.close();

  // -------------------------------------------------------------
  // SUITE 7: Unhandled Errors & Process Stability
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: Process Stability & Zero Unhandled Errors ---');

  await test('Zero unhandledRejections or uncaughtExceptions occurred during stress testing', () => {
    assert.strictEqual(unhandledErrors.length, 0, `Encountered unhandled errors: ${JSON.stringify(unhandledErrors)}`);
  });

  // -------------------------------------------------------------
  // Summary & Breakdown
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`STRESS RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log('================================================================');

  if (failed > 0) {
    console.log('\nFAILED TESTS BREAKDOWN:');
    for (const r of results.filter(x => x.status === 'FAIL')) {
      console.log(`- ${r.name}: ${r.error}`);
    }
    process.exitCode = 1;
  }
}

runStressSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exitCode = 1;
});
