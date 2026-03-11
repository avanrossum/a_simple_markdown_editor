import React, { useState, useRef, useEffect, useCallback } from 'react';

const { electronAPI } = window;

export default function FindInFolder({ folderPath, onOpenFile, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState([]);
  const [fileMatches, setFileMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Debounced Search ──

  const doSearch = useCallback(async (term) => {
    if (!term || !term.trim()) {
      setResults([]);
      setFileMatches([]);
      setStats(null);
      return;
    }

    setLoading(true);
    const result = await electronAPI.searchInFolder(folderPath, term, { caseSensitive });
    setLoading(false);

    if (result.success) {
      setResults(result.results);
      setFileMatches(result.fileMatches);
      setStats(result.stats);
    }
  }, [folderPath, caseSensitive]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchTerm), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, doSearch]);

  // ── Keyboard ──

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  // ── Click Result ──

  const handleResultClick = (filePath) => {
    onOpenFile(filePath);
    onClose();
  };

  // ── Group content results by file ──

  const groupedResults = [];
  let lastFile = null;
  for (const r of results) {
    if (r.filePath !== lastFile) {
      groupedResults.push({ type: 'file', filePath: r.filePath, fileName: r.fileName });
      lastFile = r.filePath;
    }
    groupedResults.push({ type: 'line', ...r });
  }

  // Folder display name
  const folderName = folderPath.split('/').filter(Boolean).pop() || folderPath;

  // Get path relative to search folder
  const relativePath = (fullPath) => {
    if (fullPath.startsWith(folderPath + '/')) {
      return fullPath.slice(folderPath.length + 1);
    }
    return fullPath;
  };

  // Highlight matching text in a string
  const highlightTerm = (text, term) => {
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, caseSensitive ? 'g' : 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="fif-match">{part}</mark> : part
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal fif-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fif-header">
          <h2>Find in Folder</h2>
          <span className="fif-folder-name" title={folderPath}>{folderName}</span>
        </div>

        {/* Search Input */}
        <div className="fif-search-row">
          <input
            ref={inputRef}
            className="fif-input"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`search-btn ${caseSensitive ? 'active' : ''}`}
            onClick={() => setCaseSensitive((v) => !v)}
            title="Case sensitive"
          >
            Aa
          </button>
        </div>

        {/* Results */}
        <div className="fif-results">
          {loading && <div className="fif-status">Searching...</div>}

          {!loading && searchTerm && fileMatches.length === 0 && results.length === 0 && (
            <div className="fif-status">No matches found</div>
          )}

          {/* Filename matches */}
          {fileMatches.length > 0 && (
            <div className="fif-section">
              <div className="fif-section-label">Filename matches</div>
              {fileMatches.map((fm, i) => (
                <div
                  key={`fn-${i}`}
                  className="fif-file-result"
                  onClick={() => handleResultClick(fm.filePath)}
                  title={fm.filePath}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="fif-icon">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                  </svg>
                  <div className="fif-file-info">
                    <span>{highlightTerm(fm.fileName, searchTerm)}</span>
                    <span className="fif-path">{relativePath(fm.filePath)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content matches */}
          {groupedResults.length > 0 && (
            <div className="fif-section">
              <div className="fif-section-label">Content matches</div>
              {groupedResults.map((item, i) => {
                if (item.type === 'file') {
                  return (
                    <div key={`fh-${i}`} className="fif-file-header" title={item.filePath}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="fif-icon">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                      </svg>
                      <span>{relativePath(item.filePath)}</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`cl-${i}`}
                    className="fif-line-result"
                    onClick={() => handleResultClick(item.filePath)}
                  >
                    <span className="fif-line-number">{item.lineNumber}</span>
                    <span className="fif-line-text">{highlightTerm(item.lineText, searchTerm)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {stats && (
          <div className="fif-footer">
            <span>
              {stats.matchCount} match{stats.matchCount !== 1 ? 'es' : ''} in {stats.filesScanned} file{stats.filesScanned !== 1 ? 's' : ''}
            </span>
            {stats.capped && <span className="fif-warning">Results limited — narrow your search</span>}
          </div>
        )}
      </div>
    </div>
  );
}
