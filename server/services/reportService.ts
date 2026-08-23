import * as reportRepo from '../repository/reportRepository'
import { DomainError } from '../domain/errors'

// We need user context to apply RLS
export async function generateMasterReport(filters: any, user: any) {
  // Validate basic input
  if (!filters.dateFrom || !filters.dateTo) {
    throw new DomainError('Debe especificar un rango de fechas para el reporte', 400, 'BAD_REQUEST')
  }

  // Parse filters
  const parsedFilters: reportRepo.MasterReportFilters = {
    dateFrom: new Date(filters.dateFrom),
    dateTo: new Date(filters.dateTo),
    diningRoomId: filters.diningRoomId ? Number(filters.diningRoomId) : undefined,
    shiftType: filters.shiftType || undefined,
    status: filters.status || undefined,
    dependencyId: filters.dependencyId ? Number(filters.dependencyId) : undefined,
    subdependencyId: filters.subdependencyId ? Number(filters.subdependencyId) : undefined
  }

  // Security Context (Row-Level Security)
  const security: reportRepo.SecurityContext = {
    dependencyId: user.isGlobal ? null : user.dependencyId,
    subdependencyId: user.isGlobal ? null : user.subdependencyId
  }

  // Retrieve raw data in parallel
  const [rawData, extraordinaryData] = await Promise.all([
    reportRepo.getConsolidatedReport(parsedFilters, security),
    reportRepo.getApprovedExtraordinaryForReport(parsedFilters, security)
  ])

  // Map standard requests
  const standardReport = rawData.map(d => {
    // Si la request tiene targetSubdependency (es un lote masivo), ESA es la gerencia real,
    // de lo contrario usamos la del comensal que vino a comer (DINE_IN normal)
    const effectiveSubdep = d.request.targetSubdependency || d.diner.subdependency;
    
    return {
      id: d.id, // Detail ID for massive approval selection
      ticketNo: d.request.batchCode || d.request.id.toString(),
      cedula: d.diner.cedula,
      firstName: d.diner.name.split(' ')[0] || '',
      lastName: d.diner.name.split(' ').slice(1).join(' ') || '',
      fullName: d.diner.name,
      gerencia: effectiveSubdep?.dependency?.name || 'N/A',
      adscripcion: effectiveSubdep?.name || 'N/A',
      comedor: d.request.diningRoom?.name || 'N/A',
      servicio: d.request.shiftType,
      modalidad: d.modality === 'TAKE_AWAY' ? 'PARA LLEVAR' : 'BANDEJA',
      rationType: d.rationType,
      estatus: d.dispatchedAt ? 'DESPACHADO' : d.request.status,
      fechaDespacho: d.dispatchedAt ? d.dispatchedAt.toISOString() : null,
      quantity: d.quantity
    }
  })

  // Map extraordinary visits (if status filter is DESPACHADAS or APPROVED or undefined, include them)
  const isExcludedByStatus = filters.status && !['DESPACHADAS', 'APPROVED'].includes(filters.status)
  
  const extraordinaryReport = isExcludedByStatus
    ? []
    : extraordinaryData.map(e => {
        const depName = e.subdependency?.dependency?.name || e.dependency?.name || 'N/A'
        const subdepName = e.subdependency?.name || 'N/A'

        return {
          id: `EXTRA-${e.id}`,
          ticketNo: `EXTRA-${e.id}`,
          cedula: e.personId,
          firstName: e.companyName.split(' ')[0] || '',
          lastName: e.companyName.split(' ').slice(1).join(' ') || '',
          fullName: e.companyName,
          gerencia: depName,
          adscripcion: subdepName,
          comedor: e.diningRoom?.name || 'N/A',
          servicio: e.shiftType,
          modalidad: 'VISITA EXTRAORDINARIA',
          rationType: 'REGULAR',
          estatus: 'DESPACHADO',
          fechaDespacho: e.approvedAt ? e.approvedAt.toISOString() : e.dispatchedAt.toISOString(),
          quantity: e.quantity
        }
      })

  const combined = [...standardReport, ...extraordinaryReport]

  return {
    success: true,
    totalRecords: combined.length,
    data: combined
  }
}

export async function generateSummaryReport(filters: any, user: any) {
  if (!filters.dateFrom || !filters.dateTo) {
    throw new DomainError('Debe especificar un rango de fechas para el reporte', 400, 'BAD_REQUEST')
  }

  const groupBy: 'DEPENDENCY' | 'SUBDEPENDENCY' = filters.groupBy === 'SUBDEPENDENCY' ? 'SUBDEPENDENCY' : 'DEPENDENCY'

  const parsedFilters: reportRepo.MasterReportFilters = {
    dateFrom: new Date(filters.dateFrom),
    dateTo: new Date(filters.dateTo),
    diningRoomId: filters.diningRoomId ? Number(filters.diningRoomId) : undefined,
    dependencyId: filters.dependencyId ? Number(filters.dependencyId) : undefined,
    subdependencyId: filters.subdependencyId ? Number(filters.subdependencyId) : undefined,
    status: filters.status || undefined
  }

  const security: reportRepo.SecurityContext = {
    dependencyId: user.isGlobal ? null : user.dependencyId,
    subdependencyId: user.isGlobal ? null : user.subdependencyId
  }

  const isExtraordinaryExcluded = filters.status === 'APPROVED'

  // Fetch raw data in parallel
  const [rawData, extraordinaryData] = await Promise.all([
    reportRepo.getConsolidatedReport(parsedFilters, security),
    isExtraordinaryExcluded ? Promise.resolve([]) : reportRepo.getApprovedExtraordinaryForReport(parsedFilters, security)
  ])

  // Map to a common flat structure for aggregation
  const items: Array<{
    depId: number | null
    depName: string
    subdepId: number | null
    subdepName: string
    shiftType: string
    quantity: number
  }> = []

  // 1. Process standard requests
  for (const d of rawData) {
    const effectiveSubdep = d.request.targetSubdependency || d.diner?.subdependency
    const depId = effectiveSubdep?.dependency?.id || null
    const depName = effectiveSubdep?.dependency?.name || 'N/A'
    const subdepId = effectiveSubdep?.id || null
    const subdepName = effectiveSubdep?.name || 'N/A'

    items.push({
      depId,
      depName,
      subdepId,
      subdepName,
      shiftType: d.request.shiftType,
      quantity: d.quantity || 1
    })
  }

  // 2. Process extraordinary visits
  for (const e of extraordinaryData) {
    const depId = e.subdependency?.dependency?.id || e.dependency?.id || null
    const depName = e.subdependency?.dependency?.name || e.dependency?.name || 'N/A'
    const subdepId = e.subdependency?.id || null
    const subdepName = e.subdependency?.name || 'N/A'

    items.push({
      depId,
      depName,
      subdepId,
      subdepName,
      shiftType: e.shiftType,
      quantity: e.quantity || 1
    })
  }

  // Pivot Table Aggregation
  const map = new Map<string, {
    id: string
    name: string
    dependencyName?: string
    desayuno: number
    almuerzo: number
    cena: number
    sobrecena: number
    total: number
  }>()

  for (const item of items) {
    let key = ''
    let name = ''
    let dependencyName = ''

    if (groupBy === 'SUBDEPENDENCY') {
      key = item.subdepId ? `sub_${item.subdepId}` : `sub_name_${item.subdepName}`
      name = item.subdepName
      dependencyName = item.depName
    } else {
      key = item.depId ? `dep_${item.depId}` : `dep_name_${item.depName}`
      name = item.depName
    }

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name,
        ...(groupBy === 'SUBDEPENDENCY' ? { dependencyName } : {}),
        desayuno: 0,
        almuerzo: 0,
        cena: 0,
        sobrecena: 0,
        total: 0
      })
    }

    const row = map.get(key)!
    const qty = item.quantity

    if (item.shiftType === 'DESAYUNO') row.desayuno += qty
    else if (item.shiftType === 'ALMUERZO') row.almuerzo += qty
    else if (item.shiftType === 'CENA') row.cena += qty
    else if (item.shiftType === 'SOBRECENA') row.sobrecena += qty

    row.total += qty
  }

  // Sort rows alphabetically
  const rows = Array.from(map.values()).sort((a, b) => {
    if (groupBy === 'SUBDEPENDENCY' && a.dependencyName && b.dependencyName && a.dependencyName !== b.dependencyName) {
      return a.dependencyName.localeCompare(b.dependencyName)
    }
    return a.name.localeCompare(b.name)
  })

  // Grand totals calculation
  const totals = {
    desayuno: 0,
    almuerzo: 0,
    cena: 0,
    sobrecena: 0,
    grandTotal: 0
  }

  for (const r of rows) {
    totals.desayuno += r.desayuno
    totals.almuerzo += r.almuerzo
    totals.cena += r.cena
    totals.sobrecena += r.sobrecena
    totals.grandTotal += r.total
  }

  return {
    success: true,
    groupBy,
    rows,
    totals
  }
}
