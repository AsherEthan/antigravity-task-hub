// pages/projects/projects.js
const db = require('../../services/db');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    projects: [],
    activeProjectId: '',
    isModalOpen: false,
    newTitle: '',
    newDesc: ''
  },

  onShow: function () {
    this.loadProjects();
  },

  async loadProjects() {
    try {
      const app = getApp();
      const activeId = app.globalData.activeProjectId || '';
      const list = await db.getProjects();

      const formatted = list.map(p => ({
        ...p,
        formatTime: formatTime(p.created_at)
      }));

      this.setData({
        projects: formatted,
        activeProjectId: activeId
      });
    } catch (e) {
      console.error('加载项目列表失败:', e);
    }
  },

  selectProject(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    app.globalData.activeProjectId = id;
    this.setData({ activeProjectId: id });

    wx.showToast({
      title: '已切换探索空间',
      icon: 'success',
      duration: 1000
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 600);
  },

  openCreateModal() {
    this.setData({
      isModalOpen: true,
      newTitle: '',
      newDesc: ''
    });
  },

  closeCreateModal() {
    this.setData({ isModalOpen: false });
  },

  preventBubble() {},

  onTitleInput(e) {
    this.setData({ newTitle: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ newDesc: e.detail.value });
  },

  async submitCreateProject() {
    const title = this.data.newTitle.trim();
    if (!title) return;

    try {
      wx.showLoading({ title: '创建空间中...' });
      const newProj = await db.createProject({
        title,
        description: this.data.newDesc
      });

      const app = getApp();
      app.globalData.activeProjectId = newProj._id;

      this.closeCreateModal();
      wx.hideLoading();

      wx.showToast({
        title: '探索空间已创建 🚀',
        icon: 'success',
        duration: 1200
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 700);
    } catch (e) {
      wx.hideLoading();
      console.error('创建项目失败:', e);
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
  }
});
