# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Multi-window support: Cmd+Shift+N opens a new independent window
- Cmd+W closes the active tab instead of the whole window

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
- Closing dirty tab with "Save" then canceling save dialog no longer discards the tab

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
- Settings panel: theme (dark/light/system), accent color (7 options), font size, font family, word wrap, line numbers, spell check
- About section with links to mipyip.com and GitHub
- Dark and light themes following design standards
- CSS custom properties theming system with 7 accent color options
- macOS window integration: hidden title bar with traffic light positioning
- Application menu: File (new, open, save, duplicate, recent), Edit (undo, redo, find, replace), View, Window, Help
- Window bounds persistence (saves position/size between sessions)
- App icon SVG source and generation script
- electron-builder configuration for macOS with code signing and notarization
- Release script for automated build + sign + GitHub release
