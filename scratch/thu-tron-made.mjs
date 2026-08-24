// Kiểm bộ trộn mã đề: đảo phương án xong thì đáp án đúng có còn trỏ ĐÚNG NỘI DUNG cũ không.
//
// Dựng một tệp .ts tạm gồm hai hàm phụ thuộc rút gọn + nguyên văn tronMaDe.ts + phần
// kiểm, rồi để Node tự bóc kiểu. Không tự cắt kiểu bằng biểu thức chính quy vì cắt
// hụt một chỗ là hỏng cả bài kiểm.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const nguon = fs.readFileSync('D:/claude/math-lms/src/utils/tronMaDe.ts', 'utf8')
  .replace(/^import .*$/gm, '');

const bai = `
const toBankType = (v: any) => { const t = String(v || '').toUpperCase(); return ['NLC','DS','TLN','TL'].includes(t) ? t : 'NLC'; };
const chiaPhanDeThi = (ds: any[]) => ['NLC','DS','TLN','TL']
  .map(ma => ({ ma, cauHoi: ds.filter(q => toBankType(q.question_type) === ma) }))
  .filter(p => p.cauHoi.length > 0);

${nguon}

const O = ['option_a', 'option_b', 'option_c', 'option_d'];
const cauNLC = (i: number) => ({ question_id: 'N' + i, question_type: 'NLC',
  option_a: 'A' + i, option_b: 'B' + i, option_c: 'C' + i, option_d: 'D' + i,
  correct_answer: 'ABCD'[i % 4] });
const cauDS = (i: number) => ({ question_id: 'S' + i, question_type: 'DS',
  option_a: 'y1-' + i, option_b: 'y2-' + i, option_c: 'y3-' + i, option_d: 'y4-' + i,
  correct_answer: 'ĐSSĐ' });

const goc: any[] = [...Array(8)].map((_, i) => cauNLC(i)).concat([...Array(3)].map((_, i) => cauDS(i)));
const noiDungDung = (q: any) => q[O['ABCD'.indexOf(String(q.correct_answer).trim().toUpperCase())]];
const dung = (ch: string) => ch === 'Đ' || ch === 'D' || ch === 'T';

let loi = 0, daKiem = 0;
const cacMa = taoCacMaDe(goc, 4, '101');

for (const md of cacMa) {
  for (const q of md.cauHoi as any[]) {
    const g: any = goc.find(x => x.question_id === q.question_id);
    daKiem++;
    if (q.question_type === 'NLC') {
      if (noiDungDung(q) !== noiDungDung(g)) {
        loi++; console.log('SAI [ma ' + md.ma + '] ' + q.question_id + ': dap an tro "' + noiDungDung(q) + '", goc "' + noiDungDung(g) + '"');
      }
      if (new Set(O.map(k => q[k])).size !== 4) {
        loi++; console.log('SAI [ma ' + md.ma + '] ' + q.question_id + ': phuong an bi lap hoac mat');
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const nd = q[O[i]];
        const j = O.findIndex(k => g[k] === nd);
        if (dung(String(q.correct_answer).charAt(i)) !== dung(String(g.correct_answer).charAt(j))) {
          loi++; console.log('SAI [ma ' + md.ma + '] ' + q.question_id + ' y "' + nd + '": trang thai Dung/Sai khong di theo y');
        }
      }
    }
  }
}

const thuTu = cacMa.map(m => m.cauHoi.map((q: any) => q.question_id).join(','));
const khongLan = cacMa.every(m => /^N+D+$/.test(m.cauHoi.map((q: any) => (q.question_type === 'NLC' ? 'N' : 'D')).join('')));

console.log('');
console.log('Da kiem ' + daKiem + ' cau · so loi: ' + loi);
console.log('ma dau giu nguyen thu tu goc : ' + (thuTu[0] === goc.map(q => q.question_id).join(',')));
console.log('bon ma co thu tu khac nhau   : ' + (new Set(thuTu).size === 4));
console.log('khong dao lan giua cac phan  : ' + khongLan);
console.log('dap an ma 101: ' + bangDapAn(cacMa)[0].dapAn.join(' '));
console.log('dap an ma 102: ' + bangDapAn(cacMa)[1].dapAn.join(' '));
`;

const tam = path.join('D:/claude/math-lms/scratch', '_thu-tron-tam.ts');
fs.writeFileSync(tam, bai, 'utf8');
try {
  const ra = execFileSync(process.execPath, ['--experimental-strip-types', tam], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(ra);
} catch (e) {
  console.log(e.stdout || '');
  console.error(String(e.stderr || e.message).split('\n').slice(0, 12).join('\n'));
} finally {
  fs.unlinkSync(tam);
}
