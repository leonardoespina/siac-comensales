<template>
  <q-page class="q-pa-md q-pa-md-lg">
    <div class="row q-col-gutter-lg">

      <!-- ════════════════════════════════════════════
           COLUMNA IZQUIERDA: Control CRUD Biométrico
           ════════════════════════════════════════════ -->
      <div class="col-12 col-lg-7">

        <!-- Header de página -->
        <div class="row items-center q-mb-md">
          <q-icon name="fingerprint" size="36px" color="primary" class="q-mr-sm" />
          <div>
            <div class="text-h5 text-weight-bold text-grey-9">Centro de Control Biométrico</div>
            <div class="text-caption text-grey-6">Gestión de huellas y sincronización multi-sede Hikvision</div>
          </div>
        </div>

        <!-- Buscador -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <q-form @submit.prevent="searchDiner" class="row q-col-gutter-sm items-center">
              <div class="col-8 col-sm-9">
                <q-input
                  v-model="searchCedula"
                  label="Cédula del Comensal"
                  outlined
                  dense
                  autofocus
                  clearable
                  @clear="clearSearch"
                  bg-color="white"
                  :loading="isSearching"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              <div class="col-4 col-sm-3">
                <q-btn
                  color="primary"
                  label="Buscar"
                  type="submit"
                  class="full-width"
                  size="md"
                  :disable="!searchCedula || isSearching"
                  unelevated
                />
              </div>
            </q-form>
            <div class="text-caption text-grey-5 q-mt-xs q-ml-xs">Ej: V-12345678 o 12345678</div>
          </q-card-section>
        </q-card>


        <!-- ── Resultado: Comensal Encontrado ───────────────────────── -->
        <q-card v-if="diner" flat bordered>
          <q-card-section>
            <div class="row items-start q-col-gutter-md">

              <!-- Avatar con foto facial real -->
              <div class="col-auto">
                <q-avatar
                  size="96px"
                  :color="diner.biometricRecord?.templates?.length > 0 || (facePhotoUrl && !facePhotoError) ? 'positive' : 'grey-4'"
                  text-color="white"
                >
                  <img
                    v-if="facePhotoUrl && !facePhotoError"
                    :src="facePhotoUrl"
                    @error="onFacePhotoError"
                  />
                  <q-icon v-else name="person" size="52px" />
                  <q-badge
                    floating
                    color="white"
                    :text-color="diner.biometricRecord?.templates?.length > 0 || (facePhotoUrl && !facePhotoError) ? 'positive' : 'grey-7'"
                    rounded
                  >
                    <q-icon
                      :name="diner.biometricRecord?.templates?.length > 0 || (facePhotoUrl && !facePhotoError) ? 'check_circle' : 'warning'"
                      size="xs"
                    />
                  </q-badge>
                </q-avatar>
              </div>

              <!-- Datos del comensal -->
              <div class="col">
                <div class="text-h6 text-weight-bold">{{ diner.name }}</div>
                <div class="text-subtitle2 text-grey-7">{{ diner.cedula }}</div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  <strong>Cargo:</strong> {{ diner.position?.name || 'N/A' }}
                  &nbsp;|&nbsp;
                  <strong>Cuadrilla:</strong> {{ diner.squad?.name || 'N/A' }}
                </div>
                <div class="q-mt-sm row q-gutter-xs">
                  <q-chip
                    :color="diner.biometricRecord?.templates?.length > 0 ? 'positive' : (facePhotoUrl && !facePhotoError ? 'grey-7' : 'negative')"
                    text-color="white"
                    dense
                    icon="fingerprint"
                    size="sm"
                  >
                    {{ diner.biometricRecord?.templates?.length > 0 ? 'Huella en Dispositivo' : 'Sin Huella en Dispositivo' }}
                  </q-chip>
                  <q-chip
                    v-if="facePhotoUrl && !facePhotoError"
                    color="blue-7"
                    text-color="white"
                    dense
                    icon="face"
                    size="sm"
                  >
                    Foto Facial
                  </q-chip>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- ── Acción Principal: Hikvision ─────────────────────────────── -->
          <q-card-section class="q-pb-xs">
            <div class="row items-center q-mb-xs">
              <q-icon name="videocam" size="xs" color="deep-orange" class="q-mr-xs" />
              <span class="text-caption text-weight-bold text-deep-orange">Sincronización y Mantenimiento Hikvision</span>
            </div>
            <div class="row justify-between items-center q-col-gutter-sm">
              <div class="col-12 col-sm-auto">
                <q-btn
                  flat
                  color="primary"
                  label="Nueva Búsqueda"
                  icon="arrow_back"
                  @click="clearSearch"
                  size="md"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-sm-auto row q-gutter-sm justify-end">
                <!-- Botón Capturar Foto Remota con Cámara Hikvision -->
                <q-btn
                  color="primary"
                  label="Capturar Foto con Terminal"
                  icon="camera_alt"
                  @click="isCaptureModalOpen = true"
                  :disable="isSyncing || isClearing"
                  size="md"
                  unelevated
                >
                  <q-tooltip>Enciende la cámara del terminal para tomar y enrolar la foto facial del comensal</q-tooltip>
                </q-btn>

                <!-- Botón Limpiar / Re-enrolar (Mantenimiento) -->
                <q-btn
                  outline
                  color="negative"
                  label="Limpiar Biometría"
                  icon="delete_outline"
                  @click="confirmClearBiometrics"
                  :loading="isClearing"
                  :disable="isSyncing || isClearing"
                  size="md"
                >
                  <q-tooltip>Purga el rostro y credenciales en terminales y disco para permitir un nuevo enrolamiento limpio</q-tooltip>
                </q-btn>

                <!-- Botón Replicar en Todas las Sedes -->
                <q-btn
                  color="deep-orange"
                  label="Replicar en Sedes"
                  icon="sync"
                  @click="syncAcrossAllTerminals"
                  :loading="isSyncing"
                  :disable="isSyncing || isClearing"
                  size="md"
                  unelevated
                >
                  <q-tooltip>Sincroniza la foto facial y huella al terminal Hikvision de cada sede activa</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-card-section>



          <!-- Resultado de última sincronización -->
          <template v-if="lastSyncResult">
            <q-separator />
            <q-card-section class="bg-grey-1">
              <div class="text-caption text-weight-bold text-grey-8 q-mb-sm">
                <q-icon name="sync" size="xs" class="q-mr-xs" />
                Resultado de última sincronización
              </div>
              <div class="row q-col-gutter-sm">
                <div
                  v-for="target in lastSyncResult.targets"
                  :key="target.diningRoomId"
                  class="col-auto"
                >
                  <q-chip
                    :color="target.userSuccess ? 'positive' : 'negative'"
                    text-color="white"
                    dense
                    :icon="target.userSuccess ? 'check_circle' : 'error'"
                    size="sm"
                  >
                    {{ target.diningRoomName }}
                  </q-chip>
                </div>
              </div>
            </q-card-section>
          </template>
        </q-card>

        <!-- ── Estado: No Encontrado ─────────────────────────────────── -->
        <q-card v-else-if="searchAttempted && !isSearching" flat bordered class="text-center q-py-xl">
          <q-icon name="person_off" size="64px" color="grey-4" />
          <div class="text-h6 text-grey-6 q-mt-md">Comensal no encontrado</div>
          <div class="text-caption text-grey-5">
            Verifique la cédula e intente nuevamente. Recuerde usar el formato V-12345678.
          </div>
          <q-btn class="q-mt-md" flat color="primary" label="Volver a Búsqueda Libre" icon="arrow_back" @click="clearSearch" />
        </q-card>

        <!-- ── Estado: Inicial (buscar comensal) ──────────────────────── -->
        <q-card v-else flat bordered class="text-center q-py-xl">
          <q-icon name="face" size="72px" color="blue-3" />
          <div class="text-h6 text-grey-7 q-mt-md">Busca un comensal por cédula</div>
          <div class="text-caption text-grey-5 q-mt-sm q-px-lg">
            Ingresa la cédula en el campo de búsqueda para gestionar
            su registro y sincronización en los terminales Hikvision.
          </div>
          <q-separator class="q-my-md q-mx-xl" />
          <div class="row justify-center q-gutter-md q-px-md">
            <div class="col-auto text-center">
              <q-icon name="videocam" color="positive" size="sm" />
              <div class="text-caption text-grey-6 q-mt-xs">
                La identificación facial ocurre<br>automáticamente en el terminal
              </div>
            </div>
            <div class="col-auto text-center">
              <q-icon name="sync" color="deep-orange" size="sm" />
              <div class="text-caption text-grey-6 q-mt-xs">
                Usa "Replicar en Todas las Sedes"<br>para sincronizar entre comedores
              </div>
            </div>
          </div>
        </q-card>

      </div>

      <!-- ════════════════════════════════════════════
           COLUMNA DERECHA: Monitor de Terminales
           ════════════════════════════════════════════ -->
      <div class="col-12 col-lg-5">
        <q-card flat bordered>
          <q-card-section class="row items-center justify-between q-py-sm">
            <div class="row items-center">
              <q-icon name="router" size="sm" color="primary" class="q-mr-xs" />
              <span class="text-subtitle1 text-weight-bold">Estado de Terminales</span>
            </div>
            <div class="row items-center q-gutter-xs">
              <!-- Badge auto-refresh activo -->
              <q-badge
                v-if="isAutoPollingHealth"
                color="positive"
                rounded
                class="row items-center q-px-sm q-py-xs"
              >
                <q-spinner-radio size="10px" color="white" class="q-mr-xs" />
                <span class="text-caption">Auto 30s</span>
              </q-badge>
              <!-- Botón manual (siempre visible) -->
              <q-btn
                flat
                round
                icon="refresh"
                color="primary"
                size="sm"
                :loading="isLoadingHealth"
                @click="refreshTerminalHealth"
              >
                <q-tooltip>Actualizar ahora</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Sin terminales configurados (auto-fetch ya corrió y devolvió vacío) -->
          <q-card-section v-if="terminalStatuses.length === 0 && !isLoadingHealth" class="text-center q-py-lg">
            <q-icon
              :name="isAutoPollingHealth ? 'sensors_off' : 'cable'"
              size="48px"
              color="grey-4"
            />
            <div class="text-subtitle2 text-grey-6 q-mt-sm">
              {{ isAutoPollingHealth ? 'Sin terminales activos' : 'Sin datos de conectividad' }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">
              {{ isAutoPollingHealth
                ? 'No hay comedores con terminal Hikvision habilitado en la base de datos.'
                : 'Haga clic en el botón de actualizar para verificar la conectividad.'
              }}
            </div>
          </q-card-section>

          <!-- Skeleton durante carga -->
          <q-card-section v-else-if="isLoadingHealth">
            <q-item v-for="i in 2" :key="i" class="q-mb-sm">
              <q-item-section avatar>
                <q-skeleton type="QAvatar" size="40px" />
              </q-item-section>
              <q-item-section>
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="40%" />
              </q-item-section>
              <q-item-section side>
                <q-skeleton type="QBadge" />
              </q-item-section>
            </q-item>
          </q-card-section>

          <!-- Lista de terminales -->
          <q-list v-else separator>
            <q-item
              v-for="terminal in terminalStatuses"
              :key="terminal.diningRoomId"
            >
              <q-item-section avatar>
                <q-avatar
                  :color="terminal.online ? 'positive' : 'negative'"
                  text-color="white"
                  size="40px"
                  icon="videocam"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-bold">{{ terminal.diningRoomName }}</q-item-label>
                <q-item-label caption class="text-mono">{{ terminal.ip }}</q-item-label>
              </q-item-section>

              <q-item-section side class="items-end">
                <q-badge
                  :color="terminal.online ? 'positive' : 'negative'"
                  :label="terminal.online ? 'Online' : 'Offline'"
                  class="q-mb-xs"
                />
                <q-item-label v-if="terminal.online && terminal.latencyMs" caption>
                  {{ terminal.latencyMs }}ms
                </q-item-label>
              </q-item-section>

              <!-- Indicador animado de actividad para terminales online -->
              <q-item-section v-if="terminal.online" side>
                <q-spinner-radio color="positive" size="18px" />
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Pie con timestamp de última verificación -->
          <q-separator v-if="terminalStatuses.length > 0" />
          <q-card-section v-if="terminalStatuses.length > 0" class="q-py-xs">
            <div class="text-caption text-grey-5 text-right">
              Verificado: {{ formatCheckedAt(terminalStatuses[0]?.checkedAt) }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Info de arquitectura -->
        <q-card flat bordered class="q-mt-md bg-blue-1">
          <q-card-section class="q-py-sm">
            <div class="row items-center q-mb-xs">
              <q-icon name="info" color="primary" size="xs" class="q-mr-xs" />
              <span class="text-caption text-weight-bold text-primary">Modelo Hub-and-Spoke</span>
            </div>
            <div class="text-caption text-grey-8">
              SIAC actúa como nodo central. Al sincronizar, replica la foto facial
              hacia <strong>cada terminal activo</strong> en paralelo vía ISAPI.
            </div>
          </q-card-section>
        </q-card>
      </div>

    </div>

    <!-- ── Modal de Captura USB (DigitalPersona — Legacy Resguardado) ─────── -->
    <BiometricRegistrationModal
      v-model="isBiometricModalOpen"
      :diner-id="diner?.id || null"
      :diner-name="diner?.name || ''"
      @saved="onFingerprintSaved"
    />

    <!-- ── Modal de Captura y Enrolamiento Facial Remoto Hikvision ───────── -->
    <BiometricCameraCaptureDialog
      v-if="diner"
      v-model="isCaptureModalOpen"
      :cedula="diner.cedula"
      :diner-name="diner.name"
      @enrolled="onFaceEnrolled"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BiometricRegistrationModal from '~/components/comensales/BiometricRegistrationModal.vue'
import BiometricCameraCaptureDialog from '~/components/biometrics/BiometricCameraCaptureDialog.vue'
import { useBiometricManagement } from '~/composables/features/useBiometricManagement'

const isCaptureModalOpen = ref(false)

const {
  searchCedula,
  isSearching,
  searchAttempted,
  diner,
  isBiometricModalOpen,
  searchDiner,
  clearSearch,
  onFingerprintSaved,
  // Foto facial
  facePhotoUrl,
  facePhotoError,
  onFacePhotoError,
  // Sync multi-sede y mantenimiento
  isSyncing,
  isClearing,
  lastSyncResult,
  syncAcrossAllTerminals,
  confirmClearBiometrics,
  // Salud de terminales
  terminalStatuses,
  isLoadingHealth,
  refreshTerminalHealth,
  isAutoPollingHealth,
} = useBiometricManagement()

function onFaceEnrolled(result: { photoUrl: string }) {
  if (diner.value) {
    facePhotoUrl.value = result.photoUrl
    facePhotoError.value = false
  }
}

// ── Utilidad: formatear timestamp ──────────────────────────────────────────
function formatCheckedAt(date?: Date): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>
