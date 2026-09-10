/**
 * Dựng module "Bài tập tự luyện" cho hai bài của chương 3 lớp 12.
 *
 * Hạn ngạch lớp 12 (quy ước đã chốt): 20 NLC + 4 DS + 6 TLN = 30 câu, KHÔNG có tự luận.
 *   NLC chỉ mức 1-2, tỉ lệ 40/60 · DS và TLN chia 25/50/25 cho mức 2/3/4.
 *
 * Rút xoay vòng theo DẠNG trong từng bài, ưu tiên câu ít dùng, và loại hết những câu đã
 * nằm trong bài giảng lý thuyết.
 *
 *   node scratch/tu-luyen-12c3.mjs        -> thử
 *   node scratch/tu-luyen-12c3.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe } from './donDeCauHoi.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-12c3-20260910';
const TEN_MODULE = 'Bài tập tự luyện';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-12c3.json', 'utf8'));

const daDungLyThuyet = new Set();
for (const t of ['1', '2']) {
  const tep = `scratch/lt-12c3-bai${t}-day-du.md`;
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
  } else {
    d = { type: 'short_answer', question: donDe(q.content), exactAnswer: String(q.correct_answer).trim() };
  }
  if (giai) d.answer = giai;
  if (q.image_url) d.imageUrl = q.image_url;
  return '```quiz\n' + JSON.stringify({ ...d, ...goc }, null, 2) + '\n```';
}

const HAN_NGACH = [
  ['NLC', '1', 8], ['NLC', '2', 12],
  ['DS', '2', 1], ['DS', '3', 2], ['DS', '4', 1],
  ['TLN', '2', 2], ['TLN', '3', 3], ['TLN', '4', 1],
];
const TONG = { NLC: 20, DS: 4, TLN: 6 };
const MUC_MONG = { NLC: 2, DS: 3, TLN: 3 };

const BAI = [
  { ten: 'Bài 1. Khoảng biến thiên và khoảng tứ phân vị', lesson: 'a504e012-c01c-4b54-a26a-f068f99d4867' },
  { ten: 'Bài 2. Phương sai và độ lệch chuẩn', lesson: '6808ed8a-ffd1-4175-8862-704711f5d669' },
];

for (const b of BAI) {
  const dung = new Set();
  const chonRa = [];
  const thieu = [];

  const dsDang = [...new Set(kho.filter(q => q.lesson === b.ten).map(q => q.math_form))]
    .sort((x, y) => kho.filter(q => q.lesson === b.ten && q.math_form === x).length
                  - kho.filter(q => q.lesson === b.ten && q.math_form === y).length);

  const dungDuoc = (q, loai) => q.lesson === b.ten && q.question_type === loai
    && !dung.has(q.id) && !daDungLyThuyet.has(q.id)
    && String(q.correct_answer || '').trim()
    && (loai !== 'DS' || tachYDungSai(q));

  for (const [loai, muc, can] of HAN_NGACH) {
    let lay = 0, vong = 0;
    while (lay < can && vong < 50) {
      let them = 0;
      for (const dang of dsDang) {
        if (lay >= can) break;
        const ung = kho.filter(q => dungDuoc(q, loai) && String(q.difficulty) === muc && q.math_form === dang)
                       .sort((x, y) => (x.usage_count || 0) - (y.usage_count || 0));
        if (!ung.length) continue;
        dung.add(ung[0].id); chonRa.push(ung[0]); lay++; them++;
      }
      if (!them) break;
      vong++;
    }
  }

  /* Bù cho đủ TỔNG: phân bố mức là mong muốn, tổng số câu mỗi loại mới là hạn ngạch cứng. */
  for (const [loai, can] of Object.entries(TONG)) {
    let dang = chonRa.filter(q => q.question_type === loai).length;
    if (dang >= can) continue;
    const ung = kho.filter(q => dungDuoc(q, loai))
      .sort((x, y) => Math.abs(Number(x.difficulty) - MUC_MONG[loai]) - Math.abs(Number(y.difficulty) - MUC_MONG[loai])
                   || (x.usage_count || 0) - (y.usage_count || 0));
    for (const q of ung) { if (dang >= can) break; dung.add(q.id); chonRa.push(q); dang++; }
    if (dang < can) thieu.push(`${loai}: KHO CHỈ CÓ ${dang}/${can}`);
  }

  const thuTu = { NLC: 0, DS: 1, TLN: 2 };
  chonRa.sort((x, y) => thuTu[x.question_type] - thuTu[y.question_type]
                     || Number(x.difficulty) - Number(y.difficulty));

  const khoi = chonRa.map(khoiQuiz).filter(Boolean);
  const md = khoi.join('\n\n');
  const dem = (t) => chonRa.filter(q => q.question_type === t).length;
  const mucCua = (t) => [1, 2, 3, 4].map(m => chonRa.filter(q => q.question_type === t && Number(q.difficulty) === m).length).join('/');
  console.log(`${b.ten}: ${khoi.length} câu (NLC ${dem('NLC')} · DS ${dem('DS')} · TLN ${dem('TLN')})`);
  console.log(`   mức 1/2/3/4 →  NLC ${mucCua('NLC')} · DS ${mucCua('DS')} · TLN ${mucCua('TLN')}`);
  if (thieu.length) console.log(`   ⚠ ${thieu.join(' · ')}`);

  const { data: mods } = await sb.from('lesson_modules')
    .select('id,title,type,order_index,content_markdown').eq('lesson_id', b.lesson).order('order_index');
  const cu = (mods || []).find(m => m.title === TEN_MODULE);

  if (!GHI) { console.log(`   (thử) ${cu ? 'cập nhật ' + cu.id : 'tạo module mới'}`); continue; }

  mkdirSync(SAO_LUU, { recursive: true });
  if (cu) {
    const tep = `${SAO_LUU}/tuluyen-${cu.id}.md`;
    if (!existsSync(tep)) writeFileSync(tep, cu.content_markdown || '');
    const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', cu.id);
    console.log(error ? `   ✗ ${error.message}` : `   ✓ đã cập nhật ${cu.id}`);
  } else {
    const viTri = ((mods || []).find(m => m.type === 'theory')?.order_index ?? 1) + 1;
    for (const m of (mods || []).filter(m => m.order_index >= viTri)) {
      await sb.from('lesson_modules').update({ order_index: m.order_index + 1 }).eq('id', m.id);
    }
    const { error } = await sb.from('lesson_modules').insert({
      lesson_id: b.lesson, title: TEN_MODULE, type: 'practice',
      content_markdown: md, order_index: viTri,
    });
    console.log(error ? `   ✗ ${error.message}` : `   ✓ đã tạo module mới ở vị trí ${viTri}`);
  }
}
