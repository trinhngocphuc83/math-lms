/**
 * Soi kỹ MỘT tờ phiếu thật: độ đậm đo được của từng ô, ngưỡng máy tự chọn, và câu nào
 * đọc ra sao. Dùng để phân xử khi bản mới đọc ít hơn bản cũ - phải nhìn số chứ không đoán.
 *
 *   node --experimental-strip-types scratch/soi-mot-phieu.mjs <tên tệp ảnh>
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = 'G:/My Drive/Ảnh chấm toán 12';
const TEN = process.argv[2] || '1788708048489.jpg';

const TAM = join(process.cwd(), '.tam-soi');
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

const { data, info } = await sharp(join(THU_MUC, TEN)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
console.log(`${TEN} · ${anh.width}x${anh.height}`);

const qr = docQRPhieu(anh, jsQR);
console.log(`QR: ${qr ? `bộ đề ${qr.ma.boDeId.slice(0, 8)} · mã đề ${qr.ma.maDe} · trang ${qr.ma.trang} · em ${qr.ma.hs} (lượt "${qr.luot}")` : 'KHÔNG ĐỌC ĐƯỢC'}`);
if (!qr) process.exit(0);

const { data: bo } = await sb.from('bo_de_thi').select('*').eq('id', qr.ma.boDeId).maybeSingle();
const trang = dungLuoi(khoiPhieuTuCacPhan(chiaPhanDeThi(bo.cau_hoi || [])));
const luoi = trang.find(x => x.trang === qr.ma.trang) || trang[0];
console.log(`Bộ đề: ${bo.ten} · ${trang.length} trang · trang này ${luoi.o.length} ô\n`);

const kq = docPhieuQuet(anh, luoi);
if (!kq.timDuocNeo) { console.log('KHÔNG TÌM ĐƯỢC NEO:', kq.loi); process.exit(0); }

/* Phân bố độ đậm - để thấy hai cụm tách nhau ở đâu */
const dam = kq.o.map(x => x.dam).sort((a, b) => a - b);
const oPhan = (a, b) => dam.filter(d => d >= a && d < b).length;
console.log('── Phân bố độ đậm của 3 ô ──'.replace('3', String(dam.length)));
for (let i = 0; i < 10; i++) {
  const a = i / 10, b = (i + 1) / 10;
  const n = oPhan(a, b);
  console.log(`   ${a.toFixed(1)}-${b.toFixed(1)}  ${String(n).padStart(4)}  ${'█'.repeat(Math.min(60, Math.round(n / 3)))}`);
}
console.log(`   >= 1.0  ${String(dam.filter(d => d >= 1).length).padStart(4)}`);

/* Từng câu trắc nghiệm: bốn ô và quyết định */
const damCua = new Map(kq.o.map(x => [x.ma, x.dam]));
console.log('\n── Phần I (trắc nghiệm) ──');
const soNLC = new Set(luoi.o.filter(x => x.ma.startsWith('NLC:')).map(x => Number(x.ma.split(':')[1])));
for (const c of [...soNLC].sort((a, b) => a - b)) {
  const ds = ['A', 'B', 'C', 'D'].map(n => ({ n, d: damCua.get(`NLC:${c}:${n}`) ?? 0 }));
  const doc = kq.traLoi[`NLC:${c}`];
  const ngo = kq.khongChac.find(k => k.ma === `NLC:${c}`);
  console.log(`   Câu ${String(c).padStart(2)}  ${ds.map(x => `${x.n} ${x.d.toFixed(2)}`).join('  ')}   -> ${doc || (ngo ? 'NGỜ: ' + ngo.viSao.slice(0, 46) : '(bỏ trống)')}`);
}
rmSync(TAM, { recursive: true, force: true });
