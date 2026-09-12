/**
 * Soi lại dạng Lớp 10 › Chương 2 (Bất phương trình và hệ bất phương trình bậc nhất hai ẩn),
 * đọc cả 177 câu (12/9/2026). Kết luận:
 *   - 4/8 tên dạng ghi "phương trình" thay vì "bất phương trình" ("Tìm nghiệm phương trình bậc
 *     nhất hai ẩn"…) - đọc như dạng của chương hệ phương trình lớp 9.
 *   - "Biểu diễn miền nghiệm" của Bài 2 gộp hai kĩ năng khác hẳn: vẽ/nhận ra miền nghiệm của hệ,
 *     và TÌM GTLN-GTNN của F = ax + by trên miền nghiệm (14 câu) - kĩ năng trọng tâm của bài,
 *     ra kiểm tra thường xuyên, cần dạng riêng.
 *   - Hai bài cùng đặt "Toán thực tế": Bài 1 là lập bất phương trình từ tình huống, Bài 2 là
 *     bài toán tối ưu - đặt tên cho đúng việc.
 *   - 2 câu "điểm thuộc miền nghiệm" nằm ở dạng biểu diễn miền nghiệm.
 *
 *   node scratch/soi-dang-l10c2.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const G = '10', SUB = 'Đại số', TOPIC = 'Chương 2. Bất phương trình và hệ bất phương trình bậc nhất hai ẩn';
const B1 = 'Bài 1. Bất phương trình bậc nhất hai ẩn', B2 = 'Bài 2. Hệ bất phương trình bậc nhất hai ẩn', B3 = 'Bài 3. Ôn tập chương';

const DANG = [
  { bai: B1, cu: 'Nhận diện phương trình bậc nhất hai ẩn', moi: 'Nhận biết bất phương trình bậc nhất hai ẩn', yc: 'Nhận biết được bất phương trình bậc nhất hai ẩn và điều kiện của các hệ số.' },
  { bai: B1, cu: 'Tìm nghiệm phương trình bậc nhất hai ẩn', moi: 'Nghiệm của bất phương trình bậc nhất hai ẩn, điểm thuộc miền nghiệm', yc: 'Kiểm tra được một cặp số có là nghiệm của bất phương trình bậc nhất hai ẩn, một điểm có thuộc miền nghiệm hay không; tìm được tham số để cặp số cho trước là nghiệm.' },
  { bai: B1, cu: 'Biểu diễn miền nghiệm', moi: 'Biểu diễn miền nghiệm của bất phương trình bậc nhất hai ẩn', yc: 'Biểu diễn được miền nghiệm của bất phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ và đọc được bất phương trình từ hình vẽ miền nghiệm.' },
  { bai: B1, cu: 'Toán thực tế', moi: 'Lập bất phương trình bậc nhất hai ẩn từ tình huống thực tế', yc: 'Lập được bất phương trình bậc nhất hai ẩn mô tả một tình huống thực tế và xét được các phương án thoả mãn.' },
  { bai: B2, cu: 'Nhận diện hệ phương trình bậc nhất hai ẩn', moi: 'Nhận biết hệ bất phương trình bậc nhất hai ẩn', yc: 'Nhận biết được hệ bất phương trình bậc nhất hai ẩn.' },
  { bai: B2, cu: 'Tìm nghiệm của hệ phương trình bậc nhất hai ẩn', moi: 'Nghiệm của hệ bất phương trình bậc nhất hai ẩn, điểm thuộc miền nghiệm', yc: 'Kiểm tra được một cặp số có là nghiệm của hệ bất phương trình bậc nhất hai ẩn, một điểm có thuộc miền nghiệm của hệ hay không.' },
  { bai: B2, cu: 'Biểu diễn miền nghiệm', moi: 'Biểu diễn miền nghiệm của hệ bất phương trình bậc nhất hai ẩn', yc: 'Biểu diễn được miền nghiệm của hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ, đọc được hệ từ hình vẽ và xác định được các đỉnh của miền đa giác.' },
  { bai: B2, cu: null, moi: 'Tìm giá trị lớn nhất, nhỏ nhất của biểu thức F = ax + by trên miền nghiệm', yc: 'Tìm được giá trị lớn nhất, nhỏ nhất của biểu thức F = ax + by trên miền nghiệm của hệ bất phương trình bậc nhất hai ẩn bằng cách xét giá trị tại các đỉnh của miền đa giác.' },
  { bai: B2, cu: 'Toán thực tế', moi: 'Bài toán tối ưu từ tình huống thực tế', yc: 'Lập được hệ bất phương trình bậc nhất hai ẩn từ bài toán thực tế (sản xuất, dinh dưỡng, vận tải…) và tìm được phương án tối ưu bằng cách xét các đỉnh của miền nghiệm.' },
  { bai: B3, cu: 'Bài tập tổng hợp chương 2', moi: 'Bài tập tổng hợp chương 2', yc: 'Vận dụng tổng hợp kiến thức của chương 2 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const XOA = [];
const T = (bai, moi, ids) => ids.map(id => [id, bai, moi]);
const CHUYEN = Object.fromEntries([
  ...T(B1, 'Nghiệm của bất phương trình bậc nhất hai ẩn, điểm thuộc miền nghiệm', ['ljw0']),
  ...T(B2, 'Nghiệm của hệ bất phương trình bậc nhất hai ẩn, điểm thuộc miền nghiệm', ['ls7z']),
  ...T(B2, 'Tìm giá trị lớn nhất, nhỏ nhất của biểu thức F = ax + by trên miền nghiệm',
    ['b6md', 'aecl', 'v1e0', 'l8jx', '2syk', 'lp9c', '0mvo', '7lou', 'vpaw', 'ghgj', '3th7', 'nr2j', '6hus', 'iuda', '9qqi']),
].map(([id, bai, moi]) => [id, { lesson: bai, math_form: moi }]));

const { data: cau } = await sb.from('questions').select('*').eq('grade', G).eq('topic', TOPIC);
const { data: dm } = await sb.from('question_categories').select('*').eq('grade', G).eq('topic', TOPIC);
const thuMuc = `backups/soi-dang-l10c2-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const doiTen = {};
for (const d of DANG) if (d.cu) doiTen[`${d.bai}|${d.cu}`] = d.moi;
const dem = {}, ke = [];
for (const q of cau) {
  const id = q.question_id.slice(-4);
  const dich = CHUYEN[id] || { lesson: q.lesson, math_form: doiTen[`${q.lesson}|${q.math_form}`] || q.math_form };
  const k = `${dich.lesson}|${dich.math_form}`;
  if (!DANG.some(d => d.bai === dich.lesson && d.moi === dich.math_form)) { console.log('  ✗ ngoài dạng đích:', id, k); process.exit(1); }
  dem[k] = (dem[k] || 0) + 1;
  if (dich.lesson !== q.lesson || dich.math_form !== q.math_form) ke.push({ id: q.id, ...dich });
}
for (const d of DANG) console.log(`  ${String(dem[`${d.bai}|${d.moi}`] || 0).padStart(3)}  ${d.bai.slice(0, 6)} | ${d.moi}`);
console.log(`\n${ke.length} câu đổi · ${DANG.filter(d => d.cu && d.cu !== d.moi).length} dạng đổi tên · ${DANG.filter(d => !d.cu).length} dạng mới`);
if (!GHI) { console.log('Thêm "ghi" để ghi thật.'); process.exit(0); }
mkdirSync(thuMuc, { recursive: true });
writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify({ questions: cau, question_categories: dm }, null, 1));
for (const d of DANG) {
  const cuRow = d.cu ? dm.find(x => x.lesson === d.bai && x.math_form === d.cu) : null;
  if (cuRow) { const { error } = await sb.from('question_categories').update({ math_form: d.moi, yeu_cau_can_dat: d.yc }).eq('id', cuRow.id); if (error) console.log('  ✗', d.moi, error.message); }
  else { const { error } = await sb.from('question_categories').insert({ grade: G, subject: SUB, topic: TOPIC, lesson: d.bai, math_form: d.moi, yeu_cau_can_dat: d.yc }); if (error) console.log('  ✗ tạo', d.moi, error.message); }
}
for (const k of ke) { const { error } = await sb.from('questions').update({ lesson: k.lesson, math_form: k.math_form }).eq('id', k.id); if (error) console.log('  ✗ câu', k.id, error.message); }
console.log(`✓ đã ghi · sao lưu ${thuMuc}/`);
