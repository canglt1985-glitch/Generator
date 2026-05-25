const fs = require('fs');
const PizZip = require('pizzip');

const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);

let documentXml = zip.file('word/document.xml').asText();
let idx = documentXml.indexOf('CONTRACT_NO');
console.log("XML snippet:", documentXml.substring(idx - 100, idx + 100));
