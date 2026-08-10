<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Gestión de Sedes</div>

    <SharedCrudTable
      title="Sedes"
      :columns="columns"
      :rows="store.sites"
      :filter="filter"
      :loading="store.loading"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-description="props">
        <q-td :props="props">
          <span class="text-caption text-grey-8">{{ props.row.description || 'Sin descripción' }}</span>
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
          <q-btn flat round dense color="negative" icon="delete" @click="remove(props.row.id)" v-if="props.row.active" />
        </q-td>
      </template>
    </SharedCrudTable>

    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Sede' : 'Nueva Sede'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre de la Sede *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />

      <q-input
        v-model="form.description"
        label="Descripción (Opcional)"
        type="textarea"
        outlined
        dense
        class="q-mt-md"
      />

      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Sede Activa"
        class="q-mt-md"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSitesStore } from '~/stores/sites'
import { useSiteForm } from '~/composables/features/useSiteForm'

const store = useSitesStore()
const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useSiteForm()

const filter = ref('')

const columns = [
  { name: 'name', label: 'Nombre de la Sede', field: 'name', align: 'left' as const, sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Estado', field: 'active', align: 'center' as const, sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' as const }
]

onMounted(() => {
  store.fetchSites()
})
</script>
