import { defineApiHandler } from '../../../utils/handler'
import { requireUserContext, requirePermission } from '../../../utils/auth'
import * as massiveService from '../../../services/massiveService'
import { DomainError } from '../../../domain/errors'

/**
 * Handler: Despacho masivo por MÚLTIPLES lotes en una sola operación.
 * Recibe un arreglo de batchIds y la cédula del delegado.
 * Responsabilidad única: parsear el body y delegar al Service.
 */
export default defineApiHandler(async (event) => {
  await requirePermission(event, 'MASSIVE_DISPATCH', 'create')
  const user = await requireUserContext(event)

  const body = await readBody(event)
  const { batchIds, scannedCedula, force } = body

  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    throw new DomainError('Debe seleccionar al menos un lote para despachar', 400, 'BAD_REQUEST')
  }

  if (!scannedCedula) {
    throw new DomainError('La cédula del delegado es requerida', 400, 'BAD_REQUEST')
  }

  const result = await massiveService.processMultiBatchDispatch(
    batchIds.map(Number),
    scannedCedula,
    user.id,
    force ?? false
  )

  return result
})
