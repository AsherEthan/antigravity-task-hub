// pages/index/index.js
const db = require('../../services/db');
const ai = require('../../services/ai');

Page({
  data: {
    activeProject: null,
    currentCockpit: null,
    streamItems: [],
    filteredItems: [],
    activeFilter: 'all',
    isRefreshing: false,
    isCockpitSyncing: false,

    // 弹窗状态
    dialogVisible: false,
    dialogMode: 'cockpit', // 'cockpit' | 'lens'
    isDialogLoading: false,
    dialogTitle: '认知透镜见解',
    dialogCockpitProposal: null,
    dialogLensResult: null,
    targetItemForLens: null
  },

  onLoad: function () {
    this.initPageData();
  },

  onShow: function () {
    const app = getApp();
    const globalActiveId = app.globalData.activeProjectId;
    if (globalActiveId && (!this.data.activeProject || this.data.activeProject._id !== globalActiveId)) {
      this.loadProjectById(globalActiveId);
    } else if (this.data.activeProject) {
      // 保持当前数据刷新
      this.refreshCurrentData();
    }
  },

  /**
   * 初始化页面数据
   */
  async initPageData() {
    try {
      const projects = await db.getProjects();
      if (projects && projects.length > 0) {
        const app = getApp();
        const activeId = app.globalData.activeProjectId || projects[0]._id;
        app.globalData.activeProjectId = activeId;
        await this.loadProjectById(activeId);
      }
    } catch (e) {
      console.error('初始化数据失败:', e);
    }
  },

  /**
   * 加载指定项目的数据
   */
  async loadProjectById(projectId) {
    wx.showLoading({ title: '加载探索状态...', mask: false });
    try {
      const project = await db.getProject(projectId);
      const cockpit = await db.getCockpit(projectId);
      const items = await db.getStreamItems(projectId);

      this.setData({
        activeProject: project,
        currentCockpit: cockpit,
        streamItems: items
      }, () => {
        this.applyFilter();
      });
    } catch (e) {
      console.error('加载项目详情失败:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 刷新当前项目数据
   */
  async refreshCurrentData() {
    if (!this.data.activeProject) return;
    const projectId = this.data.activeProject._id;
    try {
      const cockpit = await db.getCockpit(projectId);
      const items = await db.getStreamItems(projectId);
      this.setData({
        currentCockpit: cockpit,
        streamItems: items
      }, () => {
        this.applyFilter();
      });
    } catch (e) {
      console.error('刷新数据失败:', e);
    }
  },

  /**
   * 下拉刷新
   */
  async onPullRefresh() {
    this.setData({ isRefreshing: true });
    await this.refreshCurrentData();
    this.setData({ isRefreshing: false });
  },

  /**
   * 切换过滤分类
   */
  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter }, () => {
      this.applyFilter();
    });
  },

  /**
   * 应用分类过滤
   */
  applyFilter() {
    const filter = this.data.activeFilter;
    const items = this.data.streamItems;
    if (filter === 'all') {
      this.setData({ filteredItems: items });
    } else {
      this.setData({
        filteredItems: items.filter(item => item.type === filter)
      });
    }
  },

  /**
   * 底部快捷输入提交
   */
  async onQuickInputSubmit(e) {
    const { type, content } = e.detail;
    if (!this.data.activeProject) return;

    try {
      const newItem = await db.addStreamItem({
        projectId: this.data.activeProject._id,
        type,
        content
      });

      const updated = [newItem, ...this.data.streamItems];
      this.setData({
        streamItems: updated
      }, () => {
        this.applyFilter();
      });

      wx.showToast({
        title: '已沉淀到流水',
        icon: 'success',
        duration: 1200
      });
    } catch (e) {
      console.error('新增流水失败:', e);
      wx.showToast({ title: '记录失败', icon: 'none' });
    }
  },

  /**
   * 触发单条记录的 AI 认知透镜
   */
  async onItemTriggerLens(e) {
    const { lensType, item } = e.detail;
    const lensTitles = {
      socratic: '🔍 穿透追问分析',
      hypotheses: '💡 竞争性假设发散',
      test: '⚡ 最小实验验证设计',
      attribution: '🎯 失败层级归因排查'
    };

    this.setData({
      dialogVisible: true,
      dialogMode: 'lens',
      isDialogLoading: true,
      dialogTitle: lensTitles[lensType] || '认知透镜见解',
      dialogLensResult: null,
      targetItemForLens: item
    });

    try {
      const result = await ai.runLens({
        lensType,
        item,
        projectTitle: this.data.activeProject.title,
        currentCockpit: this.data.currentCockpit
      });

      this.setData({
        isDialogLoading: false,
        dialogLensResult: result
      });
    } catch (err) {
      console.error('执行透镜分析失败:', err);
      this.setData({
        isDialogLoading: false,
        dialogVisible: false
      });
      wx.showToast({ title: '分析异常，请稍后重试', icon: 'none' });
    }
  },

  /**
   * 将透镜分析挂载回原卡片
   */
  async onDialogMountLens(e) {
    const { result } = e.detail;
    const targetItem = this.data.targetItemForLens;
    if (!targetItem || !result) return;

    const existingInsights = targetItem.ai_insights || [];
    const updatedInsights = [result, ...existingInsights];

    try {
      await db.updateStreamItem(targetItem._id, {
        ai_insights: updatedInsights
      });

      // 更新页面视图
      const items = this.data.streamItems.map(item => {
        if (item._id === targetItem._id) {
          return { ...item, ai_insights: updatedInsights };
        }
        return item;
      });

      this.setData({
        streamItems: items,
        dialogVisible: false
      }, () => {
        this.applyFilter();
      });

      wx.showToast({ title: '已挂载到卡片 ✨', icon: 'success' });
    } catch (e) {
      console.error('挂载失败:', e);
      wx.showToast({ title: '挂载失败', icon: 'none' });
    }
  },

  /**
   * 从 AI 见解中一键衍生沉淀为新流条目 (Spin-off)
   */
  async onItemSpinOff(e) {
    const { content, type, parentId } = e.detail;
    if (!this.data.activeProject) return;

    try {
      const newItem = await db.addStreamItem({
        projectId: this.data.activeProject._id,
        type,
        content,
        created_from: parentId
      });

      const updated = [newItem, ...this.data.streamItems];
      this.setData({
        streamItems: updated
      }, () => {
        this.applyFilter();
      });

      wx.showToast({
        title: '已衍生为新节点 🚀',
        icon: 'success',
        duration: 1500
      });
    } catch (e) {
      console.error('衍生新节点失败:', e);
      wx.showToast({ title: '沉淀失败', icon: 'none' });
    }
  },

  /**
   * 删除探索条目
   */
  async onItemDelete(e) {
    const { itemId } = e.detail;
    try {
      await db.deleteStreamItem(itemId);
      const updated = this.data.streamItems.filter(item => item._id !== itemId);
      this.setData({
        streamItems: updated
      }, () => {
        this.applyFilter();
      });
      wx.showToast({ title: '已删除', icon: 'none' });
    } catch (e) {
      console.error('删除失败:', e);
    }
  },

  /**
   * 触发认知状态舵盘 AI 提炼同步
   */
  async onCockpitSync() {
    if (!this.data.activeProject) return;

    this.setData({
      dialogVisible: true,
      dialogMode: 'cockpit',
      isDialogLoading: true,
      isCockpitSyncing: true,
      dialogCockpitProposal: null
    });

    try {
      const recentItems = this.data.streamItems.slice(0, 10);
      const proposal = await ai.syncCockpitState({
        projectTitle: this.data.activeProject.title,
        currentCockpit: this.data.currentCockpit,
        recentItems
      });

      this.setData({
        isDialogLoading: false,
        isCockpitSyncing: false,
        dialogCockpitProposal: proposal
      });
    } catch (e) {
      console.error('舵盘同步失败:', e);
      this.setData({
        dialogVisible: false,
        isDialogLoading: false,
        isCockpitSyncing: false
      });
      wx.showToast({ title: '提炼状态失败', icon: 'none' });
    }
  },

  /**
   * 确认并应用状态舵盘提炼更新
   */
  async onDialogConfirmCockpit(e) {
    const { proposal } = e.detail;
    if (!proposal || !this.data.activeProject) return;

    try {
      const savedCockpit = await db.saveCockpit(this.data.activeProject._id, proposal);
      this.setData({
        currentCockpit: savedCockpit,
        dialogVisible: false
      });

      wx.showToast({
        title: '状态舵盘已更新 ⚡',
        icon: 'success',
        duration: 1500
      });
    } catch (e) {
      console.error('保存舵盘失败:', e);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /**
   * 手动编辑状态舵盘
   */
  onCockpitManualEdit() {
    const current = this.data.currentCockpit || {};
    this.setData({
      dialogVisible: true,
      dialogMode: 'cockpit',
      isDialogLoading: false,
      dialogCockpitProposal: {
        core_question: current.core_question || '',
        unknowns: current.unknowns || [],
        current_bottleneck: current.current_bottleneck || '',
        next_action: current.next_action || '',
        progress_critique: '当前为手动修正模式。编辑完毕后点击确认即可更新舵盘。'
      }
    });
  },

  /**
   * 关闭弹窗
   */
  onDialogClose() {
    this.setData({
      dialogVisible: false,
      isCockpitSyncing: false
    });
  },

  /**
   * 路由跳转
   */
  goToProjects() {
    wx.navigateTo({
      url: '/pages/projects/projects'
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
});
