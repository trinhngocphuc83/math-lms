/**
 * Gắn lại dạng cho 19 câu đang nằm ở dạng "Tính các số đặc trưng mức độ phân tán (mẫu không
 * ghép nhóm)" của Toán 12 chương 3. Dạng ấy là cái thùng rác: đọc từng câu thì 8 câu hỏi SỐ
 * TRUNG BÌNH của mẫu ghép nhóm (kiến thức lớp 11), 5 câu lý thuyết về độ lệch chuẩn / khoảng
 * biến thiên, 4 câu tính tứ phân vị / phương sai ghép nhóm, 1 câu khoảng biến thiên, và chỉ
 * 1 câu thật sự có số liệu không ghép nhóm. Vì gắn sai nên bài giảng rút hai câu "tính số
 * trung bình" vào mục "mẫu không ghép nhóm" - hỏi điều chưa dạy (thầy bắt được 12/9/2026).
 *
 *   node scratch/gan-lai-dang-12c3.mjs        # thử
 *   node scratch/gan-lai-dang-12c3.mjs ghi    # sao lưu rồi ghi, xoá 2 dòng danh mục rỗng
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DANG_CU = 'Tính các số đặc trưng mức độ phân tán (mẫu không ghép nhóm)';
const B1 = 'Bài 1. Khoảng biến thiên và khoảng tứ phân vị';
const B2 = 'Bài 2. Phương sai và độ lệch chuẩn';
const KBT = 'Tìm khoảng biến thiên của mẫu số liệu ghép nhóm';
const TPV = 'Tìm các tứ phân vị, khoảng tứ phân vị và xác định giá trị ngoại lệ';
const PS = 'Tính phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm';

/* Số trung bình của mẫu ghép nhóm là bài của lớp 11 (KNTT chương 3) - chuyển hẳn sang lớp 11 */
const { data: dm11 } = await sb.from('question_categories').select('*').eq('grade', '11')
  .eq('math_form', 'Tính số trung bình của mẫu số liệu ghép nhóm').single();
const TB11 = { grade: '11', subject: dm11.subject, topic: dm11.topic, lesson: dm11.lesson, math_form: dm11.math_form };

const GAN = {
  // số trung bình ghép nhóm -> lớp 11
  CH_1785415835190_hb7d: TB11, CH_1785315627520_qoxb: TB11, CH_1785315627520_frg4: TB11,
  CH_1785415835190_381q: TB11, CH_1785415835190_fzsh: TB11, CH_1785415835190_0z8r: TB11,
  CH_1785315195857_91wa: TB11, CH_1785415835190_iy7a: TB11,
  // lý thuyết về độ lệch chuẩn -> Bài 2 phương sai
  CH_1785418708813_w56k: { lesson: B2, math_form: PS }, CH_1785418708813_jg7p: { lesson: B2, math_form: PS },
  CH_1785504654377_25r1: { lesson: B2, math_form: PS },
  // tính phương sai -> Bài 2
  CH_1785415835190_na3j: { lesson: B2, math_form: PS }, CH_1785415835190_5f46: { lesson: B2, math_form: PS },
  // nhận biết khoảng biến thiên / đại lượng đo phân tán, tính khoảng biến thiên -> Bài 1
  CH_1785504654377_pshv: { lesson: B1, math_form: KBT }, CH_1785418708813_oigf: { lesson: B1, math_form: KBT },
  CH_1785504654377_3bru: { lesson: B1, math_form: KBT },
  // tứ phân vị ghép nhóm -> Bài 1
  CH_1785418708813_y0f7: { lesson: B1, math_form: TPV }, CH_1785418708814_423n: { lesson: B1, math_form: TPV },
  // số liệu gốc + ghép nhóm + độ lệch chuẩn, Đúng/Sai 4 ý -> Bài 2 tổng hợp
  CH_1785328715088_tmy7: { lesson: B2, math_form: 'Toán tổng hợp' },
};

const { data: ds } = await sb.from('questions').select('*').eq('grade', '12').eq('math_form', DANG_CU);
const thieu = ds.filter(q => !GAN[q.question_id]).map(q => q.question_id);
if (thieu.length) { console.error('Chưa xếp:', thieu); process.exit(1); }
console.log(`${ds.length} câu:`);
for (const q of ds) {
  const g = GAN[q.question_id];
  console.log(`  ${q.question_id}  ->  ${g.grade ? 'LỚP 11 · ' : ''}${g.lesson.slice(0, 6)} / ${g.math_form}`);
}
if (!GHI) { console.log('\nThêm "ghi" để ghi thật.'); process.exit(0); }

const thuMuc = `backups/gan-lai-dang-12c3-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
mkdirSync(thuMuc, { recursive: true });
writeFileSync(`${thuMuc}/questions.json`, JSON.stringify(ds, null, 1));
for (const q of ds) {
  const { error } = await sb.from('questions').update(GAN[q.question_id]).eq('id', q.id);
  if (error) console.log('  ✗', q.question_id, error.message);
}
const { data: dmCu } = await sb.from('question_categories').select('*').eq('grade', '12').eq('math_form', DANG_CU);
writeFileSync(`${thuMuc}/question_categories.json`, JSON.stringify(dmCu, null, 1));
const { count } = await sb.from('questions').select('id', { count: 'exact', head: true }).eq('grade', '12').eq('math_form', DANG_CU);
if (count === 0) {
  await sb.from('question_categories').delete().eq('grade', '12').eq('math_form', DANG_CU);
  console.log(`✓ đã gắn lại ${ds.length} câu, xoá ${dmCu.length} dòng danh mục rỗng · sao lưu ${thuMuc}/`);
} else console.log(`⚠ còn ${count} câu ở dạng cũ, chưa xoá danh mục`);
