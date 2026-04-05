export function calculateNetworkScore(metrics) {
  const { downloadMbps, uploadMbps, latencyMs, jitterMs } = metrics

  // Download score: logarithmic scale
  // 1 Mbps→20, 10 Mbps→47, 50 Mbps→65, 100 Mbps→73, 500 Mbps→90, 1000 Mbps→100
  const scoreDownload = downloadMbps > 0
    ? Math.min(100, 20 + (Math.log10(downloadMbps + 1) / Math.log10(1001)) * 80)
    : 0

  // Upload score: similar but lower thresholds
  // 1 Mbps→20, 10 Mbps→47, 50 Mbps→67, 100 Mbps→74, 500 Mbps→100
  const scoreUpload = uploadMbps > 0
    ? Math.min(100, 20 + (Math.log10(uploadMbps + 1) / Math.log10(501)) * 80)
    : 0

  // Latency score: exponential decay
  // 0 or missing → 0 (no data), 5ms→97, 20ms→90, 50ms→78, 100ms→61, 200ms→37, 500ms→8
  const scoreLatency = (latencyMs > 0)
    ? Math.max(0, 100 * Math.pow(0.995, latencyMs))
    : 0

  // Jitter score: exponential decay for better granularity
  // 0ms→100, 5ms→86, 10ms→74, 20ms→54, 50ms→22
  const scoreJitter = Math.max(0, 100 * Math.pow(0.97, jitterMs))

  // Weighted composite
  const weights = { download: 0.35, upload: 0.20, latency: 0.30, jitter: 0.15 }
  const overall = (
    scoreDownload * weights.download +
    scoreUpload * weights.upload +
    scoreLatency * weights.latency +
    scoreJitter * weights.jitter
  )

  const rounded = Math.round(overall)

  return {
    overall: rounded,
    breakdown: {
      download: Math.round(scoreDownload),
      upload: Math.round(scoreUpload),
      latency: Math.round(scoreLatency),
      jitter: Math.round(scoreJitter)
    },
    grade: getGrade(rounded),
    rating: getRating(rounded),
    color: getScoreColor(rounded)
  }
}

function getGrade(score) {
  if (score >= 95) return 'S+'
  if (score >= 90) return 'S'
  if (score >= 85) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function getRating(score) {
  if (score >= 90) return 'OUTSTANDING'
  if (score >= 80) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 60) return 'FAIR'
  if (score >= 40) return 'POOR'
  return 'CRITICAL'
}

function getScoreColor(score) {
  if (score >= 90) return '#00d4ff'
  if (score >= 80) return '#00ff41'
  if (score >= 60) return '#aaff00'
  if (score >= 40) return '#ffcc00'
  if (score >= 20) return '#ff6c00'
  return '#ff4444'
}

export function formatSpeed(mbps) {
  if (mbps == null || mbps === 0) return '0.00 Mbps'
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`
  if (mbps >= 100) return `${Math.round(mbps)} Mbps`
  if (mbps >= 10) return `${mbps.toFixed(1)} Mbps`
  return `${mbps.toFixed(2)} Mbps`
}

export function getLatencyLabel(ms) {
  if (ms < 10) return 'ULTRA LOW'
  if (ms < 20) return 'EXCELLENT'
  if (ms < 50) return 'GOOD'
  if (ms < 100) return 'MODERATE'
  if (ms < 200) return 'HIGH'
  return 'VERY HIGH'
}
