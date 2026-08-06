// BƯỚC 5 — SỬA GIÁ TRỊ (không xoá câu nào).
// Sửa các ký tự điều khiển do JSON.parse nuốt dấu \ (\f -> \frac, \r -> \right...).
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

// Giống hệt cleanLatexControlChars trong src/utils/latexFixer.ts
function cleanLatexControlChars(s) {
  if (!s || typeof s !== 'string') return s;
  let res = s;
  res = res.replace(/\x0Crac/g, '\\frac');
  res = res.replace(/\x0Bec/g, '\\vec');
  res = res.replace(/\x08eta/g, '\\beta');
  res = res.replace(/\x08egin/g, '\\begin');
  res = res.replace(/\x09an/g, '\\tan');
  res = res.replace(/\x09heta/g, '\\theta');
  res = res.replace(/\x0Dightarrow/g, '\\rightarrow');
  res = res.replace(/\x0Dight/g, '\\right');
  return res;
}

const FIELDS = ['content', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'];
const APPLY = process.argv.includes('--apply');

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('questions')
      .select('id, question_id, ' + FIELDS.join(', '))
      .range(from, from + 999);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  const rows = await fetchAll();
  const fixes = [];

  for (const r of rows) {
    const update = {};
    let changed = false;
    for (const field of FIELDS) {
      const fixed = cleanLatexControlChars(r[field]);
      if (fixed !== r[field]) { update[field] = fixed; changed = true; }
    }
    if (changed) fixes.push({ id: r.id, question_id: r.question_id, update, before: r });
  }

  console.log(`Cần sửa LaTeX: ${fixes.length} câu`);

  if (!APPLY) {
    console.log('\n(Chế độ xem trước - chưa ghi gì. Chạy lại với --apply để thực thi.)\n');
    for (const f of fixes) {
      console.log(`  ${f.question_id}:`);
      for (const field of Object.keys(f.update)) {
        console.log(`    ${field}: ${JSON.stringify(String(f.before[field]).slice(0, 60))}`);
        console.log(`      -> ${JSON.stringify(String(f.update[field]).slice(0, 60))}`);
      }
    }
    return;
  }

  console.log('\nĐang ghi vào CSDL...');
  let done = 0;
  for (const f of fixes) {
    const { error } = await supabase.from('questions').update(f.update).eq('id', f.id);
    if (error) console.error(`  Lỗi ${f.question_id}: ${error.message}`);
    else done++;
  }
  console.log(`  Đã sửa: ${done}/${fixes.length}`);
})();
