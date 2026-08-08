<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Roles y Permisos</div>

    <SharedCrudTable
      title="Listado de Roles"
      :columns="columns"
      :rows="store.roles"
      :filter="filter"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="deleteRole(props.row.id)" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal Formulario de Rol -->
    <SharedFormDialog
      v-model="isOpen"
      :title="isEditing ? 'Editar Rol' : 'Nuevo Rol'"
      :loading="loading"
      @save="submit"
    >
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-input v-model="form.name" label="Nombre del Rol (Ej: GERENTE)" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="form.description" label="Descripción (Opcional)" outlined dense />
        </div>
      </div>

      <div class="text-subtitle1 q-mt-md q-mb-sm text-primary text-weight-bold">Matriz de Permisos por Módulo</div>
      <q-separator class="q-mb-sm" />
      
      <!-- Matriz de permisos agrupada -->
      <q-list bordered class="rounded-borders q-mb-md">
        <template v-for="(groupData, groupKey) in groupedPermissions" :key="groupKey">
          <q-expansion-item
            v-if="groupData.length > 0"
            :label="CATEGORIES[groupKey as keyof typeof CATEGORIES]?.label || 'Otros Módulos'"
            header-class="bg-grey-2 text-primary text-weight-bold"
            expand-icon-class="text-primary"
            default-closed
          >
            <q-card>
              <q-card-section>
                <!-- Botones de selección masiva -->
                <div class="row justify-end q-mb-md q-gutter-sm">
                  <q-btn flat dense color="primary" label="Marcar Todos" icon="check_box" @click="setGroupPermissions(groupData, true)" />
                  <q-btn flat dense color="negative" label="Desmarcar Todos" icon="check_box_outline_blank" @click="setGroupPermissions(groupData, false)" />
                </div>

                <div v-for="item in groupData" :key="item.perm.moduleId" class="row items-center q-mb-sm q-py-sm" style="border-bottom: 1px solid #eee;">
                  <div class="col-12 col-md-4 text-weight-medium q-mb-xs q-mb-md-none q-pl-sm">
                    {{ item.moduleName }}
                  </div>
                  <div class="col-12 col-md-8 row q-col-gutter-sm">
                    <template v-if="item.moduleCode === 'GLOBAL_ACCESS'">
                      <div class="col-12">
                        <q-checkbox v-model="form.permissions[item.originalIndex].canRead" label="Otorgar Privilegios Globales (Ignorar filtros)" color="warning" dense />
                      </div>
                    </template>
                    <template v-else>
                      <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[item.originalIndex].canCreate" label="Crear" color="primary" dense /></div>
                      <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[item.originalIndex].canRead" label="Leer" color="primary" dense /></div>
                      <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[item.originalIndex].canUpdate" label="Editar" color="primary" dense /></div>
                      <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[item.originalIndex].canDelete" label="Borrar" color="negative" dense /></div>
                    </template>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </template>
      </q-list>
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRolesStore } from '~/stores/roles'
import { useRoleForm } from '~/composables/features/useRoleForm'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const store = useRolesStore()
const { isOpen, isEditing, loading, form, openCreate, openEdit, submit } = useRoleForm()

const filter = ref('')

const columns = [
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

const CATEGORIES = {
  DINERS: {
    label: '🧑‍🤝‍🧑 Gestión de Comensales',
    codes: ['DINERS', 'DINERS_REQUESTS', 'DISPATCH', 'MY_SQUADS']
  },
  WAREHOUSE: {
    label: '📦 Almacén y Operaciones',
    codes: ['RECEPTIONS', 'TRANSFERS', 'OPERATIONS', 'APPROVAL_RECEPTIONS', 'APPROVAL_TRANSFERS']
  },
  REPORTS: {
    label: '📑 Reportes del Sistema',
    codes: ['REPORT_DASHBOARD', 'REPORT_VALUE', 'REPORT_ALERTS', 'REPORT_MINMAX', 'REPORT_CONSUMPTIONS', 'REPORT_EVOLUTION', 'REPORT_INSTITUTIONS', 'REPORT_SHIFTS', 'REPORT_RECEPTIONS']
  },
  INVENTORY: {
    label: '📋 Catálogos Base (Inventario)',
    codes: ['PRODUCTS', 'CATEGORIES', 'UNITS', 'WAREHOUSES', 'SUPPLIERS', 'INSTITUTIONS']
  },
  SECURITY: {
    label: '⚙️ Seguridad y Estructura Organizacional',
    codes: ['SECURITY', 'BIOMETRIC', 'DINING_ROOMS', 'DEPENDENCIES', 'SQUADS', 'POSITIONS', 'AUDIT', 'GLOBAL_ACCESS']
  }
}

const groupedPermissions = computed(() => {
  const groups: Record<string, any[]> = {
    DINERS: [],
    WAREHOUSE: [],
    INVENTORY: [],
    SECURITY: [],
    REPORTS: [],
    OTHER: []
  }

  form.value.permissions.forEach((perm, originalIndex) => {
    const module = store.modules.find(m => m.id === perm.moduleId)
    const code = module ? module.code : ''
    
    let assigned = false
    for (const [key, category] of Object.entries(CATEGORIES)) {
      if (category.codes.includes(code)) {
        groups[key].push({ perm, originalIndex, moduleName: module?.name || 'Desconocido', moduleCode: code })
        assigned = true
        break
      }
    }
    if (!assigned) {
      groups.OTHER.push({ perm, originalIndex, moduleName: module?.name || 'Desconocido', moduleCode: code })
    }
  })

  return groups
})

const setGroupPermissions = (groupData: any[], value: boolean) => {
  groupData.forEach(item => {
    const p = form.value.permissions[item.originalIndex]
    if (item.moduleCode === 'GLOBAL_ACCESS') {
      p.canRead = value
    } else {
      p.canCreate = value
      p.canRead = value
      p.canUpdate = value
      p.canDelete = value
    }
  })
}

const deleteRole = (id: number) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: '¿Eliminar este rol? Si hay usuarios con este rol asignado, el sistema rechazará la eliminación.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteRole(id)
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al eliminar' })
    }
  })
}

onMounted(async () => {
  await Promise.all([
    store.fetchRoles(),
    store.fetchModules()
  ])
})
</script>
