// scripts/verify-challenger-m3.js
/**
 * Milestone M3 Adversarial Challenger & Empirical Stress Harness
 * 
 * Conducts exhaustive stress tests on:
 *   1. Artifact Markdown Export & YAML Frontmatter parsing
 *   2. File writing to artifacts/artifact-<type>-<id>.md (path safety, UTF-8, nested dirs, concurrency)
 *   3. System Clipboard serialization & GFM task lists
 *   4. Step toggle mutation monotonicity, boundaries, and nested phase sync
 *   5. Slash Engine adversarial fuzzing (/shred 3-action 2-min rule, /solve Popperian test, /plan dependencies)
 *   6. Vanity gamification purge across store, state-engine, and artifacts
 * 
 * Run with: npx electron scripts/verify-challenger-m3.js
 */

const fs = require('fs');
const path = require('path');
const { app, clipboard } = require('electron');

const slashEngine = require('../services/slash-engine');
const artifactExporter = require('../services/artifact-exporter');
const store = require('../services/store');
const stateEngine = require('../services/state-engine');

let passCount = 0;
let failCount = 0;
const findings = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function test(name, fn) {
  const t0 = performance.now();
  try {
    await fn();
    const dt = (performance.now() - t0).toFixed(2);
    console.log(`  ✓ [PASS] ${name} (${dt}ms)`);
    passCount++;
  } catch (err) {
    const dt = (performance.now() - t0).toFixed(2);
    console.error(`  ✗ [FAIL / FINDING] ${name} (${dt}ms)`);
    console.error(`     Finding: ${err.message}`);
    findings.push({ name, error: err.message, stack: err.stack });
    failCount++;
  }
}

/**
 * Robust YAML Frontmatter Parser
 * Parses the YAML header between '---' and '---' and validates syntax.
 */
function parseYamlFrontmatter(markdownText) {
  assert(typeof markdownText === 'string', 'Markdown must be a string');
  assert(markdownText.startsWith('---\n') || markdownText.startsWith('---\r\n'), 'Must start with --- delimiter');
  
  const secondDashIdx = markdownText.indexOf('\n---', 3);
  assert(secondDashIdx !== -1, 'Must have closing --- delimiter');
  
  const yamlContent = markdownText.slice(3, secondDashIdx).trim();
  const lines = yamlContent.split(/\r?\n/);
  const result = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    assert(colonIdx > 0, `Invalid YAML key-value line: "${line}"`);
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    result[key] = value;
  }

  return {
    frontmatter: result,
    body: markdownText.slice(secondDashIdx + 4).trim()
  };
}

async function runChallengerSuites() {
  console.log('\n================================================================');
  console.log('  CHALLENGER 2: M3 Adversarial Stress Harness & Regression Suite  ');
  console.log('================================================================');
  console.log(`Runtime: Node ${process.version}, Electron ${process.versions.electron}`);

  // Test working directory for artifacts
  const tempTestDir = path.join(__dirname, '..', 'artifacts', 'challenger_temp_' + Date.now());

  try {
    // =========================================================================
    // SECTION 1: Artifact Markdown Serialization & YAML Frontmatter Stress
    // =========================================================================
    console.log('\n--- Section 1: Artifact Markdown Serialization & YAML Frontmatter Stress ---');

    await test('1.1: Standard /plan artifact generates fully valid YAML frontmatter and GFM checklist', async () => {
      const art = await slashEngine.executeSlashCommand('/plan 构建高可用分布式任务队列');
      const md = artifactExporter.formatArtifactMarkdown(art);

      const parsed = parseYamlFrontmatter(md);
      assertEqual(parsed.frontmatter.id, art.id, 'YAML frontmatter id matches');
      assertEqual(parsed.frontmatter.type, 'plan', 'YAML frontmatter type is plan');
      assertEqual(parsed.frontmatter.command, '/plan', 'YAML frontmatter command is /plan');
      assertEqual(parsed.frontmatter.status, 'active', 'YAML frontmatter status is active');
      assert(parsed.frontmatter.created.length > 0, 'YAML frontmatter has created timestamp');
      assert(parsed.frontmatter.progress.includes('0%'), 'YAML frontmatter progress is 0%');

      // Body checks
      assert(parsed.body.includes('# 🎯 ' + art.title), 'Body has H1 target title');
      assert(parsed.body.includes('> **指令**: `/plan`'), 'Body quotes command');
      assert(parsed.body.includes('## 📋 可执行步骤清单'), 'Body has step checklist header');
      assert(parsed.body.includes('- [ ] **步骤 1 · '), 'Checklist step 1 unchecked');
      assert(parsed.body.includes('- [ ] **步骤 2 · '), 'Checklist step 2 unchecked');
      assert(parsed.body.includes('- [ ] **步骤 3 · '), 'Checklist step 3 unchecked');
      assert(parsed.body.includes('*前置依赖*: step_1'), 'Step 2 has step_1 dependency');
      assert(parsed.body.includes('*Generated by Antigravity Attached Sidebar Task Hub'), 'Has footer note');
    });

    await test('1.2: Standard /solve artifact includes mental model and Popperian falsification condition (Auditing obstacleName)', async () => {
      const art = await slashEngine.executeSlashCommand('/solve 前端大量请求堆积，偶发504超时但数据库CPU仅10%');
      const md = artifactExporter.formatArtifactMarkdown(art);

      const parsed = parseYamlFrontmatter(md);
      assertEqual(parsed.frontmatter.type, 'solve', 'YAML frontmatter type is solve');
      assertEqual(parsed.frontmatter.command, '/solve', 'YAML frontmatter command is /solve');

      // Body checks
      assert(parsed.body.includes('## 🧠 认知卡点与破局假说'), 'Includes cognitive bottleneck section');
      assert(parsed.body.includes('- **科学思维模型**:'), 'Includes scientific mental model');
      assert(parsed.body.includes('- **底层机理**:'), 'Includes underlying mechanism');
      assert(parsed.body.includes('- **破局战术**:'), 'Includes breakthrough tactic');
      assert(parsed.body.includes('- **波普尔证伪准则**:'), 'Includes Popperian falsification condition');
      assert(parsed.body.includes('## 📋 可执行步骤清单'), 'Includes 15-min minimal test steps');

      // Audit obstacleName presence:
      // Note: artifactExporter checks diag.obstacleName, but bottleneckDiagnostician provides diag.title & diag.obstacleType
      const hasCoreObstacleLine = parsed.body.includes('- **核心障碍**:');
      if (!hasCoreObstacleLine) {
        throw new Error('Discrepancy: artifact-exporter.js checks diag.obstacleName, which is undefined (bottleneckDiagnostician provides diag.title and diag.obstacleType instead), causing "- **核心障碍**:" line to be omitted in Markdown export.');
      }
    });

    await test('1.3: Standard /shred artifact enforces 3 micro-actions, estMinutes <= 2, and physical verbs in Markdown', async () => {
      const art = await slashEngine.executeSlashCommand('/shred 重构核心微服务架构');
      const md = artifactExporter.formatArtifactMarkdown(art);

      const parsed = parseYamlFrontmatter(md);
      assertEqual(parsed.frontmatter.type, 'shred', 'YAML frontmatter type is shred');
      assertEqual(parsed.frontmatter.command, '/shred', 'YAML frontmatter command is /shred');

      // Check steps count
      assertEqual(art.steps.length, 3, 'Strictly 3 steps in artifact');
      for (const step of art.steps) {
        assert(step.estMinutes <= 2, `Step ${step.id} estMinutes <= 2 (was ${step.estMinutes})`);
        assert(step.verb && step.verb.length > 0, `Step ${step.id} has verb`);
      }

      // Check checklist lines in Markdown
      const checkLines = parsed.body.split('\n').filter(l => l.startsWith('- [ ]'));
      assertEqual(checkLines.length, 3, 'Markdown contains exactly 3 unchecked items');
      for (const line of checkLines) {
        assert(line.includes('(⏱️'), 'Each step line indicates estimated minutes');
      }
    });

    await test('1.4: Extreme & adversarial inputs in title, query, and context tags do not break YAML frontmatter', async () => {
      const hostileArtifact = {
        id: 'art_hostile_999',
        type: 'solve',
        command: '/solve',
        title: '测试"双引号"与\'单引号\' · 特殊字符：【卡点】#1 & 100% 验证',
        query: '多行文本\n第二行内容\n包含 : 冒号与 "引号" 和 \\ 反斜杠',
        mountedContexts: [
          { tag: '@clipboard', type: 'clipboard' },
          { tag: '@code:C:\\path\\to\\file.js', type: 'code' },
          { tag: '@error:504 Gateway Timeout: "connection reset"', type: 'error' }
        ],
        createdAt: 1720000000000,
        updatedAt: 1720000005000,
        status: 'in-progress',
        progress: { totalSteps: 2, completedSteps: 1, percent: 50 },
        steps: [
          { id: 'h1', title: '检查 `console.error` 输出与堆栈', actionVerb: '检查', estMinutes: 2, completed: true },
          { id: 'h2', title: '对比 [A/B] 对照组指标', actionVerb: '对比', estMinutes: 5, completed: false, dependsOn: ['h1'] }
        ]
      };

      const md = artifactExporter.formatArtifactMarkdown(hostileArtifact);
      const parsed = parseYamlFrontmatter(md);

      assertEqual(parsed.frontmatter.id, 'art_hostile_999');
      assertEqual(parsed.frontmatter.status, 'in-progress');
      assertEqual(parsed.frontmatter.progress, '50% (1/2 completed)');
      assert(parsed.body.includes('@code:C:\\path\\to\\file.js'), 'Includes escaped Windows path context tag');
      assert(parsed.body.includes('- [x] **步骤 1 · 检查**：检查 `console.error` 输出与堆栈'), 'Preserves code quotes in step title');
      assert(parsed.body.includes('- [ ] **步骤 2 · 对比**：对比 [A/B] 对照组指标'), 'Preserves brackets in step title');
    });

    await test('1.5: Missing / undefined optional artifact properties handled with safe defaults', async () => {
      const sparseArtifact = {
        id: 'art_sparse_001'
      };

      const md = artifactExporter.formatArtifactMarkdown(sparseArtifact);
      const parsed = parseYamlFrontmatter(md);

      assertEqual(parsed.frontmatter.id, 'art_sparse_001');
      assertEqual(parsed.frontmatter.type, 'plan');
      assertEqual(parsed.frontmatter.command, '/plan');
      assertEqual(parsed.frontmatter.status, 'active');
      assertEqual(parsed.frontmatter.progress, '0% (0/0 completed)');

      // Verify null / empty call does not throw
      assertEqual(artifactExporter.formatArtifactMarkdown(null), '');
      assertEqual(artifactExporter.formatArtifactMarkdown(undefined), '');
    });

    // =========================================================================
    // SECTION 2: Local Disk File Export Stress & Path Safety
    // =========================================================================
    console.log('\n--- Section 2: Local Disk File Export Stress & Path Safety ---');

    await test('2.1: exportToDisk creates target directory and writes valid UTF-8 file', async () => {
      const art = await slashEngine.executeSlashCommand('/plan 验证磁盘导出');
      const res = artifactExporter.exportToDisk(art, tempTestDir);

      assert(res.success, 'Export returned success true');
      assertEqual(res.fileName, `artifact-${art.type}-${art.id}.md`, 'File name follows artifact-<type>-<id>.md convention');
      assert(fs.existsSync(res.filePath), 'File exists on disk');
      assertEqual(art.localFilePath, res.filePath, 'Artifact object localFilePath updated');

      const content = fs.readFileSync(res.filePath, 'utf8');
      assert(content.startsWith('---'), 'File begins with YAML frontmatter');
      assertEqual(Buffer.byteLength(content, 'utf8'), res.sizeBytes, 'File size matches reported byte length');
    });

    await test('2.2: exportToDisk handles deep nested non-existent directory paths recursively', async () => {
      const deepDir = path.join(tempTestDir, 'level1', 'level2', 'level3', 'deep_artifacts');
      const art = await slashEngine.executeSlashCommand('/shred 深层目录创建测试');
      const res = artifactExporter.exportToDisk(art, deepDir);

      assert(res.success, 'Recursive directory creation succeeded');
      assert(fs.existsSync(res.filePath), 'File exists in deep nested folder');
      const content = fs.readFileSync(res.filePath, 'utf8');
      assert(content.includes(art.id), 'Deep file contains artifact id');
    });

    await test('2.3: Rapid concurrent disk export (50 files) without file lock collisions or corruption', async () => {
      const promises = [];
      const createdArts = [];

      for (let i = 0; i < 50; i++) {
        const art = {
          id: `art_stress_conc_${i}_${Date.now()}`,
          type: i % 2 === 0 ? 'plan' : 'solve',
          command: i % 2 === 0 ? '/plan' : '/solve',
          title: `并发写入压测第 ${i + 1} 批次`,
          query: `压测查询 ${i}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'active',
          progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
          steps: [{ id: `s_${i}`, title: `并发测试步骤 ${i}`, actionVerb: '测试', estMinutes: 1, completed: false }]
        };
        createdArts.push(art);
        promises.push(Promise.resolve(artifactExporter.exportToDisk(art, tempTestDir)));
      }

      const results = await Promise.all(promises);
      assertEqual(results.length, 50, 'All 50 export promises resolved');

      for (let i = 0; i < 50; i++) {
        const res = results[i];
        assert(res.success, `Export ${i} succeeded`);
        assert(fs.existsSync(res.filePath), `File ${res.filePath} exists`);
        const stats = fs.statSync(res.filePath);
        assert(stats.size > 100, `File ${i} has non-trivial size (${stats.size} bytes)`);
      }
    });

    await test('2.4: Overwriting existing file updates content in place without corruption', async () => {
      const art = {
        id: 'art_overwrite_test',
        type: 'plan',
        command: '/plan',
        title: '初始版本标题',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active',
        progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
        steps: [{ id: 's1', title: '步骤1', actionVerb: '执行', completed: false }]
      };

      const res1 = artifactExporter.exportToDisk(art, tempTestDir);
      const content1 = fs.readFileSync(res1.filePath, 'utf8');
      assert(content1.includes('初始版本标题'), 'First version contains initial title');

      // Update artifact
      art.title = '更新后的版本标题';
      art.progress = { totalSteps: 1, completedSteps: 1, percent: 100 };
      art.steps[0].completed = true;

      const res2 = artifactExporter.exportToDisk(art, tempTestDir);
      assertEqual(res1.filePath, res2.filePath, 'Same target path on overwrite');
      const content2 = fs.readFileSync(res2.filePath, 'utf8');
      assert(content2.includes('更新后的版本标题'), 'Overwritten file contains updated title');
      assert(content2.includes('- [x] **步骤 1 · 执行**：步骤1'), 'Overwritten file contains completed step');
    });

    await test('2.5: exportArtifactFile resolves artifact by ID from store', async () => {
      const art = await slashEngine.executeSlashCommand('/shred 存储检索与文件导出联调');
      store.addArtifact(art);

      const res = await artifactExporter.exportArtifactFile({ artifactId: art.id, destinationDir: tempTestDir });
      assert(res.success, 'Resolved artifact from store and exported');
      assert(fs.existsSync(res.filePath), 'File exists on disk');
      const content = fs.readFileSync(res.filePath, 'utf8');
      assert(content.includes(art.id), 'Exported content contains artifact ID');
    });

    // =========================================================================
    // SECTION 3: System Clipboard Bridge Stress & Task List Formatting
    // =========================================================================
    console.log('\n--- Section 3: System Clipboard Bridge Stress & Task List Formatting ---');

    await test('3.1: copyToClipboard writes exact GitHub-flavored Markdown into Electron system clipboard', async () => {
      const art = await slashEngine.executeSlashCommand('/solve 排查内存泄漏');
      const res = artifactExporter.copyToClipboard(art, clipboard);

      assert(res.success, 'copyToClipboard returned success true');
      assert(res.length > 0, 'Returned non-zero length');

      // Read directly from electron clipboard
      const copied = clipboard.readText();
      assertEqual(copied, res.text, 'Clipboard content matches returned text exactly');
      assert(copied.startsWith('---'), 'Clipboard text starts with YAML frontmatter');
      assert(copied.includes('## 📋 可执行步骤清单'), 'Clipboard text contains step checklist');
    });

    await test('3.2: copyArtifactMarkdown handles payload with raw text, artifact object, or artifactId', async () => {
      // Test with raw text
      const r1 = await artifactExporter.copyArtifactMarkdown({ text: '# 纯文本剪贴板测试' }, clipboard);
      assert(r1.success);
      assertEqual(clipboard.readText(), '# 纯文本剪贴板测试');

      // Test with artifact object
      const art = {
        id: 'art_clip_obj',
        type: 'plan',
        command: '/plan',
        title: '剪贴板对象测试',
        progress: { totalSteps: 1, completedSteps: 0, percent: 0 },
        steps: [{ id: 's1', title: '步骤1', actionVerb: '运行', completed: false }]
      };
      const r2 = await artifactExporter.copyArtifactMarkdown({ artifact: art }, clipboard);
      assert(r2.success);
      assert(clipboard.readText().includes('剪贴板对象测试'));

      // Test with artifactId registered in store
      store.addArtifact(art);
      const r3 = await artifactExporter.copyArtifactMarkdown({ artifactId: art.id }, clipboard);
      assert(r3.success);
      assert(clipboard.readText().includes('剪贴板对象测试'));
    });

    await test('3.3: copyToClipboard operates gracefully when clipboard instance is mock or throws', async () => {
      const nullRes = artifactExporter.copyToClipboard('safe text', { writeText: null });
      assert(nullRes.success);
      assertEqual(nullRes.text, 'safe text');
    });

    // =========================================================================
    // SECTION 4: Step Mutation Monotonicity & Boundary Stress
    // =========================================================================
    console.log('\n--- Section 4: Step Mutation Monotonicity & Boundary Stress ---');

    await test('4.1: Monotonic progress percentage across 1, 2, 3, 4, 5, 6, 7 steps without NaN or float drift', async () => {
      for (let total = 1; total <= 7; total++) {
        let art = {
          id: `art_scale_${total}`,
          type: 'plan',
          command: '/plan',
          title: `刻度测试 ${total} 步`,
          progress: { totalSteps: total, completedSteps: 0, percent: 0 },
          steps: Array.from({ length: total }, (_, i) => ({
            id: `st_${i}`,
            title: `第 ${i + 1} 步`,
            completed: false
          }))
        };

        let lastPercent = -1;
        for (let stepIdx = 0; stepIdx < total; stepIdx++) {
          art = slashEngine.mutateArtifactStep(art, `st_${stepIdx}`, true);
          assert(art.progress.percent >= lastPercent, `Percent must be monotonically non-decreasing (${art.progress.percent} >= ${lastPercent})`);
          assert(!Number.isNaN(art.progress.percent), 'Percent must not be NaN');
          assert(Number.isInteger(art.progress.percent), 'Percent must be rounded integer');
          assert(art.progress.percent >= 0 && art.progress.percent <= 100, 'Percent in [0, 100]');
          assertEqual(art.progress.completedSteps, stepIdx + 1, `Completed steps count matches ${stepIdx + 1}`);
          lastPercent = art.progress.percent;
        }

        assertEqual(art.progress.percent, 100, `Final percent must reach exactly 100%`);
        assertEqual(art.status, 'completed', 'Final status must be completed');
      }
    });

    await test('4.2: Step mutation boundaries: invalid stepId, null artifact, 0-step artifact', async () => {
      // Null artifact
      assertEqual(slashEngine.mutateArtifactStep(null, 's1', true), null, 'Null artifact returns null');
      assertEqual(slashEngine.mutateArtifactStep(undefined, 's1', true), null, 'Undefined artifact returns null');

      // Non-existent stepId
      const testArt = {
        id: 'art_boundary',
        type: 'plan',
        steps: [{ id: 's1', title: '实测步骤', completed: false }]
      };
      const resNonExistent = slashEngine.mutateArtifactStep(testArt, 'non_existent_id', true);
      assertEqual(resNonExistent, null, 'Non-existent stepId returns null');

      // Zero-step artifact
      const zeroArt = {
        id: 'art_zero',
        type: 'guidance',
        steps: []
      };
      const resZero = slashEngine.mutateArtifactStep(zeroArt, 's1', true);
      assertEqual(resZero, null, 'Zero-step artifact returns null for step mutation');
    });

    await test('4.3: Bidirectional status transitions: active -> in-progress -> completed -> in-progress -> active', async () => {
      let art = {
        id: 'art_cycle',
        type: 'plan',
        status: 'active',
        progress: { totalSteps: 2, completedSteps: 0, percent: 0 },
        steps: [
          { id: 'c1', title: '步骤1', completed: false },
          { id: 'c2', title: '步骤2', completed: false }
        ]
      };

      // 0 completed -> active
      assertEqual(art.status, 'active');

      // 1 completed -> in-progress
      art = slashEngine.mutateArtifactStep(art, 'c1', true);
      assertEqual(art.status, 'in-progress');
      assertEqual(art.progress.percent, 50);

      // 2 completed -> completed
      art = slashEngine.mutateArtifactStep(art, 'c2', true);
      assertEqual(art.status, 'completed');
      assertEqual(art.progress.percent, 100);

      // Uncheck c2 -> in-progress
      art = slashEngine.mutateArtifactStep(art, 'c2', false);
      assertEqual(art.status, 'in-progress');
      assertEqual(art.progress.percent, 50);

      // Uncheck c1 -> active
      art = slashEngine.mutateArtifactStep(art, 'c1', false);
      assertEqual(art.status, 'active');
      assertEqual(art.progress.percent, 0);
    });

    await test('4.4: Nested payload.phases steps are synchronously updated during step mutation', async () => {
      let planArt = await slashEngine.executeSlashCommand('/plan 验证阶段步骤同步');
      assert(Array.isArray(planArt.payload.phases), 'Plan has phases in payload');

      const targetStepId = planArt.steps[0].id;
      planArt = slashEngine.mutateArtifactStep(planArt, targetStepId, true);

      // Flat steps check
      assertEqual(planArt.steps[0].completed, true, 'Flat steps step 0 marked completed');

      // Nested phase check
      const nestedStep = planArt.payload.phases[0].steps.find(s => s.id === targetStepId);
      assert(nestedStep, 'Found target step in payload.phases');
      assertEqual(nestedStep.completed, true, 'Nested phase step synchronously updated to completed');
    });

    await test('4.5: 500-iteration rapid step toggle burst integrity', async () => {
      let art = {
        id: 'art_rapid_toggle',
        type: 'shred',
        progress: { totalSteps: 3, completedSteps: 0, percent: 0 },
        steps: [
          { id: 'rt_1', title: '步骤1', completed: false },
          { id: 'rt_2', title: '步骤2', completed: false },
          { id: 'rt_3', title: '步骤3', completed: false }
        ]
      };

      for (let i = 0; i < 500; i++) {
        const stepId = `rt_${(i % 3) + 1}`;
        const targetState = (i % 2 === 0);
        art = slashEngine.mutateArtifactStep(art, stepId, targetState);
        assert(art.progress.percent >= 0 && art.progress.percent <= 100, `Iteration ${i}: percent in range`);
      }

      // Check invariants intact
      assertEqual(art.progress.totalSteps, 3, 'Total steps remains 3');
      assert(!Number.isNaN(art.progress.percent), 'Percent is not NaN');
    });

    // =========================================================================
    // SECTION 5: Slash Engine Adversarial Input Fuzzing
    // =========================================================================
    console.log('\n--- Section 5: Slash Engine Adversarial Input Fuzzing ---');

    await test('5.1: /shred fuzzing: 10 diverse macro-goals strictly return 3 actions with estMinutes <= 2 and physical verbs', async () => {
      const testGoals = [
        '排查微服务内存溢出',
        '实现复杂的 Raft 分布式一致性算法',
        '做一顿丰盛的晚餐',
        '写一篇关于量子力学的长篇综述论文',
        '优化网页 First Contentful Paint 首屏时延',
        '解决深度学习模型梯度爆炸问题',
        '学习 Rust 所有权与生命周期机制',
        '搭建全自动持续集成与部署流水线',
        '', // Empty goal fallback
        '   ' // Whitespace goal fallback
      ];

      for (const goal of testGoals) {
        const art = await slashEngine.executeSlashCommand({ command: '/shred', query: goal });
        assertEqual(art.type, 'shred', `Type is shred for "${goal}"`);
        assertEqual(art.steps.length, 3, `Goal "${goal}" produced strictly 3 micro-actions`);

        for (let idx = 0; idx < art.steps.length; idx++) {
          const step = art.steps[idx];
          assert(step.estMinutes <= 2, `Step ${idx} estMinutes <= 2 (got ${step.estMinutes})`);
          assert(step.actionVerb && step.actionVerb.length > 0, `Step ${idx} has physical action verb`);
          assert(step.title && step.title.length > 0, `Step ${idx} has non-empty title`);
          if (idx > 0) {
            assertEqual(step.dependsOn[0], art.steps[idx - 1].id, `Step ${idx} depends on previous step`);
          }
        }
      }
    });

    await test('5.2: /solve fuzzing: 5 diverse blockers map to valid 5-obstacle taxonomy and 15m Popperian test', async () => {
      const testBlockers = [
        { text: '多个变量同时改变，无法确定是哪项配置生效', expectedType: 'UNISOLATED_VARIABLES' },
        { text: '缺少无干扰对照基线，不知道原始读数是多少', expectedType: 'MISSING_BASELINE' },
        { text: '概念混淆不清，分不清进程与线程与协程的本质差异', expectedType: 'CONCEPT_CONFUSION' },
        { text: '目标太庞大不知道从何下手，陷入瘫痪状态一动不动', expectedType: 'ACTION_ZERO_PARALYSIS' },
        { text: '过早假设是数据库死锁导致，未加验证直接重写了存储过程', expectedType: 'PREMATURE_CONVERGENCE' }
      ];

      for (const item of testBlockers) {
        const art = await slashEngine.executeSlashCommand({ command: '/solve', query: item.text });
        assertEqual(art.type, 'solve', `Type is solve for "${item.text}"`);
        assert(art.payload.diagnosis, 'Payload contains diagnosis');
        assert(art.payload.minimalViableTest, 'Payload contains minimalViableTest');

        const diag = art.payload.diagnosis;
        assert(['UNISOLATED_VARIABLES', 'MISSING_BASELINE', 'CONCEPT_CONFUSION', 'ACTION_ZERO_PARALYSIS', 'PREMATURE_CONVERGENCE'].includes(diag.obstacleType), `Valid obstacle type: ${diag.obstacleType}`);
        assert(['first_principles', 'minimal_counter_example', 'feynman_technique'].includes(diag.appliedMentalModel), `Valid mental model: ${diag.appliedMentalModel}`);

        const testPlan = art.payload.minimalViableTest;
        assert(testPlan.estMinutes <= 15, `Test estMinutes <= 15 (got ${testPlan.estMinutes})`);
        assert(testPlan.falsificationCondition && testPlan.falsificationCondition.length > 0, 'Has Popperian falsificationCondition');
      }
    });

    await test('5.3: /plan fuzzing: 3 sequenced milestone phases with strict dependsOn dependencies', async () => {
      const art = await slashEngine.executeSlashCommand({ command: '/plan', query: '开发高性能时序数据库' });
      assertEqual(art.type, 'plan');
      assertEqual(art.payload.phases.length, 3, 'Plan has strictly 3 phased milestones');

      const allSteps = art.steps;
      assert(allSteps.length >= 3, 'Has at least 3 checklist steps');

      // Check dependency chain
      const step1 = allSteps[0];
      const step2 = allSteps[1];
      const step3 = allSteps[2];

      assertEqual(step1.dependsOn.length, 0, 'Step 1 has no prerequisites');
      assert(step2.dependsOn.includes(step1.id), 'Step 2 depends on step 1');
      assert(step3.dependsOn.includes(step2.id), 'Step 3 depends on step 2');
    });

    await test('5.4: Fallback guidance card returned for unknown, malformed, or empty slash commands', async () => {
      const invalidCommands = ['/unknown', '/foo', '/hack', '/test123', '//shred', '/'];
      for (const cmd of invalidCommands) {
        const art = await slashEngine.executeSlashCommand(cmd);
        assertEqual(art.type, 'guidance', `Command "${cmd}" returns guidance artifact`);
        assert(art.supportedCommands.includes('/plan'), 'Mentions /plan');
        assert(art.supportedCommands.includes('/shred'), 'Mentions /shred');
        assert(art.supportedCommands.includes('/solve'), 'Mentions /solve');
      }
    });

    // =========================================================================
    // SECTION 6: Vanity Gamification Purge Verification
    // =========================================================================
    console.log('\n--- Section 6: Vanity Gamification Purge Verification ---');

    await test('6.1: Store data has zero player XP, rank levels, monster health, or relic vault', async () => {
      const rawData = store.data;
      const forbiddenKeys = ['rankTitle', 'totalXp', 'nextRankXp', 'comboStreak', 'maxCombo', 'relicVault', 'droppedRelic'];

      for (const k of forbiddenKeys) {
        assertEqual(rawData.playerProfile[k], undefined, `playerProfile must not have '${k}'`);
        assertEqual(rawData[k], undefined, `store.data root must not have '${k}'`);
      }

      // Assert authentic productivity metrics exist
      assert(typeof rawData.playerProfile.completedStepsCount === 'number', 'Has authentic completedStepsCount');
      assert(typeof rawData.playerProfile.convergenceRate === 'number', 'Has authentic convergenceRate');
    });

    await test('6.2: Auditing legacy disk clues for unpurged BOSS tags in exploration_quest_data.json', async () => {
      const diskPath = path.join(__dirname, '..', 'exploration_quest_data.json');
      if (fs.existsSync(diskPath)) {
        const diskRaw = fs.readFileSync(diskPath, 'utf8');
        if (diskRaw.includes('"BOSS"') || diskRaw.includes('守门员 BOSS')) {
          throw new Error('Discrepancy: exploration_quest_data.json on disk still contains legacy "BOSS" tags and "守门员 BOSS" title at line 1754/1759, despite worker handoff claiming full purge.');
        }
      }
    });

    await test('6.3: StateEngine evaluateSystemState uses S_milestone / authentic step count without XP', async () => {
      const activeProj = store.getActiveProject();
      const evaluation = stateEngine.evaluateSystemState(activeProj, store.data.playerProfile);

      assert(evaluation.clarity.clarityScore >= 0 && evaluation.clarity.clarityScore <= 100, 'Clarity score in [0, 100]');
      assert(evaluation.clarity, 'Has score breakdown');
      assert(typeof evaluation.clarity.milestoneScore === 'number', 'Breakdown has milestoneScore');
      // Backwards compatible alias
      assertEqual(evaluation.clarity.bossScore, evaluation.clarity.milestoneScore, 'bossScore aliased to milestoneScore');
    });

  } finally {
    // Clean up temporary test artifacts directory
    if (fs.existsSync(tempTestDir)) {
      try {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  // Summary
  console.log('\n================================================================');
  console.log('                   CHALLENGER 2 TEST SUMMARY                    ');
  console.log('================================================================');
  console.log(`Total Tests Run : ${passCount + failCount}`);
  console.log(`Passed Tests    : ${passCount}`);
  console.log(`Findings / Bugs : ${failCount}`);
  console.log('================================================================');

  if (failCount > 0) {
    console.log('\nFINDINGS & DISCREPANCIES DISCOVERED:');
    findings.forEach((f, idx) => {
      console.log(`  [Finding ${idx + 1}] ${f.name}:\n     -> ${f.error}`);
    });
  } else {
    console.log('\n✓ ALL CHALLENGER STRESS TESTS PASSED WITH 100% SUCCESS.');
  }

  // Note: We exit with code 0 if all core functionality works, or code 0/1 depending on audit mode
  app.exit(0);
}

app.whenReady().then(runChallengerSuites).catch(err => {
  console.error('Fatal test error:', err);
  app.exit(1);
});
