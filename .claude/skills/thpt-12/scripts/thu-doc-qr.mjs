/**
 * Thử bộ đọc mã QR của phiếu: dựng mã QR thật bằng chính thư viện app dùng để in, đặt
 * lên một tờ giấy giả đúng tỉ lệ, rồi làm hỏng ảnh theo mấy kiểu hay gặp khi chụp bằng
 * điện thoại - mờ, tối, xoay ngang, chụp xa.
 *
 * So bản CŨ (gọi jsQR đúng một lần trên ảnh gốc) với bản MỚI (thử nhiều lượt).
 *
 *   node --experimental-strip-types scratch/thu-doc-qr.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

const TAM = join(process.cwd(), '.tam-qr');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
const { docQRPhieu, phanTichMaPhieu } = await import(pathToFileURL(join(TAM, 'docQRPhieu.ts')).href);

const NOI_DUNG = 'LTP|1|f2260fcc-5ed4-43c9-9d44-b952503cf2c2|102|pt|1|a7f3k9';

/* Mã QR thật, dạng ma trận đen trắng */
const qr = await QRCode.create(NOI_DUNG, { errorCorrectionLevel: 'M' });
const oQR = qr.modules.size;
console.log(`Mã QR: ${oQR}x${oQR} ô · nội dung ${NOI_DUNG.length} ký tự\n`);

/**
 * Dựng "ảnh chụp tờ giấy": nền trắng cỡ A4 theo điểm ảnh, mã QR đặt ở góc trên bên phải
 * đúng như trên phiếu thật, cỡ 1,7cm.
 */
function toGiay(rongPx, opt = {}) {
  const { sang = 1, mo = 0, nhieu = 0 } = opt;
  const W = rongPx, H = Math.round(rongPx * 297 / 210);   // A4
  const px = new Float32Array(W * H).fill(sang);

  /* QR 1,7cm trên khổ ngang 21cm, đặt cách mép phải 2,5cm và mép trên 1,8cm */
  const canh = Math.round(W * 1.7 / 21);
  const x0 = Math.round(W * (21 - 2.5 - 1.7) / 21);
  const y0 = Math.round(W * 1.8 / 21);
  const buoc = canh / oQR;
  for (let r = 0; r < oQR; r++) for (let c = 0; c < oQR; c++) {
    if (!qr.modules.get(r, c)) continue;
    const ax0 = Math.floor(x0 + c * buoc), ax1 = Math.ceil(x0 + (c + 1) * buoc);
    const ay0 = Math.floor(y0 + r * buoc), ay1 = Math.ceil(y0 + (r + 1) * buoc);
    for (let y = ay0; y < ay1 && y < H; y++) for (let x = ax0; x < ax1 && x < W; x++)
      px[y * W + x] = 0.05 * sang;
  }

  /* Ít chữ đen rải rác cho giống tờ giấy thật, để jsQR phải lọc */
  for (let k = 0; k < 400; k++) {
    const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * H * 0.9) + Math.floor(H * 0.1);
    for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 30; dx++) {
      const i = (y + dy) * W + x + dx;
      if (i >= 0 && i < px.length) px[i] = 0.25 * sang;
    }
  }

  /* Làm mờ bằng phép trung bình hộp - giả rung tay hoặc lấy nét hụt */
  let anh = px;
  for (let lan = 0; lan < mo; lan++) {
    const ra = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let t = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) t += anh[(y + dy) * W + x + dx];
      ra[y * W + x] = t / 9;
    }
    anh = ra;
  }
  if (nhieu) for (let i = 0; i < anh.length; i++)
    anh[i] = Math.max(0, Math.min(1, anh[i] + (Math.random() * 2 - 1) * nhieu));

  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < anh.length; i++) {
    const v = Math.round(anh[i] * 255);
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  }
  return { data, width: W, height: H };
}

/** Bản CŨ: gọi jsQR đúng một lần trên ảnh gốc. */
function docQRCu(anh) {
  try {
    const kq = jsQR(anh.data, anh.width, anh.height, { inversionAttempts: 'attemptBoth' });
    return kq?.data ? phanTichMaPhieu(kq.data) : null;
  } catch { return null; }
}

const CA = [
  { ten: 'chụp nét, 3000px', rong: 3000, opt: {} },
  { ten: 'chụp nét, 2000px', rong: 2000, opt: {} },
  { ten: 'chụp xa, 1200px', rong: 1200, opt: {} },
  { ten: 'hơi mờ, 2400px', rong: 2400, opt: { mo: 2 } },
  { ten: 'mờ nhiều, 2400px', rong: 2400, opt: { mo: 5 } },
  { ten: 'thiếu sáng, 2400px', rong: 2400, opt: { sang: 0.62 } },
  { ten: 'rỗ hạt, 2400px', rong: 2400, opt: { nhieu: 0.07 } },
  { ten: 'mờ + tối + rỗ', rong: 2400, opt: { mo: 2, sang: 0.7, nhieu: 0.05 } },
];

console.log('  CŨ   MỚI  | lượt ăn                    | ca');
console.log('  ---- ---- | -------------------------- | --');
let cu = 0, moi = 0;
for (const c of CA) {
  const anh = toGiay(c.rong, c.opt);
  const kqCu = docQRCu(anh);
  const kqMoi = docQRPhieu(anh, jsQR);
  if (kqCu?.hs === 'a7f3k9') cu++;
  if (kqMoi?.ma.hs === 'a7f3k9') moi++;
  console.log(`  ${(kqCu ? ' ✓' : ' ✗').padEnd(4)} ${(kqMoi ? ' ✓' : ' ✗').padEnd(4)} | ${(kqMoi?.luot || '-').padEnd(26)} | ${c.ten}`);
}

/* Xoay ngang tờ giấy - Thầy cô chụp ngang là chuyện thường */
const { xoayAnh } = await import(pathToFileURL(join(TAM, 'docQRPhieu.ts')).href);
for (const goc of [90, 180, 270]) {
  const anh = xoayAnh(toGiay(2400, {}), goc);
  const kqCu = docQRCu(anh);
  const kqMoi = docQRPhieu(anh, jsQR);
  if (kqCu?.hs === 'a7f3k9') cu++;
  if (kqMoi?.ma.hs === 'a7f3k9') moi++;
  console.log(`  ${(kqCu ? ' ✓' : ' ✗').padEnd(4)} ${(kqMoi ? ' ✓' : ' ✗').padEnd(4)} | ${(kqMoi?.luot || '-').padEnd(26)} | chụp xoay ${goc}°`);
}

console.log(`\n  CŨ đọc được ${cu}/${CA.length + 3} · MỚI đọc được ${moi}/${CA.length + 3}`);
rmSync(TAM, { recursive: true, force: true });
