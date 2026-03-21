import { execSync } from 'child_process'
import { createConnection } from 'net'
import { networkInterfaces } from 'os'
import dns from 'dns'
import https from 'https'
import http from 'http'

// ─── IP Identity ──────────────────────────────────────────────────────────────

export async function getIpIdentity() {
  return new Promise((resolve) => {
    const req = http.get(
      'http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,isp,org,as,proxy,hosting,query',
      { timeout: 8000 },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          try {
            const d = JSON.parse(raw)
            if (d.status !== 'success') return resolve(null)
            resolve({
              ip: d.query,
              country: d.country,
              countryCode: d.countryCode,
              city: d.city,
              region: d.regionName,
              isp: d.isp,
              org: d.org,
              asn: d.as,
              isProxy: d.proxy,
              isHosting: d.hosting
            })
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

// ─── IP Reputation ────────────────────────────────────────────────────────────

export async function getIpReputation(ip) {
  if (!ip) return null
  return new Promise((resolve) => {
    const req = https.get(
      `https://proxycheck.io/v2/${ip}?vpn=1&asn=1&risk=1`,
      { timeout: 8000 },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          try {
            const d = JSON.parse(raw)
            if (d.status === 'error') return resolve(null)
            const entry = d[ip]
            if (!entry) return resolve(null)
            resolve({
              isVpn: entry.vpn === 'yes',
              isTor: entry.type === 'Tor',
              isProxy: entry.proxy === 'yes',
              riskScore: entry.risk != null ? Number(entry.risk) : null,
              type: entry.type || null,
              provider: entry.provider || entry.isp || null,
              asn: entry.asn || null
            })
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

// ─── Censorship / GFW Connectivity ───────────────────────────────────────────

const CENSORSHIP_TARGETS = [
  { host: 'google.com',     port: 443 },
  { host: 'youtube.com',    port: 443 },
  { host: 'twitter.com',    port: 443 },
  { host: 'github.com',     port: 443 },
  { host: 'cloudflare.com', port: 443 }
]

function tcpProbe(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const sock = createConnection({ host, port })
    sock.setTimeout(timeoutMs)
    sock.on('connect', () => {
      const latencyMs = Date.now() - start
      sock.destroy()
      resolve({ host, reachable: true, latencyMs })
    })
    sock.on('timeout', () => {
      sock.destroy()
      resolve({ host, reachable: false, latencyMs: null })
    })
    sock.on('error', () => {
      resolve({ host, reachable: false, latencyMs: null })
    })
  })
}

export async function checkCensorshipConnectivity(countryCode) {
  const results = await Promise.all(
    CENSORSHIP_TARGETS.map((t) => tcpProbe(t.host, t.port))
  )

  const baseline = results.find((r) => r.host === 'cloudflare.com')
  const blocked = results.filter((r) => r.host !== 'cloudflare.com')
  const allBlockedFail = blocked.every((r) => !r.reachable)
  const allBlockedReachable = blocked.every((r) => r.reachable)

  // Only flag GFW if IP is from a known censored region and blocking is consistent
  const censoredRegions = ['CN', 'IR', 'RU', 'KP', 'TM', 'BY', 'CU']
  const inCensoredRegion = censoredRegions.includes(countryCode)

  let gfwDetected = false
  let bypassed = null

  if (allBlockedFail && baseline?.reachable) {
    // Can reach Cloudflare but not any of the test sites → strong signal
    gfwDetected = true
    bypassed = false
  } else if (inCensoredRegion && !allBlockedFail) {
    // In censored region but sites reachable → likely bypassed
    gfwDetected = true
    bypassed = true
  } else if (!inCensoredRegion && allBlockedFail) {
    // Not in censored region but still blocked → possible corporate/ISP filter
    gfwDetected = false
    bypassed = null
  }

  return { sites: results, gfwDetected, bypassed, baselineReachable: baseline?.reachable ?? false }
}

// ─── DNS Info ────────────────────────────────────────────────────────────────

const KNOWN_DNS = {
  '1.1.1.1':   'Cloudflare',
  '1.0.0.1':   'Cloudflare',
  '8.8.8.8':   'Google',
  '8.8.4.4':   'Google',
  '9.9.9.9':   'Quad9',
  '149.112.112.112': 'Quad9',
  '208.67.222.222':  'OpenDNS',
  '208.67.220.220':  'OpenDNS',
  '94.140.14.14':    'AdGuard',
  '94.140.15.15':    'AdGuard',
  '223.5.5.5':  'Alibaba DNS',
  '223.6.6.6':  'Alibaba DNS',
  '119.29.29.29': 'DNSPod (Tencent)',
  '114.114.114.114': '114 DNS',
  '180.76.76.76': 'Baidu DNS'
}

function measureDnsLatency() {
  return new Promise((resolve) => {
    const start = Date.now()
    dns.resolve4('cloudflare.com', (err) => {
      resolve(err ? null : Date.now() - start)
    })
  })
}

export async function getDnsInfo() {
  const servers = dns.getServers()

  // Measure latency 3 times, take average
  const samples = await Promise.all([
    measureDnsLatency(),
    measureDnsLatency(),
    measureDnsLatency()
  ])
  const valid = samples.filter((v) => v !== null)
  const avgLatencyMs = valid.length > 0
    ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    : null

  const labeled = servers.map((ip) => {
    // Strip port if present (e.g. [::1]:53 → ::1)
    const clean = ip.replace(/^\[(.+)\].*$/, '$1').replace(/:\d+$/, '')
    const provider = KNOWN_DNS[clean] || null
    return { ip: clean, provider }
  })

  const customDns = labeled.some((s) => s.provider !== null && !s.provider.includes('ISP'))
  const hasKnownProvider = labeled.some((s) => s.provider !== null)

  return {
    servers: labeled,
    avgLatencyMs,
    customDns: hasKnownProvider,
    resolverCount: servers.length
  }
}

// ─── Local Network & Gateway ──────────────────────────────────────────────────

// Top router OUI prefixes (first 3 hex bytes of MAC, uppercase)
const OUI_MAP = {
  '00:0C:E7': 'TP-Link', 'F4:F2:6D': 'TP-Link', '14:CF:92': 'TP-Link',
  'B0:BE:76': 'TP-Link', '50:C7:BF': 'TP-Link', 'EC:08:6B': 'TP-Link',
  '04:D9:F5': 'Asus',    '50:46:5D': 'Asus',    'AC:22:0B': 'Asus',
  '60:45:CB': 'Asus',    'F8:32:E4': 'Asus',
  '20:E5:2A': 'Netgear', 'A0:40:A0': 'Netgear', 'C0:FF:D4': 'Netgear',
  '10:DA:43': 'Netgear', '9C:3D:CF': 'Netgear',
  '00:18:0A': 'Linksys', 'C0:C1:C0': 'Linksys', '20:AA:4B': 'Linksys',
  '00:1A:2B': 'Cisco',   'F8:72:EA': 'Cisco',   '00:25:B5': 'Cisco',
  '54:A7:03': 'Huawei',  '00:9A:CD': 'Huawei',  'E8:CD:2D': 'Huawei',
  '80:FB:06': 'Xiaomi',  '34:CE:00': 'Xiaomi',  '28:D1:27': 'Xiaomi',
  '78:44:76': 'Xiaomi',  'F8:A2:D6': 'Xiaomi',
  '00:50:F2': 'Microsoft (Hyper-V)',
  '00:0C:29': 'VMware', '00:50:56': 'VMware',
  '08:00:27': 'VirtualBox',
  '00:1B:63': 'Apple',   '00:23:32': 'Apple',   '00:25:00': 'Apple',
  '00:26:B9': 'Apple',
  'A8:9F:BA': 'D-Link',  'C8:BE:19': 'D-Link',  '14:D6:4D': 'D-Link',
  '1C:7E:E5': 'Tenda',   'C8:3A:35': 'Tenda',   '00:B0:0C': 'Tenda',
  '00:0B:DB': 'Synology', 'C8:0E:14': 'Synology',
  '90:72:82': 'MikroTik','4C:5E:0C': 'MikroTik','E4:8D:8C': 'MikroTik'
}

function lookupOui(mac) {
  if (!mac) return null
  const prefix = mac.toUpperCase().slice(0, 8) // XX:XX:XX
  return OUI_MAP[prefix] || null
}

function getDefaultGateway() {
  const platform = process.platform
  try {
    if (platform === 'darwin' || platform === 'linux') {
      const out = execSync('netstat -rn', { timeout: 3000, stdio: 'pipe' }).toString()
      // Look for default route line
      const match = out.match(/^(?:default|0\.0\.0\.0)\s+(\d+\.\d+\.\d+\.\d+)/m)
      return match ? match[1] : null
    } else if (platform === 'win32') {
      const out = execSync('route print 0.0.0.0', { timeout: 3000, stdio: 'pipe' }).toString()
      const match = out.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/)
      return match ? match[1] : null
    }
  } catch {
    return null
  }
  return null
}

function getGatewayMac(gatewayIp) {
  if (!gatewayIp) return null
  try {
    const out = execSync('arp -a', { timeout: 3000, stdio: 'pipe' }).toString()
    // Match lines containing the gateway IP followed by a MAC address
    const escaped = gatewayIp.replace(/\./g, '\\.')
    const re = new RegExp(`${escaped}[^\\n]*?([0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2})`)
    const m = out.match(re)
    if (!m) return null
    // Normalize to XX:XX:XX:XX:XX:XX
    return m[1].replace(/-/g, ':').toLowerCase()
  } catch {
    return null
  }
}

export function getLocalNetworkInfo() {
  const ifaces = networkInterfaces()
  const interfaces = []

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.internal) continue
      interfaces.push({
        name,
        address: addr.address,
        family: addr.family,
        mac: addr.mac,
        cidr: addr.cidr,
        netmask: addr.netmask
      })
    }
  }

  const gatewayIp = getDefaultGateway()
  const gatewayMac = getGatewayMac(gatewayIp)
  const manufacturer = lookupOui(gatewayMac)

  return {
    interfaces,
    gateway: {
      ip: gatewayIp,
      mac: gatewayMac,
      manufacturer
    }
  }
}

// ─── Wi-Fi Info ───────────────────────────────────────────────────────────────

function parseRssiToPercent(rssi) {
  if (rssi == null) return null
  // Typical range: -30 (excellent) to -90 (terrible)
  const clamped = Math.max(-90, Math.min(-30, rssi))
  return Math.round(((clamped + 90) / 60) * 100)
}

function channelToBand(channel) {
  if (!channel) return null
  const ch = Number(channel)
  if (ch >= 1 && ch <= 14) return '2.4 GHz'
  if (ch >= 36 && ch <= 177) return '5 GHz'
  if (ch >= 1 && ch <= 233) return '6 GHz'
  return null
}

export function getWifiInfo() {
  const platform = process.platform
  try {
    if (platform === 'darwin') {
      const airportPath =
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'
      const out = execSync(`"${airportPath}" -I`, { timeout: 5000, stdio: 'pipe' }).toString()
      const get = (key) => {
        const m = out.match(new RegExp(`\\s+${key}:\\s+(.+)`))
        return m ? m[1].trim() : null
      }
      const ssid = get('SSID')
      const bssid = get('BSSID')
      const rssi = get('agrCtlRSSI') ? Number(get('agrCtlRSSI')) : null
      const channel = get('channel')
      const mcs = get('MCS') ? Number(get('MCS')) : null
      const security = get('link auth')

      // channel can be "6" or "44,+1" (bonded)
      const channelNum = channel ? channel.split(',')[0] : null

      if (!ssid || ssid === '(not associated)') return null

      return {
        ssid,
        bssid,
        rssiDbm: rssi,
        signalPercent: parseRssiToPercent(rssi),
        channel: channelNum,
        band: channelToBand(channelNum),
        security: security || null,
        mcs
      }
    } else if (platform === 'win32') {
      const out = execSync('netsh wlan show interfaces', { timeout: 5000, stdio: 'pipe' }).toString()
      const get = (key) => {
        const m = out.match(new RegExp(`${key}\\s*:\\s+(.+)`))
        return m ? m[1].trim() : null
      }
      const ssid = get('SSID')
      const bssid = get('BSSID')
      const signal = get('Signal') // "75%"
      const channel = get('Channel')
      const auth = get('Authentication')
      const rxRate = get('Receive rate \\(Mbps\\)')

      if (!ssid) return null

      const signalPercent = signal ? parseInt(signal) : null

      return {
        ssid,
        bssid,
        rssiDbm: null,
        signalPercent,
        channel,
        band: channelToBand(channel),
        security: auth || null,
        linkSpeedMbps: rxRate ? Number(rxRate) : null
      }
    } else if (platform === 'linux') {
      // Try nmcli first
      const out = execSync('nmcli -t -f ACTIVE,SSID,SIGNAL,CHAN,SECURITY dev wifi 2>/dev/null', {
        timeout: 5000,
        stdio: 'pipe'
      }).toString()
      const activeLine = out.split('\n').find((l) => l.startsWith('yes:'))
      if (!activeLine) return null
      const parts = activeLine.split(':')
      // yes:SSID:signal:chan:security
      const ssid = parts[1] || null
      const signal = parts[2] ? Number(parts[2]) : null
      const channel = parts[3] || null
      const security = parts[4] || null

      return {
        ssid,
        bssid: null,
        rssiDbm: null,
        signalPercent: signal,
        channel,
        band: channelToBand(channel),
        security,
        linkSpeedMbps: null
      }
    }
  } catch {
    return null
  }
  return null
}
