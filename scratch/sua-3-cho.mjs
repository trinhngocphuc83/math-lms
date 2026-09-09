/**
 * Sửa ba chỗ, có sao lưu, mặc định chỉ thử:
 *   1. Tên chương 2 lớp 11 bên bài giảng lệch từ ngữ so với kho ("VÀ" thay vì "-").
 *   2. Nhãn nháp "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ, ĐÃ SỬA LẠI]" dán vào đề, học sinh đọc thấy.
 *   3. Dạng tên rác "Tự suy luận" ở 11 danh mục, mỗi nơi một nội dung khác nhau.
 *
 *   node scratch/sua-3-cho.mjs        -> thử
 *   node scratch/sua-3-cho.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/sua-ten-dang-va-nhan-20260909';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
mkdirSync(SAO_LUU, { recursive: true });

/* Tên mới đặt SAU KHI đọc câu của từng danh mục, không suy từ tên bài.
   `ycd` chỉ điền cho những chỗ yêu cầu cần đạt đang dán nhầm hẳn sang bài khác. */
const DOI_TEN = [
  { grade: '11', lesson: 'Bài 1. Dãy số', moi: 'Bài toán thực tế về dãy số',
    ycd: 'Vận dụng được kiến thức về dãy số để giải quyết một số vấn đề thực tiễn như lãi kép, tăng trưởng và khấu hao.' },
  { grade: '7', lesson: 'Bài 3. Lũy thừa với số mũ tự nhiên của số hữu tỉ', moi: 'So sánh biểu thức lũy thừa' },
  { grade: '7', lesson: 'Bài 2. Cộng, trừ, nhân, chia số hữu tỉ', moi: 'Bài toán thực tế về số hữu tỉ' },
  { grade: '7', lesson: 'Bài 4. Thứ tự thực hiện các phép toán, quy tắc chuyển vế', moi: 'Bài toán thực tế về thứ tự thực hiện phép tính' },
  { grade: '8', lesson: 'Bài 4. Hình chữ nhật', moi: 'Chứng minh và tính toán với hình chữ nhật' },
  { grade: '8', lesson: 'Bài 3. Hình bình hành', moi: 'Chứng minh và tính toán với hình bình hành' },
  { grade: '8', lesson: 'Bài 5. Hình thoi và hình vuông', moi: 'Tính chất và bài tập hình thoi, hình vuông' },
  { grade: '8', lesson: 'Bài 1 Tứ giác', moi: 'Chứng minh và tính toán với tứ giác',
    ycd: 'Giải thích được định lí về tổng các góc trong một tứ giác lồi và vận dụng để chứng minh, tính toán.' },
  { grade: '8', lesson: 'Bài 2. Hình thang cân', moi: 'Chứng minh và tính toán với hình thang cân' },
  { grade: '9', lesson: 'Bài 8. Khai căn bậc 2 với phép nhân và phép chia', moi: 'Rút gọn và tính giá trị biểu thức chứa căn',
    ycd: 'Vận dụng được liên hệ giữa phép khai căn bậc hai với phép nhân, phép chia để rút gọn và tính giá trị biểu thức.' },
  { grade: '9', lesson: 'Bài 2. Giải hệ hai phương trình bậc nhất hai ẩn', moi: null },   // 0 câu -> xoá danh mục rỗng
];

/* ---------- 1. Tên chương ---------- */
{
  const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
  const { data: ch } = await sb.from('chapters').select('id,title')
    .eq('course_id', kh[0].id).ilike('title', '%DÃY SỐ%').maybeSingle();
  const moi = 'Chương 2. DÃY SỐ - CẤP SỐ CỘNG - CẤP SỐ NHÂN';
  console.log('1. TÊN CHƯƠNG');
  console.log(`   cũ : ${ch.title}`);
  console.log(`   mới: ${moi}   (khớp từ ngữ với kho, giữ lối viết hoa của app)`);
  if (GHI) {
    writeFileSync(`${SAO_LUU}/ten-chuong.txt`, `${ch.id}\n${ch.title}\n`);
    const { error } = await sb.from('chapters').update({ title: moi }).eq('id', ch.id);
    console.log(error ? `   ✗ ${error.message}` : '   ✓ đã đổi');
  }
}

/* ---------- 2. Nhãn nháp trong đề ---------- */
{
  const NHAN = /\s*\[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ[^\]]*\]\s*/gi;
  let ds = [];
  for (let tu = 0; ; tu += 1000) {
    const { data } = await sb.from('questions').select('id,question_id,grade,lesson,content,explanation')
      .ilike('content', '%CÂU HỎI CÓ THỂ BỊ SAI ĐỀ%').range(tu, tu + 999);
    if (!data?.length) break;
    ds.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`\n2. NHÃN NHÁP TRONG ĐỀ: ${ds.length} câu`);
  if (GHI && ds.length) {
    writeFileSync(`${SAO_LUU}/nhan-nhap.json`, JSON.stringify(ds, null, 2));
    let xong = 0;
    for (const q of ds) {
      const moi = String(q.content).replace(NHAN, ' ').replace(/^\s+/, '').replace(/\s+$/, '');
      const { error } = await sb.from('questions').update({ content: moi }).eq('id', q.id);
      if (!error) xong++;
    }
    console.log(`   ✓ đã gỡ nhãn ${xong}/${ds.length} câu (bản gốc ở ${SAO_LUU}/nhan-nhap.json)`);
  } else if (ds.length) {
    console.log(`   (thử) sẽ gỡ nhãn, ví dụ: ${ds[0].question_id} · ${ds[0].content.slice(0, 70)}`);
  }
}

/* ---------- 3. Đổi tên dạng "Tự suy luận" ---------- */
{
  console.log('\n3. ĐỔI TÊN DẠNG "Tự suy luận"');
  const { data: dm } = await sb.from('question_categories').select('*').eq('math_form', 'Tự suy luận');
  if (GHI) writeFileSync(`${SAO_LUU}/danh-muc-tu-suy-luan.json`, JSON.stringify(dm, null, 2));

  for (const d of DOI_TEN) {
    const cu = dm.find(x => String(x.grade) === d.grade && x.lesson === d.lesson);
    if (!cu) { console.log(`   ⚠ không thấy danh mục lớp ${d.grade} · ${d.lesson}`); continue; }

    const { count } = await sb.from('questions').select('id', { count: 'exact', head: true })
      .eq('grade', d.grade).eq('topic', cu.topic).eq('lesson', d.lesson).eq('math_form', 'Tự suy luận');

    if (!d.moi) {
      console.log(`   xoá danh mục rỗng · lớp ${d.grade} · ${d.lesson} (${count || 0} câu)`);
      if (GHI && (count || 0) === 0) await sb.from('question_categories').delete().eq('id', cu.id);
      continue;
    }

    console.log(`   lớp ${d.grade} · ${d.lesson} → "${d.moi}" (${count || 0} câu)${d.ycd ? ' + sửa yêu cầu cần đạt' : ''}`);
    if (!GHI) continue;

    const capNhat = { math_form: d.moi };
    if (d.ycd) capNhat.yeu_cau_can_dat = d.ycd;
    const e1 = (await sb.from('question_categories').update(capNhat).eq('id', cu.id)).error;
    const e2 = (await sb.from('questions').update({ math_form: d.moi })
      .eq('grade', d.grade).eq('topic', cu.topic).eq('lesson', d.lesson).eq('math_form', 'Tự suy luận')).error;
    console.log(e1 || e2 ? `      ✗ ${(e1 || e2).message}` : '      ✓');
  }

  const { count: con } = await sb.from('question_categories')
    .select('id', { count: 'exact', head: true }).eq('math_form', 'Tự suy luận');
  console.log(`   còn lại danh mục tên "Tự suy luận": ${con || 0}`);
}
