/**
 * Migration System Tests
 * Tests for the auto-migration system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { runMigrations, dryRunMigrations, getMigrationStatus, MIGRATIONS } from './migrations'

class MockD1Database {
  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        run: async () => {
          console.log('[Mock DB] Run:', query, params)
          return { success: true, meta: { changes: 1 } }
        },
        all: async () => {
          console.log('[Mock DB] All:', query, params)
          return { results: [], success: true }
        },
        first: async () => {
          console.log('[Mock DB] First:', query, params)
          return null
        }
      }),
      run: async () => {
        console.log('[Mock DB] Run:', query, [])
        return { success: true, meta: { changes: 1 } }
      },
      all: async () => {
        console.log('[Mock DB] All:', query, [])
        return { results: [], success: true }
      },
      first: async () => {
        console.log('[Mock DB] First:', query, [])
        return null
      }
    }
  }
}

class MockKVNamespace {
  private store: Record<string, string> = {}

  async get(key: string) {
    return this.store[key] || null
  }

  async put(key: string, value: string) {
    this.store[key] = value
  }

  async delete(key: string) {
    delete this.store[key]
  }
}

describe('Migration System', () => {
  let mockDB: MockD1Database
  let mockKV: MockKVNamespace

  beforeEach(() => {
    mockDB = new MockD1Database()
    mockKV = new MockKVNamespace()
  })

  describe('runMigrations', () => {
    it('returns success when no pending migrations are materialized', async () => {
      const env = { DB: mockDB, SESSIONS: mockKV }
      const result = await runMigrations(env as any)

      expect(result.success).toBe(true)
      expect(Array.isArray(result.applied)).toBe(true)
    })
  })

  describe('dryRunMigrations', () => {
    it('shows pending migrations without applying', async () => {
      const env = { DB: mockDB, SESSIONS: mockKV }
      const result = await dryRunMigrations(env as any)

      expect(result.count).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.pending)).toBe(true)
    })
  })

  describe('getMigrationStatus', () => {
    it('returns applied and pending migrations', async () => {
      const env = { DB: mockDB, SESSIONS: mockKV }
      const status = await getMigrationStatus(env as any)

      expect(status).toHaveProperty('applied')
      expect(status).toHaveProperty('pending')
      expect(status).toHaveProperty('total')
      expect(Array.isArray(status.applied)).toBe(true)
      expect(Array.isArray(status.pending)).toBe(true)
    })
  })

  describe('migration inventory', () => {
    it('includes current profit distribution and project migrations', () => {
      expect(MIGRATIONS.some((migration) => migration.name === '027_profit_distribution_redesign')).toBe(true)
      expect(MIGRATIONS.some((migration) => migration.name === '028_profit_distribution_enhancements')).toBe(true)
      expect(MIGRATIONS.some((migration) => migration.name === '032_project_enhancement')).toBe(true)
      expect(MIGRATIONS.some((migration) => migration.name === '033_fix_project_status_check')).toBe(true)
    })
  })
})
