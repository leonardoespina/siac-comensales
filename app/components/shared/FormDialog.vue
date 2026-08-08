<template>
  <q-dialog v-model="internalIsOpen" persistent :maximized="$q.screen.lt.md">
    <q-card style="width: 100%; max-width: 800px;">
      <!-- Cabecera Estándar -->
      <q-card-section class="bg-primary text-white row items-center q-pb-sm">
        <div class="text-h6 text-weight-bold">{{ title }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- Formulario (El cuerpo se inyecta por el padre) -->
      <q-form @submit.prevent="$emit('save')">
        <q-card-section class="q-pt-md">
          <slot />
        </q-card-section>

        <q-separator />

        <!-- Botones de Acción Estándar -->
        <q-card-actions align="right" class="text-primary q-pa-md bg-grey-1">
          <q-btn flat label="Cancelar" color="grey-8" v-close-popup />
          <q-btn 
            unelevated 
            color="primary" 
            :label="saveLabel" 
            type="submit" 
            :loading="loading"
            class="q-px-md"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true }, // Controla si está abierto o cerrado via v-model
  title: { type: String, required: true },
  loading: { type: Boolean, default: false },
  saveLabel: { type: String, default: 'Guardar' }
})

const emit = defineEmits(['update:modelValue', 'save'])

const internalIsOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>
