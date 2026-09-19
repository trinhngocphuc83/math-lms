/**
 * Dựng KHUNG bài học cho một chương THCS: mỗi bài trong danh mục kho (trừ "Ôn tập chương") một
 * lesson với 4 module (theory · Bài tập ví dụ · Bài tập tự luyện · Tài liệu & Video), và bài
 * "Cuối chương N" trong chuyên đề Ôn tập & Kiểm tra với "Tổng hợp công thức cả chương" +
 * ĐỀ 1…ĐỀ k + Tài liệu & Video. Đã có thì giữ, thiếu gì tạo nấy — chạy lại không đẻ trùng.
 *
 *   npm run -s skill -- .claude/skills/giao-an-tu-luan/scripts/dung-khung.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" [--de 4] [--ghi]
 */
import { sb, lay, co, timChuong, danhMucChuong, lopTu } from './_chung.mjs';

const LOP = lay('lop'), TEN_CHUONG = lay('chuong'), SO_DE = Number(lay('de', 4)), GHI = co('ghi');
if (!LOP || !TEN_CHUONG) { console.error('Cần --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" [--de 4] [--ghi]'); process.exit(1); }
if (SO_DE < 3 || SO_DE > 5) { console.error('--de phải từ 3 tới 5'); process.exit(1); }

const { khoa, chuong, onTap, dsBai, soChuong } = await timChuong(LOP, TEN_CHUONG);
const dm = await danhMucChuong(lopTu(khoa.title), TEN_CHUONG);
console.log(`${khoa.title} › ${chuong.title} (chương số ${soChuong}) · danh mục kho có ${dm.length} bài`);
if (!dm.length) { console.error('Danh mục kho chưa có bài nào cho chương này — nạp kho trước.'); process.exit(1); }
if (!onTap) { console.error('Khoá chưa có chuyên đề loai = on-tap ("Ôn tập & Kiểm tra") — tạo tay trước.'); process.exit(1); }

const MODULE_BAI = [
  ['Lý thuyết & Phương pháp giải (Bài giảng tương tác)', 'theory'],
  ['Bài tập ví dụ', 'practice'],
  ['Bài tập tự luyện', 'practice'],
  ['Tài liệu & Video', 'document'],
];
async function boSungModule(lessonId, ds) {
  const { data: mods } = await sb.from('lesson_modules').select('title').eq('lesson_id', lessonId);
  const co = new Set((mods || []).map(m => m.title));
  let n = 0;
  for (let i = 0; i < ds.length; i++) {
    const [title, type] = ds[i];
    if (co.has(title)) continue;
    n++;
    console.log(`     + module ${title}`);
    if (GHI) {
      const { error } = await sb.from('lesson_modules').insert([{ lesson_id: lessonId, title, type, order_index: i + 1, content_markdown: '' }]);
      if (error) console.log('       lỗi:', error.message);
    }
  }
  if (!n) console.log('     (đủ module)');
}

/* 1. Các bài của chương */
let thuTu = 0;
for (const b of dm) {
  thuTu++;
  let bai = dsBai.find(x => x.title === b.ten);
  console.log(`${bai ? '  có sẵn' : '  TẠO   '}: ${b.ten}  (${b.dang.length} dạng trong kho)`);
  if (!bai && GHI) {
    const { data, error } = await sb.from('lessons').insert([{ course_id: khoa.id, chapter_id: chuong.id, title: b.ten, order_index: thuTu }]).select('id,title').single();
    if (error) { console.log('   lỗi:', error.message); continue; }
    bai = data;
  }
  if (bai) await boSungModule(bai.id, MODULE_BAI);
}
const thua = dsBai.filter(x => !dm.some(b => b.ten === x.title));
if (thua.length) console.log(`  ⚠ trong khoá có bài không thuộc danh mục kho (không đụng tới): ${thua.map(x => x.title).join(' · ')}`);

/* 2. Cuối chương N */
const tenCC = `Cuối chương ${soChuong}`;
const { data: ccCo } = await sb.from('lessons').select('id,title').eq('chapter_id', onTap.id).eq('title', tenCC).maybeSingle();
console.log(`${ccCo ? '  có sẵn' : '  TẠO   '}: ${onTap.title} › ${tenCC}`);
let cc = ccCo;
if (!cc && GHI) {
  const { count } = await sb.from('lessons').select('id', { count: 'exact', head: true }).eq('chapter_id', onTap.id);
  const { data, error } = await sb.from('lessons').insert([{ course_id: khoa.id, chapter_id: onTap.id, title: tenCC, order_index: (count || 0) + 1 }]).select('id,title').single();
  if (error) console.log('   lỗi:', error.message); else cc = data;
}
if (cc) await boSungModule(cc.id, [
  ['Tổng hợp công thức cả chương', 'theory'],
  ...Array.from({ length: SO_DE }, (_, i) => [`ĐỀ ${i + 1}`, 'practice']),
  ['Tài liệu & Video', 'document'],
]);
if (!GHI) console.log('\n(chỉ xem — thêm --ghi để tạo)');
