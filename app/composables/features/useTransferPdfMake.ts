import { ref, readonly } from 'vue'
import { useQuasar } from 'quasar'
import type { TransferTransaction } from './useTransferReport'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

import pdfMakeModule from 'pdfmake/build/pdfmake'
import pdfFontsModule from 'pdfmake/build/vfs_fonts'

const pdfMake = pdfMakeModule.default || pdfMakeModule
const pdfFonts = pdfFontsModule.default || pdfFontsModule

// Inicializar fuentes globalmente
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs

export function useTransferPdfMake() {
  const $q = useQuasar()
  const isGenerating = ref(false)

  // Utilidad para convertir la imagen de public/ a base64 para que pdfmake la incruste
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

  const downloadPdf = async (transaction: TransferTransaction, totalsByUnit: string[]) => {
    isGenerating.value = true
    $q.loading.show({ message: 'Generando PDF Vectorial...' })

    try {
      // Cargar Logo en Base64
      let logoBase64 = ''
      try {
        logoBase64 = await getBase64ImageFromUrl('/logo.png')
      } catch (e) {
        console.warn('No se pudo cargar el logo.png', e)
      }

      // Construcción del documento JSON
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
                  { text: 'ACTA DE TRÁNSITO DE MERCANCÍA', style: 'header', alignment: 'center' },
                  { text: 'SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] }
                ]
              },
              {
                width: 80, // Espaciador para centrar el título
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
                  { text: [ { text: 'ID de Transacción: ', bold: true }, `#TRN-${transaction.id}` ] },
                  { text: [ { text: 'Fecha de Salida: ', bold: true }, new Date(transaction.createdAt).toLocaleString() ] },
                  { text: [ { text: 'Almacén Origen: ', bold: true }, transaction.source?.name || 'Central' ] }
                ]
              },
              {
                alignment: 'right',
                stack: [
                  { text: [ { text: 'Almacén Destino: ', bold: true }, transaction.destination?.name || 'Desconocido' ] },
                  { text: [ { text: 'N° Factura / Guía: ', bold: true }, transaction.referenceNumber || 'N/A' ] },
                  { text: [ { text: 'Operador Despachador: ', bold: true }, transaction.createdBy?.name || 'Desconocido' ] }
                ]
              }
            ],
            margin: [0, 0, 0, 20]
          },

          { text: 'DETALLE DE MERCANCÍA DESPACHADA', bold: true, margin: [0, 0, 0, 5] },
          
          // DETALLE TABLA (Se auto-pagina y repite header)
          {
            table: {
              headerRows: 1,
              widths: ['auto', '*', 'auto'],
              body: [
                // Fila Header
                [
                  { text: 'Cód', style: 'tableHeader' },
                  { text: 'Producto', style: 'tableHeader' },
                  { text: 'Cant. Despachada', style: 'tableHeader', alignment: 'center' }
                ],
                // Filas de Datos
                ...transaction.details.map(det => {
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
          { text: 'RESUMEN CUANTITATIVO (DESGLOSE POR UNIDAD)', bold: true, margin: [0, 0, 0, 5] },
          {
            ul: totalsByUnit.map(total => `Total Despachado: ${total}`),
            margin: [0, 0, 0, 40]
          },

          // FIRMAS (No se parten, se mantienen juntas con unbreakableRecord)
          { 
            unbreakable: true,
            stack: [
              { text: 'Con las firmas expuestas a continuación, se da fe de que los productos detallados en este documento salieron físicamente del Almacén de Origen y se encuentran en tránsito hacia el Destino.', fontSize: 8, color: 'gray', alignment: 'center', margin: [0, 0, 0, 40] },
              {
                columns: [
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Despachado Por', bold: true, margin: [0, 5, 0, 0] }, { text: transaction.createdBy?.name || 'Nombre, Cédula y Firma', fontSize: 10 } ], alignment: 'center' },
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Transportado Por (Chofer)', bold: true, margin: [0, 5, 0, 0] }, { text: 'Nombre, Cédula y Firma', fontSize: 10 } ], alignment: 'center' },
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Recibido Por (Destino)', bold: true, margin: [0, 5, 0, 0] }, { text: 'Firma y Sello', fontSize: 10 } ], alignment: 'center' }
                ]
              },
              {
                columns: [
                  { width: '16.6%', text: '' },
                  { width: '33.3%', stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Revisado Por (PCP)', bold: true, margin: [0, 5, 0, 0] }, { text: 'Firma y Sello', fontSize: 10 } ], alignment: 'center' },
                  { width: '33.3%', stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Revisado Por (GNB)', bold: true, margin: [0, 5, 0, 0] }, { text: 'Firma y Sello', fontSize: 10 } ], alignment: 'center' },
                  { width: '16.6%', text: '' }
                ],
                margin: [0, 40, 0, 0]
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
        // Marca de Agua Nativa de pdfMake
        watermark: transaction.status === 'DRAFT' ? { text: 'DOCUMENTO NO VÁLIDO PARA TRÁNSITO', color: 'gray', opacity: 0.1, bold: true, italics: false } : undefined
      }

      const filename = `Acta_Transito_TRN-${transaction.id}.pdf`
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
