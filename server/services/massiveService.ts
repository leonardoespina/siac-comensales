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

export async function getMassiveBatchesList(diningRoomId: number | undefined, dateStr: string, dependencyId?: number | null, subdependencyId?: number | null) {
  const massiveRequests = await massiveRepo.findMassiveRequests(diningRoomId, dateStr, dependencyId, subdependencyId)

  // Filtramos para obtener SOLO los despachos masivos verdaderos:
  const bulkRequests = massiveRequests.filter(req => 
    req.details.length > 1 || req.details.some(d => d.quantity > 1)
  )

  return bulkRequests.map(req => {
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
    const subdependencyName = firstDiner?.subdependency ? `${firstDiner.subdependency.dependency.name} - ${firstDiner.subdependency.name}` : 'N/A'

    return {
      id: req.id,
      batchCode: req.batchCode,
      shiftType: req.shiftType,
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

  // --- NUEVA VALIDACIÓN DE SEGURIDAD (FECHA Y HORARIO) ---
  const now = dayjs().tz('America/Caracas')
  const currentTimeStr = now.format('HH:mm')
  const requestDateStr = dayjs.utc(massiveRequest.date).format('YYYY-MM-DD')
  const todayStr = now.format('YYYY-MM-DD')

  if (requestDateStr !== todayStr) {
    throw new DomainError(`Alerta: Este pedido es para el día ${requestDateStr}, pero hoy es ${todayStr}. Los despachos solo se permiten en su fecha asignada.`, 403, 'WRONG_DAY')
  }
  // -------------------------------------------------------

  const personInfo = await massiveRepo.findWorkerOrDiner(scannedCedula)
  if (!personInfo) {
    throw new DomainError('La cédula escaneada no existe en los registros de la empresa', 404, 'NOT_FOUND')
  }

  let scannedPerson = { cedula: '', name: '', dependencyId: null, dependencyName: '' }
  if (personInfo.type === 'WORKER') {
    scannedPerson = {
      cedula: personInfo.data.cedula,
      name: personInfo.data.name,
      dependencyId: personInfo.data.dependencyId,
      dependencyName: personInfo.data.dependency?.name || ''
    }
  } else {
    scannedPerson = {
      cedula: personInfo.data.cedula,
      name: personInfo.data.name,
      dependencyId: personInfo.data.subdependency?.dependencyId,
      dependencyName: personInfo.data.subdependency?.dependency?.name || ''
    }
  }

  const firstDiner = massiveRequest.details[0]?.diner
  const expectedCedula = firstDiner?.cedula
  const expectedDependencyId = firstDiner?.subdependency?.dependencyId
  let isSubstitute = false
  let warningMessage = null

  // Nivel 1: Es la misma persona autorizada explicitamente
  if (expectedCedula && scannedPerson.cedula === expectedCedula) {
    // OK
  } else if (expectedDependencyId && scannedPerson.dependencyId === expectedDependencyId) {
    // Nivel 2: Misma dependencia, warning leve
    isSubstitute = true
    warningMessage = `Entregado al suplente: ${scannedPerson.name}`
  } else {
    // Nivel 3: Diferente dependencia
    if (!force) {
      throw new DomainError(
        `Alerta de Seguridad: ${scannedPerson.name} pertenece a otra dependencia (${scannedPerson.dependencyName || 'Desconocida'}). Requiere autorización forzada para entregar.`, 
        403, 
        'DIFFERENT_DEPENDENCY'
      )
    }
    isSubstitute = true
    warningMessage = `Entregado a suplente externo: ${scannedPerson.name} (${scannedPerson.dependencyName || 'N/A'}) - Forzado por Operador`
  }

  await massiveRepo.executeBatchDispatch(batchId, operatorId, scannedPerson.cedula)

  return {
    success: true,
    message: 'Despacho masivo confirmado correctamente',
    isSubstitute,
    receiver: scannedPerson.name,
    quantity: massiveRequest.details.reduce((sum, d) => sum + d.quantity, 0)
  }
}
