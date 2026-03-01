import { defineConfig } from 'vitest/config'

// Unit test config — pure Node environment, no Cloudflare bindings needed
// Integration tests have their own vitest.integration.config.ts
export default defineConfig({
  test: {
    name: 'unit',
    include: ['src/**/*.unit.test.ts'],
    environment: 'node',
    globals: true,
  }
})
