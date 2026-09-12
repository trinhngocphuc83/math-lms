import { readFileSync } from 'fs';
const cau = JSON.parse(readFileSync('scratch/l10c1.json', 'utf8'));
const g = {};
for (const q of cau) (g[q.lesson.slice(0, 6) + ' | ' + q.math_form] ||= []).push(q);
const tu = process.argv[2] ? Number(process.argv[2]) : 0, den = process.argv[3] ? Number(process.argv[3]) : 99;
let i = 0;
for (const [k, ds] of Object.entries(g).sort()) {
  i++; if (i < tu || i > den) continue;
  console.log(`\n### ${k} (${ds.length})`);
  for (const q of ds) console.log(' ', q.question_id.slice(-4), q.question_type, q.difficulty, '|',
    q.content.replace(/\s+/g, ' ').replace(/\\(left|right|mathbb|quad|,|;)/g, '').replace(/\$/g, '').slice(0, 110));
}
