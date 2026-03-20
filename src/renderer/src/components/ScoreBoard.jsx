import React, { useEffect, useState, useRef } from 'react'

const SCORE_RING_RADIUS = 54
const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS

function ScoreRing({ score, color }) {
  const [animScore, setAnimScore] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const target = score || 0
    const start = animScore
    const duration = 800
    const startTime = performance.now()

    function animate(now) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      setAnimScore(Math.round(start + (target - start) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [score])

  const ringProgress = (animScore / 100) * SCORE_RING_CIRCUMFERENCE
  const ringGap = SCORE_RING_CIRCUMFERENCE - ringProgress

  return (
    <div className="score-ring-container" aria-label={`Score: ${score}`}>
      <svg viewBox="0 0 140 140" className="score-ring-svg">
        <defs>
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background ring */}
        <circle
          cx="70"
          cy="70"
          r={SCORE_RING_RADIUS}
          fill="none"
          stroke="#00ff4115"
          strokeWidth="10"
        />
        {/* Score ring */}
        <circle
          cx="70"
          cy="70"
          r={SCORE_RING_RADIUS}
          fill="none"
          stroke={color || '#00ff41'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${ringProgress} ${ringGap}`}
          transform="rotate(-90, 70, 70)"
          filter="url(#scoreGlow)"
          style={{ transition: 'stroke-dasharray 0.1s ease-out, stroke 0.3s ease' }}
        />
        {/* Score number */}
        <text
          x="70"
          y="65"
          textAnchor="middle"
          fill={color || '#00ff41'}
          fontSize="36"
          fontFamily="'VT323', monospace"
        >
          {animScore}
        </text>
        <text
          x="70"
          y="84"
          textAnchor="middle"
          fill="#00ff4160"
          fontSize="12"
          fontFamily="'Share Tech Mono', monospace"
        >
          /100
        </text>
      </svg>
    </div>
  )
}

function BreakdownBar({ label, value, color }) {
  const barWidth = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="breakdown-bar-row">
      <span className="breakdown-bar-label">{label}</span>
      <div className="breakdown-bar-track">
        <div
          className="breakdown-bar-fill"
          style={{
            width: `${barWidth}%`,
            background: color || '#00ff41',
            boxShadow: `0 0 6px ${color || '#00ff41'}60`,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
      <span className="breakdown-bar-value" style={{ color: color || '#00ff41' }}>
        {value != null ? value : '--'}
      </span>
    </div>
  )
}

function gradeColor(grade) {
  if (!grade || grade === '--') return '#00ff4140'
  if (grade.startsWith('S')) return '#00d4ff'
  if (grade.startsWith('A')) return '#00ff41'
  if (grade.startsWith('B')) return '#aaff00'
  if (grade === 'C') return '#ffcc00'
  if (grade === 'D') return '#ff6c00'
  return '#ff4444'
}

function ratingColor(rating) {
  if (!rating) return 'var(--text-muted)'
  if (rating === 'OUTSTANDING') return '#00d4ff'
  if (rating === 'EXCELLENT') return '#00ff41'
  if (rating === 'GOOD') return '#aaff00'
  if (rating === 'FAIR') return '#ffcc00'
  if (rating === 'POOR') return '#ff6c00'
  return '#ff4444'
}

function componentColor(value) {
  if (value == null) return '#00ff4140'
  if (value >= 80) return '#00ff41'
  if (value >= 60) return '#aaff00'
  if (value >= 40) return '#ffcc00'
  if (value >= 20) return '#ff6c00'
  return '#ff4444'
}

export default function ScoreBoard({ results }) {
  const score = results?.score
  const overall = score?.overall ?? null
  const grade = score?.grade ?? '--'
  const rating = score?.rating ?? null
  const color = score?.color ?? '#00ff41'
  const breakdown = score?.breakdown ?? {}

  return (
    <div className="scoreboard panel">
      <div className="panel-header">NETWORK SCORE</div>
      <div className="panel-body scoreboard-body">
        <div className="scoreboard-main">
          <ScoreRing score={overall ?? 0} color={color} />
          <div className="scoreboard-grade-block">
            <div
              className="scoreboard-grade"
              style={{
                color: gradeColor(grade),
                textShadow: `0 0 20px ${gradeColor(grade)}80, 0 0 40px ${gradeColor(grade)}40`
              }}
            >
              {grade}
            </div>
            {rating && (
              <div
                className="scoreboard-rating"
                style={{ color: ratingColor(rating) }}
              >
                {rating}
              </div>
            )}
            {!rating && (
              <div className="scoreboard-rating" style={{ color: 'var(--text-muted)' }}>
                AWAITING TEST
              </div>
            )}
          </div>
        </div>

        <div className="scoreboard-breakdown">
          <div className="scoreboard-breakdown-title">◂ BREAKDOWN</div>
          <BreakdownBar
            label="DL"
            value={breakdown.download ?? null}
            color={componentColor(breakdown.download)}
          />
          <BreakdownBar
            label="UL"
            value={breakdown.upload ?? null}
            color={componentColor(breakdown.upload)}
          />
          <BreakdownBar
            label="RTT"
            value={breakdown.latency ?? null}
            color={componentColor(breakdown.latency)}
          />
          <BreakdownBar
            label="JTR"
            value={breakdown.jitter ?? null}
            color={componentColor(breakdown.jitter)}
          />
        </div>
      </div>
    </div>
  )
}
