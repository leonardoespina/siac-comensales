import * as massiveRepo from '../repository/massiveRepository'
import { DomainError } from '../domain/errors'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

import { prisma } from '../utils/prisma'
import isBetween from 'dayjs/plugin/isBetween.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(customParseFormat)

export async function getMassiveBatchesList(
  diningRoomId: number | undefined,
  dateFrom: string,
  dateTo: string,
  dependencyId?: number | null,
  subdependencyId?: number | null
) {
  const massiveRequests = await massiveRepo.findMassiveRequests(diningRoomId, dateFrom, dateTo, dependencyId, subdependencyId)

  return massiveRequests.map(req => {
    const totalViandas = req.details.reduce((sum, d) => sum + d.quantity, 0)
    const isDispatched = req.details.every(d => d.dispatchedAt !== null)
    const firstDispatched = req.details.find(d => d.dispatchedAt !== null)
    let dispatchedByName = null
    let dispatchedAt = null
    let isSubstitute = false

    const authorizedDiner = req.details[0]?.diner

    if (firstDispatched) {
      dispatchedAt = dayjs(firstDispatched.dispatchedAt).tz('America/Caracas').format('hh:mm A')
      if (firstDispatched.receiverCedula) {
        dispatchedByName = `C.I. ${firstDispatched.receiverCedula}`
        isSubstitute = firstDispatched.receiverCedula !== authorizedDiner?.cedula
      } else {
        dispatchedByName = authorizedDiner?.name || req.createdBy.name
        isSubstitute = false
      }
    }

    const firstDiner = req.details[0]?.diner
    const subdependencyName = firstDiner?.subdependency
      ? `${firstDiner.subdependency.dependency.name} - ${firstDiner.subdependency.name}`
      : 'N/A'

    // Fecha formateada para agrupación en la UI
    const dateLabel = dayjs.utc(req.date).format('DD/MM/YYYY')

    return {
      id: req.id,
      batchCode: req.batchCode,
      shiftType: req.shiftType,
      date: req.date,
      dateLabel,
      subdependencyName,
      quantity: totalViandas,
      expectedResponsible: authorizedDiner?.name || req.createdBy.name,
      expectedResponsibleCedula: authorizedDiner?.cedula || req.createdBy.cedula,
      isDispatched,
      dispatchedByName,
      dispatchedAt,
      isSubstitute
    }
  })
}

export async function processMassiveDispatch(batchId: number, scannedCedula: string, operatorId: number, force: boolean) {
  const massiveRequest = await massiveRepo.getMassiveRequestById(batchId)

  if (!massiveRequest) {
    throw new DomainError('No se encontró el lote masivo', 404, 'NOT_FOUND')
  }

  if (massiveRequest.details.length === 0) {
    throw new DomainError('El lote masivo no tiene viandas pendientes por despachar', 400, 'NO_DETAILS')
  }

  const isAlreadyDispatched = massiveRequest.details.every(d => d.dispatchedAt !== null)
  if (isAlreadyDispatched) {
    throw new DomainError('Este lote masivo ya fue despachado completamente', 409, 'ALREADY_DISPATCHED')
  }

  // --- VALIDACIÓN DE FECHA ---
  const now = dayjs().tz('America/Caracas')
  const requestDateStr = dayjs.utc(massiveRequest.date).format('YYYY-MM-DD')
  const todayStr = now.format('YYYY-MM-DD')

  const bypassTime = process.env.TEST_BYPASS_TIME_RULES === 'true'
  if (requestDateStr !== todayStr && !bypassTime) {
    throw new DomainError(`Alerta: Este pedido es para el día ${requestDateStr}, pero hoy es ${todayStr}. Los despachos solo se permiten en su fecha asignada.`, 403, 'WRONG_DAY')
  }

  const personInfo = await massiveRepo.findWorkerOrDiner(scannedCedula)
  if (!personInfo) {
    throw new DomainError('La cédula ingresada no existe en los registros de la empresa', 404, 'NOT_FOUND')
  }

  const diner = personInfo.diner
  const user = personInfo.workerUser

  const personName = diner?.name || user?.name || 'Desconocido'
  const personCedula = diner?.cedula || user?.cedula || scannedCedula

  // Recolectar todas las dependencias a las que pertenece la persona (comensal o usuario)
  const userDepId = user?.dependencyId ?? user?.subdependency?.dependencyId ?? null
  const dinerDepId = diner?.subdependency?.dependencyId ?? null
  
  const personDependencyIds = [userDepId, dinerDepId].filter((id): id is number => id !== null)
  const personDependencyName = diner?.subdependency?.dependency?.name || user?.dependency?.name || user?.subdependency?.dependency?.name || 'Desconocida'
  const isAdmin = user?.role?.name === 'ADMIN'

  const firstDiner = massiveRequest.details[0]?.diner
  const expectedCedula = firstDiner?.cedula
  const expectedDependencyId = firstDiner?.subdependency?.dependencyId || massiveRequest.createdBy?.dependencyId || massiveRequest.createdBy?.subdependency?.dependencyId
  const requestCreatorCedula = massiveRequest.createdBy?.cedula

  const numericScanned = personCedula.replace(/\D/g, '')
  const numericExpected = expectedCedula ? expectedCedula.replace(/\D/g, '') : null
  const numericCreator = requestCreatorCedula ? requestCreatorCedula.replace(/\D/g, '') : null

  let isSubstitute = false
  let warningMessage = null

  // Nivel 1: Es la persona autorizada explícitamente o el creador de la solicitud
  const isDirectAuthorized = (numericExpected && numericScanned === numericExpected) ||
                             (numericCreator && numericScanned === numericCreator)

  if (isDirectAuthorized) {
    // OK directo
  } else if (expectedDependencyId && personDependencyIds.includes(expectedDependencyId)) {
    // Nivel 2: Misma gerencia/dependencia, suplente válido de la misma área
    isSubstitute = true
    warningMessage = `Entregado al suplente: ${personName}`
  } else if (isAdmin) {
    // Administrador retirando en nombre del área
    isSubstitute = true
    warningMessage = `Entregado al Administrador: ${personName}`
  } else {
    // Nivel 3: Diferente dependencia
    if (!force) {
      throw new DomainError(
        `Alerta de Seguridad: ${personName} pertenece a otra dependencia (${personDependencyName}). Requiere confirmación para autorizar la entrega.`, 
        403, 
        'DIFFERENT_DEPENDENCY'
      )
    }
    isSubstitute = true
    warningMessage = `Entregado a suplente externo: ${personName} (${personDependencyName}) - Forzado por Operador`
  }

  await massiveRepo.executeBatchDispatch(batchId, operatorId, personCedula)

  return {
    success: true,
    message: warningMessage || 'Despacho masivo confirmado correctamente',
    isSubstitute,
    receiver: personName,
    quantity: massiveRequest.details.reduce((sum, d) => sum + d.quantity, 0)
  }
}

/**
 * Procesa el despacho de MÚLTIPLES lotes en una sola operación.
 * Reutiliza la validación del primer lote para verificar al delegado.
 * Si la persona es válida para el primer lote, se asume válida para todos
 * (misma subdependencia por diseño de la búsqueda).
 */
export async function processMultiBatchDispatch(
  batchIds: number[],
  scannedCedula: string,
  operatorId: number,
  force: boolean
) {
  if (!batchIds || batchIds.length === 0) {
    throw new DomainError('Debe seleccionar al menos un lote para despachar', 400, 'BAD_REQUEST')
  }

  // Validar al delegado usando el primer lote como referencia (todos son de la misma subdependencia)
  const referenceBatch = await massiveRepo.getMassiveRequestById(batchIds[0])
  if (!referenceBatch) {
    throw new DomainError('No se encontró el lote de referencia', 404, 'NOT_FOUND')
  }

  // Verificar que ningún lote ya esté completamente despachado
  const allBatches = await Promise.all(batchIds.map(id => massiveRepo.getMassiveRequestById(id)))
  const alreadyDispatched = allBatches.filter(b => b && b.details.every(d => d.dispatchedAt !== null))
  if (alreadyDispatched.length === batchIds.length) {
    throw new DomainError('Todos los lotes seleccionados ya fueron despachados', 409, 'ALREADY_DISPATCHED')
  }

  // Validación de fecha: permitir fechas pasadas (contingencia/falla del servicio),
  // pero NUNCA permitir despachos anticipados de fechas futuras
  const now = dayjs().tz('America/Caracas')
  const todayStr = now.format('YYYY-MM-DD')
  const bypassTime = process.env.TEST_BYPASS_TIME_RULES === 'true'

  for (const batch of allBatches) {
    if (!batch) continue
    const batchDateStr = dayjs.utc(batch.date).format('YYYY-MM-DD')
    const isFuture = dayjs(batchDateStr).isAfter(dayjs(todayStr))
    if (isFuture && !bypassTime) {
      throw new DomainError(
        `El lote "${batch.shiftType}" (${batch.batchCode}) es para el ${batchDateStr} (fecha futura). No se permiten despachos anticipados.`,
        403, 'FUTURE_DATE'
      )
    }
    // Fechas pasadas se permiten (contingencia operativa)
  }

  // Validar al delegado con la misma lógica estricta del despacho individual
  const personInfo = await massiveRepo.findWorkerOrDiner(scannedCedula)
  if (!personInfo) {
    throw new DomainError('La cédula ingresada no existe en los registros de la empresa', 404, 'NOT_FOUND')
  }

  const diner = personInfo.diner
  const user = personInfo.workerUser
  const personName = diner?.name || user?.name || 'Desconocido'
  const personCedula = diner?.cedula || user?.cedula || scannedCedula

  const userDepId = user?.dependencyId ?? user?.subdependency?.dependencyId ?? null
  const dinerDepId = diner?.subdependency?.dependencyId ?? null
  const personDependencyIds = [userDepId, dinerDepId].filter((id): id is number => id !== null)
  const personDependencyName = diner?.subdependency?.dependency?.name || user?.dependency?.name || 'Desconocida'
  const isAdmin = user?.role?.name === 'ADMIN'

  const firstDiner = referenceBatch.details[0]?.diner
  const expectedCedula = firstDiner?.cedula
  const expectedDependencyId = firstDiner?.subdependency?.dependencyId || referenceBatch.createdBy?.dependencyId
  const requestCreatorCedula = referenceBatch.createdBy?.cedula

  const numericScanned = personCedula.replace(/\D/g, '')
  const numericExpected = expectedCedula?.replace(/\D/g, '') ?? null
  const numericCreator = requestCreatorCedula?.replace(/\D/g, '') ?? null

  let isSubstitute = false
  let warningMessage: string | null = null

  const isDirectAuthorized = (numericExpected && numericScanned === numericExpected) ||
                             (numericCreator && numericScanned === numericCreator)

  if (isDirectAuthorized) {
    // OK directo
  } else if (expectedDependencyId && personDependencyIds.includes(expectedDependencyId)) {
    isSubstitute = true
    warningMessage = `Entregado al suplente: ${personName}`
  } else if (isAdmin) {
    isSubstitute = true
    warningMessage = `Entregado al Administrador: ${personName}`
  } else {
    if (!force) {
      throw new DomainError(
        `Alerta de Seguridad: ${personName} pertenece a otra dependencia (${personDependencyName}). Requiere confirmación para autorizar la entrega.`,
        403, 'DIFFERENT_DEPENDENCY'
      )
    }
    isSubstitute = true
    warningMessage = `Entregado a suplente externo: ${personName} (${personDependencyName}) - Forzado por Operador`
  }

  // Ejecutar despacho de TODOS los lotes en una sola transacción atómica
  const pendingBatchIds = allBatches
    .filter(b => b && !b.details.every(d => d.dispatchedAt !== null))
    .map(b => b!.id)

  await massiveRepo.executeMultiBatchDispatch(pendingBatchIds, operatorId, personCedula)

  const totalViandas = allBatches.reduce((sum, b) => sum + (b?.details.reduce((s, d) => s + d.quantity, 0) ?? 0), 0)

  return {
    success: true,
    message: warningMessage || `${pendingBatchIds.length} lote(s) despachado(s) correctamente`,
    isSubstitute,
    receiver: personName,
    quantity: totalViandas,
    batchesDispatched: pendingBatchIds.length
  }
}
