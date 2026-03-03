import React, { useState, useEffect, useCallback, useRef } from 'react';

const { electronAPI } = window;

const MD_EXTENSIONS = /\.(md|markdown|mdown|mkd|txt)$/i;

// ── Inline Rename Input ──

function InlineRenameInput({ defaultValue, onSubmit, onCancel }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const dotIndex = defaultValue.lastIndexOf('.');
      inputRef.current.setSelectionRange(0, dotIndex > 0 ? dotIndex : defaultValue.length);
    }
  }, [defaultValue]);

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      onSubmit(inputRef.current.value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className="inline-rename-input"
      defaultValue={defaultValue}
      onKeyDown={handleKeyDown}
      onBlur={() => onSubmit(inputRef.current.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ── Context Menu ──

function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      if (x > maxX) menuRef.current.style.left = `${maxX}px`;
      if (y > maxY) menuRef.current.style.top = `${maxY}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        item.separator ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <div
            key={i}
            className="context-menu-item"
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.label}
          </div>
        )
      ))}
    </div>
  );
}

// ── File Tree Item ──

function FileTreeItem({ entry, depth, onOpenFile, onSetRoot, refreshKey, activeFilePath, renamingPath, onFinishRename, onCancelRename, onContextMenu }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const rowRef = useRef(null);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;

  const isActive = !entry.isDirectory && entry.path === activeFilePath;
  const isRenaming = entry.path === renamingPath;

  // Re-fetch children when refreshKey changes and directory is expanded
  useEffect(() => {
    if (expanded && entry.isDirectory) {
      electronAPI.readDirectory(entry.path).then((result) => {
        if (result.success) setChildren(result.entries);
      });
    }
  }, [refreshKey, expanded, entry.path, entry.isDirectory]);

  // Auto-expand ancestor directories when activeFilePath changes
  useEffect(() => {
    if (entry.isDirectory && activeFilePath && activeFilePath.startsWith(entry.path + '/') && !expandedRef.current) {
      electronAPI.readDirectory(entry.path).then((result) => {
        if (result.success) setChildren(result.entries);
        setExpanded(true);
      });
    }
  }, [activeFilePath, entry.path, entry.isDirectory]);

  // Auto-expand ancestor directories to reveal renaming target
  useEffect(() => {
    if (entry.isDirectory && renamingPath && renamingPath.startsWith(entry.path + '/') && !expandedRef.current) {
      electronAPI.readDirectory(entry.path).then((result) => {
        if (result.success) setChildren(result.entries);
        setExpanded(true);
      });
    }
  }, [renamingPath, entry.path, entry.isDirectory]);

  // Scroll active file into view
  useEffect(() => {
    if (isActive && rowRef.current) {
      const timer = setTimeout(() => {
        rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleClick = useCallback(async () => {
    if (isRenaming) return;
    if (!entry.isDirectory) {
      if (MD_EXTENSIONS.test(entry.name)) {
        onOpenFile(entry.path);
      }
      return;
    }
    if (!expanded) {
      const result = await electronAPI.readDirectory(entry.path);
      if (result.success) setChildren(result.entries);
    }
    setExpanded((v) => !v);
  }, [entry, expanded, onOpenFile, isRenaming]);

  const handleDoubleClick = useCallback((e) => {
    if (entry.isDirectory) {
      e.stopPropagation();
      onSetRoot(entry.path);
    }
  }, [entry, onSetRoot]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, entry);
  }, [entry, onContextMenu]);

  const isMarkdown = !entry.isDirectory && MD_EXTENSIONS.test(entry.name);
  const isNonMarkdownFile = !entry.isDirectory && !isMarkdown;

  return (
    <div className="file-tree-item">
      <div
        ref={rowRef}
        className={`file-tree-row ${entry.isDirectory ? 'is-directory' : ''} ${isMarkdown ? 'is-markdown' : ''} ${isNonMarkdownFile ? 'is-non-markdown' : ''} ${isActive ? 'is-active' : ''}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={entry.path}
      >
        {entry.isDirectory && (
          <svg
            className={`expand-icon ${expanded ? 'expanded' : ''}`}
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="currentColor"
          >
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        )}
        {!entry.isDirectory && <span className="file-icon-spacer" />}
        {isRenaming ? (
          <InlineRenameInput
            defaultValue={entry.name}
            onSubmit={(newName) => onFinishRename(entry.path, newName)}
            onCancel={onCancelRename}
          />
        ) : (
          <span className="file-name">{entry.name}</span>
        )}
      </div>
      {expanded && entry.isDirectory && (
        <div className="file-tree-children">
          {children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              onOpenFile={onOpenFile}
              onSetRoot={onSetRoot}
              refreshKey={refreshKey}
              activeFilePath={activeFilePath}
              renamingPath={renamingPath}
              onFinishRename={onFinishRename}
              onCancelRename={onCancelRename}
              onContextMenu={onContextMenu}
            />
          ))}
          {children.length === 0 && (
            <div className="file-tree-empty" style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}>
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Favorites Panel ──

function FavoritesPanel({ favorites, onOpenFile, onSetFolder, onRemoveFavorite, onReorderFavorites }) {
  const [staleSet, setStaleSet] = useState(new Set());
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Check which paths still exist
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stale = new Set();
      for (const fav of favorites) {
        const exists = await electronAPI.fileExists(fav.path);
        if (!exists) stale.add(fav.path);
      }
      if (!cancelled) setStaleSet(stale);
    })();
    return () => { cancelled = true; };
  }, [favorites]);

  const handleClick = useCallback((fav) => {
    if (staleSet.has(fav.path)) return;
    if (fav.type === 'directory') {
      onSetFolder(fav.path);
    } else {
      onOpenFile(fav.path);
    }
  }, [staleSet, onSetFolder, onOpenFile]);

  const handleContextMenu = useCallback((e, fav) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Copy Path', action: () => navigator.clipboard.writeText(fav.path).catch(() => {}) },
        { separator: true },
        { label: 'Remove from Favorites', action: () => onRemoveFavorite(fav.path) },
      ],
    });
  }, [onRemoveFavorite]);

  // ── Drag-to-Reorder ──

  const handleDragStart = useCallback((e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
    setDragIndex(null);
    setDropIndex(null);
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  }, []);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) return;
    const reordered = [...favorites];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderFavorites(reordered);
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, favorites, onReorderFavorites]);

  if (favorites.length === 0) return null;

  return (
    <div className="favorites-panel">
      <div className="favorites-header">
        <span className="favorites-title">Favorites</span>
      </div>
      <div className="favorites-list">
        {favorites.map((fav, index) => {
          const isStale = staleSet.has(fav.path);
          const name = fav.path.split('/').pop();
          const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <div
              key={fav.path}
              className={`favorites-item${isStale ? ' is-stale' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
              onClick={() => handleClick(fav)}
              onContextMenu={(e) => handleContextMenu(e, fav)}
              title={isStale ? `${fav.path} (not found)` : fav.path}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              {fav.type === 'directory' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="favorites-icon">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="favorites-icon">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
              )}
              <span className="favorites-name">{name}</span>
            </div>
          );
        })}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// ── Path Helper ──

function truncatePath(fullPath, homeDir) {
  if (homeDir && fullPath.startsWith(homeDir)) {
    return '~' + fullPath.slice(homeDir.length);
  }
  return fullPath;
}

// ── Main Component ──

export default function FileBrowser({ folderPath, onOpenFile, onSetFolder, onOpenSettings, width, activeFilePath, onFileRenamed, onFileDeleted, favorites, onUpdateFavorites }) {
  const [entries, setEntries] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [homeDir, setHomeDir] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);

  // Get home directory on mount and default to it if no folder is set
  useEffect(() => {
    electronAPI.getHomeDir().then((dir) => {
      setHomeDir(dir);
      if (!folderPath) {
        onSetFolder(dir);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDirectory = useCallback(async (dirPath) => {
    if (!dirPath) return;
    const result = await electronAPI.readDirectory(dirPath);
    if (result.success) {
      setEntries(result.entries);
    } else {
      // Path not accessible (e.g. root /), fall back to home
      const home = await electronAPI.getHomeDir();
      if (home && home !== dirPath) {
        onSetFolder(home);
      }
    }
  }, [onSetFolder]);

  useEffect(() => {
    if (folderPath) {
      loadDirectory(folderPath);
      electronAPI.watchDirectory(folderPath);
    }
  }, [folderPath, loadDirectory]);

  useEffect(() => {
    const unsub = electronAPI.onDirectoryChanged(() => {
      if (folderPath) {
        loadDirectory(folderPath);
        setRefreshKey((k) => k + 1);
      }
    });
    return unsub;
  }, [folderPath, loadDirectory]);

  const handleOpenFolder = useCallback(async () => {
    const result = await electronAPI.showOpenDialog({ directory: true });
    if (!result.canceled && result.filePaths[0]) {
      onSetFolder(result.filePaths[0]);
    }
  }, [onSetFolder]);

  const handleGoUp = useCallback(async () => {
    if (!folderPath) return;
    const parent = await electronAPI.getParentDir(folderPath);
    if (parent && parent !== folderPath) {
      // Verify the parent is readable before navigating
      const result = await electronAPI.readDirectory(parent);
      if (result.success) {
        onSetFolder(parent);
      }
    }
  }, [folderPath, onSetFolder]);

  // ── Context Menu Actions ──

  const createNewFile = useCallback(async (dirPath) => {
    let name = 'Untitled.md';
    let counter = 1;
    while (await electronAPI.fileExists(dirPath + '/' + name)) {
      counter++;
      name = `Untitled ${counter}.md`;
    }
    const filePath = dirPath + '/' + name;
    await electronAPI.createFile(filePath, '');
    // Force refresh so the new entry appears, then activate inline rename
    await loadDirectory(folderPath);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRenamingPath(filePath), 100);
  }, [folderPath, loadDirectory]);

  const createNewFolder = useCallback(async (dirPath) => {
    let name = 'New Folder';
    let counter = 1;
    while (await electronAPI.fileExists(dirPath + '/' + name)) {
      counter++;
      name = `New Folder ${counter}`;
    }
    const newPath = dirPath + '/' + name;
    await electronAPI.createDirectory(newPath);
    // Force refresh so the new entry appears, then activate inline rename
    await loadDirectory(folderPath);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRenamingPath(newPath), 100);
  }, [folderPath, loadDirectory]);

  const trashFile = useCallback(async (filePath) => {
    const result = await electronAPI.trashFile(filePath);
    if (result.success) {
      loadDirectory(folderPath);
      setRefreshKey((k) => k + 1);
      if (onFileDeleted) onFileDeleted(filePath);
    }
  }, [folderPath, loadDirectory, onFileDeleted]);

  // ── Favorites Helpers ──

  const isFavorited = useCallback((filePath) => {
    return favorites.some((f) => f.path === filePath);
  }, [favorites]);

  const addToFavorites = useCallback((filePath, type) => {
    if (isFavorited(filePath)) return;
    const updated = [...favorites, { path: filePath, type }];
    onUpdateFavorites(updated);
  }, [favorites, isFavorited, onUpdateFavorites]);

  const removeFromFavorites = useCallback((filePath) => {
    const updated = favorites.filter((f) => f.path !== filePath);
    onUpdateFavorites(updated);
  }, [favorites, onUpdateFavorites]);

  const handleContextMenu = useCallback((e, entry) => {
    const items = [];

    if (entry.isDirectory) {
      items.push({
        label: 'New Markdown File',
        action: () => createNewFile(entry.path),
      });
      items.push({
        label: 'New Folder',
        action: () => createNewFolder(entry.path),
      });
      items.push({ separator: true });
    }

    items.push({
      label: 'Rename',
      action: () => setRenamingPath(entry.path),
    });

    if (!entry.isDirectory) {
      items.push({
        label: 'Move to Trash',
        action: () => trashFile(entry.path),
      });
    }

    items.push({ separator: true });
    items.push({
      label: 'Copy Path',
      action: () => navigator.clipboard.writeText(entry.path).catch(() => {}),
    });

    if (isFavorited(entry.path)) {
      items.push({
        label: 'Remove from Favorites',
        action: () => removeFromFavorites(entry.path),
      });
    } else {
      items.push({
        label: 'Add to Favorites',
        action: () => addToFavorites(entry.path, entry.isDirectory ? 'directory' : 'file'),
      });
    }

    items.push({ separator: true });
    items.push({
      label: 'Show in Finder',
      action: () => electronAPI.showInFolder(entry.path),
    });

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [createNewFile, createNewFolder, trashFile, isFavorited, addToFavorites, removeFromFavorites]);

  const handleTreeContextMenu = useCallback((e) => {
    if (e.target.closest('.file-tree-row')) return;
    e.preventDefault();
    if (!folderPath) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'New Markdown File', action: () => createNewFile(folderPath) },
        { label: 'New Folder', action: () => createNewFolder(folderPath) },
      ],
    });
  }, [folderPath, createNewFile, createNewFolder]);

  const handleFinishRename = useCallback(async (oldPath, newName) => {
    if (!newName || !newName.trim() || newName.trim() === oldPath.split('/').pop()) {
      setRenamingPath(null);
      return;
    }
    const dir = await electronAPI.getDirname(oldPath);
    const newPath = dir + '/' + newName.trim();
    const result = await electronAPI.renameFile(oldPath, newPath);
    setRenamingPath(null);
    if (result.success) {
      // Force refresh so the tree reflects the new name
      loadDirectory(folderPath);
      setRefreshKey((k) => k + 1);
      if (onFileRenamed) {
        onFileRenamed(oldPath, newPath);
      }
    }
  }, [onFileRenamed, folderPath, loadDirectory]);

  const displayPath = folderPath ? truncatePath(folderPath, homeDir) : '';

  return (
    <div className="file-browser" style={{ width: `${width}px` }}>
      {/* Path navigation header */}
      {folderPath && (
        <div className="file-browser-header">
          <button
            className="file-browser-back-btn"
            onClick={handleGoUp}
            title="Go to parent directory"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <span className="file-browser-path" title={folderPath}>
            {displayPath}
          </span>
          <button
            className="file-browser-open-btn"
            onClick={handleOpenFolder}
            title="Open folder"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Favorites */}
      <FavoritesPanel
        favorites={favorites}
        onOpenFile={onOpenFile}
        onSetFolder={onSetFolder}
        onRemoveFavorite={removeFromFavorites}
        onReorderFavorites={onUpdateFavorites}
      />

      <div className="file-browser-content" onContextMenu={handleTreeContextMenu}>
        {!folderPath ? (
          <div className="file-browser-empty">
            <button className="btn btn-ghost" onClick={handleOpenFolder}>
              Open Folder
            </button>
          </div>
        ) : (
          <div className="file-tree">
            {entries.map((entry) => (
              <FileTreeItem
                key={entry.path}
                entry={entry}
                depth={0}
                onOpenFile={onOpenFile}
                onSetRoot={onSetFolder}
                refreshKey={refreshKey}
                activeFilePath={activeFilePath}
                renamingPath={renamingPath}
                onFinishRename={handleFinishRename}
                onCancelRename={() => setRenamingPath(null)}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>
      <div className="file-browser-footer">
        <button
          className="settings-button"
          onClick={onOpenSettings}
          title="Settings"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z" />
          </svg>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
