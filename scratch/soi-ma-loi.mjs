/* Liệt kê mọi mã lỗi bộ kiểm thử sinh ra, và mã nào đã có đường sửa. */
import { readFileSync } from 'fs';

const kt = readFileSync('src/utils/kiemThuDe.ts', 'utf8');
const su = readFileSync('src/utils/suaLoiKiemThu.ts', 'utf8');

const ma = new Set();
for (const m of kt.matchAll(/themDe\(\s*'([A-Za-z0-9_]+)'\s*,\s*'([A-Za-z0-9_]+)'\s*,\s*'([A-Za-z0-9_]+)'/g))
  ma.add(`${m[1]}|${m[2]}|${m[3]}`);
for (const m of kt.matchAll(/\bma:\s*'([A-Za-z0-9_]+)'[\s\S]{0,80}?muc:\s*'([A-Za-z0-9_]+)'/g))
  ma.add(`${m[1]}|?|${m[2]}`);
for (const m of kt.matchAll(/them\(\s*'([A-Za-z0-9_]+)'\s*,\s*'([A-Za-z0-9_]+)'\s*,\s*'([A-Za-z0-9_]+)'/g))
  ma.add(`${m[1]}|${m[2]}|${m[3]}`);

/* Mã có mặt trong suaDuocBang */
const suaDuoc = new Set([...su.matchAll(/case '([A-Za-z0-9_]+)':/g)].map(m => m[1]));

const bang = [...ma].map(x => x.split('|')).sort((a, b) => a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
console.log('mã lỗi'.padEnd(26) + 'tiêu chí'.padEnd(12) + 'mức'.padEnd(10) + 'có nút sửa?');
console.log('-'.repeat(70));
let thieu = 0;
for (const [maLoi, tc, muc] of bang) {
  const co = suaDuoc.has(maLoi);
  if (!co) thieu++;
  console.log(maLoi.padEnd(26) + tc.padEnd(12) + muc.padEnd(10) + (co ? '✓' : '✗ CHƯA'));
}
console.log(`\nTổng ${bang.length} mã · chưa có nút sửa: ${thieu}`);
