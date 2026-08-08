<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px" class="bg-white text-dark">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Gestión de Huella</div>
        <div class="text-subtitle2">{{ dinerName }}</div>
      </q-card-section>

      <q-card-section>
        <!-- Integración del Componente Real BiometricCapture -->
        <BiometricCapture
          mode="ENROLL"
          @captured="handleFingerprintCaptured"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="Cerrar"
          color="grey"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDinersStore } from '~/stores/diners'
import BiometricCapture from '~/components/features/diners/BiometricCapture.vue'

const props = defineProps<{
  modelValue: boolean
  dinerId: number | null
  dinerName: string
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const dinersStore = useDinersStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleFingerprintCaptured = async (templateBase64: string) => {
  if (!props.dinerId) return
  
  try {
    // Obtenemos los templates existentes (si los hay) y agregamos el nuevo
    const existingTemplates = await dinersStore.fetchBiometricTemplates(props.dinerId)
    const updatedTemplates = [...existingTemplates, templateBase64]
    
    await dinersStore.saveBiometricTemplates(props.dinerId, updatedTemplates)
    $q.notify({ type: 'positive', message: 'Huella registrada y vinculada a ' + props.dinerName })
    
    emit('saved')
    isOpen.value = false
  } catch (error: any) {
    $q.notify({ type: 'negative', message: 'Error al vincular la huella al comensal.' })
  }
}
</script>
