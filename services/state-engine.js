// services/state-engine.js
/**
 * 探索任务状态转换引擎 (State Transformation Engine)
 * 形式化实现 Agent–World–Possibility 三元状态更新动力学
 * 包含：5阶因果演进流、Auto-DAG 拓扑编织与 Epistemic Clarity (ΔQt) 严密计算模型
 */

const CLUE_LEVELS = {
  phenomenon: 0,
  observation: 0,
  question: 1,
  hypothesis: 2,
  evidence: 3,
  breakthrough: 4,
  bottleneck: 4
};

const COLUMN_COORDS = {
  0: 100, // phenomenon / observation
  1: 340, // question
  2: 580, // hypothesis
  3: 820, // evidence
  4: 1060 // breakthrough / bottleneck
};

class StateEngine {
  constructor() {
    this.CLUE_LEVELS = CLUE_LEVELS;
    this.COLUMN_COORDS = COLUMN_COORDS;
  }

  getClueLevel(type) {
    const t = String(type || '').toLowerCase();
    return CLUE_LEVELS[t] !== undefined ? CLUE_LEVELS[t] : 0;
  }

  /**
   * 统计 DAG 图中闭合的完整因果链条数 (Complete Causal Paths)
   * 完整链条定义：从 Layer 0 (现象/目击) 贯穿 Layer 1 (疑问)、Layer 2 (假说) 并抵达 Layer 3 (实测证据) 或 Layer 4 (突破)
   */
  countClosedChains(clues = []) {
    if (!clues || clues.length === 0) return 0;

    const hasParentIds = clues.some(c => !!c.parentId);

    if (hasParentIds) {
      const nodeMap = new Map();
      const childrenMap = new Map();
      for (const c of clues) {
        nodeMap.set(c.id, c);
        childrenMap.set(c.id, []);
      }
      for (const c of clues) {
        if (c.parentId && childrenMap.has(c.parentId)) {
          childrenMap.get(c.parentId).push(c.id);
        }
      }

      let completePaths = 0;
      const roots = clues.filter(c => this.getClueLevel(c.type) === 0);

      const traverse = (nodeId, visitedLevels, visited = new Set()) => {
        if (visited.has(nodeId)) return 0;
        const node = nodeMap.get(nodeId);
        if (!node) return;
        const lvl = this.getClueLevel(node.type);
        const nextLevels = new Set(visitedLevels);
        nextLevels.add(lvl);

        if (lvl >= 3 && nextLevels.has(0) && nextLevels.has(1) && nextLevels.has(2)) {
          completePaths++;
          return;
        }

        const nextVisited = new Set(visited);
        nextVisited.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        for (const chId of children) {
          traverse(chId, nextLevels, nextVisited);
        }
      };

      for (const r of roots) {
        traverse(r.id, new Set(), new Set());
      }

      if (completePaths > 0) return completePaths;
    }

    // 若尚未建立显式 parentId 边，基于类型充实度推断闭环数
    const obs = clues.filter(c => this.getClueLevel(c.type) === 0).length;
    const q = clues.filter(c => this.getClueLevel(c.type) === 1).length;
    const hyp = clues.filter(c => this.getClueLevel(c.type) === 2).length;
    const evi = clues.filter(c => this.getClueLevel(c.type) === 3).length;

    if (obs > 0 && q > 0 && hyp > 0 && evi > 0) {
      return Math.min(obs, q, hyp, evi);
    }
    return 0;
  }

  /**
   * 认知清晰度严密计算模型 (Epistemic Clarity Progress Formula)
   * ΔQt = clamp(15 + S_chain + S_ratio + S_boss + S_action + P_fluff, 0, 100)
   * @param {Object} projectData 探索项目数据
   * @param {Object} profile 玩家认知画像 (可选)
   */
  computeClarity(projectData, profile = null) {
    const project = projectData || {};
    const clues = Array.isArray(project.clues) ? project.clues : [];

    const observations = clues.filter(c => this.getClueLevel(c.type) === 0);
    const questions = clues.filter(c => this.getClueLevel(c.type) === 1);
    const hypotheses = clues.filter(c => this.getClueLevel(c.type) === 2);
    const evidences = clues.filter(c => this.getClueLevel(c.type) === 3);
    const breakthroughs = clues.filter(c => c.type === 'breakthrough');
    const bottlenecks = clues.filter(c => c.type === 'bottleneck');

    // 1. 基础起始分 (Base starting clarity)
    const baseScore = 15;

    // 2. 因果完整链条分 (S_chain ∈ [0, 35]): 每完成一条完整贯通链条 +18 分，上限 35
    const closedChains = this.countClosedChains(clues);
    const S_chain = Math.min(35, closedChains * 18);

    // 3. 假说-证据覆盖比分 (S_ratio ∈ [0, 25]): 验证已提出的假说是否得到实测检验
    let S_ratio = 0;
    if (hypotheses.length > 0) {
      S_ratio = Math.min(25, Math.round((evidences.length / hypotheses.length) * 25));
    }

    // 4. 关键瓶颈突破与里程碑攻克状态分 (S_milestone ∈ [0, 20])
    let S_milestone = 0;
    if (breakthroughs.length > 0 || project.cockpit?.actionCompleted) {
      S_milestone = 20;
    } else if (project.cockpit?.currentBottleneck && project.cockpit?.nextAction) {
      S_milestone = 10;
    }

    // 5. 交互式产出物与微动作完成分 (S_action ∈ [0, 15]): 每完成一项微动作 +3 分
    let completedActionsCount = 0;
    if (profile && typeof profile.completedStepsCount === 'number') {
      completedActionsCount = Math.max(completedActionsCount, profile.completedStepsCount);
    }
    // 向后兼容测试套件传入的 legacy profile
    if (profile && profile.totalXp) {
      completedActionsCount = Math.max(completedActionsCount, Math.floor(profile.totalXp / 200));
    }
    if (profile && profile.comboStreak > 1) {
      completedActionsCount = Math.max(completedActionsCount, profile.comboStreak - 1);
    }
    if (project.cockpit?.actionCompleted) {
      completedActionsCount = Math.max(completedActionsCount, 1);
    }
    const S_action = Math.min(15, completedActionsCount * 3);

    // 6. 虚假忙碌惩罚项 (P_fluff = -15): 当 observations >= 3 且 evidences === 0 时触发
    let P_fluff = 0;
    const isFluffAlert = observations.length >= 3 && evidences.length === 0;
    if (isFluffAlert) {
      P_fluff = -15;
    }

    // 计算总清晰度并严格限制在 [0, 100]
    const rawClarity = baseScore + S_chain + S_ratio + S_milestone + S_action + P_fluff;
    const clarityScore = Math.max(0, Math.min(100, Math.round(rawClarity)));

    return {
      clarityScore,
      deltaQt: clarityScore,
      baseScore,
      chainScore: S_chain,
      ratioScore: S_ratio,
      milestoneScore: S_milestone,
      bossScore: S_milestone, // 兼容测试套件
      actionScore: S_action,
      fluffPenalty: P_fluff,
      closedChains,
      isFluffAlert,
      details: {
        observationsCount: observations.length,
        questionsCount: questions.length,
        hypothesesCount: hypotheses.length,
        evidencesCount: evidences.length,
        breakthroughsCount: breakthroughs.length,
        bottlenecksCount: bottlenecks.length,
        closedChains,
        rawClarity
      }
    };
  }

  /**
   * 自动将碎片线索编织为层次化有向无环图 (Auto-DAG Synthesis & Barycentric Layout)
   * @param {Array} clues 线索列表
   */
  synthesizeClueDag(clues = []) {
    if (!Array.isArray(clues)) return [];

    const nodes = clues.map(c => ({
      ...c,
      level: this.getClueLevel(c.type)
    }));

    // 自动推断未指定的 parentId
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.parentId && node.level > 0) {
        const candidates = nodes.filter(cand => cand.id !== node.id && cand.level < node.level);
        if (candidates.length > 0) {
          const immediate = candidates.filter(cand => cand.level === node.level - 1);
          const pool = immediate.length > 0 ? immediate : candidates;

          const nodeText = ((node.title || '') + ' ' + (node.content || '')).toLowerCase();
          let best = pool[0];
          let maxOverlap = -1;

          for (const cand of pool) {
            const candText = ((cand.title || '') + ' ' + (cand.content || '')).toLowerCase();
            let overlap = 0;
            const words = nodeText.match(/[a-z0-9_\u4e00-\u9fa5]{2,}/g) || [];
            for (const w of words) {
              if (candText.includes(w)) overlap++;
            }
            if (overlap > maxOverlap) {
              maxOverlap = overlap;
              best = cand;
            }
          }
          node.parentId = best.id;
        }
      }
    }

    // 重心坐标排版 (Barycentric Layer Alignment)
    const layerNodes = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    nodes.forEach(n => {
      const lvl = n.level;
      if (layerNodes[lvl]) layerNodes[lvl].push(n);
      else layerNodes[0].push(n);
    });

    // Layer 0 现象/目击列排版
    layerNodes[0].forEach((n, idx) => {
      n.x = COLUMN_COORDS[0];
      n.y = 120 + idx * 130;
    });

    // Layer 1..4 层级重心对齐
    for (let lvl = 1; lvl <= 4; lvl++) {
      const list = layerNodes[lvl];
      list.forEach(n => {
        n.x = COLUMN_COORDS[lvl];
        const parent = nodes.find(p => p.id === n.parentId);
        n.barycenter = parent ? parent.y : (120 + list.indexOf(n) * 130);
      });

      // 排序以最小化连线交叉 (Link-Crossing Minimization)
      list.sort((a, b) => a.barycenter - b.barycenter);

      list.forEach((n, idx) => {
        n.y = Math.max(80, n.barycenter !== undefined
          ? n.barycenter + (idx > 0 ? (idx % 2 === 1 ? 1 : -1) * Math.ceil(idx / 2) * 110 : 0)
          : (120 + idx * 130));
      });
    }

    // 建立有向边
    const links = [];
    nodes.forEach(n => {
      if (n.parentId) {
        const parent = nodes.find(p => p.id === n.parentId);
        if (parent) links.push({ from: parent, to: n });
      }
    });

    const clarity = this.computeClarity({ clues: nodes });

    const result = nodes;
    result.nodes = nodes;
    result.layoutNodes = nodes;
    result.links = links;
    result.clarityProgress = clarity.clarityScore;
    result.closedChains = clarity.closedChains;
    return result;
  }

  /**
   * 计算当前系统的核心度量与状态转换
   * @param {Object} project 当前探索项目
   * @param {Object} profile 玩家认知画像
   */
  evaluateSystemState(project, profile) {
    if (!project) return null;

    const clues = project.clues || [];
    const observations = clues.filter(c => this.getClueLevel(c.type) === 0);
    const questions = clues.filter(c => this.getClueLevel(c.type) === 1);
    const hypotheses = clues.filter(c => this.getClueLevel(c.type) === 2);
    const evidences = clues.filter(c => this.getClueLevel(c.type) === 3);
    const bottlenecks = clues.filter(c => c.type === 'bottleneck');
    const breakthroughs = clues.filter(c => c.type === 'breakthrough');

    // 1. 认知收敛率计算 (Epistemic Convergence ΔQt)
    const clarity = this.computeClarity(project, profile);

    // 2. 可能性空间扩张度量 (Possibility Space Expansion ΔPt)
    const activePossibilities = Math.max(1, 3 + evidences.length * 2);

    // 3. 瓶颈危险等级检测 (与 bottleneck-diagnostician 严格同步阈值)
    // observations >= 3 且 evidences === 0 触发虚假忙碌警告 (Activity ≠ Progress)
    const isFluffActivityAlert = observations.length >= 3 && evidences.length === 0;
    let bottleneckUrgency = 'normal'; // 'normal' | 'high' | 'critical'

    if (isFluffActivityAlert) {
      bottleneckUrgency = 'critical';
    } else if (bottlenecks.length > 0 && !project.cockpit?.actionCompleted) {
      bottleneckUrgency = 'high';
    }

    return {
      agentState: {
        rank: profile ? profile.rankTitle : 'Lv.1 探索者',
        xp: profile ? profile.totalXp : 0,
        epistemicCertainty: clarity.clarityScore,
        actionReadiness: project.cockpit?.actionCompleted ? 'READY_FOR_NEXT' : 'BLOCKED_BY_EXPERIMENT'
      },
      worldState: {
        clueGraphNodeCount: clues.length,
        observationsCount: observations.length,
        questionsCount: questions.length,
        hypothesesCount: hypotheses.length,
        evidencesCount: evidences.length,
        breakthroughsCount: breakthroughs.length,
        bottlenecksCount: bottlenecks.length
      },
      possibilitySpace: {
        activeCount: activePossibilities,
        unlockedPaths: evidences.map(e => `基于【${e.title}】解锁的新探索分支`)
      },
      bottleneckAssessment: {
        urgency: bottleneckUrgency,
        isFluffActivityAlert,
        currentBossTitle: project.cockpit?.currentBottleneck || '未识别到瓶颈'
      },
      clarity
    };
  }

  /**
   * 自动推演下一步推荐悬赏 (Next Bounty Recommendation)
   */
  recommendNextBounty(project) {
    const clues = project?.clues || [];
    const hypotheses = clues.filter(c => this.getClueLevel(c.type) === 2);
    const evidences = clues.filter(c => this.getClueLevel(c.type) === 3);

    if (hypotheses.length > 0 && evidences.length === 0) {
      return {
        title: `针对【${hypotheses[0].title}】设计 15 分钟最小 A/B 实测`,
        type: 'experiment',
        estMinutes: 15,
        xpReward: 200
      };
    }

    return {
      title: project?.cockpit?.nextAction || '记录第 1 条关键反例或新目击',
      type: 'observation',
      estMinutes: 20,
      xpReward: 150
    };
  }
}

module.exports = new StateEngine();
module.exports.StateEngine = StateEngine;
