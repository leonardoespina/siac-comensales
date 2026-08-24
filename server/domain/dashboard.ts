// ── DOMINIO DE DASHBOARD Y MÉTRICAS ──────────────────────────────────────────
// Regla Hexagonal: Tipos e interfaces puras sin dependencias externas.

export interface DashboardMetrics {
  registeredDiners: number
  todayRequests: number
  todayDispatched: number
}

export interface DashboardUserContext {
  id: number
  isGlobal: boolean
  dependencyId?: number | null
  subdependencyId?: number | null
  siteIds?: number[]
}
