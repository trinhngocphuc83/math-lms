// Dò kho lớp 10 chương 3 theo cụm chữ đặc trưng: node scratch/nap-kho/do-cum.mjs "cụm 1" "cụm 2" ...
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = readFileSync('.env.local', 'utf8');
const g = (k) => env.match(new RegExp(k + '=(.*)'))[1].trim();
const sb = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY') || g('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
const { data } = await sb.from('questions').select('question_id,content,option_a,option_b,option_c,option_d').eq('grade', '10').ilike('topic', '%Hệ thức lượng%');
const S = (t) => String(t || '').replace(/\s+/g, '');
for (const k of process.argv.slice(2)) {
  const kk = S(k);
  const hits = data.filter(q => S([q.content, q.option_a, q.option_b, q.option_c, q.option_d].join(' ')).includes(kk));
  console.log(`${k} => ${hits.length}  ${hits.slice(0, 3).map(h => h.question_id + ' ' + h.content.slice(0, 70).replace(/\n/g, ' ')).join(' || ')}`);
}
