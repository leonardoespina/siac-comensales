<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Configuraciones Globales</div>

    <q-card bordered class="my-card shadow-1">
      <q-card-section>
        <div class="text-h6 text-secondary q-mb-md">Reglas de Solicitudes de Comedor</div>
        
        <q-form @submit="saveSettings" class="q-gutter-md">
          
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6" v-for="setting in formSettings" :key="setting.key">
              
              <!-- Si es la configuración de tiempo -->
              <q-input 
                v-if="setting.key === 'REQUEST_CUTOFF_TIME'"
                v-model="setting.value"
                :label="setting.description || setting.key"
                outlined
                dense
                type="time"
                :rules="[val => !!val || 'Requerido']"
                color="primary"
                bg-color="grey-1"
              >
                <template v-slot:prepend>
                  <q-icon name="timer" />
                </template>
              </q-input>

              <!-- Si es la configuración de días -->
              <q-input 
                v-if="setting.key === 'REQUEST_MIN_DAYS_AHEAD'"
                v-model="setting.value"
                :label="setting.description || setting.key"
                outlined
                dense
                type="number"
                min="0"
                :rules="[val => val !== '' || 'Requerido']"
                color="primary"
                bg-color="grey-1"
              >
                <template v-slot:prepend>
                  <q-icon name="event" />
                </template>
              </q-input>
              
            </div>
          </div>

          <div class="row justify-end q-mt-lg">
            <q-btn 
              label="Guardar Configuraciones" 
              type="submit" 
              color="primary" 
              icon="save" 
              :loading="loading" 
            />
          </div>

        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { useNotifications } from '~/composables/core/useNotifications'

const store = useSettingsStore()
const { notify } = useNotifications()
const loading = ref(false)
const formSettings = ref<any[]>([])

onMounted(async () => {
  await store.fetchSettings()
  // Clonar para el formulario
  formSettings.value = JSON.parse(JSON.stringify(store.settings))
})

async function saveSettings() {
  loading.value = true
  try {
    await store.updateSettings(formSettings.value)
    notify.success('Configuraciones actualizadas exitosamente')
  } catch (e: any) {
    notify.error(e.data?.statusMessage || 'Error guardando configuraciones')
  } finally {
    loading.value = false
  }
}
</script>
