import { useState } from 'react'
import { formatSpeed } from '../utils/scoring.js'
import { useT } from '../i18n/index.jsx'
import iconHistory from '../assets/icons/icon-history.png'

function gradeColor(grade) {
  if (!grade || grade === '--') return '#6b7f99'
  if (grade.startsWith('S')) return '#1f63d0'
  if (grade.startsWith('A')) return '#2b8a41'
  if (grade.startsWith('B')) return '#5b8d22'
  if (grade === 'C') return '#b78517'
  if (grade === 'D') return '#bb6b17'
  return '#b04b4b'
}

function latencyColor(ms) {
  if (!ms) return '#6b7f99'
  if (ms < 20) return '#2b8a41'
  if (ms < 50) return '#5b8d22'
  if (ms < 100) return '#b78517'
  return '#b04b4b'
}

function formatDate(iso, lang) {
  if (!iso) return '--'
  try {
    const date = new Date(iso)
    return new Intl.DateTimeFormat(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  } catch {
    return iso
  }
}

export default function HistoryPanel({ history = [], onClearHistory }) {
  const { t, lang } = useT()
  const [confirmClear, setConfirmClear] = useState(false)

  const sortedHistory = [...history].reverse()
  const latest = sortedHistory[0]
  const bestEntry = sortedHistory.reduce((best, entry) => {
    if (!best) return entry
    return (entry.score ?? -1) > (best.score ?? -1) ? entry : best
  }, null)
  const averageScore = history.length > 0
    ? Math.round(history.reduce((sum, entry) => sum + (entry.score || 0), 0) / history.length)
    : null

  function handleClear() {
    if (confirmClear) {
      onClearHistory()
      setConfirmClear(false)
      return
    }
    setConfirmClear(true)
    setTimeout(() => setConfirmClear(false), 3000)
  }

  return (
    <div className="history-panel">
      <section className="panel history-banner">
        <div className="panel-body history-banner-body">
          <div className="history-banner-copy">
            <img className="history-banner-icon" src={iconHistory} alt="" aria-hidden="true" />
            <div className="history-banner-copy__body">
              <div className="history-banner-title">{t('hist_title')}</div>
              <div className="history-banner-text">
                {history.length > 0
                  ? t('hist_latest', { date: formatDate(latest.timestamp, lang) })
                  : t('hist_empty_start')}
              </div>
            </div>
          </div>

          <div className="history-banner-stats">
            <div className="history-banner-stat">
              <span className="history-banner-stat__label">{t('hist_entries')}</span>
              <strong className="history-banner-stat__value">{history.length}</strong>
            </div>
            <div className="history-banner-stat">
              <span className="history-banner-stat__label">{t('hist_best_grade')}</span>
              <strong
                className="history-banner-stat__value"
                style={{ color: gradeColor(bestEntry?.grade || '--') }}
              >
                {bestEntry?.grade || '--'}
              </strong>
            </div>
            <div className="history-banner-stat">
              <span className="history-banner-stat__label">{t('hist_avg_score')}</span>
              <strong className="history-banner-stat__value">{averageScore ?? '--'}</strong>
            </div>
            {history.length > 0 && (
              <button
                className={`btn-secondary ${confirmClear ? 'btn-secondary--danger' : ''}`}
                onClick={handleClear}
              >
                {confirmClear ? t('hist_confirm_clear') : t('hist_clear')}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel history-table-panel">
        <div className="panel-header">{t('hist_table_title')}</div>
        <div className="panel-body history-table-body">
          {history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon" aria-hidden="true">LOG</div>
              <div className="history-empty-text">{t('hist_no_reports')}</div>
              <div className="history-empty-sub">{t('hist_no_reports_sub')}</div>
            </div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr className="history-thead-row">
                    <th className="history-th">{t('hist_th_time')}</th>
                    <th className="history-th">{t('hist_th_server')}</th>
                    <th className="history-th">{t('hist_th_dl')}</th>
                    <th className="history-th">{t('hist_th_ul')}</th>
                    <th className="history-th">{t('hist_th_latency')}</th>
                    <th className="history-th">{t('hist_th_jitter')}</th>
                    <th className="history-th">{t('hist_th_score')}</th>
                    <th className="history-th">{t('hist_th_grade')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((entry, index) => (
                    <tr key={entry.id || index} className="history-row">
                      <td className="history-td history-td--date">{formatDate(entry.timestamp, lang)}</td>
                      <td className="history-td history-td--server">{entry.server || '--'}</td>
                      <td className="history-td history-td--download">{entry.downloadMbps ? formatSpeed(entry.downloadMbps) : '--'}</td>
                      <td className="history-td history-td--upload">{entry.uploadMbps ? formatSpeed(entry.uploadMbps) : '--'}</td>
                      <td className="history-td" style={{ color: latencyColor(entry.latencyMs) }}>
                        {entry.latencyMs != null ? `${entry.latencyMs.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="history-td" style={{ color: latencyColor(entry.jitterMs) }}>
                        {entry.jitterMs != null ? `${entry.jitterMs.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="history-td">{entry.score != null ? entry.score : '--'}</td>
                      <td className="history-td history-td--grade">
                        <span
                          className="history-grade-badge"
                          style={{
                            color: gradeColor(entry.grade),
                            borderColor: gradeColor(entry.grade)
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
      </section>
    </div>
  )
}
