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

  // Retrieve raw data
  const rawData = await reportRepo.getConsolidatedReport(parsedFilters, security)

  // Map to a flat structure (Kardex format) as requested
  const report = rawData.map(d => {
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

  return {
    success: true,
    totalRecords: report.length,
    data: report
  }
}
