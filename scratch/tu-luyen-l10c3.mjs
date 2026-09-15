/**
 * Dựng module "Bài tập tự luyện" cho hai bài của chương 3 lớp 10.
 *
 * Hạn ngạch lớp 10 (quy ước đã chốt): 20 NLC + 4 DS + 6 TLN + 4 TL = 34 câu.
 *   NLC chỉ mức 1-2, tỉ lệ 40/60 · DS và TLN chia 25/50/25 cho mức 2/3/4 · TL mức 3-4.
 *
 * Rút xoay vòng THEO DẠNG trong từng bài, ưu tiên câu ít dùng, và loại hết những câu đã
 * nằm trong bài giảng lý thuyết để học sinh không gặp lại y nguyên. Mỗi khối mang sẵn
 * phuong_phap_giai + cac_buoc_thuc_hien tách từ explanation của kho.
 *
 *   node scratch/tu-luyen-l10c3.mjs        -> thử (ghi nháp ra scratch/tuluyen-l10c3-<bài>.md)
 *   node scratch/tu-luyen-l10c3.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe, xuongDong } from './donDeCauHoi.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-l10c3-20260915';
const TEN_MODULE = 'Bài tập tự luyện';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-l10c3.json', 'utf8'));

/* Câu đã dùng trong bài giảng thì không lấy lại. */
const daDungLyThuyet = new Set();
for (const t of ['1', '2']) {
  const tep = `scratch/lt-l10c3-bai${t}-day-du.md`;
  if (!existsSync(tep)) continue;
  for (const m of readFileSync(tep, 'utf8').matchAll(/"sourceQuestionId": "([^"]+)"/g)) daDungLyThuyet.add(m[1]);
}

function tachLoiGiai(explanation) {
  const s = xuongDong(explanation);
  if (!s) return null;
  const m = s.match(/^\s*(?:\*\*)?Phương pháp giải:?(?:\*\*)?\s*\n([\s\S]*?)\n\s*(?:\*\*)?Lời giải:?(?:\*\*)?\s*\n([\s\S]*)$/i);
  const phuongPhap = m ? m[1].trim() : '';
  const than = (m ? m[2] : s.replace(/^\s*(?:\*\*)?Lời giải:?(?:\*\*)?\s*\n?/i, '')).trim();
  const buoc = [];
  for (const d of than.split('\n').map(x => x.trim()).filter(Boolean)) {
    const chiCongThuc = /^\$[^$]*\$\.?$/.test(d) || /^\$\$[\s\S]*\$\$$/.test(d);
    if (chiCongThuc && buoc.length) buoc[buoc.length - 1] += '\n' + d;
    else buoc.push(d);
  }
  return { phuongPhap, buoc };
}

export function khoiQuiz(q) {
  const giai = xuongDong(q.explanation);
  const goc = { sourceQuestionId: q.id, maCauHoi: q.question_id };
  let d;
  if (q.question_type === 'NLC') {
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d];
    const idx = 'ABCD'.indexOf(String(q.correct_answer).trim().toUpperCase());
    if (idx < 0 || !opts[idx]) return null;
    d = { type: 'multiple_choice', question: donDe(q.content), options: opts, answerIndex: idx };
  } else if (q.question_type === 'DS') {
    const t = tachYDungSai(q); if (!t) return null;
    d = { type: 'true_false_cluster', question: t.de, options: t.y };
  } else if (q.question_type === 'TLN') {
    d = { type: 'short_answer', question: donDe(q.content), exactAnswer: String(q.correct_answer).trim() };
  } else {
    d = { type: 'essay', question: donDe(q.content) };
  }
  /* Màn chiếu bày CẢ `answer` lẫn phương pháp + từng bước: để cả ba là lời giải hiện hai
     lần. Tự luận cần `answer` (bài giải mẫu bày ngay dưới đề); trắc nghiệm giữ phương pháp
     + bước, chỉ khi không tách được mới để `answer`. */
  const g = tachLoiGiai(q.explanation);
  if (q.question_type === 'TL') { if (giai) d.answer = giai; }
  else if (g && (g.phuongPhap || g.buoc.length)) { if (g.phuongPhap) d.phuong_phap_giai = g.phuongPhap; if (g.buoc.length) d.cac_buoc_thuc_hien = g.buoc; }
  else if (giai) d.answer = giai;
  return '```quiz\n' + JSON.stringify({ ...d, ...goc }, null, 2) + '\n```';
}

/** Hạn ngạch: [loại, mức, số câu] */
const HAN_NGACH = [
  ['NLC', '1', 8], ['NLC', '2', 12],
  ['DS', '2', 1], ['DS', '3', 2], ['DS', '4', 1],
  ['TLN', '2', 2], ['TLN', '3', 3], ['TLN', '4', 1],
  ['TL', '3', 2], ['TL', '4', 2],
];

const BAI = ['Bài 1. Giá trị lượng giác của một góc từ 0° đến 180°', 'Bài 2. Hệ thức lượng trong tam giác'];

const chinh = process.argv[1] && process.argv[1].endsWith('tu-luyen-l10c3.mjs');
if (chinh) for (const tenBai of BAI) {
  const dung = new Set();
  const chonRa = [];
  const thieu = [];

  /* Danh sách dạng của bài, ít câu xếp trước để dạng hiếm không bị dạng đông nuốt mất chỗ. */
  const dsDang = [...new Set(kho.filter(q => q.lesson === tenBai).map(q => q.math_form))]
    .sort((a, b) => kho.filter(q => q.lesson === tenBai && q.math_form === a).length
                  - kho.filter(q => q.lesson === tenBai && q.math_form === b).length);

  for (const [loai, muc, can] of HAN_NGACH) {
    const hopLe = (q) => q.lesson === tenBai && q.question_type === loai
      && String(q.difficulty) === muc && !dung.has(q.id)
      && !daDungLyThuyet.has(q.id)
      && (loai === 'TL' || String(q.correct_answer || '').trim())
      && (loai !== 'DS' || tachYDungSai(q));

    let lay = 0, vong = 0;
    while (lay < can && vong < 50) {
      let themVongNay = 0;
      for (const dang of dsDang) {
        if (lay >= can) break;
        const ung = kho.filter(q => hopLe(q) && q.math_form === dang)
                       .sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0));
        if (!ung.length) continue;
        dung.add(ung[0].id); chonRa.push(ung[0]); lay++; themVongNay++;
      }
      if (!themVongNay) break;
      vong++;
    }
    if (lay < can) thieu.push(`${loai} mức ${muc}: xin ${can} có ${lay}`);
  }

  /* Bù cho đủ TỔNG: phân bố mức là mong muốn, tổng số câu mỗi loại là hạn ngạch cứng. */
  const TONG = { NLC: 20, DS: 4, TLN: 6, TL: 4 };
  const MUC_MONG = { NLC: 2, DS: 3, TLN: 3, TL: 3.5 };
  for (const [loai, can] of Object.entries(TONG)) {
    let dang = chonRa.filter(q => q.question_type === loai).length;
    if (dang >= can) continue;
    const ung = kho.filter(q => q.lesson === tenBai && q.question_type === loai
        && !dung.has(q.id) && !daDungLyThuyet.has(q.id)
        && (loai === 'TL' || String(q.correct_answer || '').trim())
        && (loai !== 'DS' || tachYDungSai(q)))
      .sort((a, b) => Math.abs(Number(a.difficulty) - MUC_MONG[loai]) - Math.abs(Number(b.difficulty) - MUC_MONG[loai])
                   || (a.usage_count || 0) - (b.usage_count || 0));
    for (const q of ung) {
      if (dang >= can) break;
      dung.add(q.id); chonRa.push(q); dang++;
    }
    if (dang < can) thieu.push(`${loai}: KHO CHỈ CÓ ${dang}/${can}`);
  }

  const thuTu = { NLC: 0, DS: 1, TLN: 2, TL: 3 };
  chonRa.sort((a, b) => thuTu[a.question_type] - thuTu[b.question_type]
                     || Number(a.difficulty) - Number(b.difficulty));

  const khoi = chonRa.map(khoiQuiz).filter(Boolean);
  const md = khoi.join('\n\n');
  const dem = (t) => chonRa.filter(q => q.question_type === t).length;
  const mucCua = (t) => [1, 2, 3, 4].map(m => chonRa.filter(q => q.question_type === t && Number(q.difficulty) === m).length).join('/');
  const thucTe = chonRa.filter(q => /thực tế/i.test(q.math_form) && ['TLN', 'TL'].includes(q.question_type)).length;
  console.log(`${tenBai}: ${khoi.length} câu (NLC ${dem('NLC')} · DS ${dem('DS')} · TLN ${dem('TLN')} · TL ${dem('TL')}) · TLN+TL thực tế: ${thucTe}`);
  console.log(`   mức 1/2/3/4 →  NLC ${mucCua('NLC')} · DS ${mucCua('DS')} · TLN ${mucCua('TLN')} · TL ${mucCua('TL')}`);
  const dangDung = {}; for (const q of chonRa) dangDung[q.math_form] = (dangDung[q.math_form] || 0) + 1;
  console.log('   theo dạng: ' + Object.entries(dangDung).map(([k, v]) => `${k.slice(0, 28)}…${v}`).join(' · '));
  if (thieu.length) console.log(`   ⚠ ${thieu.join(' · ')}`);

  const { data: kh } = await sb.from('courses').select('id').ilike('title', '%TOÁN 10%');
  const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).ilike('title', '%Hệ thức lượng%');
  const { data: ls } = await sb.from('lessons').select('id').eq('chapter_id', ch[0].id).eq('title', tenBai).maybeSingle();
  const { data: mods } = await sb.from('lesson_modules').select('id,title,type,order_index,content_markdown')
    .eq('lesson_id', ls.id).order('order_index');
  const cu = mods.find(m => m.title === TEN_MODULE);

  if (!GHI) {
    console.log(`   (thử) ${cu ? 'cập nhật module ' + cu.id : 'tạo module mới'} trong bài ${ls.id}`);
    writeFileSync(`scratch/tuluyen-l10c3-${tenBai.slice(4, 5)}.md`, md);
    continue;
  }

  mkdirSync(SAO_LUU, { recursive: true });
  if (cu) {
    const tep = `${SAO_LUU}/tuluyen-${cu.id}.md`;
    if (!existsSync(tep)) writeFileSync(tep, cu.content_markdown || '');
    const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', cu.id);
    console.log(error ? `   ✗ ${error.message}` : `   ✓ đã cập nhật ${cu.id}`);
  } else {
    const viTri = (mods.find(m => m.type === 'theory')?.order_index ?? 1) + 1;
    for (const m of mods.filter(m => m.order_index >= viTri)) {
      await sb.from('lesson_modules').update({ order_index: m.order_index + 1 }).eq('id', m.id);
    }
    const { error } = await sb.from('lesson_modules').insert({
      lesson_id: ls.id, title: TEN_MODULE, type: 'practice',
      content_markdown: md, order_index: viTri,
    });
    console.log(error ? `   ✗ ${error.message}` : `   ✓ đã tạo module mới ở vị trí ${viTri}`);
  }
}
