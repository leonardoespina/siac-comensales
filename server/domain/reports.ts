export interface SummaryReportFilters {
  dateFrom: Date
  dateTo: Date
  diningRoomId?: number
  groupBy: 'DEPENDENCY' | 'SUBDEPENDENCY'
  dependencyId?: number
  subdependencyId?: number
}

export interface SummaryReportRow {
  id: string | number
  name: string
  dependencyName?: string
  desayuno: number
  almuerzo: number
  cena: number
  sobrecena: number
  total: number
}

export interface SummaryReportResult {
  groupBy: 'DEPENDENCY' | 'SUBDEPENDENCY'
  rows: SummaryReportRow[]
  totals: {
    desayuno: number
    almuerzo: number
    cena: number
    sobrecena: number
    grandTotal: number
  }
}
