import { useT } from '../i18n/index.jsx'
import { useDiagnostics } from '../hooks/useDiagnostics.js'
import iconDiag     from '../assets/icons/icon-diagnostics.png'
import iconIp       from '../assets/icons/icon-ip.png'
import iconPrivacy  from '../assets/icons/icon-privacy.png'
import iconCens     from '../assets/icons/icon-cens.png'
import iconDns      from '../assets/icons/icon-dns.png'
import iconWifi     from '../assets/icons/icon-wifi.png'
import iconRouter   from '../assets/icons/icon-router.png'
import iconConfig   from '../assets/icons/icon-config.png'
import {
  DiagCardShell,
  DiagnosticsEmptyState,
  DiagnosticsRunBar,
  DiagRiskBar,
  DiagRow,
  DiagSignalBars
} from './DiagnosticsShared.jsx'

// ─── IP Identity ──────────────────────────────────────────────────────────────

function IpCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? 'ok' : 'idle'

  return (
    <DiagCardShell icon={iconIp} title={t('diag_ip_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !error && !data && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <DiagRow label={t('diag_ip_address')} valueClass="diag-row__value--blue">{data.ip}</DiagRow>
          <DiagRow label={t('diag_ip_country')}>{data.country || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_ip_region')}>{data.region || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_ip_city')}>{data.city || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_ip_isp')}>{data.isp || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_ip_org')}>{data.org || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_ip_asn')} valueClass="diag-row__value--muted">{data.asn || t('diag_na')}</DiagRow>
        </>
      )}
    </DiagCardShell>
  )
}

// ─── Anonymity & Reputation ───────────────────────────────────────────────────

function RepCard({ data, loading, error, ipData }) {
  const { t } = useT()

  // Combine signals from ip-api (isProxy, isHosting) and proxycheck.io (data)
  const isVpn     = data?.isVpn     || false
  const isTor     = data?.isTor     || false
  const isProxy   = data?.isProxy   || ipData?.isProxy || false
  const isDc      = ipData?.isHosting || (data?.type?.toLowerCase().includes('datacenter')) || false
  const riskScore = data?.riskScore ?? null
  const connType  = data?.type || (isDc ? 'Datacenter' : isVpn ? 'VPN' : isTor ? 'Tor' : isProxy ? 'Proxy' : 'Residential')
  const provider  = data?.provider || null

  const hasAnonymity = isVpn || isTor || isProxy || isDc
  const state = loading ? 'loading' : error ? 'error' : (data || ipData) ? (hasAnonymity ? 'warn' : 'ok') : 'idle'

  return (
    <DiagCardShell icon={iconPrivacy} title={t('diag_rep_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !data && !ipData && !error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && (data || ipData) && (
        <>
          <DiagRow label={t('diag_rep_type')}>
            {isDc ? t('diag_rep_datacenter') : t('diag_rep_residential')}
            {isVpn ? ` / ${t('diag_rep_vpn')}` : ''}
            {isTor ? ` / ${t('diag_rep_tor')}` : ''}
            {isProxy && !isVpn ? ` / ${t('diag_rep_proxy')}` : ''}
          </DiagRow>
          <DiagRow label="">
            <div className="diag-badges">
              {isVpn   && <span className="diag-badge diag-badge--warn">{t('diag_rep_vpn')}</span>}
              {isTor   && <span className="diag-badge diag-badge--error">{t('diag_rep_tor')}</span>}
              {isProxy && <span className="diag-badge diag-badge--warn">{t('diag_rep_proxy')}</span>}
              {isDc    && <span className="diag-badge diag-badge--warn">{t('diag_rep_datacenter')}</span>}
              {!hasAnonymity && <span className="diag-badge diag-badge--active">{t('diag_rep_clean')}</span>}
            </div>
          </DiagRow>
          {riskScore != null && (
            <DiagRow label={t('diag_rep_risk')}>
              <DiagRiskBar score={riskScore} />
            </DiagRow>
          )}
          {provider && <DiagRow label={t('diag_rep_provider')}>{provider}</DiagRow>}
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
          <table className="diag-cens-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>{t('diag_cens_latency')}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.sites.map((s) => (
                <tr key={s.host}>
                  <td>{s.host}</td>
                  <td style={{ color: 'var(--xp-text-muted)' }}>
                    {s.latencyMs != null ? `${s.latencyMs} ms` : '—'}
                  </td>
                  <td style={{ color: s.reachable ? 'var(--xp-success)' : 'var(--xp-danger)', fontWeight: 700 }}>
                    {s.reachable ? t('diag_cens_reachable') : t('diag_cens_blocked')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

// ─── DNS ──────────────────────────────────────────────────────────────────────

function DnsCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? 'ok' : 'idle'

  return (
    <DiagCardShell icon={iconDns} title={t('diag_dns_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <div className="diag-dns-list">
            {data.servers.map((s, i) => (
              <div key={i} className="diag-dns-entry">
                <span className="diag-dns-entry__ip">{s.ip}</span>
                <span className="diag-dns-entry__provider">
                  {s.provider || t('diag_dns_unknown_provider')}
                </span>
              </div>
            ))}
          </div>
          <DiagRow label={t('diag_dns_latency')}>
            {data.avgLatencyMs != null ? `${data.avgLatencyMs} ms` : t('diag_na')}
          </DiagRow>
          <DiagRow label={t('diag_dns_custom')}>
            <span className={data.customDns ? 'diag-row__value--ok' : 'diag-row__value--muted'}>
              {data.customDns ? t('diag_cens_yes') : t('diag_dns_isp_default')}
            </span>
          </DiagRow>
        </>
      )}
    </DiagCardShell>
  )
}

// ─── Wi-Fi ────────────────────────────────────────────────────────────────────

function WifiCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data === undefined ? 'idle' : data === null ? 'idle' : 'ok'

  return (
    <DiagCardShell icon={iconWifi} title={t('diag_wifi_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !error && data === null && (
        <div className="diag-state diag-state--muted">{t('diag_wifi_ethernet')}</div>
      )}
      {!loading && !error && data && (
        <>
          <DiagRow label={t('diag_wifi_ssid')} valueClass="diag-row__value--blue">{data.ssid}</DiagRow>
          {data.bssid && <DiagRow label={t('diag_wifi_bssid')} valueClass="diag-row__value--muted">{data.bssid}</DiagRow>}
          <DiagRow label={t('diag_wifi_signal')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DiagSignalBars percent={data.signalPercent ?? 0} />
              <span>{data.signalPercent != null ? `${data.signalPercent}%` : ''}</span>
              {data.rssiDbm != null && (
                <span style={{ color: 'var(--xp-text-muted)' }}>({data.rssiDbm} dBm)</span>
              )}
            </span>
          </DiagRow>
          <DiagRow label={t('diag_wifi_channel')}>{data.channel || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_wifi_band')}>{data.band || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_wifi_security')}>{data.security || t('diag_na')}</DiagRow>
          {data.linkSpeedMbps != null && (
            <DiagRow label={t('diag_wifi_speed')}>{data.linkSpeedMbps} Mbps</DiagRow>
          )}
        </>
      )}
    </DiagCardShell>
  )
}

// ─── LAN & Router ─────────────────────────────────────────────────────────────

function LanCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? 'ok' : 'idle'

  return (
    <DiagCardShell icon={iconRouter} title={t('diag_lan_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <DiagRow label={t('diag_lan_gateway')} valueClass="diag-row__value--blue">
            {data.gateway?.ip || t('diag_na')}
          </DiagRow>
          {data.gateway?.mac && (
            <DiagRow label={t('diag_lan_gateway_mac')} valueClass="diag-row__value--muted">
              {data.gateway.mac}
            </DiagRow>
          )}
          <DiagRow label={t('diag_lan_manufacturer')}>
            {data.gateway?.manufacturer || t('diag_lan_unknown_mfr')}
          </DiagRow>

          {data.interfaces?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--xp-text-muted)', marginBottom: 4 }}>
                {t('diag_lan_interfaces')}
              </div>
              <table className="diag-iface-table">
                <thead>
                  <tr>
                    <th>{t('diag_lan_name')}</th>
                    <th>{t('diag_lan_family')}</th>
                    <th>{t('diag_lan_address')}</th>
                    <th>{t('diag_lan_cidr')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.interfaces.map((iface, i) => (
                    <tr key={i}>
                      <td>{iface.name}</td>
                      <td>{iface.family}</td>
                      <td>{iface.address}</td>
                      <td>{iface.cidr || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              ? <div className="diag-badges">
                  {data.tunnelInterfaces.map((iface, i) => (
                    <span key={i} className="diag-badge diag-badge--warn">
                      {iface.name}{iface.address ? ` (${iface.address})` : ''}
                    </span>
                  ))}
                </div>
              : <span className="diag-row__value--muted">{t('diag_sys_tunnel_none')}</span>
            }
          </DiagRow>
          <DiagRow label={t('diag_sys_proxy')}>
            {data.hasProxy
              ? <div className="diag-badges">
                  {data.proxySettings?.httpEnabled  && <span className="diag-badge diag-badge--warn">HTTP {data.proxySettings.httpProxy ? `→ ${data.proxySettings.httpProxy}` : ''}</span>}
                  {data.proxySettings?.httpsEnabled && <span className="diag-badge diag-badge--warn">HTTPS {data.proxySettings.httpsProxy ? `→ ${data.proxySettings.httpsProxy}` : ''}</span>}
                  {data.proxySettings?.socksEnabled && <span className="diag-badge diag-badge--warn">SOCKS {data.proxySettings.socksProxy ? `→ ${data.proxySettings.socksProxy}` : ''}</span>}
                </div>
              : <span className="diag-row__value--muted">{t('diag_sys_proxy_none')}</span>
            }
          </DiagRow>
          <DiagRow label={t('diag_sys_vpn_apps')}>
            {data.vpnProcesses?.length > 0
              ? <div className="diag-badges">
                  {data.vpnProcesses.map((p, i) => (
                    <span key={i} className="diag-badge diag-badge--warn">{p}</span>
                  ))}
                </div>
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

// ─── NAT Type ─────────────────────────────────────────────────────────────────

const NAT_TYPE_LABELS = { NONE: 'diag_nat_none', CONE: 'diag_nat_cone', SYMMETRIC: 'diag_nat_symmetric', UNKNOWN: 'diag_nat_unknown' }
const NAT_TYPE_CLASS  = { NONE: 'diag-row__value--ok', CONE: '', SYMMETRIC: 'diag-row__value--warn', UNKNOWN: 'diag-row__value--muted' }
const NAT_DOT_STATE   = { NONE: 'ok', CONE: 'ok', SYMMETRIC: 'warn', UNKNOWN: 'idle', null: 'idle' }

function NatCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? (NAT_DOT_STATE[data.type] || 'idle') : 'idle'

  return (
    <DiagCardShell icon={iconCens} title={t('diag_nat_title')} dotState={state}>
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
          {data.externalIp && (
            <DiagRow label={t('diag_nat_external_ip')} valueClass="diag-row__value--blue">{data.externalIp}</DiagRow>
          )}
          {data.externalPort && (
            <DiagRow label={t('diag_nat_external_port')} valueClass="diag-row__value--muted">{data.externalPort}</DiagRow>
          )}
          {data.hasRelay && (
            <DiagRow label={t('diag_nat_relay')} valueClass="diag-row__value--warn">{t('diag_cens_yes')}</DiagRow>
          )}
          {data.udpBlocked && (
            <DiagRow label={t('diag_nat_udp_blocked')} valueClass="diag-row__value--error">{t('diag_cens_yes')}</DiagRow>
          )}
        </>
      )}
    </DiagCardShell>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function DiagnosticsPanel() {
  const { t } = useT()
  const { status, data, loading, errors, run, reset } = useDiagnostics()

  const isRunning = status === 'running'
  const hasRun = status === 'complete' || status === 'running' ||
    Object.values(data).some((v) => v !== null)

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

      {/* Idle splash — before first run */}
      {!hasRun && (
        <DiagnosticsEmptyState icon={iconDiag} text={t('subtitle_diagnostics')} />
      )}

      {/* Cards — only shown after run starts */}
      {hasRun && (
        <div className="diag-cards-grid">
          <IpCard
            data={data.ip}
            loading={loading.ip}
            error={errors.ip}
          />
          <RepCard
            data={data.reputation}
            loading={loading.reputation}
            error={errors.reputation}
            ipData={data.ip}
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
          <DnsCard
            data={data.dns}
            loading={loading.dns}
            error={errors.dns}
          />
          <WifiCard
            data={data.wifi}
            loading={loading.wifi}
            error={errors.wifi}
          />
          <LanCard
            data={data.localNet}
            loading={loading.localNet}
            error={errors.localNet}
          />
        </div>
      )}
    </div>
  )
}
