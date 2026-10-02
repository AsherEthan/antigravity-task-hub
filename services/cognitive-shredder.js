// services/cognitive-shredder.js
const aiAdvisor = require('./ai-advisor');

/**
 * 物理微动作白名单 (PHYSICAL_VERB_WHITELIST) - 严格 23 个可物理检验操作动词
 */
const PHYSICAL_VERB_WHITELIST = [
  '打开', '注释', '对比', '打印', '修改', '运行', '运行测试', '记录', '查看',
  '搜索', '查阅', '标记', '执行', '定位', '替换', '复制', '新建', '固定',
  '测试', '断开', '连接', '截取', '采集'
];

/**
 * 非物理模糊动词黑名单 (FUZZY_VERB_BLACKLIST) - 严禁在微动作标题、动词与白话提示中出现
 */
const FUZZY_VERB_BLACKLIST = [
  '思考', '分析', '理解', '弄懂', '领会', '构思', '研读', '推导', '揣摩',
  '琢磨', '领悟', '体会', '研究', '策划', '探讨', '规划', '梳理', '总结',
  '学习', '反思', '评估', '考察', '想象', '推测', '消化', '体悟'
];

/**
 * 模糊动词到纯物理微动作的降维映射表
 */
const FUZZY_TO_PHYSICAL_MAP = {
  '思考': '记录',
  '分析': '对比',
  '理解': '查阅',
  '弄懂': '查阅',
  '领会': '查阅',
  '构思': '新建',
  '研读': '查阅',
  '推导': '记录',
  '揣摩': '对比',
  '琢磨': '查阅',
  '领悟': '查阅',
  '体会': '查看',
  '研究': '查阅',
  '策划': '新建',
  '探讨': '记录',
  '规划': '新建',
  '梳理': '记录',
  '总结': '记录',
  '学习': '查阅',
  '反思': '记录',
  '评估': '对比',
  '考察': '查看',
  '想象': '记录',
  '推测': '记录',
  '消化': '查阅',
  '体悟': '记录'
};

function sanitizeFuzzyVerbs(str) {
  if (!str || typeof str !== 'string') return '';
  let result = str;
  for (const fuzzy of FUZZY_VERB_BLACKLIST) {
    if (result.includes(fuzzy)) {
      const rep = FUZZY_TO_PHYSICAL_MAP[fuzzy] || '查看';
      result = result.split(fuzzy).join(rep);
    }
  }
  return result;
}

function sanitizeActionVerb(verb) {
  if (!verb || typeof verb !== 'string') return '打开';
  let cleaned = sanitizeFuzzyVerbs(verb.trim());
  if (PHYSICAL_VERB_WHITELIST.includes(cleaned)) {
    return cleaned;
  }
  const sorted = [...PHYSICAL_VERB_WHITELIST].sort((a, b) => b.length - a.length);
  for (const wv of sorted) {
    if (cleaned.startsWith(wv) || cleaned.includes(wv)) {
      return wv;
    }
  }
  return '打开';
}

function sanitizePhysicalCard(card, index = 0, total = 3, goalId = '') {
  const c = (card && typeof card === 'object') ? { ...card } : {};
  const timestamp = Date.now();

  const rawVerb = c.actionVerb || c.verb || '打开';
  const actionVerb = sanitizeActionVerb(rawVerb);

  let title = String(c.title || `${actionVerb}并确认执行结果`).trim();
  title = sanitizeFuzzyVerbs(title);

  let plainPrompt = String(c.plainPrompt || title).trim();
  plainPrompt = sanitizeFuzzyVerbs(plainPrompt);

  const estMinutes = Math.min(2, Math.max(1, parseInt(c.estMinutes, 10) || 1));

  const result = {
    id: c.id || `act_${timestamp}_${index + 1}`,
    goalId: goalId || c.goalId || `goal_${timestamp}`,
    title,
    plainPrompt,
    verb: actionVerb,
    actionVerb,
    contextTarget: sanitizeFuzzyVerbs(c.contextTarget || '目标任务对象'),
    estMinutes,
    energy: c.energy || 'low',
    energyLevel: c.energyLevel || 'low',
    effortLevel: estMinutes <= 1 ? 'minimal' : 'low',
    flowStage: c.flowStage || (index === 0 ? 'probe' : index === 1 ? 'isolate' : index === 2 ? 'record' : 'verify'),
    reasoning: sanitizeFuzzyVerbs(c.reasoning || '符合2分钟极低阻力物理微动作启动法则，消除决策疲劳'),
    status: c.status || (index === 0 ? 'active' : 'pending'),
    order: index + 1,
    stepIndex: index + 1,
    totalSteps: total || c.totalSteps || 3,
    createdAt: c.createdAt || timestamp
  };

  delete result.xpReward;
  return result;
}

/**
 * 认知负荷粉碎机与即刻微动作飞轮服务 (Cognitive Load Shredder & Micro-Action Flywheel)
 * 实现 R1:
 * 1. 宏观模糊目标自动粉碎为 >=3 个严格符合「2分钟启动法则」的极低阻力微动作卡片 (MicroActionCard)
 * 2. 状态自适应的下一步动作推荐 (Continuous Flow Flywheel)
 * 3. 灵活双核架构：零延迟离线启发规则矩阵 + 云端/本地大模型 API 自适应降级
 */
class CognitiveShredder {
  constructor() {
    this.name = 'CognitiveShredder';
  }

  /**
   * 意图与领域分类器 (Domain Classifier)
   * 识别 5 大典型攻坚场景
   */
  classifyDomain(goalText = '') {
    const raw = (goalText === null || goalText === undefined ? '' : (typeof goalText === 'object' && goalText.title ? goalText.title : (typeof goalText === 'object' && goalText.content ? goalText.content : goalText)));
    const text = String(raw).toLowerCase();

    // 1. 探索与学习场景 (若以学习/入门/掌握/了解/初探/搞懂开头，优先归类为学习探索)
    if (/^(学习|入门|掌握|了解|初探|搞懂|探索)/i.test(text)) {
      return 'GENERAL_EXPLORATION';
    }

    // 2. 文档写作与方案提炼 (若显式包含撰写/开题报告/方案总结等，优先归类为写作)
    const writingKeywords = /(^(写|撰写)|开题报告|结题报告|设计文档|方案设计|架构文档|论文撰写|ppt|总结报告|复盘|综述)/i;
    if (writingKeywords.test(text)) {
      return 'WRITING_SYNTHESIS';
    }

    // 2. 软件工程与排障调试
    const devKeywords = /(bug|error|exception|fail|crash|oom|timeout|504|404|报错|异常|崩溃|死锁|并发|穿透|雪崩|击穿|缓存|redis|sql|数据库|连接池|内存泄漏|微服务|重构|代码|接口|前端|后端|vue|react|node|electron|编译|单测|部署)/i;
    if (devKeywords.test(text)) {
      return 'DEV_DEBUG';
    }

    // 3. 科研探索与实验测量
    const researchKeywords = /(脑电|eeg|实验|科研|调研|论文|算法|测量|基线|对照|样本|方差|频段|伪迹|信号|特征|训练|准确率|模型|假说|证物|指标|物理|生理)/i;
    if (researchKeywords.test(text)) {
      return 'RESEARCH_EXPERIMENT';
    }

    // 4. 产品商业化与市场验证
    const businessKeywords = /(mvp|商业|付费|用户|增长|转化|落地页|产品|客户|访谈|定价|竞品|市场|推广|销售|渠道|首发)/i;
    if (businessKeywords.test(text)) {
      return 'PRODUCT_BUSINESS';
    }

    // 次级写作关键词判断
    if (/(写|撰写|文档|方案|大纲|草稿|汇报)/i.test(text)) {
      return 'WRITING_SYNTHESIS';
    }

    // 5. 通用探索与开放学习
    return 'GENERAL_EXPLORATION';
  }

  /**
   * 从原始文本中剥离模糊高阶词汇，提取物理关注主题
   */
  extractCoreTopic(goalText = '') {
    const raw = (goalText === null || goalText === undefined ? '' : (typeof goalText === 'object' && goalText.title ? goalText.title : (typeof goalText === 'object' && goalText.content ? goalText.content : goalText)));
    let topic = String(raw).trim();
    if (!topic || topic === '[object Object]') return '当前核心任务';

    // 剔除常见的模糊宏观修饰词
    const fuzzyPrefixes = [
      /^(如何|怎么|怎样|尝试|请问|我想|需要|必须)/,
      /^(彻底|全面|深入|快速|系统性|完美|完整|仔细|反复)/,
      /^(搞定|搞懂|解决|优化|重构|实现|攻克|学习|理清|弄清|推进|完成|分析|调研|研究|思考|研读|推导|构思|琢磨|理解|掌握|探索)/,
      /^(并|及|和)/
    ];

    let changed = true;
    while (changed) {
      changed = false;
      for (const reg of fuzzyPrefixes) {
        if (reg.test(topic)) {
          topic = topic.replace(reg, '').trim();
          changed = true;
        }
      }
    }

    // 移除标点符号结尾
    topic = topic.replace(/[？?！!。，,；;]+$/, '').trim();
    topic = sanitizeFuzzyVerbs(topic);
    return topic || '当前核心任务';
  }

  /**
   * 离线认知启发规则矩阵 (Offline Cognitive Heuristic Matrix)
   * 100% 确定性、0ms 延迟，生成严格符合 2 分钟极低阻力的微动作链条
   */
  generateOfflineCards(goalText, options = {}) {
    const opts = options || {};
    const domain = this.classifyDomain(goalText);
    const topic = this.extractCoreTopic(goalText);
    const goalId = opts.goalId || `goal_${Date.now()}`;
    const timestamp = Date.now();

    let rawTemplates = [];

    switch (domain) {
      case 'DEV_DEBUG':
        rawTemplates = [
          {
            title: `打开代码编辑器定位【${topic}】关联文件`,
            plainPrompt: `不要思考复杂逻辑，仅打开代码编辑器搜索关键词，定位到最核心的文件或入口函数。`,
            verb: '打开',
            contextTarget: `${topic} 核心代码入口`,
            estMinutes: 1,
            flowStage: 'probe',
            reasoning: '启动势垒归零：只要打开物理文件即完成第一步，无需预判后续排障复杂度。'
          },
          {
            title: `在疑似异常入口添加 1 行调试日志输出入参`,
            plainPrompt: `在入口位置添加一行 console.log / print 打印出当前变量与时间戳，保存文件。`,
            verb: '打印',
            contextTarget: '调试日志探针',
            estMinutes: 2,
            flowStage: 'isolate',
            reasoning: '单一变量隔离：黑盒转白盒，用眼睛直接目击真实运行入参。'
          },
          {
            title: `运行一次测试或单次请求观察控制台输出`,
            plainPrompt: `在终端运行一次单元测试命令或发起单次触发请求，查看控制台是否打印出预期日志。`,
            verb: '运行',
            contextTarget: '终端执行命令 / curl 请求',
            estMinutes: 2,
            flowStage: 'record',
            reasoning: '建立确定性基线：亲眼确认现象是否可稳定复现。'
          },
          {
            title: `记录控制台关键报错或输出读数到线索库`,
            plainPrompt: `复制控制台打印的核心变量或错误栈关键行，粘贴记录为探索伴侣的第一条现象线索。`,
            verb: '记录',
            contextTarget: '探索伴侣线索库',
            estMinutes: 1,
            flowStage: 'verify',
            reasoning: '认知资产锚定：目击即事实，将模糊的卡点转化为可证伪的因果节点。'
          }
        ];
        break;

      case 'RESEARCH_EXPERIMENT':
        rawTemplates = [
          {
            title: `打开【${topic}】最近的一份原始数据或采样日志`,
            plainPrompt: `双击打开最近的一份实测数据文件或原始采样记录，不作复杂数学处理。`,
            verb: '打开',
            contextTarget: '原始实验数据文件',
            estMinutes: 1,
            flowStage: 'probe',
            reasoning: '无认知负担目击：先看真实数据一眼，摆脱对文献公式的空想。'
          },
          {
            title: `查阅前 10 秒采样读数或首批样本异常特征`,
            plainPrompt: `滚动查看前 10 秒读数，标记是否存在超出正常量程的突变尖峰或漂移。`,
            verb: '查阅',
            contextTarget: '前 10 秒采样窗口',
            estMinutes: 2,
            flowStage: 'isolate',
            reasoning: '极小时间窗口切片：在局部建立观察敏感度，避免全量分析的眩晕感。'
          },
          {
            title: `记录 1 个最明显的异常读数区间与可疑扰动源`,
            plainPrompt: `在便签或线索库中写下突变时间戳，记录 1 个最简单的可能物理干扰（如电极松动或眼动）。`,
            verb: '记录',
            contextTarget: '异常波峰与可疑扰动',
            estMinutes: 2,
            flowStage: 'record',
            reasoning: '因果猜想降维：只锁定 1 个最可疑的假说，拒绝多变量混乱耦合。'
          },
          {
            title: `标记该组读数作为未经扰动的 Blank 对照基线`,
            plainPrompt: `将该记录标记为零点基线 (Baseline 0)，用于后续 A/B 对照差分。`,
            verb: '标记',
            contextTarget: 'Baseline 0 对照基线',
            estMinutes: 1,
            flowStage: 'verify',
            reasoning: '科学测量第一步：无基线不实验，确立参考系。'
          }
        ];
        break;

      case 'PRODUCT_BUSINESS':
        rawTemplates = [
          {
            title: `打开便签写下【${topic}】目标用户的唯一最痛卡点`,
            plainPrompt: `用一句话大白话写出：用户在什么具体情境下因为什么问题抓狂（不超过20字）。`,
            verb: '打开',
            contextTarget: '用户痛点单句陈述',
            estMinutes: 2,
            flowStage: 'probe',
            reasoning: '价值主张收敛：杜绝宏大叙事，聚焦用户唯一愿意立刻付费解决的刺痛。'
          },
          {
            title: `搜索 1 个同赛道现有对标方案的定价或落地页`,
            plainPrompt: `在浏览器打开 1 个同类竞品的官网，直奔其 Pricing 定价或核心功能介绍页。`,
            verb: '搜索',
            contextTarget: '竞品定价页',
            estMinutes: 2,
            flowStage: 'isolate',
            reasoning: '现实锚点确立：查看市场现存的真实成交基准，消除定价盲区。'
          },
          {
            title: `记录对标方案的基础单价与最受关注的核心卖点`,
            plainPrompt: `在便签中记录对方的基础收费区间和用户最常评价的优点/缺点。`,
            verb: '记录',
            contextTarget: '竞品核心参数',
            estMinutes: 1,
            flowStage: 'record',
            reasoning: '最小可行基准：以成熟产品为尺，丈量我们 MVP 的差异化落脚点。'
          }
        ];
        break;

      case 'WRITING_SYNTHESIS':
        rawTemplates = [
          {
            title: `新建文档写下【${topic}】的核心受众与 1 个关键结论`,
            plainPrompt: `新建空白文档，只写两句话：这份文档是给谁看的？读者看完后必须记住的唯一结论是什么？`,
            verb: '打开',
            contextTarget: '空白工作文档',
            estMinutes: 2,
            flowStage: 'probe',
            reasoning: '以终为始：在写任何正文前锚定交流终局，避免无目的文字堆砌。'
          },
          {
            title: `列出 3 个支撑该结论的一级骨架小标题`,
            plainPrompt: `不写具体段落，仅写下 3 个骨架标题（例如：背景事实、核心发现、行动建议）。`,
            verb: '记录',
            contextTarget: '三段式骨架目录',
            estMinutes: 2,
            flowStage: 'isolate',
            reasoning: '结构化思维降阻：骨架一旦固定，填充细节的认知负荷降低 80%。'
          },
          {
            title: `搜索并粘贴 1 条支撑第 1 个标题的关键事实或数据`,
            plainPrompt: `找到一条权威佐证数据或截图，直接粘贴在第 1 个标题下方，暂不润色文字。`,
            verb: '搜索',
            contextTarget: '事实证据碎片',
            estMinutes: 2,
            flowStage: 'record',
            reasoning: '证据驱动展开：用客观事实驱动论述，消除白纸面对焦虑。'
          }
        ];
        break;

      default: // GENERAL_EXPLORATION
        rawTemplates = [
          {
            title: `打开终端或笔记写下【${topic}】的最浅显物理疑问`,
            plainPrompt: `用大白话写下一个最基础的疑问，例如：“这套系统最核心的输入和输出究竟是什么？”`,
            verb: '打开',
            contextTarget: '最简物理疑问',
            estMinutes: 1,
            flowStage: 'probe',
            reasoning: '第一性原理切入：破除黑话崇拜，从最直观的因果输入输出开始记录与观察。'
          },
          {
            title: `查阅官方 Hello World 示例或极简入门定义`,
            plainPrompt: `搜索官方最简示例（<10行代码或1页简介），只看最简单的骨架运作方式。`,
            verb: '查阅',
            contextTarget: '官方最简 Hello World',
            estMinutes: 2,
            flowStage: 'isolate',
            reasoning: '最小可用切片：在不引入任何高阶插件的前提下确认最原始闭环。'
          },
          {
            title: `运行一次最简示例或记录核心术语的物理意义`,
            plainPrompt: `在本地跑通 1 次示例，亲眼看到最基本的输出文本，记录到笔记中。`,
            verb: '运行',
            contextTarget: '最简原型运行',
            estMinutes: 2,
            flowStage: 'record',
            reasoning: '物理事实确认：让知识落实在客观世界的终端回显中。'
          }
        ];
        break;
    }

    return rawTemplates.map((tpl, idx) => {
      const cardId = `act_${timestamp}_${idx + 1}`;
      return sanitizePhysicalCard({
        id: cardId,
        goalId,
        title: tpl.title,
        plainPrompt: tpl.plainPrompt,
        verb: tpl.verb,
        actionVerb: tpl.verb,
        contextTarget: tpl.contextTarget,
        estMinutes: Math.min(2, Math.max(1, tpl.estMinutes || 2)),
        energy: 'low',
        energyLevel: 'low',
        effortLevel: tpl.estMinutes <= 1 ? 'minimal' : 'low',
        flowStage: tpl.flowStage,
        reasoning: tpl.reasoning,
        status: idx === 0 ? 'active' : 'pending',
        order: idx + 1,
        stepIndex: idx + 1,
        totalSteps: rawTemplates.length,
        createdAt: timestamp
      }, idx, rawTemplates.length, goalId);
    });
  }

  /**
   * 规范化并校验动作卡片，确保严格遵循 2 分钟规则与全字段完整性
   */
  normalizeCard(card, index, total, goalId) {
    return sanitizePhysicalCard(card, index, total, goalId);
  }

  /**
   * 目标全自动粉碎主入口 (Auto Goal Decomposition)
   * 支持离线启发规则与线上大模型双核调用，并在异常时自愈降级
   */
  async decomposeGoal(goalText, options = {}) {
    const opts = options || {};
    const textVal = (goalText === null || goalText === undefined ? '' : (typeof goalText === 'object' && goalText.title ? goalText.title : (typeof goalText === 'object' && goalText.content ? goalText.content : goalText)));
    let rawGoal = String(textVal).trim();
    if (!rawGoal || rawGoal === '[object Object]') {
      rawGoal = '开启新课题探索';
    }
    const domain = this.classifyDomain(rawGoal);
    const settings = opts.settings || opts.userSettings || opts;
    const forceOffline = opts.mode === 'offline';

    // 1. 若允许线上且已配置 API，尝试调用大模型
    if (!forceOffline && aiAdvisor.isOnlineConfigured(settings)) {
      try {
        const systemPrompt = `你是一位世界顶尖的认知负荷工程与行为动力学专家。
你的任务是将用户混沌模糊的宏观目标【粉碎】为 3~4 个严格符合「2分钟启动法则」的极低阻力即刻微动作（Micro-Action Cards）。

【核心约束】
1. 2分钟法则：每个微动作的 estMinutes 必须严格 <= 2 分钟！严禁返回需要耗费长时间思考的大块任务。
2. 单一物理动词：每个卡片的 actionVerb 必须是单一立即物理动作（如：打开、运行、打印、注释、搜索、记录、查阅、标记）。杜绝“深入研究”、“全面梳理”等高认知负荷表述。
3. 白话文英雄提示：plainPrompt 必须用口语化大白话描述操作第一步，告诉用户只动手指做哪件事。
4. 飞轮推进：flowStage 依次按 probe（探测目击）、isolate（变量隔离）、record（基线记录）、verify（快速复核）演进。
5. 必须返回严格的 JSON 格式：
{
  "cards": [
    {
      "title": "简短动作标题（15字以内）",
      "plainPrompt": "白话操作指南（20-40字）",
      "actionVerb": "打开",
      "contextTarget": "操作对象/文件/终端",
      "estMinutes": 2,
      "flowStage": "probe",
      "reasoning": "为什么这一步阻力极低"
    }
  ]
}`;

        const userPrompt = `用户输入的宏观目标：【${rawGoal}】\n领域参考：${domain}\n请立即将其粉碎为符合规范的微动作卡片 JSON。`;

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
          // 提取 JSON 内容
          const jsonMatch = reply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const rawCards = Array.isArray(parsed.cards) ? parsed.cards : parsed.actions;
            if (Array.isArray(rawCards) && rawCards.length >= 3) {
              const validCards = rawCards.filter(c => c && typeof c === 'object');
              if (validCards.length >= 3) {
                const goalId = opts.goalId || `goal_${Date.now()}`;
                const cards = validCards.map((c, i) => this.normalizeCard(c, i, validCards.length, goalId));
                return {
                  success: true,
                  actions: cards,
                  cards,
                  mode: 'api',
                  isAiGenerated: true,
                  domain,
                  goalText: rawGoal
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn('AI 线上粉碎受限或格式异常，自动降级为离线认知启发库:', err.message);
      }
    }

    // 2. 离线规则库确定性保底 (Offline Heuristic Fallback)
    const cards = this.generateOfflineCards(rawGoal, opts);
    return {
      success: true,
      actions: cards,
      cards,
      mode: 'offline',
      isAiGenerated: false,
      fallbackFromApi: !forceOffline && aiAdvisor.isOnlineConfigured(settings),
      domain,
      goalText: rawGoal
    };
  }

  /**
   * 心流推进飞轮：推荐或自适应生成下一步微动作
   * @param {Object} completedAction 刚刚完成的微动作卡片
   * @param {Object} currentProjectState 当前探索项目最新上下文
   */
  recommendNextAction(completedAction, currentProjectState = {}) {
    const timestamp = Date.now();
    const state = currentProjectState || {};

    // 1. 若当前状态内存在未完成的预分解微动作队列，优先推进下一个
    const rawCardList = state.cards || state.microActions || [];
    const cardList = (Array.isArray(rawCardList) ? rawCardList : []).filter(c => c && typeof c === 'object');
    if (cardList.length > 0) {
      const nextPending = cardList.find(c => c && c.status === 'pending');
      if (nextPending) {
        return sanitizePhysicalCard({
          ...nextPending,
          status: 'active',
          reasoning: '心流连贯推进：顺势进入下一个预定微动作'
        }, 0, cardList.length, nextPending.goalId);
      }
    }

    // 2. 根据刚刚完成的动作阶段与项目上下文，动态推演下一动
    const stage = completedAction?.flowStage || 'probe';
    const actionVerb = completedAction?.actionVerb || completedAction?.verb || '打开';
    const actionTitle = completedAction?.title || '上一动作';
    const cockpit = state.cockpit || state.activeProject?.cockpit || {};
    const bottleneck = cockpit.currentBottleneck;

    let nextTitle = '记录当下的新发现或疑问到线索库';
    let nextPlain = '在探索伴侣输入刚才操作中注意到的任何异常、读数或新疑问。';
    let nextVerb = '记录';
    let nextStage = 'record';
    let nextTarget = '探索伴侣线索库';

    if (stage === 'probe') {
      nextTitle = '针对刚才目击的现象，在入口添加 1 行打印探针';
      nextPlain = '让系统输出更多可读信息，在关键代码或数据流转处加一行打印。';
      nextVerb = '打印';
      nextStage = 'isolate';
      nextTarget = '调试打印日志';
    } else if (stage === 'isolate') {
      nextTitle = '运行 1 次最简验证或触发请求查看终端回显';
      nextPlain = '不要做复杂配置，立即在终端执行一次调用，肉眼确认日志是否输出。';
      nextVerb = '运行';
      nextStage = 'record';
      nextTarget = '单测脚本 / 终端';
    } else if (stage === 'record') {
      nextTitle = '对比实测输出与初始假说，标记有效证物';
      nextPlain = '检查刚才控制台的读数是否支持最初的猜想，沉淀为一条证据节点。';
      nextVerb = '对比';
      nextStage = 'verify';
      nextTarget = '因果证据沉淀';
    } else if (stage === 'verify') {
      if (bottleneck && !cockpit.actionCompleted) {
        nextTitle = `针对卡点【${bottleneck.slice(0, 10)}...】设计 2 分钟极简排查`;
        nextPlain = `不试图立刻消灭 BOSS，仅设计一个 2 分钟的最小切片观察卡点细节。`;
        nextVerb = '查阅';
        nextStage = 'probe';
        nextTarget = '核心瓶颈变量';
      } else {
        nextTitle = '在因果图谱中标记当前里程碑突破或记录新疑问';
        nextPlain = '完成了一个闭环！把当前结论固定，并提出下一个最想弄明白的疑问。';
        nextVerb = '标记';
        nextStage = 'probe';
        nextTarget = '里程碑图谱';
      }
    }

    const prevOrder = completedAction ? (completedAction.order ?? completedAction.stepIndex) : 0;
    const nextOrder = Number(prevOrder || 0) + 1;
    const prevTotal = Number(completedAction && completedAction.totalSteps || 3) || 3;

    const nextCard = {
      id: `act_${timestamp}_flywheel`,
      goalId: completedAction?.goalId || `goal_${timestamp}`,
      title: nextTitle,
      plainPrompt: nextPlain,
      verb: nextVerb,
      actionVerb: nextVerb,
      contextTarget: nextTarget,
      estMinutes: 2, // 严格 <= 2 分钟
      energy: 'low',
      energyLevel: 'low',
      effortLevel: 'low',
      flowStage: nextStage,
      reasoning: '心流飞轮动力学：基于前一动作闭环自然流转，零认知阻力持续推进',
      status: 'active',
      order: nextOrder,
      stepIndex: nextOrder,
      totalSteps: Math.max(nextOrder, prevTotal + 1),
      createdAt: timestamp
    };

    return sanitizePhysicalCard(nextCard, nextOrder - 1, Math.max(nextOrder, prevTotal + 1), nextCard.goalId);
  }
}

CognitiveShredder.PHYSICAL_VERB_WHITELIST = PHYSICAL_VERB_WHITELIST;
CognitiveShredder.FUZZY_VERB_BLACKLIST = FUZZY_VERB_BLACKLIST;
CognitiveShredder.FUZZY_TO_PHYSICAL_MAP = FUZZY_TO_PHYSICAL_MAP;
CognitiveShredder.sanitizePhysicalCard = sanitizePhysicalCard;
CognitiveShredder.sanitizeActionVerb = sanitizeActionVerb;
CognitiveShredder.sanitizeFuzzyVerbs = sanitizeFuzzyVerbs;

const defaultShredder = new CognitiveShredder();
defaultShredder.CognitiveShredder = CognitiveShredder;
defaultShredder.PHYSICAL_VERB_WHITELIST = PHYSICAL_VERB_WHITELIST;
defaultShredder.FUZZY_VERB_BLACKLIST = FUZZY_VERB_BLACKLIST;
defaultShredder.FUZZY_TO_PHYSICAL_MAP = FUZZY_TO_PHYSICAL_MAP;
defaultShredder.sanitizePhysicalCard = sanitizePhysicalCard;
defaultShredder.sanitizeActionVerb = sanitizeActionVerb;
defaultShredder.sanitizeFuzzyVerbs = sanitizeFuzzyVerbs;

module.exports = defaultShredder;
