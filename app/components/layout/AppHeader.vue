<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useInteractiveTour } from '~/composables/features/useInteractiveTour'
import { useQuasar } from 'quasar'

const emit = defineEmits(['toggleSidebar'])

const auth = useAuthStore()
const notifications = useNotificationsStore()
const interactiveTour = useInteractiveTour()
const router = useRouter()
const $q = useQuasar()

const isPasswordDialogOpen = ref(false)
const changingPassword = ref(false)
const passwordForm = ref({ old: '', new: '', confirm: '' })

const handleNotificationClick = async (n: Notification) => {
  if (!n.isRead) {
    await notifications.markAsRead(n.id)
  }
  if (n.link) {
    router.push(n.link)
  }
}

const submitPasswordChange = async () => {
  changingPassword.value = true
  try {
    await auth.changePassword(passwordForm.value.old, passwordForm.value.new)
    $q.notify({ type: 'positive', message: 'Contraseña actualizada. Úsala la próxima vez.' })
    isPasswordDialogOpen.value = false
    passwordForm.value = { old: '', new: '', confirm: '' }
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al cambiar clave' })
  } finally {
    changingPassword.value = false
  }
}
</script>

<template>
  <q-header elevated class="bg-primary">
    <q-toolbar>
      <q-btn
        flat dense round
        icon="menu"
        @click="emit('toggleSidebar')"
      />
      <q-toolbar-title>SIAC</q-toolbar-title>

      <!-- INFO DEL USUARIO LOGUEADO -->
      <div v-if="auth.isAuthenticated" class="row items-center q-gutter-md">

        <!-- BOTÓN DE AYUDA / TOUR -->
        <q-btn flat round dense icon="help_outline" @click="interactiveTour.openTour()">
          <q-tooltip>Ver Guía Rápida</q-tooltip>
        </q-btn>
        
        <!-- CAMPANITA DE NOTIFICACIONES -->
        <q-btn flat round dense icon="notifications">
          <q-badge v-if="notifications.unreadCount > 0" color="red" floating rounded>
            {{ notifications.unreadCount }}
          </q-badge>
          <q-menu fit>
            <q-list style="min-width: 250px">
              <q-item-label header>Notificaciones</q-item-label>
              
              <q-item v-if="notifications.notifications.length === 0">
                <q-item-section class="text-grey">Sin notificaciones nuevas</q-item-section>
              </q-item>

              <q-item 
                v-for="n in notifications.notifications" 
                :key="n.id" 
                clickable 
                v-ripple
                :class="n.isRead ? '' : 'bg-blue-1'"
                @click="handleNotificationClick(n)"
              >
                <q-item-section>
                  <q-item-label :class="n.isRead ? '' : 'text-weight-bold'">{{ n.title }}</q-item-label>
                  <q-item-label caption lines="2">{{ n.message }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <!-- MENÚ DE USUARIO -->
        <q-btn flat dense no-caps>
          <div class="row items-center">
            <div v-if="$q.screen.gt.xs" class="column text-right q-pr-sm">
              <span class="text-weight-bold ellipsis" style="font-size: 14px; max-width: 150px;">{{ auth.user?.name }}</span>
              <span class="text-caption ellipsis" style="line-height: 1; max-width: 150px;">{{ auth.user?.role?.name }}</span>
            </div>
            <q-avatar v-else size="sm" color="blue-9" text-color="white" class="q-mr-xs">
              {{ auth.user?.name?.charAt(0)?.toUpperCase() || 'U' }}
            </q-avatar>
            <q-icon name="arrow_drop_down" />
          </div>

          <q-menu fit>
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="isPasswordDialogOpen = true">
                <q-item-section avatar><q-icon name="key" size="sm" /></q-item-section>
                <q-item-section>Cambiar Clave</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="auth.logout()">
                <q-item-section avatar><q-icon name="logout" color="negative" size="sm" /></q-item-section>
                <q-item-section class="text-negative">Cerrar Sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-toolbar>
  </q-header>

  <!-- MODAL CAMBIAR CONTRASEÑA -->
  <SharedFormDialog
    v-model="isPasswordDialogOpen"
    title="Cambiar Contraseña"
    :loading="changingPassword"
    save-label="Actualizar"
    @save="submitPasswordChange"
  >
    <q-input
      v-model="passwordForm.old"
      label="Contraseña Actual *"
      type="password"
      outlined dense autofocus
      :rules="[val => !!val || 'Requerida']"
    />
    <q-input
      v-model="passwordForm.new"
      label="Nueva Contraseña *"
      type="password"
      outlined dense class="q-mt-md"
      :rules="[val => val.length >= 6 || 'Mínimo 6 caracteres']"
    />
    <q-input
      v-model="passwordForm.confirm"
      label="Confirmar Nueva Contraseña *"
      type="password"
      outlined dense class="q-mt-md"
      :rules="[
        val => !!val || 'Requerida',
        val => val === passwordForm.new || 'Las contraseñas no coinciden'
      ]"
    />
  </SharedFormDialog>
</template>
