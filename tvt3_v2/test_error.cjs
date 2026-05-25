const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);

try {
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
    });
    console.log("Success!!!");
} catch (error) {
    console.log(error.properties.errors[0]);
}
