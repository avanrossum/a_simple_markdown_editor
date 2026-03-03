# Roadmap

## v0.1.0 — Functional Application

> Status: **Complete**

### Core

- [x] Electron app scaffold (main process, renderer, preload, IPC)
- [x] Vite build setup for renderer
- [x] electron-builder config with macOS signing
- [x] Application menu (File, Edit, View, Window, Help)
- [x] Settings persistence (JSON store)
- [x] Window bounds save/restore
- [x] Multi-window support (Cmd+Shift+N)
- [x] Cmd+W closes tab (not window)
- [x] New window (Cmd+Shift+N) opens fresh (empty Untitled tab, no restored state)
- [x] Multi-window session restore (all open windows preserved and restored on quit/relaunch)
- [x] Dirty check on window close (prompt to save unsaved tabs before closing window)
- [x] Close Window shortcut (Cmd+Shift+W)

### Editor

- [x] CodeMirror 6 markdown editor
- [x] Markdown syntax highlighting
- [x] Formatting toolbar (bold, italic, strikethrough, headings, lists, code, links, images, hr)
- [x] Toolbar works with selection (wrap) and without (insert markers)
- [x] Formatting toggle: wrap buttons (bold, italic, etc.) remove formatting if already applied
- [x] Heading buttons cycle: recognize existing heading, shift level, toggle off if same
- [x] List buttons: multi-line support (apply to all selected lines, toggle off on re-click)
- [x] Numbered lists: continue numbering from preceding list items
- [x] List buttons: swap type (e.g. bullet → numbered) when re-clicking with different type
- [x] Line numbers (toggleable)
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
- [x] File browser: reveal and highlight active file when switching tabs
- [x] File browser: right-click context menu (new markdown file, new folder, rename)
- [x] File browser: inline rename for files and folders
- [x] Session restore (persist open tabs, active tab, folder path across restarts)
- [x] File browser: delete file (move to trash) via context menu
- [x] File browser: "Show in Finder" context menu option

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
- [x] Fix: editor font family setting not applying to CodeMirror
- [x] Preview font family selector (system fonts)
- [x] Theme selector: segmented control (Dark / Light / System)
- [x] Toggle: line numbers
- [x] About section with links to mipyip.com and GitHub
- [x] Settings gear in file browser footer

### Build

- [x] App icon (SVG source, icns generation script)
- [x] macOS entitlements plist
- [x] Release script (build + sign + GitHub release)
- [x] Generate .icns from icon SVG
- [x] First successful build (unsigned)
- [x] First successful signed build
- [ ] Test on clean macOS install

### Auto-Updates

- [x] electron-updater integration
- [x] Check for updates on launch and periodically (every 4 hours)
- [x] Check for Updates menu item
- [x] Update available dialog with release notes and download button
- [x] Download progress bar
- [x] Update downloaded dialog (Restart & Install)
- [x] "What's New" dialog shown after update restart

---

## v0.1.11–0.1.22 — Security Hardening

> Status: **Complete** (Critical, High, Medium all resolved)
> Source: Adversarial code review (`The_Adversary/reviews/markdown_editor/REPORT.md`)

### Critical (Attack Chain: malicious .md → full filesystem compromise)

- [x] **C1.** XSS via unsanitized markdown preview — added DOMPurify before `dangerouslySetInnerHTML`
- [x] **C2.** Unrestricted filesystem access via IPC — added `isPathAllowed()` validation (home + /Volumes, blocks .ssh/.gnupg/.aws etc.)
- [x] **C3.** Path traversal in `local-resource://` protocol — restricted to image extensions under home/Volumes
- [x] **C5.** `shell.openExternal` arbitrary schemes — allowlisted `https:`, `http:`, `mailto:` only

### High

- [x] **H1.** Bypassable regex sanitizer in `UpdateDialog.jsx` — replaced with DOMPurify
- [x] **H2.** `sandbox: false` on main BrowserWindow — enabled `sandbox: true` (chokidar runs in main, not preload)
- [x] **H3.** Missing CSP on settings window — removed dead standalone entry; tightened update dialog CSP
- [x] **H4.** `file:resolve-path` exposed `path.resolve()` — removed (was never called from renderer)
- [x] **H5.** Entitlements: verified all 3 (allow-jit, unsigned-executable-memory, disable-library-validation) are required for Electron
- [x] **H6.** No debounce on preview rendering — added 150ms debounce

### Medium (Code Quality)

- [x] **M1.** Duplicate CSS button styles — extracted to shared `buttons.css`
- [x] **M2.** Test artifact `Architecture_test_second_save.md` — deleted
- [x] **M3.** Unused settings standalone entry point — removed `index.html` + `index.jsx`
- [x] **M4.** `release.sh` `git add -A` — replaced with explicit `package.json package-lock.json` staging
- [x] **M5.** `buildAnchorMap()` rebuilt on every scroll — cached in ref, rebuilt only on content change

### Low / Deferred

- [ ] **L1.** No test framework — add Vitest
- [ ] **L2.** No linting — add ESLint + Prettier
- [ ] **M8/M9.** Decompose `App.jsx` (643 lines) and `FileBrowser.jsx` (505 lines) into custom hooks

---

## v0.1.23–0.1.24 — Preview Header & Scroll Fix

> Status: **Complete**

- [x] Preview pane header bar: show full file path in the empty space above the preview (mirrors toolbar height), with "Show in Finder" and "Copy Path" buttons
- [x] Scroll sync fix: when scrolling editor to the very top, preview should also scroll to top — snaps to 0 when sourceScroll ≤ 0

---

## v0.2.0 — Favorites, Keyboard Shortcuts & Clickable Links

> Status: **In Progress**

### Favorites

- [x] Favorites panel above file browser (pin files and folders for quick access)
- [x] Click favorite folder → opens in file browser; click file → opens in editor
- [x] Drag-and-drop reordering within favorites
- [x] Stale path detection (muted/italic for missing paths)
- [x] Right-click context menu: "Add to Favorites" / "Remove from Favorites" in file tree
- [x] Right-click context menu: "Remove from Favorites" in favorites panel
- [x] "Copy Path" context menu option for files and folders in file tree

### Resizable Panes

- [x] Draggable resize handle between file browser and editor (6px visible bar, col-resize cursor)
- [x] Draggable resize handle between editor and preview panes
- [x] Editor/preview handle snaps to center with 4px buffer zone
- [x] File browser width constrained to 120–360px range
- [x] Both resize positions persist to settings and sync across windows

### Keyboard Shortcuts

- [ ] Bold (Cmd+B)
- [ ] Italic (Cmd+I)
- [ ] Strikethrough (Cmd+Shift+X)
- [ ] Inline code (Cmd+E)
- [ ] Code block (Cmd+Shift+C)
- [ ] Heading cycle (Cmd+Shift+H or similar)
- [ ] Bullet list (Cmd+Shift+L)
- [ ] Numbered list (Cmd+Shift+O)
- [ ] Link (Cmd+K)
- [ ] Horizontal rule (Cmd+Shift+-)
- [ ] Blockquote (Cmd+Shift+.)

### Clickable Links

- [ ] File browser: delete folder (move to trash) via context menu
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
- [ ] Editor: bracket/quote auto-pairing
- [ ] Auto-save option (with configurable delay)
- [ ] File browser: drag to resize width
- [ ] Export to HTML / PDF
- [ ] Performance: large file handling

---

## v0.4.0 — TypeScript Migration

> Status: **Planned**

- [ ] Add TypeScript config (`tsconfig.json`) and build tooling
- [ ] Migrate main process modules (main.js, ipc-handlers.js, store.js, etc.)
- [ ] Migrate renderer components (App, Editor, Preview, FileBrowser, etc.)
- [ ] Migrate settings and update-dialog entry points
- [ ] Migrate preload scripts
- [ ] Add type definitions for IPC channels and electronAPI bridge
