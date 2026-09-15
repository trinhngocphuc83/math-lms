/**
 * Rót câu hỏi từ kho vào các mốc <!--QUIZ|dạng|số câu|mức[|regex lọc đề]--> của bản thảo
 * lý thuyết chương 3 lớp 10, rồi ghi vào app (cả content_markdown lẫn presentation_markdown -
 * màn chiếu ưu tiên bản trình chiếu). Mặc định CHỈ THỬ; thêm `ghi` mới ghi thật.
 *
 *   node scratch/soan-l10c3.mjs
 *   node scratch/soan-l10c3.mjs ghi
 *
 * Khác bản 12c3: (1) mốc có thêm regex lọc đề để một dạng kho tách được thành hai mục bài
 * giảng (kho gộp "tính giá trị còn lại" và "rút gọn, chứng minh" vào một dạng); (2) khối quiz
 * mang sẵn phuong_phap_giai + cac_buoc_thuc_hien tách từ explanation của kho, khỏi phải vá
 * sau; (3) ưu tiên NLC cho bài giảng, DS/TLN để dành cho tự luyện và đề.
 */
import { createClient } from '@supabase/supabase-js';
import { tachYDungSai } from './tachDungSai.mjs';
import { donDe, xuongDong } from './donDeCauHoi.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-l10c3-20260915';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-l10c3.json', 'utf8'));

const BAI = [
  { tep: 'scratch/lt-l10c3-bai1.md', ten: 'Bài 1. Giá trị lượng giác của một góc từ 0° đến 180°',
    module: '180ff14b-1a8a-474d-8340-c513eb1982ed' },
  { tep: 'scratch/lt-l10c3-bai2.md', ten: 'Bài 2. Hệ thức lượng trong tam giác',
    module: 'acd97216-75b9-44bc-9715-c942ca2a946d' },
];

const daDung = new Set();

/** Đề có ảnh thì phải rộng đủ; câu trong kho chương này có ảnh đều cắt ≥ 600 px, còn lại không ảnh. */
function chonCau(tenBai, dang, soCau, mucUuTien, locDe) {
  const re = locDe ? new RegExp(locDe, 'i') : null;
  const ungVien = kho.filter(q =>
    q.lesson === tenBai && q.math_form === dang &&
    ['NLC', 'TLN', 'DS'].includes(q.question_type) &&
    String(q.correct_answer || '').trim() &&
    (q.question_type !== 'DS' || tachYDungSai(q)) &&
    (!re || re.test(String(q.content).replace(/\\/g, ''))) &&
    !daDung.has(q.id));

  /* Ưu tiên: NLC trước (bài giảng cần câu chọn nhanh), mức đúng thứ tự mốc, rồi ít dùng. */
  const diem = (q) => {
    const i = mucUuTien.indexOf(String(q.difficulty));
    const loai = q.question_type === 'NLC' ? 0 : q.question_type === 'TLN' ? 1 : 2;
    return loai * 100000 + (i < 0 ? 99 : i) * 1000 + (q.usage_count || 0);
  };
  const chon = ungVien.sort((a, b) => diem(a) - diem(b)).slice(0, soCau);
  /* Xếp lại từ dễ đến khó trong mục */
  chon.sort((a, b) => Number(a.difficulty) - Number(b.difficulty));
  for (const q of chon) daDung.add(q.id);
  return chon;
}

/** Tách "Phương pháp giải:\n…\n\nLời giải:\n…" thành phương pháp + các bước (khuôn của va-giao-an). */
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

/** Dựng khối ```quiz``` theo đúng khuôn app đang đọc. */
function khoiQuiz(q) {
  const goc = { sourceQuestionId: q.id, maCauHoi: q.question_id };
  let d;
  if (q.question_type === 'NLC') {
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d];
    const idx = 'ABCD'.indexOf(String(q.correct_answer).trim().toUpperCase());
    if (idx < 0 || !opts[idx]) return null;
    d = { type: 'multiple_choice', question: donDe(q.content), options: opts, answerIndex: idx };
  } else if (q.question_type === 'DS') {
    const t = tachYDungSai(q);
    if (!t) return null;
    d = { type: 'true_false_cluster', question: t.de, options: t.y };
  } else {
    d = { type: 'short_answer', question: donDe(q.content), exactAnswer: String(q.correct_answer).trim() };
  }
  /* Màn chiếu bày CẢ `answer` lẫn phương pháp + từng bước: để cả ba là lời giải hiện hai
     lần. Trắc nghiệm giữ phương pháp + bước; chỉ khi không tách được mới để `answer`. */
  const g = tachLoiGiai(q.explanation);
  if (g && (g.phuongPhap || g.buoc.length)) {
    if (g.phuongPhap) d.phuong_phap_giai = g.phuongPhap;
    if (g.buoc.length) d.cac_buoc_thuc_hien = g.buoc;
  } else if (xuongDong(q.explanation)) d.answer = xuongDong(q.explanation);
  return '```quiz\n' + JSON.stringify({ ...d, ...goc }, null, 2) + '\n```';
}

const MOC = /<!--QUIZ\|([^|]+)\|(\d+)\|([^|]+?)(?:\|(.+?))?-->/g;
let tongRot = 0, tongHut = 0;

for (const b of BAI) {
  let md = readFileSync(b.tep, 'utf8');
  const thieu = [];

  md = md.replace(MOC, (_, dang, so, muc, loc) => {
    const chon = chonCau(b.ten, dang.trim(), Number(so), muc.split(',').map(x => x.trim()), loc);
    if (chon.length < Number(so)) thieu.push(`${dang.trim()} (xin ${so}, có ${chon.length})`);
    const khoi = chon.map(khoiQuiz).filter(Boolean);
    tongRot += khoi.length; tongHut += Number(so) - khoi.length;
    console.log(`   ${dang.trim().slice(0, 40)}${loc ? ' [lọc]' : ''}: ${chon.map(q => q.question_type + q.difficulty + ' ' + donDe(q.content).slice(0, 50).replace(/\n/g, ' ')).join(' · ')}`);
    return khoi.join('\n\n');
  });

  writeFileSync(b.tep.replace('.md', '-day-du.md'), md);
  console.log(`${b.ten}: ${md.length} ký tự${thieu.length ? '  ⚠ hụt: ' + thieu.join(' · ') : ''}\n`);

  if (!GHI) { console.log(`   (thử) sẽ ghi đè module ${b.module}\n`); continue; }

  const { data: cu } = await sb.from('lesson_modules')
    .select('content_markdown,presentation_markdown').eq('id', b.module).maybeSingle();
  mkdirSync(SAO_LUU, { recursive: true });
  const tepLuu = `${SAO_LUU}/${b.module}.md`;
  if (!existsSync(tepLuu)) writeFileSync(tepLuu, (cu?.content_markdown || '') + '\n\n=====PRESENTATION=====\n\n' + (cu?.presentation_markdown || ''));
  const { error } = await sb.from('lesson_modules')
    .update({ content_markdown: md, presentation_markdown: md }).eq('id', b.module);
  console.log(error ? `   ✗ ${error.message}` : `   ✓ đã ghi, sao lưu ở ${tepLuu}\n`);
}

console.log(`Rót được ${tongRot} câu · hụt ${tongHut}`);
