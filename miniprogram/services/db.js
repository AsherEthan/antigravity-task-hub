// services/db.js
const { INITIAL_PROJECT, INITIAL_COCKPIT, INITIAL_STREAM_ITEMS } = require('../utils/mock-data');
const { generateId } = require('../utils/format');

const STORAGE_KEYS = {
  PROJECTS: 'EXPLORATION_PROJECTS_V1',
  COCKPITS: 'EXPLORATION_COCKPITS_V1',
  STREAM_ITEMS: 'EXPLORATION_ITEMS_V1'
};

/**
 * 统一数据访问服务层 (支持 CloudBase 与 LocalStorage 透明降级)
 */
class DbService {
  constructor() {
    this.initLocalStorageIfEmpty();
  }

  /**
   * 判断当前是否可使用微信云数据库
   */
  canUseCloud() {
    const app = getApp();
    return !!(app && app.globalData && app.globalData.isCloudAvailable && app.globalData.settings.useCloudBackend);
  }

  /**
   * 首次启动若无数据，自动灌入 EEG 冥想探索示例数据
   */
  initLocalStorageIfEmpty() {
    try {
      const projects = wx.getStorageSync(STORAGE_KEYS.PROJECTS);
      if (!projects || projects.length === 0) {
        wx.setStorageSync(STORAGE_KEYS.PROJECTS, [INITIAL_PROJECT]);
        wx.setStorageSync(STORAGE_KEYS.COCKPITS, { [INITIAL_PROJECT._id]: INITIAL_COCKPIT });
        wx.setStorageSync(STORAGE_KEYS.STREAM_ITEMS, INITIAL_STREAM_ITEMS);
        console.log('🌱 已初始化本地演示探索数据');
      }
    } catch (e) {
      console.error('初始化本地数据失败:', e);
    }
  }

  // ====================== 项目相关接口 ======================

  async getProjects() {
    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('projects').orderBy('created_at', 'desc').get();
        if (res.data && res.data.length > 0) {
          return res.data;
        }
      } catch (e) {
        console.warn('云数据库读取项目失败，自动降级至本地缓存', e);
      }
    }

    const projects = wx.getStorageSync(STORAGE_KEYS.PROJECTS) || [];
    return projects.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }

  async getProject(projectId) {
    const projects = await this.getProjects();
    return projects.find(p => p._id === projectId) || null;
  }

  async createProject({ title, description }) {
    const newProj = {
      _id: generateId('proj'),
      title: title.trim(),
      description: (description || '').trim(),
      status: 'active',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        await db.collection('projects').add({ data: newProj });
      } catch (e) {
        console.warn('云数据库创建项目失败，写入本地', e);
      }
    }

    const projects = wx.getStorageSync(STORAGE_KEYS.PROJECTS) || [];
    projects.unshift(newProj);
    wx.setStorageSync(STORAGE_KEYS.PROJECTS, projects);

    // 顺带初始化该项目的空白舵盘
    const emptyCockpit = {
      project_id: newProj._id,
      core_question: `围绕「${newProj.title}」的最核心疑问是什么？`,
      unknowns: [],
      current_bottleneck: '尚未定位瓶颈',
      next_action: '记录第 1 个有价值的观察或疑问',
      working_model: '',
      last_synced_at: Date.now()
    };
    await this.saveCockpit(newProj._id, emptyCockpit);

    return newProj;
  }

  // ====================== 认知状态舵盘接口 ======================

  async getCockpit(projectId) {
    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('cockpits').where({ project_id: projectId }).get();
        if (res.data && res.data.length > 0) {
          return res.data[0];
        }
      } catch (e) {
        console.warn('云数据库读取舵盘失败，降级本地', e);
      }
    }

    const cockpitsMap = wx.getStorageSync(STORAGE_KEYS.COCKPITS) || {};
    return cockpitsMap[projectId] || null;
  }

  async saveCockpit(projectId, cockpitData) {
    const payload = {
      ...cockpitData,
      project_id: projectId,
      last_synced_at: Date.now()
    };

    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        const existing = await db.collection('cockpits').where({ project_id: projectId }).get();
        if (existing.data && existing.data.length > 0) {
          await db.collection('cockpits').doc(existing.data[0]._id).update({ data: payload });
        } else {
          await db.collection('cockpits').add({ data: payload });
        }
      } catch (e) {
        console.warn('云端保存舵盘失败，保存至本地', e);
      }
    }

    const cockpitsMap = wx.getStorageSync(STORAGE_KEYS.COCKPITS) || {};
    cockpitsMap[projectId] = payload;
    wx.setStorageSync(STORAGE_KEYS.COCKPITS, cockpitsMap);

    return payload;
  }

  // ====================== 探索流条目接口 ======================

  async getStreamItems(projectId) {
    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('stream_items')
          .where({ project_id: projectId })
          .orderBy('created_at', 'desc')
          .get();
        if (res.data && res.data.length > 0) {
          return res.data;
        }
      } catch (e) {
        console.warn('云端读取探索流失败，降级本地', e);
      }
    }

    const allItems = wx.getStorageSync(STORAGE_KEYS.STREAM_ITEMS) || [];
    const projectItems = allItems.filter(item => item.project_id === projectId);
    return projectItems.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }

  async addStreamItem({ projectId, type, content, created_from = null, ai_insights = [] }) {
    const newItem = {
      _id: generateId('item'),
      project_id: projectId,
      type,
      content: content.trim(),
      created_from,
      ai_insights,
      created_at: Date.now()
    };

    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        await db.collection('stream_items').add({ data: newItem });
      } catch (e) {
        console.warn('云端新增条目失败，写入本地', e);
      }
    }

    const allItems = wx.getStorageSync(STORAGE_KEYS.STREAM_ITEMS) || [];
    allItems.unshift(newItem);
    wx.setStorageSync(STORAGE_KEYS.STREAM_ITEMS, allItems);

    return newItem;
  }

  async updateStreamItem(itemId, updates) {
    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        await db.collection('stream_items').doc(itemId).update({ data: updates });
      } catch (e) {
        console.warn('云端更新条目失败，更新本地', e);
      }
    }

    const allItems = wx.getStorageSync(STORAGE_KEYS.STREAM_ITEMS) || [];
    const index = allItems.findIndex(i => i._id === itemId);
    if (index !== -1) {
      allItems[index] = { ...allItems[index], ...updates };
      wx.setStorageSync(STORAGE_KEYS.STREAM_ITEMS, allItems);
      return allItems[index];
    }
    return null;
  }

  async deleteStreamItem(itemId) {
    if (this.canUseCloud()) {
      try {
        const db = wx.cloud.database();
        await db.collection('stream_items').doc(itemId).remove();
      } catch (e) {
        console.warn('云端删除条目失败', e);
      }
    }

    let allItems = wx.getStorageSync(STORAGE_KEYS.STREAM_ITEMS) || [];
    allItems = allItems.filter(i => i._id !== itemId);
    wx.setStorageSync(STORAGE_KEYS.STREAM_ITEMS, allItems);
    return true;
  }
}

const dbService = new DbService();
module.exports = dbService;
