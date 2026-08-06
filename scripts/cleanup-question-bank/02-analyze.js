// BƯỚC 2 — CHỈ ĐỌC. Phân tích khả năng suy luận Tên bài cho các câu bị thiếu,
// dựa trên đối chiếu (Chuyên đề + Dạng toán) với các câu đã có Tên bài đầy đủ.
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

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('questions')
      .select('id, question_id, grade, subject, topic, lesson, math_form, question_type, content')
      .range(from, from + 999);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  const rows = await fetchAll();
  const missing = rows.filter(r => !String(r.lesson || '').trim());
  const complete = rows.filter(r => String(r.lesson || '').trim());

  console.log('Tổng số câu thiếu Tên bài: ' + missing.length);

  // Xây bảng tra: (topic|math_form) -> { lesson -> số lần xuất hiện }
  const lookup = new Map();
  for (const r of complete) {
    const key = `${r.topic}|${r.math_form}`;
    if (!lookup.has(key)) lookup.set(key, new Map());
    const m = lookup.get(key);
    m.set(r.lesson, (m.get(r.lesson) || 0) + 1);
  }

  let uniqueMatch = 0, conflictMatch = 0, noMatch = 0;
  const conflictSamples = [];
  const noMatchSamples = [];
  const uniqueSamples = [];

  for (const r of missing) {
    const key = `${r.topic}|${r.math_form}`;
    const m = lookup.get(key);
    if (!m || m.size === 0) {
      noMatch++;
      if (noMatchSamples.length < 5) noMatchSamples.push(r);
      continue;
    }
    if (m.size === 1) {
      uniqueMatch++;
      if (uniqueSamples.length < 5) {
        uniqueSamples.push({ r, lesson: [...m.keys()][0], count: [...m.values()][0] });
      }
    } else {
      conflictMatch++;
      if (conflictSamples.length < 5) conflictSamples.push({ r, options: [...m.entries()] });
    }
  }

  console.log('\n=== KHẢ NĂNG SUY LUẬN (theo Chuyên đề + Dạng toán) ===');
  console.log('  Suy ra được DUY NHẤT 1 tên bài     : ' + uniqueMatch + '  (độ tin cậy cao)');
  console.log('  Có NHIỀU tên bài khớp (mơ hồ)      : ' + conflictMatch + '  (không tự quyết được)');
  console.log('  KHÔNG có câu nào cùng nhóm để so    : ' + noMatch + '  (không suy luận được)');

  if (uniqueSamples.length) {
    console.log('\n--- Ví dụ suy luận DUY NHẤT (an toàn) ---');
    for (const s of uniqueSamples) {
      console.log(`  ${s.r.question_id}`);
      console.log(`    Chuyên đề: ${String(s.r.topic).slice(0,50)}`);
      console.log(`    Dạng toán: ${String(s.r.math_form).slice(0,50)}`);
      console.log(`    -> Suy ra: "${s.lesson}"  (khớp với ${s.count} câu đã gắn đúng)`);
    }
  }

  if (conflictSamples.length) {
    console.log('\n--- Ví dụ MƠ HỒ (nhiều lựa chọn, không tự quyết) ---');
    for (const s of conflictSamples) {
      console.log(`  ${s.r.question_id}  Chuyên đề: ${String(s.r.topic).slice(0,40)}`);
      console.log(`    Dạng toán: ${String(s.r.math_form).slice(0,40)}`);
      console.log(`    Các lựa chọn: ${s.options.map(([l,n]) => `"${l}"(${n})`).join(', ')}`);
    }
  }

  if (noMatchSamples.length) {
    console.log('\n--- Ví dụ KHÔNG suy luận được ---');
    for (const r of noMatchSamples) {
      console.log(`  ${r.question_id}  Chuyên đề: ${JSON.stringify(String(r.topic||'').slice(0,40))}  Dạng toán: ${JSON.stringify(String(r.math_form||'').slice(0,40))}`);
    }
  }

  console.log('\n=== ĐỀ XUẤT ===');
  console.log(`  ${uniqueMatch} câu: tự động điền (chỉ 1 lựa chọn khớp, không mơ hồ)`);
  console.log(`  ${conflictMatch + noMatch} câu: để trống, liệt kê để Thầy tự gắn tay`);
})();
