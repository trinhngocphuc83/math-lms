/**
 * Chạy TOÀN BỘ đường chấm trên ẢNH THẬT của học sinh, ngoài trình duyệt.
 *
 * Dùng đúng bộ của app: docQRPhieu -> dựng lưới từ bộ đề thật -> docPhieuQuet.
 * Và so hai cách quyết định trên CÙNG một phép đo độ đậm:
 *    CŨ  - ngưỡng cứng 0,42, trượt ngưỡng thì im lặng
 *    MỚI - ngưỡng riêng từng tờ, có vết mà chưa đủ đậm thì báo ngờ
 *
 *   node --experimental-strip-types scratch/cham-anh-that.mjs "G:/My Drive/Ảnh chấm toán 12"
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';
import sharp from 'sharp';

const THU_MUC = process.argv[2] || 'G:/My Drive/Ảnh chấm toán 12';

const TAM = join(process.cwd(), '.tam-cham');
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
const { docPhieuQuet } = await import(pathToFileURL(join(TAM, 'docPhieuQuet.ts')).href);
const { dungLuoi } = await import(pathToFileURL(join(TAM, 'luoiToTron.ts')).href);
const { chiaPhanDeThi } = await import(pathToFileURL(join(TAM, 'deThi.ts')).href);
const { khoiPhieuTuCacPhan } = await import(pathToFileURL(join(TAM, 'phieuTraLoi.ts')).href);

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Ảnh JPEG -> mảng RGBA như ImageData của trình duyệt. */
async function docAnh(tep) {
  const { data, info } = await sharp(tep).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

/** Bản CŨ: gọi jsQR đúng một lần trên ảnh gốc. */
const docQRCu = (anh) => {
  try {
    const kq = jsQR(anh.data, anh.width, anh.height, { inversionAttempts: 'attemptBoth' });
    return kq?.data ? phanTichMaPhieu(kq.data) : null;
  } catch { return null; }
};

/**
 * Cách quyết định CŨ, tính lại từ chính độ đậm đã đo, và GỘP cột trả lời ngắn thành câu
 * y như docPhieuQuet - không gộp thì bản cũ đếm 52 "câu" còn bản mới đếm 34, so vô nghĩa.
 */
const MUC_CU = 0.42, CACH_BIET = 0.18;
function quyetDinhCu(luoi, damCua) {
  const nhom = new Map();
  for (const x of luoi.o) {
    const p = x.ma.split(':');
    const khoa = p[0] === 'NLC' ? `NLC:${p[1]}` : `${p[0]}:${p[1]}:${p[2]}`;
    (nhom.get(khoa) || nhom.set(khoa, []).get(khoa)).push(x);
  }
  const chon = new Map(), ngoO = new Set();
  for (const [khoa, ds] of nhom) {
    const xep = ds.map(x => ({ nhan: x.nhan, dam: damCua.get(x.ma) ?? 0 })).sort((a, b) => b.dam - a.dam);
    const nhat = xep[0], nhi = xep[1];
    if (!nhat || nhat.dam < MUC_CU) { chon.set(khoa, null); continue; }   // im lặng
    if (nhi && nhat.dam - nhi.dam < CACH_BIET) { chon.set(khoa, null); ngoO.add(khoa); continue; }
    chon.set(khoa, nhat.nhan);
  }
  /* Gộp bốn cột của một câu trả lời ngắn thành một đáp số, y như bộ đọc thật. */
  let doc = 0, ngo = 0, sot = 0;
  const cauTLN = new Set(luoi.o.filter(x => x.ma.startsWith('TLN:')).map(x => `TLN:${x.ma.split(':')[1]}`));
  for (const [khoa, c] of chon) {
    if (khoa.startsWith('TLN:')) continue;
    if (c) doc++; else if (ngoO.has(khoa)) ngo++; else sot++;
  }
  for (const cau of cauTLN) {
    const so = cau.split(':')[1];
    let chuoi = '', hong = false;
    for (let c = 0; c < 4; c++) {
      const k = `TLN:${so}:${c}`;
      if (!chon.has(k)) continue;
      if (ngoO.has(k)) { hong = true; break; }
      chuoi += chon.get(k) ?? '';
    }
    if (hong) ngo++; else if (chuoi) doc++; else sot++;
  }
  return { doc, ngo, sot };
}

/* ---------- Chạy ---------- */
const tepAnh = readdirSync(THU_MUC).filter(t => /\.(jpe?g|png)$/i.test(t)).sort();
console.log(`${tepAnh.length} ảnh trong ${THU_MUC}\n`);

const luoiCua = new Map();
async function layLuoi(boDeId) {
  if (luoiCua.has(boDeId)) return luoiCua.get(boDeId);
  const { data } = await sb.from('bo_de_thi').select('*').eq('id', boDeId).maybeSingle();
  if (!data) { luoiCua.set(boDeId, null); return null; }
  const cacPhan = chiaPhanDeThi(data.cau_hoi || []);
  const trang = dungLuoi(khoiPhieuTuCacPhan(cacPhan));
  luoiCua.set(boDeId, { ten: data.ten, trang });
  return luoiCua.get(boDeId);
}

let qrCu = 0, qrMoi = 0, coMaHS = 0;
let tDocCu = 0, tSotCu = 0, tNgoCu = 0, tDocMoi = 0, tSotMoi = 0, tNgoMoi = 0;
let tMoMoi = 0;

console.log('ảnh                    | QR cũ | QR mới | mã em  | CŨ đọc/sót/ngờ | MỚI đọc/sót/ngờ');
console.log('---------------------- | ----- | ------ | ------ | -------------- | ---------------');
for (const t of tepAnh) {
  const anh = await docAnh(join(THU_MUC, t));
  const kCu = docQRCu(anh);
  const kMoi = docQRPhieu(anh, jsQR);
  if (kCu) qrCu++;
  if (kMoi) qrMoi++;
  if (kMoi?.ma.hs) coMaHS++;

  let cot = '     -          |        -';
  if (kMoi) {
    const bo = await layLuoi(kMoi.ma.boDeId);
    const luoi = bo?.trang.find(x => x.trang === kMoi.ma.trang) || bo?.trang[0];
    if (luoi) {
      const kq = docPhieuQuet(anh, luoi);
      if (kq.timDuocNeo) {
        const damCua = new Map(kq.o.map(x => [x.ma, x.dam]));
        const cu = quyetDinhCu(luoi, damCua);
        /* Đếm theo CÂU: trắc nghiệm mỗi câu một, Đúng/Sai mỗi ý một, trả lời ngắn
           mỗi câu một (không phải mỗi cột một). */
        const soCau = new Set(luoi.o.map(x => {
          const p = x.ma.split(':');
          return p[0] === 'NLC' ? `NLC:${p[1]}` : p[0] === 'DS' ? `DS:${p[1]}:${p[2]}` : `TLN:${p[1]}`;
        })).size;
        const docMoi = Object.keys(kq.traLoi).length;
        const ngoMoi = kq.khongChac.length;
        const moMoi = (kq.netMo || []).length;
        const sotMoi = soCau - docMoi - ngoMoi;
        tDocCu += cu.doc; tSotCu += cu.sot; tNgoCu += cu.ngo;
        tDocMoi += docMoi; tSotMoi += Math.max(0, sotMoi); tNgoMoi += ngoMoi; tMoMoi += moMoi;
        cot = `  ${String(cu.doc).padStart(3)}/${String(cu.sot).padStart(3)}/${String(cu.ngo).padStart(3)}   `
            + ` |   ${String(docMoi).padStart(3)}/${String(Math.max(0, sotMoi)).padStart(3)}/${String(ngoMoi).padStart(3)} | mờ ${String(moMoi).padStart(2)}`;
      } else cot = `  KHÔNG TÌM ĐƯỢC NEO`;
    } else cot = '  không dựng được lưới';
  }
  console.log(`${t.padEnd(22)} |   ${kCu ? '✓' : '✗'}   |   ${kMoi ? '✓' : '✗'}    | ${(kMoi?.ma.hs || '-').padEnd(6)} | ${cot}`);
}

console.log(`\nĐọc được mã QR: cũ ${qrCu}/${tepAnh.length} · mới ${qrMoi}/${tepAnh.length} · có mã học sinh ${coMaHS}`);
console.log(`Câu: CŨ đọc ${tDocCu} · bỏ sót IM LẶNG ${tSotCu} · báo ngờ ${tNgoCu}`);
console.log(`     MỚI đọc ${tDocMoi} · bỏ sót ${tSotMoi} · báo ngờ ${tNgoMoi} · gắn cờ MỜ ${tMoMoi}`);
rmSync(TAM, { recursive: true, force: true });
