/* Kiểm hai chuyện trước khi ghi: đổi tên dạng có VA vào tên sẵn có không, và toàn kho
   còn bao nhiêu câu thiếu đáp án. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const DOI_TEN = [
  { grade: '11', lesson: 'Bài 1. Dãy số', moi: 'Bài toán thực tế về dãy số',
    ycd: 'Vận dụng được kiến thức về dãy số để giải quyết một số vấn đề thực tiễn như lãi kép, tăng trưởng, khấu hao.' },
  { grade: '7', lesson: 'Bài 3. Lũy thừa với số mũ tự nhiên của số hữu tỉ', moi: 'So sánh biểu thức lũy thừa', ycd: null },
  { grade: '7', lesson: 'Bài 2. Cộng, trừ, nhân, chia số hữu tỉ', moi: 'Bài toán thực tế về số hữu tỉ', ycd: null },
  { grade: '7', lesson: 'Bài 4. Thứ tự thực hiện các phép toán, quy tắc chuyển vế', moi: 'Bài toán thực tế về thứ tự thực hiện phép tính', ycd: null },
  { grade: '8', lesson: 'Bài 4. Hình chữ nhật', moi: 'Chứng minh và tính toán với hình chữ nhật', ycd: null },
  { grade: '8', lesson: 'Bài 3. Hình bình hành', moi: 'Chứng minh và tính toán với hình bình hành', ycd: null },
  { grade: '8', lesson: 'Bài 5. Hình thoi và hình vuông', moi: 'Tính chất và bài tập hình thoi, hình vuông', ycd: null },
  { grade: '8', lesson: 'Bài 1 Tứ giác', moi: 'Chứng minh và tính toán với tứ giác', ycd: null },
  { grade: '8', lesson: 'Bài 2. Hình thang cân', moi: 'Chứng minh và tính toán với hình thang cân', ycd: null },
  { grade: '9', lesson: 'Bài 8. Khai căn bậc 2 với phép nhân và phép chia', moi: 'Rút gọn và tính giá trị biểu thức chứa căn', ycd: null },
  { grade: '9', lesson: 'Bài 2. Giải hệ hai phương trình bậc nhất hai ẩn', moi: null, ycd: null },   // 0 câu -> xoá
];

if (!process.env.CHI_NHAP) {
  const { data: dm } = await sb.from('question_categories').select('*');

  console.log('═══ VA TÊN: dạng mới có trùng dạng sẵn có trong cùng bài không ═══');
  for (const d of DOI_TEN) {
    if (!d.moi) { console.log(`   (xoá) lớp ${d.grade} · ${d.lesson}`); continue; }
    const cungBai = dm.filter(x => String(x.grade) === d.grade && x.lesson === d.lesson);
    const va = cungBai.find(x => x.math_form === d.moi);
    console.log(`   ${va ? '✗ VA' : '✓ ok'}  lớp ${d.grade} · ${d.lesson} → "${d.moi}"`);
    if (va) console.log(`        đã có sẵn dạng cùng tên`);
  }

  console.log('\n═══ THIẾU ĐÁP ÁN TOÀN KHO ═══');
  const tatCa = [];
  for (let tu = 0; ; tu += 1000) {
    const { data } = await sb.from('questions')
      .select('id,grade,topic,question_type,correct_answer,explanation').range(tu, tu + 999);
    if (!data?.length) break;
    tatCa.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`   tổng ${tatCa.length} câu trong kho`);
  for (const t of ['NLC', 'DS', 'TLN']) {
    const ds = tatCa.filter(q => q.question_type === t);
    const thieu = ds.filter(q => !String(q.correct_answer || '').trim());
    const coGiai = thieu.filter(q => String(q.explanation || '').trim()).length;
    console.log(`   ${t.padEnd(4)} ${String(ds.length).padStart(5)} câu · thiếu đáp án ${String(thieu.length).padStart(4)} · trong đó có lời giải ${coGiai}`);
  }
}
