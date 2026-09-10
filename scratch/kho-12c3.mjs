/* Kho câu hỏi chương 3 lớp 12 (phân tán): đếm theo dạng, loại, mức. Có phân trang. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dm } = await sb.from('question_categories').select('*').eq('grade', '12');
const topic = [...new Set(dm.map(d => d.topic))].find(t => /phân tán/i.test(t || ''));
console.log(`Chương trong kho: "${topic}"\n`);

const tatCa = [];
for (let tu = 0; ; tu += 1000) {
  const { data } = await sb.from('questions')
    .select('id,question_id,lesson,math_form,question_type,difficulty,content,option_a,option_b,option_c,option_d,correct_answer,explanation,image_url,usage_count')
    .eq('grade', '12').eq('topic', topic).range(tu, tu + 999);
  if (!data?.length) break;
  tatCa.push(...data);
  if (data.length < 1000) break;
}
console.log(`Tổng ${tatCa.length} câu`);
writeFileSync('scratch/kho-12c3.json', JSON.stringify(tatCa));

const gom = new Map();
for (const q of tatCa) {
  const k = `${q.lesson} || ${q.math_form}`;
  if (!gom.has(k)) gom.set(k, []);
  gom.get(k).push(q);
}
console.log('\ndạng'.padEnd(64) + 'tổng  NLC   DS  TLN   TL  |  m1  m2  m3  m4');
for (const [k, ds] of [...gom].sort((a, b) => b[1].length - a[1].length)) {
  const t = (v) => ds.filter(x => x.question_type === v).length;
  const m = (v) => ds.filter(x => String(x.difficulty) === v).length;
  console.log(k.slice(0, 62).padEnd(64)
    + String(ds.length).padStart(4) + String(t('NLC')).padStart(5) + String(t('DS')).padStart(5)
    + String(t('TLN')).padStart(5) + String(t('TL')).padStart(5) + '  |'
    + String(m('1')).padStart(4) + String(m('2')).padStart(4) + String(m('3')).padStart(4) + String(m('4')).padStart(4));
}

/* Câu dùng được làm câu tương tác / bài tập: phải có đáp án */
console.log('\nCâu CÓ đáp án (dùng được cho bài tập lớp 12):');
for (const b of [...new Set(tatCa.map(q => q.lesson))]) {
  const co = (t) => tatCa.filter(q => q.lesson === b && q.question_type === t
    && String(q.correct_answer || '').trim()).length;
  console.log(`   ${String(b).padEnd(46)} NLC ${String(co('NLC')).padStart(3)} · DS ${String(co('DS')).padStart(3)} · TLN ${String(co('TLN')).padStart(3)}`);
}
const coAnh = tatCa.filter(q => q.image_url).length;
console.log(`\nCâu có ảnh: ${coAnh}`);
