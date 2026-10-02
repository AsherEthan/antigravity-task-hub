// scripts/stress-m2-diagnostician.js
/**
 * Adversarial Stress & Empirical Challenge Suite for Milestone M2:
 * Bottleneck Diagnostician & Scientific Mental Models (Features F4, F5)
 *
 * Runs 75+ adversarial classification scenarios across 6 categories,
 * verifies strict invariants (timeboxMinutes <= 15, non-empty falsificationCondition, confidence > 0),
 * stress-tests detectProactiveTriggers with 30+ pathological project states (circular structures, negative numbers, corrupted arrays),
 * and validates online dual-core resilience and invariant clamping under adversarial LLM responses.
 *
 * Usage:
 *   node scripts/stress-m2-diagnostician.js
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
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

const VALID_OBSTACLES = [
  'CONCEPT_CONFUSION',
  'MISSING_BASELINE',
  'UNISOLATED_VARIABLES',
  'ACTION_ZERO_PARALYSIS',
  'PREMATURE_CONVERGENCE'
];

const VALID_MODELS = [
  'first_principles',
  'minimal_counter_example',
  'feynman_technique'
];

const globalStats = {
  totalScenarios: 0,
  classificationPassed: 0,
  invariantsChecked: 0,
  invariantsPassed: 0,
  pathologicalPassed: 0,
  llmResiliencePassed: 0,
  failures: []
};

function recordFailure(suite, scenario, error) {
  globalStats.failures.push({ suite, scenario, error: error.message || String(error) });
  console.log(`    ${C.red}✗ [FAIL] ${scenario}: ${error.message || error}${C.reset}`);
}

function verifyInvariants(res, contextDesc) {
  globalStats.invariantsChecked++;

  // 1. Success flag
  if (res.success !== true) {
    throw new Error(`[Invariant Failed] res.success must be true for ${contextDesc}`);
  }

  // 2. Obstacle type must be one of 5 valid types
  if (!VALID_OBSTACLES.includes(res.obstacleType)) {
    throw new Error(`[Invariant Failed] Invalid obstacleType: "${res.obstacleType}" for ${contextDesc}`);
  }
  if (res.type !== res.obstacleType) {
    throw new Error(`[Invariant Failed] res.type ("${res.type}") !== res.obstacleType ("${res.obstacleType}")`);
  }

  // 3. Confidence > 0 and valid number
  if (typeof res.confidence !== 'number' || isNaN(res.confidence) || !isFinite(res.confidence) || res.confidence <= 0) {
    throw new Error(`[Invariant Failed] Invalid confidence: ${res.confidence} for ${contextDesc}`);
  }

  // 4. Mental model validation
  if (!VALID_MODELS.includes(res.mentalModel)) {
    throw new Error(`[Invariant Failed] Invalid mentalModel: "${res.mentalModel}" for ${contextDesc}`);
  }
  if (res.appliedMentalModel !== res.mentalModel) {
    throw new Error(`[Invariant Failed] res.appliedMentalModel !== res.mentalModel`);
  }
  if (!res.mentalModelName || typeof res.mentalModelName !== 'string') {
    throw new Error(`[Invariant Failed] mentalModelName must be non-empty string`);
  }

  // 5. Minimal test validation (Crucial Invariant: timeboxMinutes <= 15)
  const test = res.minimalTest;
  if (!test || typeof test !== 'object') {
    throw new Error(`[Invariant Failed] minimalTest is missing or not an object for ${contextDesc}`);
  }
  if (res.minimalViableTest !== test) {
    throw new Error(`[Invariant Failed] minimalViableTest !== minimalTest`);
  }
  if (typeof test.timeboxMinutes !== 'number' || test.timeboxMinutes > 15 || test.timeboxMinutes <= 0) {
    throw new Error(`[Invariant Failed] timeboxMinutes must be <= 15 and > 0, got ${test.timeboxMinutes} for ${contextDesc}`);
  }
  if (typeof test.estMinutes !== 'number' || test.estMinutes > 15 || test.estMinutes <= 0) {
    throw new Error(`[Invariant Failed] estMinutes must be <= 15 and > 0, got ${test.estMinutes} for ${contextDesc}`);
  }

  // 6. Falsification condition must be non-empty string
  if (typeof test.falsificationCondition !== 'string' || test.falsificationCondition.trim().length === 0) {
    throw new Error(`[Invariant Failed] falsificationCondition is empty or not a string for ${contextDesc}`);
  }

  // 7. Instructions array non-empty
  if (!Array.isArray(test.instructions) || test.instructions.length === 0) {
    throw new Error(`[Invariant Failed] instructions must be non-empty array for ${contextDesc}`);
  }

  // 8. Guidance and analysis strings
  if (!res.breakthroughGuidance || typeof res.breakthroughGuidance !== 'string' || res.breakthroughGuidance.length < 5) {
    throw new Error(`[Invariant Failed] breakthroughGuidance too short or missing for ${contextDesc}`);
  }
  if (!res.analysis || typeof res.analysis !== 'string' || res.analysis.length < 5) {
    throw new Error(`[Invariant Failed] analysis too short or missing for ${contextDesc}`);
  }

  globalStats.invariantsPassed++;
}

// -----------------------------------------------------------------------------
// 75+ Adversarial Scenarios across 6 Categories
// -----------------------------------------------------------------------------
const ADVERSARIAL_SCENARIOS = [
  // =========================================================================
  // Category 1: Slang, Colloquialisms & High-Emotion Expressions (15 items)
  // =========================================================================
  {
    cat: 'Slang & Colloquial',
    id: 'S01',
    input: '摸鱼看了一下午架构文档，写了一堆读书笔记，完全没写一行代码去跑跑看',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Slang: 摸鱼 + 虚假忙碌'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S02',
    input: '不知道是遮光眼罩起效了还是设备本身的电位漂移，到底哪个起效完全抓瞎',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Slang: 抓瞎 + 变量未隔离'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S03',
    input: '搞了一下午高大上的黑话和文字游戏，名实不符，根本就是概念混淆的伪问题',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Slang: 黑话 + 文字游戏 + 伪问题'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S04',
    input: '打死不认错，死守旧假说不放，排斥一切反面证据，认定只有这一种可能',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Slang: 打死不认错 + 死守假说'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S05',
    input: '连空载基线都没测过就在这瞎测，没有对照组就直接下结论',
    expected: 'MISSING_BASELINE',
    desc: 'Slang: 瞎测 + 缺乏基线'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S06',
    input: '鬼知道是网络抖动还是GC卡顿，偶现时好时坏无法复现',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Slang: 鬼知道 + 时好时坏'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S07',
    input: '拖延症大爆发，刷了一整天论坛和论文，认知超载导致零行动瘫痪',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Slang: 拖延症 + 零行动瘫痪'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S08',
    input: '这波直接证实偏差，盲目乐观觉得不可能错，忽视所有反例',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Slang: 这波直接 + 盲目乐观'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S09',
    input: '团队为名词指代不明吵翻天，抽象概念定义模糊，全是黑话套套逻辑',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Slang: 吵翻天 + 名词指代不明'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S10',
    input: '完全没有记录原始状态，零点漂移未校准，缺少基线根本没法比对',
    expected: 'MISSING_BASELINE',
    desc: 'Slang: 零点漂移未校准 + 缺少基线'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S11',
    input: '同时改了八个参数，多因并发导致玄学Bug，不知道是配置原因还是代码原因',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Slang: 玄学Bug + 同时改了多个参数'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S12',
    input: '准备过度，不敢写测试用例，面对庞大系统不知如何下手，虚假忙碌',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Slang: 准备过度 + 虚假忙碌'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S13',
    input: '坚信只有当前方案能行，对明显的崩溃报错反例装作看不见',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Slang: 装作看不见 + 坚信只有'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S14',
    input: '未测量过空载电位背景噪声，任何信号抖动都不知道是不是仪器本身的噪声基线',
    expected: 'MISSING_BASELINE',
    desc: 'Slang: 噪声基线 + 空载电位'
  },
  {
    cat: 'Slang & Colloquial',
    id: 'S15',
    input: '把相关性当成了因果性，在抽象层面上纠结定义，同名异物',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Slang: 概念混淆 + 相关性当成因果'
  },

  // =========================================================================
  // Category 2: Cross-Domain & Interdisciplinary Deep Engineering (15 items)
  // =========================================================================
  {
    cat: 'Cross-Domain',
    id: 'CD01',
    input: 'BCI脑电采集：未测量过空载电位背景噪声，无法区分P300诱发电位与环境底噪',
    expected: 'MISSING_BASELINE',
    desc: 'BCI: 空载电位背景噪声'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD02',
    input: '分布式Raft：同时修改了心跳检测超时与选举超时随机窗口，到底是谁解决了脑裂？',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Distributed: 到底是哪个起效'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD03',
    input: '宏观经济学：将M2增速与通胀的相关性当成机械因果性，在抽象层面上纠结概念定义',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Economics: 相关性当成因果性'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD04',
    input: '量子计算：量子比特退相干时间偶现波动，共模干扰与多变量耦合，时好时坏',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Quantum: 共模干扰多变量耦合'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD05',
    input: '生物化学：酶活吸光度读数异常，未设置blank control阴性对照基线',
    expected: 'MISSING_BASELINE',
    desc: 'Biochem: blank control 对照基线'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD06',
    input: '前端重构：连续读了20篇React 19原理与Fiber架构笔记，但没有写一行测试代码',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Frontend: 读了多篇笔记没写一行代码'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD07',
    input: '算法研究：死守单一深度学习假说不放，排斥所有反例证据，认定只有这一种模型能收敛',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'ML: 死守假说排斥反例'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD08',
    input: '航天飞控：惯导陀螺仪零点漂移未校准，缺少基线读数导致积分发散',
    expected: 'MISSING_BASELINE',
    desc: 'Aerospace: 零点漂移未校准缺少基线'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD09',
    input: '微服务网关：同时改了Ingress限流与HPA扩容策略，不知道是哪个起效还是负载自然漂移',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'CloudNative: 不知道是哪个起效'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD10',
    input: '自然语言处理：团队在Ontology概念定义上纠结不清，同名异物产生严重概念混淆',
    expected: 'CONCEPT_CONFUSION',
    desc: 'NLP: 概念定义纠结概念混淆'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD11',
    input: '嵌入式驱动：准备过度认知超载，看了一周Datasheet芯片手册但还没开始搭调试环境',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Embedded: 准备过度认知超载'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD12',
    input: '数据库引擎：先入为主认定只有B+树锁冲突这一种可能，盲目乐观拒绝反面性能剖析',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Database: 先入为主认定只有这一种可能'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD13',
    input: '声学降噪：环境背景噪声未记录原始状态，缺乏对照基线，信噪比SNR无基准',
    expected: 'MISSING_BASELINE',
    desc: 'Acoustics: 未记录原始状态缺乏对照基线'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD14',
    input: '音视频流媒体：偶现花屏时有时无，多因并发伪迹耦合，无法复现排查',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Media: 时有时无伪迹耦合无法复现'
  },
  {
    cat: 'Cross-Domain',
    id: 'CD15',
    input: '密码学安全：把哈希碰撞的相关性当成因果性，黑话包装伪问题，定义模糊',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Crypto: 相关性当成因果性定义模糊'
  },

  // =========================================================================
  // Category 3: Fuzzy, Brief, Single-Token & Fallback Triggers (15 items)
  // =========================================================================
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB01',
    input: '死锁',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Fallback rule: 死锁 -> UNISOLATED_VARIABLES'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB02',
    input: '慢查询导致系统严重卡顿',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Fallback rule: 慢查询 -> UNISOLATED_VARIABLES'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB03',
    input: '线上偶发未知报错与异常',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Fallback rule: 报错异常 -> UNISOLATED_VARIABLES'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB04a',
    input: '跨时区时间戳格式化与解析',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Fallback rule: 跨时区格式化 (isolated) -> CONCEPT_CONFUSION'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB04b',
    input: '跨时区时间戳格式化与解析异常',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Adversarial probe: 跨时区格式化 + 异常 (evaluates priority inversion against UNISOLATED_VARIABLES)'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB05',
    input: '数值类型在多语言之间序列化转换有误',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Fallback rule: 类型转换 -> CONCEPT_CONFUSION'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB06',
    input: '？',
    expected: null, // Any valid fallback
    desc: 'Single full-width question mark'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB07',
    input: 'a',
    expected: null,
    desc: 'Single ascii char'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB08',
    input: '1234567890',
    expected: null,
    desc: 'Numeric string'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB09',
    input: '卡住了',
    expected: null,
    desc: 'Short ambiguous word'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB10',
    input: '没有任何头绪，感觉不对劲',
    expected: null,
    desc: 'Vague complaint'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB11',
    input: 'performance regression',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'English performance keyword'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB12',
    input: 'baseline缺失无法比对',
    expected: 'MISSING_BASELINE',
    desc: 'English baseline keyword'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB13',
    input: 'blank control not measured',
    expected: 'MISSING_BASELINE',
    desc: 'English blank control'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB14',
    input: '证实偏差太严重了',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Confirmation bias trigger'
  },
  {
    cat: 'Fuzzy & Fallback',
    id: 'FB15',
    input: '虚假忙碌零行动不知如何下手',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Activity zero paralysis trigger'
  },

  // =========================================================================
  // Category 4: Adversarial Injection, Code Syntax & Malformed Strings (15 items)
  // =========================================================================
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV01',
    input: "SELECT * FROM users WHERE '1'='1' -- SQL Injection 变量未隔离",
    expected: 'UNISOLATED_VARIABLES',
    desc: 'SQL Injection string'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV02',
    input: '<script>alert("XSS")</script> 缺乏对照基线未记录原始状态',
    expected: 'MISSING_BASELINE',
    desc: 'XSS payload'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV03',
    input: '\u202E\u202D\u200E\u200F RTL override 死守假说排斥反例 \u202E',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Unicode RTL bidirectional overrides'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV04',
    input: '🔥🚀💡 连续读了10篇论文写了大量笔记没写一行测试代码 🧠✨🎯',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Emoji sandwich'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV05',
    input: '概念混淆定义模糊伪问题'.repeat(100),
    expected: 'CONCEPT_CONFUSION',
    desc: 'Massive repetitive text (1100+ chars)'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV06',
    input: '!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./',
    expected: null,
    desc: 'All keyboard symbols'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV07',
    input: '   \t\t\r\n\u00A0\u2000\u3000   ',
    expected: null,
    desc: 'Pure whitespace & unicode spaces'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV08',
    input: '{"key": "value", "clues": [{"type": "observation"}]}',
    expected: null,
    desc: 'Raw JSON string as text'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV09',
    input: '\\x00\\x01\\x02\\x03\\xff\\xfe 控制字符与十六进制转义',
    expected: null,
    desc: 'Binary escapes'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV10',
    input: '/* C multi-line comment */ void* ptr = malloc(1024); // 内存未隔离',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'C code with embedded trigger'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV11',
    input: 'fn main() -> Result<(), Box<dyn Error>> { panic!("空载电位背景噪声缺失"); }',
    expected: 'MISSING_BASELINE',
    desc: 'Rust syntax with embedded trigger'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV12',
    input: '(?<=lookbehind)(?<!negative) 正则表达式 概念混淆',
    expected: 'CONCEPT_CONFUSION',
    desc: 'Complex regex syntax'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV13',
    input: '¯\\_(ツ)_/¯ (╯°□°)╯︵ ┻━┻ 行动瘫痪虚假忙碌',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Kaomoji with embedded trigger'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV14',
    input: 'const a = undefined; a.b.c; // 认定只有这一种可能死守假说',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'JS error snippet'
  },
  {
    cat: 'Adversarial & Syntax',
    id: 'ADV15',
    input: 'X'.repeat(8000),
    expected: null,
    desc: 'Huge 8KB single-character string'
  },

  // =========================================================================
  // Category 5: Mixed Symptoms & Competing Signals (10 items)
  // =========================================================================
  {
    cat: 'Mixed Signals',
    id: 'MIX01',
    input: '不知道是遮光眼罩起效了还是电位漂移，而且我们未测量过空载电位背景噪声',
    expected: null, // Both unisolated and missing baseline present
    desc: 'UNISOLATED vs MISSING_BASELINE'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX02',
    input: '连续读了15篇高并发理论论文写了大量读书笔记但没有写一行测试代码，死守第一个假说不放',
    expected: null, // Action zero paralysis vs Premature convergence
    desc: 'PARALYSIS vs PREMATURE'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX03',
    input: '在抽象层面上纠结定义导致概念混淆，而且同时改了微服务超时时间和数据库连接池大小到底是哪个起效',
    expected: null, // Concept confusion vs Unisolated variables
    desc: 'CONCEPT vs UNISOLATED'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX04',
    input: '未记录原始状态缺乏对照基线，却认定只有这一种可能死守假说不放',
    expected: null, // Baseline vs Premature
    desc: 'BASELINE vs PREMATURE'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX05',
    input: '黑话伪问题定义模糊，行动瘫痪不知如何下手',
    expected: null, // Concept vs Action zero
    desc: 'CONCEPT vs ACTION_ZERO'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX06',
    input: '全套混合：变量未隔离 + 缺乏对照基线 + 概念混淆 + 零行动瘫痪 + 死守假说',
    expected: null, // All 5 keywords present
    desc: 'All 5 archetypes in one input'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX07',
    input: '到底是哪个起效？到底是哪个起效？不知道是A还是B还是C',
    expected: 'UNISOLATED_VARIABLES',
    desc: 'Repeated unisolated variables cues'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX08',
    input: '大量读书笔记看了10篇论文没写一行代码，准备过度虚假忙碌',
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Compound action paralysis signals'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX09',
    input: '排斥反例死守假说认定只有这一种可能不可能错',
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Compound premature convergence signals'
  },
  {
    cat: 'Mixed Signals',
    id: 'MIX10',
    input: '空载电位背景噪声未记录原始状态缺乏对照基线零点漂移',
    expected: 'MISSING_BASELINE',
    desc: 'Compound missing baseline signals'
  },

  // =========================================================================
  // Category 6: Polymorphic Context Structures (10 items)
  // =========================================================================
  {
    cat: 'Context Polymorphism',
    id: 'CTX01',
    input: { bottleneckText: '遮光眼罩起效还是电位漂移不知道是哪个' },
    expected: 'UNISOLATED_VARIABLES',
    desc: 'context.bottleneckText property'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX02',
    input: { title: '缺乏对照基线未测量空载电位' },
    expected: 'MISSING_BASELINE',
    desc: 'context.title property'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX03',
    input: { content: '概念混淆在抽象层面上纠结定义伪问题' },
    expected: 'CONCEPT_CONFUSION',
    desc: 'context.content property'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX04',
    input: { description: '连续读了10篇论文写了大量读书笔记没写一行代码' },
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'context.description property'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX05',
    input: { clueText: '死守假说认定只有这一种可能排斥反面证据' },
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'context.clueText property'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX06',
    input: {
      text: '',
      clues: [
        { type: 'observation', title: '观察1' },
        { type: 'observation', title: '观察2' },
        { type: 'observation', title: '观察3' }
      ],
      stagnationMinutes: 25
    },
    expected: 'ACTION_ZERO_PARALYSIS',
    desc: 'Context with no text but clues + stagnation triggers'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX07',
    input: {
      text: '',
      clues: [
        { type: 'hypothesis', title: '假说1' },
        { type: 'hypothesis', title: '假说2' },
        { type: 'hypothesis', title: '假说3' }
      ]
    },
    expected: 'PREMATURE_CONVERGENCE',
    desc: 'Context with high hypotheses and 0 evidence'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX08',
    input: null,
    expected: null,
    desc: 'Context is null'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX09',
    input: undefined,
    expected: null,
    desc: 'Context is undefined'
  },
  {
    cat: 'Context Polymorphism',
    id: 'CTX10',
    input: 98765,
    expected: null,
    desc: 'Context is integer number'
  }
];

// -----------------------------------------------------------------------------
// Pathological States for detectProactiveTriggers (32 items)
// -----------------------------------------------------------------------------
function buildPathologicalStates() {
  const circularState = { stagnationMinutes: 10 };
  circularState.self = circularState;

  const circularClue = { type: 'observation', title: '循环引用线索' };
  circularClue.parent = circularClue;

  const circularCockpit = { stagnationMinutes: 20 };
  circularCockpit.link = circularCockpit;

  const sparseClues = new Array(50);
  sparseClues[10] = { type: 'observation' };
  sparseClues[20] = { type: 'observation' };
  sparseClues[30] = { type: 'observation' };

  return [
    { name: 'P01: null state', state: null },
    { name: 'P02: undefined state', state: undefined },
    { name: 'P03: empty object', state: {} },
    { name: 'P04: number 42 as state', state: 42 },
    { name: 'P05: string "error" as state', state: 'error' },
    { name: 'P06: boolean true as state', state: true },
    { name: 'P07: empty array as state', state: [] },
    { name: 'P08: circular reference state', state: circularState },
    { name: 'P09: state with circular clue', state: { clues: [circularClue, { type: 'evidence' }] } },
    { name: 'P10: state with circular cockpit', state: { cockpit: circularCockpit } },
    { name: 'P11: negative stagnationMinutes (-99)', state: { stagnationMinutes: -99 } },
    { name: 'P12: negative stagnationMinutes (-Infinity)', state: { stagnationMinutes: -Infinity } },
    { name: 'P13: NaN stagnationMinutes', state: { stagnationMinutes: NaN } },
    { name: 'P14: string stagnationMinutes ("30")', state: { stagnationMinutes: '30' } },
    { name: 'P15: invalid string stagnationMinutes ("not_a_number")', state: { stagnationMinutes: 'not_a_number' } },
    { name: 'P16: extreme large stagnationMinutes (1e12)', state: { stagnationMinutes: 1e12 } },
    { name: 'P17: clues is null', state: { clues: null } },
    { name: 'P18: clues is string', state: { clues: 'invalid_clues' } },
    { name: 'P19: clues is number', state: { clues: 12345 } },
    { name: 'P20: clues is object', state: { clues: { 0: { type: 'observation' } } } },
    { name: 'P21: clues has corrupted elements (null, undefined, 0, false, empty obj)', state: { clues: [null, undefined, 0, false, '', {}, { type: null }] } },
    { name: 'P22: clues has sparse array with 3 observations', state: { clues: sparseClues } },
    { name: 'P23: clues has 10,000 observations (performance stress)', state: { clues: Array.from({ length: 10000 }, (_, i) => ({ type: 'observation', id: i })) } },
    { name: 'P24: cockpit is null', state: { cockpit: null } },
    { name: 'P25: cockpit is primitive number', state: { cockpit: 999 } },
    { name: 'P26: cockpit is string', state: { cockpit: 'cockpit_string' } },
    { name: 'P27: bottlenecks with null title', state: { clues: [{ type: 'bottleneck', title: null }] } },
    { name: 'P28: bottlenecks with empty title', state: { clues: [{ type: 'bottleneck', title: '' }] } },
    { name: 'P29: bottlenecks with undefined title', state: { clues: [{ type: 'bottleneck' }] } },
    { name: 'P30: Object with prototype pollution keywords', state: JSON.parse('{"__proto__": {"polluted": true}, "clues": []}') },
    { name: 'P31: Object.freeze empty state', state: Object.freeze({ clues: Object.freeze([]) }) },
    { name: 'P32: Symbol and BigInt properties in state', state: { clues: [], [Symbol('test')]: 'sym', stagnationMinutes: 0 } }
  ];
}

// -----------------------------------------------------------------------------
// In-Memory Mock Server for Adversarial LLM Response Stress
// -----------------------------------------------------------------------------
class AdversarialMockLlmServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.responsePayload = null;
    this.statusCode = 200;
  }

  setPayload(payload, statusCode = 200) {
    this.responsePayload = payload;
    this.statusCode = statusCode;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          res.writeHead(this.statusCode, { 'Content-Type': 'application/json' });
          if (typeof this.responsePayload === 'string') {
            res.end(this.responsePayload);
          } else {
            const wrapped = {
              choices: [
                {
                  message: {
                    content: JSON.stringify(this.responsePayload)
                  }
                }
              ]
            };
            res.end(JSON.stringify(wrapped));
          }
        });
      });
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        resolve(`http://127.0.0.1:${this.port}`);
      });
      this.server.on('error', reject);
    });
  }

  getUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  async stop() {
    if (!this.server) return;
    return new Promise(resolve => this.server.close(resolve));
  }
}

// -----------------------------------------------------------------------------
// MAIN RUNNER
// -----------------------------------------------------------------------------
async function runEmpiricalStressSuite() {
  console.log(`\n${C.cyan}${C.bright}================================================================================${C.reset}`);
  console.log(`${C.cyan}${C.bright}   CHALLENGER SUITE: EMPIRICAL STRESS TESTING SERVICES/BOTTLENECK-DIAGNOSTICIAN ${C.reset}`);
  console.log(`${C.cyan}${C.bright}================================================================================${C.reset}\n`);

  const tStart = performance.now();

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: 75+ Adversarial Scenarios Classification & Invariant Checks
  // ---------------------------------------------------------------------------
  console.log(`${C.bright}${C.magenta}▶ SUITE 1: 75+ Adversarial Descriptions Classification & Invariant Audit${C.reset}`);
  let currentCat = '';

  for (const s of ADVERSARIAL_SCENARIOS) {
    globalStats.totalScenarios++;
    if (s.cat !== currentCat) {
      currentCat = s.cat;
      console.log(`\n  ${C.yellow}• [${currentCat}]${C.reset}`);
    }

    try {
      const res = diagnostician.diagnoseBottleneck(s.input);
      verifyInvariants(res, `[${s.id}] ${s.desc}`);

      if (s.expected !== null) {
        if (res.obstacleType !== s.expected) {
          throw new Error(`Expected obstacleType "${s.expected}", but got "${res.obstacleType}"`);
        }
      }

      globalStats.classificationPassed++;
      console.log(`    ${C.green}✓${C.reset} ${s.id}: ${res.obstacleType.padEnd(23)} | conf: ${res.confidence.toFixed(2)} | timebox: ${res.minimalTest.timeboxMinutes}m | ${s.desc}`);
    } catch (err) {
      recordFailure('SUITE 1', `[${s.id}] ${s.desc}`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: Invariant Stress across 5 Direct Archetype Guidance Generators
  // ---------------------------------------------------------------------------
  console.log(`\n${C.bright}${C.magenta}▶ SUITE 2: Strict Invariant Audit across all 5 Archetype Generators${C.reset}`);
  for (const type of VALID_OBSTACLES) {
    globalStats.totalScenarios++;
    try {
      const guidance = diagnostician.generateOfflineGuidance(type, '极限制约攻坚');
      const mockRes = {
        success: true,
        obstacleType: type,
        type,
        confidence: 0.85,
        ...guidance
      };
      verifyInvariants(mockRes, `generateOfflineGuidance(${type})`);
      globalStats.classificationPassed++;
      console.log(`    ${C.green}✓${C.reset} Archetype Generator [${type}]: timeboxMinutes=${guidance.minimalTest.timeboxMinutes} <= 15, falsificationCondition="${guidance.minimalTest.falsificationCondition.slice(0, 20)}..."`);
    } catch (err) {
      recordFailure('SUITE 2', `Generator ${type}`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: Pathological Proactive Triggers Stress Suite (32 cases)
  // ---------------------------------------------------------------------------
  console.log(`\n${C.bright}${C.magenta}▶ SUITE 3: Pathological Proactive Triggers Robustness (32 Pathological States)${C.reset}`);
  const pathologicalStates = buildPathologicalStates();

  for (const item of pathologicalStates) {
    globalStats.totalScenarios++;
    try {
      const trigger = diagnostician.detectProactiveTriggers(item.state);

      // Verify trigger contract structure
      if (typeof trigger.triggered !== 'boolean') {
        throw new Error('trigger.triggered must be a boolean');
      }
      if (typeof trigger.triggerType !== 'string' || trigger.triggerType.length === 0) {
        throw new Error('trigger.triggerType must be a non-empty string');
      }
      if (typeof trigger.urgency !== 'string') {
        throw new Error('trigger.urgency must be a string');
      }
      if (typeof trigger.reason !== 'string' || trigger.reason.length === 0) {
        throw new Error('trigger.reason must be a non-empty string');
      }
      if (typeof trigger.recommendedAction !== 'string' || trigger.recommendedAction.length === 0) {
        throw new Error('trigger.recommendedAction must be a non-empty string');
      }

      globalStats.pathologicalPassed++;
      console.log(`    ${C.green}✓${C.reset} ${item.name.padEnd(45)} -> triggered: ${String(trigger.triggered).padEnd(5)} | type: ${trigger.triggerType.padEnd(22)} | urgency: ${trigger.urgency}`);
    } catch (err) {
      recordFailure('SUITE 3', item.name, err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: Adversarial Mock LLM Responses & Invariant Clamping
  // ---------------------------------------------------------------------------
  console.log(`\n${C.bright}${C.magenta}▶ SUITE 4: Adversarial Online LLM Responses & Invariant Clamping${C.reset}`);
  const mockServer = new AdversarialMockLlmServer();
  const mockUrl = await mockServer.start();

  try {
    // 4.1: LLM attempts to return estMinutes = 99999 & timeboxMinutes = 120
    globalStats.totalScenarios++;
    try {
      mockServer.setPayload({
        obstacleType: 'UNISOLATED_VARIABLES',
        confidence: 0.95,
        title: '恶意超长耗时测试',
        analysis: '变量未隔离分析',
        mentalModel: 'minimal_counter_example',
        breakthroughGuidance: '单变量隔离启发',
        minimalViableTest: {
          title: '超长耗时测试',
          description: '测试用时超标',
          instructions: ['做实验1', '做实验2'],
          estMinutes: 99999,
          timeboxMinutes: 120,
          falsificationCondition: '若失败则推翻',
          expectedOutcome: '验证结论'
        }
      });

      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '测试超长用时防护' },
        { mode: 'api', apiKey: 'test-key', baseUrl: mockUrl, model: 'test' }
      );

      verifyInvariants(res, 'LLM estMinutes=99999 timeboxMinutes=120');
      if (res.minimalTest.timeboxMinutes > 15) {
        throw new Error(`timeboxMinutes leaked > 15: got ${res.minimalTest.timeboxMinutes}`);
      }
      if (res.minimalTest.estMinutes > 15) {
        throw new Error(`estMinutes leaked > 15: got ${res.minimalTest.estMinutes}`);
      }

      globalStats.llmResiliencePassed++;
      console.log(`    ${C.green}✓${C.reset} LLM estMinutes=99999 & timeboxMinutes=120 successfully clamped to timeboxMinutes=${res.minimalTest.timeboxMinutes}, estMinutes=${res.minimalTest.estMinutes}`);
    } catch (err) {
      recordFailure('SUITE 4', 'LLM extreme timebox clamp', err);
    }

    // 4.2: LLM returns empty falsificationCondition -> must fall back to non-empty
    globalStats.totalScenarios++;
    try {
      mockServer.setPayload({
        obstacleType: 'CONCEPT_CONFUSION',
        confidence: 0.88,
        title: '缺少证伪条件测试',
        analysis: '概念混淆分析',
        mentalModel: 'first_principles',
        breakthroughGuidance: '第一性原理推演',
        minimalViableTest: {
          title: '极简验证',
          description: '测试缺少证伪条件',
          instructions: ['步骤1'],
          falsificationCondition: '', // EMPTY!
          expectedOutcome: '增益'
        }
      });

      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '测试缺少证伪条件' },
        { mode: 'api', apiKey: 'test-key', baseUrl: mockUrl, model: 'test' }
      );

      verifyInvariants(res, 'LLM empty falsificationCondition fallback');
      if (!res.minimalTest.falsificationCondition || res.minimalTest.falsificationCondition.length === 0) {
        throw new Error('falsificationCondition remained empty!');
      }

      globalStats.llmResiliencePassed++;
      console.log(`    ${C.green}✓${C.reset} LLM empty falsificationCondition successfully recovered: "${res.minimalTest.falsificationCondition}"`);
    } catch (err) {
      recordFailure('SUITE 4', 'LLM empty falsificationCondition', err);
    }

    // 4.3: LLM returns completely invalid obstacleType -> must fall back to offline heuristics
    globalStats.totalScenarios++;
    try {
      mockServer.setPayload({
        obstacleType: 'BOGUS_INVALID_TYPE_123',
        confidence: 0.99
      });

      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '不知道是遮光眼罩起效了还是设备本身的电位漂移' },
        { mode: 'api', apiKey: 'test-key', baseUrl: mockUrl, model: 'test' }
      );

      verifyInvariants(res, 'LLM invalid obstacleType fallback');
      if (res.obstacleType !== 'UNISOLATED_VARIABLES') {
        throw new Error(`Expected fallback to UNISOLATED_VARIABLES, got ${res.obstacleType}`);
      }
      if (res.source !== 'offline_heuristic') {
        throw new Error(`Expected source offline_heuristic, got ${res.source}`);
      }

      globalStats.llmResiliencePassed++;
      console.log(`    ${C.green}✓${C.reset} LLM invalid obstacleType correctly triggered fallback to offline heuristic: ${res.obstacleType}`);
    } catch (err) {
      recordFailure('SUITE 4', 'LLM invalid obstacleType fallback', err);
    }

    // 4.4: LLM returns HTTP 500 error -> graceful offline fallback
    globalStats.totalScenarios++;
    try {
      mockServer.setPayload('Internal Server Error', 500);

      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '未在无干扰安静状态下测量过空载电位背景噪声' },
        { mode: 'api', apiKey: 'test-key', baseUrl: mockUrl, model: 'test' }
      );

      verifyInvariants(res, 'LLM HTTP 500 fallback');
      if (res.obstacleType !== 'MISSING_BASELINE') {
        throw new Error(`Expected MISSING_BASELINE, got ${res.obstacleType}`);
      }
      if (res.source !== 'offline_heuristic') {
        throw new Error(`Expected source offline_heuristic, got ${res.source}`);
      }

      globalStats.llmResiliencePassed++;
      console.log(`    ${C.green}✓${C.reset} LLM HTTP 500 safely handled with offline fallback: ${res.obstacleType}`);
    } catch (err) {
      recordFailure('SUITE 4', 'LLM HTTP 500 fallback', err);
    }

    // 4.5: LLM returns confidence = 0 -> must clamp to strictly positive (> 0)
    globalStats.totalScenarios++;
    try {
      mockServer.setPayload({
        obstacleType: 'CONCEPT_CONFUSION',
        confidence: 0,
        title: '零置信度测试',
        analysis: '深度因果分析',
        mentalModel: 'first_principles',
        breakthroughGuidance: '第一性原理推演',
        minimalViableTest: {
          title: '极简验证',
          description: '验证描述',
          instructions: ['步骤1', '步骤2'],
          estMinutes: 15,
          timeboxMinutes: 15,
          falsificationCondition: '若失败则推翻',
          expectedOutcome: '预期'
        }
      }, 200);

      const res = await diagnostician.diagnoseBottleneckAsync(
        { text: '测试零置信度防护' },
        { mode: 'api', apiKey: 'test-key', baseUrl: mockUrl, model: 'test' }
      );

      verifyInvariants(res, 'LLM confidence=0 probe');
      if (res.confidence <= 0) {
        throw new Error(`[Invariant Failed] res.confidence must be > 0, got ${res.confidence}`);
      }

      globalStats.llmResiliencePassed++;
      console.log(`    ${C.green}✓${C.reset} LLM confidence=0 successfully clamped to ${res.confidence}`);
    } catch (err) {
      recordFailure('SUITE 4', 'LLM confidence=0 probe', err);
    }

  } finally {
    await mockServer.stop();
  }

  // ---------------------------------------------------------------------------
  // STATISTICAL SUMMARY & FINAL VERDICT
  // ---------------------------------------------------------------------------
  const totalElapsed = (performance.now() - tStart).toFixed(2);
  const totalPassed = globalStats.classificationPassed + globalStats.pathologicalPassed + globalStats.llmResiliencePassed;
  const failureCount = globalStats.failures.length;

  console.log(`\n${C.cyan}${C.bright}================================================================================${C.reset}`);
  console.log(`${C.cyan}${C.bright}                         EMPIRICAL STRESS TEST REPORT                          ${C.reset}`);
  console.log(`${C.cyan}${C.bright}================================================================================${C.reset}`);
  console.log(`Total Stress Scenarios Executed : ${globalStats.totalScenarios}`);
  console.log(`Adversarial Classification Pass : ${C.green}${globalStats.classificationPassed}${C.reset} / ${ADVERSARIAL_SCENARIOS.length + VALID_OBSTACLES.length}`);
  console.log(`Pathological Triggers Pass      : ${C.green}${globalStats.pathologicalPassed}${C.reset} / ${pathologicalStates.length}`);
  console.log(`Online LLM Resilience Pass      : ${C.green}${globalStats.llmResiliencePassed}${C.reset} / 4`);
  console.log(`Total Invariant Checks Passed   : ${C.green}${globalStats.invariantsPassed}${C.reset} / ${globalStats.invariantsChecked}`);
  console.log(`Total Unhandled Failures/Crashes: ${failureCount === 0 ? C.green + '0' + C.reset : C.red + failureCount + C.reset}`);
  console.log(`Total Execution Wall Time       : ${totalElapsed}ms`);
  console.log(`${C.cyan}${C.bright}================================================================================${C.reset}\n`);

  if (failureCount > 0) {
    console.log(`${C.red}Failure details:${C.reset}`);
    for (const f of globalStats.failures) {
      console.log(`  - [${f.suite}] ${f.scenario}: ${f.error}`);
    }
    console.log('');
  }

  if (failureCount === 0) {
    console.log(`${C.green}${C.bright}>>> CHALLENGER VERDICT: APPROVE <<<${C.reset}`);
    console.log(`${C.green}All 50+ adversarial scenarios, strict timebox invariants (<=15 min), and pathological trigger states PASSED without a single crash or violation.${C.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${C.red}${C.bright}>>> CHALLENGER VERDICT: REQUEST_CHANGES <<<${C.reset}`);
    console.log(`${C.red}${failureCount} failure(s) detected during empirical challenge.${C.reset}\n`);
    process.exit(1);
  }
}

runEmpiricalStressSuite().catch(err => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
