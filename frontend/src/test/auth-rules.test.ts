import { maskEmail, passwordValid, validateEmail, validateFullName, validateUsername } from '@/auth/rules'
import { formatDetail } from '@/lib/api'

describe('auth rules mirror the backend validators', () => {
  it('requires 8+ characters with a letter and a number, max 72 bytes', () => {
    expect(passwordValid('Analytical1')).toBe(true)
    expect(passwordValid('short1')).toBe(false)
    expect(passwordValid('lettersonly')).toBe(false)
    expect(passwordValid('12345678')).toBe(false)
    expect(passwordValid('a1' + 'é'.repeat(36))).toBe(false)
  })

  it('validates usernames, emails and names', () => {
    expect(validateUsername('ada.draws')).toBeNull()
    expect(validateUsername('ad')).not.toBeNull()
    expect(validateUsername('bad name')).not.toBeNull()
    expect(validateEmail('ada@example.com')).toBeNull()
    expect(validateEmail('ada@example')).not.toBeNull()
    expect(validateFullName('  Ada   Lovelace ')).toBeNull()
    expect(validateFullName('A')).not.toBeNull()
  })

  it('masks the local part of an email', () => {
    expect(maskEmail('ada.lovelace@example.com')).toBe('ad••••••••••@example.com')
  })
})

describe('formatDetail', () => {
  it('reads FastAPI string, validation-list and object details', () => {
    expect(formatDetail('Nope', 400)).toBe('Nope')
    expect(formatDetail([{ msg: 'Value error, Enter a valid email address' }], 422)).toBe('Enter a valid email address')
    expect(formatDetail({ message: 'Duplicate' }, 409)).toBe('Duplicate')
    expect(formatDetail(undefined, 503)).toMatch(/something went wrong/i)
  })
})
