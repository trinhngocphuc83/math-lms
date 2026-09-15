// Hai câu mở đầu ĐỀ 4, ĐỀ 5 (nhìn hình tìm dấu cos/sin) trùng với câu 2, 3 của bài giảng Bài 1
// (bài giảng được rót lại sau khi dựng đề). Thay bằng câu NLC mức 1 của Bài 1 chưa dùng ở đâu.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { khoiQuiz } from './tu-luyen-l10c3.mjs';
const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-l10c3.json', 'utf8'));
const DE = { 'bbc47553-67da-43b1-b676-44f4f034adf6': 'ĐỀ 4', '4d076cf4-3b7e-48af-9c78-d690a72782af': 'ĐỀ 5' };

const { data: kh } = await sb.from('courses').select('id').ilike('title', '%TOÁN 10%');
const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id);
const { data: ls } = await sb.from('lessons').select('id').in('chapter_id', ch.map(c => c.id));
const { data: mods } = await sb.from('lesson_modules').select('id,content_markdown').in('lesson_id', ls.map(x => x.id));
const daDung = new Set();
for (const m of mods) for (const x of (m.content_markdown || '').matchAll(/"sourceQuestionId":\s*"([^"]+)"/g)) daDung.add(x[1]);

const ung = kho.filter(q => q.lesson.startsWith('Bài 1.') && q.question_type === 'NLC' && Number(q.difficulty) === 1
  && !daDung.has(q.id) && 'ABCD'.includes(String(q.correct_answer).trim()) && !/\[CÂU HỎI CÓ THỂ BỊ SAI/.test(q.content))
  .sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0));
console.log('ứng viên:', ung.length);
mkdirSync('backups/soan-l10c3-20260915', { recursive: true });
let i = 0;
for (const [id, ten] of Object.entries(DE)) {
  const q = ung[i++];
  console.log(`\n${ten} câu 1 <- ${q.question_id} (${q.math_form}, mức ${q.difficulty})\n${q.content}\nA. ${q.option_a}\nB. ${q.option_b}\nC. ${q.option_c}\nD. ${q.option_d}\nĐáp án: ${q.correct_answer}\n${q.explanation}`);
  const m = mods.find(x => x.id === id);
  const khoiMoi = khoiQuiz(q);
  let n = 0;
  const moi = m.content_markdown.replace(/```quiz\n[\s\S]*?```/, () => { n++; return khoiMoi; });
  if (!GHI || n !== 1) { console.log(n === 1 ? '(thử)' : '✗ không thấy khối đầu'); continue; }
  writeFileSync(`backups/soan-l10c3-20260915/thay-cau-trung-${id}.md`, m.content_markdown);
  const { error } = await sb.from('lesson_modules').update({ content_markdown: moi }).eq('id', id);
  console.log(error ? '✗ ' + error.message : '✓ đã ghi ' + ten);
}
