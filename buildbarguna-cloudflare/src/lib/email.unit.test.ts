import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendPasswordResetEmail, sendPasswordResetConfirmation, sendWelcomeEmail } from './email'

// Create a stable mock function that we can control in tests
const mockSend = vi.fn()

// Mock Resend library using the stable mock function
// Must use `function` keyword (not arrow) so it's valid as a constructor with `new`
vi.mock('resend', () => {
  return {
    Resend: function () {
      return {
        emails: {
          send: mockSend
        }
      }
    }
  }
})

describe('Email Service', () => {
  const mockEnv = {
    RESEND_API_KEY: 'test-api-key',
    EMAIL_FROM: 'Test <test@example.com>'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockReset()
  })

  describe('sendPasswordResetEmail', () => {
    const data = {
      to: 'user@example.com',
      name: 'Test User',
      resetLink: 'https://example.com/reset',
      expiryMinutes: 60
    }

    it('returns true when email is sent successfully', async () => {
      mockSend.mockResolvedValue({ id: 'test-id' })

      const result = await sendPasswordResetEmail(data, mockEnv)

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [data.to],
          subject: expect.any(String)
        })
      )
    })

    it('returns false when email sending fails', async () => {
      mockSend.mockRejectedValue(new Error('Resend error'))

      const result = await sendPasswordResetEmail(data, mockEnv)

      expect(result).toBe(false)
      expect(mockSend).toHaveBeenCalled()
    })
  })

  describe('sendPasswordResetConfirmation', () => {
    const data = {
      to: 'user@example.com',
      name: 'Test User'
    }

    it('returns true when confirmation email is sent successfully', async () => {
      mockSend.mockResolvedValue({ id: 'test-id' })

      const result = await sendPasswordResetConfirmation(data, mockEnv)

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [data.to],
          subject: expect.any(String)
        })
      )
    })

    it('returns false when confirmation email sending fails', async () => {
      mockSend.mockRejectedValue(new Error('Resend error'))

      const result = await sendPasswordResetConfirmation(data, mockEnv)

      expect(result).toBe(false)
      expect(mockSend).toHaveBeenCalled()
    })
  })

  describe('sendWelcomeEmail', () => {
    const data = {
      to: 'user@example.com',
      name: 'Test User'
    }

    it('returns true when welcome email is sent successfully', async () => {
      mockSend.mockResolvedValue({ id: 'test-id' })

      const result = await sendWelcomeEmail(data, mockEnv)

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [data.to],
          subject: expect.any(String)
        })
      )
    })

    it('returns false when welcome email sending fails', async () => {
      mockSend.mockRejectedValue(new Error('Resend error'))

      const result = await sendWelcomeEmail(data, mockEnv)

      expect(result).toBe(false)
      expect(mockSend).toHaveBeenCalled()
    })
  })
})
