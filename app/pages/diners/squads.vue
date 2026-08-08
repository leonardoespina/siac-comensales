<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSquadsStore } from '~/stores/squads'
import { useDinersStore } from '~/stores/diners'

const squadsStore = useSquadsStore()
const dinersStore = useDinersStore()

// 1. Buscador Global Reactivo
const searchQuery = ref('')

// 2. Definición de Columnas para las Tablas Internas (Mejor práctica UI para +100 registros)
const tableColumns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre Completo', field: 'name', align: 'left', sortable: true },
  { name: 'rationType', label: 'Tipo de Ración', field: 'rationType', align: 'center', sortable: true }
]

// 3. Configuración de Paginación Inicial
const initialPagination = {
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false
}

// 3. Lógica Computada de Agrupación y Filtrado
const workersBySquad = computed(() => {
  const grouped: Record<number, any[]> = {}
  
  // Inicializamos las listas por cuadrilla
  squadsStore.squads.forEach(sq => {
    grouped[sq.id] = []
  })

  const query = searchQuery.value.toLowerCase().trim()

  // Fase de Filtrado y Agrupación Simultánea
  dinersStore.diners.forEach(diner => {
    // Si hay una búsqueda activa, comprobamos si el trabajador coincide (por nombre o cédula)
    if (query) {
      const matchName = diner.name.toLowerCase().includes(query)
      const matchCedula = diner.cedula.toLowerCase().includes(query)
      if (!matchName && !matchCedula) return // Saltamos si no coincide
    }

    if (!grouped[diner.squadId]) grouped[diner.squadId] = []
    grouped[diner.squadId].push(diner)
  })

  // Mapeamos de vuelta al array final, excluyendo cuadrillas vacías
  return squadsStore.squads.map(sq => ({
    ...sq,
    workers: grouped[sq.id] || []
  })).filter(sq => sq.workers.length > 0)
})

onMounted(() => {
  squadsStore.fetchAll()
  dinersStore.fetchAll()
})
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Personal Asignado por Cuadrilla</div>
            <q-space />
            <q-btn color="primary" to="/diners/workers" label="Asignar Personal" icon="person_add" />
          </q-card-section>
          
          <q-card-section>
            <!-- Buscador Global -->
            <div class="row q-mb-md">
              <div class="col-12 col-md-5 offset-md-7">
                <q-input 
                  v-model="searchQuery" 
                  dense 
                  outlined 
                  placeholder="Buscar por cédula o nombre en todas las cuadrillas..." 
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
            </div>

            <div v-if="workersBySquad.length === 0 && !searchQuery" class="text-grey text-center q-pa-lg">
              Aún no tienes trabajadores asignados a ninguna cuadrilla.
              Ve a "Comensales Físicos" para registrarlos y asignarlos.
            </div>
            <div v-else-if="workersBySquad.length === 0 && searchQuery" class="text-grey text-center q-pa-lg">
              No se encontraron trabajadores que coincidan con la búsqueda.
            </div>

            <q-list v-else bordered class="rounded-borders">
              <q-expansion-item
                v-for="squad in workersBySquad"
                :key="squad.id"
                expand-separator
                icon="engineering"
                :label="squad.name"
                :caption="`${squad.workers.length} trabajadores asignados`"
                header-class="text-weight-bold"
                :default-opened="!!searchQuery"
              >
                <q-card>
                  <q-card-section class="q-pa-sm">
                    <!-- Tabla de Alta Densidad para escalabilidad (+100 empleados) -->
                    <q-table
                      :grid="$q.screen.lt.md"
                      :rows="squad.workers"
                      :columns="tableColumns"
                      row-key="id"
                      flat
                      bordered
                      dense
                      :pagination="initialPagination"
                    >
                      <template v-slot:body-cell-rationType="props">
                        <q-td :props="props">
                          <q-badge :color="props.row.rationType === 'NORMAL' ? 'primary' : 'warning'">
                            {{ props.row.rationType === 'NORMAL' ? 'Normal' : 'Dieta Médica' }}
                          </q-badge>
                        </q-td>
                      </template>
                      
                      <!-- MODO MÓVIL (GRID): Micro-tarjeta -->
                      <template v-slot:item="props">
                        <div class="q-pa-xs col-12 col-sm-6">
                          <q-card bordered flat class="bg-grey-1 row items-center justify-between q-pa-sm">
                            <div>
                              <div class="text-weight-bold text-subtitle2" style="line-height: 1.1;">{{ props.row.name }}</div>
                              <div class="text-caption text-grey-8">{{ props.row.cedula }}</div>
                            </div>
                            <q-badge :color="props.row.rationType === 'NORMAL' ? 'primary' : 'warning'">
                              {{ props.row.rationType === 'NORMAL' ? 'Normal' : 'Dieta Médica' }}
                            </q-badge>
                          </q-card>
                        </div>
                      </template>
                    </q-table>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
