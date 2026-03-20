import React, { useEffect, useRef } from 'react'

const MAX_LINES = 200

function logTypeColor(type) {
  switch (type) {
    case 'info': return 'var(--text-primary)'
    case 'data': return 'var(--accent-cyan)'
    case 'warning': return 'var(--accent-amber)'
    case 'error': return 'var(--accent-red)'
    case 'success': return '#aaff00'
    case 'phase': return '#bf00ff'
    default: return 'var(--text-secondary)'
  }
}

export default function TerminalLog({ logs = [], status }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const displayLogs = logs.slice(-MAX_LINES)

  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)

  return (
    <div className="terminal-log panel">
      <div className="panel-header">
        <span>TERMINAL OUTPUT</span>
        {isRunning && (
          <span className="terminal-running-badge">
            <span className="blink">■</span> RUNNING
          </span>
        )}
        {status === 'complete' && (
          <span className="terminal-complete-badge">✓ COMPLETE</span>
        )}
        {status === 'error' && (
          <span className="terminal-error-badge">✗ ERROR</span>
        )}
        <span className="terminal-log-count">[{displayLogs.length} lines]</span>
      </div>
      <div className="terminal-log-body" ref={containerRef}>
        {displayLogs.length === 0 && (
          <div className="terminal-empty">
            <span style={{ color: 'var(--text-muted)' }}>
              {'>'} Awaiting test initialization...
            </span>
          </div>
        )}
        {displayLogs.map((entry, idx) => (
          <div key={idx} className="terminal-line">
            <span className="terminal-timestamp">[{entry.time}]</span>
            <span className="terminal-prompt"> {'>'} </span>
            <span
              className="terminal-message"
              style={{ color: logTypeColor(entry.type) }}
            >
              {entry.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
        {isRunning && (
          <div className="terminal-line">
            <span className="terminal-timestamp">[{new Date().toTimeString().slice(0, 8)}]</span>
            <span className="terminal-prompt"> {'>'} </span>
            <span className="terminal-cursor blink">█</span>
          </div>
        )}
        {!isRunning && displayLogs.length > 0 && (
          <div className="terminal-line">
            <span style={{ color: 'var(--text-muted)' }}>
              {'>'} <span className="blink">_</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
