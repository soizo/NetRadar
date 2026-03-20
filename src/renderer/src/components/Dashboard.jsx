import React from 'react'
import SpeedGauge from './SpeedGauge.jsx'
import StatsGrid from './StatsGrid.jsx'
import ScoreBoard from './ScoreBoard.jsx'
import TerminalLog from './TerminalLog.jsx'
import { formatSpeed } from '../utils/scoring.js'

function ServerInfoPanel({ config, status, progress }) {
  const servers = config?.servers || []
  const defaultServer = servers.find(s => s.default && s.enabled) || servers.find(s => s.enabled)

  function phaseLabel(status) {
    switch (status) {
      case 'latency': return 'MEASURING LATENCY...'
      case 'download': return 'TESTING DOWNLOAD...'
      case 'upload': return 'TESTING UPLOAD...'
      case 'scoring': return 'CALCULATING SCORE...'
      case 'complete': return 'TEST COMPLETE'
      case 'error': return 'TEST FAILED'
      default: return 'READY'
    }
  }

  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)

  return (
    <div className="server-info-panel panel">
      <div className="panel-header">SERVER INFO</div>
      <div className="panel-body">
        {defaultServer ? (
          <>
            <div className="server-info-row">
              <span className="server-info-key">SERVER</span>
              <span className="server-info-value">{defaultServer.name}</span>
            </div>
            <div className="server-info-row">
              <span className="server-info-key">LOCATION</span>
              <span className="server-info-value">{defaultServer.location}</span>
            </div>
            <div className="server-info-row">
              <span className="server-info-key">HOST</span>
              <span className="server-info-value" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {defaultServer.base_url?.replace(/^https?:\/\//, '')}
              </span>
            </div>
            <div className="server-info-divider" />
            <div className="server-info-status" style={{
              color: isRunning ? 'var(--accent-cyan)' : status === 'complete' ? '#aaff00' : status === 'error' ? 'var(--accent-red)' : 'var(--text-muted)'
            }}>
              {isRunning && <span className="blink" style={{ marginRight: '6px' }}>■</span>}
              {phaseLabel(status)}
            </div>
            {isRunning && progress && (
              <div className="server-info-progress">
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress.percent || 0}%` }}
                  />
                </div>
                {progress.currentSpeed > 0 && (
                  <div className="progress-speed">
                    {formatSpeed(progress.currentSpeed)}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            No servers configured
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard({ config, status, progress, results, logs, onStartTest, onCancelTest }) {
  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)
  const isIdle = status === 'idle'
  const isComplete = status === 'complete'
  const isError = status === 'error'

  const downloadMbps = results?.downloadMbps ?? (progress?.phase === 'download' ? progress.currentSpeed : 0)
  const uploadMbps = results?.uploadMbps ?? (progress?.phase === 'upload' ? progress.currentSpeed : 0)

  const liveDownload = progress?.phase === 'download' ? (progress.currentSpeed || 0) : (results?.downloadMbps ?? 0)
  const liveUpload = progress?.phase === 'upload' ? (progress.currentSpeed || 0) : (results?.uploadMbps ?? 0)

  return (
    <div className="dashboard">
      {/* Top row: Gauges + Metrics */}
      <div className="dashboard-top">
        <div className="dashboard-gauges">
          <div className="panel gauge-panel">
            <div className="panel-header">DOWNLOAD</div>
            <div className="panel-body gauge-panel-body">
              <SpeedGauge
                value={liveDownload}
                maxValue={1000}
                unit="Mbps"
                label="DOWNLOAD"
              />
            </div>
          </div>
          <div className="panel gauge-panel">
            <div className="panel-header">UPLOAD</div>
            <div className="panel-body gauge-panel-body">
              <SpeedGauge
                value={liveUpload}
                maxValue={500}
                unit="Mbps"
                label="UPLOAD"
              />
            </div>
          </div>
        </div>
        <div className="dashboard-metrics">
          <div className="panel metrics-panel">
            <div className="panel-header">METRICS</div>
            <div className="panel-body">
              <StatsGrid results={results} />
            </div>
          </div>
        </div>
      </div>

      {/* Middle row: Score + Server info */}
      <div className="dashboard-middle">
        <ScoreBoard results={results} />
        <ServerInfoPanel config={config} status={status} progress={progress} />
      </div>

      {/* Terminal log */}
      <div className="dashboard-terminal">
        <TerminalLog logs={logs} status={status} />
      </div>

      {/* Action button */}
      <div className="dashboard-actions">
        {isRunning ? (
          <button
            className="btn-primary btn-cancel"
            onClick={onCancelTest}
            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', boxShadow: '0 0 12px #ff444440' }}
          >
            ■ CANCEL TEST
          </button>
        ) : (
          <button
            className="btn-primary btn-start"
            onClick={onStartTest}
            disabled={!config?.servers?.some(s => s.enabled)}
          >
            {isComplete ? '↺ RUN AGAIN' : isError ? '↺ RETRY TEST' : '▶ START TEST'}
          </button>
        )}
        {isComplete && results && (
          <div className="dashboard-result-summary">
            <span style={{ color: 'var(--text-muted)' }}>LAST RESULT:</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {' '}{formatSpeed(results.downloadMbps)} DL
            </span>
            <span style={{ color: 'var(--text-secondary)' }}> / </span>
            <span style={{ color: 'var(--accent-cyan)' }}>
              {formatSpeed(results.uploadMbps)} UL
            </span>
            <span style={{ color: 'var(--text-secondary)' }}> / </span>
            <span style={{ color: results.score?.color || 'var(--text-primary)' }}>
              {results.score?.overall ?? '--'} pts [{results.score?.grade ?? '--'}]
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
