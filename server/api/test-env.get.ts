import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  return {
    envBypassRaw: process.env.TEST_BYPASS_TIME_RULES,
    runtimeConfigBypass: config.public.testBypassTimeRules
  }
})
