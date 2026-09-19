/**
 * 46 câu máy để trống trên 15 tờ thật: giấy TRẮNG thật hay máy vẫn còn hụt?
 *
 * Nhìn vào ô đậm nhất của từng câu ấy. Sát 0 là em bỏ trống thật. Còn nhô lên thì máy
 * đang hụt và phải xem lại tiếp - đây là phép tự soát cuối, đừng vội mừng vì con số
 * "đọc được" đã tăng.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = process.argv[2] || 'G:/My Drive/Ảnh chấm toán 12';
const TAM = join(process.cwd(), '.tam-trong');
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

const luoiCua = new Map();
async function layLuoi(id) {
  if (!luoiCua.has(id)) {
    const { data } = await sb.from('bo_de_thi').select('*').eq('id', id).maybeSingle();
    luoiCua.set(id, data ? dungLuoi(khoiPhieuTuCacPhan(chiaPhanDeThi(data.cau_hoi || []))) : null);
  }
  return luoiCua.get(id);
}

const mucDo = { 'sát 0 (dưới 0,05)': 0, 'mờ 0,05-0,18': 0, 'từ 0,18 trở lên': 0 };
const dangNgo = [];
let tongTrong = 0;

for (const t of readdirSync(THU_MUC).filter(x => /\.jpe?g$/i.test(x)).sort()) {
  const { data, info } = await sharp(join(THU_MUC, t)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  const qr = docQRPhieu(anh, jsQR);
  if (!qr) continue;
  const trang = await layLuoi(qr.ma.boDeId);
  const luoi = trang?.find(x => x.trang === qr.ma.trang) || trang?.[0];
  if (!luoi) continue;
  const kq = docPhieuQuet(anh, luoi);
  if (!kq.timDuocNeo) continue;

  const damCua = new Map(kq.o.map(x => [x.ma, x.dam]));
  /* Nhóm ô theo câu, y như bộ đọc */
  const nhom = new Map();
  for (const x of luoi.o) {
    const p = x.ma.split(':');
    const khoa = p[0] === 'NLC' ? `NLC:${p[1]}` : p[0] === 'DS' ? `DS:${p[1]}:${p[2]}` : `TLN:${p[1]}:${p[2]}`;
    (nhom.get(khoa) || nhom.set(khoa, []).get(khoa)).push(x);
  }
  const cauHienThi = (k) => k.startsWith('TLN:') ? `TLN:${k.split(':')[1]}` : k;
  const daNgo = new Set(kq.khongChac.map(k => k.ma));

  for (const [khoa, ds] of nhom) {
    const cau = cauHienThi(khoa);
    if (kq.traLoi[cau] !== undefined || daNgo.has(cau) || daNgo.has(khoa)) continue;
    tongTrong++;
    const nhat = Math.max(...ds.map(x => damCua.get(x.ma) ?? 0));
    if (nhat < 0.05) mucDo['sát 0 (dưới 0,05)']++;
    else if (nhat < 0.18) { mucDo['mờ 0,05-0,18']++; dangNgo.push(`${t} · ${cau} · ${nhat.toFixed(2)}`); }
    else { mucDo['từ 0,18 trở lên']++; dangNgo.push(`${t} · ${cau} · ${nhat.toFixed(2)}  ⚠`); }
  }
}

console.log(`Tổng ô/câu máy để trống: ${tongTrong}\n`);
for (const [k, v] of Object.entries(mucDo)) console.log(`   ${k.padEnd(22)} ${String(v).padStart(4)}`);
if (dangNgo.length) {
  console.log('\nNhững chỗ còn nhô lên (đáng xem lại):');
  for (const d of dangNgo.slice(0, 20)) console.log('   ' + d);
} else {
  console.log('\n   ✓ mọi câu để trống đều sát 0 - em bỏ trống thật, máy không hụt câu nào');
}
rmSync(TAM, { recursive: true, force: true });
