import { useT } from '../i18n/index.jsx'
import iconPrivacyLg from '../assets/icons/icon-privacy.png'
import iconPrivacy   from '../assets/icons/icon-privacy-sm.png'
import iconCens      from '../assets/icons/icon-cens-sm.png'
import iconNat       from '../assets/icons/icon-nat-sm.png'
import iconConfig    from '../assets/icons/icon-config-sm.png'
import {
  DiagCardShell,
  DiagnosticsEmptyState,
  DiagnosticsRunBar,
  DiagRow
} from './DiagnosticsShared.jsx'

// ─── Anonymity Status (derived from sysContext) ───────────────────────────────

function RepCard({ data, loading, error }) {
  const { t } = useT()
  const hasTunnel = data?.hasTunnel  || false
  const hasProxy  = data?.hasProxy   || false
  const hasVpnApp = data?.hasVpnApp  || false
  const confidence = data?.vpnConfidence ?? 0
  const hasSignal = hasTunnel || hasProxy || hasVpnApp
  const state = loading ? 'loading' : error ? 'error' : data ? (hasSignal ? 'warn' : 'ok') : 'idle'

  return (
    <DiagCardShell icon={iconPrivacy} title={t('diag_rep_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !data && !error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <DiagRow label={t('diag_rep_status')}>
            <div className="diag-badges">
              {hasTunnel  && <span className="diag-badge diag-badge--warn">{t('diag_rep_tunnel')}</span>}
              {hasProxy   && <span className="diag-badge diag-badge--warn">{t('diag_rep_proxy')}</span>}
              {hasVpnApp  && <span className="diag-badge diag-badge--warn">{t('diag_rep_vpn')}</span>}
              {!hasSignal && <span className="diag-badge diag-badge--active">{t('diag_rep_clean')}</span>}
            </div>
          </DiagRow>
          <DiagRow label={t('diag_sys_confidence')}>
            <span className={
              confidence === 0 ? 'diag-row__value--muted'
              : confidence === 1 ? 'diag-row__value--warn'
              : 'diag-row__value--error'
            }>
              {confidence === 0 ? t('diag_sys_conf_none')
               : confidence === 1 ? t('diag_sys_conf_low')
               : t('diag_sys_conf_high')}
            </span>
          </DiagRow>
        </>
      )}
    </DiagCardShell>
  )
}

// ─── System Network Context ───────────────────────────────────────────────────

function SysContextCard({ data, loading, error }) {
  const { t } = useT()
  const hasSignal = data?.vpnConfidence > 0
  const state = loading ? 'loading' : error ? 'error' : data ? (hasSignal ? 'warn' : 'ok') : 'idle'

  return (
    <DiagCardShell icon={iconConfig} title={t('diag_sys_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <DiagRow label={t('diag_sys_tunnel')}>
            {data.tunnelInterfaces?.length > 0
              ? <div className="diag-badges">{data.tunnelInterfaces.map((iface, i) => (
                  <span key={i} className="diag-badge diag-badge--warn">
                    {iface.name}{iface.address ? ` (${iface.address})` : ''}
                  </span>
                ))}</div>
              : <span className="diag-row__value--muted">{t('diag_sys_tunnel_none')}</span>
            }
          </DiagRow>
          <DiagRow label={t('diag_sys_proxy')}>
            {data.hasProxy
              ? <div className="diag-badges">
                  {data.proxySettings?.httpEnabled  && <span className="diag-badge diag-badge--warn">HTTP{data.proxySettings.httpProxy ? ` → ${data.proxySettings.httpProxy}` : ''}</span>}
                  {data.proxySettings?.httpsEnabled && <span className="diag-badge diag-badge--warn">HTTPS{data.proxySettings.httpsProxy ? ` → ${data.proxySettings.httpsProxy}` : ''}</span>}
                  {data.proxySettings?.socksEnabled && <span className="diag-badge diag-badge--warn">SOCKS{data.proxySettings.socksProxy ? ` → ${data.proxySettings.socksProxy}` : ''}</span>}
                </div>
              : <span className="diag-row__value--muted">{t('diag_sys_proxy_none')}</span>
            }
          </DiagRow>
          <DiagRow label={t('diag_sys_vpn_apps')}>
            {data.vpnProcesses?.length > 0
              ? <div className="diag-badges">{data.vpnProcesses.map((p, i) => <span key={i} className="diag-badge diag-badge--warn">{p}</span>)}</div>
              : <span className="diag-row__value--muted">{t('diag_sys_vpn_none')}</span>
            }
          </DiagRow>
          <DiagRow label={t('diag_sys_confidence')}>
            <span className={
              data.vpnConfidence === 0 ? 'diag-row__value--muted'
              : data.vpnConfidence === 1 ? 'diag-row__value--warn'
              : 'diag-row__value--error'
            }>
              {data.vpnConfidence === 0 ? t('diag_sys_conf_none')
               : data.vpnConfidence === 1 ? t('diag_sys_conf_low')
               : t('diag_sys_conf_high')}
            </span>
          </DiagRow>
        </>
      )}
    </DiagCardShell>
  )
}

// ─── Censorship ───────────────────────────────────────────────────────────────

function CensCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading'
    : error ? 'error'
    : data ? (data.gfwDetected ? (data.bypassed ? 'warn' : 'error') : 'ok')
    : 'idle'

  return (
    <DiagCardShell icon={iconCens} title={t('diag_cens_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <div className="diag-table-scroll">
            <table className="diag-cens-table">
              <thead>
                <tr><th>Host</th><th>{t('diag_cens_latency')}</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.sites.map((s) => (
                  <tr key={s.host}>
                    <td>{s.host}</td>
                    <td style={{ color: 'var(--xp-text-muted)' }}>{s.latencyMs != null ? `${s.latencyMs} ms` : '—'}</td>
                    <td style={{ color: s.reachable ? 'var(--xp-success)' : 'var(--xp-danger)', fontWeight: 700 }}>
                      {s.reachable ? t('diag_cens_reachable') : t('diag_cens_blocked')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.gfwDetected && !data.bypassed && (
            <div className="diag-cens__summary diag-cens__summary--warn">
              {t('diag_cens_gfw_detected')} — {t('diag_cens_not_bypassed')}
            </div>
          )}
          {data.gfwDetected && data.bypassed && (
            <div className="diag-cens__summary diag-cens__summary--bypassed">
              {t('diag_cens_gfw_detected')} — {t('diag_cens_bypassed')}
            </div>
          )}
          {!data.gfwDetected && (
            <div className="diag-cens__summary diag-cens__summary--ok">
              {t('diag_cens_no_gfw')}
            </div>
          )}
        </>
      )}
    </DiagCardShell>
  )
}

// ─── NAT Type ─────────────────────────────────────────────────────────────────

const NAT_TYPE_LABELS = { NONE: 'diag_nat_none', CONE: 'diag_nat_cone', SYMMETRIC: 'diag_nat_symmetric', UNKNOWN: 'diag_nat_unknown' }
const NAT_TYPE_CLASS  = { NONE: 'diag-row__value--ok', CONE: '', SYMMETRIC: 'diag-row__value--warn', UNKNOWN: 'diag-row__value--muted' }
const NAT_DOT_STATE   = { NONE: 'ok', CONE: 'ok', SYMMETRIC: 'warn', UNKNOWN: 'idle', null: 'idle' }

function NatCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? (NAT_DOT_STATE[data.type] || 'idle') : 'idle'

  return (
    <DiagCardShell icon={iconNat} title={t('diag_nat_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <DiagRow label={t('diag_nat_type')}>
            <span className={NAT_TYPE_CLASS[data.type] || ''}>
              {t(NAT_TYPE_LABELS[data.type] || 'diag_nat_unknown')}
            </span>
          </DiagRow>
          {data.hasNat !== null && (
            <DiagRow label="">
              <span className={data.hasNat ? 'diag-badge diag-badge--warn' : 'diag-badge diag-badge--active'}>
                {data.hasNat ? t('diag_nat_has_nat') : t('diag_nat_no_nat')}
              </span>
            </DiagRow>
          )}
          {data.externalIp   && <DiagRow label={t('diag_nat_external_ip')}   valueClass="diag-row__value--blue">{data.externalIp}</DiagRow>}
          {data.externalPort && <DiagRow label={t('diag_nat_external_port')} valueClass="diag-row__value--muted">{data.externalPort}</DiagRow>}
          {data.hasRelay   && <DiagRow label={t('diag_nat_relay')}       valueClass="diag-row__value--warn">{t('diag_cens_yes')}</DiagRow>}
          {data.udpBlocked && <DiagRow label={t('diag_nat_udp_blocked')} valueClass="diag-row__value--error">{t('diag_cens_yes')}</DiagRow>}
        </>
      )}
    </DiagCardShell>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function PrivacyPanel({ data, loading, errors, status, run, reset }) {
  const { t } = useT()
  const isRunning = status === 'running'
  const hasRun = status === 'complete' || status === 'running' || Object.values(data).some(v => v !== null)

  return (
    <div className="diagnostics-panel">
      <DiagnosticsRunBar
        isRunning={isRunning}
        hasRun={hasRun}
        onRun={run}
        onReset={reset}
        runLabel={t('diag_run')}
        runningLabel={t('diag_running')}
        resetLabel={t('diag_reset')}
      />

      {!hasRun && (
        <DiagnosticsEmptyState icon={iconPrivacyLg} text={t('diag_privacy_desc')} />
      )}

      {hasRun && (
        <div className="diag-cards-grid">
          <RepCard
            data={data.sysContext}
            loading={loading.sysContext}
            error={errors.sysContext}
          />
          <SysContextCard
            data={data.sysContext}
            loading={loading.sysContext}
            error={errors.sysContext}
          />
          <CensCard
            data={data.censorship}
            loading={loading.censorship}
            error={errors.censorship}
          />
          <NatCard
            data={data.nat}
            loading={loading.nat}
            error={errors.nat}
          />
        </div>
      )}
    </div>
  )
}
