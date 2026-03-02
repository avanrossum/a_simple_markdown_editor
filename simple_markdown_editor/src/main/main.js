const { app, BrowserWindow, ipcMain, nativeTheme, protocol, net, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('./store');
const FileWatcher = require('./file-watcher');
const { registerIpcHandlers } = require('./ipc-handlers');
const { buildAndSetMenu } = require('./menu');
const { THEME_BG_COLORS, WINDOW_DEFAULTS, UPDATE_DIALOG_SIZE, TIMING } = require('./constants');

// ── Register custom protocol for local file access (must be before ready) ──
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// ── State ──
const windows = new Set();
const store = new Store();
const fileWatcher = new FileWatcher();
const isDev = process.argv.includes('--dev');
let windowIdCounter = 0;
let isQuitting = false;

// ── Auto-Update State ──
let updateDialogWindow = null;
let isManualUpdateCheck = false;

// ── Window Creation ──

function resolveTheme() {
  const theme = store.getSetting('theme');
  if (theme === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark';
}

function getBackgroundColor() {
  return THEME_BG_COLORS[resolveTheme()];
}

function createWindow(options = {}) {
  const { fresh = false, windowId } = options;
  const id = windowId || String(windowIdCounter++);
  const savedBounds = store.getWindowBounds();

  // Offset new windows so they don't stack exactly on top
  const offset = windows.size * 22;

  const win = new BrowserWindow({
    width: savedBounds?.width || WINDOW_DEFAULTS.DEFAULT_WIDTH,
    height: savedBounds?.height || WINDOW_DEFAULTS.DEFAULT_HEIGHT,
    x: savedBounds?.x != null ? savedBounds.x + offset : undefined,
    y: savedBounds?.y != null ? savedBounds.y + offset : undefined,
    minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
    minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
    backgroundColor: getBackgroundColor(),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Tag window with its session ID and close state
  win._windowId = id;
  win._forceClose = false;
  windows.add(win);

  // Build URL with window ID and fresh flag
  const query = `windowId=${id}${fresh ? '&fresh=true' : ''}`;

  if (isDev) {
    win.loadURL(`http://localhost:5173/src/renderer/index.html?${query}`);
  } else {
    win.loadFile(path.join(__dirname, '../../dist-renderer/src/renderer/index.html'), {
      query: fresh ? { windowId: id, fresh: 'true' } : { windowId: id },
    });
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  // Save window bounds on resize/move (debounced)
  let boundsTimer = null;
  const saveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (win && !win.isDestroyed()) {
        store.setWindowBounds(win.getBounds());
      }
    }, TIMING.BOUNDS_SAVE_DEBOUNCE_MS);
  };

  win.on('resize', saveBounds);
  win.on('move', saveBounds);

  // Intercept close to check for unsaved tabs
  win.on('close', (e) => {
    if (win._forceClose) return; // Already confirmed — allow close
    e.preventDefault();
    win.webContents.send('close-window');
  });

  win.on('closed', () => {
    windows.delete(win);
    // Remove session for this window unless the app is quitting
    // (on quit we preserve all sessions for next launch)
    if (!isQuitting) {
      store.removeWindowSession(id);
    }
  });

  // Security: prevent navigation and new windows
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  return win;
}

// ── Menu Actions ──

function getFocusedWindow() {
  return BrowserWindow.getFocusedWindow() || [...windows][0] || null;
}

function sendToFocused(channel, ...args) {
  const win = getFocusedWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

function handleMenuOpen(filePath) {
  sendToFocused('open-file', filePath);
  store.addRecentFile(filePath);
}

function handleMenuSave() {
  sendToFocused('menu-save');
}

function handleMenuSaveAs() {
  sendToFocused('menu-save-as');
}

function handleMenuNewFile() {
  sendToFocused('menu-new-file');
}

function handleMenuNewWindow() {
  createWindow({ fresh: true });
}

function handleMenuOpenFolder(dirPath) {
  sendToFocused('open-folder', dirPath);
  store.addRecentDirectory(dirPath);
}

function handleCheckForUpdates() {
  isManualUpdateCheck = true;
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[main] Update check failed:', err.message);
  });
}

// ── Theme ──

function broadcastTheme() {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('app:theme-changed', theme);
    }
  }
  // Also update the update dialog if open
  if (updateDialogWindow && !updateDialogWindow.isDestroyed()) {
    updateDialogWindow.webContents.send('theme:changed', theme);
  }
}

// ── Auto-Updater ──

function formatReleaseNotes(info) {
  if (!info.releaseNotes) return '';
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note || '')).join('\n\n');
  }
  return '';
}

function showUpdateDialog(mode, options = {}) {
  // Close old dialog first — clear reference BEFORE close to prevent
  // the old 'closed' handler from nulling the new window reference
  const oldWindow = updateDialogWindow;
  updateDialogWindow = null;
  if (oldWindow && !oldWindow.isDestroyed()) {
    oldWindow.close();
  }

  const theme = resolveTheme();

  // Center over focused window if available
  const pos = {};
  const parent = getFocusedWindow();
  if (parent && !parent.isDestroyed()) {
    const b = parent.getBounds();
    pos.x = Math.round(b.x + (b.width - UPDATE_DIALOG_SIZE.WIDTH) / 2);
    pos.y = Math.round(b.y + (b.height - UPDATE_DIALOG_SIZE.HEIGHT) / 2);
  }

  const newWindow = new BrowserWindow({
    width: UPDATE_DIALOG_SIZE.WIDTH,
    height: UPDATE_DIALOG_SIZE.HEIGHT,
    ...pos,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    backgroundColor: THEME_BG_COLORS[theme],
    webPreferences: {
      preload: path.join(__dirname, 'update-dialog-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  updateDialogWindow = newWindow;

  // Store init data for the dialog to fetch via IPC
  newWindow._initData = {
    mode,
    currentVersion: options.currentVersion || app.getVersion(),
    newVersion: options.newVersion || '',
    releaseNotes: options.releaseNotes || '',
    theme,
  };

  if (isDev) {
    newWindow.loadURL('http://localhost:5173/src/update-dialog/index.html');
  } else {
    newWindow.loadFile(path.join(__dirname, '../../dist-renderer/src/update-dialog/index.html'));
  }

  newWindow.on('closed', () => {
    if (updateDialogWindow === newWindow) {
      updateDialogWindow = null;
    }
  });
}

function setupAutoUpdater() {
  // Don't auto-download; let user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    isManualUpdateCheck = false;
    showUpdateDialog('update-available', {
      newVersion: info.version,
      releaseNotes: formatReleaseNotes(info),
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
      const win = getFocusedWindow();
      const opts = {
        type: 'info',
        title: 'No Updates Available',
        message: "You're running the latest version.",
        buttons: ['OK'],
      };
      if (win) dialog.showMessageBox(win, opts);
      else dialog.showMessageBox(opts);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    const releaseNotes = formatReleaseNotes(info);
    if (releaseNotes) {
      store.setSetting('pendingWhatsNewNotes', releaseNotes);
    }
    showUpdateDialog('update-downloaded', {
      newVersion: info.version,
      releaseNotes,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    if (updateDialogWindow && !updateDialogWindow.isDestroyed()) {
      updateDialogWindow.webContents.send('app:download-progress', percent);
    }
  });

  autoUpdater.on('error', (err) => {
    if (!isDev) {
      console.error('[main] Auto-updater error:', err.message);
      if (isManualUpdateCheck) {
        isManualUpdateCheck = false;
        const win = getFocusedWindow();
        const opts = {
          type: 'error',
          title: 'Update Error',
          message: 'Failed to check for updates.',
          detail: err.message || 'Please try again later.',
          buttons: ['OK'],
        };
        if (win) dialog.showMessageBox(win, opts);
        else dialog.showMessageBox(opts);
      }
    }
  });

  // ── Update Dialog IPC ──

  ipcMain.handle('update-dialog:get-init-data', () => {
    if (updateDialogWindow && updateDialogWindow._initData) {
      return updateDialogWindow._initData;
    }
    return null;
  });

  ipcMain.handle('app:check-for-updates', () => {
    handleCheckForUpdates();
  });

  ipcMain.handle('app:download-update', () => {
    autoUpdater.downloadUpdate().catch((err) => {
      console.error('[main] Download update failed:', err.message);
      if (updateDialogWindow && !updateDialogWindow.isDestroyed()) {
        updateDialogWindow.webContents.send('app:download-error', err.message);
      }
    });
  });

  ipcMain.handle('app:restart-for-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.on('update-dialog:close', () => {
    if (updateDialogWindow && !updateDialogWindow.isDestroyed()) {
      updateDialogWindow.close();
    }
  });

  // Schedule update checks (skip in dev)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[main] Update check failed:', err.message);
      });
    }, TIMING.UPDATE_CHECK_DELAY_MS);

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, TIMING.UPDATE_CHECK_INTERVAL_MS);
  }
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  // Handle local-resource:// protocol for preview images
  // Restricted to image files under home directory (defense-in-depth)
  const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif']);
  const protocolHomeDir = require('os').homedir();

  protocol.handle('local-resource', (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);
    const resolved = path.resolve(filePath);

    // Must be under home directory or /Volumes
    const underHome = resolved.startsWith(protocolHomeDir + '/');
    const underVolumes = resolved.startsWith('/Volumes/');
    if (!underHome && !underVolumes) {
      return new Response('Forbidden', { status: 403 });
    }

    // Must be an image file
    const ext = path.extname(resolved).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.has(ext)) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(`file://${resolved}`);
  });

  // Restore windows from saved sessions, or create a fresh default window
  const sessions = store.getAllWindowSessions();
  const sessionEntries = Object.entries(sessions);

  if (sessionEntries.length > 0) {
    for (const [id] of sessionEntries) {
      createWindow({ windowId: id });
    }
    // Set counter past existing IDs to avoid collisions
    windowIdCounter = Math.max(windowIdCounter, ...sessionEntries.map(([id]) => (parseInt(id, 10) || 0) + 1));
  } else {
    createWindow();
  }

  // ── Window Close Confirmation IPC ──
  // (registered here because they need access to isQuitting)

  ipcMain.handle('window:confirm-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win._forceClose = true;
      win.close();
    }
  });

  ipcMain.handle('window:cancel-close', () => {
    // If the quit sequence was in progress and user canceled, reset the flag
    isQuitting = false;
  });

  registerIpcHandlers({
    store,
    fileWatcher,
    getFocusedWindow,
  });

  buildAndSetMenu({
    getFocusedWindow,
    store,
    onOpen: handleMenuOpen,
    onSave: handleMenuSave,
    onSaveAs: handleMenuSaveAs,
    onNewFile: handleMenuNewFile,
    onNewWindow: handleMenuNewWindow,
    onOpenFolder: handleMenuOpenFolder,
    onCheckForUpdates: handleCheckForUpdates,
  });

  nativeTheme.on('updated', broadcastTheme);

  // ── Auto-Updater ──
  setupAutoUpdater();

  // Show "What's New" if there are pending notes from a previous update
  const pendingNotes = store.getSetting('pendingWhatsNewNotes');
  if (pendingNotes) {
    store.setSetting('pendingWhatsNewNotes', null);
    showUpdateDialog('whats-new', { releaseNotes: pendingNotes });
  }

  // Open files dropped on dock icon (macOS)
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (windows.size > 0) {
      handleMenuOpen(filePath);
    } else {
      // No windows open — create one then open the file
      const win = createWindow({ fresh: true });
      win.webContents.once('did-finish-load', () => {
        win.webContents.send('open-file', filePath);
        store.addRecentFile(filePath);
      });
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || isQuitting) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  fileWatcher.destroy();
});
