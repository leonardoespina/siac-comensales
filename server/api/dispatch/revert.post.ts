import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { DomainError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  const userId = await requirePermission(event, 'DISPATCH', 'delete')
  const { detailId } = body
  const user = event.context.user

  if (!detailId) {
    throw new DomainError('ID de detalle requerido', 400, 'BAD_REQUEST')
  }

  // Find the dispatch
  const detail = await prisma.dinerRequestDetail.findUnique({
    where: { id: detailId },
    include: { request: true }
  })

  if (!detail) {
    throw new DomainError('Registro no encontrado', 404, 'NOT_FOUND')
  }

  if (!detail.dispatchedAt) {
    throw new DomainError('Este registro no está despachado', 400, 'BAD_REQUEST')
  }

  if (detail.dispatchedById === null) {
    throw new DomainError('Solo se pueden deshacer los despachos asistidos manualmente', 403, 'FORBIDDEN')
  }

  if (detail.isEmergency) {
    // Caso B: Fue creado de emergencia. Hacemos soft-delete a la solicitud completa.
    await prisma.dinerRequest.update({
      where: { id: detail.requestId },
      data: { deletedAt: new Date() }
    })
    return { success: true, message: 'Despacho de emergencia anulado.' }
  } else {
    // Caso A: Tenía solicitud previa. Solo quitamos el despacho.
    await prisma.dinerRequestDetail.update({
      where: { id: detailId },
      data: {
        dispatchedAt: null,
        dispatchedById: null
      }
    })
    return { success: true, message: 'Despacho revertido con éxito.' }
  }
})
