import fs from 'fs';
import * as XLSX from 'xlsx';

// 1. Leer guia.xlsx
const fileData = fs.readFileSync('guia.xlsx');
const workbook = XLSX.read(fileData, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Función para deducir una categoría realista según el nombre
const guessCategory = (productName) => {
  const name = String(productName).toUpperCase();
  
  if (name.includes('ACEITE')) return 'Aceites y Mantecas';
  if (name.includes('ARROZ') || name.includes('PASTA') || name.includes('HARINA') || name.includes('AVENA') || name.includes('FORORO') || name.includes('MAIZ')) return 'Granos y Cereales';
  if (name.includes('AZUCAR') || name.includes('SAL ') || name.includes('SABROSEADOR') || name.includes('CUBITO') || name.includes('ADOBO') || name.includes('MAYONESA') || name.includes('SALSA')) return 'Condimentos y Salsas';
  if (name.includes('CARAOTA') || name.includes('LENTEJA') || name.includes('FRIJOL')) return 'Granos Secos';
  if (name.includes('LECHE') || name.includes('QUESO') || name.includes('MANTEQUILLA') || name.includes('MARGARINA')) return 'Lácteos';
  if (name.includes('CARNE') || name.includes('POLLO') || name.includes('CERDO') || name.includes('CHULETA') || name.includes('MORTADELA') || name.includes('SALCHICHA')) return 'Carnes y Embutidos';
  if (name.includes('CAFE')) return 'Café e Infusiones';
  if (name.includes('JUGO') || name.includes('REFRESCO') || name.includes('BEBIDA')) return 'Bebidas';
  if (name.includes('TOMATE') || name.includes('CEBOLLA') || name.includes('PAPA') || name.includes('AJO') || name.includes('ZANAHORIA')) return 'Frutas y Vegetales';
  if (name.includes('JABON') || name.includes('CLORO') || name.includes('DESINFECTANTE') || name.includes('ESPONJA') || name.includes('DETERGENTE')) return 'Limpieza';
  
  return 'Víveres Generales';
};

// Generar una prueba basándonos en la guía
let newRows = [
  ['Código', 'Producto', 'Categoría', 'Unidad', 'Cantidad', 'Precio', 'Vencimiento']
];

for(let i = 1; i < data.length; i++) {
  let row = data[i];
  // Ignorar cabeceras sueltas o filas vacías
  if(row && row.length >= 2 && row[0] !== 'PRODUCTOS') {
    
    let product = row[0]; // Ej: 'ACEITE COPOSA 850ML'
    let unit = row[1];    // Ej: 'CAJA'
    
    // Si la fila tiene sentido (el producto es un string largo)
    if(typeof product === 'string' && product.length > 3) {
      let code = `PROD-${String(newRows.length).padStart(3, '0')}`;
      let category = guessCategory(product);
      let quantity = Math.floor(Math.random() * 50) + 10;
      let price = (Math.random() * 10 + 1).toFixed(2); // Entre 1 y 11 dólares
      let expiration = '31/12/2026';
      
      newRows.push([code, product, category, unit, quantity, price, expiration]);
    }
  }
}

// Escribir archivo de prueba
const ws = XLSX.utils.aoa_to_sheet(newRows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Recepción');

const outBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('prueba_importacion_v2.xlsx', outBuffer);

console.log('✅ Archivo prueba_importacion_v2.xlsx RE-GENERADO con categorias realistas.');
