# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.26] - 2026-03-02

### Fixed

- Button styles not loading in Settings/About and update dialog (CSS `@import` must be before all rules)
- Exposed "Check for Updates" in preload bridge for renderer access

### Added

- "Check for Updates" button in Settings About section

## [0.1.10] - 2026-03-01

### Added

- Auto-updates: electron-updater integration with GitHub Releases
- Check for Updates menu item (app menu → Check for Updates...)
- Update available dialog with release notes, download button, and progress bar
- Update downloaded dialog with Restart & Install option
- "What's New" dialog shown after update restart with release notes
- Generated .icns app icon from SVG source (automated script via qlmanage + sips + iconutil)
- Vite multi-entry build (renderer + update dialog)

### Fixed

- Relative/local images in preview now render correctly (added `local-resource:` to CSP img-src)

## [0.1.9] - 2026-03-01

### Fixed

- Editor font: explicitly set font-family on CodeMirror content and scroller elements (attempt to fix font not applying)

### Removed

- Spell check setting (was never wired to CodeMirror; removed toggle from settings)
- Word wrap setting (was never wired to CodeMirror; word wrap is now always on)

## [0.1.8] - 2026-03-01

### Added

- Dirty check on window close: prompts to save each unsaved tab before closing the window
- Close Window shortcut (Cmd+Shift+W) in File menu
- Formatting toggle: bold, italic, strikethrough, and code buttons now remove formatting if already applied to selection
- Heading buttons cycle: recognize existing heading level on the line — same level toggles off, different level swaps
- List buttons work on multi-line selections and toggle off when re-clicked
- Numbered lists continue numbering from preceding list items
- List buttons swap type (e.g. select bulleted lines → click numbered → swaps to numbered)

## [0.1.7] - 2026-03-01

### Added

- File browser: "Move to Trash" context menu option for files
- File browser: "Show in Finder" context menu option for files and folders
- Multi-window session restore: each window's tabs and folder are preserved on quit and restored on relaunch

### Fixed

- Editor font family setting not applying (CodeMirror now rebuilds with literal font values instead of CSS variables)
- New window (Cmd+Shift+N) now opens fresh with an empty Untitled tab instead of cloning the current window's state

## [0.1.6] - 2026-03-01

### Fixed

- Directory watcher errors (EACCES/EAGAIN) when browsing near system directories like /dev
- New file context menu action not showing inline rename input
- Rename not refreshing file browser tree to reflect new name

## [0.1.5] - 2026-03-01

### Added

- File browser: active file is auto-revealed and highlighted when switching tabs
- Session restore: open tabs, active tab, and folder path persist across app restarts
- File browser: right-click context menu with New Markdown File, New Folder, and Rename
- File browser: inline rename editing for files and folders
- MIT LICENSE file

## [0.1.4] - 2026-03-01

### Fixed

- Closing dirty tab with "Save" then canceling save dialog no longer discards the tab

## [0.1.3] - 2026-03-01

### Added

- Multi-window support: Cmd+Shift+N opens a new independent window

## [0.1.2] - 2026-03-01

### Fixed

- Cmd+W closes the active tab instead of the whole window

## [0.1.1] - 2026-03-01

### Added

- Save-before-close confirmation dialog for dirty files
- Bidirectional synchronized scrolling between editor and preview using section-based anchor mapping
- File browser auto-refreshes expanded subdirectories when file system changes are detected
- File browser defaults to home directory (~) with path navigation and back button
- File browser: double-click directories to set as root
- Relative image path resolution in preview via `local-resource://` custom protocol
- Preview font family selector (system fonts: Helvetica Neue, Georgia, Palatino, Avenir Next, Charter)
- Theme selector: segmented control (Dark / Light / System) matching design standards
- Editor font family options switched to system monospace fonts (SF Mono, Menlo, Monaco, Courier New, Andale Mono)

### Changed

- Accent color swatches restyled from circles to rounded squares
- Non-markdown files in file browser are now dimmed and non-clickable

### Fixed

- EMFILE crash when opening folders with many files (reduced watch depth, added ignore patterns)
- Title bar drag region: empty space between tabs is now draggable to move the window
- Text selection visibility: increased selection highlight contrast and reduced active line highlight opacity
- File browser not updating after duplicating/saving new files
- Font size setting not applying to editor
- Font family setting not applying to editor
- Preview font family now respects settings

## [0.1.0] - 2026-03-01

### Added

- Initial application scaffold: Electron main process, React renderer, Vite build
- CodeMirror 6 markdown editor with syntax highlighting
- Live markdown preview pane with GitHub Flavored Markdown
- Synchronized scrolling between editor and preview
- Formatting toolbar: bold, italic, strikethrough, headings (H1-H3), bullet list, numbered list, blockquote, inline code, code block, link, image, horizontal rule
- Toolbar formatting works with text selection (wraps) and without (inserts markers at cursor)
- File browser pane with expandable directory tree
- Tab bar with multiple open files, close buttons, new tab button
- Dirty indicator (dot) on tabs with unsaved changes
- File operations: open file, open folder, save, save as, duplicate
- Recent files in application menu
- File watching via chokidar: detects external changes to open files
- External change resolution: diff view with options to keep current, save as new, or accept external
- Search and replace (Cmd+F / Cmd+H) with case sensitivity toggle, match count, navigation
- Settings panel: theme (dark/light/system), accent color (7 options), font size, font family, line numbers
- About section with links to mipyip.com and GitHub
- Dark and light themes following design standards
- CSS custom properties theming system with 7 accent color options
- macOS window integration: hidden title bar with traffic light positioning
- Application menu: File (new, open, save, duplicate, recent), Edit (undo, redo, find, replace), View, Window, Help
- Window bounds persistence (saves position/size between sessions)
- App icon SVG source and generation script
- electron-builder configuration for macOS with code signing and notarization
- Release script for automated build + sign + GitHub release
