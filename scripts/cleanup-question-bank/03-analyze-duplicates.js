// BƯỚC 3 — CHỈ ĐỌC. Phân tích các nhóm câu trùng nội dung, đề xuất giữ lại
// bản "tốt nhất" trong mỗi nhóm (đủ thông tin nhất, dùng nhiều nhất).
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

// Sao chép nguyên hàm chuẩn hoá từ src/utils/questionTypes.ts (Node không import thẳng .ts dễ dàng ở đây)
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

/** Điểm "đầy đủ thông tin" - càng cao càng nên giữ lại */
function completenessScore(q) {
  let score = 0;
  if (String(q.lesson || '').trim()) score += 10;
  if (String(q.math_form || '').trim()) score += 5;
  if (String(q.correct_answer || '').trim()) score += 5;
  if (String(q.explanation || '').trim()) score += 3;
  if (String(q.option_a || '').trim() && String(q.option_b || '').trim()) score += 2;
  score += Math.min(q.usage_count || 0, 10); // dùng nhiều được cộng điểm, tối đa 10
  return score;
}

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('questions')
      .select('id, question_id, grade, subject, topic, lesson, math_form, question_type, difficulty, content, option_a, option_b, correct_answer, explanation, usage_count, created_at')
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

  const dupGroups = [...groups.values()].filter(g => g.length > 1);
  const totalDupRows = dupGroups.reduce((s, g) => s + g.length, 0);
  const toDelete = dupGroups.reduce((s, g) => s + g.length - 1, 0);

  console.log('Tổng số nhóm trùng: ' + dupGroups.length);
  console.log('Tổng số dòng liên quan: ' + totalDupRows);
  console.log('Số dòng sẽ bị xoá (giữ 1 bản/nhóm): ' + toDelete + '\n');

  // Kiểm tra: có nhóm nào các bản KHÔNG đồng nhất về dạng/mức độ không (đáng chú ý hơn)
  let sameEverything = 0, differsSomewhere = 0;
  const diffSamples = [];

  for (const g of dupGroups) {
    const types = new Set(g.map(x => x.question_type));
    const lessons = new Set(g.map(x => x.lesson || ''));
    if (types.size > 1 || (lessons.size > 1 && [...lessons].some(l => l))) {
      differsSomewhere++;
      if (diffSamples.length < 4) diffSamples.push(g);
    } else {
      sameEverything++;
    }
  }

  console.log('Nhóm trùng nhưng khác dạng/tên bài giữa các bản: ' + differsSomewhere);
  console.log('Nhóm trùng và mọi thứ khác đều giống nhau       : ' + sameEverything);

  if (diffSamples.length) {
    console.log('\n--- Ví dụ nhóm có KHÁC BIỆT giữa các bản (cần thận trọng hơn) ---');
    for (const g of diffSamples) {
      console.log('\n  Nội dung: ' + JSON.stringify(String(g[0].content).slice(0, 70)));
      for (const r of g) {
        console.log(`    ${r.question_id}  type=${r.question_type}  lesson=${JSON.stringify(r.lesson)}  diem=${completenessScore(r)}  dung=${r.usage_count||0}`);
      }
      const best = [...g].sort((a,b) => completenessScore(b) - completenessScore(a))[0];
      console.log(`    -> ĐỀ XUẤT GIỮ: ${best.question_id} (điểm cao nhất)`);
    }
  }

  console.log('\n--- Ví dụ nhóm giống hệt nhau (an toàn xoá bản thừa) ---');
  const sameSamples = dupGroups.filter(g => {
    const types = new Set(g.map(x => x.question_type));
    const lessons = new Set(g.map(x => x.lesson || ''));
    return types.size === 1 && lessons.size <= 1;
  }).slice(0, 3);
  for (const g of sameSamples) {
    console.log('\n  Nội dung: ' + JSON.stringify(String(g[0].content).slice(0, 70)));
    for (const r of g) console.log(`    ${r.question_id}  tao_luc=${r.created_at}  dung=${r.usage_count||0}  diem=${completenessScore(r)}`);
  }
})();
