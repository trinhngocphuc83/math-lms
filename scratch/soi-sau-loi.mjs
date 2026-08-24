// Soi kỹ hai nhóm lỗi lớn nhất để biết sửa được bằng máy hay phải sửa tay.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const duongDan = process.argv[2] || 'D:/claude/math-lms/.env.local';
const env = {};
for (const l of fs.readFileSync(duongDan, 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const nap = async () => {
  const ra = [];
  for (let p = 0; ; p++) {
    const { data } = await sb.from('questions')
      .select('question_id, grade, question_type, difficulty, correct_answer, option_a, option_b, option_c, option_d')
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!data?.length) break; ra.push(...data); if (data.length < 1000) break;
  }
  return ra;
};
const kho = await nap();
const T = (s) => String(s ?? '').trim();
const co4 = (q) => [q.option_a, q.option_b, q.option_c, q.option_d].every(x => T(x));

/* --- Trắc nghiệm thiếu/sai đáp án: đáp án đang ở dạng gì? --- */
const nlcHong = kho.filter(q => T(q.question_type).toUpperCase() === 'NLC'
  && !['A', 'B', 'C', 'D'].includes(T(q.correct_answer).toUpperCase())
  && !/^[ĐDTSF]{4}$/i.test(T(q.correct_answer)));

const nhom = new Map();
for (const q of nlcHong) {
  const d = T(q.correct_answer);
  let k;
  if (!d) k = co4(q) ? 'TRỐNG (nhưng có đủ 4 phương án)' : 'TRỐNG và cũng thiếu phương án';
  else if (/^[a-d]$/.test(d)) k = 'chữ thường a/b/c/d — máy sửa được ngay';
  else if (/^[1-4]$/.test(d)) k = 'ghi số 1..4 thay vì chữ cái — máy sửa được ngay';
  else if (co4(q) && [q.option_a, q.option_b, q.option_c, q.option_d].some(o => T(o) === d))
    k = 'ghi NGUYÊN NỘI DUNG phương án — máy dò ra được vị trí';
  else k = `dạng khác: "${d.slice(0, 24)}"`;
  nhom.set(k, (nhom.get(k) || 0) + 1);
}
console.log(`TRẮC NGHIỆM thiếu/sai đáp án: ${nlcHong.length} câu`);
[...nhom.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
  console.log(`  ${String(n).padStart(4)}  ${k}`));

/* --- Đúng/Sai thiếu đáp án --- */
const dsHong = kho.filter(q => T(q.question_type).toUpperCase() === 'DS' && !/^[ĐDTSF]{4}$/i.test(T(q.correct_answer)));
const nhomDS = new Map();
for (const q of dsHong) {
  const d = T(q.correct_answer);
  const k = !d ? 'TRỐNG' : (/^[ĐDTSF]+$/i.test(d) ? `chỉ có ${d.length} ký tự Đ/S thay vì 4` : `dạng khác: "${d.slice(0, 20)}"`);
  nhomDS.set(k, (nhomDS.get(k) || 0) + 1);
}
console.log(`\nĐÚNG/SAI thiếu/sai đáp án: ${dsHong.length} câu`);
[...nhomDS.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
  console.log(`  ${String(n).padStart(4)}  ${k}`));

/* --- Mức độ không hợp lệ --- */
const mucHong = kho.filter(q => !['1', '2', '3', '4'].includes(T(q.difficulty)));
const nhomMuc = new Map();
for (const q of mucHong) {
  const k = `"${T(q.difficulty) || '(trống)'}"`;
  nhomMuc.set(k, (nhomMuc.get(k) || 0) + 1);
}
if (mucHong.length) {
  console.log(`\nMỨC ĐỘ không hợp lệ: ${mucHong.length} câu`);
  [...nhomMuc.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
    console.log(`  ${String(n).padStart(4)}  ${k}`));
}
