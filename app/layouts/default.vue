<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useInteractiveTour } from '~/composables/features/useInteractiveTour'
import { useAppSockets } from '~/composables/layout/useAppSockets'
import AppHeader from '~/components/layout/AppHeader.vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'

const leftDrawerOpen = ref(true)
const auth = useAuthStore()
const notifications = useNotificationsStore()
const interactiveTour = useInteractiveTour()
const { initSockets } = useAppSockets()

// Inicializar sockets y notificaciones si está logueado
onMounted(() => {
  if (auth.isAuthenticated && auth.user) {
    notifications.fetchAll()
    initSockets()
    interactiveTour.checkAndOpenTour()
  }
})

// Volver a enlazar si el usuario hace login sin recargar F5
watch(() => auth.isAuthenticated, (newVal) => {
  if (newVal && auth.user) {
    notifications.fetchAll()
    initSockets()
    interactiveTour.checkAndOpenTour()
  }
})
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <!-- HEADER Y MODAL DE USUARIO -->
    <AppHeader @toggleSidebar="leftDrawerOpen = !leftDrawerOpen" />

    <!-- SIDEBAR (MENÚ LATERAL) -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <AppSidebar />
    </q-drawer>

    <!-- CONTENEDOR DE LA PÁGINA -->
    <q-page-container>
      <NuxtPage />
    </q-page-container>

    <!-- GUÍA INTERACTIVA (ONBOARDING) -->
    <SharedInteractiveTour />
  </q-layout>
</template>
