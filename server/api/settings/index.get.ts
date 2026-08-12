import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import { settingService } from '../../services/settingService'

export default defineApiHandler(async (event) => {
  // Solo los usuarios con acceso de Seguridad (como los gerentes o administradores) pueden leer configuraciones si así lo desean, 
  // aunque el frontend podría necesitar leerlo para la interfaz de las solicitudes.
  // Para simplificar, permitiremos lectura a autenticados en este endpoint.
  await requirePermission(event, 'SECURITY', 'canRead') 
  return settingService.getAllSettings()
})
