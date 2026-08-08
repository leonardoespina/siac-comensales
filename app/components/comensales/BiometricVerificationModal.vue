<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px" class="bg-grey-10 text-white">
      <q-card-section>
        <div class="text-h6">Validar Identidad</div>
        <div class="text-subtitle2 text-grey-5">{{ dinerName }}</div>
      </q-card-section>

      <q-card-section>
        <!-- Integración del Componente Real BiometricCapture en modo verificación -->
        <BiometricCapture
          mode="VERIFY"
          :candidate-templates="candidateTemplates"
          @verified="handleVerification"
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
import BiometricCapture from '~/components/features/diners/BiometricCapture.vue'

const props = defineProps<{
  modelValue: boolean
  dinerName: string
  candidateTemplates: string[]
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const $q = useQuasar()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleVerification = (success: boolean) => {
  if (success) {
    $q.notify({ 
      type: 'positive', 
      message: `Identidad confirmada: ${props.dinerName}`,
      icon: 'verified_user'
    })
    emit('success')
    isOpen.value = false
  } else {
    // Nota: El componente interno (useBiometrics) ya muestra un Toast de error/warning
    // si falla la verificación, pero podemos añadir lógica extra si es necesario.
  }
}
</script>
