<template>
  <q-badge 
    :color="active ? 'positive' : 'negative'" 
    :label="active ? 'Activo' : 'Inactivo'" 
    class="text-weight-bold q-py-xs q-px-sm"
    rounded
  />
</template>

<script setup lang="ts">
defineProps({
  active: { type: Boolean, required: true }
})
</script>
