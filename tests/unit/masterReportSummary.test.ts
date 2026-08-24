import { describe, it, expect } from 'vitest'

function summaryCounts(rows: Array<{ servicio: string; modalidad: string; rationType?: string; quantity?: number }>) {
  const counts = { desayuno: 0, almuerzo: 0, cena: 0, sobrecena: 0, dieta: 0, total: 0 }
  for (const row of rows) {
    const qty = row.quantity || 1
    if      (row.servicio === 'DESAYUNO')  counts.desayuno  += qty
    else if (row.servicio === 'ALMUERZO')  counts.almuerzo  += qty
    else if (row.servicio === 'CENA')      counts.cena      += qty
    else if (row.servicio === 'SOBRECENA') counts.sobrecena += qty
    if      (row.rationType === 'DIETA')  counts.dieta     += qty
    counts.total += qty
  }
  return counts
}

describe('summaryCounts — Tarjetas de resumen del Reporte Maestro', () => {

  it('devuelve todos los contadores en 0 cuando no hay filas', () => {
    expect(summaryCounts([])).toEqual({ desayuno: 0, almuerzo: 0, cena: 0, sobrecena: 0, dieta: 0, total: 0 })
  })

  it('DESAYUNO BANDEJA NORMAL no suma en dieta', () => {
    const rows = [{ servicio: 'DESAYUNO', modalidad: 'BANDEJA', rationType: 'NORMAL', quantity: 1 }]
    const r = summaryCounts(rows)
    expect(r.desayuno).toBe(1)
    expect(r.dieta).toBe(0)
    expect(r.total).toBe(1)
  })

  it('ALMUERZO BANDEJA DIETA si suma en dieta', () => {
    const rows = [{ servicio: 'ALMUERZO', modalidad: 'BANDEJA', rationType: 'DIETA', quantity: 1 }]
    const r = summaryCounts(rows)
    expect(r.almuerzo).toBe(1)
    expect(r.dieta).toBe(1)
    expect(r.total).toBe(1)
  })

  it('CENA PARA LLEVAR NORMAL NO suma en dieta (modalidad no determina dieta)', () => {
    const rows = [{ servicio: 'CENA', modalidad: 'PARA LLEVAR', rationType: 'NORMAL', quantity: 1 }]
    const r = summaryCounts(rows)
    expect(r.cena).toBe(1)
    expect(r.dieta).toBe(0)
  })

  it('CENA PARA LLEVAR DIETA suma en dieta Y en cena', () => {
    const rows = [{ servicio: 'CENA', modalidad: 'PARA LLEVAR', rationType: 'DIETA', quantity: 1 }]
    const r = summaryCounts(rows)
    expect(r.cena).toBe(1)
    expect(r.dieta).toBe(1)
    expect(r.total).toBe(1)
  })

  it('acumula quantity correctamente en dieta (lotes)', () => {
    const rows = [{ servicio: 'ALMUERZO', modalidad: 'BANDEJA', rationType: 'DIETA', quantity: 4 }]
    const r = summaryCounts(rows)
    expect(r.dieta).toBe(4)
    expect(r.total).toBe(4)
  })

  it('caso real: 2 comensales con dieta visible en el contador', () => {
    const rows = [
      { servicio: 'ALMUERZO', modalidad: 'BANDEJA',      rationType: 'DIETA',   quantity: 1 },
      { servicio: 'ALMUERZO', modalidad: 'PARA LLEVAR', rationType: 'DIETA',   quantity: 1 },
      { servicio: 'ALMUERZO', modalidad: 'BANDEJA',      rationType: 'NORMAL',  quantity: 8 },
    ]
    const r = summaryCounts(rows)
    expect(r.dieta).toBe(2)
    expect(r.almuerzo).toBe(10)
    expect(r.total).toBe(10)
  })

  it('caso real: mix completo de un dia tipico de operacion', () => {
    const rows = [
      { servicio: 'DESAYUNO',  modalidad: 'BANDEJA',      rationType: 'NORMAL', quantity: 10 },
      { servicio: 'DESAYUNO',  modalidad: 'BANDEJA',      rationType: 'DIETA',  quantity: 2  },
      { servicio: 'ALMUERZO',  modalidad: 'BANDEJA',      rationType: 'NORMAL', quantity: 20 },
      { servicio: 'ALMUERZO',  modalidad: 'PARA LLEVAR', rationType: 'DIETA',  quantity: 5  },
      { servicio: 'CENA',      modalidad: 'BANDEJA',      rationType: 'NORMAL', quantity: 8  },
      { servicio: 'SOBRECENA', modalidad: 'BANDEJA',      rationType: 'NORMAL', quantity: 4  },
    ]
    const r = summaryCounts(rows)
    expect(r.desayuno).toBe(12)
    expect(r.almuerzo).toBe(25)
    expect(r.cena).toBe(8)
    expect(r.sobrecena).toBe(4)
    expect(r.dieta).toBe(7)
    expect(r.total).toBe(49)
  })
})
