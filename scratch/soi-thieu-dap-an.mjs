/* Khảo sát 193 câu thiếu đáp án: có đường nào khôi phục CHẮC CHẮN không? */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tatCa = [];
for (let tu = 0; ; tu += 1000) {
  const { data } = await sb.from('questions')
    .select('id,question_id,grade,topic,lesson,question_type,difficulty,content,option_a,option_b,option_c,option_d,correct_answer,explanation')
    .range(tu, tu + 999);
  if (!data?.length) break;
  tatCa.push(...data);
  if (data.length < 1000) break;
}
const thieu = tatCa.filter(q => !String(q.correct_answer || '').trim()
  && ['NLC', 'DS', 'TLN'].includes(q.question_type));
console.log(`Tổng ${tatCa.length} câu · thiếu đáp án ${thieu.length}\n`);
writeFileSync('scratch/thieu-dap-an.json', JSON.stringify(thieu));

/* --- DS: bốn ô option_a..d có sẵn Đúng/Sai không? --- */
const ds = thieu.filter(q => q.question_type === 'DS');
const dsCoO = ds.filter(q => ['option_a', 'option_b', 'option_c', 'option_d']
  .every(k => /^(Đúng|Sai)$/i.test(String(q[k] || '').trim())));
console.log(`DS thiếu đáp án: ${ds.length} · trong đó 4 ô đã ghi sẵn Đúng/Sai: ${dsCoO.length}  <- dựng lại được CHẮC CHẮN`);
for (const q of ds.filter(x => !dsCoO.includes(x)).slice(0, 3))
  console.log(`   còn lại ví dụ ${q.question_id}: ô = ${JSON.stringify([q.option_a, q.option_b, q.option_c, q.option_d])}`);

/* --- NLC: lời giải có nói chọn phương án nào không? --- */
const nlc = thieu.filter(q => q.question_type === 'NLC');
let nlcRo = 0;
for (const q of nlc) {
  const g = String(q.explanation || '');
  if (/(chọn|đáp án|Đáp án)\s*[:\s]*([ABCD])\b/.test(g)) nlcRo++;
}
console.log(`\nNLC thiếu đáp án: ${nlc.length} · lời giải nói rõ chọn A/B/C/D: ${nlcRo}`);

/* --- TLN: lời giải có câu "Vậy ... = số" ở cuối không? --- */
const tln = thieu.filter(q => q.question_type === 'TLN');
const MAU = [
  /Vậy[^.\n]*?[=:]\s*\$?\s*([-+]?[\d.,]+)/i,
  /(?:đáp số|kết quả|answer)\s*[:=]\s*\$?\s*([-+]?[\d.,]+)/i,
];
let tlnRo = 0; const viDu = [];
for (const q of tln) {
  const g = String(q.explanation || '').replace(/\\n/g, '\n');
  let so = null;
  for (const m of MAU) { const r = g.match(m); if (r) { so = r[1]; break; } }
  if (so) { tlnRo++; if (viDu.length < 5) viDu.push(`${q.question_id} → ${so}`); }
}
console.log(`TLN thiếu đáp án: ${tln.length} · dò được số ở câu kết: ${tlnRo}`);
viDu.forEach(v => console.log('   ' + v));
