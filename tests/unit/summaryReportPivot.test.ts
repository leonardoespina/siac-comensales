import { describe, it, expect } from 'vitest'

function aggregateSummaryRows(
  items: Array<{ depName: string; subdepName: string; shiftType: string; quantity: number }>,
  groupBy: 'DEPENDENCY' | 'SUBDEPENDENCY'
) {
  const map = new Map<string, {
    name: string
    dependencyName?: string
    desayuno: number
    almuerzo: number
    cena: number
    sobrecena: number
    total: number
  }>()

  for (const item of items) {
    const name = groupBy === 'SUBDEPENDENCY' ? item.subdepName : item.depName
    const key = groupBy === 'SUBDEPENDENCY' ? `${item.depName}_${item.subdepName}` : item.depName

    if (!map.has(key)) {
      map.set(key, {
        name,
        ...(groupBy === 'SUBDEPENDENCY' ? { dependencyName: item.depName } : {}),
        desayuno: 0,
        almuerzo: 0,
        cena: 0,
        sobrecena: 0,
        total: 0
      })
    }

    const row = map.get(key)!
    const qty = item.quantity

    if (item.shiftType === 'DESAYUNO') row.desayuno += qty
    else if (item.shiftType === 'ALMUERZO') row.almuerzo += qty
    else if (item.shiftType === 'CENA') row.cena += qty
    else if (item.shiftType === 'SOBRECENA') row.sobrecena += qty

    row.total += qty
  }

  const rows = Array.from(map.values())
  const totals = { desayuno: 0, almuerzo: 0, cena: 0, sobrecena: 0, grandTotal: 0 }

  for (const r of rows) {
    totals.desayuno += r.desayuno
    totals.almuerzo += r.almuerzo
    totals.cena += r.cena
    totals.sobrecena += r.sobrecena
    totals.grandTotal += r.total
  }

  return { rows, totals }
}

describe('aggregateSummaryRows — Pivoteo matricial por Gerencia y Subdependencia', () => {
  it('devuelve resultado vacio si no hay consumos', () => {
    const res = aggregateSummaryRows([], 'DEPENDENCY')
    expect(res.rows).toHaveLength(0)
    expect(res.totals.grandTotal).toBe(0)
  })

  it('agrupa correctamente por Dependencia sumando todos los turnos', () => {
    const items = [
      { depName: 'GERENCIA A', subdepName: 'SUB 1', shiftType: 'DESAYUNO', quantity: 10 },
      { depName: 'GERENCIA A', subdepName: 'SUB 2', shiftType: 'ALMUERZO', quantity: 15 },
      { depName: 'GERENCIA B', subdepName: 'SUB 3', shiftType: 'CENA', quantity: 5 }
    ]

    const res = aggregateSummaryRows(items, 'DEPENDENCY')
    expect(res.rows).toHaveLength(2)

    const gerA = res.rows.find(r => r.name === 'GERENCIA A')
    expect(gerA).toBeDefined()
    expect(gerA?.desayuno).toBe(10)
    expect(gerA?.almuerzo).toBe(15)
    expect(gerA?.total).toBe(25)

    expect(res.totals.grandTotal).toBe(30)
  })

  it('agrupa correctamente por Subdependencia manteniendo la gerencia padre', () => {
    const items = [
      { depName: 'GERENCIA A', subdepName: 'SUB 1', shiftType: 'DESAYUNO', quantity: 10 },
      { depName: 'GERENCIA A', subdepName: 'SUB 2', shiftType: 'ALMUERZO', quantity: 15 }
    ]

    const res = aggregateSummaryRows(items, 'SUBDEPENDENCY')
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0].dependencyName).toBe('GERENCIA A')
    expect(res.rows[0].name).toBe('SUB 1')
  })
})
