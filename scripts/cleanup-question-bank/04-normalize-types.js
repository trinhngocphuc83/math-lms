// BƯỚC 4 — SỬA GIÁ TRỊ (không xoá câu nào).
// Chuẩn hoá question_type và difficulty về mã chuẩn NLC/DS/TLN/TL và 1-4.
const fs = require('fs');
const path = require('path');
function loadEnvLocal() {
  const file = path.join('D:/claude/math-lms', '.env.local');
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();
const { createClient } = require('D:/claude/math-lms/node_modules/@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TO_BANK_TYPE = {
  NLC: 'NLC', DS: 'DS', TLN: 'TLN', TL: 'TL',
  TN: 'NLC', 'ĐS': 'DS',
  multiple_choice: 'NLC', true_false_cluster: 'DS', true_false: 'DS',
  short_answer: 'TLN', essay: 'TL',
};
const TO_DIFFICULTY = {
  '1': '1', '2': '2', '3': '3', '4': '4',
  'Nhận biết': '1', 'Thông hiểu': '2', 'Vận dụng': '3', 'Vận dụng cao': '4',
};

const APPLY = process.argv.includes('--apply');

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('questions')
      .select('id, question_id, question_type, difficulty')
      .range(from, from + 999);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  const rows = await fetchAll();

  const typeFixes = [];
  const diffFixes = [];

  for (const r of rows) {
    const newType = TO_BANK_TYPE[r.question_type];
    if (newType && newType !== r.question_type) {
      typeFixes.push({ id: r.id, question_id: r.question_id, from: r.question_type, to: newType });
    }
    const newDiff = TO_DIFFICULTY[String(r.difficulty)];
    if (newDiff && newDiff !== String(r.difficulty)) {
      diffFixes.push({ id: r.id, question_id: r.question_id, from: r.difficulty, to: newDiff });
    }
  }

  console.log(`Cần sửa question_type: ${typeFixes.length} câu`);
  console.log(`Cần sửa difficulty   : ${diffFixes.length} câu`);

  if (!APPLY) {
    console.log('\n(Chế độ xem trước - chưa ghi gì. Chạy lại với --apply để thực thi.)');
    console.log('\nVí dụ 5 câu đầu sẽ sửa question_type:');
    typeFixes.slice(0, 5).forEach(f => console.log(`  ${f.question_id}: "${f.from}" -> "${f.to}"`));
    console.log('\nVí dụ 5 câu đầu sẽ sửa difficulty:');
    diffFixes.slice(0, 5).forEach(f => console.log(`  ${f.question_id}: "${f.from}" -> "${f.to}"`));
    return;
  }

  console.log('\nĐang ghi vào CSDL...');
  let done = 0;
  for (const f of typeFixes) {
    const { error } = await supabase.from('questions').update({ question_type: f.to }).eq('id', f.id);
    if (error) console.error(`  Lỗi ${f.question_id}: ${error.message}`);
    else done++;
  }
  console.log(`  Đã sửa question_type: ${done}/${typeFixes.length}`);

  done = 0;
  for (const f of diffFixes) {
    const { error } = await supabase.from('questions').update({ difficulty: f.to }).eq('id', f.id);
    if (error) console.error(`  Lỗi ${f.question_id}: ${error.message}`);
    else done++;
  }
  console.log(`  Đã sửa difficulty   : ${done}/${diffFixes.length}`);
})();
