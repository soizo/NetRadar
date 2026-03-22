import { useT } from '../i18n/index.jsx'
import iconDiag   from '../assets/icons/icon-diagnostics.png'
import iconIp     from '../assets/icons/icon-ip-sm.png'
import iconDns    from '../assets/icons/icon-dns-sm.png'
import iconWifi   from '../assets/icons/icon-wifi-sm.png'
import iconRouter from '../assets/icons/icon-router-sm.png'
import {
  DiagCardShell,
  DiagnosticsEmptyState,
  DiagnosticsRunBar,
  DiagRow,
  DiagSignalBars
} from './DiagnosticsShared.jsx'

// ─── IP Identity (local) ─────────────────────────────────────────────────────

const PLATFORM_LABELS = {
  darwin: 'macOS', win32: 'Windows', linux: 'Linux',
  freebsd: 'FreeBSD', openbsd: 'OpenBSD'
}

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
          <DiagRow label={t('diag_ip_hostname')} valueClass="diag-row__value--blue">{data.hostname}</DiagRow>
          <DiagRow label={t('diag_ip_platform')}>{PLATFORM_LABELS[data.platform] || data.platform}</DiagRow>
          <DiagRow label={t('diag_ip_os')} valueClass="diag-row__value--muted">{data.release}</DiagRow>
          <DiagRow label={t('diag_ip_arch')} valueClass="diag-row__value--muted">{data.arch}</DiagRow>
          {data.addresses?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="diag-table-label">{t('diag_ip_local_addrs')}</div>
              <div className="diag-table-scroll">
                <table className="diag-iface-table">
                  <thead><tr><th>{t('diag_lan_name')}</th><th>{t('diag_lan_family')}</th><th>{t('diag_lan_address')}</th><th>{t('diag_lan_cidr')}</th></tr></thead>
                  <tbody>
                    {data.addresses.map((a, i) => (
                      <tr key={i}><td>{a.name}</td><td>{a.family}</td><td>{a.address}</td><td>{a.cidr || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                <span className="diag-dns-entry__provider">{s.provider || t('diag_dns_unknown_provider')}</span>
              </div>
            ))}
          </div>
          <DiagRow label={t('diag_dns_latency')}>{data.avgLatencyMs != null ? `${data.avgLatencyMs} ms` : t('diag_na')}</DiagRow>
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

function formatSecurity(sec) {
  if (!sec) return null
  return sec.replace(/-/g, ' ').toUpperCase()
}

function WifiCard({ data, loading, error }) {
  const { t } = useT()
  const state = loading ? 'loading' : error ? 'error' : data === undefined ? 'idle' : data === null ? 'idle' : 'ok'
  return (
    <DiagCardShell icon={iconWifi} title={t('diag_wifi_title')} dotState={state}>
      {loading && <div className="diag-state">{t('diag_loading')}</div>}
      {!loading && error && <div className="diag-state diag-state--error">{t('diag_error')}</div>}
      {!loading && !error && data === null && <div className="diag-state diag-state--muted">{t('diag_wifi_ethernet')}</div>}
      {!loading && !error && data && (
        <>
          <DiagRow label={t('diag_wifi_ssid')} valueClass="diag-row__value--blue">{data.ssid}</DiagRow>
          {data.bssid && <DiagRow label={t('diag_wifi_bssid')} valueClass="diag-row__value--muted">{data.bssid}</DiagRow>}
          <DiagRow label={t('diag_wifi_signal')}>
            <span className="diag-wifi-signal">
              <DiagSignalBars percent={data.signalPercent ?? 0} />
              <span>{data.signalPercent != null ? `${data.signalPercent}%` : t('diag_na')}</span>
            </span>
          </DiagRow>
          {data.rssiDbm != null && (
            <DiagRow label={t('diag_wifi_rssi')} valueClass="diag-row__value--muted">{data.rssiDbm} dBm</DiagRow>
          )}
          <DiagRow label={t('diag_wifi_channel')}>{data.channel || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_wifi_band')}>{data.band || t('diag_na')}</DiagRow>
          <DiagRow label={t('diag_wifi_security')}>{formatSecurity(data.security) || t('diag_na')}</DiagRow>
          {data.linkSpeedMbps != null && <DiagRow label={t('diag_wifi_speed')}>{data.linkSpeedMbps} Mbps</DiagRow>}
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
          <DiagRow label={t('diag_lan_gateway')} valueClass="diag-row__value--blue">{data.gateway?.ip || t('diag_na')}</DiagRow>
          {data.gateway?.mac && <DiagRow label={t('diag_lan_gateway_mac')} valueClass="diag-row__value--muted">{data.gateway.mac}</DiagRow>}
          <DiagRow label={t('diag_lan_manufacturer')}>{data.gateway?.manufacturer || t('diag_lan_unknown_mfr')}</DiagRow>
          {data.interfaces?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="diag-table-label">{t('diag_lan_interfaces')}</div>
              <div className="diag-table-scroll">
                <table className="diag-iface-table">
                  <thead><tr><th>{t('diag_lan_name')}</th><th>{t('diag_lan_family')}</th><th>{t('diag_lan_address')}</th><th>{t('diag_lan_cidr')}</th></tr></thead>
                  <tbody>
                    {data.interfaces.map((iface, i) => (
                      <tr key={i}><td>{iface.name}</td><td>{iface.family}</td><td>{iface.address}</td><td>{iface.cidr || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DiagCardShell>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function NetworkPanel({ data, loading, errors, status, run, reset }) {
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
        <DiagnosticsEmptyState icon={iconDiag} text={t('diag_network_desc')} />
      )}
      {hasRun && (
        <div className="diag-cards-grid">
          <IpCard  data={data.ip}       loading={loading.ip}       error={errors.ip} />
          <DnsCard data={data.dns}      loading={loading.dns}      error={errors.dns} />
          <WifiCard data={data.wifi}    loading={loading.wifi}     error={errors.wifi} />
          <LanCard  data={data.localNet} loading={loading.localNet} error={errors.localNet} />
        </div>
      )}
    </div>
  )
}
