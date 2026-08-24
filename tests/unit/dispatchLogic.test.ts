import { describe, it, expect, vi, beforeEach } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

// --- MOCKS ---
// Mockeamos la base de datos para no afectar la DB de desarrollo real
const prismaMock = {
  diner: {
    findUnique: vi.fn(),
  },
  dinerRequestDetail: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  mealSchedule: {
    findMany: vi.fn(),
  }
}

// Emulamos el comportamiento del Handler (Core Logic)
// Extraemos la pura lógica matemática que implementamos en identify.post.ts para testearla aislada
async function testDispatchLogic(
  cedula: string, 
  diningRoomId: number, 
  mockedCurrentTime: string // Hora simulada (Ej: '04:20')
) {
  const diner = await prismaMock.diner.findUnique({ where: { cedula } })
  if (!diner) throw new Error('Comensal no encontrado')

  const requestDetails = await prismaMock.dinerRequestDetail.findMany({ where: { dinerId: diner.id } })
  if (requestDetails.length === 0) throw new Error('El comensal no tiene ninguna solicitud aprobada para hoy.')

  const validRoomRequests = requestDetails.filter((d: any) => d.request.diningRoomId === diningRoomId)
  if (validRoomRequests.length === 0) {
    const wrongRoom = requestDetails[0].request.diningRoom.name
    throw new Error(`Tiene comida asignada, pero en el comedor: ${wrongRoom}. Diríjase a esa ubicación.`)
  }

  const schedules = await prismaMock.mealSchedule.findMany()
  
  let matchedDetail: any = null
  let upcomingShiftMessage = ''

  for (const detail of validRoomRequests) {
    const schedule = schedules.find((s: any) => s.shiftType === detail.request.shiftType)
    if (!schedule) continue

    const start = dayjs(`2026-01-01T${schedule.startTime}:00`)
    const end = dayjs(`2026-01-01T${schedule.endTime}:00`)
    const nowTime = dayjs(`2026-01-01T${mockedCurrentTime}:00`)
    
    let isMatching = false
    
    // Lógica Inclusiva (La que corregimos)
    if (end.isBefore(start)) { // Cruza medianoche
      if (!nowTime.isBefore(start) || !nowTime.isAfter(end)) isMatching = true
    } else { // Normal
      if (!nowTime.isBefore(start) && !nowTime.isAfter(end)) isMatching = true
    }

    if (isMatching) {
      matchedDetail = detail
      break
    } else {
      upcomingShiftMessage += `[${schedule.shiftType}: ${schedule.startTime}-${schedule.endTime}] `
    }
  }

  if (!matchedDetail) {
    throw new Error(`Estás fuera de horario. Tus turnos aprobados son: ${upcomingShiftMessage.trim()}`)
  }

  if (matchedDetail.dispatchedAt) {
    throw new Error(`ALERTA: El comensal ya retiró su comida.`)
  }

  return { success: true, message: 'Despacho Exitoso' }
}

// --- SUITE DE PRUEBAS QA ---
describe('QA-06 & QA-07: Motor Lógico de Despacho (Geografía y Horarios)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Datos Base Simulados
    prismaMock.diner.findUnique.mockResolvedValue({ id: 1, cedula: 'V-1234' })
    prismaMock.mealSchedule.findMany.mockResolvedValue([
      { shiftType: 'DESAYUNO', startTime: '05:30', endTime: '08:30' },
      { shiftType: 'SOBRECENA', startTime: '22:00', endTime: '11:30' }
    ])
  })

  it('QA-06: Debe rechazar el despacho si está en el Comedor Equivocado', async () => {
    prismaMock.dinerRequestDetail.findMany.mockResolvedValue([{
      id: 100,
      request: {
        shiftType: 'DESAYUNO',
        diningRoomId: 2, // Solicitó en comedor 2 (MSB)
        diningRoom: { name: 'Comedor MSB' }
      }
    }])

    // Intenta despachar en comedor 1 (PLC) a las 06:00
    await expect(testDispatchLogic('V-1234', 1, '06:00')).rejects.toThrow(
      'Tiene comida asignada, pero en el comedor: Comedor MSB. Diríjase a esa ubicación.'
    )
  })

  it('QA-07: Debe rechazar si está en el comedor correcto pero fuera de su horario (Ej: Pide DESAYUNO a las 04:20 AM)', async () => {
    prismaMock.dinerRequestDetail.findMany.mockResolvedValue([{
      id: 100,
      request: {
        shiftType: 'DESAYUNO', // Solo tiene Desayuno (05:30 a 08:30)
        diningRoomId: 1, 
        diningRoom: { name: 'Comedor PLC' }
      }
    }])

    // Intenta despachar a las 04:20 AM
    await expect(testDispatchLogic('V-1234', 1, '04:20')).rejects.toThrow(
      'Estás fuera de horario. Tus turnos aprobados son: [DESAYUNO: 05:30-08:30]'
    )
  })

  it('Debe procesar el despacho con ÉXITO si tiene SOBRECENA y viene a las 04:20 AM', async () => {
    prismaMock.dinerRequestDetail.findMany.mockResolvedValue([{
      id: 100,
      request: {
        shiftType: 'SOBRECENA', // Tiene Sobrecena (22:00 a 11:30 am)
        diningRoomId: 1, 
        diningRoom: { name: 'Comedor PLC' }
      }
    }])

    // Intenta despachar a las 04:20 AM (Cae dentro del cruce de medianoche)
    const result = await testDispatchLogic('V-1234', 1, '04:20')
    expect(result.success).toBe(true)
    expect(result.message).toBe('Despacho Exitoso')
  })

  it('QA-05: Debe lanzar alerta de duplicidad si la comida ya fue retirada', async () => {
    prismaMock.dinerRequestDetail.findMany.mockResolvedValue([{
      id: 100,
      dispatchedAt: new Date(), // Ya retiró!
      request: {
        shiftType: 'DESAYUNO',
        diningRoomId: 1, 
        diningRoom: { name: 'Comedor PLC' }
      }
    }])

    await expect(testDispatchLogic('V-1234', 1, '06:00')).rejects.toThrow(
      'ALERTA: El comensal ya retiró su comida.'
    )
  })
})
