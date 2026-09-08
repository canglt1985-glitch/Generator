import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const templatesDir = path.resolve('./public/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));

console.log('Auditing templates in:', templatesDir);

files.forEach(file => {
  const filePath = path.join(templatesDir, file);
  try {
    const content = fs.readFileSync(filePath);
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

    doc.render({});
    console.log(`✅ [OK]: ${file}`);
  } catch (err) {
    console.error(`❌ [ERROR] in ${file}:`);
    if (err.properties && err.properties.errors) {
      err.properties.errors.forEach(e => {
        console.error(`   - Tag: ${e.properties?.xtag || ''} -> ${e.properties?.explanation || e.message}`);
      });
    } else {
      console.error(`   - ${err.message}`);
    }
  }
});
