import React, { useState, useEffect } from 'react'

const EMPTY_SERVER = {
  id: '',
  name: '',
  location: '',
  base_url: '',
  download_path: '/__down',
  upload_path: '/__up',
  latency_path: '/ping',
  enabled: true,
  default: false
}

function generateId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `server-${Date.now()}`
}

export default function ConfigPanel({ config, onSaveConfig }) {
  const [localConfig, setLocalConfig] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [newServer, setNewServer] = useState({ ...EMPTY_SERVER })
  const [configPath, setConfigPath] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (config) {
      setLocalConfig(JSON.parse(JSON.stringify(config)))
    }
    async function fetchPath() {
      try {
        const api = window.api
        if (api?.getConfigPath) {
          const p = await api.getConfigPath()
          setConfigPath(p || '')
        }
      } catch {}
    }
    fetchPath()
  }, [config])

  function handleRevealConfig() {
    if (!configPath) return
    try {
      const { shell } = window.require?.('electron') || {}
      if (shell?.showItemInFolder) {
        shell.showItemInFolder(configPath)
      }
    } catch {}
  }

  function handleTestSettingChange(key, value) {
    setLocalConfig(prev => ({
      ...prev,
      test_settings: { ...prev.test_settings, [key]: Number(value) }
    }))
  }

  function handleSettingChange(key, value) {
    setLocalConfig(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }))
  }

  function handleToggleServer(id) {
    setLocalConfig(prev => ({
      ...prev,
      servers: prev.servers.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    }))
  }

  function handleSetDefault(id) {
    setLocalConfig(prev => ({
      ...prev,
      servers: prev.servers.map(s => ({
        ...s,
        default: s.id === id
      }))
    }))
  }

  function handleDeleteServer(id) {
    setLocalConfig(prev => ({
      ...prev,
      servers: prev.servers.filter(s => s.id !== id)
    }))
  }

  function handleAddServerField(field, value) {
    setNewServer(prev => ({ ...prev, [field]: value }))
    setAddError('')
  }

  function handleAddServer() {
    if (!newServer.name.trim()) {
      setAddError('Server name is required')
      return
    }
    if (!newServer.base_url.trim()) {
      setAddError('Base URL is required')
      return
    }
    try {
      new URL(newServer.base_url)
    } catch {
      setAddError('Invalid base URL (must include https://)')
      return
    }

    const id = generateId(newServer.name)
    const existing = localConfig.servers?.find(s => s.id === id)
    const finalId = existing ? `${id}-${Date.now()}` : id

    const server = {
      ...newServer,
      id: finalId,
      name: newServer.name.trim(),
      location: newServer.location.trim() || 'Custom',
      base_url: newServer.base_url.trim().replace(/\/$/, ''),
      download_path: newServer.download_path.trim() || null,
      upload_path: newServer.upload_path.trim() || null,
      latency_path: newServer.latency_path.trim() || '/'
    }

    setLocalConfig(prev => ({
      ...prev,
      servers: [...(prev.servers || []), server]
    }))
    setNewServer({ ...EMPTY_SERVER })
    setShowAddServer(false)
    setAddError('')
  }

  async function handleSave() {
    if (!localConfig) return
    await onSaveConfig(localConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleRestoreDefaults() {
    const defaults = {
      download_size_mb: 25,
      upload_size_mb: 10,
      latency_samples: 10,
      timeout_ms: 30000
    }
    setLocalConfig(prev => ({
      ...prev,
      test_settings: defaults
    }))
  }

  if (!localConfig) {
    return (
      <div className="config-loading" style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
        LOADING CONFIGURATION...
      </div>
    )
  }

  const servers = localConfig.servers || []
  const ts = localConfig.test_settings || {}
  const settings = localConfig.settings || {}

  return (
    <div className="config-panel">
      {/* Config file path */}
      <div className="config-section panel">
        <div className="panel-header">CONFIGURATION FILE</div>
        <div className="panel-body config-path-section">
          <div className="config-path-display">
            <span className="config-path-label">PATH:</span>
            <code className="config-path-value">{configPath || 'Loading...'}</code>
          </div>
          {configPath && (
            <button className="btn-small" onClick={handleRevealConfig}>
              ◈ REVEAL IN EXPLORER
            </button>
          )}
        </div>
      </div>

      {/* Servers */}
      <div className="config-section panel">
        <div className="panel-header">
          SPEED TEST SERVERS
          <span className="config-server-count">[{servers.length}]</span>
        </div>
        <div className="panel-body">
          <div className="config-servers-list">
            {servers.map(server => (
              <div key={server.id} className={`config-server-item ${!server.enabled ? 'config-server-item--disabled' : ''}`}>
                <div className="config-server-main">
                  <div className="config-server-info">
                    <span className="config-server-name">{server.name}</span>
                    <span className="config-server-location">{server.location}</span>
                    {server.default && (
                      <span className="config-server-default-badge">DEFAULT</span>
                    )}
                  </div>
                  <div className="config-server-url">
                    {server.base_url}
                  </div>
                </div>
                <div className="config-server-actions">
                  <button
                    className={`btn-toggle ${server.enabled ? 'btn-toggle--on' : 'btn-toggle--off'}`}
                    onClick={() => handleToggleServer(server.id)}
                    title={server.enabled ? 'Disable server' : 'Enable server'}
                  >
                    {server.enabled ? 'ON' : 'OFF'}
                  </button>
                  {!server.default && server.enabled && (
                    <button
                      className="btn-small"
                      onClick={() => handleSetDefault(server.id)}
                      title="Set as default"
                    >
                      SET DEFAULT
                    </button>
                  )}
                  {servers.length > 1 && (
                    <button
                      className="btn-small btn-small--danger"
                      onClick={() => handleDeleteServer(server.id)}
                      title="Delete server"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!showAddServer ? (
            <button
              className="btn-small btn-add-server"
              onClick={() => setShowAddServer(true)}
            >
              + ADD CUSTOM SERVER
            </button>
          ) : (
            <div className="config-add-server-form panel">
              <div className="panel-header" style={{ fontSize: '14px' }}>ADD CUSTOM SERVER</div>
              <div className="panel-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">NAME *</label>
                    <input
                      type="text"
                      value={newServer.name}
                      onChange={e => handleAddServerField('name', e.target.value)}
                      placeholder="My Server"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">LOCATION</label>
                    <input
                      type="text"
                      value={newServer.location}
                      onChange={e => handleAddServerField('location', e.target.value)}
                      placeholder="New York, US"
                    />
                  </div>
                  <div className="form-field form-field--full">
                    <label className="form-label">BASE URL * (e.g. https://speedtest.example.com)</label>
                    <input
                      type="text"
                      value={newServer.base_url}
                      onChange={e => handleAddServerField('base_url', e.target.value)}
                      placeholder="https://speedtest.example.com"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">DOWNLOAD PATH</label>
                    <input
                      type="text"
                      value={newServer.download_path}
                      onChange={e => handleAddServerField('download_path', e.target.value)}
                      placeholder="/__down"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">UPLOAD PATH</label>
                    <input
                      type="text"
                      value={newServer.upload_path}
                      onChange={e => handleAddServerField('upload_path', e.target.value)}
                      placeholder="/__up"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">LATENCY PATH</label>
                    <input
                      type="text"
                      value={newServer.latency_path}
                      onChange={e => handleAddServerField('latency_path', e.target.value)}
                      placeholder="/ping"
                    />
                  </div>
                </div>
                {addError && (
                  <div className="form-error">⚠ {addError}</div>
                )}
                <div className="form-actions">
                  <button className="btn-small" onClick={handleAddServer}>+ ADD SERVER</button>
                  <button
                    className="btn-small"
                    onClick={() => { setShowAddServer(false); setAddError(''); setNewServer({ ...EMPTY_SERVER }) }}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Settings */}
      <div className="config-section panel">
        <div className="panel-header">TEST PARAMETERS</div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">DOWNLOAD SIZE (MB)</label>
              <input
                type="number"
                min="1"
                max="200"
                value={ts.download_size_mb ?? 25}
                onChange={e => handleTestSettingChange('download_size_mb', e.target.value)}
              />
              <span className="form-hint">Larger = more accurate, slower</span>
            </div>
            <div className="form-field">
              <label className="form-label">UPLOAD SIZE (MB)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={ts.upload_size_mb ?? 10}
                onChange={e => handleTestSettingChange('upload_size_mb', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">LATENCY SAMPLES</label>
              <input
                type="number"
                min="3"
                max="50"
                value={ts.latency_samples ?? 10}
                onChange={e => handleTestSettingChange('latency_samples', e.target.value)}
              />
              <span className="form-hint">More samples = more accurate</span>
            </div>
            <div className="form-field">
              <label className="form-label">TIMEOUT (ms)</label>
              <input
                type="number"
                min="5000"
                max="120000"
                step="1000"
                value={ts.timeout_ms ?? 30000}
                onChange={e => handleTestSettingChange('timeout_ms', e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-small" onClick={handleRestoreDefaults} style={{ color: 'var(--text-muted)' }}>
              ↺ RESTORE DEFAULTS
            </button>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="config-section panel">
        <div className="panel-header">GENERAL SETTINGS</div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">SAVE HISTORY</label>
              <select
                value={settings.save_history ? 'true' : 'false'}
                onChange={e => handleSettingChange('save_history', e.target.value === 'true')}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">HISTORY LIMIT</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.history_limit ?? 100}
                onChange={e => handleSettingChange('history_limit', Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="config-save-row">
        <div className="config-attribution">
          ◈ NetRadar v1.0.0 — by soizoktantas
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          style={saved ? { borderColor: '#aaff00', color: '#aaff00', boxShadow: '0 0 12px #aaff0040' } : {}}
        >
          {saved ? '✓ SAVED' : '◈ SAVE CONFIG'}
        </button>
      </div>
    </div>
  )
}
