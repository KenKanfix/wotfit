const KG_PER_LB = 0.45359237

export function toDisplayWeight(kg: number, unit: 'kg' | 'lb'): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB
}

export function toKg(display: number, unit: 'kg' | 'lb'): number {
  return unit === 'kg' ? display : display * KG_PER_LB
}

export function formatWeight(kg: number, unit: 'kg' | 'lb'): string {
  const display = Math.round(toDisplayWeight(kg, unit) * 10) / 10
  return `${display} ${unit}`
}

export function formatVolume(kg: number, unit: 'kg' | 'lb'): string {
  const display = Math.round(toDisplayWeight(kg, unit))
  if (display >= 10_000) {
    return `${(display / 1000).toFixed(1)}k ${unit}`
  }
  return `${display.toLocaleString()} ${unit}`
}

export function weightInputValue(kg: number, unit: 'kg' | 'lb'): string {
  if (kg <= 0) return ''
  const display = Math.round(toDisplayWeight(kg, unit) * 10) / 10
  return String(display)
}

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function relativeDate(date: string): string {
  const today = dateKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === today) return 'Today'
  if (date === dateKey(yesterday)) return 'Yesterday'
  return formatDate(date)
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '—'
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString()
}
