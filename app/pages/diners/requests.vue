<script setup lang="ts">
import { ref } from 'vue'

const requests = ref([])
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Peticiones Diarias de Comida</div>
            <div class="text-caption">Próximamente: Interfaz para programar consumos semanales.</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
