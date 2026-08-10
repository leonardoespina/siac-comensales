const XLSX = require('xlsx');

// 1. Leer guia.xlsx
const workbook = XLSX.readFile('guia.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Cabeceras de guia.xlsx:", data[0]);
console.log("Muestra de datos (Fila 2 y 3):");
console.log(data[1]);
console.log(data[2]);

// 2. Mapear algunos datos a nuestra estructura
// ['Código', 'Producto', 'Categoría', 'Unidad', 'Cantidad', 'Precio', 'Vencimiento']

// Vamos a recolectar unos 10 items al azar (o los primeros 10) que tengan algo de sentido
let sampleItems = [];
// Saltar cabecera
for(let i = 1; i < Math.min(15, data.length); i++) {
  let row = data[i];
  if(row && row.length > 0) {
    // Tratamos de deducir qué es cada columna de guia.xlsx
    // Supondremos que nos basamos en los índices de arreglo devueltos.
    sampleItems.push(row);
  }
}

console.log("Total filas en guia:", data.length);
