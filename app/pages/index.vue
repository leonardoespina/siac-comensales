<script setup lang="ts">
import { useDashboard } from '~/composables/features/useDashboard'

const {
  auth,
  canManageDiners,
  metrics,
  loadingMetrics,
  goTo
} = useDashboard()

</script>

<template>
  <q-page :class="['bg-grey-1', $q.screen.lt.sm ? 'q-pa-sm' : 'q-pa-lg']">
    
    <!-- HEADER GENERAL -->
    <div class="q-mb-xl">
      <div class="text-h4 text-weight-bold text-primary">
        Hola, {{ auth.user?.name || 'Usuario' }}
      </div>
      <div class="text-subtitle1 text-grey-7">
        Bienvenido al panel de control de Comensales.
      </div>
    </div>

    <!-- CONTENEDOR MODULAR -->
    <div class="row q-col-gutter-xl">

      <!-- ========================================== -->
      <!-- WIDGET: MÓDULO DE COMENSALES               -->
      <!-- ========================================== -->
      <div class="col-12" v-if="canManageDiners">
        <div class="text-h6 text-weight-bold text-grey-8 q-mb-md">Accesos Rápidos</div>
        <div class="row q-col-gutter-lg">
          
          <!-- Atajos de Comensales -->
          <div class="col-12 col-md-6">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-card flat bordered class="cursor-pointer bg-primary text-white hover-up" @click="goTo('/diners/workers')">
                  <q-card-section class="row items-center">
                    <q-icon name="fingerprint" size="xl" class="q-mr-md opacity-80" />
                    <div>
                      <div class="text-h6 text-weight-bold">Directorio Biométrica</div>
                      <div class="text-subtitle2 text-blue-2">Registrar o buscar comensales</div>
                    </div>
                    <q-space />
                    <q-icon name="arrow_forward" size="sm" />
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/diners/squads')">
                  <q-card-section class="row items-center">
                    <q-avatar color="blue-1" text-color="blue-7" icon="engineering" class="q-mr-md" />
                    <div>
                      <div class="text-subtitle1 text-weight-bold">Mis Cuadrillas</div>
                      <div class="text-caption text-grey-6">Ver grupos asignados</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/diners/requests')">
                  <q-card-section class="row items-center">
                    <q-avatar color="green-1" text-color="green-7" icon="restaurant_menu" class="q-mr-md" />
                    <div>
                      <div class="text-subtitle1 text-weight-bold">Peticiones de Comida</div>
                      <div class="text-caption text-grey-6">Solicitudes y apoyos</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
          
          <!-- Panel de Métricas de Comensales -->
          <div class="col-12 col-md-6">
            <q-card flat bordered class="h-full bg-grey-2">
              <q-card-section class="q-pb-none">
                <div class="text-h6 text-weight-bold text-dark row items-center">
                  <q-icon name="analytics" class="q-mr-sm" color="primary" />
                  Métricas Operativas
                </div>
                <div class="text-caption text-grey-7">Resumen de actividad diaria</div>
              </q-card-section>
              
              <q-card-section class="row q-col-gutter-sm text-center q-pt-md">
                <div class="col-6">
                  <q-card class="bg-white q-pa-md h-full" flat bordered>
                    <q-icon name="groups" size="xl" color="primary" class="q-mb-sm opacity-80" />
                    <div class="text-h5 text-weight-bold text-primary">
                      <q-spinner-dots v-if="loadingMetrics" size="sm" />
                      <span v-else>{{ metrics.registeredDiners }}</span>
                    </div>
                    <div class="text-caption text-grey-8">Comensales Registrados</div>
                  </q-card>
                </div>
                <div class="col-6">
                  <q-card class="bg-white q-pa-md h-full" flat bordered>
                    <q-icon name="receipt_long" size="xl" color="orange-8" class="q-mb-sm opacity-80" />
                    <div class="text-h5 text-weight-bold text-orange-9">
                      <q-spinner-dots v-if="loadingMetrics" size="sm" />
                      <span v-else>{{ metrics.todayRequests }}</span>
                    </div>
                    <div class="text-caption text-grey-8">Peticiones de Hoy</div>
                  </q-card>
                </div>
              </q-card-section>
            </q-card>
          </div>

        </div>
      </div>

    </div>
  </q-page>
</template>

<style scoped>
.my-card {
  height: 100%;
}
.hover-up {
  transition: transform 0.2s;
}
.hover-up:hover {
  transform: translateY(-4px);
}
.h-full {
  height: 100%;
}
</style>
