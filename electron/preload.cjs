const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('slursApi', {
  getRuntimeInfo: () => ipcRenderer.invoke('slurs:get-runtime-info'),
  getElectronSettings: () => ipcRenderer.invoke('slurs:get-electron-settings'),
  saveElectronSettings: (payload) => ipcRenderer.invoke('slurs:save-electron-settings', payload),
  resolveVanity: (vanity) => ipcRenderer.invoke('slurs:resolve-vanity', vanity),
  getProfile: (steamId) => ipcRenderer.invoke('slurs:get-profile', steamId),
  getLogs: (steamId, offset) => ipcRenderer.invoke('slurs:get-logs', steamId, offset),
  getLog: (logId) => ipcRenderer.invoke('slurs:get-log', logId)
});
