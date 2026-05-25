const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);

let documentXml = zip.file('word/document.xml').asText();

// Word XML splits text arbitrarily. It's often hard to just replace.
// But if they literally typed {{ {{, it might be split across tags like <w:t>{{</w:t>...<w:t>{{</w:t>.
// Let's strip all XML tags out just to see what the raw text looks like.
const stripped = documentXml.replace(/<[^>]+>/g, '');
console.log("Raw text snippet:", stripped.substring(stripped.indexOf('{{'), stripped.indexOf('{{') + 500));
