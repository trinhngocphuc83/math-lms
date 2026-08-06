// BƯỚC 6 — XOÁ (đã được Thầy xác nhận). CHỈ xoá các nhóm câu trùng nội dung
// mà MỌI thứ khác cũng giống hệt nhau (cùng dạng câu hỏi, cùng Tên bài).
// Nhóm trùng nội dung nhưng khác dạng/tên bài (có thể là chủ đích) KHÔNG bị đụng tới.
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

function normalizeQuestionForCompare(text) {
  if (!text) return '';
  return String(text)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}()[\]^_])\s*/g, '$1')
    .toLowerCase()
    .replace(/[.\s]+$/, '')
    .trim();
}

function completenessScore(q) {
  let score = 0;
  if (String(q.lesson || '').trim()) score += 10;
  if (String(q.math_form || '').trim()) score += 5;
  if (String(q.correct_answer || '').trim()) score += 5;
  if (String(q.explanation || '').trim()) score += 3;
  if (String(q.option_a || '').trim() && String(q.option_b || '').trim()) score += 2;
  score += Math.min(q.usage_count || 0, 10);
  return score;
}

const APPLY = process.argv.includes('--apply');

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('questions')
      .select('id, question_id, grade, subject, topic, lesson, math_form, question_type, difficulty, content, option_a, option_b, option_c, option_d, correct_answer, explanation, usage_count, created_at')
      .range(from, from + 999);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  const rows = await fetchAll();

  const groups = new Map();
  for (const r of rows) {
    const key = normalizeQuestionForCompare(r.content);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const toDelete = [];
  const skippedAmbiguous = [];

  for (const g of [...groups.values()].filter(g => g.length > 1)) {
    const types = new Set(g.map(x => x.question_type));
    const lessons = new Set(g.map(x => x.lesson || ''));
    const isIdentical = types.size === 1 && lessons.size <= 1;

    if (!isIdentical) {
      skippedAmbiguous.push(g);
      continue;
    }

    const sorted = [...g].sort((a, b) => completenessScore(b) - completenessScore(a));
    const keep = sorted[0];
    for (const dup of sorted.slice(1)) {
      toDelete.push({ id: dup.id, question_id: dup.question_id, keptAs: keep.question_id, content: dup.content });
    }
  }

  console.log(`Nhóm trùng "khác nhau đâu đó" - KHÔNG đụng tới: ${skippedAmbiguous.length} nhóm (${skippedAmbiguous.reduce((s, g) => s + g.length, 0)} dòng)`);
  console.log(`Sẽ xoá: ${toDelete.length} dòng (giữ lại bản điểm cao nhất mỗi nhóm)`);

  if (!APPLY) {
    console.log('\n(Chế độ xem trước - chưa xoá gì. Chạy lại với --apply để thực thi.)\n');
    console.log('Ví dụ 5 dòng đầu sẽ xoá:');
    toDelete.slice(0, 5).forEach(d => console.log(`  ${d.question_id} (giữ lại ${d.keptAs}) - ${JSON.stringify(String(d.content).slice(0, 60))}`));
    return;
  }

  console.log('\nĐang xoá...');
  let done = 0;
  for (const d of toDelete) {
    const { error } = await supabase.from('questions').delete().eq('id', d.id);
    if (error) console.error(`  Lỗi xoá ${d.question_id}: ${error.message}`);
    else done++;
  }
  console.log(`  Đã xoá: ${done}/${toDelete.length}`);
})();
