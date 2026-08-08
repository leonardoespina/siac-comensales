<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDependenciesStore } from '~/stores/dependencies'
import { useAuthStore } from '~/stores/auth'
import { useDependenciesForm } from '~/composables/features/useDependenciesForm'

const store = useDependenciesStore()
const authStore = useAuthStore()

// Verificación de Permisos Granulares
const canCreate = computed(() => authStore.hasPermission('DEPENDENCIES', 'canCreate'))
const canUpdate = computed(() => authStore.hasPermission('DEPENDENCIES', 'canUpdate'))
const canDelete = computed(() => authStore.hasPermission('DEPENDENCIES', 'canDelete'))

// Lógica extraída al composable para mantener el componente limpio y cumplir la regla de <= 3 refs
const {
  showDepDialog,
  isEditingDep,
  depName,
  showSubDialog,
  isEditingSub,
  formDataSub,
  filterText,
  openCreateDep,
  openEditDep,
  openCreateSub,
  openEditSub,
  submitDependency,
  submitSubdependency,
  confirmDeleteDep,
  confirmDeleteSub
} = useDependenciesForm()

const depOptions = computed(() => {
  return store.dependencies.map(dep => ({
    label: dep.name,
    value: dep.id
  }))
})

// Calcula la cantidad de cuadrillas únicas con personal asignado en la subdependencia
const getUniqueSquadsCount = (sub: any) => {
  if (!sub.diners || sub.diners.length === 0) return 0
  const uniqueIds = new Set(sub.diners.map((d: any) => d.squadId))
  return uniqueIds.size
}

// Árbol filtrado
const filteredDependencies = computed(() => {
  if (!filterText.value) return store.dependencies

  const lowerFilter = filterText.value.toLowerCase()
  return store.dependencies.map(dep => {
    // Si la dependencia coincide, mostrarla con todas sus subs
    if (dep.name.toLowerCase().includes(lowerFilter)) return dep
    
    // Si no coincide la dependencia, buscar en las subs
    const matchingSubs = dep.subdependencies?.filter(sub => sub.name.toLowerCase().includes(lowerFilter))
    if (matchingSubs && matchingSubs.length > 0) {
      return { ...dep, subdependencies: matchingSubs }
    }
    return null
  }).filter(Boolean) as typeof store.dependencies
})

onMounted(() => {
  store.fetchAll()
})
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Estructura Organizacional (RRHH)</div>
            <q-space />
            <q-input v-model="filterText" placeholder="Buscar..." outlined dense clearable class="q-mr-md" style="width: 250px">
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn v-if="canCreate" color="secondary" icon="account_tree" label="Nueva Subdependencia" @click="openCreateSub" class="q-mr-sm" />
            <q-btn v-if="canCreate" color="primary" icon="domain" label="Nueva Dependencia" @click="openCreateDep" />
          </q-card-section>
          
          <q-card-section>
            <q-list bordered class="rounded-borders">
              <q-expansion-item
                v-for="dep in filteredDependencies"
                :key="dep.id"
                expand-separator
                icon="domain"
                :label="dep.name"
                header-class="text-weight-bold"
              >
                <!-- Botones de Acción para Dependencia -->
                <template v-slot:header>
                  <q-item-section avatar>
                    <q-icon name="domain" />
                  </q-item-section>

                  <q-item-section>
                    <div class="text-weight-bold">{{ dep.name }}</div>
                  </q-item-section>

                  <q-item-section v-if="canUpdate || canDelete" side>
                    <div class="row items-center">
                      <q-btn v-if="canUpdate" flat round icon="edit" color="primary" size="sm" @click.stop="openEditDep(dep)">
                        <q-tooltip>Editar Dependencia</q-tooltip>
                      </q-btn>
                      <q-btn v-if="canDelete" flat round icon="delete" color="negative" size="sm" @click.stop="confirmDeleteDep(dep.id, dep.name)">
                        <q-tooltip>Eliminar Dependencia</q-tooltip>
                      </q-btn>
                    </div>
                  </q-item-section>
                </template>

                <q-list v-if="dep.subdependencies && dep.subdependencies.length > 0">
                  <q-item v-for="sub in dep.subdependencies" :key="sub.id" class="q-pl-xl">
                    <q-item-section avatar>
                      <q-icon name="subdirectory_arrow_right" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ sub.name }}</q-item-label>
                      <q-item-label caption>{{ getUniqueSquadsCount(sub) }} cuadrillas activas</q-item-label>
                    </q-item-section>
                    
                    <q-item-section v-if="canUpdate || canDelete" side>
                      <div class="row items-center">
                        <q-btn v-if="canUpdate" flat round icon="edit" color="primary" size="sm" @click.stop="openEditSub(sub)">
                          <q-tooltip>Editar Subdependencia</q-tooltip>
                        </q-btn>
                        <q-btn v-if="canDelete" flat round icon="delete" color="negative" size="sm" @click.stop="confirmDeleteSub(sub.id, sub.name)">
                          <q-tooltip>Eliminar Subdependencia</q-tooltip>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
                <q-card-section v-else class="text-grey q-pl-xl">
                  No hay subdependencias registradas aquí.
                </q-card-section>
              </q-expansion-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal Dependencia -->
    <q-dialog v-model="showDepDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditingDep ? 'Editar' : 'Crear' }} Dependencia Principal</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="depName" label="Nombre" outlined dense autofocus @keyup.enter="submitDependency" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Guardar" color="primary" @click="submitDependency" :loading="store.isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal Subdependencia -->
    <q-dialog v-model="showSubDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditingSub ? 'Editar' : 'Crear' }} Subdependencia</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <q-select
            v-model="formDataSub.dependencyId"
            :options="depOptions"
            emit-value
            map-options
            label="Pertenece a la Dependencia..."
            outlined
            dense
          />
          <q-input v-model="formDataSub.name" label="Nombre" outlined dense @keyup.enter="submitSubdependency" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Guardar" color="primary" @click="submitSubdependency" :loading="store.isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
