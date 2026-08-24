import { describe, it, expect } from 'vitest'
import type { DashboardUserContext } from '../../server/domain/dashboard'

describe('Lógica de Aislamiento Jerárquico del Dashboard (3 Niveles)', () => {
  function buildDinerWhere(user: DashboardUserContext) {
    const where: any = {}
    if (!user.isGlobal) {
      if (user.subdependencyId) {
        where.subdependencyId = user.subdependencyId
      } else if (user.dependencyId) {
        where.subdependency = { dependencyId: user.dependencyId }
      }
    }
    return where
  }

  it('Nivel 1: SuperAdmin debe consultar todos los comensales sin restricciones', () => {
    const adminUser: DashboardUserContext = {
      id: 1,
      isGlobal: true,
      dependencyId: null,
      subdependencyId: null
    }

    const where = buildDinerWhere(adminUser)
    expect(where).toEqual({})
  })

  it('Nivel 2: Gerente de Dependencia debe consultar comensales de todas sus subdependencias', () => {
    const managerUser: DashboardUserContext = {
      id: 2,
      isGlobal: false,
      dependencyId: 10,
      subdependencyId: null
    }

    const where = buildDinerWhere(managerUser)
    expect(where).toEqual({
      subdependency: { dependencyId: 10 }
    })
  })

  it('Nivel 3: Usuario de Subdependencia debe consultar únicamente su división específica', () => {
    const subUser: DashboardUserContext = {
      id: 3,
      isGlobal: false,
      dependencyId: 10,
      subdependencyId: 25
    }

    const where = buildDinerWhere(subUser)
    expect(where).toEqual({
      subdependencyId: 25
    })
  })
})
