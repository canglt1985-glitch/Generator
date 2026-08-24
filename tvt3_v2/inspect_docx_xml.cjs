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
    
    console.log(`=== ANALYZING ${file} ===`);
    const keywords = ['BÊN A', 'BÊN B', 'HỢP ĐỒNG', 'TỜ TRÌNH', 'BIÊN BẢN', 'MOBI', 'Đồng Nai'];
    keywords.forEach(kw => {
        const count = (xml.match(new RegExp(kw, 'gi')) || []).length;
        console.log(`  Keyword "${kw}": ${count} matches`);
    });
    console.log('----------------------------------------');
});
