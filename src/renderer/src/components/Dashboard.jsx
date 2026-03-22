import SpeedGauge from './SpeedGauge.jsx'
import StatsGrid from './StatsGrid.jsx'
import ScoreBoard from './ScoreBoard.jsx'
import TerminalLog from './TerminalLog.jsx'
import { useT } from '../i18n/index.jsx'
import iconComputer from '../assets/icons/icon-computer.png'

export default function Dashboard({ config, status, progress, results, logs, onStartTest, onCancelTest }) {
  const { t } = useT()

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
            <SpeedGauge value={liveDownload} maxValue={1000} unit="Mbps" label={t('gauge_label_dl')} />
          </div>
          <div className="test-gauge-card">
            <SpeedGauge value={liveUpload}   maxValue={500}  unit="Mbps" label={t('gauge_label_ul')} />
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
