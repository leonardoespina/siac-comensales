/**
 * HANDLER: Eliminación / Mantenimiento Biométrico Multi-Sede
 *
 * Ruta: DELETE /api/biometrics/sync/:dinerId
 * Orquesta la purga de credenciales biométricas (disco, terminales y BD)
 * para un comensal específico.
 *
 * CAPA 4 — Adaptador HTTP. Sin lógica de negocio.
 */

import { defineApiHandler } from '../../../utils/handler'
import { clearDinerBiometricsAcrossAllTerminals } from '../../../services/hikvisionService'

export default defineApiHandler(async (event) => {
  const dinerId = parseInt(event.context.params?.dinerId || '0', 10)

  if (!dinerId || isNaN(dinerId)) {
    throw createError({ statusCode: 400, statusMessage: 'dinerId inválido' })
  }

  const result = await clearDinerBiometricsAcrossAllTerminals(dinerId)

  return result
})
