import React, { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import { componentColor, gradeColor, tintColor } from '../utils/uiPalette.js'

function BreakdownBar({ label, value, color }) {
  const barWidth = Math.max(0, Math.min(100, value || 0))
  const fillHighlight = tintColor(color, 68)

  return (
    <div className="breakdown-bar-row">
      <span className="breakdown-bar-label">{label}</span>
      <div className="breakdown-bar-track">
        <div
          className="breakdown-bar-fill"
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(180deg, ${fillHighlight} 0%, ${color} 100%)`
          }}
        />
      </div>
      <span className="breakdown-bar-value" style={{ color }}>
        {value != null ? value : '--'}
      </span>
    </div>
  )
}

export default function ScoreBoard({ results }) {
  const { t } = useT()
  const [animatedScore, setAnimatedScore] = useState(0)
  const currentScoreRef = useRef(0)
  const frameRef = useRef(null)

  const score = results?.score
  const overall = score?.overall ?? 0
  const grade = score?.grade ?? '--'
  const rating = score?.rating ?? t('sb_awaiting')
  const breakdown = score?.breakdown ?? {}
  const tone = gradeColor(grade)

  useEffect(() => {
    const startValue = currentScoreRef.current
    const targetValue = overall
    const duration = 500
    const startTime = performance.now()

    function animate(now) {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      const nextValue = Math.round(startValue + (targetValue - startValue) * eased)
      currentScoreRef.current = nextValue
      setAnimatedScore(nextValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [overall])

  return (
    <section className="scoreboard panel">
      <div className="panel-header">{t('panel_quality')}</div>
      <div className="panel-body scoreboard-body">
        <div className="scoreboard-main">
          <div className="scoreboard-grade-block" style={{ borderColor: tone }}>
            <div className="scoreboard-grade" style={{ color: tone }}>{grade}</div>
            <div className="scoreboard-grade-caption">{t('sb_grade')}</div>
          </div>

          <div className="scoreboard-summary">
            <div className="scoreboard-score-line">
              <span className="scoreboard-score">{animatedScore}</span>
              <span className="scoreboard-score-max">/100</span>
            </div>
            <div className="scoreboard-rating">{rating}</div>
            <div className="scoreboard-note">{t('sb_note')}</div>
          </div>
        </div>

        <div className="scoreboard-breakdown">
          <BreakdownBar label={t('sb_dl')} value={breakdown.download ?? null} color={componentColor(breakdown.download)} />
          <BreakdownBar label={t('sb_ul')} value={breakdown.upload ?? null} color={componentColor(breakdown.upload)} />
          <BreakdownBar label={t('sb_latency')} value={breakdown.latency ?? null} color={componentColor(breakdown.latency)} />
          <BreakdownBar label={t('sb_jitter')} value={breakdown.jitter ?? null} color={componentColor(breakdown.jitter)} />
        </div>
      </div>
    </section>
  )
}
