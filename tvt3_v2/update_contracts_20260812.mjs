import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
for (const line of envText.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

console.log('Using URL:', url);
const supabase = createClient(url, key);

async function main() {
  const jsonPath = '/Users/cang_it/.gemini/antigravity-ide/brain/2ff8da16-2f3c-4f73-8f34-863928a88395/scratch/contracts_20260812.json';
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const contractsMap = JSON.parse(rawData);

  console.log(`Loaded ${Object.keys(contractsMap).length} contract entries from JSON.`);

  const { data: dbSites, error } = await supabase.from('datasites').select('site_id, site_id_old');
  if (error) {
    console.error('Error fetching sites:', error);
    return;
  }

  console.log(`Fetched ${dbSites.length} sites from Supabase.`);
  let updatedCount = 0;

  for (const site of dbSites) {
    const sId = site.site_id;
    const sIdOld = site.site_id_old;

    let cInfo = contractsMap[sIdOld] || contractsMap[sId];
    if (!cInfo) {
      for (const [k, v] of Object.entries(contractsMap)) {
        if (k && (k === sId || k === sIdOld || (k.length > 4 && (sId?.includes(k) || sIdOld?.includes(k))))) {
          cInfo = v;
          break;
        }
      }
    }

    if (cInfo) {
      const { error: upErr } = await supabase.from('datasites').update({ contract_info: cInfo }).eq('site_id', sId);
      if (upErr) {
        console.error(`Error updating site ${sId}:`, upErr);
      } else {
        updatedCount++;
        if (updatedCount % 20 === 0 || updatedCount === dbSites.length) {
          console.log(`[${updatedCount}/${dbSites.length}] Updated contract info for station ${sId} (${sIdOld})`);
        }
      }
    }
  }

  console.log(`\n🎉 FINISHED! Successfully updated official contract data for ${updatedCount} / ${dbSites.length} stations!`);
}

main();
