<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Horarios de Comedor</div>

    <SharedCrudTable
      title="Turnos Oficiales"
      :columns="columns"
      :rows="store.schedules"
      :filter="filter"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-shiftType="props">
        <q-td :props="props">
          <q-badge color="accent" :label="props.row.shiftType" />
        </q-td>
      </template>

      <!-- Aquí formateamos la vista a AM/PM según solicitó el usuario -->
      <template v-slot:body-cell-startTime="props">
        <q-td :props="props" align="center">
          {{ formatAmPm(props.row.startTime) }}
        </q-td>
      </template>

      <template v-slot:body-cell-endTime="props">
        <q-td :props="props" align="center">
          {{ formatAmPm(props.row.endTime) }}
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <SharedStatusBadge :active="props.row.active" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <!-- Para mantener simpleza, el backend restringe edición de tiempo. Solo se puede cambiar status. -->
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal Formulario de Horarios -->
    <SharedFormDialog
      v-model="isOpen"
      :title="isEditing ? 'Desactivar/Activar Turno' : 'Configurar Nuevo Turno'"
      :loading="loading"
      @save="submit"
    >
      <div class="row q-col-gutter-md">
        
        <div class="col-12" v-if="!isEditing">
          <q-select 
            v-model="form.shiftType" 
            :options="['DESAYUNO', 'ALMUERZO', 'CENA', 'SOBRECENA']" 
            label="Turno" 
            outlined 
            dense 
            :rules="[val => !!val || 'Requerido']" 
          />
        </div>

        <div class="col-12 col-md-6">
          <q-input 
            v-model="form.startTime" 
            label="Hora de Inicio" 
            outlined 
            dense 
            type="time"
            :rules="[val => !!val || 'Requerido']"
          />
        </div>

        <div class="col-12 col-md-6">
          <q-input 
            v-model="form.endTime" 
            label="Hora de Cierre" 
            outlined 
            dense 
            type="time"
            :rules="[val => !!val || 'Requerido']"
          />
        </div>

        <div class="col-12" v-if="isEditing">
          <q-toggle v-model="form.active" label="Turno Activo" color="positive" />
        </div>
      </div>
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMealSchedulesStore } from '~/stores/mealSchedules'
import { useMealScheduleForm } from '~/composables/features/useMealScheduleForm'

const store = useMealSchedulesStore()
const { isOpen, isEditing, loading, form, openCreate, openEdit, submit } = useMealScheduleForm()
const filter = ref('')

const columns = [
  { name: 'shiftType', label: 'Turno', field: 'shiftType', align: 'left', sortable: true },
  { name: 'startTime', label: 'Hora de Inicio', field: 'startTime', align: 'center' },
  { name: 'endTime', label: 'Hora de Cierre', field: 'endTime', align: 'center' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

// Utilidad para transformar "14:30" a "02:30 PM" para visualización (Requerimiento del usuario)
function formatAmPm(timeString: string | undefined): string {
  if (!timeString) return '--:--'
  const [hStr, mStr] = timeString.split(':')
  let hours = parseInt(hStr, 10)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // la hora '0' se muestra como '12'
  const finalHour = hours < 10 ? `0${hours}` : hours
  return `${finalHour}:${mStr} ${ampm}`
}

onMounted(async () => {
  await store.fetchSchedules()
})
</script>
