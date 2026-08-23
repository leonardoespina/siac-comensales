<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Gestión de Comedores</div>

    <SharedCrudTable
      title="Comedores"
      :columns="columns"
      :rows="store.diningRooms"
      :filter="filter"
      :loading="store.isLoading"
      @update:filter="filter = $event"
      @add="openCreate"
    >

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <SharedStatusBadge :active="props.row.active" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="remove(props.row.id)" v-if="props.row.active" />
        </q-td>
      </template>
    </SharedCrudTable>

    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Comedor' : 'Nuevo Comedor'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre del Comedor *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />
      
      <q-select
        v-model="form.siteId"
        :options="sitesStore.sites"
        option-value="id"
        option-label="name"
        emit-value
        map-options
        label="Sede *"
        outlined
        dense
        class="q-mt-md"
        :rules="[val => (val !== null && val !== undefined && val !== '') || 'La Sede es requerida']"
      />

      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Comedor Activo"
        class="q-mt-md"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useSitesStore } from '~/stores/sites'
import { useDiningRoomForm } from '~/composables/features/useDiningRoomForm'

const store = useDiningRoomsStore()
const sitesStore = useSitesStore()

const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useDiningRoomForm()

const filter = ref('')



const columns = [
  { name: 'name', label: 'Nombre del Comedor', field: 'name', align: 'left' as const, sortable: true },
  { name: 'site', label: 'Sede', field: (row: any) => row.site?.name, align: 'left' as const, sortable: true },
  { name: 'status', label: 'Estado', field: 'active', align: 'center' as const, sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' as const }
]

onMounted(() => {
  store.fetchAll()
  sitesStore.fetchSites()
})
</script>
