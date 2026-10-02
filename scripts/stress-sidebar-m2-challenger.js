// scripts/stress-sidebar-m2-challenger.js
/**
 * Empirical Adversarial Stress Test & Latency Benchmark Harness for Milestone M2
 * Target: services/context-manager.js & main.js Context Ingestion Pipeline
 * 
 * Conducts empirical stress testing across:
 * 1. Degenerate @ tokens:
 *    - Bare @ (@, ' @ ', 'hello @ world', multiple bare @)
 *    - Double @@ (@@, @@tag, 'hello @@ world', @@@@@)
 *    - Whitespace variants (@\t, @\n, spaces, mixed tabs)
 *    - Trailing @ ('query @', '/plan @', '@')
 *    - Email addresses (user@domain.com, sub.user@corp.co.uk, user+tag@domain.com, email mixed with @clipboard)
 *    - 5x repeated tags (@clipboard 5x, @selection 5x, @error 5x, alternating 5x)
 * 2. Oversized payloads (100,000 characters):
 *    - 100k chars clipboard attachment
 *    - 100k chars activeError attachment
 *    - 100k chars activeCode attachment
 *    - 100k chars custom attachment
 *    - 100k chars rawPrompt input (ReDoS check)
 *    - Assert clean truncation marker ('[...truncated]') and compound prompt size <= 5000 chars
 * 3. High-resolution Latency Profiling (Target: < 5ms):
 *    - Lexer parsing latency across normal, degenerate, and oversized inputs
 *    - Envelope assembly latency across normal and 100k payloads
 *    - End-to-end context ingestion pipeline latency
 *    - Calculates Min, Mean, Median (p50), p95, p99, Max, and StdDev
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const {
  captureClipboard,
  parseContextMentions,
  parseAtTokens,
  parseSlashCommand,
  assembleCompoundPrompt,
  buildContextEnvelope,
  ContextManager
} = require('../services/context-manager');

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
  results.totalTests++;
  if (!condition) {
    results.failed++;
    const err = new Error(message || 'Assertion failed');
    results.failures.push(err.message);
    console.error(`  ${C.red}✗ FAIL: ${message}${C.reset}`);
    throw err;
  }
  results.passed++;
  console.log(`  ${C.green}✓ PASS: ${message}${C.reset}`);
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  assert(actualStr === expectedStr, `${message} (expected: ${expectedStr}, got: ${actualStr})`);
}

function calculatePercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper === lower) return sortedArr[index];
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

function computeStats(samples) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;
  const stddev = Math.sqrt(variance);

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    p50: calculatePercentile(sorted, 50),
    p90: calculatePercentile(sorted, 90),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    stddev
  };
}

async function runAdversarialSuite() {
  console.log(`\n${C.magenta}${C.bold}================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bold}   CHALLENGER 1: M2 CONTEXT-MANAGER EMPIRICAL STRESS HARNESS    ${C.reset}`);
  console.log(`${C.magenta}${C.bold}================================================================${C.reset}\n`);

  // =========================================================================
  // SECTION 1: Degenerate @ Tokens Stress Testing
  // =========================================================================
  console.log(`${C.cyan}${C.bold}--- [1/3] Degenerate @ Tokens Stress Testing ---${C.reset}`);

  // 1.1 Bare @ tokens
  console.log(`\n${C.yellow}* Subsection 1.1: Bare @ tokens${C.reset}`);
  {
    const bare1 = parseContextMentions('@');
    assertEqual(bare1.tokens, [], 'Single bare @ produces zero tokens');
    assertEqual(bare1.hasTokens, false, 'hasTokens is false for bare @');
    assertEqual(bare1.cleanPrompt, '@', 'Single bare @ is preserved in cleanPrompt');

    const bare2 = parseContextMentions(' @ ');
    assertEqual(bare2.tokens, [], 'Surrounded bare @ produces zero tokens');
    assertEqual(bare2.cleanPrompt, '@', 'Surrounded bare @ trimmed to @');

    const bare3 = parseContextMentions('hello @ world');
    assertEqual(bare3.tokens, [], 'Inline bare @ produces zero tokens');
    assertEqual(bare3.cleanPrompt, 'hello @ world', 'Inline bare @ preserved intact');

    const bare4 = parseContextMentions('测试 @ 符号隔离');
    assertEqual(bare4.tokens, [], 'Chinese text with bare @ produces zero tokens');
    assertEqual(bare4.cleanPrompt, '测试 @ 符号隔离', 'Chinese text with bare @ preserved intact');

    const bare5 = parseContextMentions('@ @ @');
    assertEqual(bare5.tokens, [], 'Multiple bare @ symbols produce zero tokens');
    assertEqual(bare5.cleanPrompt, '@ @ @', 'Multiple bare @ symbols preserved');
  }

  // 1.2 Double @@ and degenerate prefix tokens
  console.log(`\n${C.yellow}* Subsection 1.2: Double @@ and repetitive @ characters${C.reset}`);
  {
    const dbl1 = parseContextMentions('@@');
    assertEqual(dbl1.tokens, [], 'Double @@ produces zero tokens');
    assertEqual(dbl1.cleanPrompt, '@@', 'Double @@ preserved as literal');

    const dbl2 = parseContextMentions('@@clipboard');
    assertEqual(dbl2.tokens, [], 'Double @@clipboard produces zero tokens (non-standard prefix)');
    assertEqual(dbl2.cleanPrompt, '@@clipboard', '@@clipboard preserved as literal');

    const dbl3 = parseContextMentions('hello @@ world');
    assertEqual(dbl3.tokens, [], 'Inline @@ produces zero tokens');
    assertEqual(dbl3.cleanPrompt, 'hello @@ world', 'Inline @@ preserved');

    const dbl4 = parseContextMentions('@@@@@');
    assertEqual(dbl4.tokens, [], 'Five @@@@@ produces zero tokens');
    assertEqual(dbl4.cleanPrompt, '@@@@@', 'Five @@@@@ preserved');
  }

  // 1.3 Whitespace variants around @
  console.log(`\n${C.yellow}* Subsection 1.3: Whitespace variants${C.reset}`);
  {
    const ws1 = parseContextMentions('@\tclipboard');
    assertEqual(ws1.tokens, [], 'Tab after @ prevents token match');
    assertEqual(ws1.cleanPrompt, '@ clipboard', 'Tab normalized to space');

    const ws2 = parseContextMentions('@\nclipboard');
    assertEqual(ws2.tokens, [], 'Newline after @ prevents token match');

    const ws3 = parseContextMentions('   @   clipboard   ');
    assertEqual(ws3.tokens, [], 'Space between @ and word prevents token match');
    assertEqual(ws3.cleanPrompt, '@ clipboard', 'Clean prompt collapsed correctly');

    const ws4 = parseContextMentions('   @clipboard   ');
    assertEqual(ws4.tokens, ['@clipboard'], 'Leading/trailing whitespace correctly extracted token');
    assertEqual(ws4.cleanPrompt, '', 'Clean prompt is empty when only tag was provided');

    const ws5 = parseContextMentions('@clipboard \t\n @selection');
    assertEqual(ws5.tokens, ['@clipboard', '@selection'], 'Mixed whitespace between valid tags parses both');
    assertEqual(ws5.cleanPrompt, '', 'Clean prompt empty after stripping both tags');
  }

  // 1.4 Trailing @ tokens
  console.log(`\n${C.yellow}* Subsection 1.4: Trailing @ tokens${C.reset}`);
  {
    const trail1 = parseContextMentions('check this @');
    assertEqual(trail1.tokens, [], 'Trailing @ produces zero tokens');
    assertEqual(trail1.cleanPrompt, 'check this @', 'Trailing @ preserved in cleanPrompt');

    const trail2 = parseContextMentions('/plan @');
    assertEqual(trail2.tokens, [], 'Slash command with trailing @ produces zero tokens');
    assertEqual(trail2.cleanPrompt, '/plan @', 'Slash command with trailing @ preserved');

    const trail3 = parseContextMentions('/solve 诊断任务 @clipboard @');
    assertEqual(trail3.tokens, ['@clipboard'], 'Extracts @clipboard while ignoring trailing @');
    assertEqual(trail3.cleanPrompt, '/solve 诊断任务 @', 'Trailing @ preserved after @clipboard stripped');
  }

  // 1.5 Email addresses (Strict False Positive Prevention)
  console.log(`\n${C.yellow}* Subsection 1.5: Email addresses rejection (No false positives)${C.reset}`);
  {
    const email1 = parseContextMentions('contact user@example.com for assistance');
    assertEqual(email1.tokens, [], 'Standard email address user@example.com produces zero tokens');
    assertEqual(email1.cleanPrompt, 'contact user@example.com for assistance', 'Email preserved intact');

    const email2 = parseContextMentions('alert dev.ops-lead@cloud.subdomain.io');
    assertEqual(email2.tokens, [], 'Complex email with dots and dashes produces zero tokens');
    assertEqual(email2.cleanPrompt, 'alert dev.ops-lead@cloud.subdomain.io', 'Complex email preserved intact');

    const email3 = parseContextMentions('notify test+tag@domain.co');
    assertEqual(email3.tokens, [], 'Plus-tagged email produces zero tokens');
    assertEqual(email3.cleanPrompt, 'notify test+tag@domain.co', 'Plus-tagged email preserved');

    const email4 = parseContextMentions('mail to a@b.com and c@d.org');
    assertEqual(email4.tokens, [], 'Multiple emails produce zero tokens');

    const email5 = parseContextMentions('cc: engineer@corp.com /solve @error 修复内存泄漏');
    assertEqual(email5.tokens, ['@error'], 'Email mixed with valid @error extracts ONLY @error');
    assertEqual(email5.cleanPrompt, 'cc: engineer@corp.com /solve 修复内存泄漏', 'Email preserved while @error stripped');
  }

  // 1.6 5x Repeated Tags (Deduplication & Order Preservation)
  console.log(`\n${C.yellow}* Subsection 1.6: 5x Repeated Tags Deduplication${C.reset}`);
  {
    const rep1 = parseContextMentions('@clipboard @clipboard @clipboard @clipboard @clipboard');
    assertEqual(rep1.tokens, ['@clipboard'], '5x repeated @clipboard deduplicated to single tag');
    assertEqual(rep1.cleanPrompt, '', 'Clean prompt empty when all 5 tags stripped');

    const rep2 = parseContextMentions('/shred @selection @selection @selection @selection @selection');
    assertEqual(rep2.tokens, ['@selection'], '5x repeated @selection deduplicated to single tag');
    assertEqual(rep2.cleanPrompt, '/shred', 'Clean prompt retains slash command');

    const rep3 = parseContextMentions('@error @error @error @error @error 排查五次重复');
    assertEqual(rep3.tokens, ['@error'], '5x repeated @error deduplicated to single tag');
    assertEqual(rep3.cleanPrompt, '排查五次重复', 'Clean prompt stripped of all 5 @error instances');

    const rep4 = parseContextMentions('@clipboard @error @clipboard @error @clipboard @error @clipboard @error @clipboard @error');
    assertEqual(rep4.tokens, ['@clipboard', '@error'], '10x alternating tags deduplicated in appearance order');
    assertEqual(rep4.cleanPrompt, '', 'Clean prompt empty after removing all alternating tags');

    // Envelope building with 5x repeated tags should yield strictly 1 attachment
    const envRep = buildContextEnvelope({
      rawPrompt: '/plan @clipboard @clipboard @clipboard @clipboard @clipboard 整理资产',
      clipboardText: 'Persistent clipboard data'
    });
    assertEqual(envRep.attachments.length, 1, 'buildContextEnvelope creates exactly 1 attachment for 5x tag');
    assertEqual(envRep.attachments[0].tag, '@clipboard', 'Attachment tag is @clipboard');
    assertEqual(envRep.cleanPrompt, '整理资产', 'Clean prompt in envelope correctly stripped');
  }

  // 1.7 Special characters and edge cases
  console.log(`\n${C.yellow}* Subsection 1.7: Special characters & Unicode boundaries${C.reset}`);
  {
    const spec1 = parseContextMentions('@clipboard;');
    assertEqual(spec1.tokens, ['@clipboard'], 'Trailing semicolon not part of tag regex, tag cleanly isolated');

    const spec2 = parseContextMentions('@file:C:/path/to/file.js');
    assertEqual(spec2.tokens, ['@file:C:/path/to/file.js'], 'Windows-style file path tag parsed');

    const spec3 = parseContextMentions('@clue:card_101');
    assertEqual(spec3.tokens, ['@clue:card_101'], 'Colon clue id tag parsed');

    // Chinese characters immediately after @
    const spec4 = parseContextMentions('@剪贴板测试');
    assertEqual(spec4.tokens, [], 'Non-ASCII tag rejected safely without exception');
    assertEqual(spec4.cleanPrompt, '@剪贴板测试', 'Non-ASCII @ preserved');

    // Null and undefined safety
    assertEqual(parseContextMentions(null).tokens, [], 'Null input yields empty tokens');
    assertEqual(parseContextMentions(undefined).tokens, [], 'Undefined input yields empty tokens');
    assertEqual(parseContextMentions(12345).tokens, [], 'Numeric input converted and yields empty tokens');
  }

  // =========================================================================
  // SECTION 2: Oversized Payloads (100k chars) & Truncation Invariants
  // =========================================================================
  console.log(`\n${C.cyan}${C.bold}--- [2/3] Oversized Payloads (100k chars) & Truncation Invariants ---${C.reset}`);

  const hugeString100k = 'X'.repeat(100000);
  assert(hugeString100k.length === 100000, 'Constructed 100,000 character payload');

  // 2.1 assembleCompoundPrompt with 100k attachment
  console.log(`\n${C.yellow}* Subsection 2.1: assembleCompoundPrompt with 100k attachment${C.reset}`);
  {
    const compound = assembleCompoundPrompt({
      command: '/solve',
      cleanPrompt: '分析超大上下文卡点',
      attachments: [{ tag: '@clipboard', content: hugeString100k }]
    });

    assert(compound.includes(' [...truncated]'), 'Compound prompt contains [...truncated] marker');
    assert(compound.includes('[指令]: /solve'), 'Compound prompt contains command header');
    assert(compound.includes('[核心诉求]: 分析超大上下文卡点'), 'Compound prompt contains clean prompt');
    assert(compound.length <= 5000, `Compound prompt length (${compound.length}) must be <= 5000 chars`);
    console.log(`    -> Actual compoundPrompt length: ${compound.length} chars (Limit: 5000)`);
  }

  // 2.2 buildContextEnvelope with 100k clipboard text
  console.log(`\n${C.yellow}* Subsection 2.2: buildContextEnvelope with 100k clipboard text${C.reset}`);
  {
    const envelope = buildContextEnvelope({
      rawPrompt: '/shred @clipboard 粉碎超大剪贴板内容',
      clipboardText: hugeString100k
    });

    assertEqual(envelope.attachments.length, 1, 'Single attachment resolved for @clipboard');
    const att = envelope.attachments[0];

    // Raw attachment size capped at 32KB (32768) + marker (15)
    assert(att.content.length <= 32768 + 15, `Raw attachment body length (${att.content.length}) capped at <= 32783`);
    assert(att.content.endsWith(' [...truncated]'), 'Raw attachment body ends with [...truncated]');
    assert(att.preview.length <= 100, `Attachment preview length (${att.preview.length}) capped at <= 100`);

    // Compound prompt size capped at <= 5000
    assert(envelope.compoundPrompt.length <= 5000, `Envelope compoundPrompt length (${envelope.compoundPrompt.length}) must be <= 5000`);
    assert(envelope.compoundPrompt.includes(' [...truncated]'), 'Compound prompt includes truncation marker');
    console.log(`    -> Actual raw attachment length: ${att.content.length} chars (Limit: 32783)`);
    console.log(`    -> Actual compoundPrompt length: ${envelope.compoundPrompt.length} chars (Limit: 5000)`);
  }

  // 2.3 buildContextEnvelope with 100k activeError
  console.log(`\n${C.yellow}* Subsection 2.3: buildContextEnvelope with 100k activeError${C.reset}`);
  {
    const errEnvelope = buildContextEnvelope({
      rawPrompt: '/solve @error 诊断超大异常堆栈',
      activeError: 'Error: ' + 'E'.repeat(99993)
    });

    assertEqual(errEnvelope.attachments.length, 1, 'Single error attachment resolved');
    const att = errEnvelope.attachments[0];
    assertEqual(att.type, 'error', 'Attachment type is error');
    assert(att.content.length <= 32768 + 15, 'Raw error body capped at 32KB cap');
    assert(errEnvelope.compoundPrompt.length <= 5000, `Error compound prompt length (${errEnvelope.compoundPrompt.length}) <= 5000`);
    console.log(`    -> Actual error compoundPrompt length: ${errEnvelope.compoundPrompt.length} chars (Limit: 5000)`);
  }

  // 2.4 buildContextEnvelope with 100k activeCode
  console.log(`\n${C.yellow}* Subsection 2.4: buildContextEnvelope with 100k activeCode${C.reset}`);
  {
    const codeEnvelope = buildContextEnvelope({
      rawPrompt: '/plan @code 规划重构超大源文件',
      activeCode: 'const data = ' + 'C'.repeat(99987)
    });

    assertEqual(codeEnvelope.attachments.length, 1, 'Single code attachment resolved');
    const att = codeEnvelope.attachments[0];
    assertEqual(att.type, 'code', 'Attachment type is code');
    assert(att.content.length <= 32768 + 15, 'Raw code body capped at 32KB cap');
    assert(codeEnvelope.compoundPrompt.length <= 5000, `Code compound prompt length (${codeEnvelope.compoundPrompt.length}) <= 5000`);
    console.log(`    -> Actual code compoundPrompt length: ${codeEnvelope.compoundPrompt.length} chars (Limit: 5000)`);
  }

  // 2.5 100k chars rawPrompt input (ReDoS & Buffer safety)
  console.log(`\n${C.yellow}* Subsection 2.5: 100k chars rawPrompt input (ReDoS resilience)${C.reset}`);
  {
    const rawHuge = 'P'.repeat(50000) + ' @clipboard ' + 'Q'.repeat(50000);
    const t0 = performance.now();
    const parsedHuge = parseContextMentions(rawHuge);
    const t1 = performance.now();
    const duration = t1 - t0;

    assertEqual(parsedHuge.tokens, ['@clipboard'], 'Correctly extracts @clipboard embedded in 100k string');
    assert(duration < 50.0, `Parsing 100k raw string took ${duration.toFixed(2)}ms (< 50ms, no ReDoS catastrophic backtracking)`);
    console.log(`    -> 100k rawPrompt parse duration: ${duration.toFixed(3)}ms`);
  }

  // =========================================================================
  // SECTION 3: High-Resolution Latency Profiling (Target: < 5ms)
  // =========================================================================
  console.log(`\n${C.cyan}${C.bold}--- [3/3] High-Resolution Execution Latency Profiling (Target: < 5ms) ---${C.reset}`);

  const ITERATIONS = 100;
  console.log(`Running ${ITERATIONS} iterations per benchmark scenario...\n`);

  // Benchmark 1: Lexer parsing normal prompt
  {
    const samples = [];
    const prompt = '/solve @clipboard @error 诊断数据库死锁异常';
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      parseContextMentions(prompt);
      const t1 = performance.now();
      samples.push(t1 - t0);
    }
    const stat = computeStats(samples);
    results.benchmarks.lexerNormal = stat;
    console.log(`${C.yellow}B1: Lexer Normal Prompt (/solve @clipboard @error ...)${C.reset}`);
    console.log(`    Min: ${stat.min.toFixed(4)}ms | Mean: ${stat.mean.toFixed(4)}ms | p50: ${stat.p50.toFixed(4)}ms | p95: ${stat.p95.toFixed(4)}ms | p99: ${stat.p99.toFixed(4)}ms | Max: ${stat.max.toFixed(4)}ms`);
    assert(stat.mean < 5.0, `B1 Mean latency (${stat.mean.toFixed(3)}ms) must be < 5.0ms`);
    assert(stat.p95 < 5.0, `B1 p95 latency (${stat.p95.toFixed(3)}ms) must be < 5.0ms`);
  }

  // Benchmark 2: Lexer parsing degenerate prompt
  {
    const samples = [];
    const degeneratePrompt = 'user@corp.com @ @ @ @@ @@@@@ @clipboard @clipboard @clipboard @error \t\n trailing @';
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      parseContextMentions(degeneratePrompt);
      const t1 = performance.now();
      samples.push(t1 - t0);
    }
    const stat = computeStats(samples);
    results.benchmarks.lexerDegenerate = stat;
    console.log(`\n${C.yellow}B2: Lexer Degenerate Tokens (bare @, @@, email, 5x repeated, trailing @)${C.reset}`);
    console.log(`    Min: ${stat.min.toFixed(4)}ms | Mean: ${stat.mean.toFixed(4)}ms | p50: ${stat.p50.toFixed(4)}ms | p95: ${stat.p95.toFixed(4)}ms | p99: ${stat.p99.toFixed(4)}ms | Max: ${stat.max.toFixed(4)}ms`);
    assert(stat.mean < 5.0, `B2 Mean latency (${stat.mean.toFixed(3)}ms) must be < 5.0ms`);
    assert(stat.p95 < 5.0, `B2 p95 latency (${stat.p95.toFixed(3)}ms) must be < 5.0ms`);
  }

  // Benchmark 3: Envelope assembly with standard payloads
  {
    const samples = [];
    const options = {
      rawPrompt: '/solve @clipboard @error @code 解决核心死锁',
      clipboardText: 'ActivePoolSize: 100/100, QueueDepth: 450, Timeout: 3000ms',
      activeError: 'DeadlockDetectedException: circular wait between thread 12 and 15',
      activeCode: 'synchronized (lockA) { synchronized (lockB) { ... } }'
    };
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      buildContextEnvelope(options);
      const t1 = performance.now();
      samples.push(t1 - t0);
    }
    const stat = computeStats(samples);
    results.benchmarks.envelopeStandard = stat;
    console.log(`\n${C.yellow}B3: Envelope Assembly Standard (3 attachments: clipboard, error, code)${C.reset}`);
    console.log(`    Min: ${stat.min.toFixed(4)}ms | Mean: ${stat.mean.toFixed(4)}ms | p50: ${stat.p50.toFixed(4)}ms | p95: ${stat.p95.toFixed(4)}ms | p99: ${stat.p99.toFixed(4)}ms | Max: ${stat.max.toFixed(4)}ms`);
    assert(stat.mean < 5.0, `B3 Mean latency (${stat.mean.toFixed(3)}ms) must be < 5.0ms`);
    assert(stat.p95 < 5.0, `B3 p95 latency (${stat.p95.toFixed(3)}ms) must be < 5.0ms`);
  }

  // Benchmark 4: Envelope assembly with 100k oversized payload
  {
    const samples = [];
    const options100k = {
      rawPrompt: '/shred @clipboard 处理100k剪贴板超大上下文',
      clipboardText: hugeString100k
    };
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      buildContextEnvelope(options100k);
      const t1 = performance.now();
      samples.push(t1 - t0);
    }
    const stat = computeStats(samples);
    results.benchmarks.envelopeOversized100k = stat;
    console.log(`\n${C.yellow}B4: Envelope Assembly Oversized (100,000 chars payload + truncation)${C.reset}`);
    console.log(`    Min: ${stat.min.toFixed(4)}ms | Mean: ${stat.mean.toFixed(4)}ms | p50: ${stat.p50.toFixed(4)}ms | p95: ${stat.p95.toFixed(4)}ms | p99: ${stat.p99.toFixed(4)}ms | Max: ${stat.max.toFixed(4)}ms`);
    assert(stat.mean < 5.0, `B4 Mean latency (${stat.mean.toFixed(3)}ms) must be < 5.0ms`);
    assert(stat.p95 < 5.0, `B4 p95 latency (${stat.p95.toFixed(3)}ms) must be < 5.0ms`);
  }

  // Benchmark 5: End-to-end Pipeline (Slash command + Lexer + Envelope + Compound serialization)
  {
    const samples = [];
    const fullInput = '/plan @clipboard @selection @error 制定数据库故障恢复方案';
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const slash = parseSlashCommand(fullInput);
      const envelope = buildContextEnvelope({
        command: slash.command,
        rawPrompt: slash.query,
        clipboardText: 'PostgreSQL connection pool exhausted: 100 max connections reached',
        activeError: 'FATAL: sorry, too many clients already'
      });
      const t1 = performance.now();
      samples.push(t1 - t0);
    }
    const stat = computeStats(samples);
    results.benchmarks.pipelineE2E = stat;
    console.log(`\n${C.yellow}B5: End-to-End Pipeline (parseSlash + buildEnvelope + assembleCompound)${C.reset}`);
    console.log(`    Min: ${stat.min.toFixed(4)}ms | Mean: ${stat.mean.toFixed(4)}ms | p50: ${stat.p50.toFixed(4)}ms | p95: ${stat.p95.toFixed(4)}ms | p99: ${stat.p99.toFixed(4)}ms | Max: ${stat.max.toFixed(4)}ms`);
    assert(stat.mean < 5.0, `B5 Mean latency (${stat.mean.toFixed(3)}ms) must be < 5.0ms`);
    assert(stat.p95 < 5.0, `B5 p95 latency (${stat.p95.toFixed(3)}ms) must be < 5.0ms`);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n${C.magenta}${C.bold}================================================================${C.reset}`);
  console.log(`${C.magenta}${C.bold}                STRESS HARNESS EXECUTION SUMMARY                ${C.reset}`);
  console.log(`${C.magenta}${C.bold}================================================================${C.reset}`);
  console.log(`Total Assertions : ${results.totalTests}`);
  console.log(`Passed           : ${C.green}${results.passed}${C.reset}`);
  console.log(`Failed           : ${results.failed > 0 ? C.red : C.green}${results.failed}${C.reset}`);
  console.log(`Target Latency   : < 5.000 ms`);
  console.log(`Measured Pipeline: Mean ${results.benchmarks.pipelineE2E.mean.toFixed(4)}ms, p95 ${results.benchmarks.pipelineE2E.p95.toFixed(4)}ms`);

  if (results.failed === 0) {
    console.log(`\n${C.green}${C.bold}✓ ALL EMPIRICAL ADVERSARIAL STRESS & LATENCY TESTS PASSED!${C.reset}\n`);
    return { success: true, results };
  } else {
    console.log(`\n${C.red}${C.bold}✗ ADVERSARIAL STRESS FAILURES DETECTED!${C.reset}\n`);
    return { success: false, results };
  }
}

// Execute harness
runAdversarialSuite()
  .then(res => {
    if (!res.success) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(`Fatal error in harness: ${err.stack || err.message}`);
    process.exit(1);
  });
