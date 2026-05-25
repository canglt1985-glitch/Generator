const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const docPath = 'public/templates/PHU_LUC_GIAM_GIA_CSHT.docx';
try {
    const content = fs.readFileSync(docPath, 'binary');
    const zip = new PizZip(content);
    
    // Extract all tags using docxtemplater internal logic (simulated by regex)
    // Wait, since Word splits the string, regex might not catch all!
    // But let's try regex first, removing XML tags.
    const xml = zip.file('word/document.xml').asText();
    const stripped = xml.replace(/<[^>]+>/g, '');
    const tags = stripped.match(/\{\{.*?\}\}/g);
    
    if (tags) {
        const uniqueTags = [...new Set(tags.map(t => t.replace(/[{}]/g, '').trim()))];
        console.log("TAGS IN PHU_LUC_GIAM_GIA_CSHT:");
        console.log(uniqueTags);
    } else {
        console.log("No tags found.");
    }
} catch (e) {
    console.log("Error:", e.message);
}
