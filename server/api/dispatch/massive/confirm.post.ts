import { defineApiHandler } from '../../../utils/handler'
import { requireUserContext } from '../../../utils/auth'
import * as massiveService from '../../../services/massiveService'
import { DomainError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const { batchId, scannedCedula } = body
  const user = await requireUserContext(event) // El Operador que despacha

  if (!batchId || !scannedCedula) {
    throw new DomainError('Datos insuficientes para procesar el despacho masivo', 400, 'BAD_REQUEST')
  }

  const result = await massiveService.processMassiveDispatch(batchId, scannedCedula, user.id, body.force)
  return result
})
