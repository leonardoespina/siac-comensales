<template>
  <div>
    <!-- VENTANA MODAL: FORMULARIO LEGACY MAESTRO-DETALLE -->
    <q-dialog v-model="form.isOpen.value" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-grey-1 fit column">
        
        <!-- Toolbar del Modal -->
        <q-bar class="bg-primary text-white q-pa-md col-auto" style="height: 60px">
          <q-icon name="restaurant_menu" size="sm" />
          <div class="text-h6 text-weight-bold q-ml-sm">Solicitud de Alimentación</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup>
            <q-tooltip>Cerrar</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section class="q-pa-md col scroll">
          <div class="row q-col-gutter-md fit">
            
            <!-- PANEL IZQUIERDO: Gestión de Alimentos -->
            <div class="col-12 col-md-3 flex column">
              <q-card bordered class="shadow-2 col flex column">
                <q-card-section class="bg-grey-3 q-py-xs col-auto">
                  <div class="text-subtitle2 text-weight-bold">Gestión de Alimentos</div>
                </q-card-section>
                <q-separator />
                
                <q-card-section class="q-gutter-y-md q-px-md q-py-sm col scroll">
                  
                  <div v-if="auth.hasPermission('GLOBAL_ACCESS', 'canRead') || auth.user?.dependencyId">
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Dependencia:</div>
                    <q-select 
                      v-model="form.filters.value.dependencyId" 
                      :options="dependenciesStore.dependencies" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                      :disable="!auth.hasPermission('GLOBAL_ACCESS', 'canRead') || !!auth.user?.dependencyId"
                      :readonly="!auth.hasPermission('GLOBAL_ACCESS', 'canRead') || !!auth.user?.dependencyId"
                    />
                  </div>
                  
                  <div v-if="!auth.user?.subdependencyId || auth.user?.subdependencyId">
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Subdependencia:</div>
                    <q-select 
                      v-model="form.filters.value.subdependencyId" 
                      :options="form.filteredSubdependencies.value" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                      :disable="!!auth.user?.subdependencyId"
                      :readonly="!!auth.user?.subdependencyId"
                    />
                  </div>
                  
                  <div>
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Cuadrilla:</div>
                    <q-select 
                      v-model="form.filters.value.squadId" 
                      :options="form.filteredSquads.value" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                      :disable="form.isViewMode.value"
                    />
                  </div>
                  
                  <div class="row q-col-gutter-sm">
                    <div class="col-12">
                      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Fecha de Solicitud:</div>
                      <q-input 
                        v-model="form.formDateText.value" 
                        label="Seleccione la fecha" 
                        outlined 
                        dense 
                        bg-color="white"
                        readonly
                      >
                        <template v-slot:append>
                          <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                              <q-date 
                                v-model="form.filters.value.date" 
                                mask="YYYY-MM-DD"
                                :options="form.allowedDates"
                              >
                                <div class="row items-center justify-end">
                                  <q-btn v-close-popup label="Cerrar" color="primary" flat />
                                </div>
                              </q-date>
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>
                  </div>

                  <!-- Seleccionar Todos -->
                  <q-card flat bordered class="bg-white">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Seleccionar Todos</div>
                      <div class="row q-col-gutter-xs">
                        <div class="col-6" v-for="shift in form.activeShifts.value" :key="shift">
                          <q-checkbox 
                            v-model="form.masterChecks.value[shift]" 
                            :label="shift" 
                            dense 
                            size="sm"
                            color="primary"
                            :disable="form.isViewMode.value"
                            @update:model-value="(val) => form.toggleAll(shift, val)"
                          />
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <!-- Tipo de Retiro -->
                  <q-card flat bordered class="bg-white">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Tipo de Retiro</div>
                      <div class="row q-col-gutter-xs">
                        <div class="col-12">
                          <q-checkbox 
                            v-model="form.masterChecks.value['MASIVO']" 
                            label="Retiro Mara (Todo Masivo)" 
                            dense 
                            size="sm" 
                            color="primary" 
                            :disable="form.isViewMode.value" 
                            @update:model-value="(val) => form.toggleAll('MASIVO', val)"
                          />
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <div>
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Comedor:</div>
                    <q-select 
                      v-model="form.filters.value.diningRoomId" 
                      :options="diningRoomsStore.diningRooms" 
                      option-value="id" 
                      option-label="name" 
                      emit-value 
                      map-options 
                      outlined 
                      dense 
                      clearable 
                      bg-color="white"
                      :disable="form.isViewMode.value"
                    />
                  </div>

                  <div>
                    <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Observación:</div>
                    <q-input 
                      v-model="form.filters.value.observations" 
                      type="textarea" 
                      outlined 
                      dense 
                      bg-color="white"
                      rows="2" 
                      :readonly="form.isViewMode.value"
                    />
                  </div>

                </q-card-section>

              </q-card>
            </div>

            <!-- PANEL DERECHO: Comensales -->
            <div class="col-12 col-md-9 flex column">
              <q-card bordered class="shadow-2 col flex column">
                <q-card-section class="bg-grey-3 q-py-xs row items-center justify-between col-auto">
                  <div class="text-subtitle2 text-weight-bold">Comensales</div>
                  <div class="row items-center q-gutter-x-sm">
                    <q-input v-model="form.tableFilter.value" dense outlined bg-color="white" placeholder="Buscar por nombre o cédula...">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </div>
                </q-card-section>
                <q-separator />
                
                <!-- Tabla Grilla -->
                <q-card-section class="q-pa-none col scroll">
                  <q-table
                    :rows="form.loadedDiners.value"
                    :columns="form.gridColumns.value"
                    :filter="form.tableFilter.value"
                    row-key="id"
                    flat
                    dense
                    square
                    hide-pagination
                    :pagination="{ rowsPerPage: 0 }"
                    table-header-class="bg-blue-9 text-white"
                    :grid="$q.screen.lt.md"
                  >
                    <template v-slot:body-cell="props">
                      <q-td :props="props" v-if="form.activeShifts.value.includes(props.col.name) || props.col.name === 'MASIVO'">
                        <q-checkbox v-model="form.gridState.value[props.row.id][props.col.name]" dense color="primary" :disable="form.isViewMode.value" />
                      </q-td>
                      <q-td :props="props" v-else-if="props.col.name === 'quantity'">
                        <q-input v-model.number="form.quantities.value[props.row.id]" type="number" dense outlined min="1" class="q-mx-auto" style="width: 70px;" :readonly="form.isViewMode.value" />
                      </q-td>
                      <q-td :props="props" v-else-if="props.col.name === 'comedor'">
                        <q-select 
                          v-model="form.dinerDiningRooms.value[props.row.id]"
                          :options="diningRoomsStore.diningRooms"
                          option-value="id"
                          option-label="name"
                          emit-value
                          map-options
                          dense
                          outlined
                          style="min-width: 140px"
                          :readonly="form.isViewMode.value"
                          clearable
                        />
                      </q-td>
                      <q-td :props="props" v-else-if="props.col.name === 'nro'">
                        {{ props.rowIndex + 1 }}
                      </q-td>
                      <q-td :props="props" v-else-if="props.col.name === 'cedula' && form.allowsBulkRequests.value">
                        <q-select
                          :model-value="props.row"
                          :options="form.availableProxyDiners.value"
                          option-label="cedula"
                          option-value="id"
                          use-input
                          dense
                          outlined
                          bg-color="white"
                          @update:model-value="(val) => form.swapDiner(props.row.id, val)"
                          :readonly="form.isViewMode.value"
                        >
                          <template v-slot:option="scope">
                            <q-item v-bind="scope.itemProps">
                              <q-item-section>
                                <q-item-label>{{ scope.opt.cedula }}</q-item-label>
                                <q-item-label caption>{{ scope.opt.name }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </template>
                        </q-select>
                      </q-td>
                      <q-td :props="props" v-else>
                        {{ props.value }}
                      </q-td>
                    </template>
                    
                    <!-- Vista de Tarjetas (Grid) para Móviles -->
                    <template v-slot:item="props">
                      <div class="q-pa-xs col-12 col-sm-6 col-md-4">
                        <q-card bordered flat class="shadow-1">
                          <q-card-section class="q-pa-sm bg-grey-2">
                            <div class="text-subtitle2 text-weight-bold text-primary">{{ props.row.name }}</div>
                            <div class="text-caption text-grey-8">C.I: {{ props.row.cedula }} - Dieta: {{ props.row.rationType }}</div>
                          </q-card-section>
                          <q-separator />
                          <q-card-section class="q-pa-sm">
                            <q-select 
                              v-model="form.dinerDiningRooms.value[props.row.id]"
                              :options="diningRoomsStore.diningRooms"
                              option-value="id"
                              option-label="name"
                              emit-value
                              map-options
                              dense
                              outlined
                              label="Comedor"
                              :readonly="form.isViewMode.value"
                              clearable
                            />
                          </q-card-section>
                          <q-separator />
                          <q-card-section class="q-pa-sm row q-col-gutter-xs">
                            <div class="col-6" v-for="shift in form.activeShifts.value" :key="shift">
                              <q-checkbox 
                                v-model="form.gridState.value[props.row.id][shift]" 
                                :label="shift" 
                                dense 
                                size="sm" 
                                color="primary"
                                :disable="form.isViewMode.value"
                              />
                            </div>
                            <div class="col-6">
                              <q-checkbox 
                                v-model="form.gridState.value[props.row.id]['MASIVO']" 
                                label="Masivo" 
                                dense 
                                size="sm" 
                                color="secondary"
                                :disable="form.isViewMode.value"
                              />
                            </div>
                          </q-card-section>
                        </q-card>
                      </div>
                    </template>
                    
                    <!-- Fila vacía -->
                    <template v-slot:no-data>
                      <div class="full-width row flex-center q-pa-xl text-grey-6">
                        Seleccione una Cuadrilla o agregue comensales por Cédula para comenzar.
                      </div>
                    </template>
                  </q-table>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <!-- Footer Fijo con Botones de Acción -->
        <q-separator />
        <q-card-actions class="bg-grey-2 justify-center q-pa-sm col-auto">
          <q-btn v-if="!form.isViewMode.value && !form.isEditMode.value" icon="check_circle" label="Enviar Solicitud" color="primary" @click="onSubmit" :loading="form.loading.value" class="q-px-md q-mx-xs shadow-2" />
          <q-btn v-if="form.isEditMode.value" icon="save" label="Guardar Cambios" color="warning" @click="onUpdate" :loading="form.loading.value" class="q-px-md q-mx-xs shadow-2" />
          <q-btn icon="exit_to_app" label="Cerrar" color="negative" outline v-close-popup class="q-px-md q-mx-xs" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- VENTANA MODAL: CONFIRMACION DE SOLICITUD -->
    <q-dialog v-model="form.isConfirmOpen.value" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Confirmar Solicitud</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-subtitle1 q-mb-sm">Resumen de la solicitud para el <strong>{{ history.formatDate(form.requestSummary.value.date) }}</strong>:</div>
          <q-list bordered separator class="rounded-borders">
            <q-item v-for="(qty, shift) in form.requestSummary.value.shifts" :key="shift">
              <q-item-section>
                <q-item-label>{{ shift }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="secondary" :label="qty + ' platos'" />
              </q-item-section>
            </q-item>
            <q-item class="bg-grey-2 text-weight-bold">
              <q-item-section>
                <q-item-label>Total General</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="primary" :label="form.requestSummary.value.total + ' platos'" />
              </q-item-section>
            </q-item>
          </q-list>
          <div class="q-mt-md text-body2 text-grey-8">
            ¿Está seguro que desea procesar esta solicitud?
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-2">
          <q-btn flat label="Cancelar" color="negative" v-close-popup />
          <q-btn label="Confirmar" color="primary" @click="onConfirmSubmit" :loading="form.loading.value" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { useDinerRequestForm } from '~/composables/features/useDinerRequestForm'
import { useDinerRequestHistory } from '~/composables/features/useDinerRequestHistory'
import { useAuthStore } from '~/stores/auth'
import { useDependenciesStore } from '~/stores/dependencies'
import { useDiningRoomsStore } from '~/stores/diningRooms'

const emit = defineEmits(['success'])

const form = useDinerRequestForm()
const history = useDinerRequestHistory()
const auth = useAuthStore()
const dependenciesStore = useDependenciesStore()
const diningRoomsStore = useDiningRoomsStore()

async function onSubmit() {
  form.prepareSubmit()
}

async function onConfirmSubmit() {
  const success = await form.executeSubmit()
  if (success) {
    emit('success')
  }
}

async function onUpdate() {
  await form.submitUpdate()
  emit('success')
}

// Exponer funciones necesarias para que el componente padre pueda interactuar con el modal
defineExpose({
  openCreate: form.openCreate,
  loadExistingData: form.loadExistingData
})
</script>
