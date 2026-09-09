/* Kho câu hỏi chương 2 lớp 11: đếm theo dạng, theo loại câu, theo mức. Có phân trang vì
   Supabase mặc định trả tối đa 1000 dòng. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TOPIC = 'Chương 2. Dãy số - Cấp số cộng - Cấp số nhân';
const tatCa = [];
for (let tu = 0; ; tu += 1000) {
  const { data, error } = await sb.from('questions')
    .select('id,question_id,lesson,math_form,question_type,difficulty,content,option_a,option_b,option_c,option_d,correct_answer,explanation,image_url')
    .eq('grade', '11').eq('topic', TOPIC).range(tu, tu + 999);
  if (error) { console.error(error.message); break; }
  if (!data?.length) break;
  tatCa.push(...data);
  if (data.length < 1000) break;
}
console.log(`Tổng ${tatCa.length} câu\n`);

const gom = new Map();
for (const q of tatCa) {
  const k = `${q.lesson} || ${q.math_form}`;
  if (!gom.has(k)) gom.set(k, []);
  gom.get(k).push(q);
}
const nhan = { NLC: 'multiple_choice', DS: 'true_false', TLN: 'short_answer', TL: 'essay' };
console.log('dạng'.padEnd(58) + 'tổng   NLC   DS  TLN   TL  |  NB  TH  VD  VDC');
for (const [k, ds] of [...gom].sort((a, b) => b[1].length - a[1].length)) {
  const d = (t) => ds.filter(q => q.question_type === t).length;
  const m = (t) => ds.filter(q => String(q.difficulty).toLowerCase().includes(t)).length;
  console.log(k.slice(0, 56).padEnd(58)
    + String(ds.length).padStart(5) + String(d('multiple_choice')).padStart(6)
    + String(d('true_false')).padStart(5) + String(d('short_answer')).padStart(5)
    + String(d('essay')).padStart(5) + '  | '
    + String(m('nhận biết') || m('nhan biet')).padStart(4)
    + String(m('thông hiểu')).padStart(4)
    + String(m('vận dụng cao') ? m('vận dụng') - m('vận dụng cao') : m('vận dụng')).padStart(4)
    + String(m('vận dụng cao')).padStart(5));
}
console.log('\nCác mức thật có trong kho:', JSON.stringify([...new Set(tatCa.map(q => q.difficulty))]));
console.log('Các loại câu thật có:', JSON.stringify([...new Set(tatCa.map(q => q.question_type))]));
writeFileSync('scratch/kho-11c2.json', JSON.stringify(tatCa));
console.log('-> scratch/kho-11c2.json');
