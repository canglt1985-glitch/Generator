const fs = require('fs');
const PizZip = require('pizzip');

const files = [
    'public/templates/BBLV.docx',
    'public/templates/HOP_DONG_MOI_MAT_BANG.docx',
    'public/templates/HOP_DONG_MOI_CSHT.docx'
];

files.forEach(file => {
    const docPath = `${file}`;
    if (!fs.existsSync(docPath)) {
        console.log(`File not found: ${docPath}`);
        return;
    }
    const content = fs.readFileSync(docPath, 'binary');
    const zip = new PizZip(content);
    const xml = zip.file('word/document.xml').asText();
    
    // Strip tags to get text
    const text = xml.replace(/<[^>]+>/g, ' ');
    console.log(`=== TEXT OF ${file} ===`);
    console.log(text.slice(0, 500)); // print first 500 chars to check headers
    console.log('\n======================================\n');
});
