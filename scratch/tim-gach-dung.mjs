// In các run chữ còn dấu gạch đứng trong một tệp docx (mượn cách đọc zip của soi-word)
import { readFileSync } from 'fs';
import { inflateRawSync } from 'zlib';
const tep = process.argv[2];
const buf = readFileSync(tep);
const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
const n = buf.readUInt16LE(eocd + 10), cd = buf.readUInt32LE(eocd + 16);
let p = cd;
for (let i = 0; i < n; i++) {
  const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
  const name = buf.toString('utf8', p + 46, p + 46 + nl), off = buf.readUInt32LE(p + 42), comp = buf.readUInt16LE(p + 10), csz = buf.readUInt32LE(p + 20);
  if (name === 'word/document.xml') {
    const lnl = buf.readUInt16LE(off + 26), lel = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lnl + lel, off + 30 + lnl + lel + csz);
    const xml = (comp === 8 ? inflateRawSync(data) : data).toString('utf8');
    const chu = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]);
    for (const c of chu) if (/\|[^|]*\|/.test(c)) console.log(JSON.stringify(c.slice(0, 200)));
  }
  p += 46 + nl + el + cl;
}
