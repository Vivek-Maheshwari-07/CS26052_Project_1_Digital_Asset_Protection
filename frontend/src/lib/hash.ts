/** Hex SHA-256 of a UTF-8 string via Web Crypto. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** JSON with keys sorted at every level, matching the registry's canonical form. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  )
}

/** Fraction of matching bits between two equal-length hex hashes. */
export function hammingSimilarity(a: string, b: string): { distance: number; bits: number; similarity: number } {
  let distance = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) {
      distance += x & 1
      x >>= 1
    }
  }
  const bits = a.length * 4
  return { distance, bits, similarity: 1 - distance / bits }
}

/** Expands a 16-character hex perceptual hash into its 64 bits, most significant first. */
export function hexToBits(hex: string): number[] {
  return hex
    .split('')
    .flatMap((ch) => parseInt(ch, 16).toString(2).padStart(4, '0').split('').map(Number))
}
