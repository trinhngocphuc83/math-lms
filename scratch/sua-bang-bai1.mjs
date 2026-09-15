// Sửa hai bảng LaTeX trong bản thảo Bài 1: bỏ \color trước \begin{array} và thay \| bằng chữ KXĐ
import { readFileSync, writeFileSync } from 'fs';
const p = 'scratch/lt-l10c3-bai1.md';
let a = readFileSync(p, 'utf8');
a = a.split('$$\\color{blue} \\begin{array}').join('$$\\begin{array}');
a = a.replace(/\\\t?ext\{KXĐ\}/g, '\\text{KXĐ}');   // dọn vết lần sửa hỏng (tab lọt vào)
a = a.split('& \\| &').join('& \\text{KXĐ} &').split('& \\| \\\\').join('& \\text{KXĐ} \\\\').split('\\| &').join('\\text{KXĐ} &');
a = a.replace(/^\*\(Kí hiệu .*không xác định\.\)\*$/m, '(KXĐ: giá trị lượng giác không xác định.)');
writeFileSync(p, a);
const dong = a.split('\n');
console.log(dong[26].slice(0, 40)); console.log(dong[34].includes('\\|') ? 'còn \\|' : 'hết \\|', (a.match(/KXĐ/g) || []).length, 'KXĐ'); console.log(dong[36]);
