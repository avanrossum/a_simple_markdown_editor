import React, { useState, useCallback } from 'react';

const { electronAPI } = window;

export default function PreviewHeader({ filePath }) {
  const [copied, setCopied] = useState(false);

  const handleShowInFinder = useCallback(() => {
    if (filePath) {
      electronAPI.showInFolder(filePath);
    }
  }, [filePath]);

  const handleCopyPath = useCallback(async () => {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail
    }
  }, [filePath]);

  return (
    <div className="preview-header">
      <span className="preview-header-path" title={filePath || 'Untitled'}>
        {filePath || 'Untitled'}
      </span>
      {filePath && (
        <div className="preview-header-actions">
          <button
            className="preview-header-btn"
            onClick={handleShowInFinder}
            title="Show in Finder"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </button>
          <button
            className={`preview-header-btn${copied ? ' copied' : ''}`}
            onClick={handleCopyPath}
            title={copied ? 'Copied!' : 'Copy Path'}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
