import { describe, it, expect, vi } from 'vitest'
import { createToken, verifyToken, generateJti, type JWTPayload } from './jwt'

describe('JWT Utilities', () => {
  const secret = 'test-secret-key-1234567890'
  const mockPayload: Omit<JWTPayload, 'exp'> = {
    sub: 'user_123',
    phone: '1234567890',
    email: 'test@example.com',
    role: 'member',
    jti: 'mock-jti-uuid'
  }

  describe('createToken', () => {
    it('should create a valid JWT string', async () => {
      const token = await createToken(mockPayload, secret)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // Header, Payload, Signature
    })

    it('should set expiration correctly (default 7 days)', async () => {
      const token = await createToken(mockPayload, secret)
      const payload = await verifyToken(token, secret)

      expect(payload).not.toBeNull()

      const now = Math.floor(Date.now() / 1000)
      const expectedExp = now + 7 * 24 * 60 * 60

      // Allow a small delta for processing time
      expect(payload!.exp).toBeGreaterThanOrEqual(expectedExp - 5)
      expect(payload!.exp).toBeLessThanOrEqual(expectedExp + 5)
    })

    it('should set custom expiration', async () => {
      const token = await createToken(mockPayload, secret, 30) // 30 days
      const payload = await verifyToken(token, secret)

      expect(payload).not.toBeNull()

      const now = Math.floor(Date.now() / 1000)
      const expectedExp = now + 30 * 24 * 60 * 60

      expect(payload!.exp).toBeGreaterThanOrEqual(expectedExp - 5)
      expect(payload!.exp).toBeLessThanOrEqual(expectedExp + 5)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', async () => {
      const token = await createToken(mockPayload, secret)
      const payload = await verifyToken(token, secret)

      expect(payload).not.toBeNull()
      expect(payload!.sub).toBe(mockPayload.sub)
      expect(payload!.phone).toBe(mockPayload.phone)
      expect(payload!.email).toBe(mockPayload.email)
      expect(payload!.role).toBe(mockPayload.role)
      expect(payload!.jti).toBe(mockPayload.jti)
      expect(payload!.exp).toBeDefined()
    })

    it('should return null for an invalid token (malformed)', async () => {
      const result = await verifyToken('invalid.token.string', secret)
      expect(result).toBeNull()
    })

    it('should return null for a completely garbage string', async () => {
      const result = await verifyToken('not-a-token-at-all', secret)
      expect(result).toBeNull()
    })

    it('should return null if signed with a different secret', async () => {
      const token = await createToken(mockPayload, secret)
      const result = await verifyToken(token, 'different-secret-key')
      expect(result).toBeNull()
    })

    it('should return null for a tampered token (invalid signature)', async () => {
      const token = await createToken(mockPayload, secret)
      const parts = token.split('.')

      // Tamper with the payload
      const tamperedPayload = btoa(JSON.stringify({ ...mockPayload, sub: 'hacked_user' }))
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`

      const result = await verifyToken(tamperedToken, secret)
      expect(result).toBeNull()
    })
  })

  describe('generateJti', () => {
    it('should generate a valid UUID string', () => {
      const jti = generateJti()
      expect(typeof jti).toBe('string')
      expect(jti.length).toBeGreaterThan(0)

      // Basic UUID validation regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(jti)).toBe(true)
    })

    it('should generate unique UUIDs', () => {
      const jti1 = generateJti()
      const jti2 = generateJti()
      expect(jti1).not.toBe(jti2)
    })
  })
})
