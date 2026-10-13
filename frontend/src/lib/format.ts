/** Keep the head and tail of a long identifier, e.g. `3f9a2c…e41b07`. */
export function truncateMiddle(value: string, head = 6, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 days ago", "yesterday", "just now". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = (now - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  const [unit, secs] = RELATIVE_UNITS.find(([, s]) => diff >= s)!
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-Math.floor(diff / secs), unit)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function percent(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`
}

/** Time-of-day greeting for the dashboard header. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
