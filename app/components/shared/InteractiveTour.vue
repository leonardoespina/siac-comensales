<template>
  <q-dialog v-model="isOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
    <div class="bg-primary text-white flex flex-center q-pa-md">
      <!-- Botón de Cerrar (Arriba a la derecha) -->
      <q-btn
        flat round dense icon="close"
        class="absolute-top-right q-ma-md"
        @click="closeTour"
        size="lg"
      />

      <q-card class="bg-white text-dark no-shadow" style="width: 100%; max-width: 900px; border-radius: 12px;">
        <q-card-section class="bg-grey-2 text-center q-py-lg">
          <div class="text-h5 text-weight-bold text-primary">
            ¡Bienvenido al SIAC, {{ authStore.user?.name || '' }}!
          </div>
          <div class="text-subtitle1 text-grey-8">
            Sigue este breve recorrido para aprender a usar tus herramientas.
          </div>
        </q-card-section>

        <q-card-section class="q-pa-none">
          <q-stepper
            v-model="step"
            ref="stepperRef"
            color="primary"
            animated
            flat
            :vertical="$q.screen.lt.sm"
          >
            <!-- PASOS DINÁMICOS -->
            <q-step
              v-for="(s, index) in steps"
              :key="s.name"
              :name="index + 1"
              :title="s.title"
              :icon="s.icon"
              :done="step > index + 1"
            >
              <div class="row items-center q-col-gutter-lg q-py-lg">
                <div class="col-12 col-sm-4 text-center">
                  <q-icon :name="s.icon" size="100px" color="primary" class="q-mb-md" />
                </div>
                <div class="col-12 col-sm-8">
                  <div class="text-h6 text-weight-bold q-mb-sm">{{ s.title }}</div>
                  <p class="text-body1 text-grey-8" style="line-height: 1.6;">{{ s.text }}</p>
                  
                  <!-- Botón de Acción Directa Opcional -->
                  <q-btn 
                    v-if="s.route"
                    outline
                    color="primary"
                    :label="s.actionLabel || 'Ir a la pantalla'"
                    icon="launch"
                    class="q-mt-sm"
                    @click="goToRoute(s.route)"
                  />
                </div>
              </div>
            </q-step>

            <!-- NAVEGACIÓN DEL STEPPER -->
            <template v-slot:navigation>
              <q-stepper-navigation class="row justify-end q-gutter-sm q-pa-md border-top">
                <q-btn v-if="step > 1" flat color="primary" @click="$refs.stepperRef.previous()" label="Atrás" />
                <q-btn flat color="grey-7" @click="closeTour" label="Omitir Guía" />
                <q-btn 
                  v-if="step < steps.length" 
                  color="primary" 
                  @click="$refs.stepperRef.next()" 
                  label="Siguiente Paso" 
                  icon-right="arrow_forward" 
                />
                <q-btn 
                  v-else 
                  color="positive" 
                  @click="closeTour" 
                  label="¡Comenzar a Trabajar!" 
                  icon="check_circle" 
                />
              </q-stepper-navigation>
            </template>
          </q-stepper>
        </q-card-section>
      </q-card>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInteractiveTour } from '~/composables/features/useInteractiveTour'
import { useAuthStore } from '~/stores/auth'
import { useQuasar } from 'quasar'

const { isOpen, tourProfile, closeTour } = useInteractiveTour()
const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const step = ref(1)

// Reiniciar el step cuando se abre el modal
watch(isOpen, (val) => {
  if (val) step.value = 1
})

const steps = computed(() => {
  if (tourProfile.value === 'admin') {
    return [
      { 
        name: 'step1', 
        icon: 'local_shipping', 
        title: 'Paso 1: Recepción de Proveedores', 
        text: 'Cuando la mercancía llega de los proveedores, debes registrarla en el Almacén Central. El sistema multiplicará automáticamente la cantidad por el Precio Referencial para calcular el valor total ingresado.',
        route: '/inventory/receptions',
        actionLabel: 'Ir a Recepciones'
      },
      { 
        name: 'step2', 
        icon: 'move_up', 
        title: 'Paso 2: Transferencias a Cocinas', 
        text: 'Despacha los ingredientes desde el Central hacia los diferentes comedores. Todo movimiento queda auditado y requiere aprobación si cambias el flujo estándar.',
        route: '/inventory/transfers',
        actionLabel: 'Ir a Transferencias'
      },
      { 
        name: 'step3', 
        icon: 'query_stats', 
        title: 'Paso 3: Monitoreo y Reportes', 
        text: 'Revisa en tiempo real el valor económico del inventario (en dólares), monitorea las alertas de "Stop" (stock bajo mínimo) y analiza el consumo total de la empresa.',
        route: '/reports',
        actionLabel: 'Ir al Dashboard de Reportes'
      }
    ]
  } else if (tourProfile.value === 'diners') {
    return [
      { 
        name: 'step1', 
        icon: 'account_tree', 
        title: 'Paso 1: Tu Jerarquía y Cuadrillas', 
        text: 'El sistema organiza a las personas en Dependencias y Subdependencias. Empieza agrupando a tus trabajadores en "Cuadrillas" para llevar un control más rápido y eficiente.',
        route: '/diners/squads',
        actionLabel: 'Ver mis Cuadrillas'
      },
      { 
        name: 'step2', 
        icon: 'fingerprint', 
        title: 'Paso 2: Registro de Comensales', 
        text: 'Añade a los trabajadores al Directorio. Indícales su tipo de dieta (Normal o Médica) y la cuadrilla a la que pertenecen. Ellos usarán su cédula en los kioscos de los comedores operativos.',
        route: '/diners/workers',
        actionLabel: 'Ir al Directorio de Comensales'
      },
      { 
        name: 'step3', 
        icon: 'restaurant_menu', 
        title: 'Paso 3: Solicitudes Extraordinarias', 
        text: 'Si necesitas apoyar a una cuadrilla con desayunos o almuerzos que no estaban planificados o son fuera de turno, puedes enviar una solicitud digital directa a la cocina.',
        route: '/diners/requests',
        actionLabel: 'Gestionar Solicitudes'
      }
    ]
  } else {
    // Operador de Almacén/Cocina (default)
    return [
      { 
        name: 'step1', 
        icon: 'inventory', 
        title: 'Paso 1: Inventario de Cocina', 
        text: 'Revisa qué ingredientes tienes disponibles en tu despensa local. Este es el stock que utilizarás para cocinar durante tu turno.',
        route: '/kitchen/inventory',
        actionLabel: 'Ver mi Inventario'
      },
      { 
        name: 'step2', 
        icon: 'point_of_sale', 
        title: 'Paso 2: Operación del Comedor', 
        text: 'Durante el servicio, registra la asistencia de los comensales y atiende cualquier eventualidad del turno desde tu Panel Operativo.',
        route: '/kitchen/operation',
        actionLabel: 'Ir al Panel Operativo'
      },
      { 
        name: 'step3', 
        icon: 'restaurant', 
        title: 'Paso 3: Registro de Consumos', 
        text: 'Al terminar de cocinar, es VITAL que registres en el sistema las cantidades exactas de ingredientes que utilizaste. Esto rebajará tu inventario y generará el reporte de costos.',
        route: '/kitchen/operation',
        actionLabel: 'Registrar Consumo'
      }
    ]
  }
})

const goToRoute = (route: string) => {
  closeTour()
  router.push(route)
}
</script>
