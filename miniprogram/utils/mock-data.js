// utils/mock-data.js

const INITIAL_PROJECT = {
  _id: 'proj_eeg_meditation_001',
  title: 'EEG 脑电 × 冥想状态研究',
  description: '探索人在冥想过程中是否存在可重复、可测量的客观脑电特征，厘清伪迹与生理机制。',
  status: 'active',
  created_at: Date.now() - 86400000 * 3,
  updated_at: Date.now()
};

const INITIAL_COCKPIT = {
  project_id: 'proj_eeg_meditation_001',
  core_question: '到底如何操作性定义与测量“冥想状态”，区分真实神经信号与头皮肌电伪迹？',
  unknowns: [
    '不同流派冥想（正念观呼吸 vs 慈悲冥想）的脑波功率谱是否存在统一基线？',
    '额叶 Theta 波与前额微肌肉紧张（肌电污染）的耦合程度有多高？'
  ],
  current_bottleneck: '“冥想状态”的操作性定义不明确，缺乏客观连续的时间序列黄金标签。',
  next_action: '梳理 5 篇顶刊中关于冥想状态标记的方法，设计最小 2 人对照的眼罩/防眼动对照采集实验。',
  working_model: '刺激/练习 -> 认知负荷降低 -> 额叶 Theta/Alpha 功率比上升 (受肌电扰动影响)',
  last_synced_at: Date.now() - 3600000 * 2
};

const INITIAL_STREAM_ITEMS = [
  {
    _id: 'item_001',
    project_id: 'proj_eeg_meditation_001',
    type: 'observation',
    content: '测试发现在闭眼静息 4 分钟后，受试者后枕部 Alpha 波功率上升，但前额叶 Theta 波波动非常剧烈且不规律。',
    created_at: Date.now() - 86400000 * 2,
    ai_insights: [
      {
        lens: 'socratic',
        content: '【穿透追问】：前额叶剧烈波动可能隐藏了未被检验的假设。你是否默认了“前额叶波动 = 大脑深层认知变化”？在未排除眼轮匝肌和额肌微颤前，该现象无法直接作为冥想深度的证据。',
        items: ['是否存在眼球微颤干扰？', '受试者呼吸频率是否在此刻发生改变？'],
        created_at: Date.now() - 86400000 * 2 + 1000
      }
    ]
  },
  {
    _id: 'item_002',
    project_id: 'proj_eeg_meditation_001',
    type: 'question',
    content: '前额叶 Theta 波的不规则波动，究竟是进入深度冥想的特征，还是眼球微动/肌肉紧张带来的伪迹？',
    created_at: Date.now() - 86400000 * 1.8,
    created_from: 'item_001',
    ai_insights: [
      {
        lens: 'hypotheses',
        content: '【发散假设】：针对此问题可建立 3 个竞争性解释：',
        items: [
          '假设 A (神经机制)：Theta 爆发反映默认网络(DMN)抑制，伴随呼吸减慢',
          '假设 B (肌电伪迹)：额叶电极拾取了眼球慢速微漂移或眼睑颤动产生的低频电位',
          '假设 C (注意冲突)：受试者在“试图努力冥想”时产生了额叶认知负荷'
        ],
        created_at: Date.now() - 86400000 * 1.8 + 2000
      }
    ]
  },
  {
    _id: 'item_003',
    project_id: 'proj_eeg_meditation_001',
    type: 'hypothesis',
    content: '如果 Theta 波是由眼微动造成的肌电污染，那么在佩戴眼罩且眼球完全放松时，Theta 功率的方差应该显著下降。',
    created_at: Date.now() - 86400000 * 1.2,
    created_from: 'item_002',
    ai_insights: [
      {
        lens: 'test',
        content: '【最小实验方案】：无需购买眼电仪，只需做 A/B 对照：让同一受试者分别进行 3 分钟常规闭眼冥想 vs 3 分钟佩戴遮光眼罩并有意识放松眼轮匝肌，比较 4-8Hz 频段能量方差。耗时 15 分钟，信息增益极高。',
        items: ['执行眼罩 A/B 对照测试 15 分钟'],
        created_at: Date.now() - 86400000 * 1.2 + 3000
      }
    ]
  },
  {
    _id: 'item_004',
    project_id: 'proj_eeg_meditation_001',
    type: 'evidence',
    content: '查阅文献《Frontal Midline Theta Dynamics in Meditation》(2021)：发现当使用独立独立成分分析(ICA)剥离眼动后，纯神经源性 Theta 波仅在冥想熟练者中微弱稳定出现，初学者 80% 的突发低频实为肌电。',
    created_at: Date.now() - 86400000 * 0.8
  },
  {
    _id: 'item_005',
    project_id: 'proj_eeg_meditation_001',
    type: 'bottleneck',
    content: '当前最大瓶颈：现有消费级脑电仪只有 4 个通道，无法跑完整的 ICA 伪迹剥离算法，且受试者对“冥想状态”的主观报告缺乏客观对照。',
    created_at: Date.now() - 3600000 * 4
  }
];

module.exports = {
  INITIAL_PROJECT,
  INITIAL_COCKPIT,
  INITIAL_STREAM_ITEMS
};
