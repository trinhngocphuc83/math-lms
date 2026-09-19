/**
 * Dựng khung 3 bài cho CHƯƠNG IV Toán 9 (chương đang 0 bài), mỗi bài 3 module như các chương
 * khác của khoá: theory "Lý thuyết & Phương pháp giải (Bài giảng tương tác)" · practice "Bài tập
 * tự luyện" · document "Tài liệu & Video". Bài 3 (Ôn tập chương) thêm "Luyện tập 2".
 * Tên bài lấy ĐÚNG tên trong danh mục kho (quy ước cây danh mục).
 *   node scratch/l9c4/tao-bai.mjs          → xem
 *   node scratch/l9c4/tao-bai.mjs --ghi    → ghi
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const GHI = process.argv.includes('--ghi');
const COURSE = 'd4cb7345-2b1d-47e8-a256-fc6426129ec7';
const CHAPTER = 'da1b9523-42e8-447a-b1d4-bdc0f0b9d453';
const BAI = [
  'Bài 1. Tỉ số lượng giác của góc nhọn',
  'Bài 2. Một số hệ thức giữa cạnh, góc trong tam giác vuông và ứng dụng',
  'Bài 3. Ôn tập chương',
];
const { data: daCo } = await sb.from('lessons').select('id,title,order_index').eq('chapter_id', CHAPTER).order('order_index');
console.log('Đang có', daCo.length, 'bài trong chương.');
for (let i = 0; i < BAI.length; i++) {
  const t = BAI[i];
  let bai = daCo.find(b => b.title === t);
  console.log(bai ? `  có sẵn: ${t}` : `  TẠO: ${t}`);
  if (!GHI) continue;
  if (!bai) {
    const { data, error } = await sb.from('lessons').insert([{ course_id: COURSE, chapter_id: CHAPTER, title: t, order_index: i + 1 }]).select('id,title').single();
    if (error) { console.log('   lỗi:', error.message); continue; }
    bai = data;
  }
  const { data: mods } = await sb.from('lesson_modules').select('title').eq('lesson_id', bai.id);
  const co = new Set((mods || []).map(m => m.title));
  const can = [
    ['Lý thuyết & Phương pháp giải (Bài giảng tương tác)', 'theory', 1],
    [i === 2 ? 'Luyện tập 1' : 'Bài tập tự luyện', 'practice', 2],
    ['Tài liệu & Video', 'document', 3],
    ...(i === 2 ? [['Luyện tập 2', 'practice', 4]] : []),
  ];
  for (const [title, type, order_index] of can) {
    if (co.has(title)) continue;
    const { error } = await sb.from('lesson_modules').insert([{ lesson_id: bai.id, title, type, order_index, content_markdown: '' }]);
    console.log(error ? `   lỗi module ${title}: ${error.message}` : `   + module ${title}`);
  }
  console.log('   id bài:', bai.id);
}
