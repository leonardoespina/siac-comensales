<script setup lang="ts">
import { toRef } from 'vue'
import { useBiometricStreamStatus } from '~/composables/features/useBiometricStreamStatus'

const props = defineProps<{
  diningRoomId: number | null
}>()

const diningRoomIdRef = toRef(props, 'diningRoomId')

const {
  displayStatus,
  isOnline,
  isRecovering,
  isDown,
  canRestart,
  cooldownSec,
  isRestarting,
  restart
} = useBiometricStreamStatus(diningRoomIdRef)
</script>

<template>
  <div v-if="diningRoomId" class="row items-center q-gutter-sm">
    <!-- Estado: En Línea -->
    <q-chip
      v-if="isOnline"
      color="positive"
      text-color="white"
      icon="check_circle"
      dense
    >
      Biométrico en línea
    </q-chip>

    <!-- Estado: Reconectando -->
    <q-chip
      v-else-if="isRecovering"
      color="warning"
      text-color="dark"
      icon="sync"
      class="glossy"
      dense
    >
      Reconectando biométrico...
    </q-chip>

    <!-- Estado: Sin Conexión -->
    <template v-else-if="isDown">
      <q-chip
        color="negative"
        text-color="white"
        icon="error"
        dense
      >
        Biométrico sin conexión
      </q-chip>

      <q-btn
        color="warning"
        text-color="dark"
        icon="sync"
        :label="cooldownSec > 0 ? `Reintentar en ${cooldownSec}s` : 'Reconectar'"
        :loading="isRestarting"
        :disable="!canRestart"
        size="md"
        unelevated
        @click="restart"
      >
        <q-tooltip v-if="cooldownSec <= 0">
          Reiniciar la conexión con el biométrico de este comedor
        </q-tooltip>
      </q-btn>
    </template>
  </div>
</template>
