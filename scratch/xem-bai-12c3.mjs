import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: kh } = await sb.from('courses').select('id,title').ilike('title', '%12%');
for (const k of kh) {
  const { data: ch } = await sb.from('chapters').select('id,title,loai')
    .eq('course_id', k.id).order('order_index');
  const c3 = (ch || []).find(x => /PHÂN TÁN/i.test(x.title));
  if (!c3) continue;
  console.log(`${k.title} · ${c3.title}\n`);
  const { data: bai } = await sb.from('lessons').select('id,title,order_index')
    .eq('chapter_id', c3.id).order('order_index');
  for (const b of bai || []) {
    const { data: mods } = await sb.from('lesson_modules')
      .select('id,type,title,order_index,content_markdown').eq('lesson_id', b.id).order('order_index');
    console.log(`### ${b.title}  (${b.id})`);
    for (const m of mods || []) {
      console.log(`   [${m.order_index}] ${m.type.padEnd(9)} "${m.title || ''}" ${(m.content_markdown || '').length} ký tự  (${m.id})`);
    }
    const lt = (mods || []).find(m => m.type === 'theory');
    if (lt?.content_markdown) {
      const ten = b.title.replace(/[^0-9A-Za-z]/g, '_').slice(0, 10);
      writeFileSync(`scratch/12c3-${ten}.md`, lt.content_markdown);
    }
  }
  /* Chuyên đề ôn tập của khối này */
  const on = (ch || []).find(x => x.loai === 'on-tap');
  if (on) {
    const { data: b2 } = await sb.from('lessons').select('id,title').eq('chapter_id', on.id).order('order_index');
    console.log(`\nChuyên đề ôn tập: ${(b2 || []).map(x => `"${x.title}"`).join(' · ')}`);
  }
}
