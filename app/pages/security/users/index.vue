<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Usuarios</div>

    <SharedCrudTable
      title="Listado de Usuarios"
      :columns="columns"
      :rows="store.users"
      :filter="filter"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-role="props">
        <q-td :props="props">
          <q-badge color="primary" :label="props.row.role?.name" />
        </q-td>
      </template>

      <template v-slot:body-cell-subdependencies="props">
        <q-td :props="props" align="center">
          <q-chip 
            v-for="sub in (props.row.subdependencies || [])" 
            :key="sub.id" 
            color="primary" 
            text-color="white" 
            size="sm" 
            dense 
            outline
          >
            {{ sub.name }}
          </q-chip>
          <span v-if="!props.row.subdependencies || props.row.subdependencies.length === 0" class="text-caption text-grey">
            {{ props.row.dependency ? props.row.dependency.name + ' (Todas)' : 'N/A' }}
          </span>
        </q-td>
      </template>

      <template v-slot:body-cell-sites="props">
        <q-td :props="props" align="center">
          <q-chip 
            v-for="site in (props.row.sites || [])" 
            :key="site.id" 
            color="secondary" 
            text-color="white" 
            size="sm" 
            dense 
            outline
          >
            {{ site.name }}
          </q-chip>
          <span v-if="!props.row.sites || props.row.sites.length === 0" class="text-caption text-grey">Global</span>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <SharedStatusBadge :active="props.row.active" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="deleteUser(props.row.id)" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal Formulario de Usuario -->
    <SharedFormDialog
      v-model="isOpen"
      :title="isEditing ? 'Editar Usuario' : 'Nuevo Usuario'"
      :loading="loading"
      @save="submit"
    >
      <div class="row q-col-gutter-md">
        <!-- Fila 1: Datos Personales -->
        <div class="col-12 col-md-4">
          <q-input v-model="form.cedula" label="Cédula" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-8">
          <q-input v-model="form.name" label="Nombre Completo" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>

        <!-- Fila 2: Roles y Operativa -->
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.roleId" 
            :options="roleOptions" 
            option-value="id" 
            option-label="name" 
            emit-value 
            map-options 
            label="Rol del Usuario" 
            outlined 
            dense 
            :rules="[val => !!val || 'Requerido']" 
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            @filter="filterRoles"
          >
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
            </template>
          </q-select>
        </div>

        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.dependencyId" 
            :options="dependencyOptions" 
            option-value="id"
            option-label="name"
            emit-value 
            map-options 
            label="Dependencia Principal" 
            outlined 
            dense
            clearable
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            @filter="filterDependencies"
            @update:model-value="form.subdependencyIds = []"
          >
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.subdependencyIds" 
            :options="subdependencyOptions" 
            option-value="id"
            option-label="name"
            emit-value 
            map-options 
            label="Subdependencias Autorizadas (Supervisores)" 
            outlined 
            dense
            multiple
            use-chips
            clearable
            :disable="!form.dependencyId"
            @filter="filterSubdependencies"
          >
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.siteIds" 
            :options="siteOptions" 
            option-value="id"
            option-label="name"
            emit-value 
            map-options 
            label="Sedes Autorizadas" 
            outlined 
            dense
            multiple
            use-chips
            clearable
          />
        </div>
        <div class="col-12" v-if="isEditing">
          <q-input v-model="form.password" label="Nueva Contraseña (Dejar en blanco si no se cambia)" outlined dense type="password" />
        </div>
        <div class="col-12" v-if="isEditing">
          <q-toggle v-model="form.active" label="Usuario Activo" color="positive" />
        </div>
      </div>
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useUsersStore } from '~/stores/users'
import { useRolesStore } from '~/stores/roles'
import { useDependenciesStore } from '~/stores/dependencies'
import { useSitesStore } from '~/stores/sites'
import { useUserForm } from '~/composables/features/useUserForm'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const store = useUsersStore()
const rolesStore = useRolesStore()
const depStore = useDependenciesStore()
const sitesStore = useSitesStore()
const { isOpen, isEditing, loading, form, openCreate, openEdit, submit } = useUserForm()

const filter = ref('')

// -- AUTOCOMPLETE LÓGICA --
const roleOptions = ref<any[]>([])
const dependencyOptions = ref<any[]>([])
const subdependencyOptions = ref<any[]>([])
const siteOptions = computed(() => sitesStore.sites.filter(s => s.active !== false))

// Inicializamos las opciones cuando se abre el modal para que los selects puedan mapear ID -> Nombre
watch(isOpen, (val) => {
  if (val) {
    roleOptions.value = rolesStore.roles
    dependencyOptions.value = depStore.dependencies
    subdependencyOptions.value = filteredSubdependencies.value
  }
})

watch(() => form.value.dependencyId, () => {
  subdependencyOptions.value = filteredSubdependencies.value
})

const filterRoles = (val: string, update: Function) => {
  update(() => {
    const needle = val.toLowerCase()
    roleOptions.value = rolesStore.roles.filter(v => v.name.toLowerCase().indexOf(needle) > -1)
  })
}

const filterDependencies = (val: string, update: Function) => {
  update(() => {
    const needle = val.toLowerCase()
    dependencyOptions.value = depStore.dependencies.filter(v => v.name.toLowerCase().indexOf(needle) > -1)
  })
}

const filteredSubdependencies = computed(() => {
  if (!form.value.dependencyId) return []
  const dep = depStore.dependencies.find(d => d.id === form.value.dependencyId)
  return dep?.subdependencies || []
})

const filterSubdependencies = (val: string, update: Function) => {
  update(() => {
    const needle = val.toLowerCase()
    subdependencyOptions.value = filteredSubdependencies.value.filter((v: any) => v.name.toLowerCase().indexOf(needle) > -1)
  })
}

const columns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'role', label: 'Rol', field: 'role', align: 'center', sortable: true },
  { name: 'subdependencies', label: 'Subdependencias Autorizadas', align: 'center' },
  { name: 'sites', label: 'Sedes Autorizadas', align: 'center' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

const deleteUser = (id: number) => {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Estás seguro de desactivar este usuario? Será un borrado lógico para mantener la auditoría.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteUser(id)
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al eliminar' })
    }
  })
}

onMounted(async () => {
  await Promise.all([
    store.fetchUsers(),
    rolesStore.fetchRoles(),
    depStore.fetchAll(),
    sitesStore.fetchSites()
  ])
})
</script>
