<template>
  <q-icon :name="icon" :color="color" size="xs" class="cursor-pointer">
    <q-tooltip class="bg-grey-9 text-white text-body2" style="max-width: 300px">
      {{ text }}
    </q-tooltip>
  </q-icon>
</template>

<script setup lang="ts">
interface Props {
  text: string
  icon?: string
  color?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'info_outline',
  color: 'grey-6'
})
</script>
