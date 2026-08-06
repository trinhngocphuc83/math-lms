// BƯỚC 1 — CHỈ ĐỌC. Sao lưu toàn bộ bảng questions và question_categories
// ra file JSON trước khi làm bất kỳ thay đổi nào.
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

const OUT_DIR = path.join('D:/claude/math-lms/backups/cleanup_2026-08-05');

async function fetchAll(table, columns) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  console.log('Đang sao lưu bảng "questions"...');
  const questions = await fetchAll('questions', '*');
  fs.writeFileSync(path.join(OUT_DIR, 'questions.backup.json'), JSON.stringify(questions, null, 2), 'utf8');
  console.log(`  Đã lưu ${questions.length} bản ghi -> backups/cleanup_2026-08-05/questions.backup.json`);

  console.log('Đang sao lưu bảng "question_categories"...');
  const cats = await fetchAll('question_categories', '*');
  fs.writeFileSync(path.join(OUT_DIR, 'question_categories.backup.json'), JSON.stringify(cats, null, 2), 'utf8');
  console.log(`  Đã lưu ${cats.length} bản ghi -> backups/cleanup_2026-08-05/question_categories.backup.json`);

  console.log('\nSao lưu hoàn tất. Có thể phục hồi bất kỳ lúc nào từ 2 file JSON trên.');
})();
