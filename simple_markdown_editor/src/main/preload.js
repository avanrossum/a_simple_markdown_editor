const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // ── File Operations ──
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  readDirectory: (dirPath) => ipcRenderer.invoke('file:read-directory', dirPath),
  showSaveDialog: (options) => ipcRenderer.invoke('file:save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('file:open-dialog', options),
  getFileStat: (filePath) => ipcRenderer.invoke('file:stat', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file:exists', filePath),
  getBasename: (filePath) => ipcRenderer.invoke('file:basename', filePath),
  getDirname: (filePath) => ipcRenderer.invoke('file:dirname', filePath),

  // ── File Management ──
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  createDirectory: (dirPath) => ipcRenderer.invoke('file:mkdir', dirPath),
  createFile: (filePath, content) => ipcRenderer.invoke('file:create', filePath, content),
  trashFile: (filePath) => ipcRenderer.invoke('file:trash', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('file:show-in-folder', filePath),

  // ── File Watching ──
  watchFile: (filePath) => ipcRenderer.invoke('watch:file', filePath),
  unwatchFile: (filePath) => ipcRenderer.invoke('watch:unwatch-file', filePath),
  watchDirectory: (dirPath) => ipcRenderer.invoke('watch:directory', dirPath),
  onFileChanged: (callback) => {
    const handler = (_, filePath) => callback(filePath);
    ipcRenderer.on('watch:file-changed', handler);
    return () => ipcRenderer.removeListener('watch:file-changed', handler);
  },
  onDirectoryChanged: (callback) => {
    const handler = (_, dirPath) => callback(dirPath);
    ipcRenderer.on('watch:directory-changed', handler);
    return () => ipcRenderer.removeListener('watch:directory-changed', handler);
  },

  // ── Settings ──
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  setSettings: (updates) => ipcRenderer.invoke('settings:set-multiple', updates),
  onSettingsChanged: (callback) => {
    const handler = (_, settings) => callback(settings);
    ipcRenderer.on('settings:changed', handler);
    return () => ipcRenderer.removeListener('settings:changed', handler);
  },

  // ── Recent Files ──
  getRecentFiles: () => ipcRenderer.invoke('recent:get-files'),
  addRecentFile: (filePath) => ipcRenderer.invoke('recent:add-file', filePath),

  // ── Window Events ──
  onMenuSave: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-save', handler);
    return () => ipcRenderer.removeListener('menu-save', handler);
  },
  onMenuSaveAs: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-save-as', handler);
    return () => ipcRenderer.removeListener('menu-save-as', handler);
  },
  onMenuNewFile: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-new-file', handler);
    return () => ipcRenderer.removeListener('menu-new-file', handler);
  },
  onOpenFile: (callback) => {
    const handler = (_, filePath) => callback(filePath);
    ipcRenderer.on('open-file', handler);
    return () => ipcRenderer.removeListener('open-file', handler);
  },
  onOpenFolder: (callback) => {
    const handler = (_, dirPath) => callback(dirPath);
    ipcRenderer.on('open-folder', handler);
    return () => ipcRenderer.removeListener('open-folder', handler);
  },
  onToggleSearch: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-search', handler);
    return () => ipcRenderer.removeListener('toggle-search', handler);
  },
  onToggleSearchReplace: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-search-replace', handler);
    return () => ipcRenderer.removeListener('toggle-search-replace', handler);
  },
  onDuplicateFile: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('duplicate-file', handler);
    return () => ipcRenderer.removeListener('duplicate-file', handler);
  },
  onShowSettings: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('show-settings', handler);
    return () => ipcRenderer.removeListener('show-settings', handler);
  },
  onShowAbout: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('show-about', handler);
    return () => ipcRenderer.removeListener('show-about', handler);
  },
  onCloseTab: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('close-tab', handler);
    return () => ipcRenderer.removeListener('close-tab', handler);
  },
  onCloseWindow: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('close-window', handler);
    return () => ipcRenderer.removeListener('close-window', handler);
  },
  confirmCloseWindow: () => ipcRenderer.invoke('window:confirm-close'),
  cancelCloseWindow: () => ipcRenderer.invoke('window:cancel-close'),

  // ── Session (per-window) ──
  getSession: (windowId) => ipcRenderer.invoke('session:get', windowId),
  setSession: (windowId, data) => ipcRenderer.invoke('session:set', windowId, data),

  // ── Dialogs ──
  showMessageBox: (options) => ipcRenderer.invoke('dialog:message-box', options),

  // ── App Info ──
  getVersion: () => ipcRenderer.invoke('app:version'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  getSystemTheme: () => ipcRenderer.invoke('app:system-theme'),
  getHomeDir: () => ipcRenderer.invoke('app:home-dir'),
  getParentDir: (dirPath) => ipcRenderer.invoke('app:parent-dir', dirPath),
  onThemeChanged: (callback) => {
    const handler = (_, theme) => callback(theme);
    ipcRenderer.on('app:theme-changed', handler);
    return () => ipcRenderer.removeListener('app:theme-changed', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
