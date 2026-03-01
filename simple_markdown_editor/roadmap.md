# Roadmap

## v0.1.0 — Functional Application

> Status: **In Progress**

### Core

- [x] Electron app scaffold (main process, renderer, preload, IPC)
- [x] Vite build setup for renderer
- [x] electron-builder config with macOS signing
- [x] Application menu (File, Edit, View, Window, Help)
- [x] Settings persistence (JSON store)
- [x] Window bounds save/restore
- [x] Multi-window support (Cmd+Shift+N)
- [x] Cmd+W closes tab (not window)

### Editor

- [x] CodeMirror 6 markdown editor
- [x] Markdown syntax highlighting
- [x] Formatting toolbar (bold, italic, strikethrough, headings, lists, code, links, images, hr)
- [x] Toolbar works with selection (wrap) and without (insert markers)
- [x] Line numbers (toggleable)
- [x] Word wrap (toggleable)
- [x] Search and replace (Cmd+F, Cmd+H)

### File Management

- [x] File browser pane (left sidebar)
- [x] File browser: expand/collapse directories, double-click to set root
- [x] File browser: path navigation with back button, defaults to home directory
- [x] File browser: only markdown files are openable
- [x] Open file from file browser
- [x] Open file from menu / dialog
- [x] Open folder for file browser
- [x] Save / Save As
- [x] Duplicate file
- [x] Recent files in menu
- [x] Tab bar with open files
- [x] Tab close, new tab, switch tabs
- [x] Dirty indicator on tabs (unsaved changes dot)
- [x] Save-before-close confirmation for dirty files
- [x] File watching (detect external changes)
- [x] External change diff view with resolve options
- [x] File browser auto-refresh on file system changes (including subdirectories)

### Preview

- [x] Live markdown preview (right pane)
- [x] Section-based bidirectional synchronized scrolling (editor ↔ preview)
- [x] GitHub Flavored Markdown rendering
- [x] Relative image path resolution in preview (local-resource:// protocol)

### Settings

- [x] Theme: dark / light / system
- [x] Accent color picker (7 colors)
- [x] Font size selector (applies to editor)
- [x] Editor font family selector (system monospace fonts)
- [x] Preview font family selector (system fonts)
- [x] Theme selector: segmented control (Dark / Light / System)
- [x] Toggle: word wrap, line numbers, spell check
- [x] About section with links to mipyip.com and GitHub
- [x] Settings gear in file browser footer

### Build

- [x] App icon (SVG source, icns generation script)
- [x] macOS entitlements plist
- [x] Release script (build + sign + GitHub release)
- [ ] Generate .icns from icon SVG
- [ ] First successful signed build
- [ ] Test on clean macOS install

---

## v0.2.0 — Clickable Links

> Status: **Planned**

- [ ] Preview pane: clickable links to local .md files open in new tab
- [ ] Link resolution: handle relative paths
- [ ] Link resolution: handle directory traversal (`../`, `./`)
- [ ] Link resolution: handle paths relative to open folder root
- [ ] Visual distinction for local vs external links in preview

---

## v0.3.0 — Toolbar Dialogs & Polish

> Status: **Planned**

- [ ] Link button: dialog to enter URL
- [ ] Image button: dialog with "Insert from file" and "Insert URL" options
- [ ] Keyboard shortcuts for formatting (Cmd+B, Cmd+I, etc.)
- [ ] Editor: bracket/quote auto-pairing
- [ ] Auto-save option (with configurable delay)
- [ ] File browser: drag to resize width
- [ ] File browser: right-click context menu (rename, delete, new file)
- [ ] Export to HTML / PDF
- [ ] Performance: large file handling

---

## v0.4.0 — Auto-Updates

> Status: **Planned**

- [ ] electron-updater integration
- [ ] Check for updates on launch (configurable)
- [ ] Update available notification
- [ ] Download and install update flow
- [ ] Update dialog UI

---

## Known Issues

- Relative/local images in preview not rendering (custom protocol registered but images still fail to load)
