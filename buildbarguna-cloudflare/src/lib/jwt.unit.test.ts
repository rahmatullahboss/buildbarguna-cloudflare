import { describe, it, expect } from 'vitest'
import { createToken, verifyToken, generateJti } from './jwt'

describe('JWT Utilities', () => {
  const SECRET = 'test-secret'
  const PAYLOAD = {
    sub: 'user-123',
    phone: '1234567890',
    email: 'test@example.com',
    role: 'member' as const,
    jti: 'jti-123'
  }

  describe('createToken and verifyToken', () => {
    it('creates a token that can be verified to get the payload back', async () => {
      const token = await createToken(PAYLOAD, SECRET)
      const verified = await verifyToken(token, SECRET)

      expect(verified).not.toBeNull()
      expect(verified?.sub).toBe(PAYLOAD.sub)
      expect(verified?.phone).toBe(PAYLOAD.phone)
      expect(verified?.email).toBe(PAYLOAD.email)
      expect(verified?.role).toBe(PAYLOAD.role)
      expect(verified?.jti).toBe(PAYLOAD.jti)
      // exp is added during createToken
      expect(verified?.exp).toBeGreaterThan(Date.now() / 1000)
    })

    it('returns null when verifying an invalid token (catch block coverage)', async () => {
      // Hono's verify throws an error if token format is completely invalid
      // This explicitly tests the catch { return null } block in verifyToken
      const invalidToken = 'this.is.not.a.valid.token'
      const verified = await verifyToken(invalidToken, SECRET)

      expect(verified).toBeNull()
    })

    it('returns null when verifying a malformed token (catch block coverage)', async () => {
      // Malformed token that has 3 parts but is invalid base64/json
      const invalidToken = 'abc.def.ghi'
      const verified = await verifyToken(invalidToken, SECRET)

      expect(verified).toBeNull()
    })

    it('returns null when verifying a token with the wrong secret', async () => {
      const token = await createToken(PAYLOAD, SECRET)
      const verified = await verifyToken(token, 'wrong-secret')

      expect(verified).toBeNull()
    })
  })

  describe('generateJti', () => {
    it('generates a unique string', () => {
      const jti1 = generateJti()
      const jti2 = generateJti()

      expect(typeof jti1).toBe('string')
      expect(jti1.length).toBeGreaterThan(0)
      expect(jti1).not.toBe(jti2)
    })
  })
})
