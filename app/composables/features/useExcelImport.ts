import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'

export function useExcelImport() {
  const router = useRouter()
  const $q = useQuasar()

  const file = ref<File | null>(null)
  const supplierId = ref<number | null>(null)
  const destinationId = ref<number | null>(null)
  const referenceNumber = ref<string>('')

  const parsedRows = ref<any[]>([])
  const saving = ref(false)
  const isProcessing = ref(false)
  const uploadProgress = ref(0)
  const searchQuery = ref('')

  const grandTotal = computed(() => {
    return parsedRows.value.reduce((total, row) => {
      // Sumamos solo si la fila no tiene errores críticos de cantidad/precio
      if (row.quantity > 0 && row.unitPrice >= 0) {
        return total + (Number(row.quantity) * Number(row.unitPrice))
      }
      return total
    }, 0)
  })

  const revalidateRow = (row: any) => {
    row.isValid = true
    row.errorMsg = ''
    
    if (!row.productName || !row.categoryName || !row.unitName) {
      row.isValid = false
      row.errorMsg = 'Faltan campos obligatorios'
    } else if (Number(row.quantity) <= 0) {
      row.isValid = false
      row.errorMsg = 'La cantidad debe ser mayor a 0'
    } else if (Number(row.unitPrice) < 0) {
      row.isValid = false
      row.errorMsg = 'El precio no puede ser negativo'
    }
  }

  // ── UTILIDADES DE NORMALIZACIÓN ───────────────────────────────────────────
  const normalizeUnit = (unit: string | undefined): string => {
    if (!unit) return ''
    const lower = String(unit).trim().toLowerCase()
    
    // Diccionario de Alias
    if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(lower)) return 'Kilo'
    if (['lt', 'lts', 'litro', 'litros', 'l'].includes(lower)) return 'Litro'
    if (['un', 'und', 'unidad', 'unidades', 'u'].includes(lower)) return 'Unidad'
    if (['caja', 'cajas', 'cj', 'cx'].includes(lower)) return 'Caja'
    if (['paq', 'pqte', 'paquete', 'paquetes'].includes(lower)) return 'Paquete'
    if (['saco', 'sacos', 'sc'].includes(lower)) return 'Saco'
    if (['g', 'gr', 'gramo', 'gramos'].includes(lower)) return 'Gramo'

    // Si es una unidad nueva, al menos la Capitalizamos (Primera en mayúscula)
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  const normalizeText = (text: string | undefined): string => {
    if (!text) return ''
    const clean = String(text).trim()
    // Convertir a mayúsculas para evitar duplicados como "Tomate" y "TOMATE"
    return clean.toUpperCase()
  }

  const normalizeDate = (val: any): string | null | 'INVALID' => {
    if (!val) return null

    // Si Excel lo envía como número serial (ej. 44562)
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000))
      if (isNaN(date.getTime())) return 'INVALID'
      return date.toISOString().split('T')[0]
    }

    const strVal = String(val).trim()
    
    // Si viene como string literal "DD/MM/YYYY" o "DD-MM-YYYY"
    const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    const match = strVal.match(regex)
    if (match) {
      const day = match[1].padStart(2, '0')
      const month = match[2].padStart(2, '0')
      const year = match[3]
      
      const isoStr = `${year}-${month}-${day}`
      if (!isNaN(new Date(isoStr).getTime())) {
        return isoStr
      }
      
      // Fallback: si el usuario usó formato MM/DD/YYYY (ej. 12/25/2026)
      const isoStrUS = `${year}-${day}-${month}`
      if (!isNaN(new Date(isoStrUS).getTime())) {
        return isoStrUS
      }
      
      return 'INVALID'
    }

    // Fallback por si la base subyacente de JS lo logra parsear
    const fallbackDate = new Date(strVal)
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().split('T')[0]
    }

    return 'INVALID'
  }

  const downloadTemplate = () => {
    const wsData = [
      ['Código', 'Producto', 'Categoría', 'Unidad', 'Cantidad', 'Precio', 'Vencimiento', 'Stock Min', 'Stock Max'],
      ['P-001', 'Arroz Blanco', 'Víveres Secos', 'Kilo', 50, 1.25, '01/12/2027', 10, 50],
      ['', 'Tomates', 'Vegetales', 'Kilo', 20, 0.80, '', 5, 20],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Recepciones')
    XLSX.writeFile(wb, 'Plantilla_Recepciones_SIAC.xlsx')
  }

  const parseExcel = async (f: File) => {
    if (!f) {
      parsedRows.value = []
      return
    }

    try {
      isProcessing.value = true
      uploadProgress.value = 0

      // Simulador de animación de "Procesando..."
      const totalSteps = 10
      for (let i = 0; i < totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 150)) // total ~1.5 seg
        uploadProgress.value = (i + 1) / totalSteps
      }

      const data = await f.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonRows = XLSX.utils.sheet_to_json(worksheet)

      parsedRows.value = jsonRows.map((r: any, index) => {
        let isValid = true
        let errorMsg = ''
        
        const productName = normalizeText(r['Producto'])
        const categoryName = normalizeText(r['Categoría'])
        const unitName = normalizeUnit(r['Unidad'])
        const quantity = Number(r['Cantidad']) || 0
        
        if (!productName || !categoryName || !unitName) {
          isValid = false
          errorMsg = 'Faltan campos obligatorios'
        } else if (quantity <= 0) {
          isValid = false
          errorMsg = 'La cantidad debe ser mayor a 0'
        }

        // Parsear fecha flexiblemente
        let expirationDate = normalizeDate(r['Vencimiento'])
        if (expirationDate === 'INVALID') {
          isValid = false
          errorMsg = 'Formato de fecha de vencimiento inválido'
          expirationDate = null
        }

        const minimumStock = Number(r['Stock Min']) || 0
        const maximumStock = Number(r['Stock Max']) || null

        return {
          index,
          isValid,
          errorMsg,
          checked: false,
          productCode: r['Código']?.toString() || '',
          productName,
          categoryName,
          unitName,
          quantity,
          unitPrice: Number(r['Precio']) || 0,
          expirationDate,
          minimumStock,
          maximumStock
        }
      })

      // Un pequeño retraso extra al 100% para visualización
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error al leer el archivo Excel.' })
      console.error(error)
      file.value = null
    } finally {
      isProcessing.value = false
    }
  }

  const saveImport = async () => {
    const invalidCount = parsedRows.value.filter(r => !r.isValid).length
    if (invalidCount > 0) {
      $q.notify({ type: 'negative', message: `Hay ${invalidCount} filas con errores. Corrígelas en el Excel y vuelve a subirlo.` })
      return
    }

    saving.value = true
    try {
      await $fetch('/api/receptions/excel', {
        method: 'POST',
        body: {
          supplierId: supplierId.value,
          destinationId: destinationId.value,
          referenceNumber: referenceNumber.value || null,
          rows: parsedRows.value
        }
      })
      
      $q.notify({ type: 'positive', message: 'Recepción importada correctamente.' })
      router.push('/inventory/receptions')
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error en el servidor al importar' })
    } finally {
      saving.value = false
    }
  }

  const clearImport = () => {
    parsedRows.value = []
    file.value = null
    searchQuery.value = ''
    supplierId.value = null
    referenceNumber.value = ''
    // Nota: destinationId no se borra para conservar el almacén por defecto
  }

  return {
    file,
    supplierId,
    destinationId,
    referenceNumber,
    parsedRows,
    saving,
    isProcessing,
    uploadProgress,
    searchQuery,
    grandTotal,
    parseExcel,
    saveImport,
    clearImport,
    downloadTemplate,
    revalidateRow
  }
}
