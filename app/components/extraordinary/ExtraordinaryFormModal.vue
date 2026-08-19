<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card style="width: 700px; max-width: 90vw;">
      <q-card-section class="bg-primary text-white row items-center q-pb-sm">
        <div class="text-h6">{{ localForm.id ? 'Editar Visita' : 'Registrar Visita Extraordinaria' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <q-form @submit.prevent="onSubmit">
          <div class="row q-col-gutter-sm">
            
            <div class="col-12 col-sm-4">
              <q-input 
                v-model="localForm.personId" 
                label="Cédula / RIF *" 
                outlined 
                dense
                autofocus
                @update:model-value="handlePersonIdInput"
                hint="Ej: V-12345678"
                lazy-rules
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
            
            <div class="col-12 col-sm-8">
              <q-input 
                v-model="localForm.companyName" 
                label="Nombre / Empresa *" 
                outlined 
                dense
                lazy-rules
                :rules="[val => !!val || 'Requerido']"
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-select 
                v-model="localForm.diningRoomId" 
                :options="diningRoomsOptions" 
                label="Comedor *" 
                outlined 
                dense
                emit-value
                map-options
                lazy-rules
                :rules="[val => !!val || 'Requerido']"
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-select 
                v-model="localForm.dependencyId" 
                :options="dependenciesOptions" 
                label="Dependencia a Visitar" 
                outlined 
                dense
                clearable
                emit-value
                map-options
              />
            </div>

            <div class="col-12 col-sm-4">
              <q-select 
                v-model="localForm.shiftType" 
                :options="['DESAYUNO', 'ALMUERZO', 'CENA', 'SOBRECENA']" 
                label="Tipo de Servicio *" 
                outlined 
                dense
              />
            </div>

            <div class="col-12 col-sm-4">
              <q-input 
                v-model.number="localForm.quantity" 
                type="number" 
                label="Cant." 
                outlined 
                dense
                min="1"
              />
            </div>

            <div class="col-12 col-sm-4">
              <q-select 
                v-model="localForm.modality" 
                :options="[{label: 'Bandeja', value: 'DINE_IN'}, {label: 'Llevar', value: 'TAKE_AWAY'}]" 
                label="Modalidad" 
                outlined 
                dense
                emit-value
                map-options
              />
            </div>

            <div class="col-12">
              <q-input 
                v-model="localForm.observation" 
                type="textarea" 
                label="Observaciones (Opcional)" 
                outlined 
                dense
                rows="2"
              />
            </div>

          </div>

          <div class="row justify-end q-mt-lg">
            <q-btn label="Cancelar" color="grey" flat v-close-popup class="q-mr-sm" />
            <q-btn :label="localForm.id ? 'Guardar Cambios' : 'Registrar Visita'" type="submit" color="primary" :loading="isSubmitting" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useExtraordinaryStore } from '~/stores/extraordinary'

const props = defineProps<{
  modelValue: boolean
  form: any
  diningRoomsOptions: any[]
  dependenciesOptions: any[]
  isSubmitting: boolean
}>()

const emit = defineEmits(['update:modelValue', 'submit'])

const store = useExtraordinaryStore()
const $q = useQuasar()

const localForm = ref<any>({})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.form) {
    localForm.value = JSON.parse(JSON.stringify(props.form))
  }
})

let autocompleteTimer: any = null
const handlePersonIdInput = () => {
  if (autocompleteTimer) clearTimeout(autocompleteTimer)
  if (localForm.value.personId?.length >= 4) {
    autocompleteTimer = setTimeout(async () => {
      const result = await store.autocompleteVisitor(localForm.value.personId)
      if (result && result.companyName && !localForm.value.companyName) {
        localForm.value.companyName = result.companyName
        $q.notify({ type: 'info', message: 'Nombre autocompletado del historial.' })
      }
    }, 500)
  }
}

const onSubmit = () => {
  if (!localForm.value.personId || !localForm.value.companyName) {
    $q.notify({ type: 'warning', message: 'Cédula/RIF y Nombre son obligatorios.' })
    return
  }
  if (!localForm.value.diningRoomId) {
    $q.notify({ type: 'warning', message: 'Debe seleccionar el Comedor.' })
    return
  }
  emit('submit', localForm.value)
}
</script>
