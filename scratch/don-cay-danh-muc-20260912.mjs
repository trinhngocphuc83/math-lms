/**
 * Dọn cây danh mục sau khi thầy soi thấy "Toán 12 mà có hằng đẳng thức" (12/9/2026).
 * Chỉ sửa những chỗ chắc chắn sai; chỗ là quy ước (đặt tên bài ôn tập, đánh số bài liên tục
 * hay theo chương) thì để thầy quyết.
 *
 *   1. Lớp 12 › Đại số › "Chương 2. Hằng đẳng thức đáng nhớ và ứng dụng": 10 câu, 3 dạng
 *      thực ra là lớp 8 (tên bài trùng khớp cây lớp 8) -> chuyển grade về 8, xoá 3 dòng
 *      danh mục lớp 12 (lớp 8 đã có đúng ba dạng ấy).
 *   2. Lớp 12 › Chương 3 (thống kê) mang phân môn "Đại số" trong khi mọi chương thống kê
 *      khác là "Thống kê" -> đổi phân môn.
 *   3. Lớp 7 › Chương 5 "Thu thập và biễu diễn dữ liệu": lỗi chính tả + phân môn "Đại số"
 *      -> "Chương 5. Thu thập và biểu diễn dữ liệu", phân môn "Thống kê".
 *   4. Lớp 11 › Chương 1 có cả "Ôn tập chương I" (43 câu) lẫn "Ôn tập chương 1" (2 câu)
 *      -> gộp về "Ôn tập chương 1" (số Ả Rập như mọi nơi khác), đổi luôn tên bài trong
 *      khoá học. Lớp 7 các dòng "Ôn tập chương VI/VII/VIII/IX/X" -> số Ả Rập.
 *   5. Lớp 10 "Bài 2. hệ bất phương trình..." -> viết hoa; lớp 8 "Bài 1 Tứ giác" -> thêm dấu chấm.
 *
 *   node scratch/don-cay-danh-muc-20260912.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const thuMuc = `backups/don-cay-danh-muc-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const saoLuu = { questions: [], question_categories: [], lessons: [] };
const nhatKy = [];

async function layCau(loc) { let q = sb.from('questions').select('*'); for (const [k, v] of Object.entries(loc)) q = q.eq(k, v); const { data } = await q; return data || []; }
async function layDanhMuc(loc) { let q = sb.from('question_categories').select('*'); for (const [k, v] of Object.entries(loc)) q = q.eq(k, v); const { data } = await q; return data || []; }

/** Đổi trường của câu + danh mục khớp bộ lọc. Danh mục đổi xong mà trùng dòng đã có thì xoá dòng nguồn. */
async function doi(loc, thay, ghiChu) {
  const cau = await layCau(loc), dm = await layDanhMuc(loc);
  nhatKy.push(`${ghiChu}: ${cau.length} câu, ${dm.length} dạng`);
  if (!GHI) return;
  saoLuu.questions.push(...cau); saoLuu.question_categories.push(...dm);
  for (const q of cau) { const { error } = await sb.from('questions').update(thay).eq('id', q.id); if (error) console.log('  ✗ câu', q.question_id, error.message); }
  for (const d of dm) {
    const moi = { ...d, ...thay };
    const { data: trung } = await sb.from('question_categories').select('id').eq('grade', moi.grade).eq('subject', moi.subject)
      .eq('topic', moi.topic).eq('lesson', moi.lesson).eq('math_form', moi.math_form).neq('id', d.id);
    if (trung?.length) { await sb.from('question_categories').delete().eq('id', d.id); }
    else { const { error } = await sb.from('question_categories').update(thay).eq('id', d.id); if (error) console.log('  ✗ dạng', d.math_form, error.message); }
  }
}

/** Đổi tên bài trong khoá học (bảng lessons) theo tên khoá chứa số lớp. */
async function doiTenBaiKhoa(lop, tenCu, tenMoi) {
  const { data: kh } = await sb.from('courses').select('id').ilike('title', `%TOÁN ${lop} %`);
  for (const k of kh || []) {
    const { data: ch } = await sb.from('chapters').select('id').eq('course_id', k.id);
    const { data: ls } = await sb.from('lessons').select('id,title,chapter_id').in('chapter_id', (ch || []).map(c => c.id)).eq('title', tenCu);
    for (const l of ls || []) {
      nhatKy.push(`khoá học lớp ${lop}: "${tenCu}" -> "${tenMoi}"`);
      if (GHI) { saoLuu.lessons.push(l); await sb.from('lessons').update({ title: tenMoi }).eq('id', l.id); }
    }
  }
}

/* 1. hằng đẳng thức lớp 12 -> lớp 8 */
await doi({ grade: '12', topic: 'Chương 2. Hằng đẳng thức đáng nhớ và ứng dụng' }, { grade: '8' }, '1. HĐT lớp 12 -> lớp 8');

/* 2. lớp 12 chương 3 -> Thống kê */
await doi({ grade: '12', topic: 'Chương 3. Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm' }, { subject: 'Thống kê' }, '2. Lớp 12 C3 -> Thống kê');

/* 3. lớp 7 chương 5 */
await doi({ grade: '7', topic: 'Chương 5. Thu thập và biễu diễn dữ liệu' },
  { topic: 'Chương 5. Thu thập và biểu diễn dữ liệu', subject: 'Thống kê' }, '3. Lớp 7 C5 chính tả + Thống kê');

/* 4. ôn tập chương: số La Mã -> Ả Rập */
await doi({ grade: '11', lesson: 'Ôn tập chương I' }, { lesson: 'Ôn tập chương 1' }, '4. Lớp 11 "Ôn tập chương I" -> "1"');
await doiTenBaiKhoa('11', 'Ôn tập chương I', 'Ôn tập chương 1');
for (const [laMa, so] of [['VI', '6'], ['VII', '7'], ['VIII', '8'], ['IX', '9'], ['X', '10']]) {
  await doi({ grade: '7', lesson: `Ôn tập chương ${laMa}` }, { lesson: `Ôn tập chương ${so}` }, `4. Lớp 7 "Ôn tập chương ${laMa}" -> "${so}"`);
}

/* 5. chính tả tên bài */
await doi({ grade: '10', lesson: 'Bài 2. hệ bất phương trình bậc nhất hai ẩn' }, { lesson: 'Bài 2. Hệ bất phương trình bậc nhất hai ẩn' }, '5. Lớp 10 viết hoa "Hệ"');
await doiTenBaiKhoa('10', 'Bài 2. hệ bất phương trình bậc nhất hai ẩn', 'Bài 2. Hệ bất phương trình bậc nhất hai ẩn');
await doi({ grade: '8', lesson: 'Bài 1 Tứ giác' }, { lesson: 'Bài 1. Tứ giác' }, '5. Lớp 8 "Bài 1 Tứ giác" -> có dấu chấm');
await doiTenBaiKhoa('8', 'Bài 1 Tứ giác', 'Bài 1. Tứ giác');

for (const d of nhatKy) console.log('  ' + d);
if (GHI) {
  mkdirSync(thuMuc, { recursive: true });
  writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify(saoLuu, null, 1));
  console.log(`✓ đã ghi · sao lưu ${thuMuc}/sao-luu.json (${saoLuu.questions.length} câu, ${saoLuu.question_categories.length} dạng, ${saoLuu.lessons.length} bài khoá học)`);
} else console.log('Thêm "ghi" để ghi thật.');
