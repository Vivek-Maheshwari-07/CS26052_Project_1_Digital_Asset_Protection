/** Keep the head and tail of a long identifier, e.g. `3f9a2c…e41b07`. */
export function truncateMiddle(value: string, head = 6, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}
