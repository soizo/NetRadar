import React, { useState } from 'react'
import { formatSpeed } from '../utils/scoring.js'

function gradeColor(grade) {
  if (!grade || grade === '--') return 'var(--text-muted)'
  if (grade.startsWith('S')) return '#00d4ff'
  if (grade.startsWith('A')) return '#00ff41'
  if (grade.startsWith('B')) return '#aaff00'
  if (grade === 'C') return '#ffcc00'
  if (grade === 'D') return '#ff6c00'
  return '#ff4444'
}

function latencyColor(ms) {
  if (!ms) return 'var(--text-muted)'
  if (ms < 20) return 'var(--text-primary)'
  if (ms < 50) return '#aaff00'
  if (ms < 100) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

function formatDate(iso) {
  if (!iso) return '--'
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    const time = d.toTimeString().slice(0, 8)
    return `${date} ${time}`
  } catch {
    return iso
  }
}

export default function HistoryPanel({ history = [], onClearHistory }) {
  const [confirmClear, setConfirmClear] = useState(false)

  const sortedHistory = [...history].reverse()

  function handleClear() {
    if (confirmClear) {
      onClearHistory()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <div className="history-title-row">
          <div className="panel-header-standalone">
            ◈ TEST HISTORY
            <span className="history-count">[{history.length} records]</span>
          </div>
          {history.length > 0 && (
            <button
              className={`btn-small ${confirmClear ? 'btn-small--danger' : ''}`}
              onClick={handleClear}
              style={{
                borderColor: confirmClear ? 'var(--accent-red)' : 'var(--border-normal)',
                color: confirmClear ? 'var(--accent-red)' : 'var(--text-muted)'
              }}
            >
              {confirmClear ? '⚠ CONFIRM CLEAR' : '✕ CLEAR HISTORY'}
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">◈</div>
          <div className="history-empty-text">NO TEST HISTORY</div>
          <div className="history-empty-sub">Run a speed test to see results here.</div>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr className="history-thead-row">
                <th className="history-th">#</th>
                <th className="history-th">DATE / TIME</th>
                <th className="history-th">SERVER</th>
                <th className="history-th">DOWNLOAD</th>
                <th className="history-th">UPLOAD</th>
                <th className="history-th">LATENCY</th>
                <th className="history-th">JITTER</th>
                <th className="history-th">SCORE</th>
                <th className="history-th">GRADE</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((entry, idx) => (
                <tr key={entry.id || idx} className="history-row">
                  <td className="history-td history-td--index">
                    {history.length - idx}
                  </td>
                  <td className="history-td history-td--date">
                    {formatDate(entry.timestamp)}
                  </td>
                  <td className="history-td history-td--server">
                    {entry.server || '--'}
                  </td>
                  <td className="history-td" style={{ color: 'var(--accent-cyan)' }}>
                    {entry.downloadMbps ? formatSpeed(entry.downloadMbps) : '--'}
                  </td>
                  <td className="history-td" style={{ color: '#aaff00' }}>
                    {entry.uploadMbps ? formatSpeed(entry.uploadMbps) : '--'}
                  </td>
                  <td className="history-td" style={{ color: latencyColor(entry.latencyMs) }}>
                    {entry.latencyMs != null ? `${entry.latencyMs.toFixed(1)} ms` : '--'}
                  </td>
                  <td className="history-td" style={{ color: latencyColor(entry.jitterMs) }}>
                    {entry.jitterMs != null ? `${entry.jitterMs.toFixed(1)} ms` : '--'}
                  </td>
                  <td className="history-td" style={{ color: gradeColor(entry.grade) }}>
                    {entry.score != null ? entry.score : '--'}
                  </td>
                  <td className="history-td history-td--grade">
                    <span
                      className="history-grade-badge"
                      style={{
                        color: gradeColor(entry.grade),
                        borderColor: gradeColor(entry.grade) + '40',
                        textShadow: `0 0 8px ${gradeColor(entry.grade)}60`
                      }}
                    >
                      {entry.grade || '--'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
