<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="shadow-2 bg-white rounded-borders">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6"><q-icon name="fingerprint" size="sm" class="q-mr-sm"/> Gestión Biométrica (CRUD)</div>
            <div class="text-subtitle2">Búsqueda y enrolamiento de huellas de comensales</div>
          </q-card-section>

          <q-card-section class="bg-grey-1">
            <!-- Buscador -->
            <q-form @submit.prevent="searchDiner" class="row q-col-gutter-sm items-center">
              <div class="col-8">
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
                  hint="Ej: V-12345678 o 12345678"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              <div class="col-4" style="margin-top: -18px">
                <q-btn
                  color="primary"
                  label="Buscar"
                  type="submit"
                  class="full-width"
                  :disable="!searchCedula || isSearching"
                />
              </div>
            </q-form>
          </q-card-section>

          <!-- Resultado de la búsqueda -->
          <q-card-section v-if="diner" class="q-pt-md">
            <div class="row items-center">
              <div class="col-auto q-pr-md">
                <q-avatar size="72px" :color="diner.biometricRecord?.templates?.length > 0 ? 'positive' : 'grey-5'" text-color="white">
                  <q-icon name="person" size="40px" />
                  <q-badge floating color="white" :text-color="diner.biometricRecord?.templates?.length > 0 ? 'positive' : 'grey-8'" rounded>
                    <q-icon :name="diner.biometricRecord?.templates?.length > 0 ? 'check_circle' : 'warning'" size="xs" />
                  </q-badge>
                </q-avatar>
              </div>
              <div class="col">
                <div class="text-h6">{{ diner.name }}</div>
                <div class="text-subtitle2 text-grey-8">{{ diner.cedula }}</div>
                <div class="text-caption text-grey-6">
                  <strong>Cargo:</strong> {{ diner.position?.name || 'N/A' }} | 
                  <strong>Cuadrilla:</strong> {{ diner.squad?.name || 'N/A' }}
                </div>
                <div class="q-mt-xs">
                  <q-chip
                    :color="diner.biometricRecord?.templates?.length > 0 ? 'positive' : 'negative'"
                    text-color="white"
                    dense
                    icon="fingerprint"
                  >
                    {{ diner.biometricRecord?.templates?.length > 0 ? 'Huella Registrada' : 'Sin Huella' }}
                  </q-chip>
                </div>
              </div>
            </div>

            <!-- Botonera de Acciones -->
            <div class="row q-mt-lg justify-between items-center">
              <q-btn
                unelevated
                color="primary"
                text-color="primary"
                class="bg-blue-1"
                label="Búsqueda Libre"
                icon="arrow_back"
                @click="clearSearch"
              />

              <div class="row q-gutter-sm">
                <q-btn
                  v-if="diner.biometricRecord?.templates?.length > 0"
                  outline
                  color="negative"
                  label="Desvincular Huella"
                  icon="delete_outline"
                  @click="confirmDeleteFingerprint"
                />
                <q-btn
                  color="primary"
                  :label="diner.biometricRecord?.templates?.length > 0 ? 'Actualizar Huella' : 'Registrar Biometría'"
                  icon="touch_app"
                  @click="openBiometricModal"
                />
              </div>
            </div>
          </q-card-section>

          <!-- Estado de No Encontrado (cuando ya se buscó) -->
          <q-card-section v-else-if="searchAttempted && !isSearching" class="text-center q-py-xl">
            <q-icon name="person_off" size="64px" color="grey-4" />
            <div class="text-h6 text-grey-6 q-mt-md">Comensal no encontrado</div>
            <div class="text-caption text-grey-5">Verifique la cédula e intente nuevamente. Recuerde usar el formato V-12345678.</div>
            <q-btn class="q-mt-md" flat color="primary" label="Volver a Búsqueda Libre" icon="arrow_back" @click="clearSearch" />
          </q-card-section>

          <!-- Estado Vacío Inicial (Identificación Libre) -->
          <q-card-section v-else class="text-center q-py-xl">
            <q-btn round flat color="primary" class="q-pa-md" @click="openGeneralIdentificationModal">
              <q-icon name="fingerprint" size="80px" />
            </q-btn>
            <div class="text-h5 text-primary q-mt-md cursor-pointer" @click="openGeneralIdentificationModal">
              Identificación Libre
            </div>
            <div class="text-caption text-grey-6 q-mt-sm">
              Haga clic aquí o presione el lector para identificar a un comensal automáticamente
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal de Captura Reutilizable -->
    <BiometricRegistrationModal
      v-model="isBiometricModalOpen"
      :diner-id="diner?.id || null"
      :diner-name="diner?.name || ''"
      @saved="onFingerprintSaved"
    />

    <!-- Modal de Identificación Libre 1:N -->
    <GeneralIdentificationModal
      v-model="isGeneralIdentificationModalOpen"
      @identified="onGeneralIdentification"
    />
  </q-page>
</template>

<script setup lang="ts">
import BiometricRegistrationModal from '~/components/comensales/BiometricRegistrationModal.vue'
import GeneralIdentificationModal from '~/components/comensales/GeneralIdentificationModal.vue'
import { useBiometricManagement } from '~/composables/features/useBiometricManagement'

const {
  searchCedula,
  isSearching,
  searchAttempted,
  diner,
  isBiometricModalOpen,
  isVerificationModalOpen,
  isGeneralIdentificationModalOpen,
  searchDiner,
  clearSearch,
  openBiometricModal,
  openVerificationModal,
  openGeneralIdentificationModal,
  onGeneralIdentification,
  onFingerprintSaved,
  confirmDeleteFingerprint
} = useBiometricManagement()
</script>
