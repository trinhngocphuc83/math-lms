// Đo vì sao hộp "Nhập câu vào bộ câu hỏi trò chơi" báo mọi câu "Mức: chưa rõ":
// các khối quiz trong bài có sourceQuestionId không, kho có difficulty không, difficulty dạng gì.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tenBai = process.argv[2] || 'Bất phương trình bậc nhất hai ẩn';
const { data: bai } = await sb.from('lessons').select('id, title, chapter_id').ilike('title', `%${tenBai}%`);
console.log('Bài khớp:', bai.map(b => b.title));
const ids = bai.map(b => b.id);
const { data: mods } = await sb.from('lesson_modules').select('id, title, type, lesson_id, content_markdown').in('lesson_id', ids);
const MAU = /```quiz\s*\n([\s\S]*?)```/g;
let tong = 0, coSrc = 0, coMuc = 0; const src = [];
for (const m of mods) {
  let n = 0, s = 0, mu = 0;
  for (const x of String(m.content_markdown || '').matchAll(MAU)) {
    try {
      const q = JSON.parse(x[1]);
      for (const k of Array.isArray(q) ? q : [q]) {
        if (!k?.question) continue;
        n++; if (k.sourceQuestionId) { s++; src.push(k.sourceQuestionId); } if (k.muc) mu++;
      }
    } catch {}
  }
  tong += n; coSrc += s; coMuc += mu;
  console.log(`  [${m.type}] ${m.title}: ${n} câu, ${s} có sourceQuestionId, ${mu} có muc`);
}
console.log(`TỔNG ${tong} câu · ${coSrc} có sourceQuestionId · ${coMuc} có muc`);
const uniq = [...new Set(src)];
const { data: qs } = await sb.from('questions').select('id, difficulty').in('id', uniq.slice(0, 200));
const dem = {};
for (const q of qs || []) dem[String(q.difficulty)] = (dem[String(q.difficulty)] || 0) + 1;
console.log('difficulty trong kho của các câu ấy:', dem, '· tìm thấy', (qs || []).length, '/', uniq.length);

// Toàn kho: cột difficulty đang mang những giá trị gì
const { data: mau } = await sb.from('questions').select('difficulty').limit(2000);
const demKho = {};
for (const q of mau || []) demKho[String(q.difficulty)] = (demKho[String(q.difficulty)] || 0) + 1;
console.log('difficulty 2000 câu đầu kho:', demKho);
