// services/slash-engine.js
/**
 * Slash Commands & Interactive Cognitive Artifacts Engine
 * 
 * Part of Google Antigravity-inspired Windows Attached Sidebar Task Hub (Milestone M3).
 * Provides:
 *   - Command lexer & parser for /plan, /shred, /solve and fallback guidance.
 *   - /shred: Deconstructs macro blockers into strictly 3 physical micro-actions (estMinutes <= 2, physical verbs).
 *   - /solve: 5-obstacle taxonomy diagnosis + 3 scientific mental models + 15m Popperian test with falsificationCondition.
 *   - /plan: Structured 3-phase milestone roadmap with step dependency graph (dependsOn) and timeboxes.
 *   - Interactive step mutation with monotonic progress calculation.
 *   - Strict elimination of vanity gamification (pure genuine cognitive assets).
 */

const cognitiveShredder = require('./cognitive-shredder');
const bottleneckDiagnostician = require('./bottleneck-diagnostician');

// Allowed immediate physical verbs for micro-actions
const PHYSICAL_VERBS = ['打开', '运行', '记录', '查看', '搜索', '输入', '查阅', '启动', '执行', '打印', '注释', '对比', '固定'];

/**
 * Parse slash command prefix from input query.
 * 
 * @param {string} input - Raw user input string
 * @returns {{ command: string|null, commandName: string|null, rawInput: string, query: string }}
 */
function parseSlashCommand(input = '') {
  const trimmed = String(input || '').trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_\-]+)(?:\s+(.*))?$/s);
  if (!match) {
    return {
      command: null,
      commandName: null,
      rawInput: trimmed,
      query: trimmed
    };
  }
  return {
    command: '/' + match[1].toLowerCase(),
    commandName: match[1].toLowerCase(),
    rawInput: trimmed,
    query: (match[2] || '').trim()
  };
}

/**
 * Mutate a step in an artifact and monotonically recalculate progress.
 * 
 * @param {object} artifact - The artifact object
 * @param {string} stepId - The step identifier
 * @param {boolean} completed - Target completion state
 * @returns {object|null} Updated artifact copy or null if step not found
 */
function mutateArtifactStep(artifact, stepId, completed) {
  if (!artifact) return null;
  const isCompleted = Boolean(completed);
  const now = Date.now();
  let stepFound = false;

  const updated = JSON.parse(JSON.stringify(artifact));
  const steps = updated.steps || (updated.payload && (updated.payload.steps || updated.payload.actions)) || [];

  for (const step of steps) {
    if (step.id === stepId) {
      step.completed = isCompleted;
      step.completedAt = isCompleted ? now : null;
      stepFound = true;
      break;
    }
  }

  // Synchronize payload.steps, payload.actions, and payload.phases if present
  if (updated.payload) {
    if (Array.isArray(updated.payload.steps)) {
      for (const s of updated.payload.steps) {
        if (s.id === stepId) {
          s.completed = isCompleted;
          s.completedAt = isCompleted ? now : null;
          stepFound = true;
        }
      }
    }
    if (Array.isArray(updated.payload.actions)) {
      for (const a of updated.payload.actions) {
        if (a.id === stepId) {
          a.completed = isCompleted;
          a.completedAt = isCompleted ? now : null;
          stepFound = true;
        }
      }
    }
    if (Array.isArray(updated.payload.phases)) {
      for (const phase of updated.payload.phases) {
        if (Array.isArray(phase.steps)) {
          for (const phaseStep of phase.steps) {
            if (phaseStep.id === stepId) {
              phaseStep.completed = isCompleted;
              phaseStep.completedAt = isCompleted ? now : null;
              stepFound = true;
              break;
            }
          }
        }
      }
    }
  }

  if (!stepFound) return null;

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  updated.progress = {
    totalSteps,
    completedSteps,
    percent
  };
  updated.updatedAt = now;
  updated.status = (completedSteps === totalSteps && totalSteps > 0)
    ? 'completed'
    : (completedSteps > 0 ? 'in-progress' : 'active');

  return updated;
}

class SlashEngine {
  constructor() {
    this.name = 'SlashEngine';
    this.cognitiveShredder = cognitiveShredder;
    this.bottleneckDiagnostician = bottleneckDiagnostician;
  }

  parseSlashCommand(input) {
    return parseSlashCommand(input);
  }

  /**
   * Main dispatcher for Slash commands.
   * 
   * @param {object|string} payload - Input payload or raw text
   * @returns {Promise<object>} Standard Artifact object
   */
  async executeSlashCommand(payload) {
    let rawInput = '';
    let command = null;
    let query = '';
    let attachments = [];
    let options = {};

    if (typeof payload === 'string') {
      rawInput = payload.trim();
      const parsed = parseSlashCommand(rawInput);
      command = parsed.command;
      query = parsed.query;
    } else if (payload && typeof payload === 'object') {
      rawInput = payload.rawInput || payload.input || payload.query || '';
      command = payload.command || null;
      query = payload.query !== undefined ? payload.query : rawInput;
      attachments = payload.attachments || payload.mountedContexts || [];
      options = payload.options || {};

      if (!command && rawInput.startsWith('/')) {
        const parsed = parseSlashCommand(rawInput);
        command = parsed.command;
        if (!query || query === rawInput) {
          query = parsed.query;
        }
      }
    }

    const normCmd = command ? command.toLowerCase() : null;

    switch (normCmd) {
      case '/shred':
        return await this.handleShredCommand({ rawInput, query, attachments, options });
      case '/solve':
        return await this.handleSolveCommand({ rawInput, query, attachments, options });
      case '/plan':
        return await this.handlePlanCommand({ rawInput, query, attachments, options });
      default:
        return this.handleUnknownCommand({ rawInput, command: normCmd, query, attachments });
    }
  }

  /**
   * /shred: Breaks blocker into strictly 3 physical micro-actions (<=2 min each).
   */
  async handleShredCommand({ rawInput, query, attachments, options }) {
    let effectiveGoal = (query && typeof query === 'string') ? query.trim() : '';
    if (!effectiveGoal && Array.isArray(attachments) && attachments.length > 0) {
      const primary = attachments[0];
      effectiveGoal = (primary && (primary.content || primary.preview)) ? String(primary.content || primary.preview).trim() : '';
    }
    const rawGoal = effectiveGoal || '排查当前最阻碍推进的核心卡点';
    const shredRes = await this.cognitiveShredder.decomposeGoal(rawGoal, { mode: 'offline', ...options });
    const rawCards = shredRes.cards || shredRes.actions || [];

    // Strictly enforce 3 micro-actions for /shred
    const targetCards = rawCards.slice(0, 3);
    const now = Date.now();
    const artifactId = `art_shred_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const topic = this.cognitiveShredder.extractCoreTopic(rawGoal);

    const steps = [];
    for (let idx = 0; idx < targetCards.length; idx++) {
      const card = targetCards[idx];
      // Ensure physical verb
      let verb = card.actionVerb || card.verb || '打开';
      let title = card.title || `步骤 ${idx + 1}`;
      
      const hasPhysicalVerb = PHYSICAL_VERBS.some(v => verb.includes(v) || title.includes(v));
      if (!hasPhysicalVerb) {
        verb = idx === 0 ? '打开' : (idx === 1 ? '运行' : '记录');
        title = `${verb}：${title}`;
      }

      // Enforce estMinutes <= 2
      const estMinutes = Math.min(2, Math.max(1, Number(card.estMinutes) || 1));
      const stepId = card.id || `shred_step_${idx + 1}`;

      steps.push({
        id: stepId,
        order: idx + 1,
        title,
        verb,
        actionVerb: verb,
        plainPrompt: card.plainPrompt || title,
        detail: card.plainPrompt || card.reasoning || title,
        estMinutes,
        flowStage: card.flowStage || (idx === 0 ? 'probe' : (idx === 1 ? 'isolate' : 'record')),
        reasoning: card.reasoning || '符合2分钟物理微动作启动法则',
        completed: false,
        completedAt: null,
        dependsOn: idx > 0 ? [steps[idx - 1].id] : []
      });
    }

    // Ensure we have at least 3 steps
    while (steps.length < 3) {
      const idx = steps.length;
      const defaultVerbs = ['打开', '运行', '记录'];
      const verb = defaultVerbs[idx] || '查看';
      steps.push({
        id: `shred_step_${idx + 1}`,
        order: idx + 1,
        title: `${verb}终端记录基线数据`,
        verb,
        actionVerb: verb,
        plainPrompt: `立即${verb}相关窗口，观察第一项物理指标`,
        detail: `消除启动阻力，记录当前基线状态`,
        estMinutes: 1,
        flowStage: idx === 0 ? 'probe' : (idx === 1 ? 'isolate' : 'record'),
        reasoning: '符合2分钟物理微动作启动法则',
        completed: false,
        completedAt: null,
        dependsOn: idx > 0 ? [steps[idx - 1].id] : []
      });
    }

    return {
      id: artifactId,
      type: 'shred',
      command: '/shred',
      title: `微动作粉碎：${topic}`,
      query: rawGoal,
      mountedContexts: attachments,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      payload: {
        domain: shredRes.domain || 'GENERAL_EXPLORATION',
        actions: steps,
        steps
      },
      steps,
      progress: {
        totalSteps: steps.length,
        completedSteps: 0,
        percent: 0
      },
      localFilePath: null
    };
  }

  /**
   * /solve: Diagnoses obstacle across 5 types, applies 3 mental models, outputs 15m Popperian test.
   */
  async handleSolveCommand({ rawInput, query, attachments, options }) {
    const contextText = query || '排查当前思维卡点与阻碍';
    const diag = this.bottleneckDiagnostician.diagnoseBottleneck({
      text: contextText,
      contextText,
      attachments,
      ...options
    });

    const now = Date.now();
    const artifactId = `art_solve_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const minimalTest = diag.minimalViableTest || diag.minimalTest || {
      title: '15分钟最小可证伪验证测试',
      estMinutes: 15,
      falsificationCondition: '若测试现象未改变，则证伪当前关键致因假说',
      instructions: [
        { id: 'inst_1', text: '保持环境绝对不动，记录当前状态读数作为基准' },
        { id: 'inst_2', text: '仅变更 1 个可疑变量进行隔离验证' },
        { id: 'inst_3', text: '比对前后差异并记录结论' }
      ]
    };

    const rawInstructions = minimalTest.instructions || [
      '固定所有外在干扰变量并记录当前基线读数',
      '设计单一变量A/B极简对照操作',
      '肉眼比对差分，依据证伪准则判定结果'
    ];

    const steps = rawInstructions.map((inst, idx) => {
      const text = typeof inst === 'string' ? inst : (inst.text || inst.title || `测试步骤 ${idx + 1}`);
      const stepId = (typeof inst === 'object' && inst.id) ? inst.id : `solve_step_${idx + 1}`;
      const actionVerbs = ['固定', '运行', '对比', '记录', '查看'];
      const verb = actionVerbs[idx % actionVerbs.length];

      return {
        id: stepId,
        order: idx + 1,
        title: text,
        verb,
        actionVerb: verb,
        detail: `执行 15 分钟最小可证伪测试步骤 ${idx + 1}`,
        estMinutes: Math.min(5, Math.max(2, Math.round((minimalTest.estMinutes || 15) / Math.max(1, rawInstructions.length)))),
        completed: false,
        completedAt: null,
        dependsOn: idx > 0 ? [`solve_step_${idx}`] : []
      };
    });

    return {
      id: artifactId,
      type: 'solve',
      command: '/solve',
      title: `破局诊断：${diag.obstacleName || diag.title || '思维卡点诊断'}`,
      query: contextText,
      mountedContexts: attachments,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      payload: {
        diagnosis: diag,
        minimalViableTest: minimalTest,
        steps
      },
      steps,
      progress: {
        totalSteps: steps.length,
        completedSteps: 0,
        percent: 0
      },
      localFilePath: null
    };
  }

  /**
   * /plan: Decomposes complex task into 3 sequenced milestone phases with step dependency graph.
   */
  async handlePlanCommand({ rawInput, query, attachments, options }) {
    const rawGoal = query || '规划复杂工程探索任务';
    const domain = this.cognitiveShredder.classifyDomain(rawGoal);
    const topic = this.cognitiveShredder.extractCoreTopic(rawGoal);
    const now = Date.now();
    const artifactId = `art_plan_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // Domain-tailored phase and step synthesis
    let phaseConfigs = [];

    if (domain === 'DEV_DEBUG') {
      phaseConfigs = [
        {
          name: '阶段 1 · 契约定义与环境基线勘探',
          steps: [
            {
              id: 'step_1',
              title: `定义${topic}统一接口契约与依赖基准检查`,
              verb: '定义',
              detail: `打开核心模块，核实配置依赖与环境状态，固定输入输出契约。`,
              estMinutes: 5,
              dependsOn: []
            }
          ]
        },
        {
          name: '阶段 2 · 核心链路最小实现',
          steps: [
            {
              id: 'step_2',
              title: `实现${topic}最小执行链路与单元测试用例`,
              verb: '实现',
              detail: `以无锁极简形式实现核心算法或通信逻辑，编写基础单测断言。`,
              estMinutes: 10,
              dependsOn: ['step_1']
            }
          ]
        },
        {
          name: '阶段 3 · 闭环验证与边界加固',
          steps: [
            {
              id: 'step_3',
              title: `运行${topic}端到端基准测试并记录吞吐量指标`,
              verb: '运行',
              detail: `执行并发与异常容错测试，验证零内存泄漏与响应时延。`,
              estMinutes: 15,
              dependsOn: ['step_2']
            }
          ]
        }
      ];
    } else if (domain === 'RESEARCH_EXPERIMENT') {
      phaseConfigs = [
        {
          name: '阶段 1 · 变量隔离与空白对照建立',
          steps: [
            {
              id: 'step_1',
              title: `采集${topic}无干扰静息基线信号并记录客观方差`,
              verb: '记录',
              detail: `排除环境噪声干扰，建立测量基准对照组。`,
              estMinutes: 5,
              dependsOn: []
            }
          ]
        },
        {
          name: '阶段 2 · 单一变量干预测试',
          steps: [
            {
              id: 'step_2',
              title: `施加单一实验变量并记录${topic}响应差分`,
              verb: '运行',
              detail: `严格固定其余伴随变量，仅改变核心待验证变量。`,
              estMinutes: 10,
              dependsOn: ['step_1']
            }
          ]
        },
        {
          name: '阶段 3 · 波普尔证伪与统计收敛',
          steps: [
            {
              id: 'step_3',
              title: `比对假说预言与实测证物，核验证伪准则`,
              verb: '对比',
              detail: `计算置信区间，若偏离预言则修正因果假说。`,
              estMinutes: 15,
              dependsOn: ['step_2']
            }
          ]
        }
      ];
    } else {
      phaseConfigs = [
        {
          name: '阶段 1 · 基线勘探与契约定义',
          steps: [
            {
              id: 'step_1',
              title: `梳理${topic}核心输入输出与边界条件`,
              verb: '梳理',
              detail: `明确最小可行目标，杜绝自嗨式发散与边缘需求堆砌。`,
              estMinutes: 5,
              dependsOn: []
            }
          ]
        },
        {
          name: '阶段 2 · 核心链路最小实现',
          steps: [
            {
              id: 'step_2',
              title: `落地${topic}最小可行产出物原型`,
              verb: '执行',
              detail: `聚焦当下最核心难点，以最小阻力快速推进第一版交付物。`,
              estMinutes: 10,
              dependsOn: ['step_1']
            }
          ]
        },
        {
          name: '阶段 3 · 闭环验证与边界加固',
          steps: [
            {
              id: 'step_3',
              title: `核对${topic}验收标准并沉淀本地知识资产`,
              verb: '验证',
              detail: `复盘执行偏差，整理为结构化文档与后续行动指南。`,
              estMinutes: 15,
              dependsOn: ['step_2']
            }
          ]
        }
      ];
    }

    // Flatten steps for checklist
    const allSteps = [];
    const phases = phaseConfigs.map((phase, pIdx) => {
      const phaseId = `phase_${pIdx + 1}`;
      const phaseSteps = phase.steps.map((st, sIdx) => {
        const stepObj = {
          id: st.id || `step_${pIdx + 1}_${sIdx + 1}`,
          order: allSteps.length + 1,
          phaseId,
          phaseName: phase.name,
          title: st.title,
          verb: st.verb || '执行',
          actionVerb: st.verb || '执行',
          detail: st.detail || '',
          estMinutes: st.estMinutes || 10,
          completed: false,
          completedAt: null,
          dependsOn: st.dependsOn || []
        };
        allSteps.push(stepObj);
        return stepObj;
      });
      return {
        id: phaseId,
        name: phase.name,
        steps: phaseSteps
      };
    });

    return {
      id: artifactId,
      type: 'plan',
      command: '/plan',
      title: `${topic}落地推进计划`,
      query: rawGoal,
      mountedContexts: attachments,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      payload: {
        domain,
        topic,
        phases,
        steps: allSteps
      },
      steps: allSteps,
      progress: {
        totalSteps: allSteps.length,
        completedSteps: 0,
        percent: 0
      },
      localFilePath: null
    };
  }

  /**
   * Unknown command fallback: Returns friendly guidance card.
   */
  handleUnknownCommand({ rawInput, command, query, attachments }) {
    const cmdStr = command || (rawInput ? rawInput.split(/\s+/)[0] : '未知指令');
    return {
      id: `art_guidance_${Date.now()}`,
      type: 'guidance',
      command: cmdStr,
      title: `未知的指令: ${cmdStr}`,
      summary: `支持的指令：/plan (任务分步规划), /shred (2分钟阻碍粉碎), /solve (第一性原理破局)`,
      supportedCommands: ['/plan', '/shred', '/solve'],
      query: rawInput,
      mountedContexts: attachments || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      progress: { totalSteps: 0, completedSteps: 0, percent: 0 },
      steps: [],
      payload: {
        supportedCommands: ['/plan', '/shred', '/solve']
      }
    };
  }

  toggleArtifactStep(payload) {
    if (!payload) return null;
    const { artifact, artifactId, stepId, completed } = payload;
    if (artifact) {
      return mutateArtifactStep(artifact, stepId, completed);
    }
    const store = require('./store');
    return store.toggleArtifactStep(artifactId, stepId, completed);
  }
}

const defaultEngine = new SlashEngine();

module.exports = {
  parseSlashCommand,
  mutateArtifactStep,
  executeSlashCommand: (payload) => defaultEngine.executeSlashCommand(payload),
  executeCommand: (payload) => defaultEngine.executeSlashCommand(payload),
  execute: (payload) => defaultEngine.executeSlashCommand(payload),
  toggleArtifactStep: (payload) => defaultEngine.toggleArtifactStep(payload),
  SlashEngine,
  defaultEngine
};
