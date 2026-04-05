import { exec } from 'child_process'
import { createConnection } from 'net'
import { networkInterfaces, hostname, platform, release, arch } from 'os'
import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import dns from 'dns'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ─── IP Identity (local — no external API) ────────────────────────────────────

export function getIpIdentity() {
  const ifaces = networkInterfaces()
  const addresses = []
  for (const [name, addrs] of Object.entries(ifaces || {})) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.internal) continue
      addresses.push({ name, family: addr.family, address: addr.address, cidr: addr.cidr || null })
    }
  }
  return {
    hostname: hostname(),
    platform: platform(),
    release: release(),
    arch: arch(),
    addresses
  }
}

// ─── Censorship / GFW Connectivity ───────────────────────────────────────────

const DEFAULT_CENSORSHIP_TARGETS = [
  { host: 'google.com',     port: 443 },
  { host: 'youtube.com',    port: 443 },
  { host: 'twitter.com',    port: 443 },
  { host: 'github.com',     port: 443 },
  { host: 'cloudflare.com', port: 443 }
]

function buildCensorshipTargets(customTargets = []) {
  const extras = (Array.isArray(customTargets) ? customTargets : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        const normalized = /^[a-z]+:\/\//i.test(entry) ? entry : `https://${entry}`
        const url = new URL(normalized)
        return {
          host: url.hostname,
          port: Number(url.port) || (url.protocol === 'http:' ? 80 : 443)
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const deduped = new Map()
  for (const target of [...DEFAULT_CENSORSHIP_TARGETS, ...extras]) {
    deduped.set(`${target.host}:${target.port}`, target)
  }

  return [...deduped.values()]
}

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
      sock.destroy()
      resolve({ host, reachable: false, latencyMs: null })
    })
  })
}

export async function checkCensorshipConnectivity(countryCode, customTargets = []) {
  const targets = buildCensorshipTargets(customTargets)
  const results = await Promise.all(
    targets.map((t) => tcpProbe(t.host, t.port))
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

function measureDnsLatency(domain) {
  return new Promise((resolve) => {
    const start = Date.now()
    dns.resolve4(domain, (err) => {
      resolve(err ? null : Date.now() - start)
    })
  })
}

export async function getDnsInfo() {
  const servers = dns.getServers()

  // Measure latency sequentially with different domains
  const dnsDomains = ['cloudflare.com', 'google.com', 'example.com']
  const samples = []
  for (const domain of dnsDomains) {
    samples.push(await measureDnsLatency(domain))
  }
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
  // Zero-pad each octet for consistent OUI lookup
  const normalized = mac.split(/[:\-]/).map(o => o.padStart(2, '0')).join(':')
  const prefix = normalized.toUpperCase().slice(0, 8) // XX:XX:XX
  return OUI_MAP[prefix] || null
}

async function getDefaultGateway() {
  const plat = process.platform
  try {
    if (plat === 'darwin' || plat === 'linux') {
      const { stdout } = await execAsync('netstat -rn', { timeout: 3000 })
      const match = stdout.match(/^(?:default|0\.0\.0\.0)\s+(\d+\.\d+\.\d+\.\d+)/m)
      return match ? match[1] : null
    } else if (plat === 'win32') {
      const { stdout } = await execAsync('route print 0.0.0.0', { timeout: 3000 })
      const match = stdout.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/)
      return match ? match[1] : null
    }
  } catch {
    return null
  }
  return null
}

async function getGatewayMac(gatewayIp) {
  if (!gatewayIp) return null
  try {
    const { stdout } = await execAsync('arp -a', { timeout: 3000 })
    const escaped = gatewayIp.replace(/\./g, '\\.')
    const re = new RegExp(`${escaped}[^\\n]*?([0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2}[:\\-][0-9a-fA-F]{1,2})`)
    const m = stdout.match(re)
    if (!m) return null
    // Normalize to XX:XX:XX:XX:XX:XX with zero-padded octets
    return m[1].replace(/-/g, ':').split(':').map(o => o.padStart(2, '0')).join(':').toLowerCase()
  } catch {
    return null
  }
}

export async function getLocalNetworkInfo() {
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

  const gatewayIp = await getDefaultGateway()
  const gatewayMac = await getGatewayMac(gatewayIp)
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

// Known 5 GHz channels
const FIVE_GHZ_CHANNELS = new Set([
  36, 40, 44, 48, 52, 56, 60, 64,
  100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
  149, 153, 157, 161, 165
])

function channelToBand(channel) {
  if (!channel) return null
  const ch = Number(channel)
  if (ch > 177) return '6 GHz'
  if (FIVE_GHZ_CHANNELS.has(ch)) return '5 GHz'
  if (ch >= 1 && ch <= 14) return '2.4 GHz'
  // Channels 15-177 not in the known 5 GHz set → likely 6 GHz
  if (ch > 14) return '6 GHz'
  return null
}

async function getWifiViaMacosSystemProfiler() {
  try {
    const { stdout } = await execAsync('system_profiler SPAirPortDataType -json', { timeout: 10000 })
    const data = JSON.parse(stdout)
    const airportInfo = data?.SPAirPortDataType
    if (!Array.isArray(airportInfo) || airportInfo.length === 0) return null

    // Find the current network info within the interface list
    for (const iface of airportInfo) {
      const currentNetwork = iface?.spairport_current_network_information
      if (!currentNetwork) continue

      const ssid = currentNetwork.spairport_current_network_information_ssid || null
      if (!ssid) continue

      const bssid = currentNetwork.spairport_current_network_information_bssid || null
      const rssi = currentNetwork.spairport_signal_noise?.spairport_signal_noise_signal
        ? Number(currentNetwork.spairport_signal_noise.spairport_signal_noise_signal)
        : null
      const noise = currentNetwork.spairport_signal_noise?.spairport_signal_noise_noise
        ? Number(currentNetwork.spairport_signal_noise.spairport_signal_noise_noise)
        : null
      const channel = currentNetwork.spairport_current_network_information_channel
        ? String(currentNetwork.spairport_current_network_information_channel).split(/[,\s]/)[0]
        : null
      const phyMode = currentNetwork.spairport_current_network_information_phy_mode || null
      const txRate = currentNetwork.spairport_current_network_information_tx_rate
        ? Number(currentNetwork.spairport_current_network_information_tx_rate)
        : null
      const security = currentNetwork.spairport_current_network_information_security || null

      return {
        ssid,
        bssid,
        rssiDbm: rssi,
        signalPercent: parseRssiToPercent(rssi),
        channel,
        band: channelToBand(channel),
        security: security || null,
        phyMode,
        linkSpeedMbps: txRate
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getWifiInfo() {
  const plat = process.platform
  try {
    if (plat === 'darwin') {
      const airportPath =
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'
      try {
        const { stdout } = await execAsync(`"${airportPath}" -I`, { timeout: 5000 })
        const get = (key) => {
          const m = stdout.match(new RegExp(`\\s+${key}:\\s+(.+)`))
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
      } catch {
        // airport command not available — fall back to system_profiler
        return await getWifiViaMacosSystemProfiler()
      }
    } else if (plat === 'win32') {
      const { stdout } = await execAsync('netsh wlan show interfaces', { timeout: 5000 })
      const get = (key) => {
        const m = stdout.match(new RegExp(`${key}\\s*:\\s+(.+)`))
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
    } else if (plat === 'linux') {
      // Try nmcli first
      const { stdout } = await execAsync('nmcli -t -f ACTIVE,SSID,SIGNAL,CHAN,SECURITY dev wifi 2>/dev/null', {
        timeout: 5000
      })
      const activeLine = stdout.split('\n').find((l) => l.startsWith('yes:'))
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

// ─── System Tunnel / Proxy / VPN Process Detection ───────────────────────────

const VPN_PROCESS_PATTERNS = [
  'clash', 'clashx', 'mihomo',
  'shadowsocks', 'sslocal', 'ssr',
  'v2ray', 'v2rayx', 'v2rayng',
  'xray', 'xrayx',
  'surge', 'surge4',
  'trojan', 'trojan-go',
  'hysteria', 'hysteria2',
  'sing-box',
  'openvpn',
  'wireguard', 'wg-quick',
  'zerotier', 'zerotier-one',
  'tailscale', 'tailscaled',
  'tunnelblick',
  'nordvpn', 'nordvpnd',
  'expressvpn', 'expressvpnd',
  'surfshark',
  'mullvad', 'mullvad-vpn',
  'proxifier',
  'privoxy'
]

export async function getSystemNetworkContext() {
  const plat = process.platform

  // ── 1. Tunnel interfaces ──────────────────────────────────────────────────
  const ifaces = networkInterfaces()
  const tunnelInterfaces = []
  for (const [name, addrs] of Object.entries(ifaces || {})) {
    if (/^(utun|tun|tap|ppp|ipsec|wg|zt)\d*/i.test(name)) {
      const ipv4 = addrs?.find(a => a.family === 'IPv4')
      tunnelInterfaces.push({ name, address: ipv4?.address || addrs?.[0]?.address || null })
    }
  }

  // ── 2. System proxy settings ──────────────────────────────────────────────
  let proxySettings = null
  try {
    if (plat === 'darwin') {
      const { stdout } = await execAsync('scutil --proxy', { timeout: 3000 })
      const num = (key) => { const m = stdout.match(new RegExp(`${key}\\s*:\\s*(\\d+)`)); return m ? Number(m[1]) : 0 }
      const str = (key) => { const m = stdout.match(new RegExp(`${key}\\s*:\\s*(.+)`)); return m ? m[1].trim() : null }
      proxySettings = {
        httpEnabled:  num('HTTPEnable')  === 1,
        httpsEnabled: num('HTTPSEnable') === 1,
        socksEnabled: num('SOCKSEnable') === 1,
        httpProxy:  str('HTTPProxy')  ? `${str('HTTPProxy')}:${str('HTTPPort')  || '80'}`   : null,
        httpsProxy: str('HTTPSProxy') ? `${str('HTTPSProxy')}:${str('HTTPSPort') || '443'}` : null,
        socksProxy: str('SOCKSProxy') ? `${str('SOCKSProxy')}:${str('SOCKSPort') || '1080'}`: null
      }
    } else if (plat === 'win32') {
      const { stdout: regOut } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable', { timeout: 3000 })
      const enabled = /0x1/.test(regOut)
      let server = null
      try {
        const { stdout: s } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer', { timeout: 3000 })
        server = s.match(/ProxyServer\s+REG_SZ\s+(.+)/)?.[1]?.trim() || null
      } catch {}
      proxySettings = { httpEnabled: enabled, httpProxy: server }
    } else if (plat === 'linux') {
      const h = process.env.http_proxy || process.env.HTTP_PROXY || null
      const hs = process.env.https_proxy || process.env.HTTPS_PROXY || null
      proxySettings = { httpEnabled: !!h, httpsEnabled: !!hs, httpProxy: h, httpsProxy: hs }
    }
  } catch { /* ignore */ }

  // ── 3. Known VPN/proxy processes ─────────────────────────────────────────
  const detectedProcesses = []
  if (plat === 'darwin' || plat === 'linux') {
    try {
      const { stdout: psOut } = await execAsync('ps -eo comm 2>/dev/null || ps aux', { timeout: 4000 })
      const psLower = psOut.toLowerCase()
      for (const name of VPN_PROCESS_PATTERNS) {
        if (new RegExp('\\b' + name + '\\b', 'i').test(psLower)) detectedProcesses.push(name)
      }
    } catch { /* ignore */ }
    if (plat === 'darwin') {
      try {
        const { stdout: lsOut } = await execAsync('lsappinfo list 2>/dev/null', { timeout: 4000 })
        const lsLower = lsOut.toLowerCase()
        for (const name of VPN_PROCESS_PATTERNS) {
          if (new RegExp('\\b' + name + '\\b', 'i').test(lsLower) && !detectedProcesses.includes(name)) detectedProcesses.push(name)
        }
      } catch { /* ignore */ }
    }
  } else if (plat === 'win32') {
    try {
      const { stdout: wmicOut } = await execAsync('tasklist /fo csv /nh 2>nul', { timeout: 4000 })
      const wmicLower = wmicOut.toLowerCase()
      for (const name of VPN_PROCESS_PATTERNS) {
        if (new RegExp('\\b' + name + '\\b', 'i').test(wmicLower)) detectedProcesses.push(name)
      }
    } catch { /* ignore */ }
  }

  const hasProxy  = !!(proxySettings?.httpEnabled || proxySettings?.httpsEnabled || proxySettings?.socksEnabled)
  const hasTunnel = tunnelInterfaces.length > 0
  const hasVpnApp = detectedProcesses.length > 0
  return {
    tunnelInterfaces, hasTunnel,
    proxySettings,    hasProxy,
    vpnProcesses: detectedProcesses, hasVpnApp,
    vpnConfidence: (hasTunnel ? 1 : 0) + (hasProxy ? 1 : 0) + (hasVpnApp ? 1 : 0)
  }
}

// ─── Public IP + Geolocation ─────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const requester = url.startsWith('https') ? httpsRequest : httpRequest
    const req = requester(url, { timeout: 8000 }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve(body))
      res.on('error', reject)
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    req.end()
  })
}

export async function getPublicIpInfo() {
  try {
    // Step 1: Get IP and basic info from Cloudflare trace
    const traceText = await httpGet('https://cloudflare.com/cdn-cgi/trace')
    const traceMap = {}
    for (const line of traceText.split('\n')) {
      const idx = line.indexOf('=')
      if (idx > 0) traceMap[line.slice(0, idx)] = line.slice(idx + 1).trim()
    }
    const ip = traceMap.ip || null
    const countryCode = traceMap.loc || null
    const colo = traceMap.colo || null

    if (!ip) return { ip: null, error: 'Could not determine public IP from Cloudflare trace' }

    // Step 2: Get full geolocation from ip-api.com
    try {
      const geoText = await httpGet(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,as,query`)
      const geo = JSON.parse(geoText)
      if (geo.status === 'success') {
        return {
          ip,
          country: geo.country || null,
          countryCode,
          region: geo.regionName || null,
          city: geo.city || null,
          isp: geo.isp || null,
          asn: geo.as || null,
          colo
        }
      }
    } catch { /* fall through to partial result */ }

    // Partial result if ip-api fails
    return { ip, country: null, countryCode, region: null, city: null, isp: null, asn: null, colo }
  } catch (err) {
    return { ip: null, error: err.message || 'Failed to fetch public IP info' }
  }
}
