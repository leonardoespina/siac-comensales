import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useReportsStore } from '~/stores/reports'
import * as XLSX from 'xlsx'

export function useExcelMatrixReport() {
  const $q = useQuasar()
  const reportsStore = useReportsStore()
  const loading = ref(false)

  const fetchMatrix = async (filters: { startDate: string, endDate: string, categoryId?: number, unitId?: number, warehouseId?: number }) => {
    loading.value = true
    try {
      await reportsStore.fetchReceptionsMatrix(filters)
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error cargando la matriz' })
    } finally {
      loading.value = false
    }
  }

  const exportExcel = (title: string) => {
    if (!reportsStore.matrixData) return
    const { dispatches, rows } = reportsStore.matrixData

    const excelMatrix: any[][] = []
    for(let i = 0; i < 4; i++) excelMatrix.push([])
    
    excelMatrix.push([title.toUpperCase()])
    excelMatrix.push([])

    const headerRow = ['DESCRIPCION', 'PRESENTACION']
    dispatches.forEach(d => {
      headerRow.push('')
      headerRow.push(d.label)
    })
    headerRow.push('')
    headerRow.push('TOTAL CANTIDAD DEL PERIODO')
    excelMatrix.push(headerRow)

    rows.forEach(row => {
      const dataRow: any[] = [row.name, row.unit]
      dispatches.forEach(d => {
        dataRow.push('')
        dataRow.push(row.quantities[d.id] || 0)
      })
      dataRow.push('')
      dataRow.push(row.total)
      excelMatrix.push(dataRow)
    })

    const totalRow: any[] = ['TOTAL GENERAL', '']
    let grandTotal = 0
    dispatches.forEach(d => {
      totalRow.push('')
      const colSum = rows.reduce((sum, r) => sum + (r.quantities[d.id] || 0), 0)
      totalRow.push(colSum)
    })
    totalRow.push('')
    grandTotal = rows.reduce((sum, r) => sum + r.total, 0)
    totalRow.push(grandTotal)
    excelMatrix.push(totalRow)

    const ws = XLSX.utils.aoa_to_sheet(excelMatrix)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Consolidado')
    
    XLSX.writeFile(wb, 'Reporte_Recepciones_Consolidado.xlsx')
  }

  const clearMatrix = () => {
    reportsStore.matrixData = null
  }

  return { loading, fetchMatrix, exportExcel, clearMatrix }
}
