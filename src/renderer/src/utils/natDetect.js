// NAT type detection using WebRTC STUN
// Runs entirely in the renderer — no IPC needed.
//
// NAT types we report:
//   NONE       — no NAT (public IP == STUN-reflexive IP)
//   CONE       — one-to-one port mapping (Full Cone / Restricted Cone)
//   SYMMETRIC  — different external port per destination (hardest for P2P)
//   UNKNOWN    — STUN timed out or no candidates collected

const STUN_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' }
]

function parseCandidateFields(candidateStr) {
  // a=candidate:... <foundation> <component> <protocol> <priority> <ip> <port> typ <type> [raddr <relatedAddr> rport <relatedPort>]
  const parts = candidateStr.replace(/^candidate:/, '').split(' ')
  return {
    ip:           parts[4] || null,
    port:         parts[5] ? Number(parts[5]) : null,
    type:         parts[7] || null,  // host | srflx | relay
    relatedAddr:  parts[9] || null,
    relatedPort:  parts[11] ? Number(parts[11]) : null
  }
}

export function detectNat(timeoutMs = 6000) {
  return new Promise((resolve) => {
    let pc
    const candidates = { host: [], srflx: [], relay: [] }
    let settled = false

    function finish() {
      if (settled) return
      settled = true
      try { pc.close() } catch {}

      const srflx = candidates.srflx
      const relay = candidates.relay

      if (srflx.length === 0 && relay.length === 0) {
        // No external candidates — either all UDP blocked or pure host
        const hostIps = new Set(candidates.host.map(c => c.ip))
        resolve({
          hasNat: null,
          type: 'UNKNOWN',
          externalIp: null,
          externalPort: null,
          hasRelay: false,
          udpBlocked: true,
          candidates: { host: candidates.host.length, srflx: 0, relay: 0 }
        })
        return
      }

      // Determine NAT presence: if any srflx address differs from host addresses
      const hostIps = new Set(candidates.host.map(c => c.ip).filter(Boolean))
      const srflxIps = [...new Set(srflx.map(c => c.ip).filter(Boolean))]
      const firstSrflxIp = srflxIps[0] || null
      const hasNat = firstSrflxIp ? !hostIps.has(firstSrflxIp) : null

      // Symmetric NAT: if we get srflx candidates from 2+ STUN servers and the
      // external PORT differs between them (same local socket, different remote destination)
      const srflxPorts = [...new Set(srflx.map(c => c.port).filter(Boolean))]
      const srflxIpSet = new Set(srflxIps)
      const isSymmetric = srflxPorts.length > 1 || srflxIpSet.size > 1

      let type
      if (!hasNat) {
        type = 'NONE'
      } else if (relay.length > 0 && srflx.length === 0) {
        type = 'SYMMETRIC' // so strict that only relay works
      } else if (isSymmetric) {
        type = 'SYMMETRIC'
      } else {
        type = 'CONE'
      }

      resolve({
        hasNat,
        type,
        externalIp:   firstSrflxIp,
        externalPort: srflx[0]?.port || null,
        hasRelay: relay.length > 0,
        udpBlocked: false,
        candidates: { host: candidates.host.length, srflx: srflx.length, relay: relay.length }
      })
    }

    const timer = setTimeout(finish, timeoutMs)

    try {
      pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
      pc.createDataChannel('nat-probe')

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) {
          clearTimeout(timer)
          finish()
          return
        }
        const f = parseCandidateFields(candidate.candidate)
        if (f.type === 'host')  candidates.host.push(f)
        if (f.type === 'srflx') candidates.srflx.push(f)
        if (f.type === 'relay') candidates.relay.push(f)
      }

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => { clearTimeout(timer); finish() })
    } catch (err) {
      clearTimeout(timer)
      resolve({ hasNat: null, type: 'UNKNOWN', externalIp: null, externalPort: null, hasRelay: false, udpBlocked: null, candidates: null })
    }
  })
}
