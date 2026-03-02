const { contextBridge, ipcRenderer } = require('electron');

const updateAPI = {
  getInitData: () => ipcRenderer.invoke('update-dialog:get-init-data'),
  downloadUpdate: () => ipcRenderer.invoke('app:download-update'),
  restartForUpdate: () => ipcRenderer.invoke('app:restart-for-update'),
  close: () => ipcRenderer.send('update-dialog:close'),

  onThemeChanged: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on('theme:changed', handler);
    return () => ipcRenderer.removeListener('theme:changed', handler);
  },

  onDownloadProgress: (callback) => {
    const handler = (_event, percent) => callback(percent);
    ipcRenderer.on('app:download-progress', handler);
    return () => ipcRenderer.removeListener('app:download-progress', handler);
  },

  onDownloadError: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('app:download-error', handler);
    return () => ipcRenderer.removeListener('app:download-error', handler);
  },
};

contextBridge.exposeInMainWorld('updateAPI', updateAPI);
