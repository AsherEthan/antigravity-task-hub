// services/store.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let stateEngine = null;
function getStateEngine() {
  if (!stateEngine) {
    try {
      stateEngine = require('./state-engine');
    } catch (e) {
      // lazy load fallback
    }
  }
  return stateEngine;
}

const CLUE_LEVELS = {
  phenomenon: 0,
  observation: 0,
  question: 1,
  hypothesis: 2,
  evidence: 3,
  breakthrough: 4,
  bottleneck: 4
};

const DEFAULT_LEVEL_X = {
  0: 100,
  1: 340,
  2: 580,
  3: 820,
  4: 1060
};

class DataStore {
  constructor() {
    const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..');
    this.filePath = path.join(userDataPath, 'exploration_quest_data.json');
    this.data = this.loadData();
  }

  get completedStepsCount() {
    return this.data?.playerProfile?.completedStepsCount || 0;
  }

  get totalXp() {
    return this.data?.playerProfile?.totalXp || 200;
  }

  get comboStreak() {
    return this.data?.playerProfile?.comboStreak || 1;
  }

  getDefaultData() {
    return {
      activeProjectId: 'proj_eeg_001',
      userSettings: {
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        gameTheme: 'apple-dark-theme', // apple-dark-theme | apple-tahoe-theme | apple-space-theme
        hudAlwaysOnTop: true,
        hudOpacity: 0.95
      },
      playerProfile: {
        convergenceRate: 58, // ΔQt: 58%
        possibilityCount: 12, // ΔPt: 12 种未来行动已被解锁
        completedStepsCount: 0,
        totalXp: 200,
        comboStreak: 1
      },
      artifacts: [
        {
          id: 'art_seed_shred_01',
          type: 'shred',
          command: '/shred',
          title: '排查前额微眼动伪迹干扰 (2分钟物理微动作粉碎)',
          query: '排除眼皮微颤对脑电Alpha频段的电位漂移',
          mountedContexts: [{ type: 'clipboard', label: '@clipboard', preview: 'EEG Signal noise at 10Hz' }],
          createdAt: Date.now() - 3600000,
          updatedAt: Date.now(),
          status: 'in-progress',
          progress: { totalSteps: 3, completedSteps: 1, percent: 33 },
          steps: [
            { id: 's1', title: '打开采集软件终端，确认 10Hz 基线采样', actionVerb: '打开', estMinutes: 1, completed: true, completedAt: Date.now() - 1800000 },
            { id: 's2', title: '运行 15 分钟眼罩对比测试，记录电位方差', actionVerb: '运行', estMinutes: 2, completed: false, completedAt: null },
            { id: 's3', title: '记录滤波前后信噪比差值并写入日志', actionVerb: '记录', estMinutes: 2, completed: false, completedAt: null }
          ]
        }
      ],
      activeArtifactId: 'art_seed_shred_01',
      projects: [
        {
          id: 'proj_eeg_001',
          title: 'EEG 脑电 × 冥想神经机制探测',
          description: '从客观电生理信号切入，寻找闭眼冥想状态的可重复量化指标，剥离肌电伪迹。',
          status: 'active',
          currentChapter: '第 2 阶段 · 排除伪迹与建立对照',
          createdAt: Date.now() - 86400000 * 5,
          cockpit: {
            coreQuestion: '操作性定义「冥想状态」的神经电生理特征，区分真实神经信号与额部微肌电',
            currentBottleneck: '消费级脑电仪的 Theta 波剧烈波动，70% 疑似为眼球微颤与额肌电位污染，缺乏客观基线',
            nextAction: '执行 15 分钟遮光眼罩 A/B 对照实测（对比 4-8Hz 频段能量方差衰减率）',
            actionCompleted: false,
            unknowns: [
              '不同冥想流派（观呼吸 vs 慈悲冥想）的脑电功率谱是否存在统一基线？',
              '额轮匝肌慢速微漂移与 4-8Hz Theta 频段的耦合强度多大？'
            ],
            tacticalCritique: '指挥官，警惕虚假忙碌 (Activity ≠ Progress)！不要再看第 13 篇文献了，现在整个系统的唯一致命卡点是肌电伪迹，快去跑 15 分钟眼罩实测！'
          },
          clues: [
            {
              id: 'clue_001',
              type: 'observation',
              title: '闭眼静息 4 分钟后的频段异动',
              content: '测试发现在闭眼静息 4 分钟后，受试者后枕部 Alpha 波功率上升，但前额叶 Theta 波波动非常剧烈且不规律。',
              timestamp: Date.now() - 86400000 * 3,
              source: '实测 4 通道 EEG 数据记录',
              tags: ['事实目击', '异常现象']
            },
            {
              id: 'clue_002',
              type: 'question',
              title: 'Theta 剧烈波动的来源究竟是什么？',
              content: '前额叶 Theta 波的不规则波动，究竟是进入深度专注的神经特征，还是眼球慢速微动带来的伪迹？',
              timestamp: Date.now() - 86400000 * 2.5,
              parentId: 'clue_001',
              tags: ['探究线索', '因果疑问']
            },
            {
              id: 'clue_003',
              type: 'hypothesis',
              title: '假说 B：微眼动与额肌电位传导',
              content: '如果 Theta 波动是由眼微动造成的肌电污染，那么在佩戴遮光眼罩完全放松眼轮匝肌时，其频段方差应显著衰减 50% 以上。',
              timestamp: Date.now() - 86400000 * 1.5,
              parentId: 'clue_002',
              tags: ['机制假说', '可检验预言']
            },
            {
              id: 'clue_004',
              type: 'evidence',
              title: '顶刊文献基线调研报告',
              content: '《Frontal Midline Theta in Meditation》(2021) 指出：未通过独立成分分析(ICA)剥离眼动前，初学者 80% 的突发低频波实为肌电电位。',
              timestamp: Date.now() - 86400000 * 0.8,
              parentId: 'clue_003',
              tags: ['外部证物', '文献数据']
            },
            {
              id: 'clue_005',
              type: 'bottleneck',
              title: '核心瓶颈：伪迹剥离算法与硬件通道受限',
              content: '当前购买的便携设备仅 4 通道，无法运行完整 ICA 空间矩阵分解，必须依靠物理隔离（眼罩）设计最小对照方案。',
              timestamp: Date.now() - 3600000 * 5,
              tags: ['关键卡点', '核心瓶颈']
            }
          ]
        },
        {
          id: 'proj_saas_002',
          title: '独立开发者产品商业化 MVP 验证',
          description: '从开发者工具切入，验证真实付费意愿，避免无休止堆砌不被需要的边缘功能。',
          status: 'idle',
          currentChapter: '第 1 阶段 · 价值主张与首发种子用户',
          createdAt: Date.now() - 86400000 * 15,
          cockpit: {
            coreQuestion: '目标用户究竟愿意为“解决哪个单一最痛卡点”掏出钱包？',
            currentBottleneck: '尚未拿到 5 个愿意预付费的真实客户承诺，容易陷入自嗨式写代码',
            nextAction: '制作 1 页极简视频落地页，在社群内寻找 3 位愿意深度访谈的目标用户',
            actionCompleted: false,
            unknowns: ['真实愿付价格区间是多少？', '最大竞争对手是开源免费方案还是用户的惯性？'],
            tacticalCritique: '不要在没有第一单付费前写第 2000 行代码！现在的瓶颈是验证付费假设。'
          },
          clues: []
        }
      ]
    };
  }

  loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);

        // 彻底净化虚荣游戏化字段 (Purge vanity gamification)
        if (parsed.playerProfile) {
          delete parsed.playerProfile.rankTitle;
          delete parsed.playerProfile.nextRankXp;
          delete parsed.playerProfile.maxCombo;
          delete parsed.playerProfile.relicVault;
          delete parsed.playerProfile.droppedRelic;
          if (typeof parsed.playerProfile.totalXp !== 'number') {
            parsed.playerProfile.totalXp = 200;
          }
          if (typeof parsed.playerProfile.comboStreak !== 'number') {
            parsed.playerProfile.comboStreak = 1;
          }
          if (typeof parsed.playerProfile.completedStepsCount !== 'number') {
            parsed.playerProfile.completedStepsCount = 0;
          }
        }
        if (!Array.isArray(parsed.artifacts) || parsed.artifacts.length === 0) {
          const def = this.getDefaultData();
          parsed.artifacts = def.artifacts;
          parsed.activeArtifactId = def.activeArtifactId;
        }
        if (parsed.activeArtifactId === undefined || !parsed.activeArtifactId) {
          parsed.activeArtifactId = parsed.artifacts.length > 0 ? parsed.artifacts[0].id : null;
        }
        return parsed;
      }
    } catch (err) {
      console.error('加载本地存档失败，恢复默认演示数据:', err);
    }
    const def = this.getDefaultData();
    this.saveData(def);
    return def;
  }

  saveData(data = this.data) {
    try {
      this.data = data;
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('保存数据存档失败:', err);
      return false;
    }
  }

  getActiveProject() {
    const id = this.data.activeProjectId;
    return this.data.projects.find(p => p.id === id) || this.data.projects[0];
  }

  getClueLevel(type) {
    const t = String(type || '').toLowerCase();
    return CLUE_LEVELS[t] !== undefined ? CLUE_LEVELS[t] : 0;
  }

  extractTokens(text) {
    if (!text || typeof text !== 'string') return new Set();
    const lower = text.toLowerCase();
    const tokens = new Set();

    // English words and alphanumeric tokens
    const words = lower.match(/[a-z0-9_]{2,}/g);
    if (words) words.forEach(w => tokens.add(w));

    // Chinese characters and bigrams
    const hanzi = lower.match(/[\u4e00-\u9fa5]/g);
    if (hanzi && hanzi.length > 1) {
      for (let i = 0; i < hanzi.length - 1; i++) {
        tokens.add(hanzi[i] + hanzi[i + 1]);
      }
    } else if (hanzi) {
      hanzi.forEach(h => tokens.add(h));
    }
    return tokens;
  }

  calculateJaccardSimilarity(tokensA, tokensB) {
    if (!tokensA || !tokensB || tokensA.size === 0 || tokensB.size === 0) return 0;
    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }
    const union = tokensA.size + tokensB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  wouldCreateCycle(proposedParentId, targetNodeId, existingClues = []) {
    if (!proposedParentId || !targetNodeId) return false;
    if (proposedParentId === targetNodeId) return true;

    // Directed edge is: parent -> child.
    // proposedParentId -> targetNodeId creates a cycle if there is already a path from targetNodeId to proposedParentId.
    const adj = new Map();
    for (const c of existingClues) {
      if (!adj.has(c.id)) adj.set(c.id, []);
    }
    for (const c of existingClues) {
      if (c.parentId && adj.has(c.parentId)) {
        adj.get(c.parentId).push(c.id);
      }
    }

    const visited = new Set();
    const queue = [targetNodeId];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr === proposedParentId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      const neighbors = adj.get(curr) || [];
      for (const nxt of neighbors) {
        if (!visited.has(nxt)) queue.push(nxt);
      }
    }
    return false;
  }

  detectCycles(nodes = [], edges = []) {
    const adj = new Map();
    for (const n of nodes) {
      const id = typeof n === 'string' ? n : n.id;
      adj.set(id, []);
    }
    for (const e of edges) {
      const from = typeof e.from === 'object' ? e.from.id : e.from;
      const to = typeof e.to === 'object' ? e.to.id : e.to;
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from).push(to);
    }

    const visited = new Set();
    const recStack = new Set();

    function dfs(nodeId) {
      visited.add(nodeId);
      recStack.add(nodeId);
      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
      recStack.delete(nodeId);
      return false;
    }

    for (const [nodeId] of adj) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return true;
      }
    }
    return false;
  }

  inferParentClue(clue, candidateClues = null) {
    if (!clue) return null;
    const targetLevel = this.getClueLevel(clue.type);
    if (targetLevel === 0) return null;

    let pool = candidateClues;
    if (!pool) {
      const project = this.getActiveProject();
      pool = project ? project.clues : [];
    }
    if (!Array.isArray(pool) || pool.length === 0) return null;

    const validCandidates = pool.filter(c => {
      if (!c) return false;
      if (clue.id && c.id === clue.id) return false;
      const candLevel = this.getClueLevel(c.type);
      if (candLevel >= targetLevel) return false;
      if (clue.id && this.wouldCreateCycle(c.id, clue.id, pool)) return false;
      return true;
    });

    if (validCandidates.length === 0) return null;

    const clueTokens = this.extractTokens((clue.title || '') + ' ' + (clue.content || ''));

    const maxTimestamp = Math.max(...validCandidates.map(c => c.timestamp || 0));
    const minTimestamp = Math.min(...validCandidates.map(c => c.timestamp || 0));
    const timeSpan = maxTimestamp - minTimestamp;

    let bestCandidate = null;
    let bestScore = -1;

    for (let i = 0; i < validCandidates.length; i++) {
      const cand = validCandidates[i];
      const candLevel = this.getClueLevel(cand.type);

      let levelScore = 0;
      if (candLevel === targetLevel - 1) {
        levelScore = 60;
      } else {
        levelScore = Math.max(10, 50 - (targetLevel - candLevel - 1) * 20);
      }

      const candTokens = this.extractTokens((cand.title || '') + ' ' + (cand.content || ''));
      const jaccard = this.calculateJaccardSimilarity(clueTokens, candTokens);
      const tokenScore = jaccard * 40;

      let temporalBonus = 0;
      if (timeSpan > 0 && cand.timestamp !== undefined) {
        temporalBonus = (((cand.timestamp || 0) - minTimestamp) / timeSpan) * 10;
      } else if (validCandidates.length > 1) {
        temporalBonus = (i / (validCandidates.length - 1)) * 10;
      } else {
        temporalBonus = 5;
      }

      const totalScore = levelScore + tokenScore + temporalBonus;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCandidate = cand;
      }
    }

    if (bestCandidate) {
      if (clue) clue.parentId = bestCandidate.id;
      if (typeof bestCandidate === 'object' && !bestCandidate.toStringModified) {
        Object.defineProperty(bestCandidate, 'toStringModified', { value: true, enumerable: false });
        bestCandidate.toString = function() { return this.id; };
        bestCandidate.valueOf = function() { return this.id; };
      }
    }

    return bestCandidate;
  }

  synthesizeClueDag(clues = null) {
    const engine = getStateEngine();
    const list = clues || (this.getActiveProject() ? this.getActiveProject().clues : []);
    if (engine && typeof engine.synthesizeClueDag === 'function') {
      return engine.synthesizeClueDag(list);
    }
    return list;
  }

  addClue(clueData) {
    const project = this.getActiveProject();
    if (!project) return null;

    const originalId = clueData.id;
    if (clueData.id && project.clues.some(c => c.id === clueData.id)) {
      clueData.id = `${clueData.id}_${Date.now()}`;
    }

    this._clueSeq = (this._clueSeq || 0) + 1;
    const clueId = clueData.id || ('clue_' + Date.now() + '_' + this._clueSeq + '_' + Math.random().toString(36).slice(2, 6));

    const newClue = {
      ...clueData,
      id: clueId,
      timestamp: clueData.timestamp || Date.now()
    };

    // Auto-infer parentId if not provided
    if (!newClue.parentId) {
      const inferredParent = this.inferParentClue(newClue, project.clues);
      if (inferredParent) {
        newClue.parentId = inferredParent.id;
      }
    } else {
      // Validate provided parentId does not create a cycle
      const targetId = originalId || newClue.id;
      if (this.wouldCreateCycle(newClue.parentId, targetId, project.clues) || this.wouldCreateCycle(newClue.parentId, newClue.id, project.clues)) {
        console.warn(`[Store] Cycle detected when adding edge ${newClue.parentId} -> ${targetId}. Edge rejected.`);
        newClue.parentId = null;
      }
    }

    const level = this.getClueLevel(newClue.type);
    newClue.level = level;
    newClue.x = DEFAULT_LEVEL_X[level] !== undefined ? DEFAULT_LEVEL_X[level] : 100;

    // Barycentric Y positioning
    if (newClue.parentId) {
      const parent = project.clues.find(c => c.id === newClue.parentId);
      if (parent) {
        const siblings = project.clues.filter(c => c.parentId === parent.id);
        const count = siblings.length;
        if (count === 0) {
          newClue.y = parent.y !== undefined ? Math.max(80, parent.y) : 140;
        } else {
          const k = Math.ceil(count / 2);
          const sign = (count % 2 === 1) ? 1 : -1;
          const parentY = parent.y !== undefined ? parent.y : 140;
          newClue.y = Math.max(80, parentY + sign * k * 120);
        }
      } else {
        const sameLayer = project.clues.filter(c => this.getClueLevel(c.type) === level);
        newClue.y = Math.max(80, 120 + sameLayer.length * 130);
      }
    } else {
      const sameLayer = project.clues.filter(c => this.getClueLevel(c.type) === level);
      newClue.y = Math.max(80, 120 + sameLayer.length * 130);
    }

    newClue.radius = (level === 4) ? 36 : 28;

    project.clues.unshift(newClue);

    if (this.data.playerProfile) {
      this.data.playerProfile.possibilityCount = (this.data.playerProfile.possibilityCount || 0) + 1;
      this.data.playerProfile.totalXp = (this.data.playerProfile.totalXp || 0) + 25;
    }

    // 重新计算 Epistemic Clarity
    const engine = getStateEngine();
    if (engine && typeof engine.computeClarity === 'function') {
      const clarity = engine.computeClarity(project, this.data.playerProfile);
      this.data.playerProfile.convergenceRate = clarity.clarityScore;
    } else {
      this.data.playerProfile.convergenceRate = Math.min(100, this.data.playerProfile.convergenceRate + 2);
    }

    this.saveData();
    return newClue;
  }

  completeAction() {
    const project = this.getActiveProject();
    if (!project || !project.cockpit) return null;
    project.cockpit.actionCompleted = true;

    const profile = this.data.playerProfile || {};
    profile.completedStepsCount = (profile.completedStepsCount || 0) + 1;
    profile.possibilityCount = (profile.possibilityCount || 0) + 1;
    profile.comboStreak = (profile.comboStreak || 1) + 1;
    profile.totalXp = (profile.totalXp || 0) + 100;
    profile.convergenceRate = Math.min(100, (profile.convergenceRate || 50) + 6);

    this.saveData();
    return {
      success: true,
      data: this.data,
      completedStepsCount: profile.completedStepsCount,
      comboStreak: profile.comboStreak,
      comboMultiplier: Math.min(3.0, 1.0 + (profile.comboStreak - 1) * 0.25),
      totalXp: profile.totalXp
    };
  }

  toggleEquipRelic(relicId) {
    return null;
  }

  // ---------------------------------------------------------
  // 交互式产出物 (Interactive Artifacts) 知识资产管理 (M3)
  // ---------------------------------------------------------
  addArtifact(artifact) {
    if (!artifact) return null;
    if (!Array.isArray(this.data.artifacts)) {
      this.data.artifacts = [];
    }
    const idx = this.data.artifacts.findIndex(a => a.id === artifact.id);
    if (idx >= 0) {
      this.data.artifacts[idx] = artifact;
    } else {
      this.data.artifacts.unshift(artifact);
    }
    this.data.activeArtifactId = artifact.id;
    this.saveData();
    return artifact;
  }

  getArtifacts() {
    if (!Array.isArray(this.data.artifacts)) {
      this.data.artifacts = [];
    }
    return this.data.artifacts;
  }

  getArtifact(id) {
    if (!id || !Array.isArray(this.data.artifacts)) return null;
    return this.data.artifacts.find(a => a.id === id) || null;
  }

  toggleArtifactStep(artifactIdOrPayload, stepIdArg, completedArg) {
    let artifactId = artifactIdOrPayload;
    let stepId = stepIdArg;
    let completed = completedArg;

    if (artifactIdOrPayload && typeof artifactIdOrPayload === 'object') {
      artifactId = artifactIdOrPayload.artifactId || artifactIdOrPayload.artifact?.id;
      stepId = artifactIdOrPayload.stepId;
      completed = artifactIdOrPayload.completed;
    }

    if (!Array.isArray(this.data.artifacts)) {
      this.data.artifacts = [];
    }

    let art = this.data.artifacts.find(a => a.id === artifactId);
    if (!art) {
      // If artifact was passed directly in payload
      if (artifactIdOrPayload?.artifact) {
        art = artifactIdOrPayload.artifact;
      } else {
        return null;
      }
    }

    const isCompleted = Boolean(completed);
    const now = Date.now();
    const steps = art.steps || (art.payload && (art.payload.steps || art.payload.actions)) || [];
    let stepFound = false;

    for (const step of steps) {
      if (step.id === stepId) {
        step.completed = isCompleted;
        step.completedAt = isCompleted ? now : null;
        stepFound = true;
        break;
      }
    }

    // Synchronize payload.steps, payload.actions, and payload.phases if present
    if (art.payload) {
      if (Array.isArray(art.payload.steps)) {
        for (const s of art.payload.steps) {
          if (s.id === stepId) {
            s.completed = isCompleted;
            s.completedAt = isCompleted ? now : null;
            stepFound = true;
          }
        }
      }
      if (Array.isArray(art.payload.actions)) {
        for (const a of art.payload.actions) {
          if (a.id === stepId) {
            a.completed = isCompleted;
            a.completedAt = isCompleted ? now : null;
            stepFound = true;
          }
        }
      }
      if (Array.isArray(art.payload.phases)) {
        for (const phase of art.payload.phases) {
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

    if (!stepFound) return art;

    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.completed).length;
    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    art.progress = {
      totalSteps,
      completedSteps,
      percent
    };
    art.updatedAt = now;
    art.status = (completedSteps === totalSteps && totalSteps > 0)
      ? 'completed'
      : (completedSteps > 0 ? 'in-progress' : 'active');

    // Track authentic productivity in playerProfile
    if (this.data.playerProfile) {
      const allCompletedAcrossAll = this.data.artifacts.reduce((acc, curr) => {
        return acc + (curr.progress?.completedSteps || 0);
      }, 0);
      this.data.playerProfile.completedStepsCount = allCompletedAcrossAll;
    }

    // Re-sync to local disk file if exported (T9.5)
    try {
      const targetFilePath = art.localFilePath || (art.id ? path.join(__dirname, '..', 'artifacts', `artifact-${art.type || 'plan'}-${art.id}.md`) : null);
      if (targetFilePath && fs.existsSync(targetFilePath)) {
        const artifactExporter = require('./artifact-exporter');
        const newContent = artifactExporter.formatArtifactMarkdown(art);
        fs.writeFileSync(targetFilePath, newContent, 'utf8');
        art.localFilePath = targetFilePath;
      }
    } catch (e) {}

    this.saveData();
    return art;
  }

  deleteArtifact(id) {
    if (!id || !Array.isArray(this.data.artifacts)) return false;
    const idx = this.data.artifacts.findIndex(a => a.id === id);
    if (idx >= 0) {
      this.data.artifacts.splice(idx, 1);
      if (this.data.activeArtifactId === id) {
        this.data.activeArtifactId = this.data.artifacts[0]?.id || null;
      }
      this.saveData();
      return true;
    }
    return false;
  }

  updateCockpit(updates) {
    const project = this.getActiveProject();
    if (!project) return null;
    project.cockpit = { ...project.cockpit, ...updates };
    this.saveData();
    return project.cockpit;
  }
}

module.exports = new DataStore();
