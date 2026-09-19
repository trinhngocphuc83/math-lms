/**
 * Vẽ vòng khoanh lên ảnh phiếu thật rồi ghi ra tệp, để nhìn rõ ở cỡ đầy đủ.
 *
 * Dùng đúng `viTriO` mà bộ đọc trả về và đúng luật màu của giao diện:
 *   xanh liền - em tô đúng · đỏ liền - em tô sai · xanh đứt - đáp án đúng · cam - cần nhìn
 *
 *   node --experimental-strip-types scratch/ve-khoanh-len-anh.mjs 1788708048470.jpg
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = 'G:/My Drive/Ảnh chấm toán 12';
const TEN = process.argv[2] || '1788708048470.jpg';

const TAM = join(process.cwd(), '.tam-ve');
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
const { chamPhieuQuet } = await import(pathToFileURL(join(TAM, 'chamPhieuQuet.ts')).href);

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, info } = await sharp(join(THU_MUC, TEN)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
const qr = docQRPhieu(anh, jsQR);
const { data: bo } = await sb.from('bo_de_thi').select('*').eq('id', qr.ma.boDeId).maybeSingle();
const cacPhan = chiaPhanDeThi(bo.cau_hoi || []);
const trang = dungLuoi(khoiPhieuTuCacPhan(cacPhan));
const luoi = trang.find(x => x.trang === qr.ma.trang) || trang[0];
const kq = docPhieuQuet(anh, luoi);

/* Điểm mỗi câu theo phần, y như trang chấm bài */
const MAC_DINH = { NLC: 0.25, DS: 1, TLN: 0.5, TL: 1 };
const tongMac = cacPhan.reduce((t, p) => t + (MAC_DINH[p.ma] ?? 0) * p.cauHoi.length, 0);
const heSo = tongMac > 0 ? (Number(bo.tong_diem) || 10) / tongMac : 1;
const phanCham = cacPhan.filter(p => ['NLC', 'DS', 'TLN'].includes(p.ma))
  .map(p => ({ ma: p.ma, cauHoi: p.cauHoi, diemMoiCau: (MAC_DINH[p.ma] ?? 0) * heSo }));
const cham = chamPhieuQuet({ traLoi: kq.traLoi, khongChac: kq.khongChac }, phanCham, {});

/* Cùng luật màu với AnhPhieuKhoanh.tsx */
const oCua = new Map(kq.viTriO.map(v => [v.ma, v]));
const vong = [];
const them = (ma, mau, dut) => { const v = oCua.get(ma); if (v) vong.push({ ...v, mau, dut }); };
const XANH = '#059669', DO = '#e11d48', CAM = '#d97706';
for (const c of cham.cau) {
  const chua = c.diem === null;
  if (c.loai === 'NLC') {
    if (c.hocSinh) them(`${c.ma}:${c.hocSinh}`, chua ? CAM : c.hocSinh === c.dapAn ? XANH : DO, false);
    if (!chua && c.dapAn && c.hocSinh !== c.dapAn) them(`${c.ma}:${c.dapAn}`, XANH, true);
  } else if (c.loai === 'DS') {
    const y = ['a', 'b', 'c', 'd'];
    const dap = String(c.dapAn || '').toUpperCase().replace(/[^ĐS]/g, '');
    for (let k = 0; k < 4; k++) {
      const em = (c.hocSinh ?? '')[k];
      if (em !== 'Đ' && em !== 'S') continue;
      them(`${c.ma}:${y[k]}:${em}`, chua ? CAM : em === dap[k] ? XANH : DO, false);
      if (!chua && dap[k] && em !== dap[k]) them(`${c.ma}:${y[k]}:${dap[k]}`, XANH, true);
    }
  } else {
    const em = c.hocSinh ?? '';
    const mau = chua ? CAM : c.diem === c.diemToiDa ? XANH : DO;
    for (let i = 0; i < em.length; i++) if (em[i] && em[i] !== ' ') them(`${c.ma}:${i}:${em[i]}`, mau, false);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${anh.width}" height="${anh.height}">`
  + vong.map(v => `<circle cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="${(v.r * 1.55).toFixed(1)}"`
      + ` fill="none" stroke="${v.mau}" stroke-width="${Math.max(2, v.r * 0.36).toFixed(1)}"`
      + (v.dut ? ` stroke-dasharray="${(v.r * 0.8).toFixed(1)} ${(v.r * 0.6).toFixed(1)}"` : '') + '/>').join('')
  + '</svg>';

mkdirSync('scratch/anh-soi', { recursive: true });
const ra = `scratch/anh-soi/${TEN.replace(/\.jpg$/i, '')}-khoanh.jpg`;
await sharp(join(THU_MUC, TEN))
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .jpeg({ quality: 86 })
  .toFile(ra);

const dem = { xanh: 0, do: 0, dut: 0, cam: 0 };
for (const v of vong) v.dut ? dem.dut++ : v.mau === XANH ? dem.xanh++ : v.mau === DO ? dem.do++ : dem.cam++;
console.log(`${TEN} · em ${qr.ma.hs} · ${cham.diem}/${cham.diemToiDa} điểm`);
console.log(`   xanh ${dem.xanh} · đỏ ${dem.do} · xanh đứt (đáp án đúng) ${dem.dut} · cam ${dem.cam}`);
console.log(`   -> ${ra}`);
rmSync(TAM, { recursive: true, force: true });
