// Xuất toàn bộ câu chương 3 lớp 10 ra scratch/kho-l10c3.json để các script soạn chương dùng chung
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const all = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('questions').select('*').eq('grade', '10').ilike('topic', '%Hệ thức lượng%').range(from, from + 999);
  if (error) { console.error(error.message); process.exit(1); }
  all.push(...data); if (data.length < 1000) break;
}
writeFileSync('scratch/kho-l10c3.json', JSON.stringify(all, null, 1));
const dem = {};
for (const q of all) { const k = `${q.lesson} | ${q.math_form} | ${q.question_type}`; dem[k] = (dem[k] || 0) + 1; }
console.log(all.length + ' câu');
for (const k of Object.keys(dem).sort()) console.log(dem[k].toString().padStart(4), k);
