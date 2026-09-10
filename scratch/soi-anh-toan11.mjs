/* Ba ảnh Toán 11: tờ nào có QR, tờ nào không, và tờ không có thì trên giấy còn dấu gì
   để nhận ra em nào. Đo trước khi bàn phương án. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = 'G:/My Drive/Ảnh chấm Toán 11';
const TAM = join(process.cwd(), '.tam-t11');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
globalThis.window ??= { atob: (s) => Buffer.from(s, 'base64').toString('binary') };
const { docQRPhieu } = await import(pathToFileURL(join(TAM, 'docQRPhieu.ts')).href);

mkdirSync('scratch/t11', { recursive: true });
for (const ten of readdirSync(THU_MUC).filter(t => /\.jpe?g$/i.test(t)).sort()) {
  const { data, info } = await sharp(join(THU_MUC, ten)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  const qr = docQRPhieu(anh, jsQR);
  const ngan = ten.slice(0, 13);
  console.log(`${ngan} · ${info.width}x${info.height} · QR: ${qr?.ma ? JSON.stringify(qr.ma) : 'KHÔNG ĐỌC ĐƯỢC'}`);
  /* Cắt phần đầu trang để nhìn xem có chỗ ghi tên không */
  await sharp(join(THU_MUC, ten))
    .extract({ left: 0, top: 0, width: info.width, height: Math.round(info.height * 0.22) })
    .resize({ width: 1000 }).jpeg({ quality: 82 })
    .toFile(`scratch/t11/${ngan}-dau-trang.jpg`);
}
console.log('\nĐã cắt phần đầu mỗi trang -> scratch/t11/');
rmSync(TAM, { recursive: true, force: true });
