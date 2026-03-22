export function tintColor(hex, amount) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex

  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp(parseInt(normalized.slice(0, 2), 16) + amount)
  const g = clamp(parseInt(normalized.slice(2, 4), 16) + amount)
  const b = clamp(parseInt(normalized.slice(4, 6), 16) + amount)

  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export function gradeColor(grade) {
  if (!grade || grade === '--') return '#6b7f99'
  if (grade.startsWith('S')) return '#1f63d0'
  if (grade.startsWith('A')) return '#2b8a41'
  if (grade.startsWith('B')) return '#5b8d22'
  if (grade === 'C') return '#b78517'
  if (grade === 'D') return '#bb6b17'
  return '#b04b4b'
}

export function componentColor(value) {
  if (value == null) return '#9aa9bd'
  if (value >= 80) return '#2b8a41'
  if (value >= 60) return '#5b8d22'
  if (value >= 40) return '#b78517'
  if (value >= 20) return '#bb6b17'
  return '#b04b4b'
}

export function gaugeColor(value, maxValue) {
  const ratio = maxValue > 0 ? value / maxValue : 0
  if (ratio >= 0.75) return '#1f63d0'
  if (ratio >= 0.4) return '#2b8a41'
  if (ratio > 0) return '#b78517'
  return '#7e8ba0'
}

export function riskColor(score) {
  if (score >= 75) return '#b24a4a'
  if (score >= 40) return '#b98518'
  return '#2b8a41'
}

export function logTypeColor(type) {
  switch (type) {
    case 'info': return '#355b97'
    case 'data': return '#205fc6'
    case 'warning': return '#8d6013'
    case 'error': return '#903434'
    case 'success': return '#296539'
    case 'phase': return '#6b4bbc'
    default: return '#53657f'
  }
}
