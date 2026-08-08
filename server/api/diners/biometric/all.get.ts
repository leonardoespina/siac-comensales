import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  // Se requiere permiso de lectura de comensales para descargar la base biométrica
  await requirePermission(event, 'DINERS', 'read')
  
  const records = await dinerRepo.getAllBiometricRecords()
  
  // Filtramos solo los registros de comensales que sigan activos
  const activeRecords = records.filter(r => r.diner && r.diner.active)
  
  return activeRecords
})
