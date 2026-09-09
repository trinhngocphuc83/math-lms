/**
 * Rót câu hỏi từ ngân hàng vào các mốc <!--QUIZ|dạng|số câu|mức--> của bản thảo lý thuyết,
 * rồi ghi vào app. Mặc định CHỈ THỬ; thêm tham số `ghi` mới ghi thật.
 *
 *   node scratch/soan-11c2.mjs          -> thử, in ra xem rót được gì
 *   node scratch/soan-11c2.mjs ghi      -> sao lưu rồi ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe } from './donDeCauHoi.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const NGAY = '20260909';
const SAO_LUU = `backups/soan-11c2-${NGAY}`;

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const kho = JSON.parse(readFileSync('scratch/kho-11c2.json', 'utf8'));


const BAI = [
  { tep: 'scratch/lt-11c2-bai1.md', ten: 'Bài 1. Dãy số' },
  { tep: 'scratch/lt-11c2-bai2.md', ten: 'Bài 2. Cấp số cộng' },
  { tep: 'scratch/lt-11c2-bai3.md', ten: 'Bài 3. Cấp số nhân' },
];

const daDung = new Set();


/** Chọn `soCau` câu của một dạng, ưu tiên mức đúng yêu cầu rồi tới câu ít dùng. */
function chonCau(tenBai, dang, soCau, mucUuTien) {
  const ungVien = kho.filter(q =>
    q.lesson === tenBai && q.math_form === dang &&
    ['NLC', 'TLN', 'DS'].includes(q.question_type) &&
    String(q.correct_answer || '').trim() &&
    (q.question_type !== 'DS' || tachYDungSai(q)) &&
    !daDung.has(q.id));

  /* Ưu tiên NLC và DS, để dành TLN cho bài tập tự luyện.
     Bài 1 chỉ có đúng 6 câu TLN trong kho, mà hạn ngạch tự luyện cần đủ 6 - bài giảng
     xài mất một câu là tự luyện hụt ngay, không có chỗ nào bù. */
  const diem = (q) => {
    const i = mucUuTien.indexOf(String(q.difficulty));
    const phatTLN = q.question_type === 'TLN' ? 100000 : 0;
    return phatTLN + (i < 0 ? 99 : i) * 1000 + (q.usage_count || 0);
  };
  const chon = ungVien.sort((a, b) => diem(a) - diem(b)).slice(0, soCau);
  for (const q of chon) daDung.add(q.id);
  return chon;
}

/** Dựng khối ```quiz``` theo đúng khuôn app đang đọc. */
function khoiQuiz(q) {
  const goc = { sourceQuestionId: q.id, maCauHoi: q.question_id };
  let d;
  if (q.question_type === 'NLC') {
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d];
    const idx = 'ABCD'.indexOf(String(q.correct_answer).trim().toUpperCase());
    if (idx < 0 || !opts[idx]) return null;
    d = { type: 'multiple_choice', question: donDe(q.content), options: opts, answerIndex: idx, ...goc };
  } else if (q.question_type === 'DS') {
    const t = tachYDungSai(q);
    if (!t) return null;
    d = { type: 'true_false_cluster', question: t.de, options: t.y, ...goc };
  } else {
    d = { type: 'short_answer', question: donDe(q.content), exactAnswer: String(q.correct_answer).trim(), ...goc };
  }
  if (q.image_url) d.imageUrl = q.image_url;
  return '```quiz\n' + JSON.stringify(d, null, 2) + '\n```';
}

const MOC = /<!--QUIZ\|([^|]+)\|(\d+)\|([^|]+)-->/g;
let tongRot = 0, tongHut = 0;

for (const b of BAI) {
  let md = readFileSync(b.tep, 'utf8');
  const thieu = [];

  md = md.replace(MOC, (_, dang, so, muc) => {
    const chon = chonCau(b.ten, dang.trim(), Number(so), muc.split(',').map(x => x.trim()));
    if (chon.length < Number(so)) thieu.push(`${dang.trim()} (xin ${so}, có ${chon.length})`);
    const khoi = chon.map(khoiQuiz).filter(Boolean);
    tongRot += khoi.length; tongHut += Number(so) - khoi.length;
    return khoi.join('\n\n');
  });

  writeFileSync(b.tep.replace('.md', '-day-du.md'), md);
  console.log(`${b.ten}: ${md.length} ký tự${thieu.length ? '  ⚠ hụt: ' + thieu.join(' · ') : ''}`);

  const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
  const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).ilike('title', '%DÃY SỐ%');
  const { data: ls } = await sb.from('lessons').select('id').eq('chapter_id', ch[0].id).eq('title', b.ten).maybeSingle();
  const { data: mod } = await sb.from('lesson_modules').select('id,content_markdown')
    .eq('lesson_id', ls.id).eq('type', 'theory').maybeSingle();

  if (!GHI) { console.log(`   (thử) sẽ ghi đè module ${mod.id}, bản cũ ${mod.content_markdown?.length || 0} ký tự`); continue; }

  mkdirSync(SAO_LUU, { recursive: true });
  /* Chỉ sao lưu LẦN ĐẦU. Chạy lại lần hai thì nội dung trong app đã là bản mình vừa ghi,
     lưu đè lên là mất sạch bản gốc của thầy - đúng thứ sao lưu sinh ra để giữ. */
  const tepLuu = `${SAO_LUU}/${mod.id}.md`;
  if (!existsSync(tepLuu)) writeFileSync(tepLuu, mod.content_markdown || '');
  else console.log('   (đã có bản sao lưu gốc, không ghi đè)');
  const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', mod.id);
  console.log(error ? `   ✗ ${error.message}` : `   ✓ đã ghi, sao lưu ở ${SAO_LUU}/${mod.id}.md`);
}

console.log(`\nRót được ${tongRot} câu · hụt ${tongHut}`);
