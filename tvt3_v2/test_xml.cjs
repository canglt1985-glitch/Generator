const fs = require('fs');
const PizZip = require('pizzip');
const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();
const stripped = xml.replace(/<[^>]+>/g, '');
console.log("ALL {{ :", stripped.match(/\{\{/g).length);
console.log("ALL }} :", stripped.match(/\}\}/g).length);
