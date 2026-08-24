// Kiểm bộ đọc đáp án Đúng/Sai với ĐÚNG những kiểu viết có thật trong kho.
//
// Nạp thẳng hàm docDapAnDS từ tệp sửa, không chép lại, để cái được kiểm đúng là cái
// sắp chạy thật.
import fs from 'fs';
import { execFileSync } from 'child_process';

const nguon = fs.readFileSync('D:/claude/math-lms/scratch/sua-ngan-hang-toan.mjs', 'utf8');
const than = nguon.slice(nguon.indexOf('function docDapAnDS'), nguon.indexOf('/* ===================== NẠP DỮ LIỆU'));

const XD = String.fromCharCode(10);   // ký tự xuống dòng thật, đưa vào chuỗi thử

const bai = [
  `const T = (s) => String(s ?? '').trim();`,
  `const laDS4 = (s) => /^[ĐDTSF]{4}$/i.test(T(s));`,
  than,
  `const XD = String.fromCharCode(10);`,
  `const thu = [`,
  `  ['Đ, Đ, Đ, S', 'ĐĐĐS'],`,
  `  ['S, Đ, S, Đ', 'SĐSĐ'],`,
  `  ['A-Đ, B-S, C-S, D-Đ', 'ĐSSĐ'],`,
  `  ['A-S, B-Đ, C-Đ, D-Đ', 'SĐĐĐ'],`,
  `  ['1-S, 2-Đ, 3-S, 4-Đ', 'SĐSĐ'],`,
  `  ['1-Đ, 2-S, 3-S, 4-S', 'ĐSSS'],`,
  `  ['a) Sai, b) Đúng, c) Đúng, d) Sai', 'SĐĐS'],`,
  `  ['a) Đúng; b) Đúng; c) Sai; d) Sai', 'ĐĐSS'],`,
  `  ['Đúng, Sai, Đúng, Sai', 'ĐSĐS'],`,
  `  ['Sai, Sai, Đúng, Đúng', 'SSĐĐ'],`,
  `  ['1) Đúng' + XD + '2) Đúng' + XD + '3) Sai' + XD + '4) Đúng', 'ĐĐSĐ'],`,
  `  ['A: Đ, B: S, C: S, D: S', 'ĐSSS'],`,
  `  ['DDSS', 'ĐĐSS'],`,
  `  ['TTST', 'ĐĐSĐ'],`,
  `  ['ĐSSĐ', 'ĐSSĐ'],`,
  `  ['$2+xy$: Sai; $3xy^2z$: Đúng; $x$: Sai; $y$: Đúng', 'SĐSĐ'],`,
  `  ['Đ, S', 'KHONG-DOC'],`,
  `  ['abc', 'KHONG-DOC'],`,
  `  ['', 'KHONG-DOC'],`,
  `  ['Đúng, Sai, xanh, Đúng', 'KHONG-DOC'],`,
  `];`,
  `let sai = 0;`,
  `for (const [vao, mong] of thu) {`,
  `  const ra = docDapAnDS(vao) || 'KHONG-DOC';`,
  `  const ok = ra === mong;`,
  `  if (!ok) sai++;`,
  `  const hien = vao.split(XD).join('\\\\n').slice(0, 46);`,
  `  console.log((ok ? 'OK   ' : 'SAI  ') + '"' + hien + '" -> ' + ra + (ok ? '' : '   (mong ' + mong + ')'));`,
  `}`,
  `console.log('');`,
  `console.log('Số sai: ' + sai + '/' + thu.length);`,
].join('\n');

const tam = 'D:/claude/math-lms/scratch/_doc-tam.mjs';
fs.writeFileSync(tam, bai, 'utf8');
try {
  console.log(execFileSync(process.execPath, [tam], { encoding: 'utf8' }));
} catch (e) {
  console.log(e.stdout || '');
  console.error(String(e.stderr || '').split('\n').slice(0, 8).join('\n'));
} finally {
  fs.unlinkSync(tam);
}
