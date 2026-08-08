import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export const useMealServicesStore = defineStore('mealServices', () => {
  const isDispatching = ref(false)

  // Invoca el endpoint de Despacho (Validación de Comensal por Huella o Cédula)
  async function dispatchMeal(identifier: string, isFingerprint: boolean = true) {
    isDispatching.value = true
    try {
      const data = await $fetch('/api/dispatch', {
        method: 'POST',
        body: {
          identifier,
          isFingerprint
        }
      })
      return data
    } finally {
      isDispatching.value = false
    }
  }

  return {
    isDispatching: readonly(isDispatching),
    dispatchMeal
  }
})
