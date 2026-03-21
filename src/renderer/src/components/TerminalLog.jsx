import React, { useEffect, useRef } from 'react'
import { useT } from '../i18n/index.jsx'

const MAX_LINES = 200

function logTypeColor(type) {
  switch (type) {
    case 'info': return '#355b97'
    case 'data': return '#2f7dff'
    case 'warning': return '#c07d11'
    case 'error': return '#b84e4e'
    case 'success': return '#2f9f57'
    case 'phase': return '#7a55c8'
    default: return '#53657f'
  }
}

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

  return (
    <div className="terminal-log panel">
      <div className="panel-header">
        <span>{t('panel_terminal')}</span>
        {isRunning && (
          <span className="terminal-running-badge">
            <span className="blink">●</span> {t('term_running')}
          </span>
        )}
        {status === 'complete' && (
          <span className="terminal-complete-badge">{t('term_completed')}</span>
        )}
        {status === 'error' && (
          <span className="terminal-error-badge">{t('term_error')}</span>
        )}
        <span className="terminal-log-count">{t('term_events', { n: displayLogs.length })}</span>
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
            <span className={`terminal-pill terminal-pill--${entry.type}`}>{entry.type}</span>
            <span
              className="terminal-message"
              style={{ color: logTypeColor(entry.type) }}
            >
              {entry.message}
            </span>
          </div>
        ))}
        {isRunning && (
          <div className="terminal-line">
            <span className="terminal-timestamp">{new Date().toTimeString().slice(0, 8)}</span>
            <span className="terminal-pill terminal-pill--live">live</span>
            <span className="terminal-cursor blink">{t('term_monitoring')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
