/**
 * Gộp cây Lớp 8 › Chương 2 (Hằng đẳng thức) về một cây theo SGK KNTT (thầy chốt 12/9/2026):
 *   Bài 1. Hiệu 2 bình phương. Bình phương của một tổng hay một hiệu
 *   Bài 2. Lập phương của một tổng hay một hiệu
 *   Bài 3. Tổng và hiệu 2 lập phương
 *   Bài 4. Phân tích đa thức thành nhân tử
 *
 * - 262 câu của "Bài 1. Những hằng đẳng thức đáng nhớ" (cây cũ) chia về Bài 1/2/3 theo hằng
 *   đẳng thức câu dùng: máy phân sơ bộ bằng mẫu chữ (scratch/hdt8-phan.json), rồi tôi đọc
 *   từng câu ở hai nhóm B2/B3 và nhóm B1 có "^3" để sửa tay (bảng SUA_TAY).
 * - Tên dạng cũ đổi sang tên dạng đã có ở cây mới (bảng DANG); "Toán tổng hợp" tạo dòng mới.
 * - 97 câu của "Bài 2. Phân tích đa thức thành nhân tử" (cũ) -> "Bài 4. …": giữ 10 dạng theo
 *   phương pháp phân tích (đặt nhân tử chung, dùng hằng đẳng thức, nhóm…), xoá 8 dạng chung
 *   chung rỗng đang treo ở Bài 4.
 * - Sửa "thoã" -> "thoả"; tên bài "HIệu" trong khoá học -> "Hiệu".
 *
 *   node scratch/gop-hdt-lop8-20260912.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const thuMuc = `backups/gop-hdt-lop8-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

const TOPIC = 'Chương 2. Hằng đẳng thức đáng nhớ và ứng dụng';
const BAI = {
  B1: 'Bài 1. Hiệu 2 bình phương. Bình phương của một tổng hay một hiệu',
  B2: 'Bài 2. Lập phương của một tổng hay một hiệu',
  B3: 'Bài 3. Tổng và hiệu 2 lập phương',
  B4: 'Bài 4. Phân tích đa thức thành nhân tử',
};
/* Sửa tay sau khi đọc: 4 ký tự cuối mã câu -> bài */
const SUA_TAY = {
  // máy xếp B3, thực ra là lập phương của một tổng/hiệu
  '1haq': 'B2', q2fk: 'B2', vn6j: 'B2', fwdm: 'B2', v8ur: 'B2', tpwu: 'B2', fbtk: 'B2', qp60: 'B2', aq1k: 'B2',
  '0arv': 'B2', tli9: 'B2', y7ru: 'B2', apy4: 'B2', i3ok: 'B2',
  // máy xếp B3, thực ra là bình phương / hiệu hai bình phương
  '9xat': 'B1', '0rth': 'B1', vv1u: 'B1',
  // máy xếp B2, thực ra là bình phương
  yspw: 'B1', '4xig': 'B1', ko3k: 'B1', qoja: 'B1',
  // máy xếp B2, có cả tổng/hiệu lập phương
  r60b: 'B3', bu65: 'B3',
  // máy xếp B1, thực ra tổng/hiệu hai lập phương
  '3t6g': 'B3', ys5i: 'B3', x1hd: 'B3', '8817': 'B3', ugai: 'B3', '6u3w': 'B3', '19pa': 'B3', e3wb: 'B3', r9lm: 'B3', z6u8: 'B3',
  // máy xếp B1, thực ra lập phương của một tổng/hiệu
  uqn5: 'B2', j9dq: 'B2', ozon: 'B2', j96b: 'B2', '2mbl': 'B2',
};
const DANG = {
  'Rút gọn và tính giá trị biểu thức': 'Rút gọn và tính giá trị của biểu thức',
  'Tính giá trị biểu thức': 'Rút gọn và tính giá trị của biểu thức',
  'Chứng minh giá trị biểu thức không phụ thuộc vào biến': 'Chứng minh giá trị của biểu thức không phụ thuộc vào các biến',
  'Chứng minh chia hết': 'Chứng minh chia hết',
  'Tìm x': 'Tìm x thoả mãn đẳng thức',
  'Chứng minh giá trị biểu thức luôn dương hoặc luôn âm với mọi x': 'Chứng minh giá trị của một biểu thức luôn dương (hay âm) với mọi giá trị của biến',
  'Vận dụng hằng đẳng thức để tính': 'Vận dụng hằng đẳng thức để tính',
  'Toán tổng hợp': 'Toán tổng hợp',
  'Tìm Min-Max': 'Tìm giá trị nhỏ nhất, lớn nhất',
  'Chứng minh đẳng thức': 'Chứng minh đẳng thức',
};

const phan = JSON.parse(readFileSync('scratch/hdt8-phan.json', 'utf8'));
const saoLuu = { questions: [], question_categories: [], lessons: [] };
const nhatKy = [];

/* 0. thoã -> thoả */
const { data: dmThoa } = await sb.from('question_categories').select('*').ilike('math_form', '%thoã%');
const { data: cauThoa } = await sb.from('questions').select('*').ilike('math_form', '%thoã%');
nhatKy.push(`thoã -> thoả: ${cauThoa.length} câu, ${dmThoa.length} dạng`);
if (GHI) {
  saoLuu.question_categories.push(...dmThoa); saoLuu.questions.push(...cauThoa);
  for (const d of dmThoa) await sb.from('question_categories').update({ math_form: d.math_form.replace(/thoã/g, 'thoả') }).eq('id', d.id);
  for (const q of cauThoa) await sb.from('questions').update({ math_form: q.math_form.replace(/thoã/g, 'thoả') }).eq('id', q.id);
}

/* 1. 262 câu cây cũ */
const { data: dmMoi } = await sb.from('question_categories').select('*').eq('grade', '8').eq('topic', TOPIC);
const coDang = (lesson, mf) => dmMoi.some(d => d.lesson === lesson && d.math_form.replace(/thoã/g, 'thoả') === mf);
const { data: cauCu } = await sb.from('questions').select('*').eq('grade', '8').eq('lesson', 'Bài 1. Những hằng đẳng thức đáng nhớ');
const dem = {};
const thieuDang = new Set();
for (const q of cauCu) {
  const p = phan.find(x => x.id === q.id);
  const bai = SUA_TAY[q.question_id.slice(-4)] || p?.phan || 'B1';
  const lesson = BAI[bai];
  const mf = DANG[q.math_form];
  if (!mf) { console.log('  ✗ dạng chưa có bảng đổi:', q.math_form); continue; }
  dem[`${bai} · ${mf}`] = (dem[`${bai} · ${mf}`] || 0) + 1;
  if (!coDang(lesson, mf)) thieuDang.add(`${lesson}||${mf}`);
  if (GHI) {
    saoLuu.questions.push(q);
    const { error } = await sb.from('questions').update({ lesson, math_form: mf }).eq('id', q.id);
    if (error) console.log('  ✗', q.question_id, error.message);
  }
}
for (const [k, n] of Object.entries(dem).sort()) nhatKy.push(`  ${String(n).padStart(3)}  ${k}`);
/* dạng chưa có ở bài đích (Toán tổng hợp): tạo dòng, lấy yêu cầu từ dòng cũ */
const { data: dmCu } = await sb.from('question_categories').select('*').eq('grade', '8').eq('lesson', 'Bài 1. Những hằng đẳng thức đáng nhớ');
for (const k of thieuDang) {
  const [lesson, mf] = k.split('||');
  const goc = dmCu.find(d => DANG[d.math_form] === mf);
  nhatKy.push(`tạo dạng: ${lesson.slice(0, 30)} / ${mf}`);
  if (GHI) await sb.from('question_categories').insert({ grade: '8', subject: 'Đại số', topic: TOPIC, lesson, math_form: mf,
    yeu_cau_can_dat: /tổng hợp/i.test(mf) ? 'Vận dụng tổng hợp các hằng đẳng thức đáng nhớ để giải các bài toán rút gọn, tính giá trị, chứng minh và tìm giá trị lớn nhất, nhỏ nhất.' : goc?.yeu_cau_can_dat || null });
}
nhatKy.push(`xoá ${dmCu.length} dòng danh mục cũ của "Bài 1. Những hằng đẳng thức đáng nhớ"`);
if (GHI) { saoLuu.question_categories.push(...dmCu); await sb.from('question_categories').delete().eq('grade', '8').eq('lesson', 'Bài 1. Những hằng đẳng thức đáng nhớ'); }

/* 2. phân tích đa thức: Bài 2 (cũ) -> Bài 4, xoá 8 dạng chung chung rỗng của Bài 4 */
const { data: dmB4Rong } = await sb.from('question_categories').select('*').eq('grade', '8').eq('lesson', BAI.B4);
const { data: cauB2Cu } = await sb.from('questions').select('*').eq('grade', '8').eq('lesson', 'Bài 2. Phân tích đa thức thành nhân tử');
const { data: dmB2Cu } = await sb.from('question_categories').select('*').eq('grade', '8').eq('lesson', 'Bài 2. Phân tích đa thức thành nhân tử');
nhatKy.push(`phân tích đa thức: ${cauB2Cu.length} câu, ${dmB2Cu.length} dạng -> Bài 4; xoá ${dmB4Rong.length} dạng rỗng của Bài 4`);
if (GHI) {
  saoLuu.question_categories.push(...dmB4Rong, ...dmB2Cu); saoLuu.questions.push(...cauB2Cu);
  for (const d of dmB4Rong) await sb.from('question_categories').delete().eq('id', d.id);
  for (const d of dmB2Cu) await sb.from('question_categories').update({ lesson: BAI.B4 }).eq('id', d.id);
  for (const q of cauB2Cu) await sb.from('questions').update({ lesson: BAI.B4 }).eq('id', q.id);
}

/* 3. tên bài trong khoá học */
const { data: kh } = await sb.from('courses').select('id').ilike('title', '%TOÁN 8 %');
const { data: ch } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).ilike('title', '%Hằng%');
const { data: ls } = await sb.from('lessons').select('id,title').eq('chapter_id', ch[0].id).ilike('title', 'Bài 1. HIệu%');
for (const l of ls) { nhatKy.push(`khoá học: "${l.title}" -> "${BAI.B1}"`); if (GHI) { saoLuu.lessons.push(l); await sb.from('lessons').update({ title: BAI.B1 }).eq('id', l.id); } }

for (const d of nhatKy) console.log(d);
if (GHI) { mkdirSync(thuMuc, { recursive: true }); writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify(saoLuu, null, 1)); console.log(`✓ đã ghi · sao lưu ${thuMuc}/`); }
else console.log('Thêm "ghi" để ghi thật.');
