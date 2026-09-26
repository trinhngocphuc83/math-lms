/**
 * Dựng 2 đề ôn tập Chương 2 Toán 10 cho khu Ôn tập & Kiểm tra, theo ma trận điểm 3-2-2-3:
 *
 *   Phần I   12 câu trắc nghiệm nhiều lựa chọn  x 0,25 = 3,0 điểm
 *   Phần II   2 câu Đúng/Sai                    x 1,00 = 2,0 điểm
 *   Phần III  4 câu trả lời ngắn                x 0,50 = 2,0 điểm
 *   Phần IV   2 bài tự luận                     x 1,50 = 3,0 điểm
 *
 * Mức độ nhắm HỌC SINH TRUNG BÌNH: nhận biết và thông hiểu là chính, mỗi đề chỉ chừa
 * một hai câu vận dụng để phân loại. Hai đề KHÔNG trùng câu nào.
 *
 *   node --experimental-strip-types scratch/de-on-t10c2.mjs        (chỉ xem)
 *   node --experimental-strip-types scratch/de-on-t10c2.mjs --ghi  (ghi vào app)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { khoiTuCau, khoiMd } from '../.claude/skills/giao-an-tu-luan/scripts/_chung.mjs';

const GHI = process.argv.includes('--ghi');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const KHOI = 'TOÁN 10 (CƠ BẢN)';
const CHUONG = 'Chương 2. Bất phương trình và hệ bất phương trình bậc nhất hai ẩn';
const TEN_HINH_THUC = 'Ôn tập chương 2';

/* Số câu và mức cho từng phần: [số câu, các mức được phép theo thứ tự ưu tiên] */
const KHUON = [
  { ma: 'NLC', ten: 'PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN', diem: 0.25, so: 12, muc: ['1', '1', '1', '1', '1', '1', '2', '2', '2', '2', '2', '3'],
    dan: 'Mỗi câu chọn MỘT phương án đúng. Mỗi câu đúng được 0,25 điểm.' },
  { ma: 'DS', ten: 'PHẦN II. TRẮC NGHIỆM ĐÚNG/SAI', diem: 1, so: 2, muc: ['2', '2'],
    dan: 'Mỗi câu có 4 ý a), b), c), d); với mỗi ý chọn Đúng hoặc Sai. Mỗi câu 1,0 điểm.' },
  { ma: 'TLN', ten: 'PHẦN III. TRẢ LỜI NGẮN', diem: 0.5, so: 4, muc: ['2', '2', '2', '3'],
    dan: 'Ghi đáp số vào ô trả lời. Mỗi câu đúng được 0,5 điểm.' },
  { ma: 'TL', ten: 'PHẦN IV. TỰ LUẬN', diem: 1.5, so: 2, muc: ['2', '3'],
    dan: 'Trình bày lời giải đầy đủ. Mỗi bài 1,5 điểm.' },
];

const { data: kho } = await sb.from('questions')
  .select('*').eq('grade', '10').eq('topic', CHUONG);
console.log(`Kho chương: ${kho.length} câu`);

/* Trộn nhẹ nhưng ổn định: ưu tiên câu ÍT DÙNG nhất để kho được dùng đều, giống cách
   trang Quản lý Đề thi tự rút câu. */
const conLai = new Map();
for (const q of kho) {
  const k = `${q.question_type}·${q.difficulty}`;
  if (!conLai.has(k)) conLai.set(k, []);
  conLai.get(k).push(q);
}
for (const ds of conLai.values()) ds.sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0) || String(a.question_id).localeCompare(String(b.question_id)));

/** Lấy một câu loại `ma`, mức `muc`; hết mức ấy thì lùi sang mức gần nhất. */
function lay(ma, muc) {
  const thu = [muc, ...['1', '2', '3', '4'].filter((m) => m !== muc)];
  for (const m of thu) {
    const ds = conLai.get(`${ma}·${m}`);
    if (ds?.length) return ds.shift();
  }
  return null;
}

const TEN_MUC = { 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng', 4: 'Vận dụng cao' };

function dungDe(soDe) {
  const ra = [`## 📝 ĐỀ ÔN TẬP CHƯƠNG 2 — ĐỀ ${soDe}`, '',
    '**Bất phương trình và hệ bất phương trình bậc nhất hai ẩn · Thời gian 90 phút · 10 điểm**', ''];
  const thongKe = [];
  for (const p of KHUON) {
    const cau = [];
    for (const m of p.muc) { const q = lay(p.ma, m); if (q) cau.push(q); }
    if (!cau.length) continue;
    ra.push('---', '', `### ${p.ten} *(${(p.diem * cau.length).toFixed(1).replace('.', ',')} điểm)*`, '', `*${p.dan}*`, '');
    cau.forEach((q, i) => {
      const k = khoiTuCau(q);
      /* App TỰ đánh số câu ("Câu 2 / 20") ở cả màn chiếu lẫn màn học sinh làm bài, nên
         không ghi lại số vào đề - ghi nữa thì hiện hai lần. Chỉ giữ số điểm của bài tự
         luận, vì cái đó app không tự biết. Số thập phân viết kiểu Việt: 1,5. */
      const nhan = p.ma === 'TL' ? `*(${String(p.diem).replace('.', ',')} điểm)* ` : '';
      k.question = nhan + k.question;
      ra.push(khoiMd(k), '');
    });
    thongKe.push(`${p.ma} ${cau.length} câu (${cau.map((q) => TEN_MUC[q.difficulty]?.[0] || '?').join('')})`);
  }
  return { md: ra.join('\n').trim() + '\n', thongKe };
}

mkdirSync('scratch/de-t10c2', { recursive: true });
const de = [1, 2].map((n) => {
  const { md, thongKe } = dungDe(n);
  writeFileSync(`scratch/de-t10c2/de-${n}.md`, md);
  console.log(`ĐỀ ${n}: ${thongKe.join(' · ')} — ${md.length} kí tự`);
  return { n, md };
});

if (!GHI) { console.log('\n(chỉ xem — thêm --ghi để tạo trong app)'); process.exit(0); }

/* ---- Ghi vào khu Ôn tập & Kiểm tra: chapters(loai='on-tap') → lessons → lesson_modules ---- */
const { data: khoa } = await sb.from('courses').select('id,title').eq('title', KHOI).single();
let { data: ch } = await sb.from('chapters').select('id').eq('course_id', khoa.id).eq('loai', 'on-tap').limit(1);
let chuongId = ch?.[0]?.id;
if (!chuongId) {
  const { data: max } = await sb.from('chapters').select('order_index').eq('course_id', khoa.id).order('order_index', { ascending: false }).limit(1);
  const { data, error } = await sb.from('chapters').insert([{ course_id: khoa.id, title: 'Ôn tập & Kiểm tra', loai: 'on-tap', order_index: (max?.[0]?.order_index || 0) + 1 }]).select('id').single();
  if (error) throw error;
  chuongId = data.id;
  console.log('đã tạo hộp Ôn tập & Kiểm tra cho khối');
}

let { data: ht } = await sb.from('lessons').select('id').eq('chapter_id', chuongId).eq('title', TEN_HINH_THUC).limit(1);
let htId = ht?.[0]?.id;
if (!htId) {
  const { data: max } = await sb.from('lessons').select('order_index').eq('chapter_id', chuongId).order('order_index', { ascending: false }).limit(1);
  const { data, error } = await sb.from('lessons').insert([{ chapter_id: chuongId, title: TEN_HINH_THUC, order_index: (max?.[0]?.order_index || 0) + 1 }]).select('id').single();
  if (error) throw error;
  htId = data.id;
  console.log(`đã tạo hình thức "${TEN_HINH_THUC}"`);
}

for (const d of de) {
  const ten = `ĐỀ ${d.n}`;
  const { data: cu } = await sb.from('lesson_modules').select('id').eq('lesson_id', htId).eq('title', ten).limit(1);
  if (cu?.[0]) {
    await sb.from('lesson_modules').update({ content_markdown: d.md }).eq('id', cu[0].id);
    console.log(`cập nhật ${ten}`);
  } else {
    const { error } = await sb.from('lesson_modules').insert([{ lesson_id: htId, type: 'practice', title: ten, order_index: d.n, content_markdown: d.md }]);
    console.log(error ? `LỖI ${ten}: ${error.message}` : `đã tạo ${ten}`);
  }
}
