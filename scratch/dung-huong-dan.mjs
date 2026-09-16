// Dựng src/utils/noiDungHuongDan.ts TỪ docs/huong-dan-soan-bai.md. Bản Node của
// scratch/dung-huong-dan.py — máy có Python 3.10 (python/py), hai bản cho ra cùng một tệp,
// dùng bản nào tiện thì dùng. Một nguồn duy nhất: sửa tệp .md rồi chạy:
//   node scratch/dung-huong-dan.mjs      hoặc      python scratch/dung-huong-dan.py
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('docs/huong-dan-soan-bai.md', 'utf8').replace(/\r\n/g, '\n');
const body = src.split('\n').slice(1).join('\n').replace(/^\n+/, '');
const esc = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const out = `/**
 * Noi dung trang huong dan soan bai - MOT nguon dung cho ca hai cho:
 * hop "Huong dan" trong trinh soan va tep docs/huong-dan-soan-bai.md.
 *
 * SUA O docs/huong-dan-soan-bai.md roi chay python scratch/dung-huong-dan.py
 * (hoac node scratch/dung-huong-dan.mjs - hai ban ra cung mot tep),
 * dung sua thang tep nay.
 */

export const NOI_DUNG_HUONG_DAN = \`${esc}\`;
`;
writeFileSync('src/utils/noiDungHuongDan.ts', out);
console.log('xong,', esc.length, 'kí tự');
