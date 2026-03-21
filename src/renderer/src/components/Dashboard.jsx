import SpeedGauge from './SpeedGauge.jsx'
import StatsGrid from './StatsGrid.jsx'
import ScoreBoard from './ScoreBoard.jsx'
import TerminalLog from './TerminalLog.jsx'
import { formatSpeed } from '../utils/scoring.js'
import { useT } from '../i18n/index.jsx'
import iconLan from '../assets/icons/icon-lan.png'
import iconComputer from '../assets/icons/icon-computer.png'

function SummaryField({ label, value, tone = 'neutral' }) {
  return (
    <div className={`summary-field summary-field--${tone}`}>
      <span className="summary-field__label">{label}</span>
      <strong className="summary-field__value">{value}</strong>
    </div>
  )
}

function SupportRow({ label, value }) {
  return (
    <div className="support-detail-row">
      <span className="support-detail-row__label">{label}</span>
      <strong className="support-detail-row__value">{value}</strong>
    </div>
  )
}

function ServerInfoPanel({ config, status, progress }) {
  const { t } = useT()
  const servers = config?.servers || []
  const defaultServer = servers.find(s => s.default && s.enabled) || servers.find(s => s.enabled)
  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)

  const phaseLabel = (st) => {
    const map = {
      latency: t('phase_latency'),
      download: t('phase_download'),
      upload: t('phase_upload'),
      scoring: t('phase_scoring'),
      complete: t('phase_complete'),
      error: t('phase_error')
    }
    return map[st] || t('phase_idle')
  }

  return (
    <section className="panel support-panel">
      <div className="panel-header">{t('panel_support')}</div>
      <div className="panel-body support-panel-body">
        {defaultServer ? (
          <>
            <div className="support-route-card">
              <img className="support-route-card__icon" src={iconLan} alt="" aria-hidden="true" />
              <div className="support-route-card__copy">
                <div className="support-route-card__title">{defaultServer.name}</div>
                <div className="support-route-card__subtitle">{defaultServer.location}</div>
              </div>
            </div>

            <div className={`support-phase support-phase--${status}`}>
              <span className={`support-phase__dot ${isRunning ? 'blink' : ''}`} />
              {phaseLabel(status)}
            </div>

            <div className="support-detail-list">
              <SupportRow label={t('support_host')} value={defaultServer.base_url?.replace(/^https?:\/\//, '') || '--'} />
              <SupportRow label={t('support_preferred')} value={defaultServer.default ? t('support_yes') : t('support_no')} />
              <SupportRow label={t('support_dl_path')} value={defaultServer.download_path || t('sum_not_configured')} />
              <SupportRow label={t('support_ul_path')} value={defaultServer.upload_path || t('sum_not_configured')} />
              <SupportRow label={t('support_lat_path')} value={defaultServer.latency_path || t('sum_not_configured')} />
            </div>

            {isRunning && progress && (
              <div className="support-progress">
                <div className="support-progress__head">
                  <span>{t('support_progress')}</span>
                  <strong>{Math.round(progress.percent || 0)}%</strong>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress.percent || 0}%` }}
                  />
                </div>
                <div className="support-progress__meta">
                  <span>{t('support_phase')}: {progress.phase || status}</span>
                  <strong>{progress.currentSpeed > 0 ? formatSpeed(progress.currentSpeed) : t('support_waiting')}</strong>
                </div>
              </div>
            )}

            {!isRunning && (
              <div className="support-note">{t('support_note')}</div>
            )}
          </>
        ) : (
          <div className="support-empty">
            <div className="support-empty__title">{t('support_no_server_title')}</div>
            <div className="support-empty__text">{t('support_no_server_text')}</div>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Dashboard({ config, status, progress, results, logs, onStartTest, onCancelTest }) {
  const { t } = useT()

  const phaseLabel = (st) => {
    const map = {
      latency: t('phase_latency'),
      download: t('phase_download'),
      upload: t('phase_upload'),
      scoring: t('phase_scoring'),
      complete: t('phase_complete'),
      error: t('phase_error')
    }
    return map[st] || t('phase_idle')
  }

  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)
  const isComplete = status === 'complete'
  const isError = status === 'error'

  const servers = config?.servers || []
  const defaultServer = servers.find(server => server.default && server.enabled) || servers.find(server => server.enabled)

  const liveDownload = progress?.phase === 'download' ? (progress.currentSpeed || 0) : (results?.downloadMbps ?? 0)
  const liveUpload = progress?.phase === 'upload' ? (progress.currentSpeed || 0) : (results?.uploadMbps ?? 0)
  const progressPercent = Math.round(progress?.percent || 0)
  const statusTone = isError ? 'danger' : isRunning ? 'warning' : isComplete ? 'success' : 'neutral'
  const statusValue = isError ? t('sum_attention') : isRunning ? t('sum_testing') : isComplete ? t('sum_connected') : t('sum_ready')
  const scoreValue = results?.score ? `${results.score.grade} · ${results.score.rating}` : t('sum_not_rated')
  const latencyValue = results?.latencyMs != null ? `${results.latencyMs.toFixed(1)} ms` : t('sum_pending')
  const hostValue = defaultServer?.base_url?.replace(/^https?:\/\//, '') || '--'

  let startBtnLabel = t('btn_start')
  if (isComplete) startBtnLabel = t('btn_run_again')
  if (isError) startBtnLabel = t('btn_retry')

  return (
    <div className="dashboard">
      <section className="panel status-panel">
        <div className="panel-header">{t('panel_general')}</div>
        <div className="panel-body status-panel-body">
          <div className="status-panel-main">
            <div className="connection-identity">
              <img
                className="connection-identity__icon"
                src={iconComputer}
                alt=""
                aria-hidden="true"
              />
              <div className="connection-identity__copy">
                <div className="connection-identity__title">{t('conn_title')}</div>
                <div className="connection-identity__subtitle">
                  {defaultServer
                    ? `${defaultServer.name} · ${defaultServer.location}`
                    : t('conn_no_server')}
                </div>
                <div className={`connection-state connection-state--${status}`}>
                  <span className={`connection-state__dot ${isRunning ? 'blink' : ''}`} />
                  {phaseLabel(status)}
                </div>
              </div>
            </div>

            <div className="connection-actions">
              {isRunning ? (
                <button className="btn-primary btn-primary--danger" onClick={onCancelTest}>
                  {t('btn_cancel')}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={onStartTest}
                  disabled={!servers.some(server => server.enabled)}
                >
                  {startBtnLabel}
                </button>
              )}
              <div className="connection-actions__note">{t('conn_actions_note')}</div>
            </div>
          </div>

          <div className="connection-summary">
            <SummaryField label={t('sum_status')} value={statusValue} tone={statusTone} />
            <SummaryField label={t('sum_route')} value={defaultServer?.name || t('sum_not_configured')} />
            <SummaryField label={t('sum_host')} value={hostValue} />
            <SummaryField label={t('sum_quality')} value={scoreValue} tone="score" />
            <SummaryField label={t('sum_latency')} value={latencyValue} />
            <SummaryField label={t('sum_reports')} value={`${config?.history?.length || 0}`} />
          </div>
        </div>
      </section>

      <div className="dashboard-main">
        <section className="panel activity-panel">
          <div className="panel-header">{t('panel_activity')}</div>
          <div className="panel-body activity-panel-body">
            <div className="activity-summary">
              <div className="activity-summary__copy">
                <div className="activity-summary__title">{t('act_title')}</div>
                <div className="activity-summary__text">
                  {isRunning
                    ? t('act_running_text', { phase: progress?.phase || status })
                    : t('act_idle_text')}
                </div>
              </div>

              <div className="activity-summary__progress">
                <span className="activity-summary__progress-label">{t('act_progress')}</span>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${isRunning ? progressPercent : isComplete ? 100 : 0}%` }}
                  />
                </div>
                <strong>
                  {isRunning ? `${progressPercent}%` : isComplete ? t('act_last_complete') : t('act_waiting')}
                </strong>
              </div>
            </div>

            <div className="activity-gauges">
              <div className="activity-gauge-card">
                <div className="activity-gauge-card__title">{t('gauge_download_title')}</div>
                <div className="activity-gauge-card__subtitle">{t('gauge_download_sub')}</div>
                <SpeedGauge
                  value={liveDownload}
                  maxValue={1000}
                  unit="Mbps"
                  label={t('gauge_label_dl')}
                />
              </div>

              <div className="activity-gauge-card">
                <div className="activity-gauge-card__title">{t('gauge_upload_title')}</div>
                <div className="activity-gauge-card__subtitle">{t('gauge_upload_sub')}</div>
                <SpeedGauge
                  value={liveUpload}
                  maxValue={500}
                  unit="Mbps"
                  label={t('gauge_label_ul')}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="dashboard-side-column">
          <section className="panel metrics-panel">
            <div className="panel-header">{t('panel_conn_details')}</div>
            <div className="panel-body">
              <StatsGrid results={results} />
            </div>
          </section>

          <ScoreBoard results={results} />
          <ServerInfoPanel config={config} status={status} progress={progress} />
        </div>
      </div>

      <div className="dashboard-terminal">
        <TerminalLog logs={logs} status={status} />
      </div>
    </div>
  )
}
