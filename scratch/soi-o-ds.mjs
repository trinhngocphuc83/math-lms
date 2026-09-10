import { readFileSync } from 'fs';
const kho = JSON.parse(readFileSync('scratch/kho-12c3.json', 'utf8'));
const q = kho.find(x => x.question_id === 'CH_1785335781036_y390');
console.log('đề  :', String(q.content).replace(/\s+/g, ' ').slice(0, 160));
for (const o of ['option_a', 'option_b', 'option_c', 'option_d']) {
  console.log(`${o}: ${String(q[o] ?? '(rỗng)').replace(/\s+/g, ' ').slice(0, 120)}`);
}
console.log('đáp :', JSON.stringify(q.correct_answer));

/* Toàn kho chương này: DS có bao nhiêu câu theo mỗi lối */
const ds = kho.filter(x => x.question_type === 'DS' && String(x.correct_answer || '').trim());
const laDungSai = (s) => /^(Đúng|Sai|Đ|S)$/i.test(String(s || '').trim());
let loiA = 0, loiB = 0, khac = 0;
for (const x of ds) {
  const o = ['option_a', 'option_b', 'option_c', 'option_d'].map(k => String(x[k] ?? '').trim());
  if (o.every(laDungSai)) loiA++;
  else if (o.every(t => t.length > 0)) loiB++;
  else khac++;
}
console.log(`\nDS có đáp án: ${ds.length}`);
console.log(`   lối A - bốn ô ghi Đúng/Sai, ý nằm trong đề : ${loiA}`);
console.log(`   lối B - bốn ô CHÍNH LÀ bốn ý               : ${loiB}`);
console.log(`   khác (ô trống)                             : ${khac}`);
