const fs = require('fs');
const filePath = 'C:\\Users\\divisionprogramacion\\.gemini\\antigravity\\brain\\ca180c3f-bdfa-4ce2-bc4e-0ab493309ca6\\reporte_commits_julio.csv';
let content = fs.readFileSync(filePath, 'utf8');
// Solo agregar BOM si no lo tiene
if (content.charCodeAt(0) !== 0xFEFF) {
  content = '\uFEFF' + content;
  fs.writeFileSync(filePath, content, 'utf8');
}
