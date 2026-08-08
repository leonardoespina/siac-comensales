<template>
  <q-dialog v-model="isOpen" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card>
      <q-toolbar class="bg-primary text-white">
        <q-btn flat round dense icon="close" v-close-popup />
        <q-toolbar-title>Kardex: {{ product?.name }} ({{ product?.code }})</q-toolbar-title>
        <q-space />
        <q-chip color="white" text-color="primary" class="text-weight-bold">
          Stock Central: {{ centralStock }} {{ product?.unit?.abbreviation }}
        </q-chip>
      </q-toolbar>

      <q-card-section>
        <div class="row items-center q-mb-md text-grey-8">
          <q-icon name="info" size="sm" class="q-mr-sm" /> 
          Mostrando el historial de movimientos de inventario (Entradas y Salidas Confirmadas/Enviadas).
        </div>

        <q-table :grid="$q.screen.lt.md"
          :rows="movements"
          :columns="columns"
          row-key="id"
          :loading="loading"
          flat bordered
          :pagination="{ rowsPerPage: 15 }"
        >
          <template v-slot:body-cell-quantity="props">
            <q-td :props="props" :class="props.row.quantity > 0 ? 'text-positive text-weight-bold' : 'text-negative text-weight-bold'">
              {{ props.row.quantity > 0 ? '+' : '' }}{{ props.row.quantity }}
            </q-td>
          </template>
          
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-chip :color="props.row.status === 'CONFIRMED' ? 'green' : 'orange'" text-color="white" dense size="sm">
                {{ props.row.status === 'CONFIRMED' ? 'Confirmado' : 'En Tránsito' }}
              </q-chip>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  product: { type: Object, default: null },
  centralStock: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const movements = ref<any[]>([])
const loading = ref(false)

const columns = [
  { name: 'date', label: 'Fecha', field: 'date', align: 'left' as const, sortable: true, format: (val: string) => new Date(val).toLocaleString() },
  { name: 'type', label: 'Movimiento', field: 'type', align: 'left' as const },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' as const },
  { name: 'source', label: 'Origen', field: 'source', align: 'left' as const },
  { name: 'destination', label: 'Destino', field: 'destination', align: 'left' as const },
  { name: 'user', label: 'Aprobado Por', field: 'user', align: 'left' as const },
  { name: 'quantity', label: 'Cantidad', field: 'quantity', align: 'center' as const, sortable: true }
]

watch(() => props.modelValue, async (newVal) => {
  if (newVal && props.product) {
    loading.value = true
    try {
      movements.value = await $fetch(`/api/reports/kardex?productId=${props.product.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  } else {
    movements.value = []
  }
})
</script>

