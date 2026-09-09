/**
 * Cắt ảnh phóng to ĐÚNG những câu máy gắn cờ, để nhìn bằng mắt mà phân xử.
 *
 * Vì sao cần: bộ đọc quy mỗi ô về MỘT con số độ đậm, mà con số ấy vứt mất hình dạng -
 * nét chì nhạt 0,16 và vết bẩn 0,16 giống hệt nhau khi chỉ còn là con số. Ảnh thì vẫn
 * còn hình: nét chì phủ đều lòng ô và dừng ở vành, vết bẩn thì loang lệch và tràn vành.
 *
 *   node --experimental-strip-types scratch/cat-o-ngo.mjs [tên tệp ảnh]
 *   (không truyền tên thì chạy hết cả thư mục)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = 'G:/My Drive/Ảnh chấm toán 12';
const RA = 'scratch/o-ngo';

const TAM = join(process.cwd(), '.tam-cat');
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
const maCau = (ma) => { const p = ma.split(':'); return p[0]==='NLC'?`NLC:${p[1]}`:p[0]==='DS'?`DS:${p[1]}:${p[2]}`:`TLN:${p[1]}:${p[2]}`; };

rmSync(RA, { recursive: true, force: true });
mkdirSync(RA, { recursive: true });

const chon = process.argv[2];
const dsAnh = readdirSync(THU_MUC).filter(t => /\.jpe?g$/i.test(t)).filter(t => !chon || t === chon);
const soTay = [];

for (const ten of dsAnh) {
  const goc = sharp(join(THU_MUC, ten));
  const { data, info } = await goc.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const anh = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  const qr = docQRPhieu(anh, jsQR);
  if (!qr?.ma) { console.log(`${ten}: không đọc được QR, bỏ qua`); continue; }
  if (!boCache.has(qr.ma.boDeId)) {
    const { data: bo } = await sb.from('bo_de_thi').select('*').eq('id', qr.ma.boDeId).maybeSingle();
    boCache.set(qr.ma.boDeId, bo);
  }
  const bo = boCache.get(qr.ma.boDeId);
  const luoiTrang = dungLuoi(khoiPhieuTuCacPhan(chiaPhanDeThi(bo.cau_hoi || [])));
  const luoi = luoiTrang.find(x => x.trang === qr.ma.trang) || luoiTrang[0];
  const kq = docPhieuQuet(anh, luoi);
  if (!kq.timDuocNeo) { console.log(`${ten}: không tìm được neo, bỏ qua`); continue; }

  const co = [...(kq.netMo || []).map(n => ({ ...n, kieu: 'mờ' })),
              ...(kq.khongChac || []).map(n => ({ ...n, kieu: 'ngờ' }))];
  if (!co.length) continue;

  const damCua = new Map(kq.o.map(o => [o.ma, o.dam]));
  for (const dau of co) {
    /* Mọi ô thuộc cùng câu ấy - để nhìn được cả hàng mà so */
    const oCung = kq.viTriO.filter(v => maCau(v.ma) === dau.ma);
    if (!oCung.length) continue;
    const r = oCung[0].r;
    const x0 = Math.max(0, Math.min(...oCung.map(v => v.x)) - r * 3.2);
    const x1 = Math.min(anh.width,  Math.max(...oCung.map(v => v.x)) + r * 3.2);
    const y0 = Math.max(0, Math.min(...oCung.map(v => v.y)) - r * 2.4);
    const y1 = Math.min(anh.height, Math.max(...oCung.map(v => v.y)) + r * 2.4);
    const w = Math.round(x1 - x0), h = Math.round(y1 - y0);
    if (w < 8 || h < 8) continue;

    const tep = `${ten.replace(/\.jpe?g$/i, '')}__${dau.ma.replace(/:/g, '-')}.png`;
    await sharp(join(THU_MUC, ten))
      .extract({ left: Math.round(x0), top: Math.round(y0), width: w, height: h })
      .resize({ width: Math.min(1200, w * 5), kernel: 'nearest' })
      .png()
      .toFile(join(RA, tep));

    soTay.push({
      anh: ten, cau: dau.ma, kieu: dau.kieu, viSao: dau.viSao,
      mayDoc: kq.traLoi[dau.ma] ?? null,
      o: oCung.map(v => ({ nhan: v.ma.split(':').pop(), dam: +(damCua.get(v.ma) ?? 0).toFixed(3) }))
             .sort((a, b) => b.dam - a.dam),
      tep,
    });
  }
  console.log(`${ten}: cắt ${co.length} chỗ`);
}
writeFileSync(join(RA, 'so-tay.json'), JSON.stringify(soTay, null, 2));
console.log(`\nTổng ${soTay.length} chỗ cần soi -> ${RA}/`);
rmSync(TAM, { recursive: true, force: true });
