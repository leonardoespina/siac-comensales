<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-dark-page">
        <q-card class="kiosk-card glass-panel" flat bordered>
          <q-card-section class="text-center">
            <q-icon name="restaurant" size="4rem" color="primary" class="q-mb-md" />
            <h1 class="text-h4 text-white font-bold m-0">Kiosco de Comedores</h1>
            <p class="text-gray-400">Punto de Entrega y Validación de Raciones</p>
          </q-card-section>

          <q-card-section class="q-pt-none text-center">
            <div v-if="!dinerFound" class="space-y-4">
              <q-input
                v-model="searchCedula"
                outlined
                rounded
                placeholder="Ingrese Cédula"
                input-class="text-center text-h5 tracking-widest text-white"
                @keyup.enter="searchDiner"
                autofocus
                :loading="isLoading"
              >
                <template v-slot:append>
                  <q-btn round dense flat icon="search" color="primary" @click="searchDiner" />
                </template>
              </q-input>
              <p class="text-sm text-gray-500">O escanee el código QR</p>
            </div>

            <div v-else class="space-y-6">
              <div class="user-info bg-dark/50 rounded-xl p-4 border border-white/5">
                <div class="text-h5 text-white">{{ currentDiner.name }}</div>
                <div class="text-subtitle1 text-primary">{{ currentDiner.cedula }}</div>
                <q-badge :color="currentDiner.rationType === 'DIETA' ? 'warning' : 'secondary'" class="q-mt-sm">
                  Ración: {{ currentDiner.rationType }}
                </q-badge>
              </div>

              <!-- Componente Biométrico en modo VERIFY -->
              <BiometricCapture
                mode="VERIFY"
                :candidate-templates="currentTemplates"
                @verified="onBiometricSuccess"
              />

              <q-btn flat color="grey" label="Volver / Buscar otro" @click="resetKiosk" class="full-width q-mt-md" />
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useDinersStore } from '~/stores/diners'
import BiometricCapture from '~/components/features/diners/BiometricCapture.vue'

definePageMeta({
  layout: false // Pantalla completa
})

const $q = useQuasar()
const dinersStore = useDinersStore()
const searchCedula = ref('')
const isLoading = ref(false)
const dinerFound = ref(false)
const currentDiner = ref<any>(null)
const currentTemplates = ref<string[]>([])

const searchDiner = async () => {
  if (!searchCedula.value) return
  
  isLoading.value = true
  try {
    // 1. Buscar al comensal por cédula usando Pinia
    const diner = await dinersStore.fetchByCedula(searchCedula.value)
    
    if (!diner) {
      $q.notify({ type: 'warning', message: 'Comensal no encontrado.' })
      return
    }

    // 2. Buscar sus huellas (BiometricRecord) usando Pinia
    const templates = await dinersStore.fetchBiometricTemplates(diner.id)
    
    currentDiner.value = diner
    currentTemplates.value = templates
    
    if (currentTemplates.value.length === 0) {
      $q.notify({ type: 'warning', message: 'El comensal no tiene huellas registradas. Proceda con validación manual.' })
    }
    
    dinerFound.value = true
  } catch (e: any) {
    $q.notify({ type: 'negative', message: 'Error buscando comensal.' })
  } finally {
    isLoading.value = false
  }
}

const onBiometricSuccess = (match: boolean) => {
  if (match) {
    $q.notify({
      type: 'positive',
      message: '¡Identidad Confirmada! Registrando consumo...',
      icon: 'check_circle',
      position: 'top',
      timeout: 3000
    })
    
    // Aquí se llamaría al endpoint para registrar la transacción de consumo
    setTimeout(() => {
      resetKiosk()
    }, 3000)
  }
}

const resetKiosk = () => {
  searchCedula.value = ''
  dinerFound.value = false
  currentDiner.value = null
  currentTemplates.value = []
}
</script>

<style scoped>
.kiosk-card {
  width: 100%;
  max-width: 500px;
  border-radius: 24px;
}
</style>
