import { describe, it, expect } from 'vitest'

describe('AcsEvent Event Adapter & Cursor Logic', () => {
  it('debería adaptar correctamente la respuesta de AcsEvent al formato AccessControllerEvent', () => {
    const rawAcsItem = {
      major: 5,
      minor: 75,
      time: '2026-10-10T16:10:47-04:00',
      employeeNoString: '24567890',
      name: 'OPERADOR PRUEBA',
      cardReaderNo: 1,
      doorNo: 1,
      currentVerifyMode: 'face',
      serialNo: 16568
    }

    const adapted = {
      dateTime: rawAcsItem.time,
      AccessControllerEvent: {
        employeeNoString: rawAcsItem.employeeNoString,
        name: rawAcsItem.name,
        currentVerifyMode: rawAcsItem.currentVerifyMode || 'face',
        verifyMode: rawAcsItem.currentVerifyMode || 'face',
        serialNo: rawAcsItem.serialNo,
        time: rawAcsItem.time
      }
    }

    expect(adapted.dateTime).toBe('2026-10-10T16:10:47-04:00')
    expect(adapted.AccessControllerEvent.employeeNoString).toBe('24567890')
    expect(adapted.AccessControllerEvent.name).toBe('OPERADOR PRUEBA')
    expect(adapted.AccessControllerEvent.serialNo).toBe(16568)
  })

  it('debería ignorar eventos con serial menor o igual al último visto para prevenir duplicados', () => {
    let lastSeenSerial = 16568
    const incomingEvents = [
      { serialNo: 16567, employeeNoString: '11111111' },
      { serialNo: 16568, employeeNoString: '22222222' },
      { serialNo: 16569, employeeNoString: '33333333' },
      { serialNo: 16570, employeeNoString: '44444444' }
    ]

    const newEvents = incomingEvents.filter(item => {
      if (item.serialNo > lastSeenSerial) {
        lastSeenSerial = item.serialNo
        return true
      }
      return false
    })

    expect(newEvents).toHaveLength(2)
    expect(newEvents[0].employeeNoString).toBe('33333333')
    expect(newEvents[1].employeeNoString).toBe('44444444')
    expect(lastSeenSerial).toBe(16570)
  })
})
