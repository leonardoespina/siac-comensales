<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useSquadsStore } from "~/stores/squads";
import { useDinersStore } from "~/stores/diners";
import { useDependenciesStore } from "~/stores/dependencies";
import { usePositionsStore } from "~/stores/positions";
import { useSitesStore } from "~/stores/sites";
import { useAuthStore } from "~/stores/auth";
import { useQuasar } from "quasar";
import { useWorkerForm } from "~/composables/features/useWorkerForm";
import { useExcelDinerImport } from "~/composables/features/useExcelDinerImport";
import { useMassMigration } from "~/composables/features/useMassMigration";
import { useWorkersTable } from "~/composables/features/useWorkersTable";
import SharedDinerExcelUploader from "~/components/SharedDinerExcelUploader.vue";
import SharedSmartFilter from "~/components/SharedSmartFilter.vue";
import MassMigrationModal from "~/components/comensales/MassMigrationModal.vue";

const $q = useQuasar();
const squadsStore = useSquadsStore();
const dinersStore = useDinersStore();
const depStore = useDependenciesStore();
const positionsStore = usePositionsStore();
const sitesStore = useSitesStore();
const authStore = useAuthStore();

const { showDialog, isEdit, formData, openDialog, openEditDialog, submit } =
  useWorkerForm();

const {
  isModalOpen,
  isProcessing,
  isValidationScreen,
  validRows,
  invalidRows,
  uploadProgress,
  parseExcel,
  confirmImport,
  cancelValidation,
  downloadTemplate,
} = useExcelDinerImport();

const {
  isModalOpen: isMigrationModalOpen,
  isMigrating,
  targetDiningRoomId,
  selectedDiners,
  openMigrationModal,
  closeMigrationModal,
  executeMigration,
} = useMassMigration();

// Toda la lógica de filtros, opciones de menús, columnas de tabla y eliminación extraída aquí:
const {
  filterDependencyId,
  filterSubdependencyId,
  filterState,
  rationOptions,
  squadOptions,
  positionOptions,
  siteOptions,
  dependencyOptions,
  smartFilterSchema,
  filterSubdependencyOptions,
  subdependencyOptions,
  userSubdependencyName,
  userDependencyName,
  columns,
  deleteDiner,
  customFilter,
} = useWorkersTable(computed(() => formData.value.dependencyId));

const openExcelModal = () => {
  isModalOpen.value = true;
};

onMounted(() => {
  squadsStore.fetchAll();
  positionsStore.fetchPositions();
  sitesStore.fetchSites();
  depStore.fetchAll();

  // Solo cargamos los comensales automáticamente si NO es un Admin Global puro
  // (es decir, si es supervisor o admin asignado a una subdependencia, o si es Gerente asignado a una dependencia)
  if (
    !authStore.hasPermission("GLOBAL_ACCESS", "canRead") ||
    authStore.user?.subdependencyId ||
    authStore.user?.dependencyId
  ) {
    dinersStore.fetchAll();
  }
});
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Directorio de Comensales</div>
            <q-space />
            <div class="q-gutter-sm">
              <q-btn
                color="primary"
                icon="person_add"
                label="Registrar Trabajador"
                @click="openDialog"
              />
              <q-btn
                color="secondary"
                outline
                icon="upload_file"
                label="Importar Excel"
                @click="openExcelModal"
              />
            </div>
          </q-card-section>

          <q-card-section>
            <!-- Panel de Filtros y Búsqueda -->
            <div class="row q-col-gutter-md q-mb-md">
              <template
                v-if="
                  authStore.hasPermission('GLOBAL_ACCESS', 'canRead') &&
                  !authStore.user?.subdependencyId
                "
              >
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="filterDependencyId"
                    :options="dependencyOptions"
                    option-value="id"
                    option-label="name"
                    label="Filtrar por Dependencia"
                    emit-value
                    map-options
                    outlined
                    dense
                    clearable
                  />
                </div>
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="filterSubdependencyId"
                    :options="filterSubdependencyOptions"
                    option-value="id"
                    option-label="name"
                    label="Subdependencia"
                    emit-value
                    map-options
                    outlined
                    dense
                    clearable
                    :disable="!filterDependencyId"
                  />
                </div>
              </template>

              <div
                :class="
                  authStore.hasPermission('GLOBAL_ACCESS', 'canRead') &&
                  !authStore.user?.subdependencyId
                    ? 'col-12 col-md-4'
                    : 'col-12 col-md-4 offset-md-8'
                "
              >
                <q-input
                  v-model="filterState.search"
                  dense
                  outlined
                  placeholder="Buscar por cédula o nombre..."
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
            </div>

            <!-- Smart Filter -->
            <SharedSmartFilter
              :schema="smartFilterSchema"
              v-model="filterState"
            />

            <!-- Barra Flotante de Acciones Masivas -->
            <transition name="q-transition--slide-down">
              <div
                v-if="selectedDiners.length > 0"
                class="bg-primary-light q-pa-sm q-mb-md rounded-borders row items-center justify-between"
                style="
                  border: 1px solid var(--q-primary);
                  background-color: #e3f2fd;
                "
              >
                <div>
                  <q-icon
                    name="check_circle"
                    color="primary"
                    size="sm"
                    class="q-mr-sm"
                  />
                  <span class="text-subtitle2 text-primary">
                    <strong>{{ selectedDiners.length }}</strong> comensal(es)
                    seleccionado(s)
                  </span>
                </div>
                <div>
                  <q-btn
                    color="primary"
                    icon="swap_horiz"
                    label="Mover Seleccionados"
                    @click="openMigrationModal"
                  />
                  <q-btn
                    flat
                    color="grey-8"
                    icon="close"
                    class="q-ml-sm"
                    @click="selectedDiners = []"
                    round
                    dense
                  >
                    <q-tooltip>Cancelar Selección</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </transition>

            <q-table
              :grid="$q.screen.lt.md"
              :rows="dinersStore.diners"
              :columns="columns"
              :loading="dinersStore.isLoading"
              :filter="filterState"
              :filter-method="customFilter"
              row-key="id"
              selection="multiple"
              v-model:selected="selectedDiners"
              flat
              bordered
              no-data-label="Registra a tu primer trabajador usando el botón de arriba."
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    round
                    color="primary"
                    icon="edit"
                    size="sm"
                    @click="openEditDialog(props.row)"
                  >
                    <q-tooltip>Editar Trabajador</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    color="negative"
                    icon="delete"
                    size="sm"
                    @click="deleteDiner(props.row)"
                  >
                    <q-tooltip>Eliminar Trabajador</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <!-- MODO MÓVIL (GRID): Tarjeta Compacta -->
              <template v-slot:item="props">
                <div class="q-pa-xs col-12 col-sm-6 col-md-4">
                  <q-card bordered flat class="bg-white">
                    <q-card-section class="q-pb-xs">
                      <div class="text-weight-bold text-subtitle1">
                        {{ props.row.name }}
                      </div>
                      <div class="text-caption text-grey-8">
                        <q-icon name="badge" class="q-mr-xs" />
                        {{ props.row.cedula }}
                      </div>
                      <div class="text-caption text-grey-8 q-mt-xs">
                        <q-icon name="work" class="q-mr-xs" />
                        {{ props.row.position?.name || "Sin Cargo" }}
                      </div>
                    </q-card-section>

                    <q-separator />

                    <q-card-actions align="between" class="bg-grey-1 q-px-md">
                      <div>
                        <q-badge
                          :color="
                            props.row.rationType === 'NORMAL'
                              ? 'primary'
                              : 'warning'
                          "
                        >
                          {{
                            props.row.rationType === "NORMAL"
                              ? "Normal"
                              : "Dieta Médica"
                          }}
                        </q-badge>
                      </div>
                      <div>
                        <q-btn
                          flat
                          round
                          color="primary"
                          icon="edit"
                          size="sm"
                          @click="openEditDialog(props.row)"
                        >
                          <q-tooltip>Editar Trabajador</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          color="negative"
                          icon="delete"
                          size="sm"
                          @click="deleteDiner(props.row)"
                        >
                          <q-tooltip>Eliminar Trabajador</q-tooltip>
                        </q-btn>
                      </div>
                    </q-card-actions>
                  </q-card>
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal de Importación Excel -->
    <SharedDinerExcelUploader
      v-model="isModalOpen"
      :is-processing="isProcessing"
      :is-validation-screen="isValidationScreen"
      :valid-rows="validRows"
      :invalid-rows="invalidRows"
      :upload-progress="uploadProgress"
      @file-selected="parseExcel"
      @confirm-import="confirmImport"
      @cancel-validation="cancelValidation"
      @download-template="downloadTemplate"
    />

    <!-- Modal de Migración Quirúrgica -->
    <MassMigrationModal
      v-model="isMigrationModalOpen"
      :is-migrating="isMigrating"
      v-model:targetDiningRoomId="targetDiningRoomId"
      :selected-count="selectedDiners.length"
      @execute="executeMigration"
      @cancel="closeMigrationModal"
    />

    <!-- Modal para Nuevo/Editar Trabajador -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">
            {{ isEdit ? "Editar Comensal" : "Nuevo Comensal" }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-md">
          <q-input
            v-model="formData.cedula"
            label="Cédula de Identidad"
            outlined
            dense
            autofocus
          />
          <q-input
            v-model="formData.name"
            label="Nombres y Apellidos"
            outlined
            dense
          />
          <q-select
            v-model="formData.rationType"
            :options="rationOptions"
            emit-value
            map-options
            label="Tipo de Dieta/Ración"
            outlined
            dense
          />
          <q-select
            v-model="formData.positionId"
            :options="positionOptions"
            emit-value
            map-options
            label="Cargo / Puesto de Trabajo"
            outlined
            dense
            clearable
          />
          <q-select
            v-model="formData.siteId"
            :options="siteOptions"
            emit-value
            map-options
            label="Sede Base *"
            outlined
            dense
          />
          <!-- Cascada de Dependencias para Admins Globales -->
          <template
            v-if="
              authStore.hasPermission('GLOBAL_ACCESS', 'canRead') &&
              !authStore.user?.subdependencyId &&
              !authStore.user?.dependencyId
            "
          >
            <q-select
              v-model="formData.dependencyId"
              :options="dependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Dependencia Principal"
              outlined
              dense
              clearable
              @update:model-value="formData.subdependencyId = null"
            />
            <q-select
              v-model="formData.subdependencyId"
              :options="subdependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Subdependencia (Requerido para Admins)"
              outlined
              dense
              clearable
              :disable="!formData.dependencyId"
            />
          </template>
          <template
            v-else-if="
              authStore.user?.dependencyId && !authStore.user?.subdependencyId
            "
          >
            <q-select
              v-model="formData.subdependencyId"
              :options="subdependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Subdependencia"
              outlined
              dense
              hint="Restringido a su Dependencia (Gerente)"
            />
          </template>
          <template v-else-if="authStore.user?.subdependencyId">
            <q-select
              v-model="formData.subdependencyId"
              :options="subdependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Subdependencia Asignada"
              outlined
              dense
              :hint="`Dependencia: ${userDependencyName}`"
            />
          </template>
          <q-select
            v-model="formData.squadId"
            :options="squadOptions"
            emit-value
            map-options
            label="Asignar a Cuadrilla"
            outlined
            dense
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            flat
            :label="isEdit ? 'Guardar Cambios' : 'Registrar'"
            color="primary"
            @click="submit"
            :loading="dinersStore.isLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
