// utils/format.js

/**
 * 认知类型元信息字典
 */
const COGNITIVE_TYPES = {
  observation: {
    key: 'observation',
    label: '观察',
    icon: '👁️',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    desc: '感知到的现象、异常、事实或数据'
  },
  question: {
    key: 'question',
    label: '疑问',
    icon: '❓',
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.15)',
    borderColor: 'rgba(192, 132, 252, 0.4)',
    desc: '从现象中提炼出的探究问题'
  },
  hypothesis: {
    key: 'hypothesis',
    label: '假设',
    icon: '💡',
    color: '#facc15',
    bgColor: 'rgba(250, 204, 21, 0.15)',
    borderColor: 'rgba(250, 204, 21, 0.4)',
    desc: '可能的因果解释、机制推测或模型预言'
  },
  evidence: {
    key: 'evidence',
    label: '证据',
    icon: '🔬',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
    desc: '实验结果、文献数据、用户反馈或现实阻力'
  },
  bottleneck: {
    key: 'bottleneck',
    label: '瓶颈',
    icon: '🚧',
    color: '#fb7185',
    bgColor: 'rgba(251, 113, 133, 0.15)',
    borderColor: 'rgba(251, 113, 133, 0.4)',
    desc: '当前限制进展的单一最关键障碍'
  }
};

/**
 * 友好时间格式化
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // 秒

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 86400 * 3) return `${Math.floor(diff / 86400)}天前`;

  const date = new Date(timestamp);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${m}-${d} ${h}:${min}`;
}

/**
 * 生成简易唯一 ID
 */
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

module.exports = {
  COGNITIVE_TYPES,
  formatTime,
  generateId
};
