/**
 * Soi lại dạng của Lớp 10 › Chương 1 (Mệnh đề và tập hợp) sau khi chia lại bài ôn tập
 * (thầy yêu cầu 12/9/2026). Đọc cả 292 câu, kết luận:
 *   - Bài 1 thiếu dạng "Xét tính đúng sai của mệnh đề": 12 câu "mệnh đề nào đúng/sai" đang
 *     nằm lẫn trong "Nhận biết mệnh đề" và "Mệnh đề phủ định".
 *   - Bài 2 có ba cặp dạng song sinh: "Biểu diễn tập hợp số" / "…trên trục số"; "Xác định
 *     tập hợp con" / "Tập hợp con-tập hợp bằng nhau" (rỗng); "Toán tổng hợp" của Bài 2 /
 *     của bài ôn tập. 5 câu sơ đồ Ven nằm ở "Đếm số phần tử", 5 câu đọc biểu đồ Ven trừu
 *     tượng nằm ở "Sơ đồ ven"; 2 câu "tập hợp bằng nhau" nằm ở "Xác định các phần tử".
 *   - Tên dạng sửa cho đúng nghĩa ("ký hiệu thuộc, tồn tại" -> "với mọi, tồn tại"; "Sơ đồ ven"
 *     -> "Bài toán thực tế dùng sơ đồ Ven"; kéo theo thêm "điều kiện cần và đủ").
 *   - Bài ôn tập chỉ giữ câu THẬT SỰ trộn nhiều kĩ năng (4 câu), dạng "Bài tập tổng hợp chương 1".
 *
 *   node scratch/soi-dang-l10c1.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const G = '10', SUB = 'Đại số', TOPIC = 'Chương 1. Mệnh đề và tập hợp';
const B1 = 'Bài 1. Mệnh đề', B2 = 'Bài 2. Tập hợp và các phép toán trên tập hợp', B3 = 'Bài 3. Ôn tập chương';

/* Dạng đích (tên mới) kèm yêu cầu cần đạt; khoá = tên cũ để đổi tên, null = tạo mới */
const DANG = [
  // Bài 1
  { bai: B1, cu: 'Nhận biết mệnh đề', moi: 'Nhận biết mệnh đề', yc: 'Nhận biết được câu hoặc phát biểu cho trước có phải là mệnh đề, mệnh đề toán học hay không.' },
  { bai: B1, cu: null, moi: 'Xét tính đúng sai của mệnh đề', yc: 'Xác định được tính đúng sai của một mệnh đề toán học cho trước và đếm được số mệnh đề đúng, sai trong một danh sách.' },
  { bai: B1, cu: 'Mệnh đề chứa biến', moi: 'Mệnh đề chứa biến', yc: 'Nhận biết được mệnh đề chứa biến và xét được tính đúng sai của mệnh đề khi gán giá trị cụ thể cho biến.' },
  { bai: B1, cu: 'Mệnh đề phủ định. Mệnh đề chứa ký hiệu thuộc, tồn tại', moi: 'Mệnh đề phủ định. Mệnh đề chứa kí hiệu với mọi, tồn tại', yc: 'Lập được mệnh đề phủ định; viết được mệnh đề bằng kí hiệu ∀, ∃ và phủ định của chúng; xét được tính đúng sai.' },
  { bai: B1, cu: 'Mệnh đề kéo theo - mệnh đề đảo', moi: 'Mệnh đề kéo theo, mệnh đề đảo, điều kiện cần và đủ', yc: 'Phát biểu được mệnh đề kéo theo, mệnh đề đảo, dùng được thuật ngữ điều kiện cần, điều kiện đủ và xét được tính đúng sai của chúng.' },
  { bai: B1, cu: 'Mệnh đề tương đương', moi: 'Mệnh đề tương đương', yc: 'Phát biểu được mệnh đề tương đương và xác định được tính đúng sai của mệnh đề tương đương.' },
  // Bài 2
  { bai: B2, cu: 'Xác định các phần tử của tập hợp', moi: 'Xác định tập hợp: liệt kê phần tử, chỉ ra tính chất đặc trưng', yc: 'Viết được tập hợp bằng cách liệt kê phần tử hoặc chỉ ra tính chất đặc trưng; nhận biết được tập rỗng.' },
  { bai: B2, cu: 'Xác định tập hợp con', moi: 'Tập hợp con, hai tập hợp bằng nhau, đếm số tập con', yc: 'Nhận biết được tập hợp con, hai tập hợp bằng nhau; đếm được số tập con của một tập hợp hữu hạn và số tập hợp thoả điều kiện cho trước.' },
  { bai: B2, cu: 'Biểu diễn tập hợp trên trục số', moi: 'Các tập hợp số và biểu diễn trên trục số', yc: 'Viết được các tập con của tập số thực dưới dạng khoảng, đoạn, nửa khoảng và biểu diễn được chúng trên trục số.' },
  { bai: B2, cu: 'Các phép toán trên tập hợp', moi: 'Các phép toán trên tập hợp', yc: 'Thực hiện được các phép toán giao, hợp, hiệu và phần bù của các tập hợp, kể cả các tập con của tập số thực và tập hợp cho bằng biểu đồ Ven.' },
  { bai: B2, cu: 'Đếm số phần tử của tập hợp', moi: 'Đếm số phần tử của tập hợp', yc: 'Đếm được số phần tử của một tập hợp hữu hạn và số phần tử nguyên của tập hợp thu được từ các phép toán trên tập hợp.' },
  { bai: B2, cu: 'Sơ đồ ven', moi: 'Bài toán thực tế dùng sơ đồ Ven', yc: 'Sử dụng được biểu đồ Ven và công thức số phần tử của hợp hai, ba tập hợp để giải bài toán đếm trong thực tiễn.' },
  { bai: B2, cu: 'Các bài toán tìm điều kiện tham số', moi: 'Tìm tham số để các tập hợp thoả điều kiện cho trước', yc: 'Tìm được giá trị của tham số để hai tập hợp (thường là khoảng, đoạn) thoả điều kiện chứa nhau, giao khác rỗng, hiệu bằng rỗng…' },
  // Bài 3
  { bai: B3, cu: 'Toán tổng hợp', moi: 'Bài tập tổng hợp chương 1', yc: 'Vận dụng tổng hợp kiến thức về mệnh đề và tập hợp để giải quyết các bài toán nhiều ý.' },
];
const XOA = [
  { bai: B2, dang: 'Tập hợp con-tập hợp bằng nhau' },
  { bai: B2, dang: 'Biểu diễn tập hợp số' },
  { bai: B2, dang: 'Toán tổng hợp' },
];
/* Câu chuyển: 4 kí tự cuối mã -> [bài, dạng mới] */
const T = (bai, moi, ids) => ids.map(id => [id, bai, moi]);
const CHUYEN = Object.fromEntries([
  ...T(B1, 'Xét tính đúng sai của mệnh đề', ['n8o9', 'ebef', 'e7d1', '86tm', '3ji5', 'fsdi', 'z92g', 'p6eu', 'a1oc', 'bk43', 'as47', '1rwa', 'ohvd']),
  ...T(B2, 'Xác định tập hợp: liệt kê phần tử, chỉ ra tính chất đặc trưng', ['45ie']),
  ...T(B2, 'Các tập hợp số và biểu diễn trên trục số', ['er99', 'ozp9', '3mxn']),
  ...T(B2, 'Tập hợp con, hai tập hợp bằng nhau, đếm số tập con', ['911k', 'osqn', 'w74q']),
  ...T(B2, 'Đếm số phần tử của tập hợp', ['10xf', '4o4l']),
  ...T(B2, 'Bài toán thực tế dùng sơ đồ Ven', ['5j33', 'w8fh', 'ie4u', 'zmvx', 'utsp']),
  ...T(B2, 'Các phép toán trên tập hợp', ['f5v8', '2jr0', 'ju94', '0ckx', '0gzu', 'vzls', 'g7p2']),
  ...T(B2, 'Tìm tham số để các tập hợp thoả điều kiện cho trước', ['k0fh', 'bf2a', '2mwk', 'cq75', 'o6ks']),
  ...T(B3, 'Bài tập tổng hợp chương 1', ['mme3', 'mh7c']),
].map(([id, bai, moi]) => [id, { lesson: bai, math_form: moi }]));

const { data: cau } = await sb.from('questions').select('*').eq('grade', G).eq('topic', TOPIC);
const { data: dm } = await sb.from('question_categories').select('*').eq('grade', G).eq('topic', TOPIC);
const thuMuc = `backups/soi-dang-l10c1-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const saoLuu = { questions: cau, question_categories: dm };
const doiTen = {};   // "bài|tên cũ" -> tên mới
for (const d of DANG) if (d.cu) doiTen[`${d.bai}|${d.cu}`] = d.moi;

/* 1. tính đích của từng câu */
const dem = {};
const ke = [];
for (const q of cau) {
  const id = q.question_id.slice(-4);
  let dich = CHUYEN[id] || { lesson: q.lesson, math_form: doiTen[`${q.lesson}|${q.math_form}`] || q.math_form };
  const kDich = `${dich.lesson}|${dich.math_form}`;
  if (!DANG.some(d => d.bai === dich.lesson && d.moi === dich.math_form)) { console.log('  ✗ câu rơi ngoài dạng đích:', id, kDich); process.exit(1); }
  dem[kDich] = (dem[kDich] || 0) + 1;
  if (dich.lesson !== q.lesson || dich.math_form !== q.math_form) ke.push({ id: q.id, ...dich });
}
for (const d of DANG) console.log(`  ${String(dem[`${d.bai}|${d.moi}`] || 0).padStart(3)}  ${d.bai.slice(0, 6)} | ${d.moi}`);
console.log(`\n${ke.length} câu đổi bài/dạng · ${DANG.filter(d => d.cu && d.cu !== d.moi).length} dạng đổi tên · ${DANG.filter(d => !d.cu).length} dạng mới · ${XOA.length} dạng xoá`);
if (!GHI) { console.log('Thêm "ghi" để ghi thật.'); process.exit(0); }

mkdirSync(thuMuc, { recursive: true });
writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify(saoLuu, null, 1));
/* 2. danh mục: tạo mới / đổi tên / cập nhật yêu cầu */
for (const d of DANG) {
  const cuRow = d.cu ? dm.find(x => x.lesson === d.bai && x.math_form === d.cu) : null;
  if (cuRow) { const { error } = await sb.from('question_categories').update({ math_form: d.moi, yeu_cau_can_dat: d.yc }).eq('id', cuRow.id); if (error) console.log('  ✗', d.moi, error.message); }
  else { const { error } = await sb.from('question_categories').insert({ grade: G, subject: SUB, topic: TOPIC, lesson: d.bai, math_form: d.moi, yeu_cau_can_dat: d.yc }); if (error) console.log('  ✗ tạo', d.moi, error.message); }
}
/* 3. câu */
for (const k of ke) { const { error } = await sb.from('questions').update({ lesson: k.lesson, math_form: k.math_form }).eq('id', k.id); if (error) console.log('  ✗ câu', k.id, error.message); }
/* 4. xoá dạng rỗng */
for (const x of XOA) {
  const { count } = await sb.from('questions').select('id', { count: 'exact', head: true }).eq('grade', G).eq('lesson', x.bai).eq('math_form', x.dang);
  if (count) { console.log(`  ⚠ còn ${count} câu ở "${x.dang}", không xoá`); continue; }
  await sb.from('question_categories').delete().eq('grade', G).eq('topic', TOPIC).eq('lesson', x.bai).eq('math_form', x.dang);
}
console.log(`✓ đã ghi · sao lưu ${thuMuc}/`);
