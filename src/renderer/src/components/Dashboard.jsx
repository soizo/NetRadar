import { useState, useRef, useEffect } from 'react'
import SpeedGauge from './SpeedGauge.jsx'
import StatsGrid from './StatsGrid.jsx'
import ScoreBoard from './ScoreBoard.jsx'
import TerminalLog from './TerminalLog.jsx'
import { useT } from '../i18n/index.jsx'
import iconComputer from '../assets/icons/icon-computer.png'

function getGaugeMax(value) {
  if (value === 0) return 0
  const breakpoints = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  return breakpoints.find(bp => bp >= value * 1.2) || breakpoints[breakpoints.length - 1]
}

export default function Dashboard({ config, status, progress, results, logs, onStartTest, onCancelTest }) {
  const { t } = useT()
  const [copyLabel, setCopyLabel] = useState(null)
  const copyTimerRef = useRef(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)
  const isComplete = status === 'complete'
  const isError    = status === 'error'

  const servers       = config?.servers || []
  const defaultServer = servers.find(s => s.default && s.enabled) || servers.find(s => s.enabled)
  const hasServer     = !!defaultServer

  const liveDownload   = progress?.phase === 'download' ? (progress.currentSpeed || 0) : (results?.downloadMbps ?? 0)
  const liveUpload     = progress?.phase === 'upload'   ? (progress.currentSpeed || 0) : (results?.uploadMbps   ?? 0)
  const progressPercent = Math.round(progress?.percent || 0)

  const phaseLabel = {
    idle:     t('phase_idle'),
    latency:  t('phase_latency'),
    download: t('phase_download'),
    upload:   t('phase_upload'),
    scoring:  t('phase_scoring'),
    complete: t('phase_complete'),
    error:    t('phase_error')
  }[status] || t('phase_idle')

  function handleCopyResults() {
    if (!results) return
    const score = results.score || {}
    const text = [
      'NetRadar Speed Test Results',
      '───────────────────────────',
      `Download: ${results.downloadMbps?.toFixed(2) ?? '--'} Mbps`,
      `Upload:   ${results.uploadMbps?.toFixed(2) ?? '--'} Mbps`,
      `Latency:  ${results.latencyMs?.toFixed(1) ?? '--'} ms`,
      `Jitter:   ${results.jitterMs?.toFixed(1) ?? '--'} ms`,
      `Score:    ${score.overall ?? '--'}/100 (${score.grade ?? '--'})`,
      `Server:   ${results.serverName ?? '--'}`,
      `Date:     ${results.timestamp ?? '--'}`,
      '───────────────────────────',
      `Tested with NetRadar v${config?.version || '1.1.0'}`
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel(t('btn_copied'))
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopyLabel(null), 2000)
    })
  }

  let actionBtn
  if (isRunning) {
    actionBtn = (
      <button className="btn-primary btn-primary--danger" onClick={onCancelTest}>
        {t('btn_cancel')}
      </button>
    )
  } else {
    const label = isComplete ? t('btn_run_again') : isError ? t('btn_retry') : t('btn_start')
    actionBtn = (
      <button className="btn-primary" onClick={onStartTest} disabled={!hasServer}>
        {label}
      </button>
    )
  }

  return (
    <div className="dashboard">

      {/* ── Test header: server info + phase + action ─────────────────────── */}
      <div className="test-header">
        <div className="test-header__server">
          <img className="test-header__icon" src={iconComputer} alt="" aria-hidden="true" />
          <div className="test-header__info">
            <span className="test-header__name">
              {defaultServer ? defaultServer.name : t('conn_no_server')}
            </span>
            {defaultServer && (
              <span className="test-header__location">{defaultServer.location}</span>
            )}
          </div>
        </div>

        <div className={`test-header__phase test-header__phase--${status}`}>
          <span className={`test-header__dot ${isRunning ? 'blink' : ''}`} />
          {phaseLabel}
        </div>

        <div className="test-header__actions">
          {results && status === 'complete' && (
            <button className="btn-primary" onClick={handleCopyResults}>
              {copyLabel || t('btn_copy_results')}
            </button>
          )}
          {actionBtn}
        </div>
      </div>

      {/* ── Progress bar (only while running) ──────────────────────────────── */}
      {(isRunning || isComplete) && (
        <div className="test-progress-bar">
          <div
            className="test-progress-bar__fill"
            style={{ width: `${isComplete ? 100 : progressPercent}%` }}
          />
        </div>
      )}

      {/* ── Main body: gauges + metrics ────────────────────────────────────── */}
      <div className="test-body">
        <div className="test-gauges">
          <div className="test-gauge-card">
            <SpeedGauge value={liveDownload} maxValue={getGaugeMax(liveDownload) || 100} unit="Mbps" label={t('gauge_label_dl')} />
          </div>
          <div className="test-gauge-card">
            <SpeedGauge value={liveUpload}   maxValue={getGaugeMax(liveUpload) || 50}  unit="Mbps" label={t('gauge_label_ul')} />
          </div>
        </div>

        <div className="test-sidebar">
          <div className="panel metrics-panel">
            <div className="panel-header">{t('panel_conn_details')}</div>
            <div className="panel-body">
              <StatsGrid results={results} />
            </div>
          </div>
          <ScoreBoard results={results} />
        </div>
      </div>

      {/* ── Terminal log ───────────────────────────────────────────────────── */}
      <div className="test-terminal">
        <TerminalLog logs={logs} status={status} />
      </div>

    </div>
  )
}
