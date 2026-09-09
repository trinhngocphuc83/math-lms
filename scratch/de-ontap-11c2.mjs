/**
 * Dựng NĂM ĐỀ ÔN TẬP cuối chương 2 lớp 11, theo khuôn 3-2-2-3 của app:
 *   12 NLC (0,25đ) + 2 DS (1đ) + 4 TLN (0,5đ) + 3 TL (1đ) = 21 câu, 10 điểm.
 *
 * Rút xoay vòng THEO BÀI trước rồi mới tới dạng, bài ít câu xếp trước - làm ngược lại thì
 * đề dồn hết vào bài nhiều dạng nhất.
 *
 * Đề nhắm mức 7+: nhiều câu mức 2-3, vài câu mức 4.
 *
 *   node scratch/de-ontap-11c2.mjs        -> thử
 *   node scratch/de-ontap-11c2.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe } from './donDeCauHoi.mjs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-11c2-20260909';
const TEN_BAI = 'Cuối chương 2';
const SO_DE = 5;

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-11c2.json', 'utf8'));

/* Câu đã nằm trong bài giảng hoặc bài tập tự luyện của chương. */
const daDungNoiKhac = new Set();
for (const t of ['1', '2', '3']) {
  const tep = `scratch/lt-11c2-bai${t}-day-du.md`;
  if (existsSync(tep)) for (const m of readFileSync(tep, 'utf8').matchAll(/"sourceQuestionId": "([^"]+)"/g)) daDungNoiKhac.add(m[1]);
}
{
  const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
  const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).ilike('title', '%DÃY SỐ%');
  const { data: ls } = await sb.from('lessons').select('id').eq('chapter_id', ch[0].id);
  const { data: mods } = await sb.from('lesson_modules').select('content_markdown')
    .in('lesson_id', (ls || []).map(x => x.id));
  for (const m of mods || []) for (const x of (m.content_markdown || '').matchAll(/"sourceQuestionId":\s*"([^"]+)"/g)) daDungNoiKhac.add(x[1]);
}
console.log(`Đã dùng ở bài giảng + tự luyện: ${daDungNoiKhac.size} câu\n`);

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

/** Khuôn 3-2-2-3, kèm mức mong muốn cho từng chỗ trong đề. */
const KHUON = [
  ...Array(3).fill(['NLC', 1]), ...Array(6).fill(['NLC', 2]), ...Array(3).fill(['NLC', 3]),
  ['DS', 3], ['DS', 3],
  ['TLN', 2], ['TLN', 3], ['TLN', 3], ['TLN', 4],
  ['TL', 3], ['TL', 3], ['TL', 4],
];

/* Bài ít câu xếp trước để đề không dồn hết vào bài đông câu. */
const BAI = ['Bài 1. Dãy số', 'Bài 2. Cấp số cộng', 'Bài 3. Cấp số nhân']
  .sort((a, b) => kho.filter(q => q.lesson === a).length - kho.filter(q => q.lesson === b).length);

const daVaoDe = new Set();
let soDungLai = 0;
const deRa = [];

for (let d = 0; d < SO_DE; d++) {
  const trongDe = new Set();
  const cau = [];
  let iBai = d % BAI.length;          // mỗi đề bắt đầu từ một bài khác nhau

  for (const [loai, mucMong] of KHUON) {
    let chon = null;
    /* Đi vòng qua các bài, bắt đầu từ chỗ lần trước dừng - đó là cách giữ cho đề trải đều. */
    for (let b = 0; b < BAI.length && !chon; b++) {
      const bai = BAI[(iBai + b) % BAI.length];
      const ung = kho.filter(q => q.lesson === bai && q.question_type === loai
          && !trongDe.has(q.id) && !daVaoDe.has(q.id) && !daDungNoiKhac.has(q.id)
          && (loai === 'TL' || String(q.correct_answer || '').trim())
          && (loai !== 'DS' || tachYDungSai(q)))
        .sort((x, y) => Math.abs(Number(x.difficulty) - mucMong) - Math.abs(Number(y.difficulty) - mucMong)
                     || (x.usage_count || 0) - (y.usage_count || 0));
      if (ung.length) { chon = ung[0]; iBai = (iBai + b + 1) % BAI.length; }
    }

    /* HẾT CÂU MỚI thì mới dùng lại. Kho chương này chỉ có 35 câu trả lời ngắn dùng được,
       mà riêng năm đề đã cần 20 câu, cộng với 18 câu đã vào bài tập tự luyện. Thà dùng lại
       và NÓI RA còn hơn để đề thiếu câu, hoặc lặng lẽ đổi khuôn đề. */
    if (!chon) {
      const ung = kho.filter(q => q.question_type === loai && !trongDe.has(q.id)
          && (loai === 'TL' || String(q.correct_answer || '').trim())
          && (loai !== 'DS' || tachYDungSai(q)))
        .sort((x, y) => (daVaoDe.has(x.id) ? 1 : 0) - (daVaoDe.has(y.id) ? 1 : 0)
                     || Math.abs(Number(x.difficulty) - mucMong) - Math.abs(Number(y.difficulty) - mucMong));
      if (ung.length) { chon = ung[0]; soDungLai++; }
    }
    if (!chon) continue;
    trongDe.add(chon.id); daVaoDe.add(chon.id); cau.push(chon);
  }

  const dem = (t) => cau.filter(q => q.question_type === t).length;
  const theoBai = BAI.map(b => `${b.slice(0, 6)}:${cau.filter(q => q.lesson === b).length}`).join(' ');
  console.log(`ĐỀ ${d + 1}: ${cau.length} câu (NLC ${dem('NLC')} · DS ${dem('DS')} · TLN ${dem('TLN')} · TL ${dem('TL')}) · ${theoBai}`);
  deRa.push({ ten: `ĐỀ ${d + 1}`, md: cau.map(khoiQuiz).filter(Boolean).join('\n\n') });
}

console.log(`\nCâu phải dùng lại vì kho hết câu mới: ${soDungLai}`);

if (!GHI) { console.log('(thử - chưa ghi)'); process.exit(0); }

const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
const { data: chOn } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).eq('loai', 'on-tap').maybeSingle();
let { data: bai } = await sb.from('lessons').select('id').eq('chapter_id', chOn.id).eq('title', TEN_BAI).maybeSingle();
if (!bai) {
  const { data: het } = await sb.from('lessons').select('order_index').eq('chapter_id', chOn.id).order('order_index', { ascending: false }).limit(1);
  const { data: moi, error } = await sb.from('lessons')
    .insert({ chapter_id: chOn.id, title: TEN_BAI, order_index: (het?.[0]?.order_index || 0) + 1 })
    .select('id').maybeSingle();
  if (error) { console.error(error.message); process.exit(1); }
  bai = moi;
  console.log(`Đã tạo bài "${TEN_BAI}" (${bai.id})`);
}

mkdirSync(SAO_LUU, { recursive: true });
for (let i = 0; i < deRa.length; i++) {
  const { data: cu } = await sb.from('lesson_modules').select('id,content_markdown')
    .eq('lesson_id', bai.id).eq('title', deRa[i].ten).maybeSingle();
  if (cu) {
    const tep = `${SAO_LUU}/de-${cu.id}.md`;
    if (!existsSync(tep)) writeFileSync(tep, cu.content_markdown || '');
    const { error } = await sb.from('lesson_modules').update({ content_markdown: deRa[i].md }).eq('id', cu.id);
    console.log(error ? `   ✗ ${deRa[i].ten}: ${error.message}` : `   ✓ cập nhật ${deRa[i].ten}`);
  } else {
    const { error } = await sb.from('lesson_modules').insert({
      lesson_id: bai.id, title: deRa[i].ten, type: 'practice',
      content_markdown: deRa[i].md, order_index: i + 1,
    });
    console.log(error ? `   ✗ ${deRa[i].ten}: ${error.message}` : `   ✓ tạo ${deRa[i].ten}`);
  }
}
