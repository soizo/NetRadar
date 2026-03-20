import React from 'react'

const TABS = [
  { id: 'dashboard', label: 'DASHBOARD', icon: '⬡' },
  { id: 'history', label: 'HISTORY', icon: '◈' },
  { id: 'config', label: 'CONFIG', icon: '⚙' }
]

export default function Navbar({ currentView, onNavigate }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-prefix">{'>'}_</span>
      </div>
      <div className="navbar-tabs">
        {TABS.map((tab, idx) => (
          <React.Fragment key={tab.id}>
            {idx > 0 && <span className="navbar-divider">│</span>}
            <button
              className={`navbar-tab ${currentView === tab.id ? 'navbar-tab--active' : ''}`}
              onClick={() => onNavigate(tab.id)}
              aria-current={currentView === tab.id ? 'page' : undefined}
            >
              <span className="navbar-tab-icon">{tab.icon}</span>
              <span className="navbar-tab-label">{tab.label}</span>
              {currentView === tab.id && <span className="navbar-tab-indicator">◂</span>}
            </button>
          </React.Fragment>
        ))}
      </div>
      <div className="navbar-right">
        <span className="navbar-status">
          <span className="navbar-status-dot blink">■</span>
          READY
        </span>
      </div>
    </nav>
  )
}
