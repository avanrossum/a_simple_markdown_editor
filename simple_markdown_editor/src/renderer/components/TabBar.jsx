import React, { useRef, useEffect } from 'react';

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }) {
  const tabListRef = useRef(null);

  // ── Auto-scroll active tab into view ──
  useEffect(() => {
    if (!tabListRef.current || !activeTabId) return;
    const activeEl = tabListRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [activeTabId, tabs.length]);

  return (
    <div className="tab-bar">
      <div className="tab-list" ref={tabListRef}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            className={`tab ${tab.id === activeTabId ? 'tab--active' : ''} ${tab.dirty ? 'tab--dirty' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="tab-name">{tab.name}</span>
            {tab.dirty && <span className="tab-dirty-dot" />}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="Close tab"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button className="tab-new" onClick={onNewTab} title="New file">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    </div>
  );
}
