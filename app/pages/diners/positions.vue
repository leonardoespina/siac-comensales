<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePositionsStore } from '~/stores/positions'
import { usePositionForm } from '~/composables/features/usePositionForm'
import { useQuasar } from 'quasar'

const store = usePositionsStore()
const { isOpen, isEditing, loading, form, openCreate, openEdit, submit } = usePositionForm()
const $q = useQuasar()

const filter = ref('')

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre del Cargo', field: 'name', align: 'left', sortable: true },
  { name: 'active', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

const deletePosition = (id: number) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: '¿Estás seguro de eliminar este cargo? No se podrá si está asignado a trabajadores.',
    cancel: true,
    persistent: true
  }).onOk(() => {
    store.deletePosition(id)
  })
}

onMounted(() => {
  store.fetchPositions()
})
</script>

<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Catálogo de Cargos</div>

    <SharedCrudTable
      title="Gestión de Cargos"
      :columns="columns"
      :rows="store.positions"
      :loading="store.loading"
      :filter="filter"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-active="props">
        <q-td :props="props" class="text-center">
          <q-badge :color="props.row.active ? 'positive' : 'negative'">
            {{ props.row.active ? 'Activo' : 'Inactivo' }}
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="deletePosition(props.row.id)" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal Formulario -->
    <SharedFormDialog
      v-model="isOpen"
      :title="isEditing ? 'Editar Cargo' : 'Nuevo Cargo'"
      :loading="loading"
      @save="submit"
    >
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-input 
            v-model="form.name" 
            label="Nombre del Cargo" 
            outlined 
            dense 
            autofocus
            :rules="[val => !!val || 'El nombre es requerido']" 
          />
        </div>
        <div class="col-12" v-if="isEditing">
          <q-checkbox v-model="form.active" label="Activo" color="primary" />
        </div>
      </div>
    </SharedFormDialog>
  </q-page>
</template>
