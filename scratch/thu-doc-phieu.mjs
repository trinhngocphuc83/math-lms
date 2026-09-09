/**
 * Bộ thử bộ đọc phiếu tô tròn, không cần ảnh chụp thật.
 *
 * Lưới là hình học thuần: biết tâm và bán kính từng ô, nên tự vẽ được một tờ phiếu "đã
 * tô" rồi đưa thẳng cho `docPhieuQuet` - đúng bộ đọc mà app đang chạy, không phải bản mô
 * phỏng. Đo được thì mới biết ngưỡng đang chặt hay lỏng, thay vì đoán.
 *
 * Thay đổi được: độ đậm nét tô (bút chì nhạt tới đậm), tô lem ra ngoài, ảnh tối, nhiễu.
 *
 *   node --experimental-strip-types scratch/thu-doc-phieu.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';

const TAM = join(process.cwd(), '.tam-phieu');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
const { dungLuoi } = await import(pathToFileURL(join(TAM, 'luoiToTron.ts')).href);
const { docPhieuQuet } = await import(pathToFileURL(join(TAM, 'docPhieuQuet.ts')).href);

/* Đề thật của thầy: 12 trắc nghiệm + 4 đúng/sai + 6 trả lời ngắn */
const KHOI = [
  { loai: 'NLC', soCau: 12 },
  { loai: 'DS', soCau: 4 },
  { loai: 'TLN', soCau: 6 },
];
const trang = dungLuoi(KHOI);
const luoi = trang[0];
console.log(`Lưới: ${trang.length} trang · trang 1 rộng ${luoi.rong} cao ${luoi.cao} · ${luoi.o.length} ô\n`);

/* ---------- Vẽ một tờ phiếu ---------- */

/**
 * @param toGi   map mã ô -> độ đậm nét tô 0..1 (0 là không tô)
 * @param opt.sang  độ sáng nền giấy 0..1 (1 là trắng tinh; ảnh chụp thiếu sáng thì < 1)
 * @param opt.nhieu biên độ nhiễu hạt
 * @param opt.lech  nét tô lệch tâm bao nhiêu lần bán kính
 */
function veTo(luoi, toGi, opt = {}) {
  const { sang = 1, nhieu = 0, lech = 0 } = opt;   // opt.phu: nét tô phủ mấy phần bán kính
  const W = luoi.rong, H = luoi.cao;
  const px = new Float32Array(W * H).fill(sang);

  const hinhTron = (cx, cy, r, muc, dac) => {
    const x0 = Math.max(0, Math.floor(cx - r - 2)), x1 = Math.min(W - 1, Math.ceil(cx + r + 2));
    const y0 = Math.max(0, Math.floor(cy - r - 2)), y1 = Math.min(H - 1, Math.ceil(cy + r + 2));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const trong = dac ? d <= r : (d <= r + 0.8 && d >= r - 0.8);
      if (trong) px[y * W + x] = Math.min(px[y * W + x], muc);
    }
  };
  const oVuong = (x0, y0, canh, muc) => {
    for (let y = Math.floor(y0); y < y0 + canh && y < H; y++)
      for (let x = Math.floor(x0); x < x0 + canh && x < W; x++) px[y * W + x] = muc;
  };

  for (const n of luoi.neo) oVuong(n.x, n.y, n.canh, 0.04 * sang);
  for (const m of luoi.mocDen) hinhTron(m.x, m.y, m.r, 0.04 * sang, true);
  for (const m of luoi.mocTrang) hinhTron(m.x, m.y, m.r, 0.2 * sang, false);
  for (const o of luoi.o) hinhTron(o.x, o.y, o.r, 0.2 * sang, false);

  /* Nét tô: đĩa đặc, có thể lệch tâm, mức xám tuỳ độ đậm bút chì */
  for (const o of luoi.o) {
    const dam = toGi[o.ma];
    if (!dam) continue;
    const dx = lech * o.r * (Math.random() * 2 - 1);
    const dy = lech * o.r * (Math.random() * 2 - 1);
    hinhTron(o.x + dx, o.y + dy, o.r * (opt.phu ?? 0.92), (1 - dam) * sang, true);
  }

  if (nhieu) for (let i = 0; i < px.length; i++)
    px[i] = Math.max(0, Math.min(1, px[i] + (Math.random() * 2 - 1) * nhieu));

  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < px.length; i++) {
    const v = Math.round(px[i] * 255);
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  }
  return { data, width: W, height: H };
}

/* ---------- Bài làm mẫu: tô hết mọi câu ---------- */
function baiLamDay(luoi, dam) {
  const to = {};
  const dapNLC = ['A', 'B', 'C', 'D'];
  for (const o of luoi.o) {
    const p = o.ma.split(':');
    if (p[0] === 'NLC' && o.nhan === dapNLC[Number(p[1]) % 4]) to[o.ma] = dam;
    if (p[0] === 'DS' && o.nhan === (Number(p[1]) % 2 ? 'Đ' : 'S')) to[o.ma] = dam;
    /* TLN: mỗi cột tô đúng một chữ số */
    if (p[0] === 'TLN' && o.nhan === String((Number(p[1]) + Number(p[2])) % 10)) to[o.ma] = dam;
  }
  return to;
}

/* ---------- Chạy thử ---------- */
const cauCanCo = new Set();
for (const o of luoi.o) {
  const p = o.ma.split(':');
  cauCanCo.add(p[0] === 'NLC' ? `NLC:${p[1]}` : p[0] === 'DS' ? `DS:${p[1]}:${p[2]}` : `TLN:${p[1]}`);
}
const tongCau = cauCanCo.size;

console.log('  đậm  sáng  nhiễu | đọc được | bỏ sót | báo ngờ | ghi chú');
console.log('  ---------------- | -------- | ------ | ------- | -------');
const CA = [
  { dam: 1.00, sang: 1.00, nhieu: 0,    ten: 'bút chì đậm, ảnh đẹp' },
  { dam: 0.75, sang: 1.00, nhieu: 0,    ten: 'tô vừa' },
  { dam: 0.55, sang: 1.00, nhieu: 0,    ten: 'tô hơi nhạt' },
  { dam: 0.45, sang: 1.00, nhieu: 0,    ten: 'bút chì nhạt' },
  { dam: 0.35, sang: 1.00, nhieu: 0,    ten: 'rất nhạt' },
  { dam: 0.75, sang: 0.78, nhieu: 0,    ten: 'ảnh thiếu sáng' },
  { dam: 0.75, sang: 0.60, nhieu: 0,    ten: 'ảnh tối' },
  { dam: 0.75, sang: 1.00, nhieu: 0.06, ten: 'ảnh rỗ hạt' },
  { dam: 0.55, sang: 0.78, nhieu: 0.04, ten: 'nhạt + tối + rỗ' },
  { dam: 1.00, sang: 1.00, nhieu: 0, phu: 0.80, ten: 'tô kín 80% ô' },
  { dam: 1.00, sang: 1.00, nhieu: 0, phu: 0.65, ten: 'tô kín 65% ô' },
  { dam: 1.00, sang: 1.00, nhieu: 0, phu: 0.50, ten: 'tô kín 50% ô (tô ẩu)' },
  { dam: 1.00, sang: 1.00, nhieu: 0, phu: 0.40, ten: 'chỉ chấm giữa ô' },
  { dam: 0.75, sang: 1.00, nhieu: 0, phu: 0.65, ten: 'tô vừa + kín 65%' },
  { dam: 0.60, sang: 0.85, nhieu: 0.03, phu: 0.70, ten: 'nhạt + tối + kín 70%' },
];
for (const c of CA) {
  const to = baiLamDay(luoi, c.dam);
  const anh = veTo(luoi, to, { sang: c.sang, nhieu: c.nhieu, lech: 0.12, phu: c.phu });
  const kq = docPhieuQuet(anh, luoi);
  if (!kq.timDuocNeo) { console.log(`  ${c.dam.toFixed(2)}  ${c.sang.toFixed(2)}  ${String(c.nhieu).padEnd(5)} |   KHÔNG TÌM ĐƯỢC NEO   | ${c.ten}`); continue; }
  const doc = Object.keys(kq.traLoi).length;
  const ngo = kq.khongChac.length;
  const sot = tongCau - doc - ngo;
  console.log(`  ${c.dam.toFixed(2)}  ${c.sang.toFixed(2)}  ${String(c.nhieu).padEnd(5)} | ${String(doc).padStart(4)}/${tongCau}  | ${String(sot).padStart(6)} | ${String(ngo).padStart(7)} | ${c.ten}`);
}

/* Vết bẩn giả ĐO RA bao nhiêu? Phải biết con số thật mới đặt sàn có căn cứ. */
{
  const to = {};
  const ban = luoi.o.filter((_, i) => i % 37 === 0).slice(0, 8);
  for (const o of ban) to[o.ma] = 0.15;
  const kq = docPhieuQuet(veTo(luoi, to, { lech: 0.12 }), luoi);
  const dam = kq.o.filter(x => to[x.ma]).map(x => x.dam);
  console.log('\n── Vết bẩn "0.15" đo ra: ' + dam.map(d => d.toFixed(2)).join(' ') + ' ──');
  const to2 = {}; for (const o of ban) to2[o.ma] = 0.25;
  const kq2 = docPhieuQuet(veTo(luoi, to2, { lech: 0.12 }), luoi);
  console.log('   vết "0.25" đo ra: ' + kq2.o.filter(x => to2[x.ma]).map(x => x.dam.toFixed(2)).join(' '));
}

/* ---------- Chiều ngược lại: máy có đọc BỪA không ---------- */
console.log('\n── Không được đọc bừa ──');
const maCau = (o) => { const p = o.ma.split(':'); return p[0]==='NLC'?`NLC:${p[1]}`:p[0]==='DS'?`DS:${p[1]}:${p[2]}`:`TLN:${p[1]}`; };

const thu = (ten, to, opt, mong) => {
  const kq = docPhieuQuet(veTo(luoi, to, { lech: 0.12, ...opt }), luoi);
  const doc = Object.keys(kq.traLoi).length, ngo = kq.khongChac.length, mo = (kq.netMo || []).length;
  const dat = mong(kq);
  console.log(`   ${dat ? '✓' : '✗'} ${ten.padEnd(42)} đọc ${String(doc).padStart(2)} · ngờ ${String(ngo).padStart(2)} · mờ ${String(mo).padStart(2)}`
    + (dat ? '' : `   <- KHÔNG ĐẠT`));
  return dat;
};

let datHet = true;

/* 1. Tờ trắng tinh: không được đẻ ra đáp án nào */
datHet &= thu('tờ để trắng, không tô gì', {}, {}, kq => Object.keys(kq.traLoi).length === 0);

/* 2. Chỉ làm 5 câu đầu: phải đọc đúng 5, phần còn lại để trống */
{
  const to = {};
  for (const o of luoi.o) if (o.ma.startsWith('NLC:') && Number(o.ma.split(':')[1]) <= 5 && o.nhan === 'B') to[o.ma] = 0.8;
  datHet &= thu('chỉ làm 5 câu đầu', to, {}, kq => Object.keys(kq.traLoi).length === 5);
}

/* 3a. Vết bẩn thật: loang một phần ô, lệch tâm - không được thành đáp án.
      Đo được: phủ 45% ô ở mức 0,15 thì đọc ra chỉ 0,04-0,06, thừa sức bỏ. */
{
  const to = {};
  const ban = luoi.o.filter((_, i) => i % 37 === 0).slice(0, 8);
  for (const o of ban) to[o.ma] = 0.15;
  datHet &= thu('vết bẩn loang 8 chỗ, không tô gì', to, { phu: 0.45, lech: 0.55 },
    kq => Object.keys(kq.traLoi).length === 0);
}

/* 3b. Nét chì NHẠT nhưng tô kín cả ô: đây KHÔNG phải vết bẩn, là bài làm thật của em.
      Đo trên ảnh thật: em ở câu 4 tô ra đúng 0,17, còn ô tô kín giả lập 15% ra 0,16 -
      hai thứ ấy giống hệt nhau trên ảnh, không ngưỡng nào tách được. Nên đòi "đọc 0" là
      đòi máy đánh rơi bài thật. Yêu cầu đúng: VẪN ĐỌC, nhưng câu nào cũng phải gắn cờ
      mờ để Thầy cô liếc lại - đọc mà im lặng mới là hời hợt. */
{
  const to = {};
  const ban = luoi.o.filter((_, i) => i % 37 === 0).slice(0, 8);
  for (const o of ban) to[o.ma] = 0.15;
  datHet &= thu('nét chì nhạt tô kín 8 ô -> đọc kèm cờ mờ', to, {},
    kq => Object.keys(kq.traLoi).length === 8 && (kq.netMo || []).length === 8);
}

/* 4. Tô hai ô một câu: phải BÁO NGỜ, không được chọn bừa */
{
  const to = {};
  for (const o of luoi.o) if (o.ma.startsWith('NLC:1:') && (o.nhan === 'A' || o.nhan === 'C')) to[o.ma] = 0.85;
  for (const o of luoi.o) if (o.ma.startsWith('NLC:2:') && o.nhan === 'B') to[o.ma] = 0.85;
  datHet &= thu('câu 1 tô hai ô, câu 2 tô một ô', to, {},
    kq => kq.khongChac.some(k => k.ma === 'NLC:1') && kq.traLoi['NLC:2'] === 'B');
}

/* 5. Tẩy chưa sạch: vết mờ ở ô cũ, tô đậm ô mới - phải lấy ô đậm */
{
  const to = {};
  for (const o of luoi.o) if (o.ma.startsWith('NLC:3:')) {
    if (o.nhan === 'A') to[o.ma] = 0.22;
    if (o.nhan === 'D') to[o.ma] = 0.85;
  }
  datHet &= thu('tẩy chưa sạch ô A, tô đậm ô D', to, {}, kq => kq.traLoi['NLC:3'] === 'D');
}

console.log(datHet ? '\n   ✓ không đọc bừa ca nào' : '\n   ✗ CÒN CA ĐỌC BỪA');

/* Xem thẳng mấy con số độ đậm ở ca nhạt, để biết ngưỡng 0.42 đang nằm đâu */
console.log('\n── Độ đậm đo được (ca "bút chì nhạt", 12 ô đầu) ──');
const anhNhat = veTo(luoi, baiLamDay(luoi, 0.45), { lech: 0.12 });
const kqNhat = docPhieuQuet(anhNhat, luoi);
for (const o of kqNhat.o.slice(0, 12))
  console.log(`   ${o.ma.padEnd(14)} ${o.dam.toFixed(3)}${o.dam >= 0.42 ? '  <- vượt ngưỡng 0.42' : ''}`);

rmSync(TAM, { recursive: true, force: true });
