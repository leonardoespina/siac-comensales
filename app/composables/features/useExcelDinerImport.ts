import { ref } from 'vue'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'
import { useAuthStore } from '~/stores/auth'
import { useDinersStore } from '~/stores/diners'

export function useExcelDinerImport() {
  const $q = useQuasar()
  const authStore = useAuthStore()
  const dinersStore = useDinersStore()

  const isModalOpen = ref(false)
  const isProcessing = ref(false)
  const isValidationScreen = ref(false)
  const uploadProgress = ref(0)
  
  const validRows = ref<any[]>([])
  const invalidRows = ref<any[]>([])

  const downloadTemplate = () => {
    const wsData = [
      ['Cédula', 'Nombre', 'Área Destino', 'Comedor', 'Cargo', 'Cuadrilla', 'Tipo Ración'],
      ['V-12345678', 'Leonardo Espina', 'DIVISION DE PROGRAMACION', 'Sede Principal', 'Gerente de TI', 'Administrativa', 'NORMAL'],
      ['V-98765432', 'María Perez', 'DIVISION DE PROGRAMACION', 'Sede Principal', 'Secretaria', 'Cuadrilla A', 'DIETA'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Trabajadores')
    XLSX.writeFile(wb, 'Plantilla_Trabajadores_SIAC.xlsx')
  }

  const normalizeText = (text: string | undefined): string => {
    if (!text) return ''
    return String(text).trim().toUpperCase()
  }

  const parseExcel = async (f: File) => {
    if (!f) return

    try {
      isProcessing.value = true
      uploadProgress.value = 0
      isValidationScreen.value = false
      validRows.value = []
      invalidRows.value = []

      // Simulador de lectura rápida
      const totalSteps = 5
      for (let i = 0; i < totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 50))
        uploadProgress.value = (i + 1) / totalSteps
      }

      const data = await f.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonRows = XLSX.utils.sheet_to_json(worksheet)

      const parsedRows = jsonRows.map((r: any) => {
        let rationType = normalizeText(r['Tipo Ración'] || r['Ración'])
        if (rationType.includes('DIET') || rationType.includes('MÉDIC')) {
          rationType = 'DIETA'
        } else {
          rationType = 'NORMAL'
        }

        return {
          cedula: String(r['Cédula'] || '').trim().toUpperCase(),
          name: normalizeText(r['Nombre']),
          areaName: normalizeText(r['Área Destino'] || r['Area Destino'] || r['Área'] || r['Area']),
          comedorName: normalizeText(r['Comedor']),
          positionName: normalizeText(r['Cargo']),
          squadName: normalizeText(r['Cuadrilla']),
          rationType
        }
      })

      const missingFieldsRows: any[] = []
      const rowsToValidate: any[] = []

      for (const r of parsedRows) {
        if (!r.cedula || !r.name || !r.squadName || !r.comedorName || !r.areaName) {
           const missing = []
           if (!r.cedula) missing.push('Cédula')
           if (!r.name) missing.push('Nombre')
           if (!r.areaName) missing.push('Área Destino')
           if (!r.comedorName) missing.push('Comedor')
           if (!r.squadName) missing.push('Cuadrilla')
           
           missingFieldsRows.push({
             row: r,
             error: `Faltan columnas obligatorias: ${missing.join(', ')}`
           })
        } else {
           rowsToValidate.push(r)
        }
      }

      if (rowsToValidate.length === 0 && missingFieldsRows.length === 0) {
        $q.notify({ type: 'warning', message: 'El archivo Excel está vacío o no tiene el formato correcto.' })
        return
      }

      let backendValidRows: any[] = []
      let backendInvalidRows: any[] = []

      if (rowsToValidate.length > 0) {
        const validationResponse = await $fetch('/api/diners/excel/validate', {
          method: 'POST',
          body: { rows: rowsToValidate }
        })
        backendValidRows = (validationResponse as any).validRows || []
        backendInvalidRows = (validationResponse as any).invalidRows || []
      }

      validRows.value = backendValidRows
      invalidRows.value = [...missingFieldsRows, ...backendInvalidRows]
      
      isValidationScreen.value = true

    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al validar el archivo Excel.' })
      console.error(error)
    } finally {
      isProcessing.value = false
    }
  }

  const confirmImport = async () => {
    if (validRows.value.length === 0) return

    if (invalidRows.value.length > 0) {
      $q.dialog({
        title: '⚠️ Atención: Registros Ignorados',
        message: `Existen ${invalidRows.value.length} trabajadores con errores. Si continúas, SOLO se importarán los ${validRows.value.length} trabajadores válidos y el resto será descartado. ¿Deseas continuar?`,
        cancel: 'Cancelar',
        ok: 'Sí, continuar',
        persistent: true
      }).onOk(() => {
        executeImport()
      })
    } else {
      executeImport()
    }
  }

  const executeImport = async () => {
    isProcessing.value = true
    try {
      await $fetch('/api/diners/excel', {
        method: 'POST',
        body: {
          rows: validRows.value
        }
      })
      
      $q.notify({ type: 'positive', message: `¡Se han importado ${validRows.value.length} trabajadores exitosamente!` })
      await dinersStore.fetchAll()
      
      isModalOpen.value = false
      isValidationScreen.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || error.message || 'Error en el servidor al importar' })
    } finally {
      isProcessing.value = false
    }
  }

  const cancelValidation = () => {
    isValidationScreen.value = false
    validRows.value = []
    invalidRows.value = []
  }

  return {
    isModalOpen,
    isProcessing,
    isValidationScreen,
    uploadProgress,
    validRows,
    invalidRows,
    parseExcel,
    confirmImport,
    cancelValidation,
    downloadTemplate
  }
}
