import React, { useState } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const platform = typeof window !== 'undefined' && window.api ? window.api.platform : 'unknown'
  const isMac = platform === 'darwin'

  const api = window.api || {}

  function handleMinimize() {
    if (api.windowMinimize) api.windowMinimize()
  }

  function handleMaximize() {
    setIsMaximized(prev => !prev)
    if (api.windowMaximize) api.windowMaximize()
  }

  function handleClose() {
    if (api.windowClose) api.windowClose()
  }

  const controls = (
    <div className="titlebar-controls" style={{ flexDirection: isMac ? 'row-reverse' : 'row' }}>
      <button
        className="titlebar-btn titlebar-btn--close"
        onClick={handleClose}
        title="Close"
        aria-label="Close window"
      >
        <span className="titlebar-btn-icon">×</span>
      </button>
      <button
        className="titlebar-btn titlebar-btn--maximize"
        onClick={handleMaximize}
        title={isMaximized ? 'Restore' : 'Maximize'}
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
      >
        <span className="titlebar-btn-icon">{isMaximized ? '❐' : '□'}</span>
      </button>
      <button
        className="titlebar-btn titlebar-btn--minimize"
        onClick={handleMinimize}
        title="Minimize"
        aria-label="Minimize window"
      >
        <span className="titlebar-btn-icon">−</span>
      </button>
    </div>
  )

  return (
    <div className="titlebar">
      {isMac && controls}
      <div className="titlebar-brand">
        <span className="titlebar-icon">◈</span>
        <span className="titlebar-title">NetRadar</span>
        <span className="titlebar-version">v1.0.0</span>
        <span className="titlebar-separator">|</span>
        <span className="titlebar-subtitle">NETWORK DIAGNOSTICS</span>
      </div>
      {!isMac && controls}
    </div>
  )
}
