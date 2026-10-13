import { canonicalJson, hammingSimilarity, hexToBits, sha256Hex } from '@/lib/hash'

describe('hash helpers', () => {
  it('computes SHA-256 hex digests', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('sorts keys at every level for canonical JSON', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}')
  })

  it('measures Hamming similarity between perceptual hashes', () => {
    expect(hammingSimilarity('c3a1f0e8963c5a1d', 'c3a1f4e8963c7a1d')).toEqual({
      distance: 2,
      bits: 64,
      similarity: 1 - 2 / 64,
    })
  })

  it('expands hex into 64 bits', () => {
    const bits = hexToBits('f000000000000001')
    expect(bits).toHaveLength(64)
    expect(bits.slice(0, 5)).toEqual([1, 1, 1, 1, 0])
    expect(bits[63]).toBe(1)
  })
})
