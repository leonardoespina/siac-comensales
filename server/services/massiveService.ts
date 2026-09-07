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

  // Todas las solicitudes con modalidad TAKE_AWAY son despachables como lote masivo
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
