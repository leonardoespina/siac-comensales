<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 750px; max-width: 95vw; border-radius: 12px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold">Importar Factura / Recepción</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="isProcessing" />
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle2 q-mb-md text-grey-8">
          Asegúrate de que tu archivo Excel (.xlsx) contenga exactamente las siguientes columnas en la primera fila:
        </div>
        
        <!-- Tabla de Ejemplo -->
        <q-markup-table flat bordered dense class="q-mb-md bg-grey-1">
          <thead>
            <tr class="bg-grey-3">
              <th class="text-left">Código</th>
              <th class="text-left">Producto *</th>
              <th class="text-left">Categoría *</th>
              <th class="text-left">Unidad *</th>
              <th class="text-right">Cantidad *</th>
              <th class="text-right">Precio</th>
              <th class="text-center">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left text-grey-6">P-001</td>
              <td class="text-left text-grey-6 text-weight-bold">Arroz Blanco</td>
              <td class="text-left text-grey-6">Víveres Secos</td>
              <td class="text-left text-grey-6">Kilo</td>
              <td class="text-right text-grey-6 text-weight-bold">50</td>
              <td class="text-right text-grey-6">1.25</td>
              <td class="text-center text-grey-6">01/12/2027</td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="row justify-between items-center q-mb-lg">
          <span class="text-caption text-grey-7">* Campos obligatorios para crear el producto automáticamente</span>
          <q-btn flat color="primary" icon="download" label="Descargar Plantilla Vacía" @click="$emit('download-template')" />
        </div>

        <!-- Zona de Carga (Drag & Drop) -->
        <div v-if="!isProcessing" class="q-mt-md">
          <q-file 
            v-model="fileModel" 
            outlined 
            bottom-slots 
            label="Arrastra tu archivo Excel aquí o haz clic para explorar" 
            accept=".xlsx, .xls"
            class="upload-zone"
            @update:model-value="onFileSelected"
          >
            <template v-slot:prepend>
              <q-icon name="cloud_upload" size="xl" color="primary" />
            </template>
          </q-file>
        </div>

        <!-- Barra de Progreso Simulada -->
        <div v-else class="q-mt-xl q-mb-md text-center">
          <div class="text-subtitle1 q-mb-sm text-primary text-weight-bold">Analizando estructura y auto-creando productos...</div>
          <q-linear-progress :value="uploadProgress" color="primary" rounded size="20px" class="q-mb-xs" stripe />
          <div class="text-caption text-grey-8 text-weight-bold">{{ Math.round((uploadProgress || 0) * 100) }}% completado</div>
        </div>

      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  isProcessing: Boolean,
  uploadProgress: Number
})

const emit = defineEmits(['update:modelValue', 'file-selected', 'download-template'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const fileModel = ref<File | null>(null)

const onFileSelected = (file: File) => {
  if (file) {
    emit('file-selected', file)
    // Limpiamos el v-model por si quiere volver a subir el mismo archivo después
    fileModel.value = null
  }
}
</script>

<style scoped>
.upload-zone :deep(.q-field__control) {
  height: 140px;
  border: 2px dashed #1976d2;
  border-radius: 12px;
  background-color: #f4f9ff;
  transition: background-color 0.3s;
}
.upload-zone :deep(.q-field__control):hover {
  background-color: #e3f2fd;
}
.upload-zone :deep(.q-field__native) {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #1976d2;
  justify-content: center;
}
.upload-zone :deep(.q-field__prepend) {
  padding-right: 15px;
}
</style>
