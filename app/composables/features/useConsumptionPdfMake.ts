import { ref, readonly } from 'vue'
import { useQuasar } from 'quasar'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

import pdfMakeModule from 'pdfmake/build/pdfmake'
import pdfFontsModule from 'pdfmake/build/vfs_fonts'

const pdfMake = pdfMakeModule.default || pdfMakeModule
const pdfFonts = pdfFontsModule.default || pdfFontsModule

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs

export function useConsumptionPdfMake() {
  const $q = useQuasar()
  const isGenerating = ref(false)

  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const downloadPdf = async (transaction: any, totalsByUnit: string[]) => {
    isGenerating.value = true
    $q.loading.show({ message: 'Generando PDF Vectorial...' })

    try {
      let logoBase64 = ''
      try {
        logoBase64 = await getBase64ImageFromUrl('/logo.png')
      } catch (e) {
        console.warn('No se pudo cargar el logo.png', e)
      }

      let title = 'ACTA DE REGISTRO'
      if (transaction.type === 'LOSS') title = 'ACTA DE MERMA DE MERCANCÍA'
      if (transaction.type === 'SUPPORT') title = 'ACTA DE APOYO INSTITUCIONAL'
      if (transaction.type === 'CONSUMPTION') title = 'ACTA DE CONSUMO INTERNO'

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
          // CABECERA CON LOGO
          {
            columns: [
              {
                width: 80,
                ...(logoBase64 ? { image: logoBase64, width: 60 } : { text: '' })
              },
              {
                width: '*',
                stack: [
                  { text: title, style: 'header', alignment: 'center' },
                  { text: 'SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] }
                ]
              },
              {
                width: 80,
                text: ''
              }
            ],
            margin: [0, 0, 0, 20]
          },
          
          // INFO BLOQUE
          {
            columns: [
              {
                stack: [
                  { text: [ { text: 'ID de Transacción: ', bold: true }, `#${transaction.id}` ] },
                  { text: [ { text: 'Fecha de Registro: ', bold: true }, new Date(transaction.createdAt).toLocaleString() ] },
                  { text: [ { text: 'Comedor / Almacén: ', bold: true }, transaction.source?.name || 'Local' ] }
                ]
              },
              {
                alignment: 'right',
                stack: [
                  transaction.type === 'SUPPORT' ? { text: [ { text: 'Institución Receptora: ', bold: true }, transaction.institution?.name || 'No especificada' ] } : { text: '' },
                  { text: [ { text: 'Estado: ', bold: true }, transaction.status ] },
                  { text: [ { text: 'Operador Responsable: ', bold: true }, transaction.createdBy?.name || 'Desconocido' ] }
                ]
              }
            ],
            margin: [0, 0, 0, 20]
          },

          { text: 'DETALLE DE MERCANCÍA', bold: true, margin: [0, 0, 0, 5] },
          
          // DETALLE TABLA
          {
            table: {
              headerRows: 1,
              widths: ['auto', '*', 'auto'],
              body: [
                [
                  { text: 'Cód', style: 'tableHeader' },
                  { text: 'Producto', style: 'tableHeader' },
                  { text: 'Cant. Despachada', style: 'tableHeader', alignment: 'center' }
                ],
                ...transaction.details.map((det: any) => {
                   return [
                     det.product?.code,
                     det.product?.name,
                     { text: `${Number(det.quantity)} ${det.product?.unit?.abbreviation || ''}`, alignment: 'center', bold: true }
                   ]
                })
              ]
            },
            margin: [0, 0, 0, 20]
          },
          
          // RESUMEN CUANTITATIVO
          { text: 'RESUMEN CUANTITATIVO', bold: true, margin: [0, 0, 0, 5] },
          {
            ul: totalsByUnit.map(total => `Total Registrado: ${total}`),
            margin: [0, 0, 0, 40]
          },

          // FIRMAS
          { 
            unbreakable: true,
            stack: [
              { text: 'Con las firmas expuestas a continuación, se da fe de la veracidad de la información reflejada en el presente documento.', fontSize: 8, color: 'gray', alignment: 'center', margin: [0, 0, 0, 50] },
              {
                columns: [
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Despachado / Declarado Por', bold: true, margin: [0, 5, 0, 0] }, { text: transaction.createdBy?.name || 'Nombre, Cédula y Firma', fontSize: 10 } ], alignment: 'center' },
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: transaction.type === 'SUPPORT' ? 'Recibido Por (Institución)' : 'Autorizado / Validado Por', bold: true, margin: [0, 5, 0, 0] }, { text: 'Firma y Sello', fontSize: 10 } ], alignment: 'center' }
                ]
              }
            ]
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true },
          subheader: { fontSize: 12 },
          tableHeader: { bold: true, fillColor: '#f5f5f5', margin: [0, 5, 0, 5] }
        },
        defaultStyle: {
          fontSize: 10,
          columnGap: 20
        },
        watermark: transaction.status === 'DRAFT' ? { text: 'BORRADOR NO APROBADO', color: 'gray', opacity: 0.1, bold: true, italics: false } : undefined
      }

      const filename = `Acta_${transaction.type}_${transaction.id}.pdf`
      pdfMake.createPdf(docDefinition).download(filename)
      $q.notify({ type: 'positive', message: 'PDF Vectorial descargado exitosamente.' })

    } catch (error) {
      console.error('Error generando PDF vectorial:', error)
      $q.notify({ type: 'negative', message: 'Error al generar el PDF con pdfmake.' })
    } finally {
      $q.loading.hide()
      isGenerating.value = false
    }
  }

  return {
    isGenerating: readonly(isGenerating),
    downloadPdf
  }
}
