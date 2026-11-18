import { ref, computed, watch } from 'vue'
import { useDinerRequestsStore } from '~/stores/dinerRequests'
import { useAuthStore } from '~/stores/auth'
import { useSitesStore } from '~/stores/sites'
import { useDependenciesStore } from '~/stores/dependencies'
import { useNotifications } from '~/composables/core/useNotifications'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'

export function useDinerRequestHistory() {
  const store = useDinerRequestsStore()
  const authStore = useAuthStore()
  const sitesStore = useSitesStore()
  const dependenciesStore = useDependenciesStore()
  const { notify } = useNotifications()
  const $q = useQuasar()

  const filterStartDate = ref(dayjs().format('YYYY-MM-DD'))
  const filterEndDate = ref(dayjs().add(1, 'day').format('YYYY-MM-DD'))
  
  const isGlobalAdmin = computed(() => authStore.hasPermission('GLOBAL_ACCESS', 'canRead') && !authStore.user?.dependencyId)

  // Si el usuario tiene exactamente 1 sede autorizada, se preselecciona automáticamente
  const initialSiteId = (!authStore.hasPermission('GLOBAL_ACCESS', 'canRead') && authStore.user?.sites?.length === 1)
    ? authStore.user.sites[0].id
    : null
  const selectedSiteId = ref<number | null>(initialSiteId)

  // Preselección de Gerencia (Dependencia) y Subdependencia según lo que tenga permitido el usuario
  const userSubIds = computed<number[]>(() => {
    if (authStore.user?.subdependencies && authStore.user.subdependencies.length > 0) {
      return authStore.user.subdependencies.map((s: any) => s.id)
    }
    if (authStore.user?.subdependencyId) {
      return [authStore.user.subdependencyId]
    }
    return []
  })

  const initialDependencyId = authStore.user?.dependencyId || null
  const initialSubdependencyId = userSubIds.value.length === 1 ? userSubIds.value[0] : null

  const selectedDependencyId = ref<number | null>(initialDependencyId)
  const selectedSubdependencyId = ref<number | null>(initialSubdependencyId)

  const dependenciesOptions = computed(() => {
    const allActive = dependenciesStore.dependencies
      .filter((d: any) => d.active !== false)
      .map((d: any) => ({ label: d.name, value: d.id }))

    if (authStore.user?.dependencyId) {
      return allActive.filter((d: any) => d.value === authStore.user?.dependencyId)
    }
    return [{ label: 'Todas las Gerencias', value: null }, ...allActive]
  })

  const subdependenciesOptions = computed(() => {
    const targetDepId = selectedDependencyId.value || authStore.user?.dependencyId
    let availableSubs: any[] = []

    if (targetDepId) {
      const dep = dependenciesStore.dependencies.find((d: any) => d.id === targetDepId)
      availableSubs = (dep?.subdependencies || []).filter((s: any) => s.active !== false)
    } else {
      for (const dep of dependenciesStore.dependencies) {
        if (dep.active === false) continue
        for (const sub of dep.subdependencies || []) {
          if (sub.active !== false) availableSubs.push(sub)
        }
      }
    }

    // Si el usuario está casado con subdependencias específicas, solo mostrar las autorizadas
    if (!isGlobalAdmin.value && userSubIds.value.length > 0) {
      availableSubs = availableSubs.filter((s: any) => userSubIds.value.includes(s.id))
    }

    const mapped = availableSubs.map((s: any) => ({ label: s.name, value: s.id }))

    if (!isGlobalAdmin.value && userSubIds.value.length === 1 && mapped.length === 1) {
      return mapped
    }

    const allLabel = userSubIds.value.length > 1 ? 'Todas mis Subdependencias' : 'Todas las Subdependencias'
    return [{ label: allLabel, value: null }, ...mapped]
  })

  watch(selectedDependencyId, () => {
    if (!isGlobalAdmin.value && userSubIds.value.length === 1) {
      selectedSubdependencyId.value = userSubIds.value[0]
    } else {
      selectedSubdependencyId.value = null
    }
  })

  const sitesOptions = computed(() => {
    if (authStore.hasPermission('GLOBAL_ACCESS', 'canRead') || !authStore.user?.sites || authStore.user.sites.length === 0) {
      const allActive = sitesStore.sites
        .filter((s: any) => s.active !== false)
        .map((s: any) => ({ label: s.name, value: s.id }))
      return [{ label: 'Todas las Sedes', value: null }, ...allActive]
    }

    const userSites = authStore.user.sites.map((s: any) => ({ label: s.name, value: s.id }))
    if (userSites.length > 1) {
      return [{ label: 'Todas mis Sedes', value: null }, ...userSites]
    }
    return userSites
  })

  const historyColumns = [
    { name: 'batchCode', label: 'Lote / Solicitud', align: 'left', field: (row: any) => row.batchCode || row.id, sortable: true },
    { name: 'date', label: 'Fecha', align: 'left', field: (row: any) => formatDate(row.date), sortable: true },
    { name: 'subdependency', label: 'Subdependencia / Gerencia', align: 'left', field: 'subdependencyName', sortable: true },
    { name: 'shiftType', label: 'Turnos', align: 'left', field: (row: any) => row.shiftTypes.join(', ') },
    { name: 'diningRoom', label: 'Comedor', align: 'left', field: 'diningRoom' },
    { name: 'status', label: 'Estado', align: 'center', field: 'status' },
    { name: 'details', label: 'Total Platos', align: 'center', field: 'totalDiners' },
    { name: 'actions', label: 'Acciones', align: 'right' }
  ]

  function resolveSubdependencyMeta(req: any): { subId: number | null; subName: string; depId: number | null; depName: string } {
    if (req.targetSubdependency?.name) {
      return {
        subId: req.targetSubdependency.id || null,
        subName: req.targetSubdependency.name,
        depId: req.targetSubdependency.dependencyId || req.targetSubdependency.dependency?.id || null,
        depName: req.targetSubdependency.dependency?.name || ''
      }
    }

    const firstDinerSub = req.details?.find((d: any) => d.diner?.subdependency?.name)?.diner?.subdependency
    if (firstDinerSub) {
      return {
        subId: firstDinerSub.id || null,
        subName: firstDinerSub.name,
        depId: firstDinerSub.dependencyId || firstDinerSub.dependency?.id || null,
        depName: firstDinerSub.dependency?.name || ''
      }
    }

    const rawSubId = req.targetSubdependencyId || req.details?.[0]?.diner?.subdependencyId || null
    if (rawSubId) {
      for (const dep of dependenciesStore.dependencies) {
        const foundSub = dep.subdependencies?.find((s: any) => s.id === rawSubId)
        if (foundSub) {
          return {
            subId: foundSub.id,
            subName: foundSub.name,
            depId: dep.id,
            depName: dep.name
          }
        }
      }
    }

    return { subId: null, subName: 'N/A', depId: null, depName: '' }
  }

  const groupedRequests = computed(() => {
    const groups: Record<string, any> = {}
    
    store.requests.forEach(req => {
      const dateStr = typeof req.date === 'string' ? req.date : req.date.toISOString()
      const safeDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
      const batch = req.batchCode || `SINGLE-${req.id}`
      
      // Agrupamos individualmente por Día + Lote para permitir edición y cancelación independiente por fecha
      const key = `${batch}__${safeDate}`
      
      if (!groups[key]) {
        const dRoomLabel = req.diningRoom?.name 
          ? (req.diningRoom.site?.name ? `${req.diningRoom.name} (${req.diningRoom.site.name})` : req.diningRoom.name)
          : 'N/A'
        const meta = resolveSubdependencyMeta(req)
        groups[key] = {
          id: key,
          batchCode: req.batchCode || key,
          date: safeDate,
          subdependencyId: meta.subId,
          subdependencyName: meta.subName,
          dependencyId: meta.depId,
          dependencyName: meta.depName,
          shiftTypes: [],
          diningRoom: dRoomLabel,
          status: req.status,
          isDeleted: false,
          totalDiners: 0,
          rawIds: [],
          originalRequests: []
        }
      }
      
      groups[key].originalRequests.push(req)
      groups[key].rawIds.push(req.id)
    })

    const finalGroups = Object.values(groups)

    finalGroups.forEach((group: any) => {
      const activeReqs = group.originalRequests.filter((r: any) => r.deletedAt === null)
      group.isDeleted = activeReqs.length === 0
      
      // La fuente de la verdad para total y turnos son las peticiones vivas.
      // Si el lote está completamente eliminado, usamos el historial para mostrar qué contenía antes de morir.
      const sourceReqs = group.isDeleted ? group.originalRequests : activeReqs
      
      group.shiftTypes = Array.from(new Set(sourceReqs.map((r: any) => r.shiftType)))
      
      const diningRooms = Array.from(new Set(sourceReqs.map((r: any) => {
        if (!r.diningRoom?.name) return null
        return r.diningRoom.site?.name ? `${r.diningRoom.name} (${r.diningRoom.site.name})` : r.diningRoom.name
      }).filter(Boolean)))
      group.diningRoom = diningRooms.length > 0 ? diningRooms.join(', ') : (group.diningRoom || 'N/A')

      // Resolver nombres de subdependencia consolidados del grupo
      const subLabels = new Set<string>()
      const depLabels = new Set<string>()
      const subIdSet = new Set<number>()
      const depIdSet = new Set<number>()

      for (const r of sourceReqs) {
        const m = resolveSubdependencyMeta(r)
        if (m.subName && m.subName !== 'N/A') subLabels.add(m.subName)
        if (m.depName) depLabels.add(m.depName)
        if (m.subId) subIdSet.add(m.subId)
        if (m.depId) depIdSet.add(m.depId)
      }

      if (subLabels.size > 0) group.subdependencyName = Array.from(subLabels).join(', ')
      if (depLabels.size > 0) group.dependencyName = Array.from(depLabels).join(', ')
      group.subdependencyIds = Array.from(subIdSet)
      group.dependencyIds = Array.from(depIdSet)

      group.totalDiners = sourceReqs.reduce((sum: number, r: any) => {
        return sum + (r.details?.reduce((acc: number, d: any) => acc + (d.quantity || 1), 0) || 0)
      }, 0)

      if (group.isDeleted) {
        group.status = 'DELETED'
      } else {
        group.status = activeReqs[0]?.status || 'PENDING'
      }
    })

    // Filtrado reactivo instantáneo por Gerencia y Subdependencia seleccionada
    const filteredGroups = finalGroups.filter((group: any) => {
      if (selectedSubdependencyId.value) {
        return group.subdependencyId === selectedSubdependencyId.value ||
               (group.subdependencyIds && group.subdependencyIds.includes(selectedSubdependencyId.value))
      }
      if (selectedDependencyId.value) {
        return group.dependencyId === selectedDependencyId.value ||
               (group.dependencyIds && group.dependencyIds.includes(selectedDependencyId.value))
      }
      return true
    })

    return filteredGroups.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  async function loadData() {
    await store.fetchRequests(
      filterStartDate.value,
      filterEndDate.value,
      selectedSiteId.value,
      selectedDependencyId.value,
      selectedSubdependencyId.value
    )
  }

  function confirmDelete(row: any) {
    $q.dialog({
      title: 'Confirmar Baja de Solicitud',
      message: `¿Está seguro que desea cancelar la solicitud del día ${formatDate(row.date)} para ${row.shiftTypes.join(', ')}? Esta acción cancelará ${row.originalRequests.length} peticiones de esta fecha.`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.deleteRequestsBulk(row.rawIds)
        notify.success(`Solicitud del día ${formatDate(row.date)} cancelada exitosamente`)
      } catch (e: any) {
        notify.error(e.data?.statusMessage || 'Error al cancelar. Recuerde la hora límite.')
      }
    })
  }

  function formatDate(d: any) {
    // Si la fecha viene del backend como ISO String (ej. 2026-08-17T00:00:00.000Z), extraemos solo la parte YYYY-MM-DD
    // para evitar que el ajuste de zona horaria local lo mueva al día anterior.
    const dateStr = typeof d === 'string' ? d : d.toISOString()
    const safeDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    return dayjs(safeDate).format('DD/MM/YYYY')
  }

  return {
    filterStartDate,
    filterEndDate,
    selectedSiteId,
    sitesOptions,
    selectedDependencyId,
    selectedSubdependencyId,
    dependenciesOptions,
    subdependenciesOptions,
    historyColumns,
    groupedRequests,
    loadData,
    confirmDelete,
    formatDate
  }
}
