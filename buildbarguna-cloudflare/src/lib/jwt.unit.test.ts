import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createToken, verifyToken, generateJti } from './jwt'
import type { JWTPayload } from './jwt'

describe('jwt utils', () => {
  const secret = 'super-secret-key-123'
  const mockPayload: Omit<JWTPayload, 'exp'> = {
    sub: 'user-123',
    phone: '01712345678',
    email: 'test@example.com',
    role: 'member',
    jti: 'token-uuid-123'
  }

  describe('createToken', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('creates a valid JWT string', async () => {
      const token = await createToken(mockPayload, secret)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // Header, Payload, Signature
    })

    it('includes payload data in the token', async () => {
      const token = await createToken(mockPayload, secret)
      const decoded = await verifyToken(token, secret)

      expect(decoded).toMatchObject(mockPayload)
    })

    it('sets correct expiration time (default 7 days)', async () => {
      const token = await createToken(mockPayload, secret)
      const decoded = await verifyToken(token, secret)

      const nowInSeconds = Math.floor(Date.now() / 1000)
      const expectedExp = nowInSeconds + 7 * 24 * 60 * 60

      expect(decoded?.exp).toBe(expectedExp)
    })

    it('sets correct expiration time with custom days', async () => {
      const token = await createToken(mockPayload, secret, 30) // 30 days
      const decoded = await verifyToken(token, secret)

      const nowInSeconds = Math.floor(Date.now() / 1000)
      const expectedExp = nowInSeconds + 30 * 24 * 60 * 60

      expect(decoded?.exp).toBe(expectedExp)
    })
  })

  describe('verifyToken', () => {
    it('returns decoded payload for a valid token', async () => {
      const token = await createToken(mockPayload, secret)
      const decoded = await verifyToken(token, secret)
      expect(decoded).not.toBeNull()
      expect(decoded?.sub).toBe(mockPayload.sub)
    })

    it('returns null for an invalid token', async () => {
      const result = await verifyToken('invalid.token.string', secret)
      expect(result).toBeNull()
    })

    it('returns null for wrong secret', async () => {
      const token = await createToken(mockPayload, secret)
      const result = await verifyToken(token, 'wrong-secret')
      expect(result).toBeNull()
    })

    it('returns null for expired token', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))

      // create a token valid for 1 day
      const token = await createToken(mockPayload, secret, 1)

      // move time forward by 2 days
      vi.setSystemTime(new Date('2024-01-03T12:00:00.000Z'))

      const result = await verifyToken(token, secret)
      expect(result).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('generateJti', () => {
    it('generates a valid UUID string', () => {
      const jti = generateJti()
      expect(typeof jti).toBe('string')
      expect(jti.length).toBeGreaterThan(0)
    })

    it('generates unique values', () => {
      const jti1 = generateJti()
      const jti2 = generateJti()
      expect(jti1).not.toBe(jti2)
    })
  })
})
