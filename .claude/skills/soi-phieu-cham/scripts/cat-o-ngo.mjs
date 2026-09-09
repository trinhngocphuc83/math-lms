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

const THU_MUC = process.argv[2];
const RA = 'scratch/o-ngo';
if (!THU_MUC) {
  console.error('Thiếu thư mục ảnh.');
  console.error('  node --experimental-strip-types .claude/skills/soi-phieu-cham/scripts/cat-o-ngo.mjs "<thư mục ảnh>" [tên tệp]');
  process.exit(1);
}

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

const chon = process.argv[3];
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
    const w2 = Math.min(1200, Math.round(w * 5));
    const ti = w2 / w;
    const h2 = Math.round(h * ti);

    /* VẼ NHÃN LÊN ẢNH CẮT. Ảnh trần thì không dùng được: một câu Đúng/Sai cắt ra chỉ có
       hai ô tròn giống hệt nhau, cộng thêm mấy ô hàng xóm lọt vào rìa - người soi không
       biết ô nào là Đ, ô nào là S, đọc ra thì cũng chỉ là đoán. Khoanh mảnh kèm chữ thì
       nhìn phát biết ngay. Cố ý vẽ nét MẢNH và để hở lòng ô, không che nét tô của em. */
    /* Nhóm xếp NGANG (bốn ô A B C D) thì ghi nhãn phía trên; nhóm xếp DỌC (cột chữ số của
       phần trả lời ngắn) thì ghi bên trái. Ghi sai phía là nhãn rơi vào lòng ô kế bên -
       người soi đọc lệch đúng một ô mà không hề biết, hỏng cả việc soi. */
    const rongNhom = Math.max(...oCung.map(v => v.x)) - Math.min(...oCung.map(v => v.x));
    const caoNhom = Math.max(...oCung.map(v => v.y)) - Math.min(...oCung.map(v => v.y));
    const xepDoc = caoNhom > rongNhom;

    const nhan = oCung.map(v => {
      const ten2 = v.ma.split(':').pop();
      const cx = (v.x - x0) * ti, cy = (v.y - y0) * ti, rr = v.r * ti;
      const tx = xepDoc ? cx - rr * 2.1 : cx;
      const ty = xepDoc ? cy + rr * 0.38 : cy - rr * 1.55;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(rr * 1.28).toFixed(1)}"`
        + ` fill="none" stroke="#e11d48" stroke-width="${Math.max(1, rr * 0.09).toFixed(1)}"/>`
        + `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="#e11d48"`
        + ` font-size="${(rr * 1.05).toFixed(1)}" font-family="sans-serif" font-weight="bold"`
        + ` text-anchor="middle">${ten2 === '&' ? '&amp;' : ten2}</text>`;
    }).join('');

    await sharp(join(THU_MUC, ten))
      .extract({ left: Math.round(x0), top: Math.round(y0), width: w, height: h })
      .resize({ width: w2, kernel: 'nearest' })
      .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w2}" height="${h2}">${nhan}</svg>`), top: 0, left: 0 }])
      .png()
      .toFile(join(RA, tep));

    /* Máy đọc ô nào ở ĐÚNG chỗ này. Trả lời ngắn thì khoá đáp án chỉ là "TLN:câu" còn cờ
       gắn theo từng cột "TLN:câu:cột", nên phải bóc ký tự của cột ấy ra. */
    const pc = dau.ma.split(':');
    const mayDoc = pc[0] === 'TLN'
      ? (String(kq.traLoi[`TLN:${pc[1]}`] ?? '')[Number(pc[2])] ?? '').trim()
      : (kq.traLoi[dau.ma] ?? '');

    soTay.push({
      anh: ten, cau: dau.ma, kieu: dau.kieu, viSao: dau.viSao,
      mayDoc,
      o: oCung.map(v => ({ nhan: v.ma.split(':').pop(), dam: +(damCua.get(v.ma) ?? 0).toFixed(3) }))
             .sort((a, b) => b.dam - a.dam),
      tep,
    });
  }
  console.log(`${ten}: cắt ${co.length} chỗ`);
}
writeFileSync(join(RA, 'so-tay.json'), JSON.stringify(soTay, null, 2));
console.log('');
if (!soTay.length) {
  console.log('Không tờ nào bị gắn cờ - máy đọc dứt khoát hết. Không cần soi gì thêm.');
} else {
  console.log(`Tổng ${soTay.length} chỗ cần soi -> ${RA}/`);
  console.log('Đọc so-tay.json, mở từng ảnh PNG bằng Read, rồi ghi phán xử vào phan-xu.json.');
}
rmSync(TAM, { recursive: true, force: true });
