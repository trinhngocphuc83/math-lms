/**
 * Đếm module bài giảng có \neq / \ne bị phép thay "\n" làm hỏng.
 *
 * Trong khối ```quiz``` (JSON), lệnh LaTeX \neq được ghi là "\\neq" (hai dấu chéo). Nếu
 * thấy "\neq" chỉ MỘT dấu chéo ngay sau kí tự thường thì đó là dấu xuống dòng JSON + "eq"
 * — tức đã hỏng. Chạy ở cả hai app.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
let mods = [], from = 0;
while (true) {
  const { data } = await sb.from('lesson_modules').select('id,title,lesson_id,content_markdown').range(from, from + 999);
  mods.push(...(data || [])); if (!data || data.length < 1000) break; from += 1000;
}
/* Chỉ xét BÊN TRONG khối ```quiz``` — ngoài khối, "\neq" một dấu chéo là LaTeX bình thường. */
const HONG = /(^|[^\\])\\n(eq|e\b|abla|u\b|ot\b)/g;
const demHong = (md) => {
  let n = 0;
  for (const k of (md || '').matchAll(/```quiz\n([\s\S]*?)\n```/g)) n += (k[1].match(HONG) || []).length;
  return n;
};
const hong = mods.map(m => ({ ...m, so: demHong(m.content_markdown) })).filter(m => m.so > 0);
console.log(`module: ${mods.length} · có \\neq bị hỏng trong khối quiz: ${hong.length} · tổng ${hong.reduce((a, m) => a + m.so, 0)} chỗ`);
for (const m of hong) {
  const { data: l } = await sb.from('lessons').select('title').eq('id', m.lesson_id).maybeSingle();
  console.log(`   ${m.so} chỗ · ${l?.title} / ${m.title} (${m.id})`);
}
