import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {}; for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const lop = process.argv[2], tu = +process.argv[3], den = +process.argv[4];
const { data: dm } = await sb.from('question_categories').select('subject,topic,lesson,math_form,yeu_cau_can_dat').eq('grade', lop).order('topic').order('lesson');
const { data: q } = await sb.from('questions').select('topic,lesson,math_form').eq('grade', lop);
const dem = {}; for (const x of q) dem[`${x.topic}|${x.lesson}|${x.math_form}`] = (dem[`${x.topic}|${x.lesson}|${x.math_form}`] || 0) + 1;
let last = '';
for (const d of dm) {
  const n = +(d.topic.match(/^Chương (\d+)/) || [])[1]; if (n < tu || n > den) continue;
  if (d.topic + d.lesson !== last) { console.log(`\n[${d.subject}] ${d.topic} / ${d.lesson}`); last = d.topic + d.lesson; }
  console.log(`   ${String(dem[`${d.topic}|${d.lesson}|${d.math_form}`] || 0).padStart(3)}  ${d.math_form}  ⟶ ${d.yeu_cau_can_dat || '(trống)'}`);
}
