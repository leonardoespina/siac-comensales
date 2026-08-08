<template>
  <q-card class="bg-grey-2 q-pa-md shadow-2" style="max-width: 600px; margin: 0 auto;">
    <q-card-section class="text-center">
      <div class="text-h4 text-primary text-weight-bold">Punto de Despacho</div>
      <div class="text-subtitle1 text-grey-7">Lectura de Huella Biométrica</div>
    </q-card-section>

    <q-card-section class="text-center q-py-xl">
      <q-card
        flat
        bordered
        class="bg-white"
        :class="statusCardClass"
        style="height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: all 0.3s ease;"
      >
        <template v-if="!isProcessing && !result">
          <q-icon name="fingerprint" size="120px" color="grey-4" />
          <div class="text-h6 text-grey-6 q-mt-md">Esperando lectura de huella...</div>
        </template>
        
        <template v-else-if="isProcessing">
          <q-spinner-puff color="primary" size="120px" />
          <div class="text-h6 text-primary q-mt-md">Validando...</div>
        </template>

        <template v-else-if="result">
          <q-icon
            :name="result.authorized ? 'check_circle' : 'cancel'"
            :color="result.authorized ? 'positive' : 'negative'"
            size="80px"
          />
          <div class="text-h5 text-weight-bold q-mt-md" :class="result.authorized ? 'text-positive' : 'text-negative'">
            {{ result.message }}
          </div>
          <div v-if="result.diner" class="text-subtitle1 q-mt-sm">
            <strong>{{ result.diner.name }}</strong> ({{ result.diner.cedula }})<br>
            Ración: <q-badge :color="result.diner.rationType === 'NORMAL' ? 'primary' : 'warning'">{{ result.diner.rationType }}</q-badge>
          </div>
        </template>
      </q-card>
    </q-card-section>

    <q-card-actions align="center" class="q-pt-none">
      <!-- BOTÓN PARA SIMULAR LA LECTURA FÍSICA -->
      <q-btn
        color="primary"
        size="lg"
        icon="touch_app"
        label="SIMULAR LECTURA MANUAL"
        :disable="isProcessing"
        @click="simulateScan"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMealServicesStore } from '~/stores/mealServices'

const mealStore = useMealServicesStore()
const isProcessing = ref(false)
const result = ref<any>(null)

const statusCardClass = computed(() => {
  if (result.value?.authorized === true) return 'bg-green-1 border-positive'
  if (result.value?.authorized === false) return 'bg-red-1 border-negative'
  return ''
})

// Simula la lectura de un dispositivo biométrico.
// En producción, esto sería escuchado por un evento global o un bridge SDK
const simulateScan = async () => {
  isProcessing.value = true
  result.value = null
  
  try {
    // 1. Simular delay del hardware (1 seg)
    await new Promise(r => setTimeout(r, 1000))
    
    // 2. Solicitar Cédula o Hash al operador para la simulación
    const fakeHash = prompt('Escriba la Cédula (Ej: 12345678) o el Hash de huella (FPRNT-...):')
    if (!fakeHash) {
      isProcessing.value = false
      return
    }

    // 3. Validar con el backend
    // Determinamos si es huella o cédula basado en el prefijo que inventamos
    const isFingerprint = fakeHash.startsWith('FPRNT-')
    const res = await mealStore.dispatchMeal(fakeHash, isFingerprint)
    
    result.value = res
  } catch (error: any) {
    result.value = {
      authorized: false,
      message: error.data?.message || 'Error de lectura o validación'
    }
  } finally {
    isProcessing.value = false
    
    // Auto-limpiar después de 4 segundos
    setTimeout(() => {
      result.value = null
    }, 4000)
  }
}
</script>
