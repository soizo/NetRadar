import { useState, useEffect } from 'react'
import { useT, SUPPORTED_LANGS } from '../i18n/index.jsx'
import iconConfig from '../assets/icons/icon-config.png'

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
  const { t, lang, setLang } = useT()
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
          const path = await api.getConfigPath()
          setConfigPath(path || '')
        }
      } catch {
        setConfigPath('')
      }
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
      servers: prev.servers.map(server =>
        server.id === id ? { ...server, enabled: !server.enabled } : server
      )
    }))
  }

  function handleSetDefault(id) {
    setLocalConfig(prev => ({
      ...prev,
      servers: prev.servers.map(server => ({
        ...server,
        default: server.id === id
      }))
    }))
  }

  function handleDeleteServer(id) {
    setLocalConfig(prev => ({
      ...prev,
      servers: prev.servers.filter(server => server.id !== id)
    }))
  }

  function handleAddServerField(field, value) {
    setNewServer(prev => ({ ...prev, [field]: value }))
    setAddError('')
  }

  function handleAddServer() {
    if (!newServer.name.trim()) {
      setAddError(t('cfg_err_name'))
      return
    }
    if (!newServer.base_url.trim()) {
      setAddError(t('cfg_err_url'))
      return
    }
    try {
      new URL(newServer.base_url)
    } catch {
      setAddError(t('cfg_err_url_invalid'))
      return
    }

    const id = generateId(newServer.name)
    const existing = localConfig.servers?.find(server => server.id === id)
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
    setLocalConfig(prev => ({
      ...prev,
      test_settings: {
        download_size_mb: 25,
        upload_size_mb: 10,
        latency_samples: 10,
        timeout_ms: 30000
      }
    }))
  }

  if (!localConfig) {
    return <div className="config-loading">{t('cfg_loading')}</div>
  }

  const servers = localConfig.servers || []
  const enabledServers = servers.filter(server => server.enabled).length
  const defaultServer = servers.find(server => server.default)
  const ts = localConfig.test_settings || {}
  const settings = localConfig.settings || {}

  return (
    <div className="config-panel">
      <section className="panel properties-banner">
        <div className="panel-body properties-banner-body">
          <div className="properties-banner-copy">
            <img className="properties-banner-icon" src={iconConfig} alt="" aria-hidden="true" />
            <div className="properties-banner-copy__body">
              <div className="properties-banner-title">{t('cfg_banner_title')}</div>
              <div className="properties-banner-text">{t('cfg_banner_text')}</div>
            </div>
          </div>
          <div className="properties-banner-meta">
            <div className="properties-banner-meta__item">
              <span>{t('cfg_default_route')}</span>
              <strong>{defaultServer?.name || t('cfg_not_set')}</strong>
            </div>
            <div className="properties-banner-meta__item">
              <span>{t('cfg_location')}</span>
              <strong>{defaultServer?.location || t('cfg_unknown')}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="config-layout">
        <aside className="config-sidebar">
          <section className="panel config-sidebar-panel">
            <div className="panel-header">{t('cfg_summary_title')}</div>
            <div className="panel-body config-sidebar-body">
              <div className="config-summary-card">
                <span className="config-summary-card__label">{t('cfg_enabled_servers')}</span>
                <strong className="config-summary-card__value">{enabledServers}</strong>
              </div>
              <div className="config-summary-card">
                <span className="config-summary-card__label">{t('cfg_default_route')}</span>
                <strong className="config-summary-card__value config-summary-card__value--small">
                  {defaultServer?.name || t('cfg_not_set')}
                </strong>
              </div>
              <div className="config-summary-card">
                <span className="config-summary-card__label">{t('cfg_saved_reports')}</span>
                <strong className="config-summary-card__value">{localConfig.history?.length || 0}</strong>
              </div>
            </div>
          </section>

          <section className="panel config-sidebar-panel">
            <div className="panel-header">{t('cfg_file_title')}</div>
            <div className="panel-body config-path-section">
              <div className="config-path-label">{t('cfg_file_location')}</div>
              <code className="config-path-value">{configPath || t('loading_badge')}</code>
              {configPath && (
                <button className="btn-secondary" onClick={handleRevealConfig}>
                  {t('cfg_open_explorer')}
                </button>
              )}
            </div>
          </section>
        </aside>

        <div className="config-main">
          <section className="panel config-section">
            <div className="panel-header">{t('cfg_servers_title')}</div>
            <div className="panel-body">
              <div className="config-section-intro">{t('cfg_servers_intro')}</div>

              <div className="config-servers-list">
                {servers.map(server => (
                  <div key={server.id} className={`config-server-item ${!server.enabled ? 'config-server-item--disabled' : ''}`}>
                    <div className="config-server-main">
                      <div className="config-server-title-row">
                        <span className="config-server-name">{server.name}</span>
                        <span className="config-server-location">{server.location}</span>
                        {server.default && <span className="config-server-default-badge">{t('cfg_server_default')}</span>}
                      </div>
                      <div className="config-server-url">{server.base_url}</div>
                      <div className="config-server-meta">
                        <span>{t('cfg_server_dl')}: {server.download_path || t('cfg_server_na')}</span>
                        <span>{t('cfg_server_ul')}: {server.upload_path || t('cfg_server_na')}</span>
                        <span>{t('cfg_server_latency')}: {server.latency_path || t('cfg_server_na')}</span>
                      </div>
                    </div>

                    <div className="config-server-actions">
                      <button
                        className={`btn-toggle ${server.enabled ? 'btn-toggle--on' : 'btn-toggle--off'}`}
                        onClick={() => handleToggleServer(server.id)}
                      >
                        {server.enabled ? t('cfg_btn_enabled') : t('cfg_btn_disabled')}
                      </button>
                      {!server.default && server.enabled && (
                        <button className="btn-secondary" onClick={() => handleSetDefault(server.id)}>
                          {t('cfg_btn_set_default')}
                        </button>
                      )}
                      {servers.length > 1 && (
                        <button
                          className="btn-secondary btn-secondary--danger"
                          onClick={() => handleDeleteServer(server.id)}
                        >
                          {t('cfg_btn_remove')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!showAddServer ? (
                <button className="btn-secondary" onClick={() => setShowAddServer(true)}>
                  {t('cfg_btn_add_server')}
                </button>
              ) : (
                <div className="config-add-server-form">
                  <div className="config-subsection-title">{t('cfg_add_title')}</div>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label">{t('cfg_field_name')}</label>
                      <input
                        type="text"
                        value={newServer.name}
                        onChange={e => handleAddServerField('name', e.target.value)}
                        placeholder="My Server"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">{t('cfg_field_location')}</label>
                      <input
                        type="text"
                        value={newServer.location}
                        onChange={e => handleAddServerField('location', e.target.value)}
                        placeholder="Tokyo, JP"
                      />
                    </div>
                    <div className="form-field form-field--full">
                      <label className="form-label">{t('cfg_field_base_url')}</label>
                      <input
                        type="text"
                        value={newServer.base_url}
                        onChange={e => handleAddServerField('base_url', e.target.value)}
                        placeholder="https://speedtest.example.com"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">{t('cfg_field_dl_path')}</label>
                      <input
                        type="text"
                        value={newServer.download_path}
                        onChange={e => handleAddServerField('download_path', e.target.value)}
                        placeholder="/__down"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">{t('cfg_field_ul_path')}</label>
                      <input
                        type="text"
                        value={newServer.upload_path}
                        onChange={e => handleAddServerField('upload_path', e.target.value)}
                        placeholder="/__up"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">{t('cfg_field_lat_path')}</label>
                      <input
                        type="text"
                        value={newServer.latency_path}
                        onChange={e => handleAddServerField('latency_path', e.target.value)}
                        placeholder="/ping"
                      />
                    </div>
                  </div>

                  {addError && <div className="form-error">{addError}</div>}

                  <div className="form-actions">
                    <button className="btn-secondary" onClick={handleAddServer}>
                      {t('cfg_btn_save_server')}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setShowAddServer(false)
                        setAddError('')
                        setNewServer({ ...EMPTY_SERVER })
                      }}
                    >
                      {t('cfg_btn_cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="config-grid">
            <section className="panel config-section">
              <div className="panel-header">{t('cfg_test_title')}</div>
              <div className="panel-body">
                <div className="config-section-intro">{t('cfg_test_intro')}</div>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">{t('cfg_dl_size')}</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={ts.download_size_mb ?? 25}
                      onChange={e => handleTestSettingChange('download_size_mb', e.target.value)}
                    />
                    <span className="form-hint">{t('cfg_dl_size_hint')}</span>
                  </div>
                  <div className="form-field">
                    <label className="form-label">{t('cfg_ul_size')}</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={ts.upload_size_mb ?? 10}
                      onChange={e => handleTestSettingChange('upload_size_mb', e.target.value)}
                    />
                    <span className="form-hint">{t('cfg_ul_size_hint')}</span>
                  </div>
                  <div className="form-field">
                    <label className="form-label">{t('cfg_lat_samples')}</label>
                    <input
                      type="number"
                      min="3"
                      max="50"
                      value={ts.latency_samples ?? 10}
                      onChange={e => handleTestSettingChange('latency_samples', e.target.value)}
                    />
                    <span className="form-hint">{t('cfg_lat_samples_hint')}</span>
                  </div>
                  <div className="form-field">
                    <label className="form-label">{t('cfg_timeout')}</label>
                    <input
                      type="number"
                      min="5000"
                      max="120000"
                      step="1000"
                      value={ts.timeout_ms ?? 30000}
                      onChange={e => handleTestSettingChange('timeout_ms', e.target.value)}
                    />
                    <span className="form-hint">{t('cfg_timeout_hint')}</span>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn-secondary" onClick={handleRestoreDefaults}>
                    {t('cfg_btn_restore')}
                  </button>
                </div>
              </div>
            </section>

            <section className="panel config-section">
              <div className="panel-header">{t('cfg_general_title')}</div>
              <div className="panel-body">
                <div className="config-section-intro">{t('cfg_general_intro')}</div>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">{t('cfg_save_history')}</label>
                    <select
                      value={settings.save_history ? 'true' : 'false'}
                      onChange={e => handleSettingChange('save_history', e.target.value === 'true')}
                    >
                      <option value="true">{t('cfg_opt_enabled')}</option>
                      <option value="false">{t('cfg_opt_disabled')}</option>
                    </select>
                    <span className="form-hint">{t('cfg_save_history_hint')}</span>
                  </div>
                  <div className="form-field">
                    <label className="form-label">{t('cfg_history_limit')}</label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.history_limit ?? 100}
                      onChange={e => handleSettingChange('history_limit', Number(e.target.value))}
                    />
                    <span className="form-hint">{t('cfg_history_limit_hint')}</span>
                  </div>
                  <div className="form-field">
                    <label className="form-label">{t('cfg_language')}</label>
                    <select
                      value={lang}
                      onChange={e => setLang(e.target.value)}
                    >
                      {SUPPORTED_LANGS.map(l => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    <span className="form-hint">{t('cfg_language_hint')}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="config-save-row">
            <div className="config-attribution">{t('cfg_attribution')}</div>
            <button
              className={`btn-primary ${saved ? 'btn-primary--success' : ''}`}
              onClick={handleSave}
            >
              {saved ? t('cfg_btn_saved') : t('cfg_btn_save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
