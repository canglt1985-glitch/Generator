const fs = require('fs');
const PizZip = require('pizzip');
const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();
const matches = xml.match(/<w:t>([^<]*?[{}]+[^<]*?)<\/w:t>/g);
console.log(matches.slice(0, 10));
