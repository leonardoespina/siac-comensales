import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as diningRoomRepo from '../../repository/diningRoomRepository'

export default defineApiHandler(async (event) => {
  // Solo se requiere estar autenticado para listar comedores base
  // porque se usa en muchos combos.
  return await diningRoomRepo.listAll()
})
