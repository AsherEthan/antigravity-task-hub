// scripts/test-ipc-preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcBridge', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
