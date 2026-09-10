/**
 * Xuất một CHƯƠNG ra Word bản giáo viên, dùng đúng bộ dựng của app.
 *
 * Hai bộ của app được gọi lại nguyên vẹn thay vì dựng bản thứ hai:
 *   - `noiDungGiaoAnSangWord` (giaoAnWord.ts)  cho lý thuyết và phân dạng
 *   - `dungNoiDungWord` (exportDocx.ts)        cho bài tập và đề, y như Quản lý Đề thi
 * Dựng bản riêng là sớm muộn cũng lệch: bản cũ từng ngắt trang ở mỗi dấu "---" nên đọc
 * không liền mạch, bỏ mất câu hỏi tương tác, và sai phông chữ.
 *
 * Cách chạy (từ gốc repo):
 *   node --experimental-strip-types .claude/skills/soan-chuong-thpt/scripts/xuat-chuong-word.mjs \
 *        --lop 12 --chuong "NGUYÊN HÀM" --cuoi "Cuối chương 4" [--tach] [--anh-goc]
 *
 *   --tach     mỗi bài một tệp (nên dùng): MathType chuyển 3000 công thức trong một tệp
 *              sẽ treo; mỗi tệp 300-600 công thức thì chuyển được
 *   --anh-goc  không nén ảnh (mặc định có nén)
 *
 * Vì sao cần `--experimental-strip-types`: bộ dựng của app viết bằng TypeScript. Node
 * KHÔNG chịu bóc kiểu cho tệp nằm dưới node_modules, nên thư mục tạm phải đặt ở gốc repo.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { Packer, Document, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak } from 'docx';

/* ---------- Tham số ---------- */
const CO = process.argv.slice(2);
const lay = (ten, mac) => {
  const i = CO.indexOf(`--${ten}`);
  return i >= 0 && CO[i + 1] && !CO[i + 1].startsWith('--') ? CO[i + 1] : mac;
};
const LOP = lay('lop', '12');
const TEN_CHUONG = lay('chuong', null);
const TEN_CUOI = lay('cuoi', null);          // bài "Cuối chương N" trong chuyên đề ôn tập
const TACH = CO.includes('tach') || CO.includes('--tach');
const NEN_ANH = !CO.includes('--anh-goc');
if (!TEN_CHUONG) {
  console.error('Thiếu --chuong. Ví dụ: --lop 12 --chuong "NGUYÊN HÀM" --cuoi "Cuối chương 4" --tach');
  process.exit(1);
}

/* ---------- Nạp bộ dựng của app ---------- */
const TAM = join(process.cwd(), '.tam-word');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    /* Node bóc kiểu thì đòi phần mở rộng .ts trong đường dẫn tương đối */
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}

/* Node không có window.atob và URL.createObjectURL - bộ xuất chỉ đụng tới khi câu có ẢNH */
globalThis.window ??= { atob: (s) => Buffer.from(s, 'base64').toString('binary') };
globalThis.URL.createObjectURL ??= () => '';
globalThis.URL.revokeObjectURL ??= () => {};

/* Ảnh trong kho là ảnh chụp nguyên trang, có tấm gần 6 MB. Bọc `fetch` lại để nén ngay
   lúc tải: thu bề rộng còn tối đa 1600 điểm ảnh, ép về PNG bảng màu. Giữ PNG chứ không
   đổi sang JPEG vì đây là đồ thị nét mảnh, JPEG làm nhoè viền. Nhớ theo địa chỉ để lần
   đo kích thước và lần nhúng ảnh nhận cùng một tấm, không lệch tỉ lệ. */
const { default: sharp } = await import('sharp');
const khoAnh = new Map();
const fetchGoc = globalThis.fetch;
const daNen = { truoc: 0, sau: 0, so: 0 };
globalThis.fetch = async (u, ...rest) => {
  const dc = String(u);
  if (!NEN_ANH || !/^https?:/.test(dc)) return fetchGoc(u, ...rest);
  if (khoAnh.has(dc)) return new Response(khoAnh.get(dc));
  const r = await fetchGoc(u, ...rest);
  if (!r.ok) return r;
  const goc = Buffer.from(await r.arrayBuffer());
  let ra = goc;
  try {
    const anh = sharp(goc);
    const { width } = await anh.metadata();
    ra = await (width > 1600 ? anh.resize({ width: 1600 }) : anh)
      .png({ palette: true, compressionLevel: 9 }).toBuffer();
    if (ra.length >= goc.length) ra = goc;        // nén mà phình ra thì giữ bản gốc
  } catch { ra = goc; }
  daNen.truoc += goc.length; daNen.sau += ra.length; daNen.so++;
  khoAnh.set(dc, ra);
  return new Response(ra);
};

/* Bộ đo kích thước ảnh của app dùng thẻ <img> của trình duyệt. Node không có, mà bỏ qua
   thì mấy câu có đồ thị sẽ mất hình. Đọc thẳng bề rộng/cao từ mấy byte đầu của tệp:
     PNG : dài, rộng nằm ở byte 16-24 sau chữ ký 8 byte
     JPEG: dò các đoạn SOF0..SOF3, kích thước nằm ngay sau độ dài đoạn */
function doKichThuoc(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50)
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const ma = buf[i + 1];
      if (ma >= 0xC0 && ma <= 0xC3)
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { width: 480, height: 320 };
}
globalThis.Image ??= class {
  set src(u) {
    (async () => {
      try {
        const r = await fetch(u);
        if (!r.ok) throw new Error(String(r.status));
        const kt = doKichThuoc(Buffer.from(await r.arrayBuffer()));
        this.naturalWidth = this.width = kt.width;
        this.naturalHeight = this.height = kt.height;
        this.onload?.();
      } catch { this.onerror?.(); }
    })();
  }
};

const { dungNoiDungWord } = await import(pathToFileURL(join(TAM, 'exportDocx.ts')).href);
const { noiDungGiaoAnSangWord } = await import(pathToFileURL(join(TAM, 'giaoAnWord.ts')).href);
const { latexToDocxElement } = await import(pathToFileURL(join(TAM, 'latexToDocxMath.ts')).href);
const { KIEU_MAC_DINH, TRANG_CHUAN } = await import(pathToFileURL(join(TAM, 'mauDeThi.ts')).href);

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const NAVY = '1F3864', XAM = '555555';

/* ---------- Lấy dữ liệu ---------- */
const { data: kh } = await sb.from('courses').select('id,title').ilike('title', `%${LOP}%`);
if (!kh?.length) throw new Error(`Không thấy khoá học nào có "${LOP}" trong tên`);
const { data: chBai } = await sb.from('chapters').select('id,title')
  .eq('course_id', kh[0].id).ilike('title', `%${TEN_CHUONG}%`);
if (!chBai?.length) throw new Error(`Không thấy chương "${TEN_CHUONG}" trong ${kh[0].title}`);
const { data: dsBai } = await sb.from('lessons').select('id,title')
  .eq('chapter_id', chBai[0].id).order('order_index');

let baiCC = null;
if (TEN_CUOI) {
  const { data: chOn } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).eq('loai', 'on-tap');
  if (chOn?.length) {
    const { data } = await sb.from('lessons').select('id')
      .eq('chapter_id', chOn[0].id).eq('title', TEN_CUOI).maybeSingle();
    baiCC = data;
  }
  if (!baiCC) console.log(`   ⚠ không thấy bài ôn tập "${TEN_CUOI}", bỏ qua phần đề và tổng hợp công thức`);
}

/** Mã câu gốc trong một module -> bản ghi đầy đủ từ ngân hàng, giữ đúng thứ tự trong module. */
async function cauCuaModule(dieuKien) {
  const { data: m } = await dieuKien;
  const ids = [];
  for (const k of String(m?.content_markdown || '').matchAll(/```quiz[^\n]*\n([\s\S]*?)```/g)) {
    try {
      const j = JSON.parse(k[1]);
      for (const c of (Array.isArray(j) ? j : [j])) if (c?.sourceQuestionId) ids.push(c.sourceQuestionId);
    } catch { /* khối hỏng thì bỏ */ }
  }
  if (!ids.length) return [];
  const { data: q } = await sb.from('questions').select('*').in('id', ids);
  const theoId = Object.fromEntries((q || []).map(x => [x.id, x]));
  return ids.map(i => theoId[i]).filter(Boolean);
}

/** Chuỗi lẫn chữ và công thức `$...$` -> mảng phần tử Word. */
function dungHonHop(chuoi, co, kieu) {
  const ra = [];
  let cuoi = 0, m;
  const re = /\$([^$]+)\$/g;
  while ((m = re.exec(chuoi))) {
    if (m.index > cuoi) ra.push(new TextRun({ text: chuoi.slice(cuoi, m.index), size: co, ...kieu }));
    try { const e = latexToDocxElement(m[1]); Array.isArray(e) ? ra.push(...e) : e && ra.push(e); }
    catch { ra.push(new TextRun({ text: m[1], italics: true, size: co, ...kieu })); }
    cuoi = m.index + m[0].length;
  }
  if (cuoi < chuoi.length) ra.push(new TextRun({ text: chuoi.slice(cuoi), size: co, ...kieu }));
  return ra;
}

const tieuDeLon = (chu, co = 32) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 160 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: chu, bold: true, color: NAVY, size: co })],
});

/* ---------- Dựng từng tập ---------- */
const tap = [];
/* Bài "Ôn tập chương" thường chưa có lý thuyết lẫn bài tập riêng - bỏ qua chứ đừng đẻ
   ra một tệp rỗng làm thầy cô mở nhầm. */
const themTap = (ten, nhan, doan) => { if (doan.length) tap.push({ ten, nhan, doan }); };

/* 1. Bảng tổng hợp công thức cả chương (module lý thuyết của bài Cuối chương) */
if (baiCC) {
  const { data: modCT } = await sb.from('lesson_modules').select('content_markdown')
    .eq('lesson_id', baiCC.id).eq('type', 'theory').maybeSingle();
  if (modCT?.content_markdown) {
    const ra = [tieuDeLon('TỔNG HỢP CÔNG THỨC CẢ CHƯƠNG')];
    let soCT = 0;
    for (const d of String(modCT.content_markdown).split('\n')) {
      const t = d.trim();
      if (/^##\s/.test(t)) {
        ra.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: t.replace(/^#+\s*/, '').replace(/[💡📌]/g, '').trim(), bold: true, color: NAVY, size: 26 })] }));
        continue;
      }
      if (!t.startsWith('-')) continue;
      /* Tách cột bằng "|", nhưng "|" trong công thức (trị tuyệt đối) không phải vách cột */
      const cot = []; let dem = '', trong = false;
      for (const ch of t.replace(/^-\s*/, '')) {
        if (ch === '$') trong = !trong;
        if (ch === '|' && !trong) { cot.push(dem); dem = ''; continue; }
        dem += ch;
      }
      cot.push(dem);
      if (cot.length < 2) continue;
      soCT++;
      ra.push(new Paragraph({ spacing: { before: 90, after: 60 }, indent: { left: 200 },
        children: [
          new TextRun({ text: `${soCT}. ${cot[0].replace(/\*\*/g, '').trim()}:  `, bold: true, size: 23 }),
          ...dungHonHop(cot[1].trim(), 24, {}),
          /* Cột ghi chú cũng phải dựng công thức: xoá trắng dấu $ thì "$\alpha \neq -1$"
             in ra thành chữ thô. */
          ...(cot[2] ? dungHonHop(`  — ${cot[2].trim()}`, 21, { italics: true, color: XAM }) : []),
        ] }));
    }
    themTap('00-Tong-hop-cong-thuc', `TỔNG HỢP CÔNG THỨC · ${soCT} công thức`, ra);
  }
}

/* 2. Mỗi bài một tập: lý thuyết và phân dạng, rồi bài tập tự luyện của chính bài đó */
let soBai = 0;
for (const b of (dsBai || []).filter(x => /^Bài \d+\./.test(x.title))) {
  soBai++;
  const ra = [];
  const { data: m } = await sb.from('lesson_modules').select('content_markdown')
    .eq('lesson_id', b.id).eq('type', 'theory').maybeSingle();
  if (m?.content_markdown) {
    ra.push(tieuDeLon('LÝ THUYẾT VÀ PHÂN DẠNG BÀI TẬP'));
    ra.push(...await noiDungGiaoAnSangWord(m.content_markdown, 'teacher'));
    ra.push(new Paragraph({ children: [new PageBreak()] }));
  } else {
    console.log(`   ✗ ${b.title}: chưa có lý thuyết`);
  }
  const cau = await cauCuaModule(sb.from('lesson_modules').select('content_markdown')
    .eq('lesson_id', b.id).eq('title', 'Bài tập tự luyện').maybeSingle());
  if (cau.length) {
    ra.push(tieuDeLon(`BÀI TẬP TỰ LUYỆN — ${b.title.toUpperCase()}`, 30));
    const con = await dungNoiDungWord(cau, 'teacher');
    if (con?.length) ra.push(...con);
  }
  const ten = `0${soBai}-${b.title.replace(/^Bài \d+\.\s*/, '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-')}`;
  themTap(ten, `${b.title} · ${cau.length} câu tự luyện`, ra);
}

/* 3. Mỗi đề ôn tập cuối chương một tập */
let soDe = 0;
if (baiCC) {
  const { data: modDe } = await sb.from('lesson_modules').select('id,title')
    .eq('lesson_id', baiCC.id).eq('type', 'practice').order('order_index');
  for (const d of modDe || []) {
    const cau = await cauCuaModule(sb.from('lesson_modules').select('content_markdown').eq('id', d.id).single());
    if (!cau.length) continue;
    soDe++;
    const ra = [tieuDeLon(`${d.title} — ÔN TẬP CUỐI ${chBai[0].title}`, 30),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
        children: [new TextRun({ text: 'Thời gian 90 phút · 10 điểm', color: XAM, size: 24 })] })];
    const con = await dungNoiDungWord(cau, 'teacher');
    if (con?.length) ra.push(...con);
    themTap(`1${soDe}-${d.title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-')}`, `${d.title} · ${cau.length} câu`, ra);
  }
}

/* ---------- Ghi ra tệp ---------- */
mkdirSync('scratch/word', { recursive: true });
/* Tên thư mục KHÔNG có mốc giờ: chạy lại là ghi đè lên bản cũ, để thầy chỉ thấy một thư mục.
   Chỉ khi có tệp đang mở trong Word (ghi đè báo bận, EBUSY) mới lánh sang thư mục có mốc giờ. */
const gio = new Date().toISOString().slice(11, 16).replace(':', '');
const nhanChuong = chBai[0].title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').slice(0, 50);

const bia = () => [
  new Paragraph({ spacing: { before: 1400, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: chBai[0].title, bold: true, color: NAVY, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: kh[0].title, color: XAM, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 },
    children: [new TextRun({ text: 'TÀI LIỆU BẢN GIÁO VIÊN — có đáp án và lời giải', bold: true, color: 'B3261E', size: 24 })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

async function ghi(tenTep, doan) {
  /* Cùng phông chữ, cùng lề với bộ xuất của app - không để Word rơi về Calibri */
  const doc = new Document({ styles: KIEU_MAC_DINH, sections: [{ properties: TRANG_CHUAN, children: doan }] });
  writeFileSync(tenTep, await Packer.toBuffer(doc));
  return Math.round(readFileSync(tenTep).length / 1024);
}

console.log(`\n${chBai[0].title} · ${kh[0].title} · ${TACH ? 'mỗi bài một tệp' : 'gộp một tệp'}\n`);
const DANG_MO = (e) => e?.code === 'EBUSY' || e?.code === 'EPERM' || e?.code === 'EACCES';
let tongKB = 0;

async function xuatVaoThuMuc(thuMuc) {
  mkdirSync(thuMuc, { recursive: true });
  let kb = 0;
  const dong = [];
  for (const t of tap) {
    const n = await ghi(`${thuMuc}/${t.ten}.docx`, t.doan);
    kb += n;
    dong.push(`   ${String(n).padStart(6)} KB · ${String(t.doan.length).padStart(4)} đoạn · ${t.nhan}`);
  }
  return { kb, dong };
}

if (TACH) {
  const goc = `scratch/word/${nhanChuong}`;
  let thuMuc = goc, ket;
  try {
    ket = await xuatVaoThuMuc(goc);
  } catch (e) {
    if (!DANG_MO(e)) throw e;
    thuMuc = `${goc}-${gio}`;
    console.log(`   ⚠ Có tệp trong ${goc}/ đang mở trong Word nên không ghi đè được.`);
    console.log(`     Xuất sang ${thuMuc}/ — đóng Word rồi xoá thư mục kia đi cho gọn.\n`);
    ket = await xuatVaoThuMuc(thuMuc);
  }
  tongKB = ket.kb;
  for (const d of ket.dong) console.log(d);
  console.log(`\nĐã xuất ${tap.length} tệp vào ${thuMuc}/ · cộng ${tongKB} KB`);
} else {
  const doan = [...bia()];
  for (const t of tap) doan.push(...t.doan, new Paragraph({ children: [new PageBreak()] }));
  let tenTep = `scratch/word/${nhanChuong}-GV.docx`;
  try {
    tongKB = await ghi(tenTep, doan);
  } catch (e) {
    if (!DANG_MO(e)) throw e;
    console.log(`   ⚠ ${tenTep} đang mở trong Word nên không ghi đè được.`);
    tenTep = `scratch/word/${nhanChuong}-GV-${gio}.docx`;
    tongKB = await ghi(tenTep, doan);
  }
  console.log(`Đã xuất: ${tenTep} · ${tongKB} KB · ${doan.length} đoạn`);
}
if (daNen.so) console.log(`Ảnh: nén ${daNen.so} tấm, ${Math.round(daNen.truoc / 1024)} KB -> ${Math.round(daNen.sau / 1024)} KB`);
rmSync(TAM, { recursive: true, force: true });
