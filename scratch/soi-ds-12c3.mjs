import { readFileSync } from 'fs';
import { tachYDungSai } from './tachDungSai.mjs';
const kho = JSON.parse(readFileSync('scratch/kho-12c3.json', 'utf8'));

const CAN = [
  ['Bài 1. Khoảng biến thiên và khoảng tứ phân vị', 'Toán tổng hợp'],
  ['Bài 2. Phương sai và độ lệch chuẩn', 'Tính các số đặc trưng mức độ phân tán (mẫu không ghép nhóm)'],
  ['Bài 2. Phương sai và độ lệch chuẩn', 'Toán tổng hợp'],
];
for (const [bai, dang] of CAN) {
  const ds = kho.filter(q => q.lesson === bai && q.math_form === dang);
  console.log(`\n■ ${bai} · ${dang}  (${ds.length} câu)`);
  for (const q of ds) {
    const dap = String(q.correct_answer || '').trim();
    const t = tachYDungSai(q);
    console.log(`   ${q.question_id} ${q.question_type} m${q.difficulty} · đáp "${dap}" · tách ${t ? 'ĐƯỢC' : 'TRƯỢT'}`);
    if (!t) console.log(`      đề: ${String(q.content).replace(/\s+/g, ' ').slice(0, 150)}`);
  }
}
