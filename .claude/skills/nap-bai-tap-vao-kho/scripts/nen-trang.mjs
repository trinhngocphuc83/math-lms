/**
 * Nén trang vở bài tập: bỏ các dòng chấm chấm "......" (chỗ trống để học sinh viết lời giải)
 * và khoảng trắng, rồi ghép nhiều trang lại thành ít ảnh cao để đọc một lần được nhiều đề.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/nen-trang.mjs <thư mục trang> <từ trang> <đến trang> [tên]
 *
 * Ra scratch/nap-kho/nen/<tên>-<k>.png, mỗi ảnh cao tối đa ~2800 px, giữa các trang có vạch
 * ghi số trang gốc để còn quay lại cắt hình. Vở bài tập 22 trang thường nén còn 3–4 ảnh.
 *
 * Cách nhận dòng chấm: một dải ngang mà điểm mực rải đều gần hết bề ngang (nhiều "cụm" nhỏ,
 * cách đều) - chữ không bao giờ rải kiểu đó. Hình vẽ, công thức, bảng đều giữ nguyên.
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const [thuMuc, tu, den, ten = 'nen'] = process.argv.slice(2);
if (!thuMuc || !tu || !den) { console.error('Cần: <thư mục trang> <từ> <đến> [tên]'); process.exit(1); }
mkdirSync('scratch/nap-kho/nen', { recursive: true });

const CAO_MAX = 2800;
const manh = [];   // { buf, width, height }

for (let p = Number(tu); p <= Number(den); p++) {
  // pdftoppm đánh số có đệm 0 (trang-001) — thử cả hai kiểu tên
  let tep = join(thuMuc, `trang-${String(p).padStart(3, '0')}.png`);
  if (!existsSync(tep)) tep = join(thuMuc, `trang-${p}.png`);
  if (!existsSync(tep)) { console.log('  (không có) ' + tep); continue; }
  const img = sharp(tep).grayscale();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const toi = (x, y) => data[y * W + x] < 140;

  /* Phân loại từng hàng điểm ảnh: chấm chấm / có mực / trắng */
  const loai = new Array(H).fill('trang');
  for (let y = 0; y < H; y++) {
    let mucDau = -1, mucCuoi = -1, cum = 0, trongCum = false, soMuc = 0;
    for (let x = 0; x < W; x++) {
      const t = toi(x, y);
      if (t) { soMuc++; if (mucDau < 0) mucDau = x; mucCuoi = x; }
      if (t && !trongCum) { cum++; trongCum = true; } else if (!t) trongCum = false;
    }
    if (soMuc === 0) continue;
    const rong = mucCuoi - mucDau;
    /* Dòng chấm: mực trải ≥ 60% bề ngang, ≥ 40 cụm rời, mỗi cụm chỉ 1–4 điểm ảnh (một chấm) */
    loai[y] = (rong > W * 0.6 && cum >= 40 && soMuc / cum <= 4) ? 'cham' : 'muc';
  }
  /* Xét theo DẢI mực liền nhau theo chiều dọc: dòng chấm là dải mỏng (≤ 4 px) mà mọi hàng
     đều mang dấu hiệu chấm. Chữ cao ≥ 10 px nên dù một hàng trong chữ trông giống chấm
     (chân chữ, gạch dưới) cũng không bị cắt - bản trước cắt nhầm từng hàng làm chữ đứt khúc. */
  const giu = new Array(H).fill(false);
  let y0 = 0;
  while (y0 < H) {
    if (loai[y0] === 'trang') { y0++; continue; }
    let y1 = y0; while (y1 < H && loai[y1] !== 'trang') y1++;
    const cao = y1 - y0;
    const toanCham = cao <= 4 && loai.slice(y0, y1).every(l => l === 'cham');
    if (!toanCham) for (let y = Math.max(0, y0 - 3); y < Math.min(H, y1 + 3); y++) giu[y] = true;
    y0 = y1;
  }
  /* Khoảng trắng giữa hai khối chữ: giữ tối đa 14 px cho thoáng. */
  const dai = [];
  let y = 0;
  while (y < H) {
    if (!giu[y]) { y++; continue; }
    let y2 = y; while (y2 < H && giu[y2]) y2++;
    dai.push([y, y2]);
    y = y2;
  }
  if (!dai.length) continue;
  const KHE = 14;
  const caoTrang = dai.reduce((a, [y1, y2]) => a + (y2 - y1) + KHE, 0) + 26;
  const nen = sharp({ create: { width: W, height: caoTrang, channels: 3, background: '#ffffff' } });
  const lop = [];
  let yv = 26;
  for (const [y1, y2] of dai) {
    lop.push({ input: await sharp(tep).extract({ left: 0, top: y1, width: W, height: y2 - y1 }).toBuffer(), top: yv, left: 0 });
    yv += (y2 - y1) + KHE;
  }
  /* Nhãn số trang ở đầu */
  const nhan = Buffer.from(`<svg width="${W}" height="24"><rect width="${W}" height="24" fill="#e8e8e8"/><text x="8" y="17" font-size="15" font-family="Arial" fill="#333">— trang ${p} —</text></svg>`);
  lop.push({ input: nhan, top: 0, left: 0 });
  manh.push({ buf: await nen.composite(lop).png().toBuffer(), width: W, height: caoTrang, trang: p });
}

/* Ghép các trang đã nén thành ảnh cao ≤ CAO_MAX */
let k = 0, nhom = [], cao = 0;
const ghi = async () => {
  if (!nhom.length) return;
  k++;
  const W = nhom[0].width;
  const tong = nhom.reduce((a, m) => a + m.height, 0);
  let yv = 0; const lop = [];
  for (const m of nhom) { lop.push({ input: m.buf, top: yv, left: 0 }); yv += m.height; }
  const tep = `scratch/nap-kho/nen/${ten}-${k}.png`;
  await sharp({ create: { width: W, height: tong, channels: 3, background: '#ffffff' } }).composite(lop).png().toFile(tep);
  console.log(`${tep}: trang ${nhom[0].trang}–${nhom[nhom.length - 1].trang} · cao ${tong}px`);
  nhom = []; cao = 0;
};
for (const m of manh) {
  if (cao + m.height > CAO_MAX && nhom.length) await ghi();
  nhom.push(m); cao += m.height;
}
await ghi();
