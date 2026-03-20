import React, { useState, useEffect, useCallback } from 'react'
import TitleBar from './components/TitleBar.jsx'
import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import ConfigPanel from './components/ConfigPanel.jsx'
import { useSpeedTest } from './hooks/useSpeedTest.js'

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
    if (status === 'complete' && results) {
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

  if (configLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        color: '#00ff41',
        fontFamily: "'VT323', monospace",
        fontSize: '24px',
        letterSpacing: '4px'
      }}>
        INITIALIZING NETRADAR...
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TitleBar />
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      <main className="app-content">
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
      </main>
    </div>
  )
}
