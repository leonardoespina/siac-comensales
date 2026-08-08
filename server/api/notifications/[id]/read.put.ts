import { defineApiHandler } from '../../../utils/handler'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const id = parseInt(event.context.params?.id || '0')

  // Solo puede marcar como leída su propia notificación
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  })

  return { success: true }
})
