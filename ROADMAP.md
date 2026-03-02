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

## v0.1.11 — Security Hardening

> Status: **Planned** — Priority: **IMMEDIATE** (before any wider distribution)
> Source: Adversarial code review (`The_Adversary/reviews/markdown_editor/REPORT.md`)

### Critical (Attack Chain: malicious .md → full filesystem compromise)

- [ ] **C1.** XSS via unsanitized markdown preview — `Preview.jsx` uses `dangerouslySetInnerHTML` with raw `marked` output; any `.md` file with embedded `<script>` or event handlers executes in renderer context. **Fix:** Add DOMPurify before rendering.
- [ ] **C2.** Unrestricted filesystem access via IPC — `file:read`, `file:write`, `file:rename`, `file:create`, `file:mkdir`, `file:trash` accept arbitrary paths with zero validation. **Fix:** Path validation restricting ops to workspace/open-file directories.
- [ ] **C3.** Path traversal in `local-resource://` protocol — no validation, can serve any file on disk (e.g. `local-resource:///etc/passwd`). **Fix:** Restrict to workspace directory + image extensions only.
- [ ] **C5.** `shell.openExternal` accepts arbitrary URL schemes — no validation before passing to OS. **Fix:** Allowlist `https://`, `http://`, `mailto:` only.

### High

- [ ] **H1.** Bypassable regex HTML sanitizer in `UpdateDialog.jsx` — single-quoted attrs, no-quote attrs, `javascript:` hrefs all bypass it. **Fix:** Replace with DOMPurify.
- [ ] **H2.** `sandbox: false` on main BrowserWindow — comment says "needed for chokidar in preload" but chokidar runs in main process. **Fix:** Enable `sandbox: true`, verify IPC still works.
- [ ] **H3.** Missing CSP on settings window (`src/settings/index.html`) and update dialog. **Fix:** Add same CSP meta tag as main renderer.
- [ ] **H4.** `file:resolve-path` IPC handler exposes `path.resolve()` to renderer — aids path traversal. **Fix:** Remove; do path resolution in main process only.
- [ ] **H6.** No debounce on preview rendering — `marked.parse()` runs on every keystroke. **Fix:** Add 150-300ms debounce.

### Medium (Code Quality)

- [ ] **M1.** Duplicate CSS button styles across `app.css` and `update-dialog/styles.css` — extract shared styles
- [ ] **M2.** Test artifact `Architecture_test_second_save.md` in repo root — delete it
- [ ] **M3.** Unused settings standalone window entry point (`src/settings/index.html`, `index.jsx`) — remove
- [ ] **M4.** `release.sh` uses `git add -A` — replace with explicit file staging
- [ ] **M5.** `buildAnchorMap()` rebuilt on every scroll — cache and rebuild only on content change
- [ ] **H5.** Entitlements: verify `disable-library-validation` is actually required, remove if not

### Low / Deferred

- [ ] **L1.** No test framework — add Vitest
- [ ] **L2.** No linting — add ESLint + Prettier
- [ ] **M8/M9.** Decompose `App.jsx` (643 lines) and `FileBrowser.jsx` (505 lines) into custom hooks

---

## v0.2.0 — Clickable Links

> Status: **Planned**

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
- [ ] Keyboard shortcuts for formatting (Cmd+B, Cmd+I, etc.)
- [ ] Editor: bracket/quote auto-pairing
- [ ] Auto-save option (with configurable delay)
- [ ] File browser: drag to resize width
- [ ] Export to HTML / PDF
- [ ] Performance: large file handling
