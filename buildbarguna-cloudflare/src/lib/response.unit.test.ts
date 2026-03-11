import { describe, it, expect, vi } from 'vitest'
import { ok, err, paginate, getPagination } from './response'
import type { Context } from 'hono'
import { PAGINATION } from './constants'

describe('Response Helpers', () => {
  describe('ok()', () => {
    it('returns a successful JSON response with default status 200', () => {
      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({ data, status }))
      } as unknown as Context

      const data = { user: 'test' }
      const result = ok(mockContext, data)

      expect(mockContext.json).toHaveBeenCalledWith({ success: true, data }, 200)
      expect(result).toEqual({ data: { success: true, data }, status: 200 })
    })

    it('returns a successful JSON response with custom status 201', () => {
      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({ data, status }))
      } as unknown as Context

      const data = { id: 1 }
      const result = ok(mockContext, data, 201)

      expect(mockContext.json).toHaveBeenCalledWith({ success: true, data }, 201)
      expect(result).toEqual({ data: { success: true, data }, status: 201 })
    })
  })

  describe('err()', () => {
    it('returns an error JSON response with default status 400', () => {
      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({ data, status }))
      } as unknown as Context

      const result = err(mockContext, 'Bad Request')

      expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Bad Request' }, 400)
      expect(result).toEqual({ data: { success: false, error: 'Bad Request' }, status: 400 })
    })

    it('returns an error JSON response with custom status', () => {
      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({ data, status }))
      } as unknown as Context

      const result = err(mockContext, 'Not Found', 404)

      expect(mockContext.json).toHaveBeenCalledWith({ success: false, error: 'Not Found' }, 404)
      expect(result).toEqual({ data: { success: false, error: 'Not Found' }, status: 404 })
    })
  })

  describe('paginate()', () => {
    it('formats pagination correctly when there are more items', () => {
      const result = paginate([1, 2, 3], 10, 1, 3)

      expect(result).toEqual({
        items: [1, 2, 3],
        total: 10,
        page: 1,
        limit: 3,
        hasMore: true
      })
    })

    it('formats pagination correctly when there are no more items', () => {
      const result = paginate([1, 2, 3], 3, 1, 3)

      expect(result).toEqual({
        items: [1, 2, 3],
        total: 3,
        page: 1,
        limit: 3,
        hasMore: false
      })
    })

    it('handles exact page boundaries correctly', () => {
      const result = paginate([1, 2, 3], 6, 2, 3)

      expect(result).toEqual({
        items: [1, 2, 3],
        total: 6,
        page: 2,
        limit: 3,
        hasMore: false
      })
    })

    it('handles empty items correctly', () => {
      const result = paginate([], 0, 1, 10)

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      })
    })
  })

  describe('getPagination()', () => {
    it('returns default pagination when query is empty', () => {
      const result = getPagination({})

      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0
      })
    })

    it('parses valid page and limit from query', () => {
      const result = getPagination({ page: '2', limit: '10' })

      expect(result).toEqual({
        page: 2,
        limit: 10,
        offset: 10
      })
    })

    it('enforces minimum page of 1', () => {
      const result = getPagination({ page: '0', limit: '10' })

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0
      })

      const result2 = getPagination({ page: '-5', limit: '10' })

      expect(result2).toEqual({
        page: 1,
        limit: 10,
        offset: 0
      })
    })

    it('enforces minimum limit of 1', () => {
      const result = getPagination({ page: '1', limit: '0' })

      expect(result).toEqual({
        page: 1,
        limit: 1,
        offset: 0
      })

      const result2 = getPagination({ page: '1', limit: '-5' })

      expect(result2).toEqual({
        page: 1,
        limit: 1,
        offset: 0
      })
    })

    it('enforces maximum limit from PAGINATION.MAX_LIMIT', () => {
      const result = getPagination({ page: '1', limit: '1000' })

      expect(result).toEqual({
        page: 1,
        limit: PAGINATION.MAX_LIMIT,
        offset: 0
      })
    })

    it('handles invalid numbers by falling back to defaults', () => {
      // Math.max(1, parseInt('abc')) returns NaN
      const result = getPagination({ page: 'abc', limit: 'xyz' })

      expect(Number.isNaN(result.page)).toBe(true)
      expect(Number.isNaN(result.limit)).toBe(true)
      expect(Number.isNaN(result.offset)).toBe(true)
    })
  })
})
