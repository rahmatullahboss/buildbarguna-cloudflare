#!/usr/bin/env node

/**
 * Database Rollback Script
 * Rolls back the last applied migration or to a specific checkpoint
 * 
 * Usage:
 *   npm run db:rollback              # Rollback last migration
 *   npm run db:rollback -- --to 3    # Rollback to migration ID 3
 *   npm run db:rollback -- --force   # Skip confirmation
 */

const { execSync } = require('child_process')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function exec(command) {
  try {
    return execSync(command, { stdio: 'inherit' })
  } catch (error) {
    console.error('Command failed:', command)
    throw error
  }
}

async function getCurrentMigrations() {
  const output = execSync(
    'npx wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT id, name FROM _migrations ORDER BY id DESC LIMIT 1" 2>/dev/null',
    { encoding: 'utf8' }
  )
  
  // Parse output (simplified - in production use proper parsing)
  const lines = output.split('\n').filter(l => l.trim() && !l.includes('SUCCESS'))
  if (lines.length < 3) return null
  
  const lastLine = lines[lines.length - 1]
  const parts = lastLine.split('|').map(p => p.trim())
  
  return {
    id: parseInt(parts[0]),
    name: parts[1]
  }
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const toIndex = args.indexOf('--to')
  const targetId = toIndex > -1 ? parseInt(args[toIndex + 1]) : null
  
  console.log('🔄 Database Rollback Tool')
  console.log('==========================\n')
  
  // Get current migration
  const current = await getCurrentMigrations()
  
  if (!current) {
    console.log('✅ No migrations to rollback')
    process.exit(0)
  }
  
  console.log(`Current migration: ${current.name} (ID: ${current.id})`)
  
  if (targetId) {
    console.log(`Target: Rollback to migration ${targetId}`)
  }
  
  // Confirmation
  if (!force) {
    const answer = await new Promise(resolve => {
      rl.question('\n⚠️  This will rollback database changes. Continue? (y/N): ', resolve)
    })
    
    rl.close()
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Rollback cancelled')
      process.exit(0)
    }
  }
  
  console.log('\n📝 Rollback steps:')
  console.log('1. Database backup will be created')
  console.log('2. Last migration will be rolled back')
  console.log('3. Migration record will be removed')
  console.log('')
  
  // Create backup
  console.log('💾 Creating backup...')
  const backupFile = `./backups/rollback_backup_${Date.now()}.sql`
  exec(`mkdir -p backups`)
  exec(`npx wrangler d1 export buildbarguna-invest-db --remote --output=${backupFile}`)
  console.log(`✅ Backup saved to ${backupFile}`)
  
  // Rollback logic (simplified - in production would execute down migrations)
  console.log('\n🔄 Rolling back migration...')
  
  if (targetId) {
    // Rollback to specific migration
    exec(`npx wrangler d1 execute buildbarguna-invest-db --remote --command "DELETE FROM _migrations WHERE id > ${targetId}"`)
  } else {
    // Rollback last migration only
    exec(`npx wrangler d1 execute buildbarguna-invest-db --remote --command "DELETE FROM _migrations WHERE id = ${current.id}"`)
  }
  
  console.log('\n✅ Rollback complete!')
  console.log('\n⚠️  Note: This only removed the migration record.')
  console.log('You may need to manually revert schema changes.')
  console.log(`Backup available at: ${backupFile}`)
  
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Rollback failed:', error.message)
  process.exit(1)
})
