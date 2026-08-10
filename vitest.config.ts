import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    include: ['tests/unit/**/*.test.ts', 'tests/_integration_wip/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@nuxt/test-utils'],
        external: ['pg', 'pg-pool', '@prisma/adapter-pg']
      }
    }
  }
})
