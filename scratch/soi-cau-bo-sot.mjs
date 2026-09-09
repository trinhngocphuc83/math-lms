/* Mọi câu bộ đọc KHÔNG trả lời: ô đậm nhất của câu ấy đo được bao nhiêu?
   Dưới sàn giấy trắng 0,10 thì là giấy trắng thật, không phải đọc hụt. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = 'G:/My Drive/Ảnh chấm toán 12';
const TAM = join(process.cwd(), '.tam-sot');
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
const { docPhieuQuet } = await import(pathToFileURL(join(TAM, 'docPhieuQuet.ts')).href);
const { dungLuoi } = await import(pathToFileURL(join(TAM, 'luoiToTron.ts')).href);
const { chiaPhanDeThi } = await import(pathToFileURL(join(TAM, 'deThi.ts')).href);
const { khoiPhieuTuCacPhan } = await import(pathToFileURL(join(TAM, 'phieuTraLoi.ts')).href);

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const boCache = new Map();
const maCau = (ma) => { const p = ma.split(':'); return p[0]==='NLC'?`NLC:${p[1]}`:p[0]==='DS'?`DS:${p[1]}:${p[2]}`:`TLN:${p[1]}`; };

let trang0 = 0, coVet = [];
for (const ten of readdirSync(THU_MUC).filter(t => /\.jpe?g$/i.test(t))) {
  const { data, info } = await sharp(join(THU_MUC, ten)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  const qr = docQRPhieu(anh, jsQR);
  if (!boCache.has(qr.ma.boDeId)) {
    const { data: bo } = await sb.from('bo_de_thi').select('*').eq('id', qr.ma.boDeId).maybeSingle();
    boCache.set(qr.ma.boDeId, bo);
  }
  const bo = boCache.get(qr.ma.boDeId);
  const luoiTrang = dungLuoi(khoiPhieuTuCacPhan(chiaPhanDeThi(bo.cau_hoi || [])));
  const luoi = luoiTrang.find(x => x.trang === qr.ma.trang) || luoiTrang[0];
  const kq = docPhieuQuet(anh, luoi);

  /* đậm nhất mỗi câu */
  const damNhat = new Map();
  for (const o of kq.o) {
    const c = maCau(o.ma);
    if (!damNhat.has(c) || damNhat.get(c).dam < o.dam) damNhat.set(c, o);
  }
  for (const [c, o] of damNhat) {
    if (kq.traLoi[c] !== undefined) continue;               // đã đọc được
    if (o.dam < 0.10) trang0++;
    else coVet.push({ ten, cau: c, o: o.nhan, dam: o.dam });
  }
}
console.log(`Câu không đọc được mà GIẤY TRẮNG thật (đậm nhất < 0,10): ${trang0}`);
console.log(`Câu không đọc được nhưng CÓ VẾT: ${coVet.length}`);
for (const v of coVet) console.log(`   ${v.ten} ${v.cau.padEnd(10)} ô ${v.o} đo ${v.dam.toFixed(2)}`);
rmSync(TAM, { recursive: true, force: true });
