const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const docPath = 'public/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);

const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    parser: function(tag) {
        return {
            get: function(scope) {
                const key = tag.trim();
                return scope[key] !== undefined ? scope[key] : '';
            }
        };
    }
});

doc.render({
    CONTRACT_NO: "HD-1234",
    CONTRACT_DATE: "12/12/2025",
    OWNER_NAME: "Nguyen Van A",
    ADDRESS_OLD: "Old Address",
    ADDRESS_NEW: "New Address",
    ACCOUNT_OWNER: "Nguyen Van A",
    ACCOUNT_NO: "123456789",
    BANK_NAME: "Vietcombank",
    PHONE: "0909090909"
});

const text = doc.getFullText();
console.log("Rendered text contains HD-1234:", text.includes("HD-1234"));
console.log("Rendered text contains undefined:", text.includes("undefined"));
