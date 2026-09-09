/**
 * Đối chiếu phán xử bằng mắt với kết quả máy đọc, rồi chia làm ba nhóm.
 *
 * Vì sao tách hẳn ra một script thay vì tự nhẩm: đối chiếu bằng mắt hơn chục mục thì dễ
 * bỏ sót đúng cái mục quan trọng nhất. Máy đối chiếu thì không sót, và in ra con số để
 * thầy cô kiểm lại được.
 *
 *   node --experimental-strip-types .claude/skills/soi-phieu-cham/scripts/tong-ket.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const RA = 'scratch/o-ngo';
const tepSo = join(RA, 'so-tay.json');
const tepPX = join(RA, 'phan-xu.json');

if (!existsSync(tepSo)) {
  console.error(`Chưa có ${tepSo}. Chạy cat-o-ngo.mjs trước.`);
  process.exit(1);
}
if (!existsSync(tepPX)) {
  console.error(`Chưa có ${tepPX}. Soi từng ảnh rồi ghi phán xử vào tệp ấy đã.`);
  process.exit(1);
}

const soTay = JSON.parse(readFileSync(tepSo, 'utf8'));
const phanXu = JSON.parse(readFileSync(tepPX, 'utf8'));
const pxCua = new Map(phanXu.map(p => [p.tep, p]));

const khop = [], lech = [], boSung = [], phanVan = [], thieu = [];
for (const m of soTay) {
  const px = pxCua.get(m.tep);
  if (!px) { thieu.push(m); continue; }
  const may = String(m.mayDoc ?? '');
  const nguoi = String(px.nguoiDoc ?? '');
  if (px.chac === false) { phanVan.push({ m, px, may, nguoi }); continue; }
  if (may === nguoi) { khop.push({ m, px, may, nguoi }); continue; }
  /* Câu `khongChac` là câu máy CỐ Ý không chấm, để trống chờ người. Người đọc ra được thì
     đó là ĐIỀN THÊM, không phải máy chấm sai - xếp vào LỆCH là vu oan cho bộ đo, mà còn
     làm Thầy cô tưởng máy hỏng trong khi nó đang làm đúng việc được giao. */
  if (m.kieu === 'ngờ' && may === '') boSung.push({ m, px, may, nguoi });
  else lech.push({ m, px, may, nguoi });
}

const dong = (x) => `${x.m.anh} · ${x.m.cau} · máy đọc "${x.may}" · mắt đọc "${x.nguoi}"`
  + (x.px.ghiChu ? ` · ${x.px.ghiChu}` : '');

console.log(`Đã soi ${soTay.length} chỗ máy gắn cờ.`);
console.log('');
console.log(`  KHỚP          ${String(khop.length).padStart(3)}  - mắt đọc giống máy, không phải làm gì`);
console.log(`  LỆCH          ${String(lech.length).padStart(3)}  - MÁY CHẤM SAI, phải sửa tay trong app`);
console.log(`  ĐIỀN THÊM     ${String(boSung.length).padStart(3)}  - máy để trống chờ người, mắt đọc ra được, nhập giúp em`);
console.log(`  CÒN PHÂN VÂN  ${String(phanVan.length).padStart(3)}  - chỉ những mục này mới cần Thầy cô ngó`);
if (thieu.length) console.log(`  CHƯA SOI      ${String(thieu.length).padStart(3)}  - còn thiếu phán xử`);

if (lech.length) {
  console.log('');
  console.log('---- LỆCH: sửa tay những câu này trong trang Chấm bài quét ảnh ----');
  for (const x of lech) console.log(`   ${dong(x)}`);
}
if (boSung.length) {
  console.log('');
  console.log('---- ĐIỀN THÊM: máy để trống, nhập đáp án này giúp em ----');
  for (const x of boSung) console.log(`   ${dong(x)}`);
}
if (phanVan.length) {
  console.log('');
  console.log('---- CÒN PHÂN VÂN: nhìn ảnh vẫn không dám chắc ----');
  for (const x of phanVan) console.log(`   ${dong(x)}`);
}
if (thieu.length) {
  console.log('');
  console.log('---- CHƯA SOI ----');
  for (const m of thieu) console.log(`   ${m.tep}`);
}
if (!lech.length && !boSung.length && !phanVan.length && !thieu.length) {
  console.log('');
  console.log('Không chỗ nào lệch. Máy chấm đúng cả tập này.');
}
