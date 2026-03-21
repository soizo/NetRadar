import React, { useEffect, useRef, useState } from 'react'

function getGaugeColor(value, maxValue) {
  const ratio = maxValue > 0 ? value / maxValue : 0
  if (ratio >= 0.75) return '#2f7dff'
  if (ratio >= 0.4) return '#3ba84f'
  if (ratio > 0) return '#f0a12b'
  return '#7e8ba0'
}

function formatDisplayValue(value) {
  if (value === 0 || value == null) return '0.00'
  if (value >= 1000) return (value / 1000).toFixed(2)
  if (value >= 100) return Math.round(value).toString()
  if (value >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

function formatDisplayUnit(value, unit) {
  if (unit === 'Mbps' && value >= 1000) return 'Gbps'
  return unit
}

function buildScale(maxValue) {
  const points = [0, 0.25, 0.5, 0.75, 1]
  return points.map((point) => {
    const value = maxValue * point
    if (value >= 1000) return `${(value / 1000).toFixed(point === 1 ? 0 : 1)}G`
    return `${Math.round(value)}`
  })
}

export default function SpeedGauge({ value = 0, maxValue = 1000, unit = 'Mbps', label = 'DOWNLOAD', color }) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const currentValueRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const startValue = currentValueRef.current
    const targetValue = value || 0
    const duration = 320
    const startTime = performance.now()

    function animate(now) {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = startValue + (targetValue - startValue) * eased
      currentValueRef.current = nextValue
      setAnimatedValue(nextValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [value])

  const ratio = Math.min(1, Math.max(0, maxValue > 0 ? animatedValue / maxValue : 0))
  const gaugeColor = color || getGaugeColor(animatedValue, maxValue)
  const displayVal = formatDisplayValue(animatedValue)
  const displayUnit = formatDisplayUnit(animatedValue, unit)
  const scale = buildScale(maxValue)

  return (
    <div className="speed-gauge-wrapper" aria-label={`${label}: ${displayVal} ${displayUnit}`}>
      <div className="speed-gauge-heading">
        <span className="speed-gauge-label">{label}</span>
        <span className="speed-gauge-cap">Up to {scale[4]} {displayUnit}</span>
      </div>

      <div className="speed-gauge-readout">
        <span className="speed-gauge-value" style={{ color: gaugeColor }}>{displayVal}</span>
        <span className="speed-gauge-unit">{displayUnit}</span>
      </div>

      <div className="speed-gauge-meter">
        <div
          className="speed-gauge-meter-fill"
          style={{
            width: `${ratio * 100}%`,
            background: `linear-gradient(90deg, ${gaugeColor} 0%, #8cc6ff 100%)`
          }}
        />
      </div>

      <div className="speed-gauge-bars" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => {
          const threshold = (index + 1) / 18
          const active = ratio >= threshold
          return (
            <span
              key={index}
              className={`speed-gauge-bar ${active ? 'speed-gauge-bar--active' : ''}`}
              style={{
                height: `${16 + index * 3}px`,
                background: active
                  ? `linear-gradient(180deg, #ffffff 0%, ${gaugeColor} 100%)`
                  : 'linear-gradient(180deg, #eef4fd 0%, #c7d3e6 100%)'
              }}
            />
          )
        })}
      </div>

      <div className="speed-gauge-scale">
        {scale.map((item) => (
          <span key={item} className="speed-gauge-scale__item">{item}</span>
        ))}
      </div>
    </div>
  )
}
