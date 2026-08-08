<template>
  <q-table
    :title="title"
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :filter="filter"
    :pagination="initialPagination"
    :grid="$q.screen.lt.md"
    row-key="id"
    flat
    bordered
    class="my-sticky-header-table"
  >
    <!-- Personalización de la barra superior -->
    <template v-slot:top-right>
      <q-input 
        borderless 
        dense 
        debounce="300" 
        v-model="internalFilter" 
        placeholder="Buscar..."
        class="q-mr-md bg-grey-2 q-px-sm rounded-borders"
      >
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-btn 
        v-if="showAdd"
        color="primary" 
        icon="add" 
        :label="addLabel" 
        unelevated
        @click="$emit('add')" 
      />
    </template>

    <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>

    <!-- MODO GRID DINÁMICO (Soporta custom slots del padre) -->
    <template v-slot:item="props">
      <div class="q-pa-xs col-12 col-sm-6 col-md-4">
        <q-card bordered flat>
          <q-card-section class="q-pb-none">
            <div v-for="col in props.cols.filter(c => c.name !== 'actions')" :key="col.name" class="row justify-between q-mb-sm">
              <div class="text-caption text-grey-7">{{ col.label }}</div>
              <div class="text-weight-bold text-right" style="max-width: 60%; word-break: break-word;">
                <!-- Fallback al slot inyectado por el padre, o texto plano -->
                <slot :name="`body-cell-${col.name}`" v-bind="{ ...props, col: col, value: col.value }">
                  {{ col.value }}
                </slot>
              </div>
            </div>
          </q-card-section>
          
          <template v-if="props.cols.some(c => c.name === 'actions')">
            <q-separator />
            <q-card-actions align="right" class="bg-grey-1">
              <slot name="body-cell-actions" v-bind="{ ...props, col: props.cols.find(c => c.name === 'actions'), value: null }"></slot>
            </q-card-actions>
          </template>
        </q-card>
      </div>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  filter: { type: String, default: '' },
  showAdd: { type: Boolean, default: true },
  addLabel: { type: String, default: 'Nuevo' },
  pagination: { type: Object, default: () => ({ rowsPerPage: 10 }) }
})

const emit = defineEmits(['update:filter', 'update:pagination', 'request', 'add'])

const internalFilter = computed({
  get: () => props.filter,
  set: (val) => emit('update:filter', val)
})

const initialPagination = ref({
  sortBy: 'id',
  descending: true,
  page: 1,
  rowsPerPage: 10
})
</script>
