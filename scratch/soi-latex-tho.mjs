/* Tìm lệnh LaTeX nằm NGOÀI cặp $...$ trong kho - đó là chỗ xuất Word ra chữ thô. */
import { readFileSync } from 'fs';
const kho = JSON.parse(readFileSync('scratch/kho-11c2.json', 'utf8'));

const LENH = /\\(sqrt|dfrac|frac|color|cdot|times|le|ge|ne|infty|begin|end|left|right)\b/g;

function ngoaiMath(t) {
  const s = String(t || '');
  let trong = false, buf = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$') { trong = !trong; continue; }
    if (!trong) buf += s[i];
  }
  const m = buf.match(LENH);
  return m ? [...new Set(m)] : null;
}

let n = 0;
const bang = [];
for (const q of kho) {
  for (const [ten, t] of [['đề', q.content], ['lời giải', q.explanation]]) {
    const m = ngoaiMath(t);
    if (m) { n++; bang.push(`${q.question_id} · ${q.lesson} · ${ten} → ${m.join(' ')}`); }
  }
}
console.log(`Chỗ có lệnh LaTeX nằm ngoài dấu $ : ${n}`);
bang.slice(0, 8).forEach(x => console.log('   ' + x));

const sao = kho.filter(q => /\*\*/.test(q.explanation || '') || /\*\*/.test(q.content || ''));
console.log(`\nCâu còn dấu ** markdown: ${sao.length}`);
sao.slice(0, 4).forEach(q => console.log(`   ${q.question_id} · ${q.lesson}`));
