import React from 'react'
import { useT } from '../i18n/index.jsx'

function latencyColor(ms) {
  if (ms == null || ms === 0) return 'var(--xp-text-muted)'
  if (ms < 20) return 'var(--xp-success)'
  if (ms < 50) return '#6b9f1f'
  if (ms < 100) return 'var(--xp-warning)'
  return 'var(--xp-danger)'
}

function jitterColor(ms) {
  if (ms == null || ms === 0) return 'var(--xp-text-muted)'
  if (ms < 5) return 'var(--xp-success)'
  if (ms < 15) return '#6b9f1f'
  if (ms < 30) return 'var(--xp-warning)'
  return 'var(--xp-danger)'
}

function formatMs(val) {
  if (val == null || val === 0) return '--'
  return `${val.toFixed(1)} ms`
}

export default function StatsGrid({ results }) {
  const { t } = useT()

  const latencyMs = results?.latencyMs ?? null
  const jitterMs = results?.jitterMs ?? null
  const minMs = results?.minMs ?? null
  const maxMs = results?.maxMs ?? null

  const metrics = [
    {
      label: t('metric_latency'),
      value: formatMs(latencyMs),
      color: latencyColor(latencyMs),
      icon: '⏱',
      desc: t('metric_latency_desc')
    },
    {
      label: t('metric_jitter'),
      value: formatMs(jitterMs),
      color: jitterColor(jitterMs),
      icon: '≈',
      desc: t('metric_jitter_desc')
    },
    {
      label: t('metric_best'),
      value: formatMs(minMs),
      color: latencyColor(minMs),
      icon: '↓',
      desc: t('metric_best_desc')
    },
    {
      label: t('metric_worst'),
      value: formatMs(maxMs),
      color: latencyColor(maxMs),
      icon: '↑',
      desc: t('metric_worst_desc')
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
          <div className="stats-metric-value" style={{ color: metric.color }}>
            {metric.value}
          </div>
          <div className="stats-metric-desc">{metric.desc}</div>
        </div>
      ))}
    </div>
  )
}
