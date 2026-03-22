import { useT } from '../i18n/index.jsx'
import iconStatus  from '../assets/icons/icon-status.png'
import iconDiag    from '../assets/icons/icon-diagnostics.png'
import iconPrivacy from '../assets/icons/icon-privacy.png'
import iconHistory from '../assets/icons/icon-history.png'
import iconConfig  from '../assets/icons/icon-config.png'

export default function Navbar({ currentView, onNavigate, status = 'idle' }) {
  const { t } = useT()

  const TABS = [
    { id: 'dashboard', label: t('nav_tab_status'),  iconSrc: iconStatus,  description: t('nav_tab_status_desc') },
    { id: 'network',   label: t('nav_tab_network'), iconSrc: iconDiag,    description: t('nav_tab_network_desc') },
    { id: 'privacy',   label: t('nav_tab_privacy'), iconSrc: iconPrivacy, description: t('nav_tab_privacy_desc') },
    { id: 'history',   label: t('nav_tab_history'), iconSrc: iconHistory, description: t('nav_tab_history_desc') },
    { id: 'config',    label: t('nav_tab_config'),  iconSrc: iconConfig,  description: t('nav_tab_config_desc') }
  ]

  const STATUS_LABELS = {
    idle:     t('nav_st_idle'),
    latency:  t('nav_st_latency'),
    download: t('nav_st_download'),
    upload:   t('nav_st_upload'),
    scoring:  t('nav_st_scoring'),
    complete: t('nav_st_complete'),
    error:    t('nav_st_error')
  }

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
