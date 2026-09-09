/**
 * So ba cách đo một ô, trên 15 phiếu thật:
 *   dam     - trung bình lòng ô (bộ đọc đang dùng)
 *   dam90   - phần tối nhất: trung bình 25% điểm tối nhất trong lòng ô
 *   phuNet  - tỉ lệ điểm trong lòng ô tối hơn giấy 0,25
 *   mau     - độ bão hoà màu lớn nhất (mực bi xanh thì cao, giấy và mực in thì thấp)
 *
 * Nhãn: ô bộ đọc đang chọn = CÓ TÔ (đã soi mắt xác nhận), còn lại = TRẮNG (đã kiểm mọi
 * câu bỏ trống đều dưới 0,10). Cách nào tách hai nhóm xa nhau nhất thì cách ấy đúng.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = 'G:/My Drive/Ảnh chấm toán 12';
const TAM = join(process.cwd(), '.tam-dt');

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

/* Đo một ô từ ảnh gốc, dùng đúng tâm và bán kính ĐÃ NẮN mà bộ đọc trả về. */
function doKy(data, W, H, v) {
  const r = Math.max(1.5, v.r);
  const rRuot = r * 0.72, rTrong = r * 1.15, rNgoai = r * 1.42;
  const ruot = [], nenS = [];
  let mauMax = 0;
  const x0 = Math.max(0, Math.floor(v.x - rNgoai)), x1 = Math.min(W - 1, Math.ceil(v.x + rNgoai));
  const y0 = Math.max(0, Math.floor(v.y - rNgoai)), y1 = Math.min(H - 1, Math.ceil(v.y + rNgoai));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d2 = (x - v.x) ** 2 + (y - v.y) ** 2;
    const i = (y * W + x) * 4;
    const R = data[i], G = data[i+1], B = data[i+2];
    const xam = (R * 0.299 + G * 0.587 + B * 0.114) / 255;
    if (d2 <= rRuot * rRuot) {
      ruot.push(xam);
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx > 40) mauMax = Math.max(mauMax, (mx - mn) / mx);
    } else if (d2 >= rTrong * rTrong && d2 <= rNgoai * rNgoai) nenS.push(xam);
  }
  if (!ruot.length || !nenS.length) return null;
  nenS.sort((a, b) => a - b);
  const nen = nenS[Math.floor(nenS.length * 0.75)];          // giấy: lấy phía sáng của vành
  const toi = ruot.map(v2 => Math.max(0, nen - v2)).sort((a, b) => b - a);
  const dam = toi.reduce((t, x) => t + x, 0) / toi.length;
  const n25 = Math.max(1, Math.floor(toi.length * 0.25));
  const dam90 = toi.slice(0, n25).reduce((t, x) => t + x, 0) / n25;
  const phuNet = toi.filter(x => x > 0.25).length / toi.length;
  return { dam, dam90, phuNet, mau: mauMax };
}

const maCau = (ma) => { const p = ma.split(':'); return p[0]==='NLC'?`NLC:${p[1]}`:p[0]==='DS'?`DS:${p[1]}:${p[2]}`:`TLN:${p[1]}`; };
const coTo = [], trang = [];

for (const ten of readdirSync(THU_MUC).filter(t => /\.jpe?g$/i.test(t))) {
  const { data, info } = await sharp(join(THU_MUC, ten)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  const qr = docQRPhieu(anh, jsQR);
  if (!qr?.ma) continue;
  if (!boCache.has(qr.ma.boDeId)) {
    const { data: bo } = await sb.from('bo_de_thi').select('*').eq('id', qr.ma.boDeId).maybeSingle();
    boCache.set(qr.ma.boDeId, bo);
  }
  const bo = boCache.get(qr.ma.boDeId);
  const lt = dungLuoi(khoiPhieuTuCacPhan(chiaPhanDeThi(bo.cau_hoi || [])));
  const luoi = lt.find(x => x.trang === qr.ma.trang) || lt[0];
  const kq = docPhieuQuet(anh, luoi);
  if (!kq.timDuocNeo) continue;

  /* Ô nào đang được chọn */
  const chon = new Set();
  for (const [c, gt] of Object.entries(kq.traLoi)) {
    const p = c.split(':');
    if (p[0] === 'TLN') [...String(gt)].forEach((ch, i) => ch !== ' ' && chon.add(`TLN:${p[1]}:${i}:${ch}`));
    else if (p[0] === 'DS') chon.add(`${c}:${gt}`);
    else chon.add(`${c}:${gt}`);
  }
  for (const v of kq.viTriO) {
    const d = doKy(anh.data, anh.width, anh.height, v);
    if (d) (chon.has(v.ma) ? coTo : trang).push(d);
  }
  process.stdout.write('.');
}
console.log('\n');

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
for (const [ten, lay] of [['dam    (trung bình - đang dùng)', d => d.dam],
                          ['dam90  (25% điểm tối nhất)     ', d => d.dam90],
                          ['phuNet (tỉ lệ điểm có mực)     ', d => d.phuNet],
                          ['mau    (bão hoà màu)           ', d => d.mau]]) {
  const A = coTo.map(lay), B = trang.map(lay);
  console.log(`${ten}`);
  console.log(`   CÓ TÔ  n=${A.length}  min ${q(A,0).toFixed(3)}  p01 ${q(A,.01).toFixed(3)}  p05 ${q(A,.05).toFixed(3)}  trung vị ${q(A,.5).toFixed(3)}`);
  console.log(`   TRẮNG  n=${B.length}  p95 ${q(B,.95).toFixed(3)}  p99 ${q(B,.99).toFixed(3)}  max ${q(B,1).toFixed(3)}`);
  const khe = q(A, .01) - q(B, .99);
  console.log(`   KHE HỞ p01(có tô) - p99(trắng) = ${khe >= 0 ? '+' : ''}${khe.toFixed(3)}\n`);
}

/* Lưu số liệu thô để quét ngưỡng mà khỏi đọc lại 15 tấm ảnh */
writeFileSync('scratch/dac-trung-o.json', JSON.stringify({ coTo, trang }));

/* ---- Quét ngưỡng: cách nào sai ít nhất ---- */
function quet(ten, lay, tu, den, buoc) {
  const A = coTo.map(lay), B = trang.map(lay);
  let tot = null;
  for (let t = tu; t <= den; t += buoc) {
    const sot = A.filter(x => x < t).length;      // có tô mà bỏ
    const bua = B.filter(x => x >= t).length;     // trắng mà đọc bừa
    if (!tot || sot + bua < tot.sai) tot = { t, sot, bua, sai: sot + bua };
  }
  console.log(`${ten}  ngưỡng tốt nhất ${tot.t.toFixed(3)} -> bỏ sót ${tot.sot} · đọc bừa ${tot.bua} · TỔNG SAI ${tot.sai}`);
  return tot;
}
console.log('---- quét ngưỡng, sai ít nhất là hơn ----');
quet('dam   ', d => d.dam,    0.05, 0.60, 0.005);
quet('phuNet', d => d.phuNet, 0.05, 0.95, 0.005);
quet('gộp   ', d => Math.min(d.dam / 0.30, d.phuNet / 0.45), 0.05, 1.60, 0.01);

rmSync(TAM, { recursive: true, force: true });
