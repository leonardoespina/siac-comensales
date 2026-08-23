<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

// State
const cedulaSearch = ref('')
const diningRoomId = ref<number | null>(null)
const observations = ref('')

const loadingSearch = ref(false)
const loadingAssociated = ref(false)
const dispatchingShift = ref<string | null>(null)
const contextData = ref<any>(null)
const associatedDiners = ref<any[]>([])
const filteredDinerOptions = ref<any[]>([])

const searchError = ref('')
const actionMessage = ref('')
const actionError = ref('')
const shifts = ['DESAYUNO', 'ALMUERZO', 'CENA', 'SOBRECENA']

// Dining Rooms
const { data: diningRooms } = useFetch('/api/dining-rooms', {
  transform: (data: any) => data.filter((d: any) => d.active)
})

watch(diningRooms, (rooms) => {
  if (rooms && rooms.length === 1 && !diningRoomId.value) {
    diningRoomId.value = rooms[0].id
  }
}, { immediate: true })

// Load associated diners when diningRoomId changes
const fetchAssociatedDiners = async () => {
  if (!diningRoomId.value) {
    associatedDiners.value = []
    filteredDinerOptions.value = []
    return
  }

  loadingAssociated.value = true
  try {
    const res = await $fetch<any>('/api/dispatch/diner-context', {
      params: { diningRoomId: diningRoomId.value }
    })
    associatedDiners.value = res.diners || []
    filteredDinerOptions.value = associatedDiners.value.map(d => ({
      label: `V-${d.cedula} - ${d.name} (${d.dependencyName})`,
      value: d.cedula,
      diner: d
    }))
  } catch (err) {
    console.error('Error cargando comensales del comedor:', err)
  } finally {
    loadingAssociated.value = false
  }
}

watch(diningRoomId, () => {
  fetchAssociatedDiners()
  contextData.value = null
  cedulaSearch.value = ''
})

const filterDiners = (val: string, update: Function) => {
  if (val === '') {
    update(() => {
      filteredDinerOptions.value = associatedDiners.value.map(d => ({
        label: `V-${d.cedula} - ${d.name} (${d.dependencyName})`,
        value: d.cedula,
        diner: d
      }))
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredDinerOptions.value = associatedDiners.value
      .filter(d => d.cedula.toLowerCase().includes(needle) || d.name.toLowerCase().includes(needle))
      .map(d => ({
        label: `V-${d.cedula} - ${d.name} (${d.dependencyName})`,
        value: d.cedula,
        diner: d
      }))
  })
}

const selectDiner = (dinerCedula: string) => {
  cedulaSearch.value = dinerCedula
  onSearch()
}

const onSearch = async () => {
  if (!cedulaSearch.value) return

  loadingSearch.value = true
  searchError.value = ''
  actionMessage.value = ''
  actionError.value = ''
  contextData.value = null

  try {
    const res = await $fetch('/api/dispatch/diner-context', {
      params: { cedula: cedulaSearch.value }
    })
    contextData.value = res
  } catch (err: any) {
    searchError.value = err.data?.statusMessage || err.message || 'Error desconocido'
  } finally {
    loadingSearch.value = false
  }
}

const onDispatch = async (shift: string) => {
  if (!diningRoomId.value) {
    actionError.value = 'Debe seleccionar un Comedor en la parte superior.'
    return
  }

  dispatchingShift.value = shift
  actionMessage.value = ''
  actionError.value = ''

  try {
    const res = await $fetch('/api/dispatch/assisted', {
      method: 'POST',
      body: {
        cedula: cedulaSearch.value,
        shiftType: shift,
        diningRoomId: diningRoomId.value,
        observations: observations.value
      }
    })
    
    actionMessage.value = res.message
    
    // Refresh context silently and reload associated list
    const refreshRes = await $fetch('/api/dispatch/diner-context', {
      params: { cedula: cedulaSearch.value }
    })
    contextData.value = refreshRes
    observations.value = ''
    await fetchAssociatedDiners()
    
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Error desconocido'
  } finally {
    dispatchingShift.value = null
  }
}

const getShiftStatus = (shift: string) => {
  if (!contextData.value) return { code: 'NONE', label: 'Sin solicitud', color: 'grey-5', icon: 'remove_circle_outline' }
  
  const req = contextData.value.requests.find((r: any) => r.request.shiftType === shift)
  if (!req) return { code: 'NONE', label: 'Sin solicitud', color: 'grey-5', icon: 'help_outline' }
  
  if (req.dispatchedAt) {
    const time = new Date(req.dispatchedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    return { code: 'DISPATCHED', label: `Retirado (${time})`, color: 'positive', icon: 'check_circle' }
  }
  
  return { code: 'PENDING', label: 'Pendiente', color: 'warning', icon: 'pending_actions' }
}
</script>

<template>
  <q-page padding class="bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-md-10 col-lg-8">
        
        <!-- Header -->
        <div class="row items-center q-mb-md q-gutter-md">
          <q-icon name="support_agent" size="lg" color="primary" />
          <div class="text-h5 text-primary text-weight-bold">Panel de Despacho Asistido</div>
          <q-space />
          <q-select
            v-model="diningRoomId"
            :options="diningRooms"
            option-value="id"
            :option-label="d => d.site?.name ? `${d.name} — Sede ${d.site.name}` : d.name"
            emit-value
            map-options
            label="Sede / Comedor de Operación *"
            outlined
            dense
            bg-color="white"
            style="min-width: 280px"
            :disable="diningRooms?.length === 1"
          >
            <template v-slot:prepend>
              <q-icon name="storefront" />
            </template>
          </q-select>
        </div>

        <q-banner v-if="!diningRoomId" class="bg-amber-2 text-amber-10 q-mb-md rounded-borders">
          <template v-slot:avatar>
            <q-icon name="warning" color="amber-10" />
          </template>
          Seleccione un Comedor de Operación en la esquina superior derecha para poder despachar.
        </q-banner>

        <q-card class="shadow-2 q-mb-lg rounded-borders">
          <q-card-section>
            <form @submit.prevent="onSearch" class="row q-col-gutter-md items-center">
              <div class="col-12 col-sm-8 col-md-9">
                <q-select
                  v-model="cedulaSearch"
                  :options="filteredDinerOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  use-input
                  hide-selected
                  fill-input
                  input-debounce="300"
                  @filter="filterDiners"
                  @update:model-value="onSearch"
                  label="Buscar por Cédula o Nombre del Comensal *"
                  outlined
                  dense
                  bg-color="white"
                  :loading="loadingSearch || loadingAssociated"
                  hint="Escriba la cédula/nombre o seleccione de la lista del comedor"
                >
                  <template v-slot:prepend>
                    <q-icon name="person_search" color="primary" />
                  </template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ diningRoomId ? 'No hay comensales encontrados para la búsqueda' : 'Seleccione un Comedor de Operación primero' }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-sm-4 col-md-3">
                <q-btn
                  label="Buscar"
                  color="primary"
                  icon="search"
                  type="submit"
                  class="full-width"
                  size="md"
                  :disable="!cedulaSearch"
                />
              </div>
            </form>

            <!-- Acceso Rápido: Comensales Asignados Hoy en este Comedor -->
            <div v-if="diningRoomId && associatedDiners.length > 0" class="q-mt-md">
              <div class="text-caption text-grey-8 q-mb-xs row items-center">
                <q-icon name="groups" class="q-mr-xs" color="primary" />
                <span>Comensales asociados hoy a este comedor ({{ associatedDiners.length }}):</span>
              </div>
              <div class="row q-gutter-xs">
                <q-chip
                  v-for="diner in associatedDiners.slice(0, 8)"
                  :key="diner.id"
                  clickable
                  color="blue-1"
                  text-color="primary"
                  icon="person"
                  size="sm"
                  @click="selectDiner(diner.cedula)"
                >
                  {{ diner.name.split(' ')[0] }} ({{ diner.cedula }})
                </q-chip>
                <q-chip v-if="associatedDiners.length > 8" size="sm" color="grey-3" text-color="grey-8">
                  +{{ associatedDiners.length - 8 }} más
                </q-chip>
              </div>
            </div>

            <q-banner v-if="searchError" class="bg-negative text-white q-mt-md rounded-borders">
              <template v-slot:avatar>
                <q-icon name="error" />
              </template>
              {{ searchError }}
            </q-banner>
          </q-card-section>

          <!-- Diner Context Data -->
          <q-card v-if="contextData" class="q-mt-md shadow-4 rounded-borders">
          <q-card-section class="bg-blue-grey-9 text-white row items-center">
            <q-avatar size="64px" color="blue-grey-7" class="q-mr-md shadow-2">
              <q-icon name="person" size="lg" />
            </q-avatar>
            <div>
              <div class="text-h5 text-weight-bold">{{ contextData.diner.name }}</div>
              <div class="text-subtitle1 text-blue-grey-2">C.I: {{ contextData.diner.cedula }}</div>
            </div>
          </q-card-section>
          
          <q-card-section class="q-pt-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-list bordered separator class="rounded-borders">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="corporate_fare" color="grey-7" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>Dependencia</q-item-label>
                      <q-item-label>{{ contextData.diner.subdependency?.dependency?.name || 'N/A' }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="schema" color="grey-7" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>Subdependencia</q-item-label>
                      <q-item-label>{{ contextData.diner.subdependency?.name || 'N/A' }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="restaurant_menu" color="grey-7" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>Tipo de Dieta</q-item-label>
                      <q-item-label class="text-weight-bold">{{ contextData.diner.rationType }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <!-- Shifts Radar -->
              <div class="col-12 col-sm-6">
                <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm">
                  <q-icon name="radar" size="sm" class="q-mr-xs" /> Radar de Turnos (Hoy)
                </div>
                
                <q-banner v-if="actionMessage" class="bg-positive text-white q-mb-md rounded-borders dense">
                  <q-icon name="check_circle" class="q-mr-sm" /> {{ actionMessage }}
                </q-banner>
                
                <q-banner v-if="actionError" class="bg-negative text-white q-mb-md rounded-borders dense">
                  <q-icon name="error" class="q-mr-sm" /> {{ actionError }}
                </q-banner>

                <q-list bordered separator class="rounded-borders">
                  <q-item v-for="shift in shifts" :key="shift" class="q-py-sm">
                    <q-item-section>
                      <q-item-label class="text-weight-medium">{{ shift }}</q-item-label>
                      <q-item-label caption>
                        <q-chip :color="getShiftStatus(shift).color" text-color="white" size="sm" class="q-ml-none">
                          <q-icon :name="getShiftStatus(shift).icon" size="xs" class="q-mr-xs" />
                          {{ getShiftStatus(shift).label }}
                        </q-chip>
                      </q-item-label>
                    </q-item-section>

                    <q-item-section side>
                      <q-btn
                        v-if="getShiftStatus(shift).code !== 'DISPATCHED'"
                        :label="getShiftStatus(shift).code === 'NONE' ? 'Forzar Despacho' : 'Despachar'"
                        :color="getShiftStatus(shift).code === 'NONE' ? 'grey-8' : 'primary'"
                        :icon="getShiftStatus(shift).code === 'NONE' ? 'warning' : 'send'"
                        size="sm"
                        :loading="dispatchingShift === shift"
                        :disable="!diningRoomId || dispatchingShift !== null"
                        @click="onDispatch(shift)"
                      />
                      <q-btn
                        v-else
                        icon="done_all"
                        color="positive"
                        flat
                        round
                        dense
                        disable
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
                
                <div class="q-mt-md" v-if="shifts.some(s => getShiftStatus(s).code === 'NONE')">
                  <q-input
                    v-model="observations"
                    label="Nota (Para despachos forzados)"
                    outlined
                    dense
                    bg-color="white"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
          </q-card>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
