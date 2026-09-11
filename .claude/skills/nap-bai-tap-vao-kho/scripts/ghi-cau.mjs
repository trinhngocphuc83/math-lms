/**
 * Bước 5: ghi tệp câu hỏi vào kho (chỉ khi kiem-cau.mjs không báo lỗi).
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/ghi-cau.mjs scratch/nap-kho/<tên>.cau.json        -> thử
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/ghi-cau.mjs scratch/nap-kho/<tên>.cau.json ghi    -> ghi thật
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/ghi-cau.mjs --rut backups/nap-kho-<ngày>/<tệp>.json -> RÚT LẠI một lượt đã ghi
 *
 * Mỗi lượt ghi lưu danh sách mã câu vào backups/nap-kho-<ngày>/<tên>-<giờ>.json để rút lại được
 * nguyên lượt nếu thầy không ưng. Mã câu theo đúng khuôn app: CH_<mili giây>_<4 kí tự>.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { basename } from 'path';

const CO = process.argv.slice(2);
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const S = (x) => String(x ?? '').trim();

/* Rút lại một lượt */
if (CO[0] === '--rut') {
  const luot = JSON.parse(readFileSync(CO[1], 'utf8'));
  const { error, count } = await sb.from('questions').delete({ count: 'exact' }).in('question_id', luot.ma);
  console.log(error ? `✗ ${error.message}` : `✓ đã rút ${count} câu của lượt ${basename(CO[1])}`);
  process.exit(0);
}

const tep = CO[0];
const GHI = CO.includes('ghi');
/* Soát lại lần cuối bằng chính bộ kiểm - từ chối nếu còn lỗi */
try { execFileSync('node', ['.claude/skills/nap-bai-tap-vao-kho/scripts/kiem-cau.mjs', tep], { stdio: 'inherit' }); }
catch { console.log('\n✗ Tệp còn lỗi, không ghi.'); process.exit(1); }

const goi = JSON.parse(readFileSync(tep, 'utf8'));
const mocGio = Date.now();
const inserts = goi.cau.map((q, i) => ({
  question_id: `CH_${mocGio + i}_${Math.random().toString(36).substring(2, 6)}`,
  grade: S(goi.grade),
  subject: S(q.subject || goi.subject),
  topic: S(q.topic), lesson: S(q.lesson), math_form: S(q.math_form),
  question_type: q.question_type,
  difficulty: S(q.difficulty),
  content: S(q.content),
  option_a: S(q.option_a) || null, option_b: S(q.option_b) || null, option_c: S(q.option_c) || null, option_d: S(q.option_d) || null,
  correct_answer: S(q.correct_answer),
  explanation: S(q.explanation) || null,
  image_url: q.image_url || null,
  usage_count: 0,
}));

const theoDang = {};
for (const q of inserts) theoDang[`${q.lesson.slice(0, 8)} / ${q.math_form}`] = (theoDang[`${q.lesson.slice(0, 8)} / ${q.math_form}`] || 0) + 1;
console.log(`\nSẽ ghi ${inserts.length} câu vào kho lớp ${goi.grade}${goi.nguon ? ` · nguồn: ${goi.nguon}` : ''}:`);
for (const [k, v] of Object.entries(theoDang)) console.log(`   ${String(v).padStart(3)}  ${k}`);
if (!GHI) { console.log('(thử - chưa ghi)'); process.exit(0); }

const ngay = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const th = `backups/nap-kho-${ngay}`; mkdirSync(th, { recursive: true });
const { error } = await sb.from('questions').insert(inserts);
if (error) { console.log('✗', error.message); process.exit(1); }
const tepLuot = `${th}/${basename(tep, '.cau.json')}-${new Date().toISOString().slice(11, 16).replace(':', '')}.json`;
writeFileSync(tepLuot, JSON.stringify({ tep, nguon: goi.nguon, luc: new Date().toISOString(), ma: inserts.map(q => q.question_id) }, null, 1));
console.log(`✓ đã ghi ${inserts.length} câu · rút lại được bằng: node .claude/skills/nap-bai-tap-vao-kho/scripts/ghi-cau.mjs --rut ${tepLuot}`);
