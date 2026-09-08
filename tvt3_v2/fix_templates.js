import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const templatesDir = path.resolve('./public/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));

console.log('Fixing unclosed tags in templates...');

files.forEach(file => {
  const filePath = path.join(templatesDir, file);
  try {
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    let docXml = zip.file('word/document.xml')?.asText();

    if (docXml && docXml.includes('{{ADDRESS_OLD')) {
      console.log(`Found {{ADDRESS_OLD in ${file}`);
      
      // Fix unclosed {{ADDRESS_OLD if it's missing }}
      // Replace {{ADDRESS_OLD with {{ADDRESS_OLD}} when not followed by }}
      docXml = docXml.replace(/\{\{ADDRESS_OLD(?!\s*\}\})/g, '{{ADDRESS_OLD}}');
      
      // Also clean up any doubled brackets if created
      docXml = docXml.replace(/\{\{ADDRESS_OLD\}\}\}\}/g, '{{ADDRESS_OLD}}');
      docXml = docXml.replace(/\{\{ADDRESS_OLD\}\}\}/g, '{{ADDRESS_OLD}}');
      
      zip.file('word/document.xml', docXml);
      const outBuf = zip.generate({ type: 'nodebuffer' });
      fs.writeFileSync(filePath, outBuf);
      console.log(`✅ Fixed & Saved: ${file}`);
    }
  } catch (err) {
    console.error(`Error fixing ${file}:`, err);
  }
});
