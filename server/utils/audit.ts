import { prisma } from './prisma'

export async function logAudit(
  userId: number | null, 
  action: string, 
  entity: string, 
  entityId?: number, 
  details?: string | object
) {
  try {
    // Convertimos los detalles a texto JSON si nos pasan un objeto
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: detailsStr
      }
    });
  } catch (error) {
    // Si falla la auditoría, no queremos tumbar el sistema principal,
    // pero sí dejamos un log en la consola del servidor.
    console.error('Error al registrar auditoría:', error);
  }
}