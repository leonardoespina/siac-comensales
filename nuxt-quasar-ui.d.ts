import type { ModuleOptions } from 'nuxt-quasar-ui'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    quasar?: Partial<ModuleOptions>
  }
  interface NuxtOptions {
    quasar?: Partial<ModuleOptions>
  }
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    quasar?: Partial<ModuleOptions>
  }
  interface NuxtOptions {
    quasar?: Partial<ModuleOptions>
  }
}

export {}
