<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Historial de Auditoría</div>

    <!-- 
      Aquí activamos el @request. La tabla ya no paginará en memoria, 
      sino que llamará a nuestro backend en cada clic de "Siguiente página".
    -->
    <SharedCrudTable
      title="Registro de Movimientos del Sistema"
      :columns="columns"
      :rows="store.logs"
      :loading="loading"
      :showAdd="false"
      @request="onRequest"
      v-model:pagination="pagination"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuditStore } from '~/stores/audit'

const store = useAuditStore()
const loading = ref(false)

const pagination = ref({
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0 // Si esto es > 0, Quasar asume server-side pagination
})

const columns = [
  { name: 'date', label: 'Fecha/Hora', field: (row: any) => new Date(row.createdAt).toLocaleString(), align: 'left' },
  { name: 'user', label: 'Usuario', field: (row: any) => row.user ? `${row.user.name} (${row.user.cedula})` : 'Sistema', align: 'left' },
  { name: 'action', label: 'Acción', field: 'action', align: 'center' },
  { name: 'entity', label: 'Módulo Afectado', field: 'entity', align: 'center' },
  { name: 'details', label: 'Detalles', field: 'details', align: 'left' }
]

const onRequest = async (props: any) => {
  const { page, rowsPerPage } = props.pagination
  loading.value = true
  
  try {
    const res = await store.fetchLogs(page, rowsPerPage)
    
    // Actualizamos nuestra paginación local con lo que respondió el backend
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.rowsNumber = res.meta.total
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  onRequest({ pagination: pagination.value })
})
</script>
