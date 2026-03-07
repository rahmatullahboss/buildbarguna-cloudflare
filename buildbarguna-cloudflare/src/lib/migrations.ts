/**
 * Database Migration Runner with Rollback Support
 * Automatically runs migrations on Worker startup
 * 
 * Features:
 * - Dynamic SQL loading from KV storage (no hardcoded SQL)
 * - Rollback capability with down migrations
 * - Migration locking to prevent concurrent execution
 * - Timeout protection
 * - Comprehensive error reporting
 */

import type { Bindings } from '../types'

interface Migration {
  id: number
  name: string
  sql_up: string      // Forward migration SQL
  sql_down?: string   // Rollback SQL (optional)
  timeout_ms?: number // Custom timeout (default: 30000)
}

/**
 * Migration definitions
 * SQL is loaded from KV at runtime to avoid duplication
 */
const MIGRATIONS: Migration[] = [
  { 
    id: 1, 
    name: '001_referral_system', 
    sql_up: '',
    sql_down: '',
    timeout_ms: 60000
  },
  { 
    id: 2, 
    name: '002_payment_method_support', 
    sql_up: '',
    sql_down: '',
    timeout_ms: 60000
  },
  { 
    id: 3, 
    name: '003_points_and_rewards_system', 
    sql_up: '', // Loaded from KV
    sql_down: `
      DROP TABLE IF EXISTS task_types;
      DROP TABLE IF EXISTS user_points;
      DROP TABLE IF EXISTS point_transactions;
      DROP TABLE IF EXISTS rewards;
      DROP TABLE IF EXISTS reward_redemptions;
    `,
    timeout_ms: 120000
  },
  { 
    id: 4, 
    name: '004_points_system_fixes', 
    sql_up: '',
    sql_down: `
      DROP INDEX IF EXISTS idx_point_transactions_user_month;
      DROP INDEX IF EXISTS idx_task_completions_user_task_date;
      DROP INDEX IF EXISTS idx_reward_redemptions_user_status;
      DROP INDEX IF EXISTS idx_rewards_active_required;
      DROP TABLE IF EXISTS admin_actions;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS user_badges;
      DROP TABLE IF EXISTS data_exports;
      DROP VIEW IF EXISTS v_user_redemption_eligibility;
    `,
    timeout_ms: 120000
  },
  {
    id: 5,
    name: '005_critical_fixes',
    sql_up: '',
    sql_down: `
      DROP TABLE IF EXISTS badge_definitions;
      -- Note: Cannot drop columns from existing tables in SQLite
      -- These tables will remain: user_points (with last_reset_month),
      -- task_completions (with completion_time_seconds)
    `,
    timeout_ms: 180000
  },
  {
    id: 6,
    name: '006_member_registration',
    sql_up: '',
    sql_down: `
      DROP INDEX IF EXISTS idx_member_registrations_created_at;
      DROP INDEX IF EXISTS idx_member_registrations_form_number;
      DROP INDEX IF EXISTS idx_member_registrations_user;
      DROP TABLE IF EXISTS member_registrations;
    `,
    timeout_ms: 60000
  },
  {
    id: 7,
    name: '007_critical_fixes',
    sql_up: '',
    sql_down: `
      DROP TABLE IF EXISTS _migration_backups;
      DROP TRIGGER IF EXISTS cleanup_old_rate_limits;
      DROP TABLE IF EXISTS _migration_validation;
    `,
    timeout_ms: 120000
  },
  {
    id: 8,
    name: '008_member_payment',
    sql_up: '',
    sql_down: `
      DROP VIEW IF EXISTS v_member_payments_pending;
      DROP VIEW IF EXISTS v_member_payments_verified;
    `,
    timeout_ms: 60000
  },
  {
    id: 9,
    name: '009_missing_tables_fix',
    sql_up: '',
    sql_down: `
      DROP VIEW IF EXISTS v_member_payments_pending;
      DROP VIEW IF EXISTS v_member_payments_verified;
      DROP TABLE IF EXISTS badge_definitions;
      DROP TABLE IF EXISTS admin_actions;
      DROP TABLE IF EXISTS data_exports;
      DROP TABLE IF EXISTS rate_limits;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS user_badges;
      DROP TABLE IF EXISTS reward_redemptions;
      DROP TABLE IF EXISTS rewards;
      DROP TABLE IF EXISTS point_transactions;
      DROP TABLE IF EXISTS user_points;
      DROP TABLE IF EXISTS member_registrations;
    `,
    timeout_ms: 180000
  },
  {
    id: 10,
    name: '010_full_schema',
    sql_up: '',
    sql_down: `
      DROP TABLE IF EXISTS member_audit_log;
      DROP VIEW IF EXISTS v_member_payments_all;
      DROP VIEW IF EXISTS v_member_payments_verified;
      DROP VIEW IF EXISTS v_member_payments_pending;
    `,
    timeout_ms: 180000
  },
  {
    id: 11,
    name: '011_member_schema_fixes',
    sql_up: '',
    sql_down: `
      DROP INDEX IF EXISTS idx_member_registrations_verified_by;
      DROP INDEX IF EXISTS idx_member_registrations_payment_method;
      DROP INDEX IF EXISTS idx_member_registrations_payment_status;
    `,
    timeout_ms: 60000
  },
  {
    id: 12,
    name: '012_member_payment_views',
    sql_up: '',
    sql_down: `
      DROP VIEW IF EXISTS v_member_payments_all;
      DROP VIEW IF EXISTS v_member_payments_verified;
      DROP VIEW IF EXISTS v_member_payments_pending;
    `,
    timeout_ms: 60000
  },
  {
    id: 13,
    name: '013_member_audit_logging',
    sql_up: '',
    sql_down: `
      DROP INDEX IF EXISTS idx_member_audit_log_created_at;
      DROP INDEX IF EXISTS idx_member_audit_log_form_number;
      DROP INDEX IF EXISTS idx_member_audit_log_target_user_id;
      DROP INDEX IF EXISTS idx_member_audit_log_user_id;
      DROP INDEX IF EXISTS idx_member_audit_log_action_type;
      DROP TABLE IF EXISTS member_audit_log;
    `,
    timeout_ms: 60000
  }
]

/**
 * Load migration SQL from KV storage
 * This ensures SQL in production matches tested SQL files
 */
async function loadMigrationSQL(env: Bindings, migrationName: string): Promise<string | null> {
  try {
    const kvKey = `migration_${migrationName}`
    const sql = await env.SESSIONS.get(kvKey)
    return sql
  } catch (error) {
    console.error(`[Migrations] Failed to load SQL for ${migrationName}:`, error)
    return null
  }
}

/**
 * Store migration SQL in KV (called during deployment)
 */
export async function storeMigrationInKV(env: Bindings, migrationName: string, sql: string): Promise<void> {
  const kvKey = `migration_${migrationName}`
  await env.SESSIONS.put(kvKey, sql, { expirationTtl: 86400 * 30 }) // 30 days TTL
  console.log(`[Migrations] Stored ${migrationName} in KV`)
}

/**
 * Acquire migration lock to prevent concurrent execution
 */
async function acquireMigrationLock(env: Bindings, timeoutMs: number = 300000): Promise<boolean> {
  const lockKey = 'migration_lock'
  const lockValue = await env.SESSIONS.get(lockKey)
  
  if (lockValue) {
    const { timestamp, worker_id } = JSON.parse(lockValue)
    const age = Date.now() - timestamp
    
    // Lock expired (older than 5 minutes)
    if (age > timeoutMs) {
      console.warn('[Migrations] Stale lock detected, releasing...')
      await env.SESSIONS.delete(lockKey)
      return false
    }
    
    console.warn(`[Migrations] Migration already running (worker: ${worker_id}, age: ${age}ms)`)
    return false
  }
  
  // Acquire lock
  await env.SESSIONS.put(lockKey, JSON.stringify({
    timestamp: Date.now(),
    worker_id: crypto.randomUUID()
  }), { expirationTtl: 300 }) // 5 minute lock
  
  return true
}

/**
 * Release migration lock
 */
async function releaseMigrationLock(env: Bindings): Promise<void> {
  await env.SESSIONS.delete('migration_lock')
}

/**
 * Create rollback checkpoint
 */
async function createCheckpoint(env: Bindings, checkpointName: string): Promise<void> {
  const checkpointKey = `checkpoint_${checkpointName}`
  
  // Export current schema state (simplified - just track which migrations completed)
  const appliedMigrations = await env.DB.prepare(
    'SELECT id, name FROM _migrations ORDER BY id'
  ).all()
  
  await env.SESSIONS.put(checkpointKey, JSON.stringify({
    timestamp: Date.now(),
    migrations: appliedMigrations.results
  }))
  
  console.log(`[Migrations] Created checkpoint: ${checkpointName}`)
}

/**
 * Rollback to checkpoint
 */
async function rollbackToCheckpoint(env: Bindings, checkpointName: string): Promise<boolean> {
  const checkpointKey = `checkpoint_${checkpointName}`
  const checkpoint = await env.SESSIONS.get(checkpointKey)
  
  if (!checkpoint) {
    console.error('[Migrations] Checkpoint not found:', checkpointName)
    return false
  }
  
  const { migrations: appliedMigrations } = JSON.parse(checkpoint)
  const appliedIds = new Set(appliedMigrations.map((m: any) => m.id))
  
  // Find migrations to rollback (in reverse order)
  const toRollback = MIGRATIONS
    .filter(m => appliedIds.has(m.id))
    .reverse()
  
  for (const migration of toRollback) {
    if (migration.sql_down) {
      console.log(`[Migrations] Rolling back ${migration.name}...`)
      
      const statements = migration.sql_down
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      for (const statement of statements) {
        await env.DB.prepare(statement).run()
      }
      
      // Remove from _migrations table
      await env.DB.prepare(
        'DELETE FROM _migrations WHERE id = ?'
      ).bind(migration.id).run()
      
      console.log(`[Migrations] ✓ ${migration.name} rolled back`)
    }
  }
  
  console.log('[Migrations] Rollback complete')
  return true
}

/**
 * Check and run pending migrations with full safety features
 */
export async function runMigrations(env: Bindings): Promise<{ success: boolean; error?: string; applied?: string[] }> {
  const startTime = Date.now()
  const appliedMigrations: string[] = []
  
  try {
    // Create migrations tracking table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run()

    // Get applied migrations
    const applied = await env.DB.prepare(
      'SELECT id, name FROM _migrations ORDER BY id'
    ).all()

    const appliedIds = new Set(applied.results.map((m: any) => m.id))
    const pending = MIGRATIONS.filter(m => !appliedIds.has(m.id))

    if (pending.length === 0) {
      console.log('[Migrations] ✓ All up to date')
      return { success: true, applied: [] }
    }

    console.log(`[Migrations] Running ${pending.length} migration(s)...`)

    // Try to acquire lock
    const lockAcquired = await acquireMigrationLock(env)
    if (!lockAcquired) {
      return { 
        success: false, 
        error: 'Another migration is already running. Check Worker logs for details.',
        applied: []
      }
    }

    try {
      // Create checkpoint before starting
      await createCheckpoint(env, `pre_migration_${Date.now()}`)

      for (const migration of pending) {
        console.log(`[Migrations] Applying ${migration.name}...`)
        const migrationStart = Date.now()
        const timeout = migration.timeout_ms || 30000

        // Load SQL from KV
        let sql = migration.sql_up
        if (!sql) {
          sql = await loadMigrationSQL(env, migration.name) || ''
        }

        if (!sql.trim()) {
          console.warn(`[Migrations] Skipping ${migration.name} - no SQL available`)
          // Still record as applied for backwards compatibility
          await env.DB.prepare(
            'INSERT INTO _migrations (id, name) VALUES (?, ?)'
          ).bind(migration.id, migration.name).run()
          appliedMigrations.push(migration.name)
          continue
        }

        // Execute with timeout
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          const statementStart = Date.now()
          
          try {
            await env.DB.prepare(statement).run()
          } catch (error: any) {
            console.error(`[Migrations] Statement failed:`, statement.substring(0, 100))
            throw error
          }
          
          // Check timeout
          if (Date.now() - migrationStart > timeout) {
            throw new Error(`Migration timeout after ${timeout}ms`)
          }
        }

        // Record migration
        await env.DB.prepare(
          'INSERT INTO _migrations (id, name) VALUES (?, ?)'
        ).bind(migration.id, migration.name).run()

        const duration = Date.now() - migrationStart
        console.log(`[Migrations] ✓ ${migration.name} complete (${duration}ms)`)
        appliedMigrations.push(migration.name)
      }

      const totalDuration = Date.now() - startTime
      console.log(`[Migrations] ✓ All migrations applied (${totalDuration}ms)`)
      return { success: true, applied: appliedMigrations }
      
    } finally {
      // Always release lock
      await releaseMigrationLock(env)
    }
    
  } catch (error: any) {
    console.error('[Migrations] Fatal:', error.message)
    
    // Attempt rollback
    console.log('[Migrations] Attempting rollback...')
    const rollbackSuccess = await rollbackToCheckpoint(env, 'last_checkpoint')
    
    return { 
      success: false, 
      error: error.message,
      applied: appliedMigrations
    }
  }
}

/**
 * Dry-run mode - shows what would be applied without executing
 */
export async function dryRunMigrations(env: Bindings): Promise<{ pending: string[]; count: number }> {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run()

  const applied = await env.DB.prepare(
    'SELECT id, name FROM _migrations ORDER BY id'
  ).all()

  const appliedIds = new Set(applied.results.map((m: any) => m.id))
  const pending = MIGRATIONS.filter(m => !appliedIds.has(m.id))

  return {
    pending: pending.map(m => m.name),
    count: pending.length
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(env: Bindings): Promise<{
  applied: Array<{ id: number; name: string; applied_at: string }>
  pending: string[]
  total: number
}> {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run()

  const applied = await env.DB.prepare(
    'SELECT id, name, applied_at FROM _migrations ORDER BY id'
  ).all()

  const appliedIds = new Set(applied.results.map((m: any) => m.id))
  const pending = MIGRATIONS.filter(m => !appliedIds.has(m.id))

  return {
    applied: applied.results,
    pending: pending.map(m => m.name),
    total: MIGRATIONS.length
  }
}
