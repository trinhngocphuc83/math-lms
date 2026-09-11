/**
 * Bước 4: soát tệp câu hỏi đã bóc TRƯỚC KHI ghi vào kho.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-cau.mjs scratch/nap-kho/<tên>.cau.json
 *
 * Soát: danh mục có thật (đúng từng chữ) · mã loại, mức · đủ phương án, đáp án đúng khuôn ·
 * TLN tô được vào phiếu 4 ô · dấu $ cân · trùng với kho hoặc trùng trong chính tệp.
 * Lỗi (✗) thì ghi-cau.mjs từ chối; cảnh báo (⚠) thì vẫn ghi được nhưng nên xem lại.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const tep = process.argv[2];
if (!tep) { console.error('Cần tệp .cau.json'); process.exit(1); }
const goi = JSON.parse(readFileSync(tep, 'utf8'));
const S = (x) => String(x ?? '').trim();
const GRADE = S(goi.grade);
if (!GRADE || !Array.isArray(goi.cau)) { console.error('Tệp phải có "grade" và mảng "cau".'); process.exit(1); }

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const lay = async (b, c, f2) => { let r = [], f = 0; while (true) { const { data, error } = await f2(sb.from(b).select(c)).range(f, f + 999); if (error) throw error; r.push(...(data || [])); if (!data || data.length < 1000) break; f += 1000; } return r; };
const dm = await lay('question_categories', 'subject,topic,lesson,math_form', q => q.eq('grade', GRADE));
const kho = await lay('questions', 'question_id,content,option_a', q => q.eq('grade', GRADE));
const khoaDM = new Set(dm.map(c => `${c.subject}|${c.topic}|${c.lesson}|${c.math_form}`));

/* Chuẩn hoá để so trùng - cùng lối với isSameQuestion của app. */
const chuan = (t) => S(t).replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  .replace(/\s*([{}()[\]^_])\s*/g, '$1').toLowerCase().replace(/[.,;:!?]+$/, '');
const bo3 = (t) => { const s = chuan(t).replace(/\s/g, ''); const r = new Set(); for (let i = 0; i + 3 <= s.length; i++) r.add(s.slice(i, i + 3)); return r; };
const giong = (a, b) => { const A = bo3(a), B = bo3(b); if (!A.size || !B.size) return 0; let c = 0; for (const x of A) if (B.has(x)) c++; return c / Math.max(A.size, B.size); };
const khoChuan = kho.map(q => ({ id: q.question_id, c: chuan(q.content), b: bo3(q.content) }));

const canDollar = (t) => (S(t).replace(/\$\$/g, '').match(/\$/g) || []).length % 2 === 0;
const oPhieu = (s) => s.replace(/[.,-]/g, '').length + (s.includes(',') || s.includes('.') ? 1 : 0) + (s.startsWith('-') ? 1 : 0);

let loi = 0, canhBao = 0;
const bao = (i, muc, msg) => { if (muc === '✗') loi++; else canhBao++; console.log(`  ${muc} câu ${i + 1}: ${msg}`); };

goi.cau.forEach((q, i) => {
  const k = `${S(q.subject || goi.subject)}|${S(q.topic)}|${S(q.lesson)}|${S(q.math_form)}`;
  if (!khoaDM.has(k)) bao(i, '✗', `danh mục không có: ${k}`);
  if (!['NLC', 'DS', 'TLN', 'TL'].includes(q.question_type)) bao(i, '✗', `loại lạ "${q.question_type}"`);
  if (!['1', '2', '3', '4'].includes(S(q.difficulty))) bao(i, '✗', `mức lạ "${q.difficulty}"`);
  if (S(q.content).length < 15 && !S(q.option_a)) bao(i, '✗', 'đề quá ngắn');
  const pa = ['option_a', 'option_b', 'option_c', 'option_d'].map(c => S(q[c]));
  const da = S(q.correct_answer);
  if (q.question_type === 'NLC') {
    if (pa.some(p => !p)) bao(i, '✗', 'NLC thiếu phương án');
    if (new Set(pa.map(p => p.toLowerCase())).size < 4) bao(i, '✗', 'NLC có hai phương án giống nhau');
    if (!/^[A-D]$/.test(da)) bao(i, '✗', `đáp án NLC phải là A–D, đang "${da}"`);
  }
  if (q.question_type === 'DS') {
    if (pa.some(p => !p)) bao(i, '✗', 'DS thiếu ý (cần đủ 4 ý a b c d ở option_a..d)');
    if (!/^[ĐS]{4}$/.test(da)) bao(i, '✗', `đáp án DS phải 4 kí tự Đ/S, đang "${da}"`);
  }
  if (q.question_type === 'TLN') {
    if (!/^-?\d+(,\d+)?$/.test(da)) bao(i, '✗', `đáp án TLN phải là số (dấu phẩy thập phân), đang "${da}"`);
    else if (oPhieu(da) > 4) bao(i, '✗', `đáp án TLN "${da}" quá 4 ô phiếu - đổi đơn vị hoặc cách làm tròn`);
    if (pa.some(p => p)) bao(i, '⚠', 'TLN không nên có phương án');
  }
  if (q.question_type === 'TL' && !S(q.explanation)) bao(i, '✗', 'tự luận phải có lời giải');
  for (const c of ['content', 'explanation', ...['option_a', 'option_b', 'option_c', 'option_d']]) if (!canDollar(q[c])) bao(i, '✗', `dấu $ lẻ ở ${c}`);
  if (/\\n(?!eq\b|e\b|abla\b|u(?![a-z])|ot\b)/.test(S(q.content) + S(q.explanation))) bao(i, '✗', 'còn chuỗi "\\n" hai kí tự - dùng xuống dòng thật');
  if (!S(q.explanation)) bao(i, '⚠', 'chưa có lời giải');
  else if (!/Lời giải/i.test(q.explanation)) bao(i, '⚠', 'lời giải nên theo khuôn "Phương pháp giải:\\n…\\n\\nLời giải:\\n…"');
  if (/hình (vẽ|bên|dưới|sau)|như hình|đồ thị (bên|dưới|sau)/i.test(S(q.content)) && ![q.content, ...pa].some(t => /!\[/.test(S(t)))) bao(i, '⚠', 'đề nhắc hình mà chưa nhúng ảnh (dùng cat-anh.mjs)');

  /* Trùng */
  const c = chuan(q.content), b = bo3(q.content);
  const trungKho = khoChuan.find(x => x.c === c);
  if (trungKho) bao(i, '✗', `trùng hệt câu ${trungKho.id} trong kho`);
  else { let tot = null; for (const x of khoChuan) { let n = 0; for (const t of b) if (x.b.has(t)) n++; const d = n / Math.max(b.size, x.b.size); if (d >= 0.85 && (!tot || d > tot.d)) tot = { id: x.id, d }; } if (tot) bao(i, '⚠', `rất giống câu ${tot.id} trong kho (${Math.round(tot.d * 100)}%) - đọc lại xem có phải cùng một câu`); }
  for (let j = 0; j < i; j++) if (chuan(goi.cau[j].content) === c) bao(i, '✗', `trùng câu ${j + 1} trong cùng tệp`);
});

const dem = (f) => goi.cau.filter(f).length;
console.log(`\n${tep}: ${goi.cau.length} câu · NLC ${dem(q => q.question_type === 'NLC')} · DS ${dem(q => q.question_type === 'DS')} · TLN ${dem(q => q.question_type === 'TLN')} · TL ${dem(q => q.question_type === 'TL')}`);
console.log(`mức 1/2/3/4: ${[1, 2, 3, 4].map(m => dem(q => S(q.difficulty) === String(m))).join('/')} · dạng: ${new Set(goi.cau.map(q => q.math_form)).size}`);
console.log(loi ? `✗ ${loi} lỗi · ${canhBao} cảnh báo — sửa lỗi rồi mới ghi` : `✓ không lỗi · ${canhBao} cảnh báo`);
process.exit(loi ? 1 : 0);
