import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerService from '../../services/dinerService'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS_REQUESTS', 'create')
  const userContext = await requireUserContext(event)
  const body = await readBody(event)

  if (!body.targetDate || !body.shiftType || !Array.isArray(body.dinersList)) {
    throw new ValidationError('Faltan parámetros: targetDate, shiftType o dinersList.')
  }

  // 2. Aislamiento Multi-Tenant
  if (!userContext.isGlobal && !userContext.subdependencyId) {
    throw new ForbiddenError('Tu usuario no está asignado a ninguna subdependencia. No puedes solicitar comida.')
  }

  const isExtraordinary = Boolean(body.isExtraordinary)

  // 3. LA BARRERA DE TIEMPO (RELOJ VENEZUELA)
  if (!isExtraordinary) {
    // Si NO es extraordinaria (nómina regular), aplicamos la regla de las 24 horas.
    const { isDateBeforeVenezuelaToday } = await import('../../utils/timezone')
    if (isDateBeforeVenezuelaToday(body.targetDate)) {
      throw new ValidationError('Error: La solicitud regular debe hacerse con al menos 1 día de anticipación. No puedes pedir para fechas actuales o pasadas.')
    }
  }

  // 3. Delegar al Servicio (Orquestador)
  return await dinerService.submitDinerRequest(
    new Date(body.targetDate),
    body.shiftType,
    userContext.id,
    body.dinersList,
    isExtraordinary
  )
})
