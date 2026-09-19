/**
 * Hàm dùng chung cho các script của skill giao-an-tu-luan (THCS, 100% tự luận).
 * Chạy từ gốc repo (cần .env.local); hàm dọn đề ở ../../_chung/ của thư mục skills.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const { donDe, xuongDong } = await import(new URL('../../_chung/donDeCauHoi.mjs', import.meta.url).href);
export { donDe, xuongDong };

export const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
export const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Đọc tham số --ten giá_trị; cờ không giá trị (ghi, --ghi) kiểm bằng co('ghi'). */
export const CO = process.argv.slice(2);
export const lay = (t, m = null) => { const i = CO.indexOf(`--${t}`); return i >= 0 && CO[i + 1] && !CO[i + 1].startsWith('--') ? CO[i + 1] : m; };
export const co = (t) => CO.includes(t) || CO.includes(`--${t}`);

/** Khoá học + chương thường + chuyên đề ôn tập + danh sách bài của chương. */
export async function timChuong(LOP, TEN_CHUONG) {
  const { data: kh } = await sb.from('courses').select('id,title').ilike('title', `%${LOP}%`);
  if (!kh?.length) throw new Error(`Không thấy khoá "${LOP}"`);
  const { data: ch } = await sb.from('chapters').select('id,title,order_index,loai').eq('course_id', kh[0].id).ilike('title', `%${TEN_CHUONG}%`);
  if (!ch?.length) throw new Error(`Không thấy chương "${TEN_CHUONG}" trong ${kh[0].title}`);
  const { data: onTap } = await sb.from('chapters').select('id,title').eq('course_id', kh[0].id).eq('loai', 'on-tap').maybeSingle();
  const { data: dsBai } = await sb.from('lessons').select('id,title,order_index').eq('chapter_id', ch[0].id).order('order_index');
  return { khoa: kh[0], chuong: ch[0], onTap, dsBai: dsBai || [], soChuong: soChuongTu(ch[0].title) };
}

/** "CHƯƠNG IV: …" → 4; "Chương 3. …" → 3. */
export function soChuongTu(tieuDe) {
  const m = String(tieuDe).match(/CH[ƯU]ƠNG\s+([IVXLC]+|\d+)/i);
  if (!m) return null;
  const s = m[1].toUpperCase();
  if (/^\d+$/.test(s)) return Number(s);
  const gt = { I: 1, V: 5, X: 10, L: 50, C: 100 }; let n = 0;
  for (let i = 0; i < s.length; i++) { const a = gt[s[i]], b = gt[s[i + 1]] || 0; n += a < b ? -a : a; }
  return n;
}

/** Số lớp từ tên khoá ("TOÁN 9 (CƠ BẢN)" → "9"). */
export const lopTu = (tenKhoa) => (String(tenKhoa).match(/\d+/) || [''])[0];

/** Danh mục kho của chương: các bài (trừ Ôn tập chương) và dạng của từng bài. */
export async function danhMucChuong(lop, tenChuong) {
  const { data } = await sb.from('question_categories').select('subject,topic,lesson,math_form')
    .eq('grade', lop).ilike('topic', `%${tenChuong}%`);
  const bai = new Map();
  for (const d of data || []) {
    if (!d.lesson || /Ôn tập chương/i.test(d.lesson)) continue;
    if (!bai.has(d.lesson)) bai.set(d.lesson, { subject: d.subject, topic: d.topic, dang: [] });
    if (d.math_form) bai.get(d.lesson).dang.push(d.math_form);
  }
  const soDau = (s) => Number((String(s).match(/Bài\s+(\d+)/) || [0, 999])[1]);
  return [...bai.entries()].sort((a, b) => soDau(a[0]) - soDau(b[0])).map(([ten, v]) => ({ ten, ...v }));
}

/** Toàn bộ câu kho của chương (mọi loại), phân trang 500. */
export async function khoCuaChuong(lop, tenChuong) {
  const ra = [];
  for (let tu = 0; ; tu += 500) {
    const { data } = await sb.from('questions').select('*').eq('grade', lop).ilike('topic', `%${tenChuong}%`).range(tu, tu + 499);
    ra.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return ra;
}

/** Lời giải kho → { phuongPhap, buoc[] }. Chịu cả ba lối ghi của kho. */
export function tachLoiGiai(explanation) {
  const s = xuongDong(explanation);
  if (!s) return { phuongPhap: '', buoc: [] };
  const i = s.search(/(?:\*\*)?Lời giải:?(?:\*\*)?/i);
  let phuongPhap = '', than = s;
  if (i >= 0) {
    phuongPhap = s.slice(0, i).replace(/^\s*(?:\*\*)?Phương pháp giải:?(?:\*\*)?\s*/i, '').trim();
    than = s.slice(i).replace(/^(?:\*\*)?Lời giải:?(?:\*\*)?\s*/i, '').trim();
  } else if (/^\s*(?:\*\*)?Phương pháp giải/i.test(s)) {
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
/**
 * Câu kho → khối ```quiz``` đúng khuôn app (sourceQuestionId, maCauHoi, muc; trắc nghiệm có
 * phuong_phap_giai/cac_buoc_thuc_hien, tự luận có answer). `epTLN`: ép câu TỰ LUẬN thành trả lời
 * ngắn để chèn vào bài giảng khi kho không có câu trắc nghiệm — chỉ được khi kho có
 * correct_answer ngắn (≤ 25 kí tự, không phải "Chứng minh").
 */
export function khoiTuCau(q, { epTLN = false } = {}) {
  let kieu = { NLC: 'multiple_choice', DS: 'true_false_cluster', TLN: 'short_answer', TL: 'essay' }[String(q.question_type).toUpperCase()] || 'essay';
  let dapNgan = String(q.correct_answer || '').trim();
  if (epTLN && kieu === 'essay') {
    /* Kho ghi đáp số kiểu "≈ 13,77 cm", "62°", "14 độ" — bỏ dấu xấp xỉ và đơn vị để học sinh gõ số là khớp */
    dapNgan = dapNgan.replace(/^[≈~]\s*/, '').replace(/\s*(cm²|cm2|m²|m2|cm|dm|mm|km|m|độ|°|º)\s*\.?$/i, '').replace(/\.$/, '').trim();
    if (!dapNgan || dapNgan.length > 25 || /chứng minh|^a\)/i.test(dapNgan))
      throw new Error(`${q.question_id}: không ép thành trả lời ngắn được (đáp án kho: "${String(q.correct_answer || '').slice(0, 40)}") — ghi correct_answer ngắn vào kho bằng sua-cau-ra.mjs trước`);
    kieu = 'short_answer';
  }
  let de = donDe(q.content);
  const epTuTuLuan = epTLN && String(q.question_type).toUpperCase() === 'TL';
  if (q.image_url && !de.includes(q.image_url)) {
    const anh = `\n\n![Hình ảnh](${q.image_url})\n\n`;
    const thay = de.replace(RE_CHO_HINH, anh);
    de = (thay !== de ? thay : de + anh).replace(/\n{3,}/g, '\n\n').trim();
  }
  const c = { type: kieu, question: de };
  if (kieu === 'multiple_choice') {
    c.options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
    c.answerIndex = { A: 0, B: 1, C: 2, D: 3 }[dapNgan.toUpperCase()] ?? 0;
  } else if (kieu === 'short_answer') {
    c.exactAnswer = dapNgan.replace(/[°º]\s*$/, '');
  } else if (kieu === 'true_false_cluster') {
    const dap = dapNgan.toUpperCase().replace(/[^ĐSTF]/g, '');
    c.options = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, content: q[`option_${id}`] || '', isTrue: 'ĐT'.includes(dap[i] || 'S') })).filter(o => o.content);
  }
  const t = tachLoiGiai(q.explanation);
  if (kieu === 'essay') c.answer = (t.phuongPhap ? `Phương pháp giải:\n${t.phuongPhap}\n\nLời giải:\n` : '') + t.buoc.join('\n');
  else { if (t.phuongPhap) c.phuong_phap_giai = t.phuongPhap; if (t.buoc.length) c.cac_buoc_thuc_hien = t.buoc; }
  c.sourceQuestionId = q.id;
  c.maCauHoi = q.question_id;
  if (epTuTuLuan) c.epTuTuLuan = true;   // kiem-giao-an / va-giao-an biết khối này cố ý khác loại với kho
  if (['1', '2', '3', '4'].includes(String(q.difficulty))) c.muc = Math.min(3, Number(q.difficulty));
  return c;
}
export const khoiMd = (c) => '```quiz\n' + JSON.stringify(c, null, 2) + '\n```';

/* ---- bản trình chiếu: khung màu cho tiêu đề mục, tách slide ở "Hướng dẫn giải" ---- */
const KHUNG = (mau, chu) => `<div class="border-2 border-indigo-400 bg-indigo-50/50 px-[1em] py-[0.5em] rounded-[0.8em] shadow-sm my-[0.5em] w-fit max-w-full [&>p:last-child]:mb-0">\n\n**<span style="color: ${mau}">${chu}</span>**\n\n</div>`;
export function sangTrinhChieu(md) {
  const ra = []; let trongQuiz = false;
  for (const d of md.split('\n')) {
    if (d.startsWith('```quiz')) trongQuiz = true;
    if (trongQuiz) { ra.push(d); if (d.trim() === '```' && !d.startsWith('```quiz')) trongQuiz = false; continue; }
    let m;
    if ((m = d.match(/^### (\d+\. .+)$/))) { ra.push(KHUNG('#a855f7', m[1])); continue; }
    if (/^### 💡 Phương pháp giải/.test(d)) { ra.push(KHUNG('#22c55e', '💡 Phương pháp giải')); continue; }
    if (/^### 🖩/.test(d)) { ra.push(KHUNG('#f97316', d.replace(/^### /, ''))); continue; }
    if (/^> Hướng dẫn giải:/.test(d)) { ra.push('---', '', '> **Hướng dẫn giải:**'); continue; }
    ra.push(d);
  }
  return ra.join('\n');
}

export const TEN_MUC = { 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng', 4: 'Vận dụng cao' };

/** Thư mục làm việc của chương trong scratch/. */
export const thuMucLamViec = (tenChuong) => `scratch/giao-an-tu-luan/${String(tenChuong).replace(/[^\p{L}\d]+/gu, '-').slice(0, 40)}`;
