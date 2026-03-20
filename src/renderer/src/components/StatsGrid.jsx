import React from 'react'

function latencyColor(ms) {
  if (ms == null || ms === 0) return 'var(--text-muted)'
  if (ms < 20) return 'var(--text-primary)'
  if (ms < 50) return '#aaff00'
  if (ms < 100) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

function jitterColor(ms) {
  if (ms == null || ms === 0) return 'var(--text-muted)'
  if (ms < 5) return 'var(--text-primary)'
  if (ms < 15) return '#aaff00'
  if (ms < 30) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

function formatMs(val) {
  if (val == null || val === 0) return '--'
  return `${val.toFixed(1)} ms`
}

export default function StatsGrid({ results }) {
  const latencyMs = results?.latencyMs ?? null
  const jitterMs = results?.jitterMs ?? null
  const minMs = results?.minMs ?? null
  const maxMs = results?.maxMs ?? null

  const metrics = [
    {
      label: 'LATENCY',
      value: formatMs(latencyMs),
      color: latencyColor(latencyMs),
      icon: '◇',
      desc: 'Round trip time'
    },
    {
      label: 'JITTER',
      value: formatMs(jitterMs),
      color: jitterColor(jitterMs),
      icon: '◈',
      desc: 'Latency variance'
    },
    {
      label: 'MIN RTT',
      value: formatMs(minMs),
      color: latencyColor(minMs),
      icon: '▼',
      desc: 'Best latency'
    },
    {
      label: 'MAX RTT',
      value: formatMs(maxMs),
      color: latencyColor(maxMs),
      icon: '▲',
      desc: 'Worst latency'
    }
  ]

  return (
    <div className="stats-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="stats-metric">
          <div className="stats-metric-header">
            <span className="stats-metric-icon" style={{ color: metric.color }}>{metric.icon}</span>
            <span className="stats-metric-label">{metric.label}</span>
          </div>
          <div
            className="stats-metric-value"
            style={{ color: metric.color }}
          >
            {metric.value}
          </div>
          <div className="stats-metric-desc">{metric.desc}</div>
        </div>
      ))}
    </div>
  )
}
