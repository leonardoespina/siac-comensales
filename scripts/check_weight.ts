import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/siac_db?schema=public'
})

async function checkTemplateWeight() {
  try {
    const res = await pool.query('SELECT templates FROM biometric_records')
    
    if (res.rows.length === 0) {
      console.log('No hay huellas registradas todavía en la base de datos.')
      return
    }

    let totalTemplates = 0
    let totalBytes = 0
    let maxBytes = 0
    let minBytes = Infinity

    res.rows.forEach(record => {
      if (record.templates && Array.isArray(record.templates)) {
        record.templates.forEach((template: string) => {
          totalTemplates++
          const sizeInBytes = Buffer.byteLength(template, 'utf8')
          
          totalBytes += sizeInBytes
          if (sizeInBytes > maxBytes) maxBytes = sizeInBytes
          if (sizeInBytes < minBytes) minBytes = sizeInBytes
        })
      }
    })

    console.log('--- ANÁLISIS DE PESO BIOMÉTRICO (FMD Base64) ---')
    console.log(`Total de Comensales con Huella: ${res.rows.length}`)
    console.log(`Total de Plantillas (Dedos): ${totalTemplates}`)
    
    if (totalTemplates > 0) {
      const avgBytes = (totalBytes / totalTemplates).toFixed(2)
      const avgKb = (totalBytes / totalTemplates / 1024).toFixed(4)
      
      console.log(`\nPeso Mínimo: ${minBytes} bytes`)
      console.log(`Peso Máximo: ${maxBytes} bytes`)
      console.log(`Peso Promedio por Huella: ${avgBytes} bytes (${avgKb} KB)`)
      
      console.log(`\nProyección para 5,000 Trabajadores (2 huellas c/u = 10,000 plantillas):`)
      const projectedTotalMB = (10000 * Number(avgBytes) / 1024 / 1024).toFixed(2)
      console.log(`Total estimado en Base de Datos: ${projectedTotalMB} MB !!!`)
      console.log(`Si fueran imágenes antiguas de 50KB: ${(10000 * 50000 / 1024 / 1024).toFixed(2)} MB`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkTemplateWeight()
