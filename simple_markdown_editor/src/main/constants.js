// ── Theme Background Colors ──
// Used to set window background before renderer loads (prevents flash)
const THEME_BG_COLORS = {
  dark: '#1a1d23',
  light: '#f5f5f7',
};

// ── Window Defaults ──
const WINDOW_DEFAULTS = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 500,
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 750,
};

const SETTINGS_WINDOW = {
  WIDTH: 500,
  HEIGHT: 520,
};

const UPDATE_DIALOG_SIZE = {
  WIDTH: 460,
  HEIGHT: 400,
};

// ── Timing ──
const TIMING = {
  SAVE_DEBOUNCE_MS: 300,
  BOUNDS_SAVE_DEBOUNCE_MS: 500,
  FILE_WATCH_DEBOUNCE_MS: 500,
  UPDATE_CHECK_DELAY_MS: 3000,
  UPDATE_CHECK_INTERVAL_MS: 4 * 60 * 60 * 1000,
};

// ── Default Settings ──
const DEFAULT_SETTINGS = {
  theme: 'system',
  accentColor: 'blue',
  fontSize: 14,
  fontFamily: 'default',
  showLineNumbers: true,
  autoSave: false,
  autoSaveDelay: 5000,
  fileBrowserWidth: 180,
  editorSplit: 0.5,
  recentFiles: [],
  recentDirectories: [],
  windowBounds: null,
  favorites: [],
};

module.exports = {
  THEME_BG_COLORS,
  WINDOW_DEFAULTS,
  SETTINGS_WINDOW,
  UPDATE_DIALOG_SIZE,
  TIMING,
  DEFAULT_SETTINGS,
};
