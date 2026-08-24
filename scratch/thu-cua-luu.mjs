// Kiểm cửa lưu chung: câu sai khuôn đưa vào thì ra cái gì.
//
// Nạp thẳng hai hàm thật (docDapAnDungSai và phần kiểm của questionBankSave) rồi cho
// chạy trên các ca hiểm, thay vì tin vào đọc mã bằng mắt.
import fs from 'fs';
import { execFileSync } from 'child_process';

const chuanHoa = fs.readFileSync('D:/claude/math-lms/src/utils/chuanHoaCauHoi.ts', 'utf8');
const docDS = chuanHoa.slice(
  chuanHoa.indexOf('/** Đáp án Đúng/Sai đã đúng khuôn'),
  chuanHoa.indexOf('export function chuanHoaCauHoi(q: {'));

const luu = fs.readFileSync('D:/claude/math-lms/src/utils/questionBankSave.ts', 'utf8');
const kiem = luu.slice(
  luu.indexOf('const thieuPhanLoaiGoc'),
  luu.indexOf('export async function saveQuestionsToBank'));

const bai = [
  docDS.replace(/^export /gm, ''),
  kiem.replace(/^export /gm, '').replace(/QuestionData/g, 'any'),
  '',
  'const ca = [',
  "  { ten: 'Đủ Chương/Bài/Dạng', q: { topic: 'C1', lesson: 'B1', math_form: 'D1' }, loai: 'NLC' },",
  "  { ten: 'Thiếu Dạng', q: { topic: 'C1', lesson: 'B1', math_form: '' }, loai: 'NLC' },",
  "  { ten: 'Thiếu Bài', q: { topic: 'C1', lesson: '', math_form: 'D1' }, loai: 'NLC' },",
  ']',
  'console.log("--- CHẶN THIẾU PHÂN LOẠI ---");',
  'for (const c of ca) console.log(`  ${c.ten}: ` + (thieuPhanLoaiGoc(c.q) ? "CHẶN (đúng)" : "cho qua"));',
  '',
  'const dap = [',
  "  { loai: 'DS', q: { content: 'Câu A', correct_answer: 'a) Sai, b) Đúng, c) Đúng, d) Sai' } },",
  "  { loai: 'DS', q: { content: 'Câu B', correct_answer: 'Đ, S, Đ, S' } },",
  "  { loai: 'DS', q: { content: 'Câu C', correct_answer: 'DSDS' } },",
  "  { loai: 'DS', q: { content: 'Câu D', correct_answer: '' } },",
  "  { loai: 'DS', q: { content: 'Câu E', correct_answer: 'Đ, S' } },",
  "  { loai: 'NLC', q: { content: 'Câu F', correct_answer: 'b' } },",
  "  { loai: 'NLC', q: { content: 'Câu G', correct_answer: '' } },",
  "  { loai: 'TLN', q: { content: 'Câu H', correct_answer: '' } },",
  "  { loai: 'TLN', q: { content: 'Câu I', correct_answer: '1170' } },",
  '];',
  'console.log("");',
  'console.log("--- NẮN ĐÁP ÁN ---");',
  'for (const d of dap) {',
  '  const r = nanDapAn(d.q, d.loai);',
  '  const ghi = r.nan ? "NẮN" : (r.khuyet ? "KHUYẾT" : "giữ nguyên");',
  '  console.log(`  ${d.loai} "${d.q.correct_answer}" -> "${r.correct}"  [${ghi}]`);',
  '}',
].join('\n');

const tam = 'D:/claude/math-lms/scratch/_thu-cua-tam.ts';
fs.writeFileSync(tam, bai, 'utf8');
try {
  console.log(execFileSync(process.execPath, ['--experimental-strip-types', tam], { encoding: 'utf8' }));
} catch (e) {
  console.log(e.stdout || '');
  console.error(String(e.stderr || '').split('\n').slice(0, 10).join('\n'));
} finally {
  fs.unlinkSync(tam);
}
