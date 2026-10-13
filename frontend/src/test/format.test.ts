import { truncateMiddle } from '@/lib/format'

describe('truncateMiddle', () => {
  it('keeps both ends of a SHA-256 digest', () => {
    const digest = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    expect(truncateMiddle(digest)).toBe('e3b0c4…52b855')
  })

  it('leaves short values untouched', () => {
    expect(truncateMiddle('a1b2c3d4')).toBe('a1b2c3d4')
  })
})
