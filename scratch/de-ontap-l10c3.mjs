/**
 * Dựng NĂM ĐỀ ÔN TẬP cuối chương 3 lớp 10, theo khuôn 3-2-2-3 của app:
 *   12 NLC (0,25đ) + 2 DS (1đ) + 4 TLN (0,5đ) + 3 TL (1đ) = 21 câu, 10 điểm.
 *
 * Rút xoay vòng THEO BÀI trước rồi mới tới dạng, bài ít câu xếp trước. Đề nhắm mức 7+.
 * Không lấy lại câu đã nằm trong bài giảng hay bài tập tự luyện của chương.
 *
 *   node scratch/de-ontap-l10c3.mjs        -> thử
 *   node scratch/de-ontap-l10c3.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tachYDungSai } from './tachDungSai.mjs';
import { khoiQuiz } from './tu-luyen-l10c3.mjs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-l10c3-20260915';
const TEN_BAI = 'Cuối chương 3';
const SO_DE = 5;

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-l10c3.json', 'utf8'));

const { data: kh } = await sb.from('courses').select('id').ilike('title', '%TOÁN 10%');
const daDungNoiKhac = new Set();
{
  const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).ilike('title', '%Hệ thức lượng%');
  const { data: ls } = await sb.from('lessons').select('id').eq('chapter_id', ch[0].id);
  const { data: mods } = await sb.from('lesson_modules').select('content_markdown')
    .in('lesson_id', (ls || []).map(x => x.id));
  for (const m of mods || []) for (const x of (m.content_markdown || '').matchAll(/"sourceQuestionId":\s*"([^"]+)"/g)) daDungNoiKhac.add(x[1]);
}
console.log(`Đã dùng ở bài giảng + tự luyện: ${daDungNoiKhac.size} câu\n`);

/** Khuôn 3-2-2-3, kèm mức mong muốn cho từng chỗ trong đề. */
const KHUON = [
  ...Array(3).fill(['NLC', 1]), ...Array(6).fill(['NLC', 2]), ...Array(3).fill(['NLC', 3]),
  ['DS', 3], ['DS', 3],
  ['TLN', 2], ['TLN', 3], ['TLN', 3], ['TLN', 4],
  ['TL', 3], ['TL', 3], ['TL', 4],
];

const BAI = ['Bài 1. Giá trị lượng giác của một góc từ 0° đến 180°', 'Bài 2. Hệ thức lượng trong tam giác', 'Bài 3. Ôn tập chương']
  .sort((a, b) => kho.filter(q => q.lesson === a).length - kho.filter(q => q.lesson === b).length);

const daVaoDe = new Set();
let soDungLai = 0;
const deRa = [];

for (let d = 0; d < SO_DE; d++) {
  const trongDe = new Set();
  const cau = [];
  let iBai = d % BAI.length;

  for (const [loai, mucMong] of KHUON) {
    let chon = null;
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
  const theoBai = BAI.map(b => `${b.slice(0, 5)}:${cau.filter(q => q.lesson === b).length}`).join(' ');
  const mucTB = (cau.reduce((s, q) => s + Number(q.difficulty), 0) / cau.length).toFixed(2);
  console.log(`ĐỀ ${d + 1}: ${cau.length} câu (NLC ${dem('NLC')} · DS ${dem('DS')} · TLN ${dem('TLN')} · TL ${dem('TL')}) · ${theoBai} · mức TB ${mucTB}`);
  deRa.push({ ten: `ĐỀ ${d + 1}`, md: cau.map(khoiQuiz).filter(Boolean).join('\n\n') });
}

console.log(`\nCâu phải dùng lại vì kho hết câu mới: ${soDungLai}`);

if (!GHI) { console.log('(thử - chưa ghi)'); process.exit(0); }

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
