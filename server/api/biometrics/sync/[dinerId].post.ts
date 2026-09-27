/**
 * HANDLER: Sincronización Biométrica Multi-Sede
 *
 * Ruta: POST /api/biometrics/sync/:dinerId
 * Orquesta la replicación del registro facial de un comensal
 * hacia todos los terminales Hikvision activos del sistema.
 *
 * CAPA 4 — Adaptador HTTP. Sin lógica de negocio.
 */

import { defineApiHandler } from '../../../utils/handler'
import { syncDinerAcrossAllTerminals } from '../../../services/hikvisionService'

export default defineApiHandler(async (event) => {
  const dinerId = parseInt(event.context.params?.dinerId || '0', 10)

  if (!dinerId || isNaN(dinerId)) {
    throw createError({ statusCode: 400, statusMessage: 'dinerId inválido' })
  }

  const result = await syncDinerAcrossAllTerminals(dinerId)

  return result
})
