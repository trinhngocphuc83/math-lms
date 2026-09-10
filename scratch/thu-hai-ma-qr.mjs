/**
 * Thử bộ đọc khi MỘT TRANG CÓ HAI MÃ QR:
 *   - mã danh tính (trang 0) ở dải đầu trang, góc trên bên trái
 *   - mã trang (trang 2) trong ô điểm, góc trên bên phải
 * Phải trả về mã TRANG, không phải mã danh tính.
 * Và tờ chỉ có mã danh tính thì phải trả về trang 0, không nắn thành 1.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import jsQR from 'jsqr';
import sharp from 'sharp';
import QRCode from 'qrcode';

const TAM = join(process.cwd(), '.tam-qr2');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
globalThis.window ??= { atob: (s) => Buffer.from(s, 'base64').toString('binary') };
const { docQRPhieu, phanTichMaPhieu } = await import(pathToFileURL(join(TAM, 'docQRPhieu.ts')).href);

const BO = 'b13dd9eb-b3f7-4b47-99ef-2f1713c19633';
const maDanhTinh = `LTP|1|${BO}|102|pt|0|e092a6`;
const maTrang2 = `LTP|1|${BO}|102|pt|2|e092a6`;

console.log('── Đọc chuỗi mã ──');
for (const [ten, chuoi] of [['danh tính (trang 0)', maDanhTinh], ['mã trang 2', maTrang2]]) {
  console.log(`   ${ten.padEnd(22)} -> ${JSON.stringify(phanTichMaPhieu(chuoi))}`);
}

/** Dựng một tờ giấy trắng có gắn mã QR ở các vị trí cho trước. */
async function toGiay(cacMa) {
  const W = 1240, H = 1754;
  let nen = sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } });
  const chong = [];
  for (const { chuoi, x, y, co } of cacMa) {
    const png = await QRCode.toBuffer(chuoi, { width: co, margin: 1, errorCorrectionLevel: 'M' });
    chong.push({ input: png, left: x, top: y });
  }
  const buf = await nen.composite(chong).png().toBuffer();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

console.log('\n── Đọc ảnh ──');
const caHai = await toGiay([
  { chuoi: maDanhTinh, x: 480, y: 30, co: 90 },     // giữa dải đầu trang
  { chuoi: maTrang2, x: 1010, y: 120, co: 130 },    // ô điểm góc phải
]);
const r1 = docQRPhieu(caHai, jsQR);
console.log(`   trang lưới (hai mã) -> ${r1 ? `trang ${r1.ma.trang} · hs ${r1.ma.hs} · lượt "${r1.luot}"` : 'KHÔNG ĐỌC ĐƯỢC'}`);
console.log(`      ${r1?.ma.trang === 2 ? '✓ lấy đúng mã TRANG' : '✗ SAI - phải ra trang 2'}`);

const chiDanhTinh = await toGiay([{ chuoi: maDanhTinh, x: 480, y: 30, co: 90 }]);
const r2 = docQRPhieu(chiDanhTinh, jsQR);
console.log(`   tờ tự luận (một mã) -> ${r2 ? `trang ${r2.ma.trang} · hs ${r2.ma.hs} · lượt "${r2.luot}"` : 'KHÔNG ĐỌC ĐƯỢC'}`);
console.log(`      ${r2?.ma.trang === 0 && r2?.ma.hs === 'e092a6' ? '✓ nhận ra em, không nắn thành trang 1' : '✗ SAI'}`);

rmSync(TAM, { recursive: true, force: true });
