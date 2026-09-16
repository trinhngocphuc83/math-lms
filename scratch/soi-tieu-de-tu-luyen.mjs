// Xem các dòng tiêu đề (#, **...**) trong module có quiz của một bài, để biết có chia theo mức không.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const tenBai = process.argv[2] || 'Bài 1. Bất phương trình bậc nhất hai ẩn';
const { data: bai } = await sb.from('lessons').select('id, title').ilike('title', `%${tenBai}%`).limit(1);
const { data: mods } = await sb.from('lesson_modules').select('id, title, type, content_markdown').eq('lesson_id', bai[0].id);
for (const m of mods) {
  const md = String(m.content_markdown || '');
  if (!md.includes('```quiz')) continue;
  console.log(`\n=== [${m.type}] ${m.title}`);
  const dong = md.split('\n');
  let trongQuiz = false;
  for (const d of dong) {
    if (d.startsWith('```quiz')) { trongQuiz = true; console.log('    [quiz]'); continue; }
    if (trongQuiz) { if (d.startsWith('```')) trongQuiz = false; continue; }
    if (/^\s*(#{1,4}\s|\*\*|>\s*#|<h\d)/.test(d) || /nhận biết|thông hiểu|vận dụng|mức/i.test(d)) console.log('  ', d.slice(0, 110));
  }
}
