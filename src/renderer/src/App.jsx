import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import TitleBar from './components/TitleBar.jsx'
import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import ConfigPanel from './components/ConfigPanel.jsx'
import NetworkPanel from './components/NetworkPanel.jsx'
import PrivacyPanel from './components/PrivacyPanel.jsx'
import { useSpeedTest } from './hooks/useSpeedTest.js'
import { useDiagnostics } from './hooks/useDiagnostics.js'
import { useT } from './i18n/index.jsx'
import iconStatus  from './assets/icons/icon-status.png'
import iconHistory from './assets/icons/icon-history.png'
import iconConfig  from './assets/icons/icon-config.png'
import iconDiag    from './assets/icons/icon-diagnostics.png'
import iconPrivacy from './assets/icons/icon-privacy.png'
import { cloneConfig, DEFAULT_CONFIG } from '../../shared/appConfig.js'

export default function App() {
  const { t, setLang } = useT()
  const [config, setConfig] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [configLoading, setConfigLoading] = useState(true)

  const { status, progress, results, logs, startTest, cancelTest } = useSpeedTest()
  const diag = useDiagnostics(config)

  const savedResultRef = useRef(null)
  const viewBodyRef = useRef(null)
  const configRef = useRef(config)

  useEffect(() => { configRef.current = config }, [config])

  useEffect(() => {
    async function loadConfig() {
      try {
        const api = window.api
        if (api && typeof api.getConfig === 'function') {
          const cfg = await api.getConfig()
          const finalConfig = cfg || cloneConfig(DEFAULT_CONFIG)
          setConfig(finalConfig)
        } else {
          setConfig(cloneConfig(DEFAULT_CONFIG))
        }
      } catch (err) {
        console.error('Failed to load config:', err)
        setConfig(cloneConfig(DEFAULT_CONFIG))
      } finally {
        setConfigLoading(false)
      }
    }
    loadConfig()

    // macOS menu: Preferences (Cmd+,) → navigate to settings
    const api = window.api
    let unsub
    if (api && typeof api.onMenuNavigate === 'function') {
      unsub = api.onMenuNavigate((_, view) => setCurrentView(view))
    }
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (config?.settings?.language) {
      setLang(config.settings.language)
    }
  }, [config?.settings?.language, setLang])

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

  const handleResetConfig = useCallback(async () => {
    try {
      const api = window.api
      if (!api || typeof api.resetConfig !== 'function') return

      const result = await api.resetConfig()
      if (result?.success && result.config) {
        setConfig(result.config)
      }
    } catch (err) {
      console.error('Failed to reset config:', err)
    }
  }, [])

  const handleTestComplete = useCallback(async (testResults) => {
    const cfg = configRef.current
    if (!cfg) return
    const api = window.api
    if (!api || !cfg.settings?.save_history) return

    const historyEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      server: testResults.serverId || 'unknown',
      downloadMbps: testResults.downloadMbps,
      uploadMbps: testResults.uploadMbps,
      latencyMs: testResults.latencyMs,
      jitterMs: testResults.jitterMs,
      score: testResults.score?.overall ?? 0,
      grade: testResults.score?.grade ?? 'F'
    }

    const limit = cfg.settings?.history_limit ?? 100
    const history = Array.isArray(cfg.history) ? cfg.history : []
    const newHistory = [...history, historyEntry].slice(-limit)
    await handleSaveConfig({ ...cfg, history: newHistory })
  }, [handleSaveConfig])

  useEffect(() => {
    if (viewBodyRef.current) viewBodyRef.current.scrollTop = 0
  }, [currentView])

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
    await handleSaveConfig({ ...config, history: [] })
  }, [config, handleSaveConfig])

  const lang = config?.settings?.language

  const VIEW_META = useMemo(() => ({
    dashboard: { iconSrc: iconStatus,  title: t('title_dashboard') },
    network:   { iconSrc: iconDiag,    title: t('title_network') },
    privacy:   { iconSrc: iconPrivacy, title: t('title_privacy') },
    history:   { iconSrc: iconHistory, title: t('title_history') },
    config:    { iconSrc: iconConfig,  title: t('title_config') }
  }), [lang, t])

  const STATUS_COPY = useMemo(() => ({
    idle:     t('sc_idle'),
    latency:  t('sc_latency'),
    download: t('sc_download'),
    upload:   t('sc_upload'),
    scoring:  t('sc_scoring'),
    complete: t('sc_complete'),
    error:    t('sc_error')
  }), [lang, t])

  const DIAG_COPY = useMemo(() => ({
    idle:     t('sc_diag_idle'),
    running:  t('sc_diag_running'),
    complete: t('sc_diag_complete'),
    error:    t('sc_error')
  }), [lang, t])

  const VIEW_PATHS = useMemo(
    () => config?.ui?.view_paths || DEFAULT_CONFIG.ui.view_paths,
    [config?.ui?.view_paths]
  )

  const [addressValue, setAddressValue] = useState(VIEW_PATHS[currentView] || '')

  useEffect(() => {
    setAddressValue(VIEW_PATHS[currentView] || '')
  }, [currentView, VIEW_PATHS])

  function handleAddressGo(e) {
    e.preventDefault()
    const normalized = addressValue.trim().toLowerCase()
    const match = Object.entries(VIEW_PATHS).find(([, path]) =>
      path.toLowerCase() === normalized || normalized.endsWith(path.toLowerCase().split('\\').pop())
    )
    if (match) setCurrentView(match[0])
    else {
      const candidate = addressValue.trim()
      try {
        const external = /^[a-z]+:\/\//i.test(candidate) ? new URL(candidate) : new URL(`https://${candidate}`)
        window.open(external.toString(), '_blank', 'noopener')
      } catch {
        setAddressValue(VIEW_PATHS[currentView] || '')
      }
    }
  }

  const viewMeta     = VIEW_META[currentView] || VIEW_META.dashboard
  const isDiagView   = currentView === 'network' || currentView === 'privacy'
  const statusCopy   = isDiagView ? (DIAG_COPY[diag.status] || DIAG_COPY.idle) : (STATUS_COPY[status] || STATUS_COPY.idle)
  const isRunning    = isDiagView ? diag.status === 'running' : ['latency', 'download', 'upload', 'scoring'].includes(status)
  const activeStatus = isDiagView ? diag.status : status

  if (configLoading) {
    return <div className="loading-screen" aria-hidden="true" />
  }

  return (
    <div className="app-shell">
      <TitleBar appTitle={config?.app?.titlebar_title || config?.app?.name || DEFAULT_CONFIG.app.name} />
      <div className="app-workspace">
        <Navbar currentView={currentView} onNavigate={setCurrentView} status={status} />
        <main className="app-content">
          <section className="content-window">
            <div className="view-strip">
              <img src={viewMeta.iconSrc} alt="" className="view-strip__icon" aria-hidden="true" />
              <span className="view-strip__title">{viewMeta.title}</span>
              <div className={`view-strip__status view-strip__status--${activeStatus}`}>
                <span className={`status-led status-led--${activeStatus} ${isRunning ? 'blink' : ''}`} />
                <span>{statusCopy}</span>
              </div>
            </div>

            <form className="explorer-toolbar" onSubmit={handleAddressGo}>
              <div className="explorer-toolbar__field">
                <input
                  className="explorer-toolbar__input"
                  value={addressValue}
                  onChange={e => setAddressValue(e.target.value)}
                  aria-label={t('toolbar_address')}
                  spellCheck={false}
                />
                <button type="submit" className="explorer-toolbar__go">{t('toolbar_go')}</button>
              </div>
            </form>

            <div className="view-body" ref={viewBodyRef}>
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
              {currentView === 'network' && (
                <NetworkPanel
                  data={diag.data}
                  loading={diag.loading}
                  errors={diag.errors}
                  status={diag.status}
                  run={diag.run}
                  reset={diag.reset}
                />
              )}
              {currentView === 'privacy' && (
                <PrivacyPanel
                  data={diag.data}
                  loading={diag.loading}
                  errors={diag.errors}
                  status={diag.status}
                  run={diag.run}
                  reset={diag.reset}
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
                  onResetConfig={handleResetConfig}
                  appVersion={config?.version || ''}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
