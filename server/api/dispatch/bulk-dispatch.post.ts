import { defineApiHandler } from '../../utils/handler'
import { requireUserContext, requirePermission } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS_REQUESTS', 'create')
  const user = await requireUserContext(event)

  const body = await readBody(event)
  const { detailIds, diningRoomId } = body

  if (!Array.isArray(detailIds) || detailIds.length === 0) {
    throw new DomainError('Debe seleccionar al menos un registro para despachar', 400, 'BAD_REQUEST')
  }

  if (!diningRoomId) {
    throw new DomainError('El comedor es requerido', 400, 'BAD_REQUEST')
  }

  const numericIds = detailIds
    .map((id: any) => parseInt(id, 10))
    .filter((id: number) => !isNaN(id))

  if (numericIds.length === 0) {
    throw new DomainError('IDs inválidos en la selección', 400, 'BAD_REQUEST')
  }

  // Safety catch: solo actualiza los que siguen pendientes en este momento
  // Esto protege contra race conditions con el kiosco biométrico
  const result = await prisma.dinerRequestDetail.updateMany({
    where: {
      id: { in: numericIds },
      dispatchedAt: null // SAFETY CATCH: no sobreescribir despachos previos
    },
    data: {
      dispatchedAt: new Date(),
      dispatchedById: user.id
    }
  })

  return {
    message: `Se despacharon exitosamente ${result.count} raciones.`,
    count: result.count,
    skipped: numericIds.length - result.count
  }
})
