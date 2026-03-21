import { useT } from '../i18n/index.jsx'
import iconStatus from '../assets/icons/icon-status.png'
import iconHistory from '../assets/icons/icon-history.png'
import iconConfig from '../assets/icons/icon-config.png'
import iconDiag from '../assets/icons/icon-diagnostics.png'

export default function Navbar({ currentView, onNavigate, status = 'idle', config }) {
  const { t } = useT()

  const TABS = [
    { id: 'dashboard',    label: t('nav_tab_status'),  iconSrc: iconStatus,  description: t('nav_tab_status_desc') },
    { id: 'diagnostics',  label: t('nav_tab_diag'),    iconSrc: iconDiag,    description: t('nav_tab_diag_desc') },
    { id: 'history',      label: t('nav_tab_history'), iconSrc: iconHistory, description: t('nav_tab_history_desc') },
    { id: 'config',       label: t('nav_tab_config'),  iconSrc: iconConfig,  description: t('nav_tab_config_desc') }
  ]

  const STATUS_LABELS = {
    idle: t('nav_st_idle'),
    latency: t('nav_st_latency'),
    download: t('nav_st_download'),
    upload: t('nav_st_upload'),
    scoring: t('nav_st_scoring'),
    complete: t('nav_st_complete'),
    error: t('nav_st_error')
  }

  const servers = config?.servers || []
  const enabledServers = servers.filter(server => server.enabled).length
  const defaultServer = servers.find(server => server.default && server.enabled) || servers.find(server => server.enabled)
  const historyCount = config?.history?.length || 0

  return (
    <aside className="navbar">
      <section className="sidebar-group">
        <div className="sidebar-group__title">{t('nav_tasks')}</div>
        <div className="navbar-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`navbar-tab ${currentView === tab.id ? 'navbar-tab--active' : ''}`}
              onClick={() => onNavigate(tab.id)}
              aria-current={currentView === tab.id ? 'page' : undefined}
              title={tab.description}
            >
              <img className="navbar-tab-icon" src={tab.iconSrc} alt="" aria-hidden="true" />
              <span className="navbar-tab-copy">
                <span className="navbar-tab-label">{tab.label}</span>
                <span className="navbar-tab-description">{tab.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="sidebar-group">
        <div className="sidebar-group__title">{t('nav_details')}</div>
        <div className="sidebar-details">
          <div className="sidebar-detail-row">
            <span className="sidebar-detail-key">{t('nav_detail_status')}</span>
            <strong className="sidebar-detail-value">{STATUS_LABELS[status] || STATUS_LABELS.idle}</strong>
          </div>
          <div className="sidebar-detail-row">
            <span className="sidebar-detail-key">{t('nav_detail_servers')}</span>
            <strong className="sidebar-detail-value">{enabledServers}</strong>
          </div>
          <div className="sidebar-detail-row">
            <span className="sidebar-detail-key">{t('nav_detail_route')}</span>
            <strong className="sidebar-detail-value">{defaultServer?.name || t('nav_not_set')}</strong>
          </div>
          <div className="sidebar-detail-row">
            <span className="sidebar-detail-key">{t('nav_detail_reports')}</span>
            <strong className="sidebar-detail-value">{historyCount}</strong>
          </div>
        </div>
      </section>

      <section className="sidebar-group sidebar-group--places">
        <div className="sidebar-group__title">{t('nav_places')}</div>
        <div className="sidebar-places">
          <div className="sidebar-place">{t('nav_place_network')}</div>
          <div className="sidebar-place">{t('nav_place_entire')}</div>
          <div className="sidebar-place">{t('nav_place_panel')}</div>
        </div>
      </section>

      <div className={`navbar-status navbar-status--${status}`}>
        <span className={`navbar-status-dot navbar-status-dot--${status}`} />
        <div className="navbar-status-copy">
          <strong>{t('nav_local_conn')}</strong>
          <span>{STATUS_LABELS[status] || STATUS_LABELS.idle}</span>
        </div>
      </div>
    </aside>
  )
}
