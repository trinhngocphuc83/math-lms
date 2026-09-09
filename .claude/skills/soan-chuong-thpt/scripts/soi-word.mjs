/**
 * Soi tệp Word vừa xuất. Mấy kiểu hỏng ở đây đều là HỎNG IM LẶNG - mở ra mới thấy, mà
 * tài liệu 200 câu thì không ai đọc hết, nên phải kiểm bằng máy trước khi gửi.
 *
 *   node .claude/skills/soan-chuong-thpt/scripts/soi-word.mjs scratch/word/<thư mục hoặc tệp>
 *
 * Cần thấy gì: rác = 0 ở mọi cột. Công thức phải là <m:oMath> chứ không phải chữ "\frac".
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { inflateRawSync } from 'zlib';
import { join } from 'path';

const DUONG = process.argv[2];
if (!DUONG) { console.error('Thiếu đường dẫn tệp .docx hoặc thư mục chứa chúng'); process.exit(1); }

function docXml(tep) {
  const b = readFileSync(tep);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('không phải tệp zip hợp lệ');
  let p = dv.getUint32(eocd + 16, true);
  let xml = '', kieu = '';
  const anh = [];
  for (let k = 0; k < dv.getUint16(eocd + 10, true); k++) {
    const n = dv.getUint16(p + 28, true), e = dv.getUint16(p + 30, true), c = dv.getUint16(p + 32, true);
    const ten = b.slice(p + 46, p + 46 + n).toString();
    const nen = dv.getUint32(p + 20, true);
    if (ten.startsWith('word/media/')) anh.push(nen);
    if (ten === 'word/document.xml' || ten === 'word/styles.xml') {
      const off = dv.getUint32(p + 42, true);
      const ln = dv.getUint16(off + 26, true), le = dv.getUint16(off + 28, true);
      const ra = inflateRawSync(b.slice(off + 30 + ln + le, off + 30 + ln + le + nen)).toString('utf8');
      if (ten === 'word/document.xml') xml = ra; else kieu = ra;
    }
    p += 46 + n + e + c;
  }
  return { xml, kieu, anh, kb: Math.round(b.length / 1024) };
}

const goXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/* Màu do chính tài liệu chương đặt cho tiêu đề mục, không phải màu app rơi vào chữ */
const MAU_TIEU_DE = new Set(['1F3864', '555555', 'B3261E']);

const dsTep = statSync(DUONG).isDirectory()
  ? readdirSync(DUONG).filter(x => x.endsWith('.docx') && !x.startsWith('~$')).sort().map(x => join(DUONG, x))
  : [DUONG];

let tThe = 0, tLatex = 0, tSao = 0, tMau = 0, tCT = 0, tAnh = 0, tBang = 0, tGachDung = 0;
const viDu = [];
console.log(`${DUONG}\n`);
console.log('    KB | công thức |  thẻ | LaTeX thô | dấu sao | chữ màu | bảng | gạch đứng | tệp');
for (const tep of dsTep) {
  const { xml, kieu, anh, kb } = docXml(tep);
  const chu = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => goXml(m[1]));

  const the = chu.filter(c => /<\s*\/?\s*(span|div|p|br|section)\b|style="|class="/i.test(c));
  const latex = chu.filter(c => /\\(frac|sqrt|int|sum|lim|left|right|begin|alpha|Delta|neq)/.test(c));
  const sao = chu.filter(c => /\*/.test(c));

  /* Phần lý thuyết mới soi màu; phần đề giữ nguyên bảng màu của Quản lý Đề thi */
  const cat = xml.indexOf('BÀI TẬP TỰ LUYỆN');
  const lt = cat > 0 ? xml.slice(0, cat) : '';
  const mau = [...lt.matchAll(/<w:color w:val="([0-9A-Fa-f]{6})"\s*\/>/g)]
    .map(m => m[1].toUpperCase()).filter(m => m !== '000000' && !MAU_TIEU_DE.has(m));

  /* BẢNG. Bộ dựng giáo án trước đây không biết bảng markdown, nên mọi dòng "| Bước |
     Bấm |" in ra nguyên dấu gạch đứng giữa bài - mục bấm máy Casio nào cũng có bảng nên
     hỏng là hỏng khắp. Đếm cả hai chiều: bảng dựng thật, và chữ còn dấu gạch đứng. */
  const bang = (xml.match(/<w:tbl>/g) || []).length;
  const gachDung = chu.filter(c => /\|[^|]*\|/.test(c));

  const ct = (xml.match(/<m:oMath[ >]/g) || []).length;
  tThe += the.length; tLatex += latex.length; tSao += sao.length; tMau += mau.length;
  tBang += bang; tGachDung += gachDung.length;
  tCT += ct; tAnh += anh.length;
  for (const [nhan, ds] of [['thẻ', the], ['LaTeX thô', latex], ['dấu sao', sao]])
    if (ds.length && viDu.length < 8) viDu.push(`${nhan} · ${tep.split(/[\\/]/).pop()} · ${ds[0].slice(0, 80)}`);

  console.log(`${String(kb).padStart(6)} | ${String(ct).padStart(9)} | ${String(the.length).padStart(4)} | `
    + `${String(latex.length).padStart(9)} | ${String(sao.length).padStart(7)} | ${String(mau.length).padStart(7)} | `
    + `${String(bang).padStart(4)} | ${String(gachDung.length).padStart(9)} | `
    + tep.split(/[\\/]/).pop());
  if (!kieu.includes('Times New Roman'))
    console.log('        ⚠ phông mặc định không phải Times New Roman - có truyền KIEU_MAC_DINH chưa?');
}

console.log('\n═══ TỔNG ═══');
console.log(`   công thức dựng thật (<m:oMath>) : ${tCT}`);
console.log(`   ảnh                             : ${tAnh}`);
console.log(`   thẻ HTML lọt ra thành chữ       : ${tThe}`);
console.log(`   chữ thô còn lệnh LaTeX          : ${tLatex}`);
console.log(`   dấu sao markdown còn sót        : ${tSao}`);
console.log(`   chữ còn tô màu ở phần lý thuyết : ${tMau}`);
console.log(`   bảng dựng thật (<w:tbl>)        : ${tBang}`);
console.log(`   dòng còn in ra dấu gạch đứng    : ${tGachDung}`);
for (const v of viDu) console.log(`      ${v}`);
console.log(tThe + tLatex + tSao + tMau === 0 ? '\n   ✓ sạch' : '\n   ✗ còn rác, xem ví dụ bên trên');
