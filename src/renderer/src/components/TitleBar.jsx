import React, { useState } from 'react'
import { useT } from '../i18n/index.jsx'

export default function TitleBar({ currentView = 'dashboard', status = 'idle' }) {
  const { t } = useT()
  const [isMaximized, setIsMaximized] = useState(false)
  const platform = typeof window !== 'undefined' && window.api ? window.api.platform : 'unknown'
  const isMac = platform === 'darwin'

  const api = window.api || {}

  const VIEW_TITLES = {
    dashboard: t('view_dashboard'),
    history: t('view_history'),
    config: t('view_config')
  }

  const STATUS_LABELS = {
    idle: t('st_idle'),
    latency: t('st_latency'),
    download: t('st_download'),
    upload: t('st_upload'),
    scoring: t('st_scoring'),
    complete: t('st_complete'),
    error: t('st_error')
  }

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
    <div className="titlebar-controls">
      <button
        className="titlebar-btn titlebar-btn--close"
        onClick={handleClose}
        title={t('tb_close')}
        aria-label={t('tb_close')}
      >
        <span className="titlebar-btn-icon">×</span>
      </button>
      <button
        className="titlebar-btn titlebar-btn--maximize"
        onClick={handleMaximize}
        title={isMaximized ? t('tb_restore') : t('tb_maximize')}
        aria-label={isMaximized ? t('tb_restore') : t('tb_maximize')}
      >
        <span className="titlebar-btn-icon">{isMaximized ? '❐' : '□'}</span>
      </button>
      <button
        className="titlebar-btn titlebar-btn--minimize"
        onClick={handleMinimize}
        title={t('tb_minimize')}
        aria-label={t('tb_minimize')}
      >
        <span className="titlebar-btn-icon">−</span>
      </button>
    </div>
  )

  return (
    <div className={`titlebar ${isMac ? 'titlebar--mac' : 'titlebar--win'}`}>
      {isMac && controls}
      <div className="titlebar-brand">
        <span className="titlebar-icon" aria-hidden="true">
          <span className="titlebar-icon__screen" />
          <span className="titlebar-icon__screen titlebar-icon__screen--secondary" />
        </span>
        <div className="titlebar-copy">
          <span className="titlebar-title">{VIEW_TITLES[currentView] || VIEW_TITLES.dashboard}</span>
          <span className="titlebar-view">{t('app_name')}</span>
        </div>
      </div>
      <div className="titlebar-meta">
        <span className="titlebar-version">{t('tb_version')}</span>
        <span className={`titlebar-status titlebar-status--${status}`}>
          {STATUS_LABELS[status] || STATUS_LABELS.idle}
        </span>
      </div>
      {!isMac && controls}
    </div>
  )
}
