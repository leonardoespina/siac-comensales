import { defineApiHandler } from '../../../utils/handler'
import { requirePermission, requireUserContext } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineApiHandler(async (event) => {
  // 1. Verificación de permisos
  await requirePermission(event, 'DINERS', 'create')
  const user = await requireUserContext(event)
  
  const body = await readBody(event)
  const rows = body.rows as Array<any>

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { validRows: [], invalidRows: [{ row: null, error: 'No se enviaron datos válidos.' }] }
  }

  const validRows = []
  const invalidRows = []

  // Sanitizar todas las cédulas antes de agrupar y validar
  rows.forEach(r => {
    if (r.cedula) {
      r.cedula = String(r.cedula).replace(/\D/g, '')
    }
  })

  // Extraer valores únicos para optimizar consultas
  const uniqueAreas = [...new Set(rows.map(r => r.areaName))]
  const uniquePositions = [...new Set(rows.filter(r => r.positionName).map(r => r.positionName))]
  const uniqueSquads = [...new Set(rows.map(r => r.squadName))]
  const uniqueWarehouses = [...new Set(rows.map(r => r.comedorName))]
  const uniqueCedulas = [...new Set(rows.map(r => r.cedula))]

  // Cargar diccionarios desde la BD
  const [dbAreas, dbPositions, dbSquads, dbWarehouses, dbDiners] = await Promise.all([
    prisma.subdependency.findMany({ where: { name: { in: uniqueAreas, mode: 'insensitive' } } }),
    prisma.position.findMany({ where: { name: { in: uniquePositions, mode: 'insensitive' } } }),
    prisma.squad.findMany({ where: { name: { in: uniqueSquads, mode: 'insensitive' } } }),
    prisma.warehouse.findMany({ where: { name: { in: uniqueWarehouses as string[], mode: 'insensitive' }, type: 'LOCAL' } }),
    prisma.diner.findMany({ where: { cedula: { in: uniqueCedulas } }, select: { cedula: true } })
  ])

  // Crear mapas rápidos ignorando mayúsculas
  const areaMap = new Map(dbAreas.map(a => [a.name.toUpperCase(), a]))
  const positionMap = new Map(dbPositions.map(p => [p.name.toUpperCase(), p]))
  const squadMap = new Map(dbSquads.map(s => [s.name.toUpperCase(), s]))
  const warehouseMap = new Map(dbWarehouses.map(w => [w.name.toUpperCase(), w]))
  const dinerSet = new Set(dbDiners.map(d => d.cedula))

  // Validar fila por fila
  for (const row of rows) {
    const errors: string[] = []

    // 1. Validar Área (Subdependencia)
    const areaKey = (row.areaName || '').toUpperCase()
    const areaDb = areaMap.get(areaKey)
    if (!areaDb) {
      errors.push(`El área '${row.areaName}' no existe.`)
    } else {
      // Seguridad
      if (!user.isGlobal) {
        if (user.dependencyId && !user.subdependencyId && areaDb.dependencyId !== user.dependencyId) {
          errors.push(`No tienes permiso en el área '${row.areaName}'.`)
        } else if (user.subdependencyId && areaDb.id !== user.subdependencyId) {
          errors.push(`Tu usuario no tiene permiso en el área '${row.areaName}'.`)
        }
      }
    }

    // 2. Validar Cargo
    if (row.positionName) {
      const posKey = row.positionName.toUpperCase()
      if (!positionMap.has(posKey)) {
        errors.push(`El cargo '${row.positionName}' no existe.`)
      }
    }

    // 3. Validar Cuadrilla
    const squadKey = (row.squadName || '').toUpperCase()
    if (!squadMap.has(squadKey)) {
      errors.push(`La cuadrilla '${row.squadName}' no existe.`)
    }

    // 4. Validar Comedor
    const warehouseKey = (row.comedorName || '').toUpperCase()
    if (!warehouseMap.has(warehouseKey)) {
      errors.push(`El comedor '${row.comedorName}' no existe.`)
    }

    // Determinar si es actualización o inserción para la UI
    row._isUpdate = dinerSet.has(row.cedula)

    if (errors.length > 0) {
      invalidRows.push({ row, error: errors.join(' ') })
    } else {
      validRows.push(row)
    }
  }

  return { validRows, invalidRows }
})
