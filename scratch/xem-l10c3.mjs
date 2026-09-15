// Xem khoá học lớp 10 và chương/bài/module hiện có quanh chương 3
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: kh } = await sb.from('courses').select("id,title");
console.log(kh.map(k => `${k.title} (${k.id})`).join('\n'));
const k10 = kh.filter(k => /10/.test(k.title));
for (const k of k10) {
  const { data: ch } = await sb.from('chapters').select("id,title,order_index,loai").eq('course_id', k.id).order('order_index');
  console.log('\n== ' + k.title);
  for (const c of ch) {
    const { data: ls } = await sb.from('lessons').select('id,title,order_index').eq('chapter_id', c.id).order('order_index');
    console.log(`  ${c.order_index}. ${c.title} [${c.loai || ''}] (${c.id})`);
    for (const l of ls) {
      const { data: ms } = await sb.from('lesson_modules').select('id,title,type,order_index').eq('lesson_id', l.id).order('order_index');
      console.log(`     - ${l.title} (${l.id}) : ${ms.map(m => `${m.type}:${m.title}`).join(' | ')}`);
    }
  }
}
