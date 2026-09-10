import { readFileSync } from 'fs';
const kho = JSON.parse(readFileSync('scratch/kho-12c3.json', 'utf8'));
const CAN = ['tùy cách làm tròn từng bước', 'Lưu ý kiểm tra lại'];
for (const t of CAN) {
  const q = kho.find(x => `${x.content}${x.explanation}`.includes(t));
  console.log(q
    ? `"${t}" -> CÓ trong kho: ${q.question_id} · ${q.lesson} · trường ${String(q.content).includes(t) ? 'đề' : 'lời giải'}`
    : `"${t}" -> KHÔNG thấy trong kho (vậy là chữ tôi tự soạn)`);
}
/* Đếm chung: bao nhiêu câu trong kho còn dấu sao đơn lẻ */
const sao = kho.filter(q => /\*/.test(`${q.content}${q.explanation}`));
console.log(`\nCâu trong kho còn dấu sao: ${sao.length}/${kho.length}`);
