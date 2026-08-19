<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <q-list>
    <q-item-label header>Navegación</q-item-label>
    
    <!-- Enlace al Dashboard -->
    <q-item clickable to="/">
      <q-item-section avatar>
        <q-icon name="dashboard" />
      </q-item-section>
      <q-item-section>Dashboard</q-item-section>
    </q-item>
    
    <q-separator class="q-my-md" />

    <!-- Menú Dinámico: Gestión de Comensales -->
    <q-expansion-item
      icon="groups"
      label="Gestión de Comensales"
      v-if="auth.isAuthenticated && (auth.hasPermission('DINERS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canRead') || auth.hasPermission('MY_SQUADS', 'canRead') || auth.hasPermission('EXTRAORDINARY', 'canRead'))"
    >
      <q-list class="q-pl-lg">
        <q-item clickable v-ripple to="/diners/requests" active-class="text-primary" v-if="auth.hasPermission('DINERS_REQUESTS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canCreate')">
          <q-item-section avatar><q-icon name="restaurant_menu" size="sm" /></q-item-section>
          <q-item-section>Solicitar Comidas</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple to="/diners/squads" active-class="text-primary" v-if="auth.hasPermission('MY_SQUADS', 'canRead')">
          <q-item-section avatar><q-icon name="engineering" size="sm" /></q-item-section>
          <q-item-section>Mis Cuadrillas</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple to="/diners/dispatch" active-class="bg-blue-1 text-primary" v-if="auth.hasPermission('DINERS_REQUESTS', 'canRead')">
          <q-item-section avatar><q-icon name="meeting_room" size="sm" /></q-item-section>
          <q-item-section>Despacho Kiosco</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/extraordinary" active-class="bg-orange-1 text-orange-9" v-if="auth.hasPermission('EXTRAORDINARY', 'canRead')">
          <q-item-section avatar><q-icon name="badge" size="sm" /></q-item-section>
          <q-item-section>Visitas Extras</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/workers" active-class="text-primary" v-if="auth.hasPermission('DINERS', 'canRead')">
          <q-item-section avatar><q-icon name="fingerprint" size="sm" /></q-item-section>
          <q-item-section>Comensales Físicos</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/assisted" active-class="bg-blue-1 text-primary">
          <q-item-section avatar>
            <q-icon name="support_agent" />
          </q-item-section>
          <q-item-section>Despacho Asistido</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple to="/diners/dispatch-history" active-class="bg-blue-1 text-primary">
          <q-item-section avatar>
            <q-icon name="history" />
          </q-item-section>
          <q-item-section>Historial de Despachos</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple to="/diners/massive" active-class="bg-blue-1 text-primary" v-if="auth.hasPermission('MASSIVE_DISPATCH', 'canRead') || auth.hasPermission('GLOBAL_ACCESS', 'canRead')">
          <q-item-section avatar>
            <q-icon name="takeout_dining" />
          </q-item-section>
          <q-item-section>Retiros Masivos</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>



    <!-- Menú Dinámico: Seguridad y Estructura Organizacional -->
    <q-expansion-item
      icon="security"
      label="Seguridad"
      v-if="auth.isAuthenticated && (auth.hasPermission('SECURITY', 'canRead') || auth.hasPermission('BIOMETRIC', 'canRead') || auth.hasPermission('DINING_ROOMS', 'canRead') || auth.hasPermission('SQUADS', 'canRead') || auth.hasPermission('DEPENDENCIES', 'canRead') || auth.hasPermission('POSITIONS', 'canRead') || auth.hasPermission('AUDIT', 'canRead'))"
    >
      <q-list class="q-pl-lg">
        <!-- Catálogos Organizacionales -->
        <q-item clickable v-ripple to="/diners/sites" active-class="text-primary" v-if="auth.hasPermission('SITES', 'canRead')">
          <q-item-section avatar><q-icon name="domain" size="sm" /></q-item-section>
          <q-item-section>Gestión de Sedes</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/requests" active-class="text-primary" v-if="auth.hasPermission('DINERS_REQUESTS', 'canRead')">
          <q-item-section avatar><q-icon name="assignment" size="sm" /></q-item-section>
          <q-item-section>Solicitudes de Comedor</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/dining-rooms" active-class="text-primary" v-if="auth.hasPermission('DINING_ROOMS', 'canRead')">
          <q-item-section avatar><q-icon name="restaurant" size="sm" /></q-item-section>
          <q-item-section>Gestión de Comedores</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/security/meal-schedules" active-class="text-primary" v-if="auth.hasPermission('MEAL_SCHEDULES', 'canRead') || auth.hasPermission('GLOBAL_ACCESS', 'canRead')">
          <q-item-section avatar><q-icon name="schedule" size="sm" /></q-item-section>
          <q-item-section>Horarios de Comedor</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/squad-catalog" active-class="text-primary" v-if="auth.hasPermission('SQUADS', 'canCreate') || auth.hasPermission('SQUADS', 'canRead')">
          <q-item-section avatar><q-icon name="list_alt" size="sm" /></q-item-section>
          <q-item-section>Catálogo de Cuadrillas</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/positions" active-class="text-primary" v-if="auth.hasPermission('POSITIONS', 'canRead')">
          <q-item-section avatar><q-icon name="badge" size="sm" /></q-item-section>
          <q-item-section>Catálogo de Cargos</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/dependencies" active-class="text-primary" v-if="auth.hasPermission('DEPENDENCIES', 'canRead')">
          <q-item-section avatar><q-icon name="account_tree" size="sm" /></q-item-section>
          <q-item-section>Árbol Organizacional</q-item-section>
        </q-item>

        <q-separator class="q-my-sm" />

        <!-- Módulos Core de Seguridad -->
        <q-item clickable v-ripple to="/security/biometric" active-class="text-primary" v-if="auth.hasPermission('BIOMETRIC', 'canRead')">
          <q-item-section avatar><q-icon name="fingerprint" size="sm" /></q-item-section>
          <q-item-section>Gestión Biométrica</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security/users" active-class="text-primary" v-if="auth.hasPermission('SECURITY', 'canRead')">
          <q-item-section avatar><q-icon name="manage_accounts" size="sm" /></q-item-section>
          <q-item-section>Usuarios</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security/roles" active-class="text-primary" v-if="auth.hasPermission('SECURITY', 'canRead')">
          <q-item-section avatar><q-icon name="admin_panel_settings" size="sm" /></q-item-section>
          <q-item-section>Roles y Permisos</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security/audit" active-class="text-primary" v-if="auth.hasPermission('AUDIT', 'canRead')">
          <q-item-section avatar><q-icon name="history" size="sm" /></q-item-section>
          <q-item-section>Auditoría</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/security/settings" active-class="text-primary" v-if="auth.hasPermission('SECURITY', 'canUpdate')">
          <q-item-section avatar><q-icon name="settings" size="sm" /></q-item-section>
          <q-item-section>Configuraciones Globales</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>

    <!-- Menú de Reportes -->
    <q-expansion-item
      icon="analytics"
      label="Reportes y Estadísticas"
      v-if="auth.isAuthenticated && (auth.hasPermission('REPORTS', 'canRead') || auth.hasPermission('GLOBAL_ACCESS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canRead'))"
    >
      <q-list class="q-pl-lg">
        <q-item clickable v-ripple to="/reports/master" active-class="bg-blue-1 text-primary">
          <q-item-section avatar><q-icon name="summarize" size="sm" /></q-item-section>
          <q-item-section>Reporte Maestro (Kardex)</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>
  </q-list>
</template>
