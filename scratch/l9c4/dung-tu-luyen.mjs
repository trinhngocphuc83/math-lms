/**
 * Dựng module luyện tập từ scratch/l9c4/tu-luyen/N.json (đã rút bằng rut-tu-luyen.mjs):
 * mỗi câu một khối ```quiz``` tự luận đúng khuôn app (question, answer, sourceQuestionId,
 * maCauHoi, muc); xếp theo mức tăng dần, nhóm theo dạng có tiêu đề.
 *   node scratch/l9c4/dung-tu-luyen.mjs          → xem + ghi scratch/l9c4/ra-tuluyen-N.md
 *   node scratch/l9c4/dung-tu-luyen.mjs --ghi    → ghi vào module
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { khoiTuCau } from './dung-ly-thuyet.mjs';

const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const GHI = process.argv.includes('--ghi');
const TEN_MUC = { 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng', 4: 'Vận dụng cao' };

for (const so of [1, 2, 3, 4]) {
  const { lessonId, bai, module, cau } = JSON.parse(readFileSync(`D:/claude/math-lms/scratch/l9c4/tu-luyen/${so}.json`, 'utf8'));
  /* Nhóm theo dạng, trong dạng xếp mức tăng dần; dạng nhiều câu lên trước */
  const theoDang = new Map();
  for (const q of cau) { const d = q.math_form; if (!theoDang.has(d)) theoDang.set(d, []); theoDang.get(d).push(q); }
  const dang = [...theoDang.entries()].sort((a, b) => b[1].length - a[1].length);
  const ra = [];
  const tieuDe = module === 'Bài tập tự luyện' ? `## 📝 BÀI TẬP TỰ LUYỆN — ${cau.length} CÂU TỰ LUẬN` : `## 📝 ${module.toUpperCase()} — ÔN TẬP CHƯƠNG IV (${cau.length} câu tự luận)`;
  ra.push(tieuDe, '', 'Trình bày lời giải đầy đủ từng câu. Làm xong bấm **Hiển thị đáp án** để đối chiếu với lời giải mẫu. Mỗi câu ghi mức: *Nhận biết · Thông hiểu · Vận dụng*.', '');
  let stt = 0;
  for (const [ten, ds] of dang) {
    ra.push(`### 💡 ${ten}`, '');
    for (const q of ds.sort((a, b) => Number(a.difficulty) - Number(b.difficulty))) {
      stt++;
      const k = khoiTuCau(q);
      k.question = `**Câu ${stt}** *(${TEN_MUC[Number(q.difficulty)] || 'Thông hiểu'})*. ` + k.question;
      ra.push('```quiz\n' + JSON.stringify(k, null, 2) + '\n```', '');
    }
    ra.push('---', '');
  }
  const md = ra.join('\n').trim() + '\n';
  writeFileSync(`D:/claude/math-lms/scratch/l9c4/ra-tuluyen-${so}.md`, md);
  console.log(`${bai} › ${module}: ${cau.length} câu, ${md.length} kí tự`);
  if (!GHI) continue;
  const { data: mod } = await sb.from('lesson_modules').select('id').eq('lesson_id', lessonId).eq('title', module).single();
  const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', mod.id);
  console.log(error ? '   LỖI ' + error.message : '   đã ghi ' + mod.id);
}
