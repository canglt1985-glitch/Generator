const fs = require('fs');
const PizZip = require('pizzip');

const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);

let xml = zip.file('word/document.xml').asText();

// Fix { { split by XML
xml = xml.replace(/\{((?:<[^>]+>)+)\{/g, '{{$1');
// Fix } } split by XML
xml = xml.replace(/\}((?:<[^>]+>)+)\}/g, '}}$1');

zip.file('word/document.xml', xml);

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(docPath, buf);
console.log("Fixed template!");
