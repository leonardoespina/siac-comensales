<template>
  <div class="q-mb-md">
    <q-expansion-item
      icon="filter_alt"
      label="Filtros Avanzados"
      header-class="bg-grey-2 text-grey-9 text-weight-bold"
      class="shadow-2 rounded-borders bg-white overflow-hidden"
      expand-separator
    >
      <q-card flat class="bg-transparent">
        <q-card-section>
          <div class="row q-col-gutter-md">
            <!-- Renderizamos los inputs dinámicos guiados por el Schema -->
            <div 
              v-for="field in schema" 
              :key="field.key" 
              :class="`col-12 col-md-${field.colSpan || 4}`"
            >
              <q-select
                v-if="field.type === 'select'"
                v-model="localFilters[field.key]"
                :options="field.options"
                :option-value="field.optionValue || 'value'"
                :option-label="field.optionLabel || 'label'"
                :label="field.label"
                emit-value
                map-options
                outlined
                dense
                clearable
                bg-color="grey-1"
                @update:model-value="onFilterChange"
              />
              <q-input
                v-else-if="field.type === 'input'"
                v-model="localFilters[field.key]"
                :label="field.label"
                outlined
                dense
                clearable
                bg-color="grey-1"
                @update:model-value="onFilterChange"
              />
            </div>
            
            <!-- Botón para limpiar -->
            <div class="col-12 row justify-end items-center q-mt-sm">
              <q-btn flat label="Limpiar Filtros" color="negative" icon="clear_all" @click="clearFilters" :disable="!hasActiveFilters" />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'input'
  options?: any[]
  optionValue?: string | ((item: any) => any)
  optionLabel?: string | ((item: any) => any)
  colSpan?: number
}

const props = defineProps<{
  schema: FilterConfig[]
  modelValue: Record<string, any>
}>()

const emit = defineEmits(['update:modelValue'])

const localFilters = ref<Record<string, any>>({ ...props.modelValue })

// Sincronizar cambios desde el padre (si el padre limpia el v-model por fuera)
watch(() => props.modelValue, (newVal) => {
  localFilters.value = { ...newVal }
}, { deep: true })

const onFilterChange = () => {
  emit('update:modelValue', { ...localFilters.value })
}

const clearFilters = () => {
  props.schema.forEach(field => {
    localFilters.value[field.key] = null
  })
  emit('update:modelValue', { ...localFilters.value })
}

const hasActiveFilters = computed(() => {
  return props.schema.some(field => {
    const val = localFilters.value[field.key]
    return val !== null && val !== undefined && val !== ''
  })
})
</script>
