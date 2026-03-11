import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function SearchReplace({ editorRef, showReplace, onClose, onSearchChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef(null);
  const matchPositions = useRef([]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ── Notify parent of search state for preview highlighting ──
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(searchTerm ? { term: searchTerm, caseSensitive, currentMatch } : null);
    }
  }, [searchTerm, caseSensitive, currentMatch, onSearchChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => onSearchChange?.(null);
  }, [onSearchChange]);

  const findMatches = useCallback(() => {
    const view = editorRef.current?.getView();
    if (!view || !searchTerm) {
      setMatchCount(0);
      setCurrentMatch(0);
      matchPositions.current = [];
      return;
    }

    const doc = view.state.doc.toString();
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    const positions = [];
    let match;

    while ((match = regex.exec(doc)) !== null) {
      positions.push({ from: match.index, to: match.index + match[0].length });
    }

    matchPositions.current = positions;
    setMatchCount(positions.length);
    if (positions.length > 0 && currentMatch === 0) {
      setCurrentMatch(1);
      highlightMatch(positions[0], view);
    } else if (positions.length === 0) {
      setCurrentMatch(0);
    }
  }, [searchTerm, caseSensitive, editorRef, currentMatch]);

  useEffect(() => {
    findMatches();
  }, [searchTerm, caseSensitive, findMatches]);

  const highlightMatch = (pos, view) => {
    if (!view || !pos) return;
    view.dispatch({
      selection: { anchor: pos.from, head: pos.to },
      scrollIntoView: true,
    });
  };

  const goToNext = () => {
    if (matchCount === 0) return;
    const next = currentMatch >= matchCount ? 1 : currentMatch + 1;
    setCurrentMatch(next);
    const view = editorRef.current?.getView();
    highlightMatch(matchPositions.current[next - 1], view);
  };

  const goToPrev = () => {
    if (matchCount === 0) return;
    const prev = currentMatch <= 1 ? matchCount : currentMatch - 1;
    setCurrentMatch(prev);
    const view = editorRef.current?.getView();
    highlightMatch(matchPositions.current[prev - 1], view);
  };

  const replaceOne = () => {
    const view = editorRef.current?.getView();
    if (!view || matchCount === 0 || currentMatch === 0) return;

    const pos = matchPositions.current[currentMatch - 1];
    if (!pos) return;

    view.dispatch({
      changes: { from: pos.from, to: pos.to, insert: replaceTerm },
    });

    // Re-find after replace
    setTimeout(() => findMatches(), 10);
  };

  const replaceAll = () => {
    const view = editorRef.current?.getView();
    if (!view || matchCount === 0) return;

    // Replace from end to start to preserve positions
    const changes = [...matchPositions.current].reverse().map((pos) => ({
      from: pos.from,
      to: pos.to,
      insert: replaceTerm,
    }));

    view.dispatch({ changes });
    setTimeout(() => findMatches(), 10);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  return (
    <div className="search-replace" onKeyDown={handleKeyDown}>
      <div className="search-row">
        <input
          ref={searchInputRef}
          className="search-input"
          type="text"
          placeholder="Find..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="search-count">
          {searchTerm ? `${currentMatch}/${matchCount}` : ''}
        </span>
        <button className="search-btn" onClick={goToPrev} title="Previous (Shift+Enter)" disabled={matchCount === 0}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" /></svg>
        </button>
        <button className="search-btn" onClick={goToNext} title="Next (Enter)" disabled={matchCount === 0}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
        </button>
        <button
          className={`search-btn ${caseSensitive ? 'active' : ''}`}
          onClick={() => setCaseSensitive((v) => !v)}
          title="Case sensitive"
        >
          Aa
        </button>
        <button className="search-btn search-close" onClick={onClose} title="Close (Esc)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
        </button>
      </div>
      {showReplace && (
        <div className="replace-row">
          <input
            className="search-input"
            type="text"
            placeholder="Replace..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
          />
          <button className="search-btn" onClick={replaceOne} title="Replace" disabled={matchCount === 0}>
            Replace
          </button>
          <button className="search-btn" onClick={replaceAll} title="Replace all" disabled={matchCount === 0}>
            All
          </button>
        </div>
      )}
    </div>
  );
}
