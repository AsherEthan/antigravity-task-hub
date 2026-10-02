// pages/settings/settings.js
const { INITIAL_PROJECT, INITIAL_COCKPIT, INITIAL_STREAM_ITEMS } = require('../../utils/mock-data');

Page({
  data: {
    isCloudConnected: false,
    userApiKey: '',
    customBaseUrl: '',
    model: 'deepseek-chat',
    showKey: false
  },

  onLoad: function () {
    const app = getApp();
    const settings = (app && app.globalData && app.globalData.settings) || {};
    const isCloud = !!(app && app.globalData && app.globalData.isCloudAvailable);

    this.setData({
      isCloudConnected: isCloud,
      userApiKey: settings.userApiKey || '',
      customBaseUrl: settings.customBaseUrl || '',
      model: settings.model || 'deepseek-chat'
    });
  },

  toggleKeyVisibility() {
    this.setData({ showKey: !this.data.showKey });
  },

  onApiKeyInput(e) {
    this.setData({ userApiKey: e.detail.value });
  },

  onBaseUrlInput(e) {
    this.setData({ customBaseUrl: e.detail.value });
  },

  onModelInput(e) {
    this.setData({ model: e.detail.value });
  },

  saveLlmSettings() {
    const app = getApp();
    const newSettings = {
      userApiKey: this.data.userApiKey.trim(),
      customBaseUrl: this.data.customBaseUrl.trim(),
      model: this.data.model.trim() || 'deepseek-chat'
    };

    app.saveSettings(newSettings);

    wx.showToast({
      title: '模型配置已保存 💾',
      icon: 'success',
      duration: 1500
    });
  },

  resetToDemoData() {
    wx.showModal({
      title: '确认重置',
      content: '是否重置为初始「EEG 脑电 × 冥想状态研究」演示数据？',
      confirmColor: '#38bdf8',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.setStorageSync('EXPLORATION_PROJECTS_V1', [INITIAL_PROJECT]);
            wx.setStorageSync('EXPLORATION_COCKPITS_V1', { [INITIAL_PROJECT._id]: INITIAL_COCKPIT });
            wx.setStorageSync('EXPLORATION_ITEMS_V1', INITIAL_STREAM_ITEMS);

            const app = getApp();
            app.globalData.activeProjectId = INITIAL_PROJECT._id;

            wx.showToast({
              title: '已重置为官方示例',
              icon: 'success'
            });
          } catch (e) {
            console.error('重置失败:', e);
            wx.showToast({ title: '重置失败', icon: 'none' });
          }
        }
      }
    });
  },

  clearAllLocalData() {
    wx.showModal({
      title: '高危操作',
      content: '确定要清空本地全部探索空间与流记录吗？此操作无法撤销。',
      confirmColor: '#fb7185',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('EXPLORATION_PROJECTS_V1');
            wx.removeStorageSync('EXPLORATION_COCKPITS_V1');
            wx.removeStorageSync('EXPLORATION_ITEMS_V1');

            const app = getApp();
            app.globalData.activeProjectId = null;

            wx.showToast({
              title: '已清空本地数据',
              icon: 'success'
            });
          } catch (e) {
            console.error('清空失败:', e);
          }
        }
      }
    });
  }
});
