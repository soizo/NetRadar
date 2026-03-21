import React, { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar.jsx'
import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import ConfigPanel from './components/ConfigPanel.jsx'
import DiagnosticsPanel from './components/DiagnosticsPanel.jsx'
import { useSpeedTest } from './hooks/useSpeedTest.js'
import { useT } from './i18n/index.jsx'
import iconStatus from './assets/icons/icon-status.png'
import iconHistory from './assets/icons/icon-history.png'
import iconConfig from './assets/icons/icon-config.png'
import iconDiag from './assets/icons/icon-diagnostics.png'

const DEFAULT_CONFIG = {
  version: '1.0',
  meta: { author: 'soizoktantas', repo: 'https://github.com/soizoktantas/NetRadar' },
  settings: { theme: 'xp-terminal', save_history: true, history_limit: 100 },
  test_settings: { download_size_mb: 25, upload_size_mb: 10, latency_samples: 10, timeout_ms: 30000 },
  servers: [
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      location: 'Global CDN',
      base_url: 'https://speed.cloudflare.com',
      download_path: '/__down',
      upload_path: '/__up',
      latency_path: '/__down?bytes=0',
      enabled: true,
      default: true
    }
  ],
  history: []
}

export default function App() {
  const { t } = useT()
  const [config, setConfig] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [configLoading, setConfigLoading] = useState(true)

  const {
    status,
    progress,
    results,
    logs,
    startTest,
    cancelTest
  } = useSpeedTest()

  const savedResultRef = useRef(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        const api = window.api
        if (api && typeof api.getConfig === 'function') {
          const cfg = await api.getConfig()
          setConfig(cfg || DEFAULT_CONFIG)
        } else {
          setConfig(DEFAULT_CONFIG)
        }
      } catch (err) {
        console.error('Failed to load config:', err)
        setConfig(DEFAULT_CONFIG)
      } finally {
        setConfigLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSaveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig)
    try {
      const api = window.api
      if (api && typeof api.saveConfig === 'function') {
        await api.saveConfig(newConfig)
      }
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }, [])

  const handleTestComplete = useCallback(async (testResults) => {
    if (!config) return
    const api = window.api
    if (!api || !config.settings?.save_history) return

    const historyEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      server: testResults.serverId || 'unknown',
      downloadMbps: testResults.downloadMbps,
      uploadMbps: testResults.uploadMbps,
      latencyMs: testResults.latencyMs,
      jitterMs: testResults.jitterMs,
      score: testResults.score?.overall ?? 0,
      grade: testResults.score?.grade ?? 'F'
    }

    const limit = config.settings?.history_limit ?? 100
    const history = Array.isArray(config.history) ? config.history : []
    const newHistory = [...history, historyEntry].slice(-limit)
    const newConfig = { ...config, history: newHistory }
    await handleSaveConfig(newConfig)
  }, [config, handleSaveConfig])

  useEffect(() => {
    if (status === 'complete' && results && results !== savedResultRef.current) {
      savedResultRef.current = results
      handleTestComplete(results)
    }
  }, [status, results, handleTestComplete])

  const handleStartTest = useCallback(() => {
    if (!config) return
    const servers = config.servers || []
    const defaultServer = servers.find(s => s.default && s.enabled) || servers.find(s => s.enabled)
    if (!defaultServer) return
    startTest(defaultServer, config.test_settings || {})
  }, [config, startTest])

  const handleClearHistory = useCallback(async () => {
    if (!config) return
    const newConfig = { ...config, history: [] }
    await handleSaveConfig(newConfig)
  }, [config, handleSaveConfig])

  const VIEW_META = {
    dashboard: {
      iconSrc: iconStatus,
      path: t('path_dashboard'),
      title: t('title_dashboard'),
      subtitle: t('subtitle_dashboard')
    },
    history: {
      iconSrc: iconHistory,
      path: t('path_history'),
      title: t('title_history'),
      subtitle: t('subtitle_history')
    },
    config: {
      iconSrc: iconConfig,
      path: t('path_config'),
      title: t('title_config'),
      subtitle: t('subtitle_config')
    },
    diagnostics: {
      iconSrc: iconDiag,
      path: t('path_diagnostics'),
      title: t('title_diagnostics'),
      subtitle: t('subtitle_diagnostics')
    }
  }

  const STATUS_COPY = {
    idle: t('sc_idle'),
    latency: t('sc_latency'),
    download: t('sc_download'),
    upload: t('sc_upload'),
    scoring: t('sc_scoring'),
    complete: t('sc_complete'),
    error: t('sc_error')
  }

  const viewMeta = VIEW_META[currentView] || VIEW_META.dashboard
  const statusCopy = STATUS_COPY[status] || STATUS_COPY.idle
  const isRunning = ['latency', 'download', 'upload', 'scoring'].includes(status)

  if (configLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-window">
          <div className="loading-window__title">{t('app_name')}</div>
          <div className="loading-window__body">
            <div className="loading-window__badge">{t('loading_badge')}</div>
            <div className="loading-window__bar">
              <span className="loading-window__bar-fill" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TitleBar currentView={currentView} status={status} />
      <div className="app-workspace">
        <Navbar
          currentView={currentView}
          onNavigate={setCurrentView}
          status={status}
          config={config}
        />
        <main className="app-content">
          <div className="explorer-toolbar">
            <div className="explorer-toolbar__field">
              <span className="explorer-toolbar__label">{t('toolbar_address')}</span>
              <div className="explorer-toolbar__value">{viewMeta.path}</div>
            </div>
            <div className={`explorer-toolbar__status explorer-toolbar__status--${status}`}>
              <span className={`status-led status-led--${status} ${isRunning ? 'blink' : ''}`} />
              {statusCopy}
            </div>
          </div>

          <section className="content-window">
            <header className="view-header">
              <div className="view-header__icon" aria-hidden="true">
                <img src={viewMeta.iconSrc} alt="" className="view-header__icon-img" />
              </div>
              <div className="view-header__copy">
                <div className="view-header__eyebrow">{t('app_name')}</div>
                <h1 className="view-header__title">{viewMeta.title}</h1>
                <p className="view-header__subtitle">{viewMeta.subtitle}</p>
              </div>
              <div className={`view-header__status view-header__status--${status}`}>
                <span className={`status-led status-led--${status} ${isRunning ? 'blink' : ''}`} />
                <div className="view-header__status-copy">
                  <strong>{t('toolbar_conn_state')}</strong>
                  <span>{statusCopy}</span>
                </div>
              </div>
            </header>

            <div className="view-body">
              {currentView === 'dashboard' && (
                <Dashboard
                  config={config}
                  status={status}
                  progress={progress}
                  results={results}
                  logs={logs}
                  onStartTest={handleStartTest}
                  onCancelTest={cancelTest}
                />
              )}
              {currentView === 'history' && (
                <HistoryPanel
                  history={config?.history || []}
                  onClearHistory={handleClearHistory}
                />
              )}
              {currentView === 'config' && (
                <ConfigPanel
                  config={config}
                  onSaveConfig={handleSaveConfig}
                />
              )}
              {currentView === 'diagnostics' && (
                <DiagnosticsPanel />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
