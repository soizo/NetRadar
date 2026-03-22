import { riskColor, tintColor } from '../utils/uiPalette.js'

function dotClass(state) {
  return {
    loading: 'diag-card__dot diag-card__dot--loading',
    ok: 'diag-card__dot diag-card__dot--ok',
    warn: 'diag-card__dot diag-card__dot--warn',
    error: 'diag-card__dot diag-card__dot--error',
    idle: 'diag-card__dot'
  }[state] || 'diag-card__dot'
}

export function DiagCardDot({ state }) {
  return <span className={dotClass(state)} />
}

export function DiagRow({ label, children, valueClass }) {
  return (
    <div className="diag-row">
      <span className="diag-row__label">{label}</span>
      <span className={`diag-row__value ${valueClass || ''}`}>{children}</span>
    </div>
  )
}

export function DiagCardShell({ icon, title, dotState, children }) {
  return (
    <div className="diag-card">
      <div className="diag-card__header">
        <img className="diag-card__icon" src={icon} alt="" aria-hidden="true" />
        <span className="diag-card__title">{title}</span>
        <DiagCardDot state={dotState} />
      </div>
      <div className="diag-card__body">{children}</div>
    </div>
  )
}

export function DiagSignalBars({ percent = 0 }) {
  const levels = [20, 40, 60, 80, 100]

  return (
    <span className="diag-signal">
      {levels.map((threshold, index) => (
        <span
          key={threshold}
          className={`diag-signal__bar ${percent >= threshold ? 'diag-signal__bar--lit' : ''}`}
          style={{ height: `${(index + 1) * 3}px` }}
        />
      ))}
    </span>
  )
}

export function DiagRiskBar({ score }) {
  const color = riskColor(score)
  const highlight = tintColor(color, 68)

  return (
    <div className="diag-risk-bar">
      <div className="diag-risk-bar__track">
        <div
          className="diag-risk-bar__fill"
          style={{ width: `${score}%`, background: `linear-gradient(180deg, ${highlight} 0%, ${color} 100%)` }}
        />
      </div>
      <span className="diag-risk-bar__label" style={{ color }}>{score}</span>
    </div>
  )
}

export function DiagnosticsRunBar({ isRunning, hasRun, onRun, onReset, runLabel, runningLabel, resetLabel }) {
  return (
    <div className="diag-run-bar">
      <button className="btn-primary" onClick={onRun} disabled={isRunning}>
        {isRunning ? runningLabel : runLabel}
      </button>
      {hasRun && !isRunning && <button className="btn-secondary" onClick={onReset}>{resetLabel}</button>}
      {isRunning && <span className="diag-run-bar__status diag-run-bar__status--running">{runningLabel}</span>}
    </div>
  )
}

export function DiagnosticsEmptyState({ icon, text }) {
  return (
    <div className="diag-idle">
      <img className="diag-idle__icon" src={icon} alt="" aria-hidden="true" />
      <p className="diag-idle__text">{text}</p>
    </div>
  )
}
