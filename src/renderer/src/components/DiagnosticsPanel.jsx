import { useT } from '../i18n/index.jsx'
import { useDiagnostics } from '../hooks/useDiagnostics.js'
import iconDiag     from '../assets/icons/icon-diagnostics.png'
import iconIp       from '../assets/icons/icon-ip.png'
import iconPrivacy  from '../assets/icons/icon-privacy.png'
import iconCens     from '../assets/icons/icon-cens.png'
import iconDns      from '../assets/icons/icon-dns.png'
import iconWifi     from '../assets/icons/icon-wifi.png'
import iconRouter   from '../assets/icons/icon-router.png'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dot(loading, value, errorMsg) {
  if (loading) return 'loading'
  if (errorMsg) return 'error'
  if (value == null) return 'idle'
  return 'ok'
}

function CardDot({ state }) {
  const cls = {
    loading: 'diag-card__dot diag-card__dot--loading',
    ok:      'diag-card__dot diag-card__dot--ok',
    warn:    'diag-card__dot diag-card__dot--warn',
    error:   'diag-card__dot diag-card__dot--error',
    idle:    'diag-card__dot'
  }[state] || 'diag-card__dot'
  return <span className={cls} />
}

function Row({ label, children, valueClass }) {
  return (
    <div className="diag-row">
      <span className="diag-row__label">{label}</span>
      <span className={`diag-row__value ${valueClass || ''}`}>{children}</span>
    </div>
  )
}

function CardShell({ icon, title, dotState, children }) {
  return (
    <div className="diag-card">
      <div className="diag-card__header">
        <img className="diag-card__icon" src={icon} alt="" aria-hidden="true" />
        <span className="diag-card__title">{title}</span>
        <CardDot state={dotState} />
      </div>
      <div className="diag-card__body">{children}</div>
    </div>
  )
}

// ─── Signal bar ───────────────────────────────────────────────────────────────

function SignalBars({ percent }) {
  const levels = [20, 40, 60, 80, 100]
  return (
    <span className="diag-signal">
      {levels.map((threshold, i) => (
        <span
          key={i}
          className={`diag-signal__bar ${percent >= threshold ? 'diag-signal__bar--lit' : ''}`}
          style={{ height: `${(i + 1) * 3}px` }}
        />
      ))}
    </span>
  )
}

// ─── Risk bar ─────────────────────────────────────────────────────────────────

function RiskBar({ score }) {
  const color = score >= 75 ? '#b24a4a' : score >= 40 ? '#b98518' : '#2b8a41'
  return (
    <div className="diag-risk-bar">
      <div className="diag-risk-bar__track">
        <div
          className="diag-risk-bar__fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="diag-risk-bar__label" style={{ color }}>{score}</span>
    </div>
  )
}

// ─── IP Identity ──────────────────────────────────────────────────────────────

function IpCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? 'ok' : 'idle'

  return (
    <CardShell icon={iconIp} title={t('diag_ip_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !error && !data && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <Row label={t('diag_ip_address')} valueClass="diag-row__value--blue">{data.ip}</Row>
          <Row label={t('diag_ip_country')}>{data.country || t('diag_na')}</Row>
          <Row label={t('diag_ip_region')}>{data.region || t('diag_na')}</Row>
          <Row label={t('diag_ip_city')}>{data.city || t('diag_na')}</Row>
          <Row label={t('diag_ip_isp')}>{data.isp || t('diag_na')}</Row>
          <Row label={t('diag_ip_org')}>{data.org || t('diag_na')}</Row>
          <Row label={t('diag_ip_asn')} valueClass="diag-row__value--muted">{data.asn || t('diag_na')}</Row>
        </>
      )}
    </CardShell>
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
    <CardShell icon={iconPrivacy} title={t('diag_rep_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !data && !ipData && !error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && (data || ipData) && (
        <>
          <Row label={t('diag_rep_type')}>
            {isDc ? t('diag_rep_datacenter') : t('diag_rep_residential')}
            {isVpn ? ` / ${t('diag_rep_vpn')}` : ''}
            {isTor ? ` / ${t('diag_rep_tor')}` : ''}
            {isProxy && !isVpn ? ` / ${t('diag_rep_proxy')}` : ''}
          </Row>
          <Row label="">
            <div className="diag-badges">
              {isVpn   && <span className="diag-badge diag-badge--warn">{t('diag_rep_vpn')}</span>}
              {isTor   && <span className="diag-badge diag-badge--error">{t('diag_rep_tor')}</span>}
              {isProxy && <span className="diag-badge diag-badge--warn">{t('diag_rep_proxy')}</span>}
              {isDc    && <span className="diag-badge diag-badge--warn">{t('diag_rep_datacenter')}</span>}
              {!hasAnonymity && <span className="diag-badge diag-badge--active">{t('diag_rep_clean')}</span>}
            </div>
          </Row>
          {riskScore != null && (
            <Row label={t('diag_rep_risk')}>
              <RiskBar score={riskScore} />
            </Row>
          )}
          {provider && <Row label={t('diag_rep_provider')}>{provider}</Row>}
        </>
      )}
    </CardShell>
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
    <CardShell icon={iconCens} title={t('diag_cens_title')} dotState={state}>
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
    </CardShell>
  )
}

// ─── DNS ──────────────────────────────────────────────────────────────────────

function DnsCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? 'ok' : 'idle'

  return (
    <CardShell icon={iconDns} title={t('diag_dns_title')} dotState={state}>
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
          <Row label={t('diag_dns_latency')}>
            {data.avgLatencyMs != null ? `${data.avgLatencyMs} ms` : t('diag_na')}
          </Row>
          <Row label={t('diag_dns_custom')}>
            <span className={data.customDns ? 'diag-row__value--ok' : 'diag-row__value--muted'}>
              {data.customDns ? t('diag_cens_yes') : t('diag_dns_isp_default')}
            </span>
          </Row>
        </>
      )}
    </CardShell>
  )
}

// ─── Wi-Fi ────────────────────────────────────────────────────────────────────

function WifiCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data === undefined ? 'idle' : data === null ? 'idle' : 'ok'

  return (
    <CardShell icon={iconWifi} title={t('diag_wifi_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !error && data === null && (
        <div className="diag-state diag-state--muted">{t('diag_wifi_ethernet')}</div>
      )}
      {!loading && !error && data && (
        <>
          <Row label={t('diag_wifi_ssid')} valueClass="diag-row__value--blue">{data.ssid}</Row>
          {data.bssid && <Row label={t('diag_wifi_bssid')} valueClass="diag-row__value--muted">{data.bssid}</Row>}
          <Row label={t('diag_wifi_signal')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SignalBars percent={data.signalPercent ?? 0} />
              <span>{data.signalPercent != null ? `${data.signalPercent}%` : ''}</span>
              {data.rssiDbm != null && (
                <span style={{ color: 'var(--xp-text-muted)' }}>({data.rssiDbm} dBm)</span>
              )}
            </span>
          </Row>
          <Row label={t('diag_wifi_channel')}>{data.channel || t('diag_na')}</Row>
          <Row label={t('diag_wifi_band')}>{data.band || t('diag_na')}</Row>
          <Row label={t('diag_wifi_security')}>{data.security || t('diag_na')}</Row>
          {data.linkSpeedMbps != null && (
            <Row label={t('diag_wifi_speed')}>{data.linkSpeedMbps} Mbps</Row>
          )}
        </>
      )}
    </CardShell>
  )
}

// ─── LAN & Router ─────────────────────────────────────────────────────────────

function LanCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data ? 'ok' : 'idle'

  return (
    <CardShell icon={iconRouter} title={t('diag_lan_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && data && (
        <>
          <Row label={t('diag_lan_gateway')} valueClass="diag-row__value--blue">
            {data.gateway?.ip || t('diag_na')}
          </Row>
          {data.gateway?.mac && (
            <Row label={t('diag_lan_gateway_mac')} valueClass="diag-row__value--muted">
              {data.gateway.mac}
            </Row>
          )}
          <Row label={t('diag_lan_manufacturer')}>
            {data.gateway?.manufacturer || t('diag_lan_unknown_mfr')}
          </Row>

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
    </CardShell>
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
      {/* Run bar */}
      <div className="diag-run-bar">
        <button
          className="btn-primary"
          onClick={run}
          disabled={isRunning}
        >
          {isRunning ? t('diag_running') : t('diag_run')}
        </button>
        {hasRun && !isRunning && (
          <button className="btn-secondary" onClick={reset}>{t('diag_reset')}</button>
        )}
        {isRunning && (
          <span className="diag-run-bar__status diag-run-bar__status--running">
            {t('diag_running')}
          </span>
        )}
      </div>

      {/* Idle splash — before first run */}
      {!hasRun && (
        <div className="diag-idle">
          <img className="diag-idle__icon" src={iconDiag} alt="" aria-hidden="true" />
          <p className="diag-idle__text">{t('subtitle_diagnostics')}</p>
        </div>
      )}

      {/* Cards — only shown after run starts */}
      {hasRun && (
        <>
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
          <CensCard
            data={data.censorship}
            loading={loading.censorship}
            error={errors.censorship}
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
        </>
      )}
    </div>
  )
}
