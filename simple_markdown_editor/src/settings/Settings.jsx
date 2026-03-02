import React, { useState, useEffect } from 'react';

const { electronAPI } = window;

const ACCENT_COLORS = ['blue', 'purple', 'pink', 'red', 'orange', 'amber', 'green'];

const EDITOR_FONT_OPTIONS = [
  { value: 'default', label: 'SF Mono (Default)' },
  { value: "'Menlo', monospace", label: 'Menlo' },
  { value: "'Monaco', monospace", label: 'Monaco' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: "'Andale Mono', monospace", label: 'Andale Mono' },
];

const PREVIEW_FONT_OPTIONS = [
  { value: 'default', label: 'System (Default)' },
  { value: "'Helvetica Neue', Helvetica, sans-serif", label: 'Helvetica Neue' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Palatino', 'Palatino Linotype', serif", label: 'Palatino' },
  { value: "'Avenir Next', 'Avenir', sans-serif", label: 'Avenir Next' },
  { value: "'Charter', serif", label: 'Charter' },
];

const THEME_OPTIONS = ['dark', 'light', 'system'];

export default function Settings({ settings: initialSettings, onClose }) {
  const [settings, setSettings] = useState(initialSettings);
  const [version, setVersion] = useState('');

  useEffect(() => {
    electronAPI.getVersion().then(setVersion);
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    electronAPI.setSetting(key, value);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        {/* ── Appearance ── */}
        <div className="settings-section">
          <div className="settings-section-title">Appearance</div>

          <div className="settings-row">
            <label>Theme</label>
            <div className="segmented-control">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t}
                  className={`segmented-option ${settings.theme === t ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <label>Accent color</label>
            <div className="accent-picker">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  className={`accent-swatch ${settings.accentColor === color ? 'active' : ''}`}
                  data-color={color}
                  onClick={() => updateSetting('accentColor', color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Editor ── */}
        <div className="settings-section">
          <div className="settings-section-title">Editor</div>

          <div className="settings-row">
            <label>Font size</label>
            <select
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
            >
              {[11, 12, 13, 14, 15, 16, 18, 20].map((size) => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <label>Editor font</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSetting('fontFamily', e.target.value)}
            >
              {EDITOR_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <label>Preview font</label>
            <select
              value={settings.previewFontFamily || 'default'}
              onChange={(e) => updateSetting('previewFontFamily', e.target.value)}
            >
              {PREVIEW_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <label>Line numbers</label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.showLineNumbers}
                onChange={(e) => updateSetting('showLineNumbers', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

        </div>

        {/* ── About ── */}
        <div className="settings-section">
          <div className="settings-section-title">About</div>

          <div className="settings-row">
            <div>
              <label>Simple Markdown Editor</label>
              <div className="hint">v{version || '0.1.0'}</div>
            </div>
          </div>

          <div className="settings-row">
            <button
              className="btn btn-ghost"
              onClick={() => electronAPI.openExternal('https://mipyip.com')}
            >
              mipyip.com
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => electronAPI.openExternal('https://github.com/avanrossum/simple-markdown-editor')}
            >
              GitHub
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => electronAPI.checkForUpdates()}
            >
              Check for Updates
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
