/**
 * Dựng module "Bài tập tự luyện" cho ba bài của chương 2 lớp 11.
 *
 * Hạn ngạch lớp 11 (quy ước đã chốt): 20 NLC + 4 DS + 6 TLN + 4 TL = 34 câu.
 *   NLC chỉ mức 1-2, tỉ lệ 40/60 · DS và TLN chia 25/50/25 cho mức 2/3/4 · TL mức 3-4.
 *
 * Rút xoay vòng THEO DẠNG trong từng bài, ưu tiên câu ít dùng, và loại hết những câu đã
 * nằm trong bài giảng lý thuyết để học sinh không gặp lại y nguyên.
 *
 *   node scratch/tu-luyen-11c2.mjs        -> thử
 *   node scratch/tu-luyen-11c2.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe } from './donDeCauHoi.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-11c2-20260909';
const TEN_MODULE = 'Bài tập tự luyện';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-11c2.json', 'utf8'));

/* Câu đã dùng trong bài giảng thì không lấy lại. */
const daDungLyThuyet = new Set();
for (const t of ['1', '2', '3']) {
  const tep = `scratch/lt-11c2-bai${t}-day-du.md`;
  if (!existsSync(tep)) continue;
  for (const m of readFileSync(tep, 'utf8').matchAll(/"sourceQuestionId": "([^"]+)"/g)) daDungLyThuyet.add(m[1]);
}


function khoiQuiz(q) {
  const giai = String(q.explanation || '').replace(/\\n/g, '\n').trim();
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
  if (giai) d.answer = giai;
  if (q.image_url) d.imageUrl = q.image_url;
  return '```quiz\n' + JSON.stringify({ ...d, ...goc }, null, 2) + '\n```';
}

/** Hạn ngạch: [loại, mức, số câu] */
const HAN_NGACH = [
  ['NLC', '1', 8], ['NLC', '2', 12],
  ['DS', '2', 1], ['DS', '3', 2], ['DS', '4', 1],
  ['TLN', '2', 2], ['TLN', '3', 3], ['TLN', '4', 1],
  ['TL', '3', 2], ['TL', '4', 2],
];

const BAI = ['Bài 1. Dãy số', 'Bài 2. Cấp số cộng', 'Bài 3. Cấp số nhân'];

for (const tenBai of BAI) {
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
    /* Xoay vòng qua các dạng: mỗi vòng mỗi dạng góp một câu, nên không dạng nào chiếm hết. */
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

  /* BÙ CHO ĐỦ TỔNG. Phân bố mức là mong muốn, còn TỔNG SỐ CÂU mỗi loại là hạn ngạch cứng.
     Kho chương này không đủ câu Đúng/Sai mức 4, chia đúng tỉ lệ thì module thiếu hẳn mấy
     câu - thà lệch mức một chút còn hơn giao cho học sinh bài tập thiếu câu. Lấy mức gần
     mức mong muốn nhất. */
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

  /* Xếp theo thứ tự đề: NLC -> DS -> TLN -> TL, trong mỗi loại thì dễ trước khó sau. */
  const thuTu = { NLC: 0, DS: 1, TLN: 2, TL: 3 };
  chonRa.sort((a, b) => thuTu[a.question_type] - thuTu[b.question_type]
                     || Number(a.difficulty) - Number(b.difficulty));

  const khoi = chonRa.map(khoiQuiz).filter(Boolean);
  const md = khoi.join('\n\n');
  const dem = (t) => chonRa.filter(q => q.question_type === t).length;
  const mucCua = (t) => [1, 2, 3, 4].map(m => chonRa.filter(q => q.question_type === t && Number(q.difficulty) === m).length).join('/');
  console.log(`${tenBai}: ${khoi.length} câu (NLC ${dem('NLC')} · DS ${dem('DS')} · TLN ${dem('TLN')} · TL ${dem('TL')})`);
  console.log(`   mức 1/2/3/4 →  NLC ${mucCua('NLC')} · DS ${mucCua('DS')} · TLN ${mucCua('TLN')} · TL ${mucCua('TL')}`);
  const nang = thieu.filter(x => x.includes('KHO CHỈ CÓ'));
  if (nang.length) console.log(`   ⚠ ${nang.join(' · ')}`);

  const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
  const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).ilike('title', '%DÃY SỐ%');
  const { data: ls } = await sb.from('lessons').select('id').eq('chapter_id', ch[0].id).eq('title', tenBai).maybeSingle();
  const { data: mods } = await sb.from('lesson_modules').select('id,title,type,order_index,content_markdown')
    .eq('lesson_id', ls.id).order('order_index');
  const cu = mods.find(m => m.title === TEN_MODULE);

  if (!GHI) {
    console.log(`   (thử) ${cu ? 'cập nhật module ' + cu.id : 'tạo module mới'} trong bài ${ls.id}`);
    writeFileSync(`scratch/tuluyen-${tenBai.slice(4, 9).trim()}.md`, md);
    continue;
  }

  mkdirSync(SAO_LUU, { recursive: true });
  if (cu) {
    const tep = `${SAO_LUU}/tuluyen-${cu.id}.md`;
    if (!existsSync(tep)) writeFileSync(tep, cu.content_markdown || '');
    const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', cu.id);
    console.log(error ? `   ✗ ${error.message}` : `   ✓ đã cập nhật ${cu.id}`);
  } else {
    /* Đặt NGAY SAU bài giảng lý thuyết và TRƯỚC các module "Luyện tập" cũ. */
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
