<script setup lang="ts">
import { computed } from 'vue'
import { useDiningRoomsStore } from '~/stores/diningRooms'

const props = defineProps<{
  modelValue: boolean
  isMigrating: boolean
  targetDiningRoomId: number | null
  selectedCount: number
}>()

const emit = defineEmits(['update:modelValue', 'update:targetDiningRoomId', 'execute', 'cancel'])

const diningRoomsStore = useDiningRoomsStore()

const diningRoomOptions = computed(() => {
  return diningRoomsStore.diningRooms.map(dr => ({
    label: dr.name,
    value: dr.id
  }))
})
</script>

<template>
  <q-dialog 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)" 
    persistent
  >
    <q-card style="min-width: 400px; max-width: 500px">
      <!-- Header -->
      <q-card-section class="bg-primary text-white row items-center">
        <q-icon name="swap_horiz" size="md" class="q-mr-sm" />
        <div class="text-h6">Migración Quirúrgica</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="$emit('cancel')" />
      </q-card-section>

      <!-- Body -->
      <q-card-section class="q-pt-md">
        <p class="text-body1 text-grey-8">
          Se van a transferir <strong>{{ selectedCount }} comensal(es)</strong>.
        </p>
        
        <q-select
          :model-value="targetDiningRoomId"
          @update:model-value="$emit('update:targetDiningRoomId', $event)"
          :options="diningRoomOptions"
          label="Seleccione el Comedor Destino"
          emit-value
          map-options
          outlined
          dense
          autofocus
          class="q-mt-md"
        >
          <template v-slot:prepend>
            <q-icon name="storefront" />
          </template>
        </q-select>
      </q-card-section>

      <!-- Footer -->
      <q-card-actions align="right" class="bg-grey-2 q-pa-md">
        <q-btn 
          flat 
          label="Cancelar" 
          color="grey-8" 
          v-close-popup 
          @click="$emit('cancel')"
        />
        <q-btn 
          label="Ejecutar Migración" 
          color="primary" 
          icon="check_circle"
          @click="$emit('execute')" 
          :loading="isMigrating"
          :disable="!targetDiningRoomId"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
