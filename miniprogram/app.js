// app.js
App({
  globalData: {
    isCloudAvailable: false,
    cloudEnvId: '',
    activeProjectId: null,
    settings: {
      userApiKey: '',
      customBaseUrl: '',
      model: 'deepseek-chat',
      useCloudBackend: true
    }
  },

  onLaunch: function () {
    this.initCloud();
    this.loadSettings();
  },

  /**
   * 初始化微信云开发环境（具备优雅降级）
   */
  initCloud: function () {
    if (!wx.cloud) {
      console.warn('请使用 2.2.3 或以上的基础库以使用云能力');
      this.globalData.isCloudAvailable = false;
      return;
    }

    try {
      wx.cloud.init({
        env: '', // 留空则默认使用当前环境；可在云开发控制台获取环境ID后在此填入
        traceUser: true
      });
      this.globalData.isCloudAvailable = true;
      console.log('✅ 微信云开发环境已就绪');
    } catch (e) {
      console.warn('⚠️ 微信云开发初始化受限，自动启用 LocalStorage 本地降级自测模式', e);
      this.globalData.isCloudAvailable = false;
    }
  },

  /**
   * 从本地缓存加载用户设置
   */
  loadSettings: function () {
    try {
      const saved = wx.getStorageSync('EXPLORATION_USER_SETTINGS');
      if (saved) {
        this.globalData.settings = Object.assign(this.globalData.settings, saved);
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  /**
   * 保存设置
   */
  saveSettings: function (newSettings) {
    this.globalData.settings = Object.assign(this.globalData.settings, newSettings);
    try {
      wx.setStorageSync('EXPLORATION_USER_SETTINGS', this.globalData.settings);
    } catch (e) {
      console.error('保存设置失败:', e);
    }
  }
});
