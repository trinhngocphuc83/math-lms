/**
 * Khớp tên bài trong CÂY KHOÁ HỌC (bảng lessons) với tên bài trong KHO (question_categories).
 * Hai bên phải cùng một tên vì soi-chuong / kiem-giao-an tra dạng của bài bằng tên bài;
 * lệch một dấu hai chấm hay viết tắt "bậc 2" là bài giảng thành "kho không có dạng nào".
 *
 * Ghép: khoá "TOÁN N" -> grade N; chương theo SỐ chương (La Mã hay Ả Rập); bài theo SỐ bài.
 * Chỉ đổi tên bài "Bài N. ..." khi kho có đúng một bài số N trong chương đó.
 *
 *   node scratch/khop-ten-bai-khoa-hoc.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const LA_MA = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const soChuong = (t) => { const m = String(t).match(/ch[uư][oơ]ng\s+([IVX]+|\d+)/i); if (!m) return null; return LA_MA[m[1].toUpperCase()] ?? parseInt(m[1]); };
const soBai = (t) => { const m = String(t).match(/^Bài\s+(\d+)/i); return m ? parseInt(m[1]) : null; };

const { data: dm } = await sb.from('question_categories').select('grade,topic,lesson');
const khoBai = {};   // grade|chương -> Map(số bài -> tên)
for (const d of dm) {
  const c = soChuong(d.topic), b = soBai(d.lesson); if (c == null || b == null) continue;
  (khoBai[`${d.grade}|${c}`] ||= new Map()).set(b, d.lesson);
}
const { data: kh } = await sb.from('courses').select('id,title');
const saoLuu = []; let doi = 0;
for (const k of kh) {
  const lop = (k.title.match(/TOÁN\s+(\d+)/i) || [])[1]; if (!lop) continue;
  const { data: ch } = await sb.from('chapters').select('id,title').eq('course_id', k.id);
  for (const c of ch) {
    const sc = soChuong(c.title); if (sc == null) continue;
    const map = khoBai[`${lop}|${sc}`]; if (!map) continue;
    const { data: ls } = await sb.from('lessons').select('id,title').eq('chapter_id', c.id);
    for (const l of ls) {
      const b = soBai(l.title); if (b == null) continue;
      const ten = map.get(b); if (!ten || ten === l.title) continue;
      console.log(`  lớp ${lop} C${sc}: "${l.title}"  ->  "${ten}"`);
      doi++;
      if (GHI) { saoLuu.push(l); await sb.from('lessons').update({ title: ten }).eq('id', l.id); }
    }
  }
}
if (GHI) { const t = `backups/khop-ten-bai-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`; mkdirSync(t, { recursive: true }); writeFileSync(`${t}/lessons.json`, JSON.stringify(saoLuu, null, 1)); console.log(`✓ đã đổi ${doi} bài · sao lưu ${t}/`); }
else console.log(`Sẽ đổi ${doi} bài. Thêm "ghi" để ghi.`);
