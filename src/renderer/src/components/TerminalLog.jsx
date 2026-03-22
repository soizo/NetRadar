import React, { useEffect, useRef } from 'react'
import { useT } from '../i18n/index.jsx'
import { logTypeColor } from '../utils/uiPalette.js'

const MAX_LINES = 200

export default function TerminalLog({ logs = [], status }) {
  const { t } = useT()
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const displayLogs = logs.slice(-MAX_LINES)
  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)
  const stateKey = isRunning ? 'running' : status === 'complete' ? 'complete' : status === 'error' ? 'error' : 'idle'
  const stateLabel = isRunning ? t('term_running') : status === 'complete' ? t('term_completed') : status === 'error' ? t('term_error') : t('phase_idle')

  return (
    <div className="terminal-log panel">
      <div className="panel-header">{t('panel_terminal')}</div>
      <div className="panel-body terminal-log-shell">
        <div className="terminal-log-toolbar">
          <span className={`terminal-status-dot terminal-status-dot--${stateKey} ${isRunning ? 'blink' : ''}`} />
          <span className={`terminal-log-state terminal-log-state--${stateKey}`}>{stateLabel}</span>
          <span className="terminal-log-count">{t('term_events', { n: displayLogs.length })}</span>
        </div>
        <div className="terminal-log-columns" aria-hidden="true">
          <span>{t('term_col_time')}</span>
          <span>{t('term_col_type')}</span>
          <span>{t('term_col_message')}</span>
        </div>
        <div className="terminal-log-body" ref={containerRef}>
          {displayLogs.length === 0 && (
            <div className="terminal-empty">
              <div className="terminal-empty__title">{t('term_empty_title')}</div>
              <div className="terminal-empty__text">{t('term_empty_text')}</div>
            </div>
          )}
          {displayLogs.map((entry, idx) => (
            <div key={idx} className="terminal-line">
              <span className="terminal-timestamp">{entry.time}</span>
              <span className={`terminal-kind terminal-kind--${entry.type}`}>{entry.type}</span>
              <span
                className="terminal-message"
                style={{ color: logTypeColor(entry.type) }}
              >
                {entry.message}
              </span>
            </div>
          ))}
          {isRunning && (
            <div className="terminal-line terminal-line--live">
              <span className="terminal-timestamp">{new Date().toTimeString().slice(0, 8)}</span>
              <span className="terminal-kind terminal-kind--live">live</span>
              <span className="terminal-cursor blink">{t('term_monitoring')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
