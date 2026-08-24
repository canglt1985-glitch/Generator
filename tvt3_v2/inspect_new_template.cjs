const fs = require('fs');
const PizZip = require('pizzip');

const docPath = 'public/templates/BBLV.docx';
if (!fs.existsSync(docPath)) {
    console.error(`File not found: ${docPath}`);
    process.exit(1);
}

const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

// Strip tags to get text
const text = xml.replace(/<[^>]+>/g, ' ');
console.log("=== FULL TEXT CONTENT OF NEW BBLV.docx ===");
console.log(text.trim().replace(/\s+/g, ' ').slice(0, 4000));
console.log("\n=========================================\n");
