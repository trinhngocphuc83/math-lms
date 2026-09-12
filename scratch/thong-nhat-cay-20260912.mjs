/**
 * Thống nhất cây danh mục theo ba quy ước thầy chốt 12/9/2026:
 *   b. Bài ôn tập tên "Bài N. Ôn tập chương" (N = số bài của chương + 1), ở cả danh mục,
 *      kho câu và cây khoá học.
 *   c. Bài đánh số lại từ 1 trong mỗi chương (lớp 9 đang đánh liên tục Bài 1–32 theo SGK).
 *   d. Lớp 10 › Chương 1 › "Bài 3. Ôn tập chương" (169 câu) chia lại về Bài 1 / Bài 2 theo
 *      dạng: dạng về mệnh đề -> Bài 1, dạng về tập hợp -> Bài 2, "Toán tổng hợp" ở lại.
 *
 *   node scratch/thong-nhat-cay-20260912.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const thuMuc = `backups/thong-nhat-cay-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const saoLuu = { questions: [], question_categories: [], lessons: [] };
const nhatKy = [];

async function layTatCa(bang, loc) {
  const ra = [];
  for (let i = 0; ; i += 1000) {
    let q = sb.from(bang).select('*').range(i, i + 999);
    for (const [k, v] of Object.entries(loc)) q = q.eq(k, v);
    const { data } = await q; ra.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return ra;
}
/** Đổi trường cho câu + danh mục khớp bộ lọc; dòng danh mục đổi xong mà trùng thì xoá dòng nguồn. */
async function doi(loc, thay, ghiChu) {
  const cau = await layTatCa('questions', loc), dm = await layTatCa('question_categories', loc);
  if (!cau.length && !dm.length) return;
  nhatKy.push(`${ghiChu}: ${cau.length} câu, ${dm.length} dạng`);
  if (!GHI) return;
  saoLuu.questions.push(...cau); saoLuu.question_categories.push(...dm);
  for (const q of cau) { const { error } = await sb.from('questions').update(thay).eq('id', q.id); if (error) console.log('  ✗ câu', q.question_id, error.message); }
  for (const d of dm) {
    const moi = { ...d, ...thay };
    const { data: trung } = await sb.from('question_categories').select('id').eq('grade', moi.grade).eq('subject', moi.subject)
      .eq('topic', moi.topic).eq('lesson', moi.lesson).eq('math_form', moi.math_form).neq('id', d.id);
    if (trung?.length) await sb.from('question_categories').delete().eq('id', d.id);
    else { const { error } = await sb.from('question_categories').update(thay).eq('id', d.id); if (error) console.log('  ✗ dạng', d.math_form, error.message); }
  }
}
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

/* ---------- c. lớp 9 đánh số lại từ 1 trong mỗi chương ---------- */
const { data: dm9 } = await sb.from('question_categories').select('topic,lesson').eq('grade', '9');
const theoChuong = {};
for (const d of dm9) (theoChuong[d.topic] ||= new Set()).add(d.lesson);
for (const [topic, baiSet] of Object.entries(theoChuong)) {
  const bai = [...baiSet].filter(b => /^Bài \d+\./.test(b) && !/Ôn tập/i.test(b))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  for (let i = 0; i < bai.length; i++) {
    const b = bai[i];
    const moi = b.replace(/^Bài \d+\./, `Bài ${i + 1}.`);
    if (moi !== b) await doi({ grade: '9', topic, lesson: b }, { lesson: moi }, `c. lớp 9 "${b.slice(0, 40)}" -> "${moi.slice(0, 40)}"`);
  }
}

/* ---------- b. "Ôn tập chương N" / "Ôn tập chương" -> "Bài N. Ôn tập chương" ---------- */
const { data: dmAll } = await sb.from('question_categories').select('grade,topic,lesson');
const chuongCua = {};
for (const d of dmAll) (chuongCua[d.grade + '|' + d.topic] ||= new Set()).add(d.lesson);
for (const [k, baiSet] of Object.entries(chuongCua)) {
  const [grade, topic] = k.split('|');
  const bai = [...baiSet];
  const soBai = bai.filter(b => /^Bài \d+\./.test(b) && !/Ôn tập/i.test(b)).length;
  for (const b of bai) {
    if (/^Ôn tập chương/i.test(b)) {
      const moi = `Bài ${soBai + 1}. Ôn tập chương`;
      await doi({ grade, topic, lesson: b }, { lesson: moi }, `b. lớp ${grade} ${topic.slice(0, 25)} "${b}" -> "${moi}"`);
    }
  }
}
await doiTenBaiKhoa('11', 'Ôn tập chương 1', 'Bài 5. Ôn tập chương');
await doiTenBaiKhoa('9', 'Ôn tập chương', 'Bài 4. Ôn tập chương');

/* ---------- d. lớp 10 C1 ôn tập chia lại theo dạng ---------- */
const C1 = 'Chương 1. Mệnh đề và tập hợp';
const MENH_DE = ['Mệnh đề tương đương', 'Mệnh đề kéo theo - mệnh đề đảo', 'Mệnh đề chứa biến', 'Nhận biết mệnh đề', 'Mệnh đề phủ định. Mệnh đề chứa ký hiệu thuộc, tồn tại'];
const TAP_HOP = ['Xác định các phần tử của tập hợp', 'Xác định tập hợp con', 'Biểu diễn tập hợp số', 'Sơ đồ ven', 'Biểu diễn tập hợp trên trục số', 'Các phép toán trên tập hợp', 'Các bài toán tìm điều kiện tham số', 'Đếm số phần tử của tập hợp'];
for (const d of MENH_DE) await doi({ grade: '10', topic: C1, lesson: 'Bài 3. Ôn tập chương', math_form: d }, { lesson: 'Bài 1. Mệnh đề' }, `d. ôn tập -> Bài 1 · ${d}`);
for (const d of TAP_HOP) await doi({ grade: '10', topic: C1, lesson: 'Bài 3. Ôn tập chương', math_form: d }, { lesson: 'Bài 2. Tập hợp và các phép toán trên tập hợp' }, `d. ôn tập -> Bài 2 · ${d}`);

for (const d of nhatKy) console.log('  ' + d);
if (GHI) {
  mkdirSync(thuMuc, { recursive: true });
  writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify(saoLuu, null, 1));
  console.log(`✓ đã ghi · sao lưu ${thuMuc}/ (${saoLuu.questions.length} câu, ${saoLuu.question_categories.length} dạng, ${saoLuu.lessons.length} bài khoá học)`);
} else console.log('Thêm "ghi" để ghi thật.');
