// Soi câu GẦN trùng với kho lớp 10 (kiem-cau chỉ bắt trùng hệt).
// node scratch/nap-kho/gan-trung.mjs <tệp.cau.json> [ngưỡng=0.6]
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => env.match(new RegExp(k + '=(.*)'))[1].trim();
const sb = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY') || g('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

const tep = process.argv[2];
const nguong = Number(process.argv[3] || 0.6);
const goi = JSON.parse(readFileSync(tep, 'utf8'));

const tokens = (t) => {
  const s = String(t || '').normalize('NFC').toLowerCase()
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\\(dfrac|frac|left|right|cdot|circ|widehat|sqrt|,|;|quad)/g, ' ')
    .replace(/[\\${}()\[\].,;:?!'"]/g, ' ');
  return new Set(s.split(/\s+/).filter(w => w.length > 1));
};
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n || 1); };
const full = (q) => [q.content, q.option_a, q.option_b, q.option_c, q.option_d].join(' ');

const kho = [];
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('questions').select('question_id,content,option_a,option_b,option_c,option_d').eq('grade', goi.grade).range(from, from + 999);
  kho.push(...data); if (data.length < 1000) break;
}
const khoTk = kho.map(q => ({ id: q.question_id, tk: tokens(full(q)), c: q.content }));

goi.cau.forEach((q, i) => {
  const tk = tokens(full(q));
  let best = { s: 0 };
  for (const k of khoTk) { const s = jac(tk, k.tk); if (s > best.s) best = { s, id: k.id, c: k.c }; }
  if (best.s >= nguong) console.log(`câu ${i + 1}: ${best.s.toFixed(2)} ~ ${best.id} | ${best.c.slice(0, 90)}`);
});
console.log('xong');
