<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 750px; max-width: 95vw; border-radius: 12px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold">
          Importar Directorio de Comensales
        </div>
        <q-space />
        <q-btn
          icon="close"
          flat
          round
          dense
          v-close-popup
          :disable="isProcessing"
        />
      </q-card-section>

      <q-card-section v-if="!isValidationScreen">
        <div class="text-subtitle2 q-mb-md text-grey-8">
          Asegúrate de que tu archivo Excel (.xlsx) contenga exactamente las
          siguientes columnas en la primera fila:
        </div>

        <!-- Tabla de Ejemplo -->
        <q-markup-table flat bordered dense class="q-mb-md bg-grey-1">
          <thead>
            <tr class="bg-grey-3">
              <th class="text-left">Cédula *</th>
              <th class="text-left">Nombre *</th>
              <th class="text-left">Área Destino *</th>
              <th class="text-left">Comedor *</th>
              <th class="text-left">Cargo</th>
              <th class="text-left">Cuadrilla *</th>
              <th class="text-center">Tipo Ración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left text-grey-6 text-weight-bold">V-12345678</td>
              <td class="text-left text-grey-6 text-weight-bold">Leonardo Espina</td>
              <td class="text-left text-grey-6 text-weight-bold">DIVISION DE PROGRAMACION</td>
              <td class="text-left text-grey-6 text-weight-bold">Sede Principal</td>
              <td class="text-left text-grey-6">Gerente de TI</td>
              <td class="text-left text-grey-6 text-weight-bold">Administrativa</td>
              <td class="text-center text-grey-6">NORMAL</td>
            </tr>
            <tr>
              <td class="text-left text-grey-6 text-weight-bold">V-98765432</td>
              <td class="text-left text-grey-6 text-weight-bold">María Perez</td>
              <td class="text-left text-grey-6 text-weight-bold">DIVISION DE PROGRAMACION</td>
              <td class="text-left text-grey-6 text-weight-bold">Sede Principal</td>
              <td class="text-left text-grey-6">Secretaria</td>
              <td class="text-left text-grey-6 text-weight-bold">Cuadrilla A</td>
              <td class="text-center text-warning text-weight-bold">DIETA</td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="row justify-between items-center q-mb-lg">
          <span class="text-caption text-grey-7"
            >* Campos obligatorios. El cargo DEBE existir previamente.</span
          >
          <q-btn
            flat
            color="primary"
            icon="download"
            label="Descargar Plantilla Vacía"
            @click="$emit('download-template')"
          />
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
          <div class="text-subtitle1 q-mb-sm text-primary text-weight-bold">
            Analizando estructura e importando directorio...
          </div>
          <q-linear-progress
            :value="uploadProgress"
            color="primary"
            rounded
            size="20px"
            class="q-mb-xs"
            stripe
          />
          <div class="text-caption text-grey-8 text-weight-bold">
            {{ Math.round((uploadProgress || 0) * 100) }}% completado
          </div>
        </div>
      </q-card-section>

      <!-- Pantalla de Validación -->
      <q-card-section v-else>
        <div class="text-subtitle1 q-mb-md">
          Resultados de la Validación
        </div>
        <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify" narrow-indicator>
          <q-tab name="valid" :label="`Válidos (${validRows.length})`" />
          <q-tab name="invalid" :label="`Con Errores (${invalidRows.length})`" class="text-negative" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="valid" class="q-pa-none q-pt-md">
            <q-table
              :rows="validRows"
              :columns="validColumns"
              row-key="cedula"
              flat bordered dense
              :pagination="{ rowsPerPage: 5 }"
            >
              <template v-slot:body-cell-action="props">
                <q-td :props="props" :class="props.row._isUpdate ? 'text-orange text-weight-bold' : 'text-positive text-weight-bold'">
                  {{ props.row._isUpdate ? 'Actualizar' : 'Nuevo' }}
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <q-tab-panel name="invalid" class="q-pa-none q-pt-md">
            <q-table
              :rows="invalidRows"
              :columns="invalidColumns"
              row-key="row.cedula"
              flat bordered dense
              :pagination="{ rowsPerPage: 5 }"
            >
              <template v-slot:body-cell-error="props">
                <q-td :props="props" class="text-negative text-weight-bold" style="white-space: normal;">
                  {{ props.value }}
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>
        </q-tab-panels>

        <div class="row justify-end q-mt-md q-gutter-sm">
          <q-btn flat label="Atrás" color="grey" @click="$emit('cancel-validation')" />
          <q-btn label="Confirmar Válidos" color="primary" @click="$emit('confirm-import')" :disable="validRows.length === 0" :loading="isProcessing" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const emit = defineEmits([
  "update:modelValue",
  "file-selected",
  "confirm-import",
  "cancel-validation",
  "download-template",
]);

const props = defineProps({
  modelValue: Boolean,
  isProcessing: Boolean,
  isValidationScreen: Boolean,
  validRows: { type: Array, default: () => [] },
  invalidRows: { type: Array, default: () => [] },
  uploadProgress: Number,
});

const tab = ref("valid");

const validColumns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left' },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
  { name: 'area', label: 'Área Destino', field: 'areaName', align: 'left' },
  { name: 'action', label: 'Acción', field: '_isUpdate', align: 'center' }
];

const invalidColumns = [
  { name: 'cedula', label: 'Cédula', field: (r: any) => r.row.cedula, align: 'left' },
  { name: 'name', label: 'Nombre', field: (r: any) => r.row.name, align: 'left' },
  { name: 'error', label: 'Motivo del Error', field: 'error', align: 'left' }
];

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const fileModel = ref<File | null>(null);

const onFileSelected = (file: File) => {
  if (file) {
    emit("file-selected", file);
    fileModel.value = null;
  }
};
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
