const fs = require('fs');
const PizZip = require('pizzip');
const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);
let documentXml = zip.file('word/document.xml').asText();
const stripped = documentXml.replace(/<[^>]+>/g, '');
console.log("ALL TAGS:", stripped.match(/\{.*?\}|}/g));
