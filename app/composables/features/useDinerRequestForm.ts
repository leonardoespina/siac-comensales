import { ref, computed, watch } from 'vue'
import { useDinerRequestsStore } from '~/stores/dinerRequests'
import { useAuthStore } from '~/stores/auth'
import { useDinersStore } from '~/stores/diners'
import { useDependenciesStore } from '~/stores/dependencies'
import { useSquadsStore } from '~/stores/squads'
import { useMealSchedulesStore } from '~/stores/mealSchedules'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useSettingsStore } from '~/stores/settings'
import { useNotifications } from '~/composables/core/useNotifications'
import dayjs from 'dayjs'

export function useDinerRequestForm() {
  const store = useDinerRequestsStore()
  const authStore = useAuthStore()
  const dinersStore = useDinersStore()
  const dependenciesStore = useDependenciesStore()
  const squadsStore = useSquadsStore()
  const schedulesStore = useMealSchedulesStore()
  const diningRoomsStore = useDiningRoomsStore()
  const settingsStore = useSettingsStore()
  const { notify } = useNotifications()

  const loading = ref(false)
  const isOpen = ref(false)
  const isConfirmOpen = ref(false)
  const isViewMode = ref(false)
  const isEditMode = ref(false)
  const currentBatchCode = ref<string | null>(null)
  const tableFilter = ref('')
  const masterChecks = ref<Record<string, boolean>>({})
  const dinerDiningRooms = ref<Record<string, number | null>>({})

  // Nuevas variables para el modo Masivo (Mara)
  const bulkAuthorizedDinerId = ref<number | null>(null)
  const bulkQuantities = ref<Record<string, number>>({})

  const filters = ref({
    dependencyId: authStore.user?.dependencyId || null as number | null,
    subdependencyId: authStore.user?.subdependencyId || null as number | null,
    squadId: null as number | null,
    date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    diningRoomId: null as number | null,
    observations: ''
  })
  
  const formDateText = ref('')

  const requestSummary = ref({
    date: '',
    shifts: {} as Record<string, number>,
    total: 0
  })
  
  const formatToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const updateDateText = () => {
    formDateText.value = formatToDDMMYYYY(filters.value.date)
  }
  updateDateText()

  watch(() => filters.value.date, () => {
    updateDateText()
  })

  const allowedDates = (dateStr: string) => {
    const isBypass = authStore.user?.role?.permissions?.some(p => 
      p.module.code === 'GLOBAL_ACCESS' && (p.canUpdate || p.canRead)
    )

    // Si el usuario tiene permisos de bypass global (ADMIN), permitimos cualquier fecha (true)
    if (isBypass) return true
    
    // Por petición explícita, SOLO se permite seleccionar EXACTAMENTE el día de mañana (1 día de anticipación)
    const targetDate = dayjs(dateStr, 'YYYY/MM/DD').startOf('day')
    const tomorrow = dayjs().add(1, 'day').startOf('day')
    return targetDate.isSame(tomorrow, 'day')
  }

  // Si cambia el comedor global, asignarlo a todos los comensales actuales como atajo
  watch(() => filters.value.diningRoomId, (newId) => {
    if (isViewMode.value) return
    loadedDiners.value.forEach(d => {
      dinerDiningRooms.value[d.id] = newId
    })
  })

  const activeShifts = computed(() => {
    // Cutoff Engine Logic
    let isBypass = false

    if (!isBypass && authStore.user?.role?.permissions) {
      isBypass = authStore.user.role.permissions.some(p => 
        p.module.code === 'GLOBAL_ACCESS' && (p.canUpdate || p.canRead)
      )
    }

    if (isBypass) {
      return schedulesStore.schedules.filter(s => s.active).map(s => s.shiftType)
    }

    // Normal Cutoff Check
    const start = dayjs(filters.value.date).startOf('day')
    const now = dayjs()
    const diffDays = start.diff(now.startOf('day'), 'day')
    const minDays = settingsStore.minDaysAhead
    const cutoff = settingsStore.cutoffTime

    if (diffDays < minDays) return [] // Completely blocked
    if (diffDays === minDays) {
      const isPastCutoff = (now.hour() > cutoff.hours) || 
                           (now.hour() === cutoff.hours && now.minute() >= cutoff.minutes)
      if (isPastCutoff) return []
    }

    return schedulesStore.schedules.filter(s => s.active).map(s => s.shiftType)
  })

  const selectedSubdep = computed(() => {
    return filteredSubdependencies.value.find(s => s.id === filters.value.subdependencyId)
  })

  const allowsBulkRequests = computed(() => selectedSubdep.value?.allowsBulkRequests === true)

  const gridColumns = computed(() => {
    const baseCols = [
      { name: 'nro', label: 'No.', align: 'left', field: 'id', style: 'width: 50px' },
      { name: 'cedula', label: 'Cédula', align: 'left', field: 'cedula' },
      { name: 'nombre', label: 'Nombre', align: 'left', field: 'name' },
      { name: 'rationType', label: 'Dieta', align: 'left', field: 'rationType' }
    ]

    baseCols.push({ name: 'comedor', label: 'Comedor', align: 'left', field: () => filters.value.diningRoomId ? diningRoomsStore.diningRooms.find(d => d.id === filters.value.diningRoomId)?.name : 'N/A' })
    const shiftCols = activeShifts.value.map(shift => ({
      name: shift,
      label: shift.charAt(0) + shift.slice(1).toLowerCase(),
      align: 'center',
      field: shift
    }))
    // Columna MASIVO: flag individual por comensal (TAKE_AWAY). Se separa en solicitud propia al guardar.
    const masivoCol = { name: 'MASIVO', label: 'Masivo', align: 'center', field: 'MASIVO', headerStyle: 'color: #E65100; font-weight: 700;' }
    return [...baseCols, ...shiftCols, masivoCol] as any[]
  })

  const filteredSquads = computed(() => {
    let availableDiners = dinersStore.diners
    if (filters.value.subdependencyId) {
      availableDiners = availableDiners.filter(d => d.subdependencyId === filters.value.subdependencyId)
    } else if (filters.value.dependencyId) {
      availableDiners = availableDiners.filter(d => d.dependencyId === filters.value.dependencyId)
    }
    const activeSquadIds = new Set(availableDiners.map(d => d.squadId).filter(id => id != null))
    return squadsStore.squads.filter(squad => activeSquadIds.has(squad.id))
  })

  const filteredSubdependencies = computed(() => {
    const targetDepId = filters.value.dependencyId || authStore.user?.dependencyId
    if (!targetDepId) return []
    const dep = dependenciesStore.dependencies.find(d => d.id === targetDepId)
    const allSubs = dep?.subdependencies || []
    
    // Si es SuperAdmin Global: ve todas las subdependencias
    if (authStore.hasPermission('GLOBAL_ACCESS', 'canRead')) {
      return allSubs
    }

    const userSubIds: number[] = authStore.user?.subdependencies?.map((s: any) => s.id) || (authStore.user?.subdependencyId ? [authStore.user.subdependencyId] : [])

    // Si tiene subdependencias asignadas: filtra ÚNICAMENTE sus subdependencias autorizadas
    if (userSubIds.length > 0) {
      return allSubs.filter((s: any) => userSubIds.includes(s.id))
    }

    // Si es Gerente General (sin subdependencias asignadas): ve todas las de su gerencia
    return allSubs
  })

  const isLoadingData = ref(false)

  watch(() => filters.value.dependencyId, () => {
    if (!isLoadingData.value) {
      filters.value.subdependencyId = null
    }
  })

  const loadedDiners = ref<any[]>([])
  const gridState = ref<Record<number, Record<string, boolean>>>({})
  const quantities = ref<Record<number, number>>({})

  const availableProxyDiners = computed(() => {
    if (!filters.value.dependencyId) return []
    // Retorna TODOS los comensales de la gerencia (Dependencia) que tengan huella registrada.
    return dinersStore.diners.filter(d => {
      let depId = d.dependencyId || d.subdependency?.dependencyId
      
      // Si el backend no devolvió el objeto subdependency, lo buscamos en el store global
      if (!depId && d.subdependencyId) {
        for (const dep of dependenciesStore.dependencies) {
          if (dep.subdependencies?.some((sub: any) => sub.id === d.subdependencyId)) {
            depId = dep.id
            break
          }
        }
      }
      
      // Debe pertenecer a la gerencia Y tener un registro biométrico (huella) o legacy (fingerprint)
      return depId === filters.value.dependencyId && (d.biometricRecord || d.fingerprint)
    })
  })

  function swapDiner(oldDinerId: number, newDiner: any) {
    const idx = loadedDiners.value.findIndex(d => d.id === oldDinerId)
    if (idx !== -1) {
      // Transfer states
      gridState.value[newDiner.id] = gridState.value[oldDinerId] || {}
      quantities.value[newDiner.id] = quantities.value[oldDinerId] || 1
      dinerDiningRooms.value[newDiner.id] = dinerDiningRooms.value[oldDinerId]
      
      delete gridState.value[oldDinerId]
      delete quantities.value[oldDinerId]
      delete dinerDiningRooms.value[oldDinerId]

      loadedDiners.value[idx] = { ...newDiner }
    }
  }

  function initGridStateForDiners(diners: any[], shiftTypes: string[]) {
    const newState: Record<number, Record<string, boolean>> = {}
    const newQuants: Record<number, number> = {}
    for (const diner of diners) {
      newState[diner.id] = gridState.value[diner.id] || {}
      newQuants[diner.id] = quantities.value[diner.id] || 1
      for (const shift of shiftTypes) {
        if (newState[diner.id][shift] === undefined) {
          newState[diner.id][shift] = false
        }
      }
      if (newState[diner.id]['MASIVO'] === undefined) {
        newState[diner.id]['MASIVO'] = false
      }
    }
    gridState.value = newState
    quantities.value = newQuants
  }

  function toggleAll(shiftType: string, checked: boolean) {
    for (const diner of loadedDiners.value) {
      if (!gridState.value[diner.id]) gridState.value[diner.id] = {}
      gridState.value[diner.id][shiftType] = checked
    }
  }

  function resetMasterChecks() {
    for (const shift of activeShifts.value) {
      masterChecks.value[shift] = false
    }
    masterChecks.value['MASIVO']     = false
    masterChecks.value['MASIVO_COL'] = false
  }

  function refreshGrid() {
    const targetDep = filters.value.dependencyId
    const targetSubd = filters.value.subdependencyId
    const targetSquad = filters.value.squadId
  
    // Si no hay Dependencia seleccionada y tampoco subdependencia ni cuadrilla, vaciamos
    if (!targetDep && !targetSubd && !targetSquad) {
      loadedDiners.value = []
      return
    }
  
    let filtered = dinersStore.diners

    // Si el usuario no es global y tiene subdependencias asignadas, limitamos a sus subdependencias autorizadas
    const userSubIds: number[] = authStore.user?.subdependencies?.map((s: any) => s.id) || (authStore.user?.subdependencyId ? [authStore.user.subdependencyId] : [])
    if (!authStore.hasPermission('GLOBAL_ACCESS', 'canRead') && userSubIds.length > 0) {
      filtered = filtered.filter(d => userSubIds.includes(d.subdependencyId))
    }

    if (targetSubd) {
      filtered = filtered.filter(d => d.subdependencyId === targetSubd)
    }
    if (targetSquad) {
      filtered = filtered.filter(d => d.squadId === targetSquad)
    }
  
    loadedDiners.value = [...filtered]
    initGridStateForDiners(loadedDiners.value, activeShifts.value)
    resetMasterChecks()
  }

  watch([() => filters.value.subdependencyId, () => filters.value.squadId, () => filters.value.dependencyId], async () => {
    if (isViewMode.value || isLoadingData.value) return

    // Para evitar cargar todos los comensales de la empresa de golpe (lo cual crashearía si hay miles),
    // vamos a buscar al backend específicamente los de la dependencia seleccionada (gerencia completa).
    // Esto es necesario porque el "Retiro Masivo" permite autorizar a CUALQUIER persona de la Gerencia,
    // así que necesitamos tenerlos a todos en el store local.
    if (filters.value.dependencyId) {
      await dinersStore.fetchAll({ dependencyId: filters.value.dependencyId })
    } else {
      dinersStore.diners = []
    }

    refreshGrid()
  })

  function clearForm() {
    const userSubIds: number[] = authStore.user?.subdependencies?.map((s: any) => s.id) || (authStore.user?.subdependencyId ? [authStore.user.subdependencyId] : [])
    filters.value.dependencyId = authStore.user?.dependencyId || null
    // Si tiene exactamente 1 subdependencia la preseleccionamos; si tiene múltiples o es gerente, dejamos null
    filters.value.subdependencyId = userSubIds.length === 1 ? userSubIds[0] : null
    filters.value.squadId = null
    filters.value.diningRoomId = null
    
    // Por regla de negocio, siempre inicializamos en MAÑANA
    filters.value.date = dayjs().add(1, 'day').format('YYYY-MM-DD')
    
    filters.value.observations = ''
    tableFilter.value = ''
    loadedDiners.value = []
    gridState.value = {}
    quantities.value = {}
    dinerDiningRooms.value = {}
    
    // Reset Masivo
    bulkAuthorizedDinerId.value = null
    bulkQuantities.value = {}
    
    // Limpiar checkboxes globales
    resetMasterChecks()
  }

  async function openCreate() {
    clearForm()
    isViewMode.value = false
    isEditMode.value = false
    currentBatchCode.value = null
    isOpen.value = true
    if (filters.value.dependencyId) {
      await dinersStore.fetchAll({ dependencyId: filters.value.dependencyId })
    }
    refreshGrid()
  }

  function loadExistingData(dateGroup: any, editMode: boolean = false) {
    isLoadingData.value = true
    clearForm()
    isViewMode.value = !editMode
    isEditMode.value = editMode
    currentBatchCode.value = dateGroup.id || null
    isOpen.value = true

    const safeDate = typeof dateGroup.date === 'string' && dateGroup.date.includes('T') ? dateGroup.date.split('T')[0] : dateGroup.date
    filters.value.date = safeDate

    const firstReq = dateGroup.originalRequests[0]
    
    // Si queremos sacar la fecha desde firstReq por seguridad:
    const reqDate = typeof firstReq.date === 'string' && firstReq.date.includes('T') ? firstReq.date.split('T')[0] : firstReq.date
    filters.value.date = reqDate ? reqDate : dayjs().format('YYYY-MM-DD')
    
    filters.value.diningRoomId = firstReq.diningRoomId
    
    // Si queremos que los dropdowns superiores (Dependencia/Cuadrilla) tengan sentido,
    // podríamos buscar el diner y usar su dependencia. Pero en modo vista global,
    // es mejor dejar esos filtros vacíos o poner los del usuario creador.
    
    const dinersMap = new Map()
    
    // IMPORTANTE: Filtrar y cargar solo las solicitudes que NO están eliminadas,
    // EXCEPTO si el lote entero está eliminado (modo auditoría para admins).
    const activeRequests = dateGroup.originalRequests.filter((req: any) => req.deletedAt === null)
    const sourceRequests = activeRequests.length > 0 ? activeRequests : dateGroup.originalRequests
    
    sourceRequests.forEach((req: any) => {
      const shift = req.shiftType
      const reqDiningRoomId = req.diningRoomId
      
      req.details?.forEach((d: any) => {
        // Usa el ID del comensal. Si es visitante (sin ID), generamos uno virtual para la fila
        const dinerId = d.dinerId || `EXTRA-${Math.random().toString(36).substr(2, 9)}`
        
        if (!dinersMap.has(dinerId)) {
          dinersMap.set(dinerId, {
            id: dinerId,
            cedula: d.diner?.cedula || 'N/A',
            name: d.diner?.name || 'Visitantes Extraordinarios',
            rationType: d.diner?.rationType || 'Normal',
            // Estos campos podrían no estar si es visitante, pero el grid los lee:
            dependencyId: d.diner?.subdependency?.dependencyId,
            subdependencyId: d.diner?.subdependencyId,
            squadId: d.diner?.squadId
          })
        }
        
        if (!gridState.value[dinerId]) {
          gridState.value[dinerId] = {}
        }
        gridState.value[dinerId][shift] = true
        
        // Cargar el flag de Masivo
        if (d.modality === 'TAKE_AWAY') {
          gridState.value[dinerId]['MASIVO'] = true
          masterChecks.value[shift] = true
          
          // Si la cantidad es > 1, definitivamente es un Retiro Mara (Grupos de Seguridad)
          if (d.quantity > 1) {
            masterChecks.value['MASIVO'] = true
            bulkAuthorizedDinerId.value = dinerId
            bulkQuantities.value[shift] = d.quantity
          }
        } else if (gridState.value[dinerId]['MASIVO'] === undefined) {
          gridState.value[dinerId]['MASIVO'] = false
        }

        quantities.value[dinerId] = d.quantity || 1
        dinerDiningRooms.value[dinerId] = reqDiningRoomId
      })
    })
    
    loadedDiners.value = Array.from(dinersMap.values())
    
    // Auto-completar los selectores de Dependencia y Subdependencia
    if (firstReq && firstReq.targetSubdependency) {
      // Si es un retiro Masivo (o alguien guardA3 la subdependencia destino en la tabla),
      // respetamos esa subdependencia explA-citamente!
      filters.value.dependencyId = firstReq.targetSubdependency.dependencyId || null
      filters.value.subdependencyId = firstReq.targetSubdependency.id || null
    } else if (loadedDiners.value.length > 0) {
      // Fallback a la antigua heurA-stica (primer comensal de la lista)
      const firstDiner = loadedDiners.value.find(d => d.dependencyId)
      if (firstDiner) {
        filters.value.dependencyId = firstDiner.dependencyId || null
        filters.value.subdependencyId = firstDiner.subdependencyId || null
      }
    }
    
    gridState.value = { ...gridState.value } // Forzar actualización reactiva profunda en Vue 3
    isOpen.value = true
    
    // Desactivamos la bandera después de que los watchers asíncronos de Vue se hayan disparado
    setTimeout(() => {
      isLoadingData.value = false
    }, 100)
  }

  function prepareSubmit() {
    if (!filters.value.date) {
      notify.warning('Debe seleccionar la fecha de solicitud')
      return false
    }

    // Reset summary
    requestSummary.value = {
      date: filters.value.date,
      shifts: {},
      total: 0
    }

    if (masterChecks.value['MASIVO']) {
      if (!bulkAuthorizedDinerId.value) {
        notify.warning('Debe seleccionar una persona autorizada para el retiro masivo')
        return false
      }
      for (const shift of activeShifts.value) {
        if (masterChecks.value[shift]) {
          const qty = bulkQuantities.value[shift] || 1
          if (qty < 1) {
            notify.warning(`La cantidad de platos para ${shift} debe ser mayor a 0`)
            return false
          }
          requestSummary.value.shifts[shift] = qty
          requestSummary.value.total += qty
        }
      }
    } else {
      for (const shift of activeShifts.value) {
        const dinersForShift = loadedDiners.value.filter(d => gridState.value[d.id]?.[shift])
        if (dinersForShift.length === 0) continue

        let portions = 0
        for (const d of dinersForShift) {
          portions += (quantities.value[d.id] || 1)
        }
        requestSummary.value.shifts[shift] = portions
        requestSummary.value.total += portions
      }
    }

    if (requestSummary.value.total === 0) {
      notify.warning('Debe seleccionar al menos un plato para realizar la solicitud')
      return false
    }

    isConfirmOpen.value = true
  }

  async function executeSubmit() {

    let datesArray: string[] = [dayjs(filters.value.date).format('YYYY-MM-DD')]

    loading.value = true
    let successCount = 0
    let errorCount = 0

    try {
      const batchCode = `REQ-${dayjs().format('YYMMDD')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      for (const shift of activeShifts.value) {
        let groupsByDiningRoom: Record<string, any[]> = {}
        let missingDiningRoom = false

        if (masterChecks.value['MASIVO']) {
          if (!masterChecks.value[shift]) continue
          
          const dRoomId = filters.value.diningRoomId
          if (!dRoomId) {
            missingDiningRoom = true
          } else {
            const key = `${dRoomId}__TAKE_AWAY`
            groupsByDiningRoom[key] = [{
              id: bulkAuthorizedDinerId.value,
              quantity: bulkQuantities.value[shift] || 1,
              modality: 'TAKE_AWAY'
            }]
          }
        } else {
          const dinersForShift = loadedDiners.value.filter(d => gridState.value[d.id]?.[shift])
          if (dinersForShift.length === 0) continue

          for (const d of dinersForShift) {
            const dRoomId = dinerDiningRooms.value[d.id] || filters.value.diningRoomId
            if (!dRoomId) {
              missingDiningRoom = true
              break
            }
            // Clave compuesta: separa comensales DINE_IN y TAKE_AWAY en requests distintas
            const modality = gridState.value[d.id]?.['MASIVO'] ? 'TAKE_AWAY' : 'DINE_IN'
            const key = `${dRoomId}__${modality}`
            if (!groupsByDiningRoom[key]) groupsByDiningRoom[key] = []
            groupsByDiningRoom[key].push({
              id: d.id,
              quantity: quantities.value[d.id] || 1,
              modality
            })
          }
        }

        if (missingDiningRoom) {
          notify.warning('Hay comensales sin comedor asignado para el turno de ' + shift)
          return false
        }

        for (const key of Object.keys(groupsByDiningRoom)) {
          const [dRoomIdStr, modality] = key.split('__')
          const diners = groupsByDiningRoom[key]
          
          // Asignar un batchCode diferente para separar visualmente en el historial (2 solicitudes)
          const finalBatchCode = modality === 'TAKE_AWAY' ? `${batchCode}-M` : `${batchCode}-N`

          try {
            await store.createRequests({
              dates: datesArray,
              shiftType: shift,
              targetSubdependencyId: filters.value.subdependencyId,
              observations: filters.value.observations || '',
              diningRoomId: parseInt(dRoomIdStr),
              diners: diners,
              batchCode: finalBatchCode
            })
            successCount++
          } catch (e: any) {
            console.error(e)
            notify.error(`Error al procesar el turno ${shift}: ${e.data?.statusMessage || 'Conflicto de fecha o duplicado'}`)
            errorCount++
          }
        }
      }

      if (successCount > 0) {
        notify.success('Solicitudes enviadas exitosamente bajo un código de lote.')
        clearForm()
        isOpen.value = false
        return true
      } else if (errorCount === 0) {
        notify.warning('No seleccionó ningún comensal para ningún turno')
        return false
      }

    } finally {
      loading.value = false
      isConfirmOpen.value = false
    }
    return false
  }

  async function submitUpdate() {
    if (!currentBatchCode.value) return

    const selectedDiners = []
    
    // Recopilar comensales seleccionados independientemente del turno para validación inicial
    for (const diner of loadedDiners.value) {
      if (gridState.value[diner.id]) {
        let hasAnyShift = false
        for (const shift of activeShifts.value) {
          if (gridState.value[diner.id][shift]) {
            hasAnyShift = true
          }
        }
        if (hasAnyShift) {
          selectedDiners.push({
            id: diner.id,
            quantity: quantities.value[diner.id] || 1
          })
        }
      }
    }

    if (masterChecks.value['MASIVO']) {
      if (!bulkAuthorizedDinerId.value) {
        notify.warning('Debe seleccionar una persona autorizada para el retiro masivo')
        return
      }
      for (const shift of activeShifts.value) {
        if (masterChecks.value[shift] && (bulkQuantities.value[shift] || 1) < 1) {
          notify.warning(`La cantidad de platos para ${shift} debe ser mayor a 0`)
          return
        }
      }
    } else {
      if (selectedDiners.length === 0) {
        notify.warning('Debe seleccionar al menos un comensal')
        return
      }
    }

    try {
      loading.value = true
      
      const shiftsPayload = []
      
      if (masterChecks.value['MASIVO']) {
        for (const shift of activeShifts.value) {
          if (masterChecks.value[shift]) {
            shiftsPayload.push({
              shiftType: shift,
              diners: [{
                id: bulkAuthorizedDinerId.value,
                quantity: bulkQuantities.value[shift] || 1,
                modality: 'TAKE_AWAY',
                diningRoomId: filters.value.diningRoomId
              }]
            })
          }
        }
      } else {
        for (const shift of activeShifts.value) {
          const dinersForShift = selectedDiners.filter(d => gridState.value[d.id][shift])
          if (dinersForShift.length === 0) continue

          // Separar en dos grupos: normales (DINE_IN) y masivos (TAKE_AWAY)
          // Cada grupo genera un DinerRequest independiente bajo el mismo batchCode
          const normalDiners = dinersForShift.filter(d => !gridState.value[d.id]['MASIVO'])
          const masivoDiners = dinersForShift.filter(d =>  gridState.value[d.id]['MASIVO'])

          if (normalDiners.length > 0) {
            shiftsPayload.push({
              shiftType: shift,
              diners: normalDiners.map(d => ({
                id: d.id,
                quantity: d.quantity || 1,
                modality: 'DINE_IN',
                diningRoomId: dinerDiningRooms.value[d.id] || filters.value.diningRoomId
              }))
            })
          }
          if (masivoDiners.length > 0) {
            shiftsPayload.push({
              shiftType: shift,
              diners: masivoDiners.map(d => ({
                id: d.id,
                quantity: d.quantity || 1,
                modality: 'TAKE_AWAY',
                diningRoomId: dinerDiningRooms.value[d.id] || filters.value.diningRoomId
              }))
            })
          }
        }
      }

      const formattedDate = dayjs(filters.value.date).format('YYYY-MM-DD')
      
      const payload = {
        dates: [formattedDate],
        targetSubdependencyId: filters.value.subdependencyId,
        diningRoomId: filters.value.diningRoomId,
        shifts: shiftsPayload
      }
      
      await store.updateRequestBatch(currentBatchCode.value, payload)

      notify.success('Solicitud actualizada con éxito')
      isOpen.value = false
      
    } catch (e: any) {
      notify.error(e.data?.message || e.message || 'Error al actualizar')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    filters,
    loadedDiners,
    gridState,
    quantities,
    dinerDiningRooms,
    tableFilter,
    masterChecks,
    formDateText,
    allowedDates,
    activeShifts,
    gridColumns,
    filteredSquads,
    filteredSubdependencies,
    selectedSubdep,
    allowsBulkRequests,
    availableProxyDiners,
    swapDiner,
    toggleAll,
    isOpen,
    isConfirmOpen,
    requestSummary,
    isViewMode,
    isEditMode,
    openCreate,
    loadExistingData,
    prepareSubmit,
    executeSubmit,
    submitUpdate,
    bulkAuthorizedDinerId,
    bulkQuantities
  }
}
