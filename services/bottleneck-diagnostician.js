// services/bottleneck-diagnostician.js
const aiAdvisor = require('./ai-advisor');

/**
 * 5大核心认知障碍类型分类库 (Obstacle Taxonomy)
 */
const OBSTACLE_TYPES = {
  CONCEPT_CONFUSION: 'CONCEPT_CONFUSION',       // 概念混淆 / 定义模糊 / 伪问题 / 同名异物
  MISSING_BASELINE: 'MISSING_BASELINE',         // 缺乏对照基线 / 盲目尝试 / 未记录原始状态
  UNISOLATED_VARIABLES: 'UNISOLATED_VARIABLES', // 实验变量未隔离 / 多因并发 / 归因混乱 / 伪迹耦合
  ACTION_ZERO_PARALYSIS: 'ACTION_ZERO_PARALYSIS', // 零行动瘫痪 / 准备过度 / 虚假忙碌 / 认知超载
  PREMATURE_CONVERGENCE: 'PREMATURE_CONVERGENCE' // 过早收敛 / 盲目乐观 / 死守假说 / 缺少反例检验
};

/**
 * 3大科学思维模型 (Scientific Mental Models)
 */
const MENTAL_MODELS = {
  FIRST_PRINCIPLES: 'first_principles',             // 第一性原理 (物理本质剥离与基石公理)
  MINIMAL_COUNTER_EXAMPLE: 'minimal_counter_example', // 极简反例法 (波普尔证伪与边界一击)
  FEYNMAN_TECHNIQUE: 'feynman_technique'             // 费曼技巧 (大白话降维与概念盲区显形)
};

const MENTAL_MODEL_META = {
  [MENTAL_MODELS.FIRST_PRINCIPLES]: {
    key: 'first_principles',
    name: '第一性原理',
    subtitle: '物理本质剥离与基石事实推演',
    coreQuestion: '剥离所有框架黑话与经验类比，系统在物理世界发生的第一步输入与输出到底是什么？',
    methodology: '将系统拆解到不可再分的基石事实（物理极限、原始字节流、纯输入输出），剔除一切经验类比与过度抽象包装。'
  },
  [MENTAL_MODELS.MINIMAL_COUNTER_EXAMPLE]: {
    key: 'minimal_counter_example',
    name: '极简反例法',
    subtitle: '边界探索与波普尔证伪主义',
    coreQuestion: '什么样的最小、最极端、最容易构造的反例，能以最低成本瞬间击垮当前假设？',
    methodology: '不再试图寻找证据证明自己是对的，而是以极低代价构造一个边界反例进行一击证伪。'
  },
  [MENTAL_MODELS.FEYNMAN_TECHNIQUE]: {
    key: 'feynman_technique',
    name: '费曼技巧',
    subtitle: '8岁儿童通俗大白话与盲区透视',
    coreQuestion: '如果不允许使用任何行业专业术语，如何用三句大白话解释当前的输入、处理与报错？',
    methodology: '假想向8岁儿童解释机制。任何必须依赖高深术语遮掩的地方，就是你的真正认知盲区所在。'
  }
};

/**
 * 思维卡点主动诊断与破局引导引擎 (Bottleneck Diagnostician)
 * 实现 R2 (F4, F5):
 * 1. 5大核心认知障碍类型主动分类排查
 * 2. 结合三大科学思维模型输出破局启发
 * 3. 生成 15 分钟最小可证伪验证方案 (Popperian Minimal Viable Test)
 * 4. 离线确定性启发矩阵 + 云端/本地大模型双核架构与平滑降级
 * 5. 探索停滞与虚假忙碌主动感知探针 (detectProactiveTriggers)
 */
class BottleneckDiagnostician {
  constructor() {
    this.name = 'BottleneckDiagnostician';
    this.OBSTACLE_TYPES = OBSTACLE_TYPES;
    this.MENTAL_MODELS = MENTAL_MODELS;
    this.MENTAL_MODEL_META = MENTAL_MODEL_META;
  }

  /**
   * 提取卡点诊断上下文文本
   */
  extractText(context = {}) {
    if (typeof context === 'string') return context.trim();
    if (!context || typeof context !== 'object') return '';
    return String(
      context.bottleneckText ||
      context.text ||
      context.content ||
      context.title ||
      context.description ||
      context.clueText ||
      ''
    ).trim();
  }

  /**
   * 离线特征匹配与启发式分类器
   * 采用多维加权词袋与语义模式评分
   */
  classifyObstacle(context = {}) {
    const rawText = this.extractText(context);
    const text = rawText.toLowerCase();
    const ctx = (context && typeof context === 'object') ? context : {};

    const clues = Array.isArray(ctx.clues) ? ctx.clues : [];
    const observations = clues.filter(c => c && c.type === 'observation');
    const hypotheses = clues.filter(c => c && c.type === 'hypothesis');
    const evidences = clues.filter(c => c && c.type === 'evidence');
    const stagnationMinutes = Number(ctx.stagnationMinutes || 0);

    const scores = {
      [OBSTACLE_TYPES.CONCEPT_CONFUSION]: 0,
      [OBSTACLE_TYPES.MISSING_BASELINE]: 0,
      [OBSTACLE_TYPES.UNISOLATED_VARIABLES]: 0,
      [OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS]: 0,
      [OBSTACLE_TYPES.PREMATURE_CONVERGENCE]: 0
    };

    // 1. 实验变量未隔离 (UNISOLATED_VARIABLES) 模式
    if (/不知道是.*还是/i.test(text)) scores[OBSTACLE_TYPES.UNISOLATED_VARIABLES] += 30;
    if (/到底是.*还是/i.test(text)) scores[OBSTACLE_TYPES.UNISOLATED_VARIABLES] += 25;
    if (/(起效.*漂移|漂移.*起效|眼罩.*漂移|滤.*漂移)/i.test(text)) scores[OBSTACLE_TYPES.UNISOLATED_VARIABLES] += 30;
    if (/(变量未隔离|未隔离变量|未隔离|多因并发|伪迹耦合|共模干扰|多变量|混淆因素)/i.test(text)) scores[OBSTACLE_TYPES.UNISOLATED_VARIABLES] += 25;
    if (/(无法复现|偶现|时好时坏|时有时无|干扰|漂移|噪声干扰)/i.test(text)) scores[OBSTACLE_TYPES.UNISOLATED_VARIABLES] += 15;
    if (/(同时改了|改了多个|多个参数|同时变动|耦合)/i.test(text)) scores[OBSTACLE_TYPES.UNISOLATED_VARIABLES] += 15;

    // 2. 缺乏对照基线 (MISSING_BASELINE) 模式
    if (/(空载电位|背景噪声|空载.*噪声|噪声.*基线)/i.test(text)) scores[OBSTACLE_TYPES.MISSING_BASELINE] += 30;
    if (/(未.*测量过.*空载|未.*测量过.*背景|未.*在无干扰|未.*测量过)/i.test(text)) scores[OBSTACLE_TYPES.MISSING_BASELINE] += 30;
    if (/(缺乏.*基线|缺少.*基线|没有.*基线|无.*基线|基线.*缺失|对照基线)/i.test(text)) scores[OBSTACLE_TYPES.MISSING_BASELINE] += 25;
    if (/(blank control|baseline|零点漂移|零点校准|未校准)/i.test(text)) scores[OBSTACLE_TYPES.MISSING_BASELINE] += 20;
    if (/(未记录原始状态|没有对照组|未设对照|缺乏对照)/i.test(text)) scores[OBSTACLE_TYPES.MISSING_BASELINE] += 20;

    // 3. 概念混淆 / 定义模糊 (CONCEPT_CONFUSION) 模式
    if (/(相关性.*因果性|因果性.*相关性)/i.test(text)) scores[OBSTACLE_TYPES.CONCEPT_CONFUSION] += 30;
    if (/(抽象层面.*纠结定义|纠结.*定义|在抽象层面上)/i.test(text)) scores[OBSTACLE_TYPES.CONCEPT_CONFUSION] += 30;
    if (/(相关性当成|把.*当成.*因果)/i.test(text)) scores[OBSTACLE_TYPES.CONCEPT_CONFUSION] += 25;
    if (/(概念混淆|定义模糊|伪问题|同名异物|概念不清|混淆概念|定义争议)/i.test(text)) scores[OBSTACLE_TYPES.CONCEPT_CONFUSION] += 25;
    if (/(黑话|文字游戏|语义不清|指代不明|名实不符)/i.test(text)) scores[OBSTACLE_TYPES.CONCEPT_CONFUSION] += 15;

    // 4. 零行动瘫痪 / 虚假忙碌 (ACTION_ZERO_PARALYSIS) 模式
    if (/(连续读了.*篇|读了.*篇.*笔记|看了.*篇.*笔记)/i.test(text)) scores[OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS] += 30;
    if (/(没有写一行|没写一行|不敢写|未写代码|不开始|还没开始搭)/i.test(text)) scores[OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS] += 30;
    if (/(大量读书笔记|大量笔记|刷文档|看论文.*没动手)/i.test(text)) scores[OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS] += 25;
    if (/(行动瘫痪|零行动|虚假忙碌|不知如何下手|准备过度|认知超载|拖延)/i.test(text)) scores[OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS] += 25;
    // 会话度量触发：文献或事实不少但实测为零
    if ((observations.length >= 3 && evidences.length === 0) || stagnationMinutes >= 20) {
      scores[OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS] += 20;
    }

    // 5. 过早收敛 / 先入为主 (PREMATURE_CONVERGENCE) 模式
    if (/(死守.*假说|死守.*不放)/i.test(text)) scores[OBSTACLE_TYPES.PREMATURE_CONVERGENCE] += 30;
    if (/(排斥.*反面证据|排斥.*反例|忽视反例)/i.test(text)) scores[OBSTACLE_TYPES.PREMATURE_CONVERGENCE] += 30;
    if (/(认定只有这一种可能|只有这一种可能|坚信只有)/i.test(text)) scores[OBSTACLE_TYPES.PREMATURE_CONVERGENCE] += 30;
    if (/(过早收敛|先入为主|证实偏差|盲目乐观|不可能错)/i.test(text)) scores[OBSTACLE_TYPES.PREMATURE_CONVERGENCE] += 25;
    if (hypotheses.length >= 3 && evidences.length === 0) {
      scores[OBSTACLE_TYPES.PREMATURE_CONVERGENCE] += 15;
    }

    // 计算最高分匹配
    let bestType = OBSTACLE_TYPES.UNISOLATED_VARIABLES;
    let maxScore = -1;

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    // 默认兜底：若没有任何强特征匹配
    if (maxScore <= 0) {
      if (/跨时区|格式化|解析|类型|转换/i.test(text)) {
        bestType = OBSTACLE_TYPES.CONCEPT_CONFUSION;
      } else if (/死锁|慢查询|性能|报错|异常|失败/i.test(text)) {
        bestType = OBSTACLE_TYPES.UNISOLATED_VARIABLES;
      } else if (observations.length >= 2 && evidences.length === 0) {
        bestType = OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS;
      } else {
        bestType = OBSTACLE_TYPES.UNISOLATED_VARIABLES;
      }
    }

    const confidence = maxScore > 0 ? Math.min(0.96, Math.max(0.75, 0.70 + maxScore * 0.008)) : 0.68;
    return { obstacleType: bestType, confidence, scores, maxScore };
  }

  /**
   * 选择最优科学思维模型
   */
  selectMentalModel(obstacleType) {
    switch (obstacleType) {
      case OBSTACLE_TYPES.CONCEPT_CONFUSION:
        return MENTAL_MODELS.FIRST_PRINCIPLES;
      case OBSTACLE_TYPES.MISSING_BASELINE:
        return MENTAL_MODELS.FIRST_PRINCIPLES;
      case OBSTACLE_TYPES.UNISOLATED_VARIABLES:
        return MENTAL_MODELS.MINIMAL_COUNTER_EXAMPLE;
      case OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS:
        return MENTAL_MODELS.FEYNMAN_TECHNIQUE;
      case OBSTACLE_TYPES.PREMATURE_CONVERGENCE:
        return MENTAL_MODELS.MINIMAL_COUNTER_EXAMPLE;
      default:
        return MENTAL_MODELS.FIRST_PRINCIPLES;
    }
  }

  /**
   * 生成离线结构化诊断结论、破局启发与 15 分钟最小可证伪验证动作
   */
  generateOfflineGuidance(obstacleType, textContext = '') {
    const modelKey = this.selectMentalModel(obstacleType);
    const modelMeta = MENTAL_MODEL_META[modelKey];
    const snippet = textContext ? textContext.slice(0, 30) : '当前攻坚瓶颈';

    let title = '';
    let analysis = '';
    let breakthroughGuidance = '';
    let minimalTest = null;

    switch (obstacleType) {
      case OBSTACLE_TYPES.UNISOLATED_VARIABLES:
        title = '实验变量未隔离：多因并发与伪迹共模耦合';
        analysis = '核心观测变量与外部环境干扰或多个同时修改的参数发生耦合。当前所记录的现象，很可能纯属测试仪器伪迹、电位漂移或伴随混淆因素，而非因果本质。';
        breakthroughGuidance = `运用【${modelMeta.name}】：不要再盲目尝试复合调整！立即固定其他一切干扰条件，仅对唯一最可疑的变量设计单一变量 A/B 隔离。如果剔除该扰动后现象依然复现，即可彻底排除该变量，完成低成本证伪。`;
        minimalTest = {
          title: '15分钟单一变量A/B极简对照测试',
          description: `固定其他所有参数与环境因素，仅将【${snippet}】关联的最可疑单一变量进行恢复或反向隔离，比对前后差分读数。`,
          instructions: [
            '保持环境与软硬件配置绝对不动，记录当前状态的一组读数作为基准',
            '仅变更 1 个可疑变量（如屏蔽单一物理干扰源或回滚 1 处代码参数）',
            '在 10 分钟内再次采样或执行单次请求，肉眼比对前后输出差异'
          ],
          estMinutes: 15,
          timeboxMinutes: 15,
          falsificationCondition: '若单一变量恢复或屏蔽后，异常现象依然未发生显著变化，则立即证伪该变量为关键致因假设',
          expectedOutcome: '精确判定该变量是否为真因，剥离多因耦合伪迹'
        };
        break;

      case OBSTACLE_TYPES.MISSING_BASELINE:
        title = '缺乏对照基线：在未知背景噪声下盲目测量';
        analysis = '未建立系统无扰动状态下的自然漂移基准（Blank Control / Null Noise）。在没有测量背景底噪前，任何数值的起伏或波动都无法判定为有效信号。';
        breakthroughGuidance = `运用【${modelMeta.name}】：无基线不实验！剥除一切外加的假设与算法处理，回归物理测量第一步：先断开激励或保持静止，记录系统在空载条件下的自然漂移标准差，确立绝对参考系。`;
        minimalTest = {
          title: '15分钟空载零点基线对照测试',
          description: `在完全无外界输入或纯净静息状态下进行 15 分钟连续采样，测量并记录系统的固有背景噪声标准差。`,
          instructions: [
            '完全断开外部刺激、输入载荷或重置所有测试参数',
            '在系统空载/纯净状态下连续记录 10 次读数或 2 分钟采样序列',
            '计算背景底噪的极差与方差，在探索伴侣标记为【Baseline 0】'
          ],
          estMinutes: 15,
          timeboxMinutes: 15,
          falsificationCondition: '若后续观测到的扰动幅值小于空载基线噪声的标准差波动区间，则当前信号直接判定为假阳性背景噪声',
          expectedOutcome: '获得确定性的零点参考基线，消除盲目测量误差'
        };
        break;

      case OBSTACLE_TYPES.CONCEPT_CONFUSION:
        title = '概念混淆：被抽象黑话遮蔽物理本质与伪问题';
        analysis = '在抽象层面上纠结定义，混淆了表面统计学相关性与底层物理因果性。你可能正在为一个被行业专业术语过度包装的“伪问题”消耗认知能量。';
        breakthroughGuidance = `运用【${modelMeta.name}】：破除概念迷雾！剥离所有高阶抽象术语，回到物理世界不可再分的公理事实：系统在这一瞬间究竟接收了什么具体字节/电位？又输出了什么？它们之间是否存在物理上的直接通道？`;
        minimalTest = {
          title: '15分钟概念物理降维与因果剥离测试',
          description: `用大白话将纠结的概念还原为纯输入输出物理事实，检查二者之间是否存在因果连接通道。`,
          instructions: [
            '用不带任何专业黑话的大白话，在便签上写出涉及的两个核心概念的物理实体',
            '梳理数据从实体 A 流向实体 B 的真实管道，若无直接物理交互则标记为虚假关联',
            '添加 1 行最浅显的输入输出打印，观察真实字节流'
          ],
          estMinutes: 15,
          timeboxMinutes: 15,
          falsificationCondition: '若查验发现两个概念在时间戳上不同步且不存在直接通信链路，则彻底推翻二者存在因果关联的假设',
          expectedOutcome: '明确核心因果物理通道，消除虚假概念争论'
        };
        break;

      case OBSTACLE_TYPES.ACTION_ZERO_PARALYSIS:
        title = '零行动瘫痪：陷入【虚假忙碌】与准备过度陷阱';
        analysis = '触发【虚假忙碌警告】(Activity ≠ Progress)！连续查阅资料、看论文、记笔记，但不敢写一行测试代码或跑一次实验。你在用低风险的准备工作掩盖对证伪失败的逃避。';
        breakthroughGuidance = `运用【${modelMeta.name}】：击破 Action=0 心理坚冰！假想向一个 8 岁儿童解释当前卡点。不要再做宏大调研，立刻把任务降维为 1 个 2 分钟就能完成的微小物理动作，去触发一次真实的现实回响！`;
        minimalTest = {
          title: '15分钟极低阻力即刻探针测试',
          description: `停止一切被动资料阅读，编写 1 行最小调试输出或执行一次基础命令，目击真实运行回显。`,
          instructions: [
            '关闭所有打开的论文与网页文档，仅保留代码编辑器或终端',
            '在最可疑的逻辑位置插入 1 行探针输出（如 console.log 或 print）',
            '运行 1 次最简命令，亲眼目击终端输出的第一手读数并记录为证物'
          ],
          estMinutes: 15,
          timeboxMinutes: 15,
          falsificationCondition: '若执行后控制台输出与心中的基础假定直接矛盾，立即宣告原准备方案失效，转向新因果分支',
          expectedOutcome: '彻底打破行动瘫痪，以最小代价获取真实客观反馈'
        };
        break;

      case OBSTACLE_TYPES.PREMATURE_CONVERGENCE:
        title = '过早收敛：证实偏差死守孤立假说';
        analysis = '先入为主认定只有这一种可能，对显而易见的反面证据视而不见。陷入了只搜集支持材料的证实偏差 (Confirmation Bias)，拒绝探索竞争性假说。';
        breakthroughGuidance = `运用【${modelMeta.name}】：波普尔证伪主义——科学认知的飞跃源于大胆猜想与严酷证伪！停止寻找证实证据，专门构造 1 个能够以最低成本一击击垮当前假设的极端反例（Edge Case）。`;
        minimalTest = {
          title: '15分钟极简反例边界击破实验',
          description: `提炼当前死守假说的核心命题，构造一个最极端的反直觉边界输入，观察系统是否产生矛盾。`,
          instructions: [
            '写下当前假说的单一核心命题：“如果 X，则必然在 Y 条件下发生 Z”',
            '设计 1 个最极端的反例输入（如边界空值、超大负数、断网或颠倒顺序）',
            '运行测试，记录系统真实反应是否直接打脸原假说'
          ],
          estMinutes: 15,
          timeboxMinutes: 15,
          falsificationCondition: '若极简反例输入下系统依然发生异常或产生了与假设互斥的现象，当前死守的孤立假说彻底宣告推翻',
          expectedOutcome: '以极低成本证伪错误方向，促使思维认知向正确因果空间开放'
        };
        break;
    }

    return {
      title,
      diagnosisTitle: title,
      analysis,
      underlyingCause: analysis,
      mentalModel: modelKey,
      appliedMentalModel: modelKey,
      mentalModelName: modelMeta.name,
      mentalModelMeta: modelMeta,
      breakthroughGuidance,
      breakthroughHeuristic: breakthroughGuidance,
      minimalTest,
      minimalViableTest: minimalTest
    };
  }

  /**
   * 离线确定性卡点诊断主方法 (Deterministic Offline Diagnostic)
   */
  diagnoseBottleneckOffline(context = {}, options = {}) {
    const rawText = this.extractText(context);
    const classification = this.classifyObstacle(context);
    const obstacleType = classification.obstacleType;
    const confidence = classification.confidence;
    const guidance = this.generateOfflineGuidance(obstacleType, rawText);

    return {
      success: true,
      obstacleType,
      type: obstacleType,
      confidence,
      ...guidance,
      source: 'offline_heuristic',
      isAiGenerated: false,
      timestamp: Date.now()
    };
  }

  /**
   * 线上大模型卡点诊断方法 (LLM API Enhanced Diagnostic)
   * 支持协议自适应与优雅自愈降级
   */
  async diagnoseBottleneckAsync(context = {}, options = {}) {
    const opts = options || {};
    const settings = opts.settings || opts.userSettings || opts;
    const rawText = this.extractText(context);

    // 1. 若配置有效大模型 API，尝试线上深度认知推演
    if (opts.mode !== 'offline' && aiAdvisor.isOnlineConfigured(settings)) {
      try {
        const systemPrompt = `你是一位专注于科研破障、工程排障与因果科学的顶尖认知战略参谋。
你的任务是深入诊断用户的思维卡点，将其准确分类为五大核心认知障碍之一，并结合三大科学思维模型输出极具穿透力的破局启发与 15 分钟最小可证伪验证动作。

【五大核心认知障碍 (obstacleType)】严格限定为：
- CONCEPT_CONFUSION (概念混淆 / 定义模糊 / 伪问题 / 同名异物)
- MISSING_BASELINE (缺乏对照基线 / 盲目尝试 / 未记录原始状态)
- UNISOLATED_VARIABLES (实验变量未隔离 / 多因并发 / 归因混乱 / 伪迹耦合)
- ACTION_ZERO_PARALYSIS (零行动瘫痪 / 准备过度 / 虚假忙碌 / 认知超载)
- PREMATURE_CONVERGENCE (过早收敛 / 盲目乐观 / 死守假说 / 缺少反例检验)

【三大科学思维模型 (mentalModel)】严格限定为：
- first_principles (第一性原理)
- minimal_counter_example (极简反例法)
- feynman_technique (费曼技巧)

【输出约束】
必须输出严格合法的 JSON 对象，格式如下：
{
  "obstacleType": "UNISOLATED_VARIABLES",
  "confidence": 0.92,
  "title": "简明诊断结论（20字以内）",
  "analysis": "致因深度剖析（50-100字）",
  "mentalModel": "minimal_counter_example",
  "mentalModelName": "极简反例法",
  "breakthroughGuidance": "一针见血的破局战术启发（50-100字）",
  "minimalViableTest": {
    "title": "15分钟最小验证动作名称",
    "description": "简明行动描述",
    "instructions": ["步骤1", "步骤2", "步骤3"],
    "estMinutes": 15,
    "timeboxMinutes": 15,
    "falsificationCondition": "若结果为X，则彻底推翻原假说",
    "expectedOutcome": "预期观察与信息增益"
  }
}`;

        const userPrompt = `【待诊断卡点描述】:
${rawText || '用户未提供具体卡点描述，但当前任务进展受阻已久。'}

请根据上述卡点文本进行深入诊断，输出结构化 JSON。`;

        const reply = await aiAdvisor.requestLlm(
          settings.baseUrl || settings.apiUrl,
          settings.apiKey,
          settings.model,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          { timeout: settings.timeout || 5000 }
        );

        if (reply) {
          const jsonMatch = reply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const validTypes = Object.values(OBSTACLE_TYPES);
            const validModels = Object.values(MENTAL_MODELS);

            if (parsed.obstacleType && validTypes.includes(parsed.obstacleType)) {
              const appliedModel = validModels.includes(parsed.mentalModel) ? parsed.mentalModel : this.selectMentalModel(parsed.obstacleType);
              const modelMeta = MENTAL_MODEL_META[appliedModel] || MENTAL_MODEL_META[MENTAL_MODELS.FIRST_PRINCIPLES];
              const testPlan = parsed.minimalViableTest || parsed.minimalTest || {};

              const normalizedTest = {
                title: testPlan.title || '15分钟最小验证测试',
                description: testPlan.description || '执行极简实测验证',
                instructions: Array.isArray(testPlan.instructions) ? testPlan.instructions : [testPlan.instructions || '执行验证操作'],
                estMinutes: Math.min(15, Math.max(5, parseInt(testPlan.estMinutes || testPlan.timeboxMinutes, 10) || 15)),
                timeboxMinutes: 15,
                falsificationCondition: testPlan.falsificationCondition || '若观测结果不符合猜想，立即推翻假设',
                expectedOutcome: testPlan.expectedOutcome || '验证假设真伪'
              };

              return {
                success: true,
                obstacleType: parsed.obstacleType,
                type: parsed.obstacleType,
                confidence: Math.max(0.1, Math.min(1.0, typeof parsed.confidence === 'number' && !isNaN(parsed.confidence) ? parsed.confidence : 0.90)),
                title: parsed.title || `${modelMeta.name}破局诊断`,
                diagnosisTitle: parsed.title || `${modelMeta.name}破局诊断`,
                analysis: parsed.analysis || '深度因果诊断完成',
                underlyingCause: parsed.analysis || '深度因果诊断完成',
                mentalModel: appliedModel,
                appliedMentalModel: appliedModel,
                mentalModelName: parsed.mentalModelName || modelMeta.name,
                mentalModelMeta: modelMeta,
                breakthroughGuidance: parsed.breakthroughGuidance || parsed.breakthroughHeuristic || '审视底层因果',
                breakthroughHeuristic: parsed.breakthroughGuidance || parsed.breakthroughHeuristic || '审视底层因果',
                minimalTest: normalizedTest,
                minimalViableTest: normalizedTest,
                source: 'online_llm',
                isAiGenerated: true,
                timestamp: Date.now()
              };
            }
          }
        }
      } catch (err) {
        console.warn('AI 线上卡点诊断受限或格式异常，自动平滑降级为离线启发库:', err.message);
      }
    }

    // 2. 离线启发式规则矩阵确定性兜底 (Graceful Offline Fallback)
    const fallback = this.diagnoseBottleneckOffline(context, options);
    fallback.fallbackFromApi = opts.mode !== 'offline' && aiAdvisor.isOnlineConfigured(settings);
    return fallback;
  }

  /**
   * 卡点诊断统一入口 (Dual-Core Façade)
   * 默认同步返回离线启发式结果以保障 0ms 延迟与确定性测试；若显式指定 async / useApi 则返回 Promise
   */
  diagnoseBottleneck(context = {}, options = {}) {
    const opts = options || {};
    if (opts.async === true || opts.useApi === true || opts.mode === 'api') {
      return this.diagnoseBottleneckAsync(context, options);
    }
    return this.diagnoseBottleneckOffline(context, options);
  }

  /**
   * 主动感知探针 (Proactive Triggers Detection)
   * 自动探测停滞、虚假忙碌 (Activity ≠ Progress)、假说堆积与未连接疑问
   */
  detectProactiveTriggers(projectState = {}) {
    const state = (projectState && typeof projectState === 'object') ? projectState : {};
    const clues = Array.isArray(state.clues) ? state.clues : [];
    const observations = clues.filter(c => c && c.type === 'observation');
    const questions = clues.filter(c => c && c.type === 'question');
    const hypotheses = clues.filter(c => c && c.type === 'hypothesis');
    const evidences = clues.filter(c => c && c.type === 'evidence');
    const bottlenecks = clues.filter(c => c && c.type === 'bottleneck');

    const cockpit = state.cockpit || {};
    const stagnationMinutes = Math.max(0, Number(state.stagnationMinutes || cockpit.stagnationMinutes || 0) || 0);

    // 1. 虚假忙碌警告 (Activity ≠ Progress): 观测或文献多于等于3条，但实测证物为0
    if (observations.length >= 3 && evidences.length === 0) {
      return {
        triggered: true,
        triggerType: 'fluff_activity',
        urgency: 'critical',
        suggestedMentalModel: MENTAL_MODELS.FEYNMAN_TECHNIQUE,
        reason: '触发【虚假忙碌警告】(Activity ≠ Progress)：已积累多条背景观察与文献，但实测证物为 0，陷入准备过度泥潭。',
        recommendedAction: '立即停止查阅泛化资料，运用费曼技巧大白话写出猜想，并执行 15 分钟最小 A/B 证伪实测。',
        details: {
          observationsCount: observations.length,
          evidencesCount: evidences.length,
          stagnationMinutes
        }
      };
    }

    // 2. 长时间停滞检测: 停滞超过 15 分钟无有效推进
    if (stagnationMinutes >= 15) {
      return {
        triggered: true,
        triggerType: 'stagnation',
        urgency: 'high',
        suggestedMentalModel: MENTAL_MODELS.FIRST_PRINCIPLES,
        reason: `任务连续停滞超过 ${stagnationMinutes} 分钟，当前微动作未发生状态跃迁，可能遭遇隐形认知阻力。`,
        recommendedAction: '启用第一性原理进行问题粉碎，或召唤战术破局参谋诊断核心瓶颈。',
        details: {
          stagnationMinutes,
          currentBottleneck: cockpit.currentBottleneck || '未标记瓶颈'
        }
      };
    }

    // 3. 假说堆积而未验证 (High Hypothesis-to-Evidence Ratio)
    if (hypotheses.length >= 2 && evidences.length === 0) {
      return {
        triggered: true,
        triggerType: 'unverified_hypotheses',
        urgency: 'medium',
        suggestedMentalModel: MENTAL_MODELS.MINIMAL_COUNTER_EXAMPLE,
        reason: '当前存在多个猜想假说，但未沉淀任何客观实测证据，存在空想发散风险。',
        recommendedAction: '运用极简反例法，挑选最脆弱的假说设计 15 分钟单变量击破测试。',
        details: {
          hypothesesCount: hypotheses.length,
          evidencesCount: evidences.length
        }
      };
    }

    // 4. 核心疑问未收敛 (Unconverged Questions)
    if (questions.length >= 2 && hypotheses.length === 0) {
      return {
        triggered: true,
        triggerType: 'unconverged_questions',
        urgency: 'medium',
        suggestedMentalModel: MENTAL_MODELS.FIRST_PRINCIPLES,
        reason: '已提出多项探索疑问，但尚未提炼为可证伪的机制性因果假说。',
        recommendedAction: '将关键疑问转化为“如果 X 机制成立，则在 Y 条件下应出现 Z”的假说节点。',
        details: {
          questionsCount: questions.length,
          hypothesesCount: hypotheses.length
        }
      };
    }

    // 5. 显式守门 BOSS 卡点待攻克
    if (bottlenecks.length > 0 && !cockpit.actionCompleted) {
      return {
        triggered: true,
        triggerType: 'boss_gatekeeper',
        urgency: 'high',
        suggestedMentalModel: MENTAL_MODELS.MINIMAL_COUNTER_EXAMPLE,
        reason: `存在处于活跃状态的核心攻坚卡点【${bottlenecks[0].title || '核心卡点'}】等待攻破。`,
        recommendedAction: '针对此守门卡点调用破局诊断，部署 15 分钟最小 A/B 验证方案。',
        details: {
          bossTitle: bottlenecks[0].title || '核心卡点'
        }
      };
    }

    // 正常状态
    return {
      triggered: false,
      triggerType: 'none',
      urgency: 'normal',
      suggestedMentalModel: null,
      reason: '当前探索节奏健康，因果演进处于稳定心流状态。',
      recommendedAction: '继续保持即刻微动作连击推进。',
      details: {
        cluesCount: clues.length,
        evidencesCount: evidences.length,
        stagnationMinutes
      }
    };
  }
}

const defaultDiagnostician = new BottleneckDiagnostician();
defaultDiagnostician.BottleneckDiagnostician = BottleneckDiagnostician;
module.exports = defaultDiagnostician;
