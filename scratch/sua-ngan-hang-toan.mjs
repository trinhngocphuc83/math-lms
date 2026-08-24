// Sửa các nhóm lỗi ngân hàng câu hỏi mà MÁY XÁC ĐỊNH ĐƯỢC CHẮC CHẮN, không đoán.
//
// Chạy thử:  node --experimental-strip-types scratch/sua-ngan-hang-toan.mjs
// Làm thật:  node --experimental-strip-types scratch/sua-ngan-hang-toan.mjs --that
//
// Nhóm nào phải suy đoán (thiếu đáp án, thiếu ý, thiếu ảnh) thì KHÔNG đụng tới.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const lamThat = process.argv.includes('--that');
const duongDan = process.argv.find(a => a.endsWith('.env.local')) || 'D:/claude/math-lms/.env.local';
const env = {};
for (const l of fs.readFileSync(duongDan, 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const T = (s) => String(s ?? '').trim();
const co4O = (q) => [q.option_a, q.option_b, q.option_c, q.option_d].every(x => T(x));
const laDS4 = (s) => /^[ĐDTSF]{4}$/i.test(T(s));

/**
 * Đọc đáp án Đúng/Sai viết theo đủ kiểu về dạng chuẩn "ĐSSĐ".
 *
 * Kho ghi lẫn lộn: "Đ, Đ, Đ, S" / "A-Đ, B-S, C-S, D-Đ" / "1-S, 2-Đ, 3-S, 4-Đ" /
 * "a) Sai, b) Đúng, c) Đúng, d) Sai" / "Đúng, Sai, Đúng, Sai" / "$2+xy$: Sai; ...".
 * Tất cả đều nói đủ bốn trạng thái, chỉ khác cách viết - đọc ra được thì không phải đoán.
 *
 * Trả về null khi không chắc chắn; lúc đó để nguyên cho thầy cô tự sửa.
 */
function docDapAnDS(raw) {
  const s = T(raw);
  if (!s) return null;
  if (laDS4(s)) {
    // Đã đúng số ký tự, chỉ cần gom D/T về Đ cho thống nhất một bảng chữ
    return s.split('').map(c => (/[ĐDT]/i.test(c) ? 'Đ' : 'S')).join('');
  }

  const phan = s.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  if (phan.length !== 4) return null;

  const ra = [];
  for (const p of phan) {
    // Bỏ phần nhãn: "a)", "1-", "A:", hoặc mọi thứ đứng trước dấu hai chấm cuối cùng
    let v = p.includes(':') ? p.slice(p.lastIndexOf(':') + 1) : p.replace(/^\s*[a-dA-D1-4]\s*[).:\-–]\s*/, '');
    v = v.trim();

    const chu = v.match(/(đúng|dung|sai|true|false)\s*$/i);
    if (chu) {
      ra.push(/đúng|dung|true/i.test(chu[1]) ? 'Đ' : 'S');
    } else if (/^[ĐDT]$/i.test(v)) ra.push('Đ');
    else if (/^[SF]$/i.test(v)) ra.push('S');
    else return null;   // gặp thứ lạ thì bỏ cả câu, không đoán bừa
  }
  return ra.join('');
}

/* ===================== NẠP DỮ LIỆU ===================== */

const nap = async (bang, cot) => {
  const ra = [];
  for (let p = 0; ; p++) {
    const { data, error } = await sb.from(bang).select(cot).range(p * 1000, (p + 1) * 1000 - 1);
    if (error) throw new Error(`${bang}: ${error.message}`);
    if (!data?.length) break; ra.push(...data); if (data.length < 1000) break;
  }
  return ra;
};

const kho = await nap('questions',
  'id, question_id, grade, subject, topic, lesson, math_form, question_type, difficulty, content, option_a, option_b, option_c, option_d, correct_answer, explanation');
const dm = await nap('question_categories', 'id, grade, subject, topic, lesson, math_form');

/* ===================== TÍNH TOÁN CÁC NHÓM ===================== */

const doiCau = [];        // { q, patch, nhom }
const themDanhMuc = [];
const khongSuaDuoc = { dsKhongDoc: [], nlcDSThieuO: [] };

for (const q of kho) {
  const loai = T(q.question_type).toUpperCase();
  const dap = T(q.correct_answer);

  // NHÓM 1 - Trắc nghiệm không có phương án nào nhưng có lời giải: thực chất là Tự luận.
  // Đề kiểu "Thực hiện phép tính...", "Tìm x biết..." - không phải câu chọn đáp án.
  if (loai === 'NLC' && !dap && ![q.option_a, q.option_b, q.option_c, q.option_d].some(x => T(x)) && T(q.explanation)) {
    doiCau.push({ q, patch: { question_type: 'TL' }, nhom: 'NLC không phương án → Tự luận' });
    continue;
  }

  // NHÓM 2 - Ghi loại Trắc nghiệm nhưng đáp án lại là chuỗi Đúng/Sai: gán nhầm loại.
  if (loai === 'NLC' && !['A', 'B', 'C', 'D'].includes(dap.toUpperCase())) {
    const doc = docDapAnDS(dap);
    if (doc) {
      if (co4O(q)) doiCau.push({ q, patch: { question_type: 'DS', correct_answer: doc }, nhom: 'Gán nhầm loại → Đúng/Sai' });
      else khongSuaDuoc.nlcDSThieuO.push(q);
      continue;
    }
    // NHÓM 3 - Đáp án còn nguyên JSON {"text":"B",...}
    if (dap.startsWith('{')) {
      try {
        const j = JSON.parse(dap);
        const t = T(j?.text).toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(t)) {
          doiCau.push({ q, patch: { correct_answer: t }, nhom: 'Đáp án còn nguyên JSON → lấy chữ cái' });
          continue;
        }
      } catch { /* không đọc được thì để nguyên */ }
    }
  }

  // NHÓM 4 - Đúng/Sai đáp án đúng nội dung nhưng sai định dạng.
  if (loai === 'DS' && !laDS4(dap)) {
    const doc = docDapAnDS(dap);
    if (doc) doiCau.push({ q, patch: { correct_answer: doc }, nhom: 'Chuẩn hoá đáp án Đúng/Sai' });
    else if (dap) khongSuaDuoc.dsKhongDoc.push(q);
    continue;
  }

  // NHÓM 5 - Đúng/Sai đã đủ 4 ký tự nhưng lẫn lộn D/T/Đ, gom về một bảng chữ.
  if (loai === 'DS' && laDS4(dap)) {
    const doc = docDapAnDS(dap);
    if (doc && doc !== dap) doiCau.push({ q, patch: { correct_answer: doc }, nhom: 'Gom đáp án Đúng/Sai về chữ Đ/S' });
  }
}

/* NHÓM 6 - tổ hợp Chương/Bài/Dạng có câu mà danh mục chưa khai báo */
const khoaDM = new Set(dm.map(c => `${T(c.grade)}|${T(c.topic)}|${T(c.lesson)}|${T(c.math_form)}`));
const daThem = new Set();
for (const q of kho) {
  if (!T(q.math_form) || !T(q.topic) || !T(q.lesson)) continue;
  const k = `${T(q.grade)}|${T(q.topic)}|${T(q.lesson)}|${T(q.math_form)}`;
  if (khoaDM.has(k) || daThem.has(k)) continue;
  daThem.add(k);
  themDanhMuc.push({
    grade: T(q.grade),
    subject: T(q.subject) || dm.find(c => T(c.grade) === T(q.grade))?.subject || 'Đại số',
    topic: T(q.topic), lesson: T(q.lesson), math_form: T(q.math_form),
  });
}

/* ===================== BÁO CÁO ===================== */

console.log('='.repeat(74));
console.log(`SỬA NGÂN HÀNG — ${kho.length} câu, ${dm.length} dòng danh mục`);
console.log('='.repeat(74));

const theoNhom = new Map();
doiCau.forEach(({ nhom }) => theoNhom.set(nhom, (theoNhom.get(nhom) || 0) + 1));
console.log('\nSẼ SỬA:');
[...theoNhom.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
  console.log(`  ${String(n).padStart(4)} câu  ${k}`));
console.log(`  ${String(themDanhMuc.length).padStart(4)} dòng  Bổ sung danh mục cho tổ hợp đang có câu`);
console.log(`\n  Tổng: ${doiCau.length} câu + ${themDanhMuc.length} dòng danh mục`);

console.log('\nVÍ DỤ TỪNG NHÓM:');
for (const nhom of theoNhom.keys()) {
  const v = doiCau.find(x => x.nhom === nhom);
  const cu = nhom.includes('loại') ? T(v.q.question_type) : T(v.q.correct_answer);
  const moi = v.patch.question_type || v.patch.correct_answer;
  console.log(`  ${nhom}`);
  console.log(`     ${v.q.question_id} (lớp ${v.q.grade}): "${cu.slice(0, 34)}" → "${moi}"`);
}

console.log('\nKHÔNG SỬA (để thầy cô tự quyết):');
console.log(`  ${String(khongSuaDuoc.dsKhongDoc.length).padStart(4)} câu Đúng/Sai đáp án không đọc ra được 4 trạng thái`);
console.log(`  ${String(khongSuaDuoc.nlcDSThieuO.length).padStart(4)} câu gán nhầm loại nhưng chưa đủ 4 ý`);

if (!lamThat) {
  console.log('\n(Chạy thử - chưa đụng vào dữ liệu. Thêm --that để làm thật.)');
  process.exit(0);
}

/* ===================== SAO LƯU RỒI GHI ===================== */

const ngay = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const tenApp = duongDan.includes('physics') ? 'ly' : 'toan';
const tm = path.join('D:/claude/math-lms/backups', `sua-ngan-hang-${tenApp}-${ngay}`);
fs.mkdirSync(tm, { recursive: true });
fs.writeFileSync(path.join(tm, 'truoc-khi-sua.json'), JSON.stringify({
  tao: new Date().toISOString(),
  cauBiSua: doiCau.map(({ q, patch, nhom }) => ({ nhom, patch, cu: q })),
  danhMucThem: themDanhMuc,
}, null, 1), 'utf8');
console.log(`\nĐã sao lưu vào ${tm}`);

let n = 0, loi = 0;
for (const { q, patch } of doiCau) {
  const { error } = await sb.from('questions').update(patch).eq('id', q.id);
  if (error) { loi++; if (loi <= 3) console.error('  lỗi:', q.question_id, error.message); }
  else n++;
  if ((n + loi) % 50 === 0) process.stdout.write(`\r   ${n + loi}/${doiCau.length} câu...`);
}
console.log(`\nĐã sửa ${n} câu` + (loi ? ` · ${loi} câu lỗi` : ''));

if (themDanhMuc.length) {
  const { data, error } = await sb.from('question_categories').insert(themDanhMuc).select('id');
  console.log(error ? `Lỗi thêm danh mục: ${error.message}` : `Đã thêm ${data?.length || 0} dòng danh mục.`);
}
