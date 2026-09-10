/**
 * Rót câu hỏi từ ngân hàng vào các mốc <!--QUIZ|dạng|số câu|mức--> của bản thảo lý thuyết
 * chương 3 lớp 12, rồi ghi vào app. Mặc định CHỈ THỬ; thêm `ghi` mới ghi thật.
 *
 *   node scratch/soan-12c3.mjs
 *   node scratch/soan-12c3.mjs ghi
 */
import { createClient } from '@supabase/supabase-js';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe } from './donDeCauHoi.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-12c3-20260910';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-12c3.json', 'utf8'));

const BAI = [
  { tep: 'scratch/lt-12c3-bai1.md', ten: 'Bài 1. Khoảng biến thiên và khoảng tứ phân vị',
    module: '83dc4d8b-7a22-405b-9db6-2e798f2e7c26' },
  { tep: 'scratch/lt-12c3-bai2.md', ten: 'Bài 2. Phương sai và độ lệch chuẩn',
    module: '46db0807-caca-406b-bea9-b320feabe905' },
];

const daDung = new Set();

/**
 * Chọn câu của một dạng.
 *
 * Ưu tiên NLC và DS, để dành TLN cho bài tập tự luyện: lớp 12 cần đủ 6 câu trả lời ngắn
 * mỗi bài, mà kho chương này chỉ có 29 và 16 câu - bài giảng xài trước là tự luyện hụt.
 */
function chonCau(tenBai, dang, soCau, mucUuTien) {
  const ungVien = kho.filter(q =>
    q.lesson === tenBai && q.math_form === dang &&
    ['NLC', 'TLN', 'DS'].includes(q.question_type) &&
    String(q.correct_answer || '').trim() &&
    (q.question_type !== 'DS' || tachYDungSai(q)) &&
    !daDung.has(q.id));

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

  if (!GHI) { console.log(`   (thử) sẽ ghi đè module ${b.module}`); continue; }

  const { data: cu } = await sb.from('lesson_modules')
    .select('content_markdown').eq('id', b.module).maybeSingle();
  mkdirSync(SAO_LUU, { recursive: true });
  const tepLuu = `${SAO_LUU}/${b.module}.md`;
  if (!existsSync(tepLuu)) writeFileSync(tepLuu, cu?.content_markdown || '');
  else console.log('   (đã có bản sao lưu gốc, không ghi đè)');
  const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', b.module);
  console.log(error ? `   ✗ ${error.message}` : `   ✓ đã ghi, sao lưu ở ${tepLuu}`);
}

console.log(`\nRót được ${tongRot} câu · hụt ${tongHut}`);
