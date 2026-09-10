/**
 * Kiểm đúng hai chỗ vừa sửa, không dựng cả tệp phiếu (dựng cả tệp cần canvas của trình
 * duyệt nên chạy ngoài trình duyệt thì treo):
 *
 *   1. `daiNeoDauTrang` có nhét được ảnh QR và in tên em ra chữ không.
 *   2. Word có cho MỖI SECTION một dải đầu trang riêng không - đây là chỗ quyết định,
 *      vì in cả lớp mà chung một dải thì 17 em đeo chung mã của một em.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { inflateRawSync } from 'zlib';
import { Document, Packer, Header, Footer, SectionType, Paragraph } from 'docx';

const TAM = join(process.cwd(), '.tam-dai');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
globalThis.window ??= { atob: (s) => Buffer.from(s, 'base64').toString('binary') };

const { daiNeoDauTrang, daiNeo, anhQR, noiDungQR, maHocSinhNgan, TRANG_CHUAN, KIEU_MAC_DINH } =
  await import(pathToFileURL(join(TAM, 'mauDeThi.ts')).href);

const EM = [
  { id: 'e092a6aa-0000-4000-8000-000000000001', ten: 'Nguyễn Anh Minh' },
  { id: 'aa11bb22-0000-4000-8000-000000000002', ten: 'Trần Thu Hà' },
  { id: 'cc33dd44-0000-4000-8000-000000000003', ten: 'Lê Văn Nam' },
];

const cacSection = [];
for (let i = 0; i < EM.length; i++) {
  const ma = maHocSinhNgan(EM[i].id);
  const qr = await anhQR(noiDungQR({ boDeId: 'bo-thu', maDe: '102', loai: 'pt', trang: 0, hs: ma }), 52);
  cacSection.push({
    properties: { ...TRANG_CHUAN, type: i === 0 ? SectionType.CONTINUOUS : SectionType.NEXT_PAGE },
    headers: { default: new Header({ children: [daiNeoDauTrang({
      maDe: '102', loai: 'pt', hs: ma, tenHS: EM[i].ten, qr,
    })] }) },
    footers: { default: new Footer({ children: [daiNeo()] }) },
    children: [new Paragraph({ text: `Phiếu của ${EM[i].ten}` })],
  });
}

const buf = await Packer.toBuffer(new Document({ styles: KIEU_MAC_DINH, sections: cacSection }));
writeFileSync('scratch/dai-dau-trang-thu.docx', Buffer.from(buf));
console.log(`Dựng tệp thử ${Math.round(buf.length / 1024)} KB\n`);

/* Bóc zip */
const b = Buffer.from(buf);
const tep = {};
for (let p = b.length - 22; p >= 0; p--) {
  if (b.readUInt32LE(p) !== 0x06054b50) continue;
  let off = b.readUInt32LE(p + 16);
  for (let i = 0, n = b.readUInt16LE(p + 10); i < n; i++) {
    const ten = b.slice(off + 46, off + 46 + b.readUInt16LE(off + 28)).toString();
    const nen = b.readUInt32LE(off + 20), lo = b.readUInt32LE(off + 42);
    const ln = b.readUInt16LE(lo + 26), le = b.readUInt16LE(lo + 28);
    try {
      tep[ten] = b.readUInt16LE(off + 10) === 0
        ? b.slice(lo + 30 + ln + le, lo + 30 + ln + le + nen).toString('utf8')
        : inflateRawSync(b.slice(lo + 30 + ln + le, lo + 30 + ln + le + nen)).toString('utf8');
    } catch { /* tệp ảnh, bỏ qua */ }
    off += 46 + b.readUInt16LE(off + 28) + b.readUInt16LE(off + 30) + b.readUInt16LE(off + 32);
  }
  break;
}

const dsHeader = Object.keys(tep).filter(x => /^word\/header\d*\.xml$/.test(x)).sort();
console.log(`Dải đầu trang riêng: ${dsHeader.length}/${EM.length} `
  + (dsHeader.length === EM.length ? '✓ mỗi em một dải' : '✗ CHUNG DẢI - cả lớp đeo một mã'));

for (const h of dsHeader) {
  const chu = [...tep[h].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('');
  const coQR = /<w:drawing|<a:blip/.test(tep[h]);
  console.log(`   ${h.padEnd(20)} QR:${coQR ? '✓' : '✗'}  chữ: "${chu.trim()}"`);
}

const soAnh = Object.keys(tep).filter(x => /^word\/media\//.test(x)).length;
console.log(`\nSố ảnh nhúng trong tệp: ${soAnh} (mỗi em một mã QR riêng)`);
rmSync(TAM, { recursive: true, force: true });
