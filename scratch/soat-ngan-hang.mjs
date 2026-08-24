// Soát ngân hàng câu hỏi theo đúng những gì tính năng RA ĐỀ cần.
//
// Chạy: node --experimental-strip-types scratch/soat-ngan-hang.mjs [duong-dan-env]
// Mặc định soát app Toán; truyền đường dẫn .env.local của app Lý để soát app kia.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const duongDan = process.argv[2] || 'D:/claude/math-lms/.env.local';
const env = {};
for (const l of fs.readFileSync(duongDan, 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const nap = async (bang, cot) => {
  const ra = [];
  for (let p = 0; ; p++) {
    const { data, error } = await sb.from(bang).select(cot).range(p * 1000, (p + 1) * 1000 - 1);
    if (error) throw new Error(`${bang}: ${error.message}`);
    if (!data?.length) break;
    ra.push(...data);
    if (data.length < 1000) break;
  }
  return ra;
};

const kho = await nap('questions',
  'question_id, grade, subject, topic, lesson, math_form, question_type, difficulty, content, option_a, option_b, option_c, option_d, correct_answer, explanation, image_url, usage_count');
const dm = await nap('question_categories', 'grade, subject, topic, lesson, math_form, yeu_cau_can_dat');

const T = (s) => String(s ?? '').trim();
const laDS4 = (s) => /^[ĐDTSF]{4}$/i.test(T(s));
const in4 = (n) => String(n).padStart(5);
const muc = (d) => ({ '1': 'Biết', '2': 'Hiểu', '3': 'Vận dụng', '4': 'Vận dụng' }[T(d)] || '?');

console.log('='.repeat(78));
console.log(`SOÁT NGÂN HÀNG — ${kho.length} câu · ${dm.length} dòng danh mục`);
console.log('='.repeat(78));

/* ---------- 1. ĐÁP ÁN ---------- */
const loaiSai = [], thieuDap = { NLC: [], DS: [], TLN: [] }, dsThieuY = [];
for (const q of kho) {
  const t = T(q.question_type).toUpperCase();
  const d = T(q.correct_answer);

  // Câu ghi loại NLC nhưng đáp án lại là chuỗi 4 ký tự Đúng/Sai -> gán nhầm loại
  if (t === 'NLC' && laDS4(d)) { loaiSai.push(q); continue; }

  if (t === 'NLC' && !['A', 'B', 'C', 'D'].includes(d.toUpperCase())) thieuDap.NLC.push(q);
  if (t === 'DS' && !laDS4(d)) thieuDap.DS.push(q);
  if (t === 'TLN' && !d) thieuDap.TLN.push(q);

  // Câu Đúng/Sai phải có đủ 4 ý mới in ra được
  if (t === 'DS' && [q.option_a, q.option_b, q.option_c, q.option_d].some(x => !T(x))) dsThieuY.push(q);
}

console.log('\n1. ĐÁP ÁN — ảnh hưởng trực tiếp tới chấm bài và đẩy sang Kỳ thi Online');
console.log(`${in4(loaiSai.length)}  câu ghi loại "Trắc nghiệm" nhưng đáp án là chuỗi Đ/S 4 ký tự → thực chất là câu Đúng/Sai bị gán nhầm loại`);
console.log(`${in4(thieuDap.NLC.length)}  câu Trắc nghiệm thiếu/sai đáp án (không phải A/B/C/D)`);
console.log(`${in4(thieuDap.DS.length)}  câu Đúng/Sai thiếu/sai đáp án (không phải 4 ký tự Đ/S)`);
console.log(`${in4(thieuDap.TLN.length)}  câu Trả lời ngắn chưa có đáp án`);
console.log(`${in4(dsThieuY.length)}  câu Đúng/Sai thiếu ý (chưa đủ 4 mệnh đề a,b,c,d)`);
if (loaiSai.length) {
  console.log('     ví dụ gán nhầm loại:');
  loaiSai.slice(0, 3).forEach(q => console.log(`       ${q.question_id} (lớp ${q.grade}) đáp án="${T(q.correct_answer)}"`));
}

/* ---------- 2. PHÂN LOẠI ---------- */
const thieuChuong = kho.filter(q => !T(q.topic));
const thieuBai = kho.filter(q => !T(q.lesson));
const thieuDang = kho.filter(q => !T(q.math_form));
const thieuMuc = kho.filter(q => !['1', '2', '3', '4'].includes(T(q.difficulty)));

const khoaDM = new Set(dm.map(c => `${T(c.grade)}|${T(c.topic)}|${T(c.lesson)}|${T(c.math_form)}`));
const moCoi = new Map();
for (const q of kho) {
  if (!T(q.math_form)) continue;
  const k = `${T(q.grade)}|${T(q.topic)}|${T(q.lesson)}|${T(q.math_form)}`;
  if (!khoaDM.has(k)) moCoi.set(k, (moCoi.get(k) || 0) + 1);
}

console.log('\n2. PHÂN LOẠI — quyết định câu có được chọn vào ma trận hay không');
console.log(`${in4(thieuChuong.length)}  câu chưa có Chương  → KHÔNG bao giờ hiện ra ở cây chọn dạng`);
console.log(`${in4(thieuBai.length)}  câu chưa có Bài     → không dựng được Bản đặc tả`);
console.log(`${in4(thieuDang.length)}  câu chưa có Dạng    → không đưa vào ma trận được`);
console.log(`${in4(thieuMuc.length)}  câu mức độ không hợp lệ (phải là 1..4)`);
console.log(`${in4(moCoi.size)}  tổ hợp Chương/Bài/Dạng có câu nhưng danh mục KHÔNG khai báo`);
if (moCoi.size) {
  [...moCoi.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, n]) => {
    const [g, c, b, d] = k.split('|');
    console.log(`       ${String(n).padStart(3)} câu · lớp ${g} · ${c || '(trống)'} > ${b || '(trống)'} > ${d}`);
  });
}

/* ---------- 3. YÊU CẦU CẦN ĐẠT ---------- */
const dangCoCau = new Set(kho.filter(q => T(q.math_form)).map(q => T(q.math_form)));
const dmCoDang = dm.filter(c => T(c.math_form));
const dmTrong = dmCoDang.filter(c => !T(c.yeu_cau_can_dat));
const dmTrongMaCoCau = dmTrong.filter(c => dangCoCau.has(T(c.math_form)));

console.log('\n3. YÊU CẦU CẦN ĐẠT — cột bắt buộc của Bản đặc tả');
console.log(`${in4(dmCoDang.length)}  dòng danh mục có tên dạng`);
console.log(`${in4(dmCoDang.length - dmTrong.length)}  dòng đã soạn yêu cầu cần đạt`);
console.log(`${in4(dmTrong.length)}  dòng còn trống`);
console.log(`${in4(dmTrongMaCoCau.length)}  trong đó là dạng ĐANG CÓ CÂU → nên soạn trước, máy bám được câu thật`);

/* ---------- 4. NỘI DUNG VÀ ẢNH ---------- */
const anhBlob = kho.filter(q => /blob:/i.test(T(q.image_url)) || /blob:/i.test(T(q.content)));
const noiDungRong = kho.filter(q => !T(q.content));
const conDauNhac = kho.filter(q => /\[(HÌNH|CÓ HÌNH|BẢNG BIẾN THIÊN|CẦN CHÈN)/i.test(T(q.content)) && !T(q.image_url) && !/!\[/.test(T(q.content)));
const thieuLoiGiai = kho.filter(q => T(q.question_type).toUpperCase() === 'TL' && !T(q.explanation));

console.log('\n4. NỘI DUNG VÀ ẢNH — ảnh hưởng tới bản in và bản online');
console.log(`${in4(noiDungRong.length)}  câu rỗng nội dung`);
console.log(`${in4(anhBlob.length)}  câu còn địa chỉ ảnh tạm "blob:" → in ra là ảnh vỡ`);
console.log(`${in4(conDauNhac.length)}  câu có dấu nhắc [HÌNH VẼ]/[BẢNG BIẾN THIÊN] mà CHƯA chèn ảnh`);
console.log(`${in4(thieuLoiGiai.length)}  câu Tự luận chưa có lời giải → bản giáo viên in ra trống phần giải`);

/* ---------- 5. SỨC KHOẺ KHO ĐỂ RA ĐỀ ---------- */
const oKho = new Map();
for (const q of kho) {
  if (!T(q.math_form)) continue;
  const k = `${T(q.grade)}|${T(q.math_form)}|${T(q.question_type)}|${T(q.difficulty)}`;
  oKho.set(k, (oKho.get(k) || 0) + 1);
}
const oMong = [...oKho.entries()].filter(([, n]) => n === 1).length;

console.log('\n5. SỨC KHOẺ KHO ĐỂ RA ĐỀ');
console.log(`${in4(oKho.size)}  ô (lớp × dạng × loại × mức) đang có câu`);
console.log(`${in4(oMong)}  ô chỉ có ĐÚNG 1 câu → ra đề hai lần là trùng ngay`);

const theoLop = new Map();
for (const q of kho) {
  const g = T(q.grade) || '?';
  if (!theoLop.has(g)) theoLop.set(g, { tong: 0, NLC: 0, DS: 0, TLN: 0, TL: 0, Biết: 0, Hiểu: 0, 'Vận dụng': 0 });
  const o = theoLop.get(g);
  o.tong++;
  const t = T(q.question_type).toUpperCase();
  if (o[t] !== undefined) o[t]++;
  const m = muc(q.difficulty);
  if (o[m] !== undefined) o[m]++;
}
console.log('\n   Phân bố theo lớp (để biết lớp nào ra đề chuẩn 2025 được, lớp nào chưa):');
console.log('   lớp |  tổng |   NLC |    DS |   TLN |    TL | Biết  | Hiểu  | VDụng');
[...theoLop.entries()].sort().forEach(([g, o]) => {
  console.log(`   ${g.padStart(3)} | ${in4(o.tong)} | ${in4(o.NLC)} | ${in4(o.DS)} | ${in4(o.TLN)} | ${in4(o.TL)} | ${in4(o['Biết'])} | ${in4(o['Hiểu'])} | ${in4(o['Vận dụng'])}`);
});

console.log('\n   Khuôn 3-2-2-3 cần mỗi đề: 12 NLC · 2 DS · 4 TLN · phần tự luận.');
for (const [g, o] of [...theoLop.entries()].sort()) {
  const thieu = [];
  if (o.NLC < 12) thieu.push(`NLC ${o.NLC}/12`);
  if (o.DS < 2) thieu.push(`DS ${o.DS}/2`);
  if (o.TLN < 4) thieu.push(`TLN ${o.TLN}/4`);
  if (thieu.length) console.log(`   lớp ${g}: CHƯA đủ cho một đề chuẩn — ${thieu.join(' · ')}`);
}
console.log('');
