// scripts/verify-m2-context.js
/**
 * Detailed Unit & Invariant Verification for services/context-manager.js (Milestone M2)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  captureClipboard,
  parseContextMentions,
  parseAtTokens,
  parseSlashCommand,
  assembleCompoundPrompt,
  buildContextEnvelope,
  ContextManager
} = require('../services/context-manager');

console.log('=== Running Context Manager (Milestone M2) Verification Tests ===');

// 1. captureClipboard tests
console.log('Test 1: captureClipboard with mock instance');
{
  const mockClipboard = {
    text: 'Hello World from test',
    readText() { return this.text; }
  };
  const res = captureClipboard(mockClipboard);
  assert.strictEqual(res.text, 'Hello World from test');
  assert.strictEqual(res.length, 21);
  assert.strictEqual(res.preview, 'Hello World from test');
  assert(res.timestamp > 0);
}

console.log('Test 2: captureClipboard preview truncation at 100 chars');
{
  const longText = 'A'.repeat(250);
  const mockClipboard = {
    readText() { return longText; }
  };
  const res = captureClipboard(mockClipboard);
  assert.strictEqual(res.text.length, 250);
  assert.strictEqual(res.preview.length, 100);
  assert(res.preview.endsWith('...'));
}

console.log('Test 3: captureClipboard with empty / throwing clipboard');
{
  const emptyClip = { readText() { return ''; } };
  const resEmpty = captureClipboard(emptyClip);
  assert.strictEqual(resEmpty.text, '');
  assert.strictEqual(resEmpty.length, 0);
  assert.strictEqual(resEmpty.preview, '');

  const throwingClip = { readText() { throw new Error('OS clipboard locked'); } };
  const resThrow = captureClipboard(throwingClip);
  assert.strictEqual(resThrow.text, '');
  assert.strictEqual(resThrow.length, 0);
}

// 2. parseContextMentions tests
console.log('Test 4: parseContextMentions extracts various @ tags');
{
  const input = '/plan @clipboard @selection 解决问题';
  const res = parseContextMentions(input);
  assert.deepStrictEqual(res.tokens, ['@clipboard', '@selection']);
  assert.deepStrictEqual(res.tags, ['@clipboard', '@selection']);
  assert.strictEqual(res.cleanPrompt, '/plan 解决问题');
  assert.strictEqual(res.hasTokens, true);
}

console.log('Test 5: parseContextMentions handles @error, @code, @clue:c1, @file:<path>');
{
  const input = '/solve @error @code @clue:c1 @file:main.js 诊断分析';
  const res = parseContextMentions(input);
  assert.deepStrictEqual(res.tokens, ['@error', '@code', '@clue:c1', '@file:main.js']);
  assert.strictEqual(res.cleanPrompt, '/solve 诊断分析');
  assert.strictEqual(res.hasTokens, true);
}

console.log('Test 6: parseContextMentions leaves bare @ untouched as literal text');
{
  const input = '测试 @ 字符不应被识别为标签';
  const res = parseContextMentions(input);
  assert.strictEqual(res.tokens.length, 0);
  assert.strictEqual(res.cleanPrompt, '测试 @ 字符不应被识别为标签');
  assert.strictEqual(res.hasTokens, false);

  const inputEmailSpace = 'user @ email';
  const resEmailSpace = parseContextMentions(inputEmailSpace);
  assert.strictEqual(resEmailSpace.tokens.length, 0);
  assert.strictEqual(resEmailSpace.cleanPrompt, 'user @ email');

  const inputEmail = 'contact user@example.com for info';
  const resEmail = parseContextMentions(inputEmail);
  assert.strictEqual(resEmail.tokens.length, 0);
  assert.strictEqual(resEmail.cleanPrompt, 'contact user@example.com for info');
}

console.log('Test 7: parseContextMentions deduplicates identical tags');
{
  const input = '/plan @clipboard @clipboard @clipboard 整理清单';
  const res = parseContextMentions(input);
  assert.strictEqual(res.tokens.length, 1);
  assert.strictEqual(res.tokens[0], '@clipboard');
  assert.strictEqual(res.cleanPrompt, '/plan 整理清单');
}

console.log('Test 8: parseContextMentions handles null/undefined/empty input');
{
  assert.strictEqual(parseContextMentions(null).cleanPrompt, '');
  assert.strictEqual(parseContextMentions(null).tokens.length, 0);
  assert.strictEqual(parseContextMentions(undefined).cleanPrompt, '');
  assert.strictEqual(parseContextMentions('').tokens.length, 0);
}

// 3. parseSlashCommand tests
console.log('Test 9: parseSlashCommand parses commands and queries');
{
  const p1 = parseSlashCommand('/plan 重构模块');
  assert.strictEqual(p1.command, '/plan');
  assert.strictEqual(p1.commandName, 'plan');
  assert.strictEqual(p1.query, '重构模块');

  const p2 = parseSlashCommand('/shred');
  assert.strictEqual(p2.command, '/shred');
  assert.strictEqual(p2.query, '');

  const p3 = parseSlashCommand('普通任务');
  assert.strictEqual(p3.command, null);
  assert.strictEqual(p3.query, '普通任务');
}

// 4. assembleCompoundPrompt tests
console.log('Test 10: assembleCompoundPrompt serializes command, cleanPrompt, attachments');
{
  const serialized = assembleCompoundPrompt({
    command: '/solve',
    cleanPrompt: '修复数据库连接池耗尽',
    attachments: [
      { tag: '@clipboard', content: 'ActivePoolSize: 100/100' },
      { tag: '@error', content: 'ConnectionPoolTimeoutException' }
    ]
  });
  assert(serialized.includes('=== 挂载现场上下文 (Mounted Context) ==='));
  assert(serialized.includes('[@clipboard]'));
  assert(serialized.includes('ActivePoolSize: 100/100'));
  assert(serialized.includes('[@error]'));
  assert(serialized.includes('ConnectionPoolTimeoutException'));
  assert(serialized.includes('[指令]: /solve'));
  assert(serialized.includes('[核心诉求]: 修复数据库连接池耗尽'));
}

console.log('Test 11: assembleCompoundPrompt clamps 100,000 char attachment to safe size');
{
  const hugeText = 'Z'.repeat(100000);
  const truncated = assembleCompoundPrompt({
    command: '/solve',
    cleanPrompt: '分析超大文本',
    attachments: [{ tag: '@clipboard', content: hugeText }]
  });
  assert(truncated.includes(' [...truncated]'));
  assert(truncated.length <= 5000, `Expected length <= 5000, got ${truncated.length}`);
}

// 5. buildContextEnvelope tests
console.log('Test 12: buildContextEnvelope resolves tags and bounds');
{
  const envelope = buildContextEnvelope({
    rawPrompt: '/solve @clipboard @error @code 解决核心死锁',
    clipboardText: 'Thread 1 holds lock A, waiting for B',
    activeError: 'DeadlockDetectedException: circular wait',
    activeCode: 'synchronized (lockA) { ... }'
  });

  assert.strictEqual(envelope.command, '/solve');
  assert.strictEqual(envelope.commandName, 'solve');
  assert.strictEqual(envelope.cleanPrompt, '解决核心死锁');
  assert.deepStrictEqual(envelope.tokens, ['@clipboard', '@error', '@code']);
  assert.strictEqual(envelope.hasTokens, true);
  assert.strictEqual(envelope.attachments.length, 3);

  const clipAtt = envelope.attachments.find(a => a.tag === '@clipboard');
  assert(clipAtt);
  assert.strictEqual(clipAtt.type, 'clipboard');
  assert.strictEqual(clipAtt.content, 'Thread 1 holds lock A, waiting for B');

  const errAtt = envelope.attachments.find(a => a.tag === '@error');
  assert(errAtt);
  assert.strictEqual(errAtt.content, 'DeadlockDetectedException: circular wait');

  assert(envelope.compoundPrompt.includes('[指令]: /solve'));
  assert(envelope.compoundPrompt.includes('[核心诉求]: 解决核心死锁'));
  assert(envelope.compoundPrompt.includes('DeadlockDetectedException'));
}

console.log('Test 13: buildContextEnvelope handles local @file:<path>');
{
  const envelope = buildContextEnvelope({
    rawPrompt: '/plan @file:package.json 检查项目依赖'
  });
  assert.strictEqual(envelope.command, '/plan');
  assert.strictEqual(envelope.cleanPrompt, '检查项目依赖');
  const fileAtt = envelope.attachments.find(a => a.type === 'file');
  assert(fileAtt);
  assert(fileAtt.content.includes('"name"'));
}

console.log('Test 14: buildContextEnvelope clamps >32KB text on raw attachment and displays truncated marker');
{
  const giant = 'M'.repeat(40000);
  const envelope = buildContextEnvelope({
    rawPrompt: '/shred @clipboard 大数据阻碍',
    clipboardText: giant
  });
  const att = envelope.attachments[0];
  assert(att.content.length <= 32768 + 20);
  assert(att.content.includes(' [...truncated]'));
}

// 6. ContextManager class tests
console.log('Test 15: ContextManager class methods and instance');
{
  const cmInstance = new ContextManager();
  const resInst = cmInstance.parseContextMentions('/plan @clipboard 任务');
  assert.strictEqual(resInst.cleanPrompt, '/plan 任务');

  const resStatic = ContextManager.parseContextMentions('/plan @clipboard 任务');
  assert.strictEqual(resStatic.cleanPrompt, '/plan 任务');
}

console.log('\n✓ ALL 15 CONTEXT MANAGER UNIT & INVARIANT TESTS PASSED CLEANLY!\n');
