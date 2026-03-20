import React, { useEffect, useState } from 'react'

const RADIUS = 80
const CENTER = 100
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const ARC_LENGTH = CIRCUMFERENCE * 0.75
const GAP = CIRCUMFERENCE - ARC_LENGTH

function getGaugeColor(value, maxValue) {
  const ratio = value / maxValue
  if (ratio > 0.75) return '#00d4ff'
  if (ratio > 0.5) return '#aaff00'
  if (ratio > 0.25) return '#00ff41'
  return '#00ff41'
}

function getGlowColor(value, maxValue) {
  const ratio = value / maxValue
  if (ratio > 0.75) return '0 0 12px #00d4ff80, 0 0 24px #00d4ff40'
  if (ratio > 0.5) return '0 0 12px #aaff0080, 0 0 24px #aaff0040'
  return '0 0 12px #00ff4180, 0 0 24px #00ff4140'
}

function buildTickMarks(count = 10) {
  const ticks = []
  const startAngle = 135
  const endAngle = 405
  const totalAngle = endAngle - startAngle

  for (let i = 0; i <= count; i++) {
    const angle = startAngle + (i / count) * totalAngle
    const rad = (angle * Math.PI) / 180
    const outerR = 92
    const innerR = i % 5 === 0 ? 82 : 86
    const x1 = CENTER + outerR * Math.cos(rad)
    const y1 = CENTER + outerR * Math.sin(rad)
    const x2 = CENTER + innerR * Math.cos(rad)
    const y2 = CENTER + innerR * Math.sin(rad)
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={i % 5 === 0 ? '#00ff4160' : '#00ff4130'}
        strokeWidth={i % 5 === 0 ? 2 : 1}
      />
    )
  }
  return ticks
}

function buildNeedle(value, maxValue) {
  const ratio = Math.min(1, Math.max(0, value / maxValue))
  const startAngle = 135
  const endAngle = 405
  const angle = startAngle + ratio * (endAngle - startAngle)
  const rad = (angle * Math.PI) / 180
  const needleLen = 65
  const needleBase = 6
  const tx = CENTER + needleLen * Math.cos(rad)
  const ty = CENTER + needleLen * Math.sin(rad)
  const backRad = rad + Math.PI
  const bx = CENTER + needleBase * Math.cos(backRad)
  const by = CENTER + needleBase * Math.sin(backRad)
  const perpRad1 = rad + Math.PI / 2
  const perpRad2 = rad - Math.PI / 2
  const wx = CENTER + 4 * Math.cos(perpRad1)
  const wy = CENTER + 4 * Math.sin(perpRad1)
  const wx2 = CENTER + 4 * Math.cos(perpRad2)
  const wy2 = CENTER + 4 * Math.sin(perpRad2)
  return `M ${wx} ${wy} L ${tx} ${ty} L ${wx2} ${wy2} L ${bx} ${by} Z`
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

export default function SpeedGauge({ value = 0, maxValue = 1000, unit = 'Mbps', label = 'DOWNLOAD', color }) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const target = value || 0
    let start = animatedValue
    const duration = 400
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (target - start) * eased
      setAnimatedValue(current)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  const gaugeColor = color || getGaugeColor(animatedValue, maxValue)
  const glowFilter = getGlowColor(animatedValue, maxValue)
  const ratio = Math.min(1, Math.max(0, animatedValue / maxValue))
  const valueArcLength = ratio * ARC_LENGTH
  const displayVal = formatDisplayValue(animatedValue)
  const displayUnit = formatDisplayUnit(animatedValue, unit)
  const needlePath = buildNeedle(animatedValue, maxValue)

  return (
    <div className="speed-gauge-wrapper">
      <div className="speed-gauge-label">{label}</div>
      <div className="speed-gauge-svg-container">
        <svg
          viewBox="0 0 200 200"
          className="speed-gauge-svg"
          style={{ filter: `drop-shadow(${glowFilter.split(',')[0].replace('box-shadow: ', '')})` }}
          aria-label={`${label}: ${displayVal} ${displayUnit}`}
        >
          <defs>
            <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`arcGrad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gaugeColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={gaugeColor} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Outer ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={95}
            fill="none"
            stroke="#00ff4108"
            strokeWidth="1"
          />

          {/* Tick marks */}
          {buildTickMarks(10)}

          {/* Background arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#00ff4118"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${GAP}`}
            transform={`rotate(135, ${CENTER}, ${CENTER})`}
          />

          {/* Value arc */}
          {animatedValue > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={`url(#arcGrad-${label})`}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${valueArcLength} ${CIRCUMFERENCE - valueArcLength}`}
              transform={`rotate(135, ${CENTER}, ${CENTER})`}
              filter={`url(#glow-${label})`}
              style={{ transition: 'stroke-dasharray 0.15s ease-out' }}
            />
          )}

          {/* Needle */}
          <path
            d={needlePath}
            fill={gaugeColor}
            opacity="0.9"
            style={{ filter: `drop-shadow(0 0 4px ${gaugeColor})` }}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r="6"
            fill="#0a0a0a"
            stroke={gaugeColor}
            strokeWidth="2"
          />

          {/* Center display */}
          <text
            x={CENTER}
            y={CENTER - 8}
            textAnchor="middle"
            fill={gaugeColor}
            fontSize="32"
            fontFamily="'VT323', monospace"
            fontWeight="normal"
            style={{ textShadow: `0 0 8px ${gaugeColor}` }}
          >
            {displayVal}
          </text>
          <text
            x={CENTER}
            y={CENTER + 12}
            textAnchor="middle"
            fill={gaugeColor}
            fontSize="14"
            fontFamily="'Share Tech Mono', monospace"
            opacity="0.8"
          >
            {displayUnit}
          </text>

          {/* Min/Max labels */}
          <text x="22" y="178" textAnchor="middle" fill="#00ff4140" fontSize="11" fontFamily="'Share Tech Mono', monospace">0</text>
          <text x="178" y="178" textAnchor="middle" fill="#00ff4140" fontSize="11" fontFamily="'Share Tech Mono', monospace">
            {maxValue >= 1000 ? `${maxValue / 1000}G` : maxValue}
          </text>
        </svg>
      </div>
    </div>
  )
}
