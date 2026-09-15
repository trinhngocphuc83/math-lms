/**
 * RÀ LẠI TÍNH ĐÚNG ĐẮN của mọi câu hỏi đã rút vào một chương (bài giảng, tự luyện, đề
 * ôn tập). kiem-giao-an.mjs chỉ soi HÌNH THỨC (thiếu ảnh, lạc dạng, lệch đáp án so với
 * kho); nó không biết đáp án trong kho có ĐÚNG hay không. Toán 12 chương 3 (9/2026) từng
 * qua kiem-giao-an 0 lỗi mà thầy mở ra thấy "sai rất nhiều câu" — sai từ trong kho.
 *
 * Script này làm hai việc:
 *   1. Bày TOÀN BỘ câu hỏi ra một tệp markdown để đọc và GIẢI LẠI từng câu: đề, phương án,
 *      đáp án đang ghi, lời giải. Không có cách nào máy kiểm được toán đúng hay sai, nên
 *      phần này là người (hoặc mô hình) đọc — tệp bày sao cho đọc 200 câu không sót câu nào.
 *   2. Gắn cờ những chỗ máy bắt được để đọc kỹ hơn:
 *        NGHI ĐÁP ÁN   - kết quả cuối lời giải trùng một phương án KHÁC phương án đang chọn
 *        LG KHÔNG KHỚP - lời giải không nhắc tới đáp án đang chọn (NLC), hoặc TLN mà số
 *                        cuối lời giải khác exactAnswer
 *        PHƯƠNG ÁN TRÙNG - hai phương án giống hệt nhau
 *        TLN >4 Ô      - đáp án trả lời ngắn không ghi được vào 4 ô phiếu
 *        ĐS MỘT MÀU    - bốn ý cùng Đúng hoặc cùng Sai (hợp lệ nhưng hay là dấu hiệu gắn nhầm)
 *        THIẾU LG      - không có lời giải để đối chiếu
 *
 *   node .claude/skills/soan-chuong-thpt/scripts/ra-cau.mjs --lop "TOÁN 10" --chuong "Hệ thức lượng" --cuoi "Cuối chương 3"
 *   -> scratch/ra-cau/<chương>.md (đọc), scratch/ra-cau/<chương>.json (chỉ mục cho bộ sửa)
 *
 * Đọc xong, ghi kết luận vào scratch/ra-cau/<chương>-sua.json rồi chạy sua-cau-ra.mjs.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const CO = process.argv.slice(2);
const lay = (t, m) => { const i = CO.indexOf(`--${t}`); return i >= 0 && CO[i + 1] ? CO[i + 1] : m; };
const LOP = lay('lop', null);
const TEN_CHUONG = lay('chuong', null);
const TEN_CUOI = lay('cuoi', null);
if (!LOP || !TEN_CHUONG) { console.error('Cần --lop "TOÁN 10" --chuong "…" [--cuoi "Cuối chương N"]'); process.exit(1); }

const MAU_QUIZ = /^```quiz[ \t]*\r?\n([\s\S]*?)^```/gm;
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: kh } = await sb.from('courses').select('id,title').ilike('title', `%${LOP}%`);
if (!kh?.length) { console.error('Không thấy khoá học'); process.exit(1); }
const { data: ch } = await sb.from('chapters').select('id,title').eq('course_id', kh[0].id).ilike('title', `%${TEN_CHUONG}%`);
if (!ch?.length) { console.error('Không thấy chương'); process.exit(1); }
const { data: dsBai } = await sb.from('lessons').select('id,title').eq('chapter_id', ch[0].id).order('order_index');
const baiIds = dsBai.map(b => b.id);
if (TEN_CUOI) {
  const { data: chOn } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).eq('loai', 'on-tap');
  if (chOn?.length) {
    const { data: bc } = await sb.from('lessons').select('id,title').in('chapter_id', chOn.map(c => c.id)).eq('title', TEN_CUOI);
    for (const b of bc || []) { dsBai.push(b); baiIds.push(b.id); }
  }
}
const { data: mods } = await sb.from('lesson_modules').select('id,title,type,lesson_id,order_index,content_markdown')
  .in('lesson_id', baiIds).order('order_index');
const tenBai = Object.fromEntries(dsBai.map(b => [b.id, b.title]));

/* Gom khối theo module, giữ thứ tự; mỗi câu nhớ mọi module đang dùng nó */
const cau = [];            // [{ma, id, loai, khoi, noi:[{module, title, stt}]}]
const theoMa = new Map();
for (const m of mods) {
  let stt = 0;
  for (const x of String(m.content_markdown || '').matchAll(MAU_QUIZ)) {
    let q; try { q = JSON.parse(x[1]); } catch { continue; }
    stt++;
    const key = q.sourceQuestionId || `${m.id}#${stt}`;
    const noi = { module: m.id, title: `${tenBai[m.lesson_id]} › ${m.title}`, stt };
    if (theoMa.has(key)) { theoMa.get(key).noi.push(noi); continue; }
    const c = { key, ma: q.maCauHoi || '', id: q.sourceQuestionId || '', loai: q.type, khoi: q, noi: [noi] };
    theoMa.set(key, c); cau.push(c);
  }
}
const ids = cau.map(c => c.id).filter(Boolean);
const kho = {};
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb.from('questions').select('id,question_id,question_type,math_form,difficulty,content,option_a,option_b,option_c,option_d,correct_answer,explanation').in('id', ids.slice(i, i + 200));
  for (const q of data || []) kho[q.id] = q;
}

/* "\n" hai kí tự trong kho là xuống dòng, nhưng không được ăn \ne, \neq, \nabla */
const xuongDong = (s) => String(s || '').replace(/\\n(?!eq\b|e\b|abla\b|u\b|ot\b|ewline\b|onumber\b)/g, '\n');
/* ---- chuẩn hoá để so công thức ---- */
const chuan = (s) => String(s || '')
  .replace(/\\left|\\right/g, '').replace(/\\[dt]frac/g, '\\frac').replace(/\\,|\\;|\\!|\\quad|\\qquad|\\ /g, '')
  .replace(/\{,\}/g, ',').replace(/\\cdot/g, '.').replace(/\^\{\\circ\}|\^\\circ|°/g, '')
  .replace(/\$/g, '').replace(/[\s.;:]+$/g, '').replace(/\s+/g, '').replace(/^[A-D]\.\s*/, '').toLowerCase();
/** các công thức / con số ở 3 dòng cuối lời giải */
function ketQuaCuoi(lg) {
  const dong = xuongDong(lg).split('\n').map(x => x.trim()).filter(Boolean);
  const cuoi = dong.slice(-3).join(' ');
  const ra = [];
  for (const m of cuoi.matchAll(/\$([^$]+)\$/g)) {
    const t = m[1];
    /* lấy vế phải cuối cùng của dấu = hoặc ≈ */
    const ve = t.split(/=|\\approx|\\Rightarrow|\\Leftrightarrow/).map(x => x.trim()).filter(Boolean);
    if (ve.length) ra.push(chuan(ve[ve.length - 1]));
    ra.push(chuan(t));
  }
  for (const m of cuoi.matchAll(/-?\d+(?:[.,]\d+)?/g)) ra.push(m[0].replace(',', '.'));
  return ra.filter(x => x.length > 0);
}
const soHoa = (s) => { const m = String(s || '').replace(/\s/g, '').replace(',', '.').match(/^-?\d+(\.\d+)?$/); return m ? Number(m[0]) : null; };

/* ---- cờ ---- */
const co = { 'NGHI ĐÁP ÁN': 0, 'LG KHÔNG KHỚP': 0, 'PHƯƠNG ÁN TRÙNG': 0, 'TLN >4 Ô': 0, 'ĐS MỘT MÀU': 0, 'THIẾU LG': 0 };
for (const c of cau) {
  const q = c.khoi, g = kho[c.id];
  const lg = String(q.answer || q.explanation || g?.explanation || '') + '\n' + (q.cac_buoc_thuc_hien || []).join('\n');
  c.co = [];
  if (!lg.trim()) { c.co.push('THIẾU LG'); continue; }
  const kq = ketQuaCuoi(lg);
  if (q.type === 'multiple_choice' && Array.isArray(q.options)) {
    const pa = q.options.map(chuan);
    const dung = q.answerIndex;
    if (new Set(pa).size < pa.length) c.co.push('PHƯƠNG ÁN TRÙNG');
    const trung = pa.map((p, i) => p.length >= 1 && kq.some(k => k === p) ? i : -1).filter(i => i >= 0);
    if (trung.length && !trung.includes(dung)) c.co.push('NGHI ĐÁP ÁN');
    /* câu "khẳng định nào đúng/sai" thì lời giải hiếm khi chép lại nguyên phương án — bỏ qua cho khỏi báo giả */
    const hoiMenhDe = /(nào sau đây|nào đúng|nào sai|mệnh đề|khẳng định|công thức|đẳng thức|hệ thức|bất đẳng thức|chọn)/i.test(String(q.question));
    /* phương án "cot α = 2." thì chỉ so phần sau dấu bằng */
    const loi = chuan(lg), duoi = (pa[dung] || '').split('=').pop();
    if (!trung.length && !hoiMenhDe && duoi && duoi.length > 1 && !loi.includes(duoi)) c.co.push('LG KHÔNG KHỚP');
  }
  if (q.type === 'short_answer') {
    const da = String(q.exactAnswer || '').trim();
    const oPhieu = da.replace(/\s/g, '').length;
    if (oPhieu > 4) c.co.push('TLN >4 Ô');
    const so = soHoa(da);
    if (so !== null) {
      const soCuoi = kq.map(soHoa).filter(x => x !== null);
      if (soCuoi.length && !soCuoi.some(x => Math.abs(x - so) < 1e-9)) c.co.push('LG KHÔNG KHỚP');
    }
  }
  if (q.type === 'true_false_cluster' && Array.isArray(q.options)) {
    const d = q.options.map(o => !!o.isTrue);
    if (d.every(Boolean) || d.every(x => !x)) c.co.push('ĐS MỘT MÀU');
  }
  for (const k of c.co) co[k]++;
}

/* ---- tệp đọc ---- */
const tenTep = ch[0].title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-');
mkdirSync('scratch/ra-cau', { recursive: true });
const ra = [];
ra.push(`# RÀ LẠI CÂU HỎI · ${ch[0].title} · ${kh[0].title}`);
ra.push(`\n${cau.length} câu khác nhau trong ${mods.length} module. Cờ máy: ${Object.entries(co).map(([k, v]) => `${k} ${v}`).join(' · ')}.`);
ra.push(`\nCách đọc: GIẢI LẠI từng câu, so với đáp án đang ghi và lời giải. Ghi kết luận vào \`scratch/ra-cau/${tenTep}-sua.json\` theo khuôn ở cuối tệp.\n`);
let k = 0;
for (const c of cau) {
  k++;
  const q = c.khoi, g = kho[c.id] || {};
  const loai = { multiple_choice: 'NLC', true_false_cluster: 'DS', short_answer: 'TLN', essay: 'TL' }[q.type] || q.type;
  ra.push(`\n---\n\n## ${k}. ${c.ma || '(không mã)'} · ${loai} · ${g.math_form || '?'} · mức ${g.difficulty ?? '?'}${c.co.length ? '  ⚑ ' + c.co.join(', ') : ''}`);
  ra.push(`_Dùng ở: ${c.noi.map(n => `${n.title} (câu ${n.stt})`).join('; ')}_\n`);
  ra.push(`**Đề:** ${String(q.question || '').replace(/\n+/g, '\n')}`);
  if (q.type === 'multiple_choice') {
    q.options.forEach((o, i) => ra.push(`- ${i === q.answerIndex ? '**✔**' : '  '} ${'ABCD'[i]}. ${o}`));
  } else if (q.type === 'true_false_cluster') {
    q.options.forEach((o, i) => ra.push(`- ${'abcd'[i]}) [${o.isTrue ? 'Đ' : 'S'}] ${o.content}`));
  } else if (q.type === 'short_answer') {
    ra.push(`**Đáp án ghi:** \`${q.exactAnswer}\``);
  }
  const lg = q.answer || (q.phuong_phap_giai ? `Phương pháp giải:\n${q.phuong_phap_giai}\n\nLời giải:\n${(q.cac_buoc_thuc_hien || []).join('\n')}` : '') || g.explanation || '(không có)';
  ra.push(`\n**Lời giải đang ghi:**\n${xuongDong(lg)}`);
}
ra.push(`\n---\n\n## Khuôn tệp sửa (\`${tenTep}-sua.json\`)\n`);
ra.push('```json\n[\n  { "ma": "CH_…", "ket_luan": "đáp án C mới đúng vì …", "sua": { "correct_answer": "C" } },\n  { "ma": "CH_…", "ket_luan": "lời giải tính nhầm", "sua": { "explanation": "Phương pháp giải:\\n…\\n\\nLời giải:\\n…" } },\n  { "ma": "CH_…", "ket_luan": "đề vô lí, bỏ khỏi bài", "bo": true }\n]\n```');
ra.push('\n`sua` nhận các cột của bảng `questions`: content, option_a..d, correct_answer (NLC: A-D; DS: "ĐSĐS"; TLN: số), explanation. `bo: true` thì gỡ câu khỏi mọi module (kho giữ nguyên nhưng gắn cờ vào đầu đề).');
writeFileSync(`scratch/ra-cau/${tenTep}.md`, ra.join('\n'));
writeFileSync(`scratch/ra-cau/${tenTep}.json`, JSON.stringify(cau.map(c => ({ ma: c.ma, id: c.id, loai: c.loai, co: c.co, noi: c.noi })), null, 1));

console.log(`${ch[0].title}: ${cau.length} câu khác nhau trong ${mods.length} module`);
for (const [t, v] of Object.entries(co)) console.log(`   ${v ? '⚑' : ' '} ${t}: ${v}`);
for (const c of cau.filter(c => c.co.length)) console.log(`      ${c.ma} [${c.co.join(', ')}] ${String(c.khoi.question).replace(/\s+/g, ' ').slice(0, 70)}`);
console.log(`\n-> scratch/ra-cau/${tenTep}.md — đọc và giải lại TỪNG câu, không tin cờ máy là đủ.`);
