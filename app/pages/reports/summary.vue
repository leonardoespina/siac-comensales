<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h4 text-weight-bold text-primary">
          {{
            controller.groupBy.value === 'SITE' ? 'Resumen Consolidado por Sedes'
            : controller.groupBy.value === 'SUBDEPENDENCY' ? 'Resumen Consolidado por Subdependencias'
            : 'Resumen Consolidado por Gerencias'
          }}
        </div>
        <div class="text-subtitle2 text-grey-7">Matriz de consumos acumulados por servicio y dependencia</div>
      </div>
      <q-btn
        color="positive"
        icon="table_view"
        label="Exportar Excel"
        :disable="controller.rows.value.length === 0"
        @click="controller.exportExcel"
      />
    </div>

    <!-- Panel de Filtros -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <!-- Fecha Desde -->
          <div class="col-12 col-sm-6 col-md-2">
            <q-input
              :model-value="controller.dateFrom.value"
              @update:model-value="controller.setDateFrom"
              type="date"
              label="Fecha Desde"
              outlined
              dense
            />
          </div>

          <!-- Fecha Hasta -->
          <div class="col-12 col-sm-6 col-md-2">
            <q-input
              :model-value="controller.dateTo.value"
              @update:model-value="controller.setDateTo"
              type="date"
              label="Fecha Hasta"
              outlined
              dense
            />
          </div>

          <!-- Condición / Despacho -->
          <div class="col-12 col-sm-6 col-md-2">
            <div class="text-caption text-grey-8 q-mb-xs">Condición / Estado:</div>
            <q-select
              :model-value="controller.selectedStatus.value"
              @update:model-value="controller.setSelectedStatus"
              :options="controller.statusOptions"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <!-- Toggle Nivel de Agrupación -->
          <div class="col-12 col-sm-6 col-md-3">
            <div class="text-caption text-grey-8 q-mb-xs">Nivel Agrupación:</div>
            <q-btn-toggle
              :model-value="controller.groupBy.value"
              @update:model-value="controller.setGroupBy"
              spread
              no-caps
              toggle-color="primary"
              color="grey-3"
              text-color="dark"
              :options="[
                { label: 'Gerencia', value: 'DEPENDENCY' },
                { label: 'Subdep.', value: 'SUBDEPENDENCY' },
                { label: 'Sede', value: 'SITE' }
              ]"
            />
          </div>

          <!-- Selector de Sede -->
          <div class="col-12 col-sm-6 col-md-1">
            <div class="text-caption text-grey-8 q-mb-xs">
              <span v-if="controller.groupBy.value === 'SITE'" class="text-primary text-weight-medium">
                <q-icon name="filter_alt" size="xs" /> Filtrar Sede:
              </span>
              <span v-else>Sede (filtro):</span>
            </div>
            <q-select
              :model-value="controller.selectedSiteId.value"
              @update:model-value="controller.setSelectedSiteId"
              :options="controller.sitesOptions.value"
              outlined
              dense
              emit-value
              map-options
            >
              <template v-slot:append>
                <q-tooltip v-if="controller.groupBy.value !== 'SITE'" max-width="220px">
                  Filtra los datos a los comedores de esta sede.<br>
                  Combínalo con el nivel de agrupación para ver el desglose por gerencia o subdependencia.
                </q-tooltip>
              </template>
            </q-select>
          </div>

          <!-- Selector de Dependencia -->
          <div class="col-12 col-sm-6 col-md-2">
            <div class="text-caption text-grey-8 q-mb-xs">Gerencia / Dependencia:</div>
            <q-select
              :model-value="controller.selectedDependencyId.value"
              @update:model-value="controller.setSelectedDependencyId"
              :options="controller.dependenciesOptions.value"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <!-- Botón de Búsqueda -->
          <div class="col-12 col-sm-6 col-md-2 row items-end">
            <q-btn
              color="primary"
              icon="search"
              label="Consultar"
              class="full-width q-py-xs"
              :loading="controller.loading.value"
              @click="controller.fetchReport"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Banner: aviso cuando groupBy=SITE + sede específica seleccionada -->
    <q-banner
      v-if="controller.groupBy.value === 'SITE' && controller.selectedSiteId.value"
      class="bg-blue-1 text-blue-9 q-mb-md rounded-borders"
      dense
    >
      <template v-slot:avatar>
        <q-icon name="info" color="blue-7" />
      </template>
      <span class="text-weight-medium">Vista de sede específica:</span>
      verás solo 1 fila con el total de esa sede.
      Para ver el desglose interno, cambia el nivel de agrupación a
      <q-btn
        flat dense no-caps size="sm" color="primary" label="Gerencia"
        @click="controller.setGroupBy('DEPENDENCY')"
      /> o
      <q-btn
        flat dense no-caps size="sm" color="primary" label="Subdependencia"
        @click="controller.setGroupBy('SUBDEPENDENCY')"
      />
      (el filtro de sede se mantiene activo).
    </q-banner>

    <!-- Banner: hint cuando groupBy≠SITE + sede seleccionada (contexto activo) -->
    <q-banner
      v-else-if="controller.groupBy.value !== 'SITE' && controller.selectedSiteId.value"
      class="bg-green-1 text-green-9 q-mb-md rounded-borders"
      dense
    >
      <template v-slot:avatar>
        <q-icon name="filter_alt" color="green-7" />
      </template>
      Mostrando datos filtrados por la sede seleccionada.
      <q-btn
        flat dense no-caps size="sm" color="green-8" label="Ver todas las sedes"
        @click="controller.setSelectedSiteId(null)"
      />
    </q-banner>

    <!-- Tabla Matricial Consolidada -->
    <q-card>
      <q-table
        :rows="tableRowsWithTotals"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        :loading="controller.loading.value"
        no-data-label="No hay datos registrados para el rango de fechas seleccionado"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
      >
        <!-- Slot de Cabecera Personalizado estilo Institucional -->
        <template v-slot:header="props">
          <q-tr :props="props" class="bg-primary text-white text-weight-bold">
            <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <!-- Slot de Cuerpo con Resaltado para la Fila de Totales Generales -->
        <template v-slot:body="props">
          <q-tr
            :props="props"
            :class="props.row.isTotalRow ? 'bg-blue-1 text-primary text-weight-bold' : ''"
          >
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.value }}
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useReportSummary } from '~/composables/useReportSummary'

const controller = useReportSummary()

onMounted(async () => {
  await controller.loadCatalogs()
  await controller.fetchReport()
})

// Columnas dinámicas según el nivel de agrupación
const columns = computed(() => {
  if (controller.groupBy.value === 'SUBDEPENDENCY') {
    return [
      { name: 'dependencyName', label: 'GERENCIA (DEPENDENCIA)', field: 'dependencyName', align: 'left' as const, sortable: true },
      { name: 'name', label: 'SUBDEPENDENCIA (ADSCRIPCIÓN)', field: 'name', align: 'left' as const, sortable: true },
      { name: 'desayuno', label: 'DESAYUNO', field: 'desayuno', align: 'center' as const },
      { name: 'almuerzo', label: 'ALMUERZO', field: 'almuerzo', align: 'center' as const },
      { name: 'cena', label: 'CENA', field: 'cena', align: 'center' as const },
      { name: 'sobrecena', label: 'SOBRE-CENA', field: 'sobrecena', align: 'center' as const },
      { name: 'total', label: 'Total general', field: 'total', align: 'center' as const }
    ]
  }

  if (controller.groupBy.value === 'SITE') {
    return [
      { name: 'name', label: 'SEDE', field: 'name', align: 'left' as const, sortable: true },
      { name: 'desayuno', label: 'DESAYUNO', field: 'desayuno', align: 'center' as const },
      { name: 'almuerzo', label: 'ALMUERZO', field: 'almuerzo', align: 'center' as const },
      { name: 'cena', label: 'CENA', field: 'cena', align: 'center' as const },
      { name: 'sobrecena', label: 'SOBRE-CENA', field: 'sobrecena', align: 'center' as const },
      { name: 'total', label: 'Total general', field: 'total', align: 'center' as const }
    ]
  }

  return [
    { name: 'name', label: 'GERENCIA', field: 'name', align: 'left' as const, sortable: true },
    { name: 'desayuno', label: 'DESAYUNO', field: 'desayuno', align: 'center' as const },
    { name: 'almuerzo', label: 'ALMUERZO', field: 'almuerzo', align: 'center' as const },
    { name: 'cena', label: 'CENA', field: 'cena', align: 'center' as const },
    { name: 'sobrecena', label: 'SOBRE-CENA', field: 'sobrecena', align: 'center' as const },
    { name: 'total', label: 'Total general', field: 'total', align: 'center' as const }
  ]
})

// Filas incluyendo la fila resumen inferior "Total general"
const tableRowsWithTotals = computed(() => {
  const dataRows = controller.rows.value.map(r => ({ ...r, isTotalRow: false }))

  if (dataRows.length === 0) return []

  const totalRow = {
    id: 'TOTAL_SUMMARY_ROW',
    name: 'Total general',
    dependencyName: 'Total general',
    desayuno: controller.totals.value.desayuno,
    almuerzo: controller.totals.value.almuerzo,
    cena: controller.totals.value.cena,
    sobrecena: controller.totals.value.sobrecena,
    total: controller.totals.value.grandTotal,
    isTotalRow: true
  }

  return [...dataRows, totalRow]
})
</script>
