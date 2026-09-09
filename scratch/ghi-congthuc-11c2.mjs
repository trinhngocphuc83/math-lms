import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const md = readFileSync('scratch/congthuc-11c2.md', 'utf8');
const SAO_LUU = 'backups/soan-11c2-20260909';

const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
const { data: chOn } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).eq('loai', 'on-tap').maybeSingle();
const { data: bai } = await sb.from('lessons').select('id').eq('chapter_id', chOn.id).eq('title', 'Cuối chương 2').maybeSingle();
const { data: cu } = await sb.from('lesson_modules').select('id,content_markdown')
  .eq('lesson_id', bai.id).eq('type', 'theory').maybeSingle();

mkdirSync(SAO_LUU, { recursive: true });
if (cu) {
  const tep = `${SAO_LUU}/congthuc-${cu.id}.md`;
  if (!existsSync(tep)) writeFileSync(tep, cu.content_markdown || '');
  const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', cu.id);
  console.log(error ? '✗ ' + error.message : `✓ cập nhật bảng công thức (${md.length} ký tự)`);
} else {
  const { error } = await sb.from('lesson_modules').insert({
    lesson_id: bai.id, title: 'Tổng hợp công thức cả chương', type: 'theory',
    content_markdown: md, order_index: 0,
  });
  console.log(error ? '✗ ' + error.message : `✓ tạo module bảng công thức (${md.length} ký tự)`);
}
const soDong = md.split('\n').filter(l => /^- \*\*.+\|.+\|/.test(l)).length;
console.log(`   ${soDong} dòng công thức đúng khuôn "- **tên** | $ct$ | dùng khi"`);
