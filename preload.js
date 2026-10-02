// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 1. Antigravity Docked Attached Sidebar API
contextBridge.exposeInMainWorld('sidebarAPI', {
  // 视窗控制与几何
  toggleSidebar: () => ipcRenderer.send('toggle-sidebar'),
  hideSidebar: () => ipcRenderer.send('hide-sidebar'),
  getBounds: () => ipcRenderer.invoke('get-sidebar-bounds'),
  setPinState: (pinned) => ipcRenderer.invoke('set-pin-state', pinned),

  // 剪贴板与现场上下文捕获
  readClipboardContext: () => ipcRenderer.invoke('read-clipboard-context'),
  detectClipboardException: () => ipcRenderer.invoke('detect-clipboard-exception'),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  injectContext: (ctx) => ipcRenderer.invoke('inject-context', ctx),
  parseContextMentions: (rawPrompt) => ipcRenderer.invoke('parse-context-mentions', rawPrompt),
  buildContextEnvelope: (payload) => ipcRenderer.invoke('build-context-envelope', payload),

  // Slash 指令与认知引擎
  executeSlashCommand: (payload) => ipcRenderer.invoke('execute-slash-command', payload),

  // 交互式产出物 (Artifacts) 操作
  toggleArtifactStep: (payload) => ipcRenderer.invoke('toggle-artifact-step', payload),
  updateArtifactStep: (payload) => ipcRenderer.invoke('update-artifact-step', payload),
  copyArtifactMarkdown: (payload) => ipcRenderer.invoke('copy-artifact-markdown', payload),
  exportArtifactFile: (payload) => ipcRenderer.invoke('export-artifact-file', payload),
  exportArtifactMarkdown: (payload) => ipcRenderer.invoke('export-artifact-markdown', payload),
  locateArtifact: (payload) => ipcRenderer.invoke('locate-artifact', payload),
  openArtifact: (payload) => ipcRenderer.invoke('open-artifact', payload),
  showItemInFolder: (targetPath) => ipcRenderer.invoke('show-item-in-folder', targetPath),
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  getArtifacts: () => ipcRenderer.invoke('get-artifacts'),
  saveArtifact: (artifact) => ipcRenderer.invoke('save-artifact', artifact),
  toggleWarRoom: () => ipcRenderer.send('toggle-war-room'),

  // 事件监听器
  onSidebarFocused: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('sidebar-focused', handler);
    return () => ipcRenderer.removeListener('sidebar-focused', handler);
  },

  onClipboardAutoSummon: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('sidebar-auto-summon', handler);
    return () => ipcRenderer.removeListener('sidebar-auto-summon', handler);
  },

  onClipboardExceptionState: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('clipboard-exception-state', handler);
    return () => ipcRenderer.removeListener('clipboard-exception-state', handler);
  },

  onContextInjected: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('context-injected', handler);
    return () => ipcRenderer.removeListener('context-injected', handler);
  },

  onVisibilityChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('sidebar-visibility-changed', handler);
    return () => ipcRenderer.removeListener('sidebar-visibility-changed', handler);
  },

  onStateUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('state-updated', handler);
    return () => ipcRenderer.removeListener('state-updated', handler);
  }
});

// 2. 既有探索伴侣 API (全量保留向后兼容)
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据与状态读取
  getState: () => ipcRenderer.invoke('get-state'),
  saveState: (data) => ipcRenderer.invoke('save-state', data),
  
  // 核心游戏动作
  addClue: (clue) => ipcRenderer.invoke('add-clue', clue),
  completeAction: () => ipcRenderer.invoke('complete-action'),
  toggleEquipRelic: (relicId) => ipcRenderer.invoke('toggle-equip-relic', relicId),
  castLens: (lensKey, clueContext) => ipcRenderer.invoke('cast-lens', { lensKey, clueContext }),
  updateCockpit: (updates) => ipcRenderer.invoke('update-cockpit', updates),
  switchProject: (projectId) => ipcRenderer.invoke('switch-project', projectId),
  createProject: (projData) => ipcRenderer.invoke('create-project', projData),
  decomposeGoal: (goal, options) => ipcRenderer.invoke('decompose-goal', { goal, options }),
  diagnoseBottleneck: (context) => ipcRenderer.invoke('diagnose-bottleneck', context),

  // 窗口与系统操作
  toggleHud: () => ipcRenderer.send('toggle-hud'),
  toggleWarRoom: () => ipcRenderer.send('toggle-war-room'),
  toggleSidebar: () => ipcRenderer.send('toggle-sidebar'),
  toggleWindowView: (target) => ipcRenderer.send('toggle-window-view', target),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // 跨窗口实时广播监听
  onStateUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('state-updated', handler);
    return () => ipcRenderer.removeListener('state-updated', handler);
  },

  onFocusQuickInput: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('focus-quick-input', handler);
    return () => ipcRenderer.removeListener('focus-quick-input', handler);
  }
});

