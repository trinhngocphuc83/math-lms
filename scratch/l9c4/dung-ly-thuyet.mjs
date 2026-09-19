/**
 * Dựng module lý thuyết từ scratch/l9c4/lt-baiN.md:
 *   - {{Q:<mã câu>}} → khối ```quiz``` rút từ kho (đúng khuôn app: sourceQuestionId, maCauHoi,
 *     phuong_phap_giai / cac_buoc_thuc_hien tách từ explanation, exactAnswer / answerIndex).
 *   - content_markdown = bản đã thay; presentation_markdown = bản trình chiếu (tiêu đề mục
 *     thành khung màu, "Hướng dẫn giải" tách slide) theo đúng lối các chương Toán 9 đang dùng.
 *   node scratch/l9c4/dung-ly-thuyet.mjs 1        → xem (in ra scratch/l9c4/ra-bai1.md)
 *   node scratch/l9c4/dung-ly-thuyet.mjs 1 --ghi  → ghi vào module theory của bài
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { donDe, xuongDong } from '../donDeCauHoi.mjs';

const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('D:/claude/math-lms/scratch/l9c4/kho.json', 'utf8'));
const theoMa = Object.fromEntries(kho.map(q => [q.question_id, q]));

export function tachLoiGiai(explanation) {
  const s = xuongDong(explanation);
  if (!s) return { phuongPhap: '', buoc: [] };
  const i = s.search(/(?:\*\*)?Lời giải:?(?:\*\*)?/i);
  let phuongPhap = '', than = s;
  if (i >= 0) {
    phuongPhap = s.slice(0, i).replace(/^\s*(?:\*\*)?Phương pháp giải:?(?:\*\*)?\s*/i, '').trim();
    than = s.slice(i).replace(/^(?:\*\*)?Lời giải:?(?:\*\*)?\s*/i, '').trim();
  } else if (/^\s*(?:\*\*)?Phương pháp giải/i.test(s)) {
    /* Không có nhãn "Lời giải:" — câu đầu là phương pháp, phần còn lại là các bước */
    const con = s.replace(/^\s*(?:\*\*)?Phương pháp giải:?(?:\*\*)?\s*/i, '').trim();
    const nl = con.indexOf('\n');
    if (nl > 0) { phuongPhap = con.slice(0, nl).trim(); than = con.slice(nl + 1).trim(); }
    else {
      const m2 = con.match(/^(.+?\.)\s+((?:Ta có|Xét|Vì|Do|Áp dụng|Suy ra|Theo|Gọi|Đặt)[\s\S]*)$/);
      if (m2) { phuongPhap = m2[1].trim(); than = m2[2].trim(); } else { phuongPhap = con; than = ''; }
    }
  }
  const buoc = [];
  for (const d of than.split('\n').map(x => x.trim()).filter(Boolean)) {
    const chiCongThuc = /^\$[^$]*\$\.?$/.test(d) || /^\$\$[\s\S]*\$\$$/.test(d);
    if (chiCongThuc && buoc.length) buoc[buoc.length - 1] += '\n' + d;
    else buoc.push(d);
  }
  return { phuongPhap, buoc };
}

const RE_CHO_HINH = /\[(?:CÓ )?HÌNH (?:ẢNH|VẼ)[^\]]*\]|\[HINH VE[^\]]*\]/gi;
export function khoiTuCau(q) {
  const kieu = { NLC: 'multiple_choice', DS: 'true_false_cluster', TLN: 'short_answer', TL: 'essay' }[String(q.question_type).toUpperCase()] || 'multiple_choice';
  let de = donDe(q.content);
  if (q.image_url && !de.includes(q.image_url)) {
    const anh = `\n\n![Hình ảnh](${q.image_url})\n\n`;
    const thay = de.replace(RE_CHO_HINH, anh);
    de = (thay !== de ? thay : de + anh).replace(/\n{3,}/g, '\n\n').trim();
  }
  const c = { type: kieu, question: de };
  if (kieu === 'multiple_choice') {
    c.options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
    c.answerIndex = { A: 0, B: 1, C: 2, D: 3 }[String(q.correct_answer || '').trim().toUpperCase()] ?? 0;
  } else if (kieu === 'short_answer') {
    c.exactAnswer = String(q.correct_answer || '').trim();
  } else if (kieu === 'true_false_cluster') {
    const dap = String(q.correct_answer || '').toUpperCase().replace(/[^ĐSTF]/g, '');
    c.options = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, content: q[`option_${id}`] || '', isTrue: 'ĐT'.includes(dap[i] || 'S') })).filter(o => o.content);
  }
  const t = tachLoiGiai(q.explanation);
  if (kieu === 'essay') {
    c.answer = (t.phuongPhap ? `Phương pháp giải:\n${t.phuongPhap}\n\nLời giải:\n` : '') + t.buoc.join('\n');
  } else {
    if (t.phuongPhap) c.phuong_phap_giai = t.phuongPhap;
    if (t.buoc.length) c.cac_buoc_thuc_hien = t.buoc;
  }
  c.sourceQuestionId = q.id;
  c.maCauHoi = q.question_id;
  if (['1', '2', '3', '4'].includes(String(q.difficulty))) c.muc = Math.min(3, Number(q.difficulty));
  return c;
}
const khoiMd = (c) => '```quiz\n' + JSON.stringify(c, null, 2) + '\n```';

/* ---- bản trình chiếu ---- */
const KHUNG = (mau, chu) => `<div class="border-2 border-indigo-400 bg-indigo-50/50 px-[1em] py-[0.5em] rounded-[0.8em] shadow-sm my-[0.5em] w-fit max-w-full [&>p:last-child]:mb-0">\n\n**<span style="color: ${mau}">${chu}</span>**\n\n</div>`;
export function sangTrinhChieu(md) {
  const dong = md.split('\n');
  const ra = [];
  let trongQuiz = false;
  for (const d of dong) {
    if (d.startsWith('```quiz')) trongQuiz = true;
    if (trongQuiz) { ra.push(d); if (d.trim() === '```' && !d.startsWith('```quiz')) trongQuiz = false; continue; }
    let m;
    if ((m = d.match(/^### (\d+\. .+)$/))) { ra.push(KHUNG('#a855f7', m[1])); continue; }
    if (/^### 💡 Phương pháp giải/.test(d)) { ra.push(KHUNG('#22c55e', '💡 Phương pháp giải')); continue; }
    if (/^### 🖩/.test(d)) { ra.push(KHUNG('#f97316', d.replace(/^### /, ''))); continue; }
    /* Ví dụ mẫu: tách đề và lời giải thành hai slide, như các chương Toán 9 đang làm */
    if (/^> Hướng dẫn giải:/.test(d)) { ra.push('---', '', '> **Hướng dẫn giải:**'); continue; }
    ra.push(d);
  }
  return ra.join('\n');
}

/* Chạy trực tiếp mới dựng; import từ script khác thì chỉ lấy hàm. */
const CHAY_TRUC_TIEP = /dung-ly-thuyet\.mjs$/.test(String(process.argv[1] || ''));
const SO = process.argv[2];
const GHI = process.argv.includes('--ghi');
const LESSON = {
  '1': '30640f6e-934d-429d-9b0f-bcedb400877d',
  '2': '929d4eee-6479-4b88-999a-b0c4dd37ce05',
  '3': 'c855c1b1-1fcb-485e-9dd1-3d516cd54cbc',
}[SO];
if (CHAY_TRUC_TIEP && !LESSON) { console.error('Bài 1|2|3'); process.exit(1); }
if (CHAY_TRUC_TIEP) await dung();
async function dung() {
const src = readFileSync(`D:/claude/math-lms/scratch/l9c4/lt-bai${SO}.md`, 'utf8').replace(/\r\n/g, '\n');
let thieu = [];
const noiDung = src.replace(/\{\{Q:([^}]+)\}\}/g, (_, ma) => {
  const q = theoMa[ma.trim()];
  if (!q) { thieu.push(ma); return `<!-- THIẾU CÂU ${ma} -->`; }
  return khoiMd(khoiTuCau(q));
});
if (thieu.length) { console.error('Không thấy trong kho:', thieu); process.exit(1); }
const trinhChieu = sangTrinhChieu(noiDung);
writeFileSync(`D:/claude/math-lms/scratch/l9c4/ra-bai${SO}.md`, noiDung + '\n\n<<<<<<<< PRESENTATION >>>>>>>>\n\n' + trinhChieu);
const soQuiz = (noiDung.match(/```quiz/g) || []).length;
console.log(`Bài ${SO}: ${noiDung.length} kí tự nội dung, ${trinhChieu.length} trình chiếu, ${soQuiz} câu tương tác.`);
if (GHI) {
  const { data: mod } = await sb.from('lesson_modules').select('id').eq('lesson_id', LESSON).eq('type', 'theory').single();
  const { error } = await sb.from('lesson_modules').update({ content_markdown: noiDung, presentation_markdown: trinhChieu }).eq('id', mod.id);
  console.log(error ? 'LỖI ' + error.message : 'đã ghi module ' + mod.id);
}
}
