import React, { useState, useEffect, useCallback, useRef } from 'react';
import TabBar from './components/TabBar';
import FileBrowser from './components/FileBrowser';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Toolbar from './components/Toolbar';
import SearchReplace from './components/SearchReplace';
import DiffView from './components/DiffView';
import PreviewHeader from './components/PreviewHeader';
import Settings from '../settings/Settings';

const { electronAPI } = window;

// ── Window Identity (from URL query params) ──
const urlParams = new URLSearchParams(window.location.search);
const WINDOW_ID = urlParams.get('windowId') || '0';
const IS_FRESH_WINDOW = urlParams.get('fresh') === 'true';

// ── Tab Helpers ──

let tabIdCounter = 1;

function createTab(filePath = null, content = '') {
  return {
    id: tabIdCounter++,
    filePath,
    name: filePath ? null : 'Untitled', // null = derive from filePath
    content,
    savedContent: content,
    lastKnownMtime: null,
  };
}

export default function App() {
  const [tabs, setTabs] = useState(null); // null = loading session
  const [activeTabId, setActiveTabId] = useState(null);
  const [folderPath, setFolderPath] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [theme, setTheme] = useState('dark');
  const editorRef = useRef(null);
  const sessionRestoredRef = useRef(false);

  const activeTab = tabs?.find((t) => t.id === activeTabId) || tabs?.[0];

  // ── Load Settings ──

  useEffect(() => {
    electronAPI.getSettings().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    });

    const unsub = electronAPI.onSettingsChanged((s) => {
      setSettings(s);
      applyTheme(s.theme);
    });
    return unsub;
  }, []);

  // ── Session Restore ──

  useEffect(() => {
    // Fresh windows (Cmd+Shift+N) skip session restore
    if (IS_FRESH_WINDOW) {
      setTabs([createTab()]);
      setActiveTabId(1);
      sessionRestoredRef.current = true;
      return;
    }

    let cancelled = false;

    (async () => {
      const session = await electronAPI.getSession(WINDOW_ID);
      if (cancelled) return;

      let restoredTabs = [];

      if (session?.openFiles?.length > 0) {
        for (const filePath of session.openFiles) {
          const exists = await electronAPI.fileExists(filePath);
          if (!exists) continue;
          const result = await electronAPI.readFile(filePath);
          if (!result.success) continue;
          const stat = await electronAPI.getFileStat(filePath);
          const tab = createTab(filePath, result.content);
          tab.savedContent = result.content;
          tab.lastKnownMtime = stat.success ? stat.mtime : null;
          restoredTabs.push(tab);
          electronAPI.watchFile(filePath);
        }
      }

      if (restoredTabs.length === 0) {
        restoredTabs = [createTab()];
      }

      if (cancelled) return;

      setTabs(restoredTabs);

      const activeFile = session?.activeFile;
      const activeRestoredTab = restoredTabs.find((t) => t.filePath === activeFile);
      setActiveTabId(activeRestoredTab ? activeRestoredTab.id : restoredTabs[0].id);

      if (session?.folderPath) {
        setFolderPath(session.folderPath);
      }

      sessionRestoredRef.current = true;
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Session Save ──

  useEffect(() => {
    if (!sessionRestoredRef.current || !tabs) return;

    const timer = setTimeout(() => {
      const openFiles = tabs.filter((t) => t.filePath).map((t) => t.filePath);
      const activeFile = tabs.find((t) => t.id === activeTabId)?.filePath || null;
      electronAPI.setSession(WINDOW_ID, {
        openFiles,
        activeFile,
        folderPath: folderPath || null,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [tabs, activeTabId, folderPath]);

  // ── Theme ──

  const applyTheme = useCallback(async (themeSetting) => {
    let resolved = themeSetting;
    if (themeSetting === 'system') {
      resolved = await electronAPI.getSystemTheme();
    }
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, []);

  useEffect(() => {
    const unsub = electronAPI.onThemeChanged((systemTheme) => {
      if (settings?.theme === 'system') {
        setTheme(systemTheme);
        document.documentElement.dataset.theme = systemTheme;
      }
    });
    return unsub;
  }, [settings?.theme]);

  // Apply accent color
  useEffect(() => {
    if (settings?.accentColor) {
      document.documentElement.dataset.accent = settings.accentColor;
    }
  }, [settings?.accentColor]);

  // Apply editor font settings
  useEffect(() => {
    const root = document.documentElement.style;
    if (settings?.fontSize) {
      root.setProperty('--editor-font-size', `${settings.fontSize}px`);
    }
    if (settings?.fontFamily && settings.fontFamily !== 'default') {
      root.setProperty('--editor-font-family', settings.fontFamily);
    } else {
      root.setProperty('--editor-font-family', "var(--font-mono)");
    }
    if (settings?.previewFontFamily && settings.previewFontFamily !== 'default') {
      root.setProperty('--preview-font-family', settings.previewFontFamily);
    } else {
      root.setProperty('--preview-font-family', "var(--font-system)");
    }
  }, [settings?.fontSize, settings?.fontFamily, settings?.previewFontFamily]);

  // ── File Operations ──

  const openFile = useCallback(async (filePath) => {
    // Check if already open
    const existing = tabs?.find((t) => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const result = await electronAPI.readFile(filePath);
    if (!result.success) return;

    const stat = await electronAPI.getFileStat(filePath);
    const tab = createTab(filePath, result.content);
    tab.savedContent = result.content;
    tab.lastKnownMtime = stat.success ? stat.mtime : null;

    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    electronAPI.addRecentFile(filePath);
    electronAPI.watchFile(filePath);
  }, [tabs]);

  const saveTab = useCallback(async (tabId) => {
    const tab = tabs?.find((t) => t.id === (tabId || activeTabId));
    if (!tab) return false;

    if (!tab.filePath) {
      return saveTabAs(tab.id);
    }

    // Temporarily unwatch to avoid self-trigger
    await electronAPI.unwatchFile(tab.filePath);
    const result = await electronAPI.writeFile(tab.filePath, tab.content);
    if (result.success) {
      const stat = await electronAPI.getFileStat(tab.filePath);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? { ...t, savedContent: t.content, lastKnownMtime: stat.success ? stat.mtime : null }
            : t
        )
      );
      await electronAPI.watchFile(tab.filePath);
      return true;
    }
    await electronAPI.watchFile(tab.filePath);
    return false;
  }, [tabs, activeTabId]);

  const saveTabAs = useCallback(async (tabId) => {
    const tab = tabs?.find((t) => t.id === (tabId || activeTabId));
    if (!tab) return false;

    const result = await electronAPI.showSaveDialog({
      defaultPath: tab.filePath || 'Untitled.md',
    });

    if (result.canceled || !result.filePath) return false;

    const writeResult = await electronAPI.writeFile(result.filePath, tab.content);
    if (writeResult.success) {
      const stat = await electronAPI.getFileStat(result.filePath);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? {
                ...t,
                filePath: result.filePath,
                name: null,
                savedContent: t.content,
                lastKnownMtime: stat.success ? stat.mtime : null,
              }
            : t
        )
      );
      electronAPI.addRecentFile(result.filePath);
      electronAPI.watchFile(result.filePath);
      return true;
    }
    return false;
  }, [tabs, activeTabId]);

  const newFile = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(async (tabId) => {
    const tab = tabs?.find((t) => t.id === tabId);
    if (!tab) return;

    // Prompt to save if dirty
    if (tab.content !== tab.savedContent) {
      const result = await electronAPI.showMessageBox({
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: `Do you want to save changes to "${getTabName(tab)}"?`,
        detail: 'Your changes will be lost if you close without saving.',
      });

      if (result.response === 0) {
        // Save — abort close if save was canceled
        const saved = await saveTab(tabId);
        if (!saved) return;
      } else if (result.response === 2) {
        // Cancel
        return;
      }
      // response === 1 means Don't Save — continue closing
    }

    if (tab.filePath) {
      electronAPI.unwatchFile(tab.filePath);
    }

    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (next.length === 0) {
        const fresh = createTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (activeTabId === tabId) {
        const idx = prev.findIndex((t) => t.id === tabId);
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx].id);
      }
      return next;
    });
  }, [tabs, activeTabId, saveTab]);

  const duplicateFile = useCallback(async () => {
    if (!activeTab) return;
    const tab = createTab(null, activeTab.content);
    tab.name = `${getTabName(activeTab)} copy`;
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [activeTab]);

  // ── Close Window (with dirty checks) ──

  const closeWindow = useCallback(async () => {
    if (!tabs) {
      electronAPI.confirmCloseWindow();
      return;
    }

    const dirtyTabs = tabs.filter((t) => t.content !== t.savedContent);

    for (const tab of dirtyTabs) {
      const result = await electronAPI.showMessageBox({
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: `Do you want to save changes to "${getTabName(tab)}"?`,
        detail: 'Your changes will be lost if you close without saving.',
      });

      if (result.response === 0) {
        // Save — abort close if save was canceled
        const saved = await saveTab(tab.id);
        if (!saved) {
          electronAPI.cancelCloseWindow();
          return;
        }
      } else if (result.response === 2) {
        // Cancel — abort close
        electronAPI.cancelCloseWindow();
        return;
      }
      // response === 1 means Don't Save — continue to next dirty tab
    }

    // All dirty tabs resolved — confirm close
    electronAPI.confirmCloseWindow();
  }, [tabs, saveTab]);

  // ── File Rename Handler ──

  const handleFileRenamed = useCallback((oldPath, newPath) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.filePath === oldPath) {
          electronAPI.unwatchFile(oldPath);
          electronAPI.watchFile(newPath);
          return { ...t, filePath: newPath, name: null };
        }
        return t;
      })
    );
  }, []);

  // ── File Deleted Handler ──

  const handleFileDeleted = useCallback((filePath) => {
    electronAPI.unwatchFile(filePath);
    setTabs((prev) => {
      const next = prev.filter((t) => t.filePath !== filePath);
      if (next.length === 0) {
        const fresh = createTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }
      // If active tab was the deleted file, switch to adjacent
      const wasActive = prev.find((t) => t.id === activeTabId);
      if (wasActive?.filePath === filePath) {
        const idx = prev.findIndex((t) => t.filePath === filePath);
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx].id);
      }
      return next;
    });
  }, [activeTabId]);

  // ── Content Updates ──

  const updateContent = useCallback((tabId, content) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content } : t))
    );
  }, []);

  // ── File Watching (external changes) ──

  useEffect(() => {
    const unsub = electronAPI.onFileChanged(async (filePath) => {
      if (!tabs) return;
      const tab = tabs.find((t) => t.filePath === filePath);
      if (!tab) return;

      const result = await electronAPI.readFile(filePath);
      if (!result.success) return;

      const externalContent = result.content;
      const hasLocalChanges = tab.content !== tab.savedContent;

      if (!hasLocalChanges) {
        // No local edits — silently update
        setTabs((prev) =>
          prev.map((t) =>
            t.filePath === filePath
              ? { ...t, content: externalContent, savedContent: externalContent }
              : t
          )
        );
      } else {
        // Local edits exist — show diff dialog
        setDiffData({
          tabId: tab.id,
          filePath,
          currentContent: tab.content,
          externalContent,
        });
      }
    });
    return unsub;
  }, [tabs]);

  // ── Diff Resolution ──

  const handleDiffResolve = useCallback(async (action) => {
    if (!diffData) return;

    if (action === 'overwrite') {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === diffData.tabId
            ? { ...t, content: diffData.externalContent, savedContent: diffData.externalContent }
            : t
        )
      );
    } else if (action === 'save-as-new') {
      const result = await electronAPI.showSaveDialog({
        defaultPath: diffData.filePath,
      });
      if (!result.canceled && result.filePath) {
        await electronAPI.writeFile(result.filePath, diffData.currentContent);
        // Also accept the external version in current tab
        setTabs((prev) =>
          prev.map((t) =>
            t.id === diffData.tabId
              ? { ...t, content: diffData.externalContent, savedContent: diffData.externalContent }
              : t
          )
        );
      }
    }
    // 'cancel' — do nothing, keep current state
    setDiffData(null);
  }, [diffData]);

  // ── Menu Events ──

  useEffect(() => {
    const unsubs = [
      electronAPI.onMenuSave(() => saveTab()),
      electronAPI.onMenuSaveAs(() => saveTabAs()),
      electronAPI.onMenuNewFile(() => newFile()),
      electronAPI.onOpenFile((filePath) => openFile(filePath)),
      electronAPI.onOpenFolder((dirPath) => setFolderPath(dirPath)),
      electronAPI.onToggleSearch(() => {
        setShowSearch((v) => !v);
        setShowReplace(false);
      }),
      electronAPI.onToggleSearchReplace(() => {
        setShowSearch(true);
        setShowReplace((v) => !v);
      }),
      electronAPI.onDuplicateFile(() => duplicateFile()),
      electronAPI.onShowSettings(() => setShowSettings(true)),
      electronAPI.onShowAbout(() => setShowAbout(true)),
      electronAPI.onCloseTab(() => closeTab(activeTabId)),
      electronAPI.onCloseWindow(() => closeWindow()),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [saveTab, saveTabAs, newFile, openFile, duplicateFile, closeTab, closeWindow, activeTabId]);

  // ── Toolbar Actions ──

  const handleToolbarAction = useCallback((action) => {
    if (editorRef.current) {
      editorRef.current.applyFormatting(action);
    }
  }, []);

  // ── Helpers ──

  function getTabName(tab) {
    if (tab.name) return tab.name;
    if (tab.filePath) {
      const parts = tab.filePath.split('/');
      return parts[parts.length - 1];
    }
    return 'Untitled';
  }

  function isTabDirty(tab) {
    return tab.content !== tab.savedContent;
  }

  if (!settings || !tabs) return null; // Loading

  return (
    <div className="app">
      {/* ── Drag Region + Tabs ── */}
      <div className="title-bar">
        <div className="drag-region" />
        <TabBar
          tabs={tabs.map((t) => ({
            id: t.id,
            name: getTabName(t),
            dirty: isTabDirty(t),
          }))}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCloseTab={closeTab}
          onNewTab={newFile}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">
        {/* File Browser */}
        <FileBrowser
          folderPath={folderPath}
          onOpenFile={openFile}
          onSetFolder={setFolderPath}
          onOpenSettings={() => setShowSettings(true)}
          width={settings.fileBrowserWidth}
          activeFilePath={activeTab?.filePath}
          onFileRenamed={handleFileRenamed}
          onFileDeleted={handleFileDeleted}
          favorites={settings.favorites || []}
          onUpdateFavorites={(f) => electronAPI.setSetting('favorites', f)}
        />

        {/* Editor Column */}
        <div className="editor-column">
          <Toolbar onAction={handleToolbarAction} />
          {showSearch && (
            <SearchReplace
              editorRef={editorRef}
              showReplace={showReplace}
              onClose={() => {
                setShowSearch(false);
                setShowReplace(false);
              }}
            />
          )}
          <Editor
            ref={editorRef}
            content={activeTab.content}
            onChange={(val) => updateContent(activeTab.id, val)}
            settings={settings}
            theme={theme}
          />
        </div>

        {/* Preview Column */}
        <div className="preview-column">
          <PreviewHeader filePath={activeTab.filePath} />
          <Preview
            content={activeTab.content}
            theme={theme}
            editorRef={editorRef}
            filePath={activeTab.filePath}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {diffData && (
        <DiffView
          filePath={diffData.filePath}
          currentContent={diffData.currentContent}
          externalContent={diffData.externalContent}
          onResolve={handleDiffResolve}
        />
      )}

      {showSettings && (
        <Settings
          settings={settings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Simple Markdown Editor</h2>
            <p className="about-version">v{settings._version || '0.1.0'}</p>
            <p className="about-description">A stupid simple markdown editor.</p>
            <div className="about-links">
              <button
                className="link-button"
                onClick={() => electronAPI.openExternal('https://mipyip.com')}
              >
                mipyip.com
              </button>
              <button
                className="link-button"
                onClick={() => electronAPI.openExternal('https://github.com/avanrossum/simple-markdown-editor')}
              >
                GitHub
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAbout(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
