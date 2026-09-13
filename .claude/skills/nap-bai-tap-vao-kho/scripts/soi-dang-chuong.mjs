/**
 * Kê một chương để SOI LẠI DẠNG bằng mắt: mỗi dạng kèm yêu cầu cần đạt và số câu, rồi từng câu
 * một dòng (mã, loại, mức, 110 ký tự đầu của đề) để đọc lướt và xếp lại.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/soi-dang-chuong.mjs --lop 7 --chuong 1 [--tu 1 --den 6]
 *
 * Ra: scratch/soi-dang/lop<N>-c<M>.json (đủ trường để bộ áp kế hoạch dùng) và in bảng ra màn
 * hình; --tu/--den chọn khoảng dạng để in (chương lớn thì in từng phần).
 * Sau khi đọc, viết kế hoạch scratch/soi-dang/lop<N>-c<M>.ke-hoach.json rồi áp bằng
 * ap-ke-hoach-dang.mjs.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const CO = process.argv.slice(2);
const lay = (t, m) => { const i = CO.indexOf(`--${t}`); return i >= 0 && CO[i + 1] ? CO[i + 1] : m; };
const LOP = lay('lop'), CHUONG = lay('chuong'), TU = +lay('tu', 1), DEN = +lay('den', 999);
if (!LOP || !CHUONG) { console.error('Cần --lop N --chuong M'); process.exit(1); }

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dm } = await sb.from('question_categories').select('*').eq('grade', LOP).like('topic', `Chương ${CHUONG}. %`).order('lesson');
if (!dm?.length) { console.error('Không thấy chương'); process.exit(1); }
const topic = dm[0].topic;
const cau = [];
for (let i = 0; ; i += 1000) {
  const { data } = await sb.from('questions').select('id,question_id,lesson,math_form,question_type,difficulty,content,option_a,option_b,option_c,option_d,correct_answer')
    .eq('grade', LOP).eq('topic', topic).range(i, i + 999);
  cau.push(...(data || [])); if (!data || data.length < 1000) break;
}
mkdirSync('scratch/soi-dang', { recursive: true });
writeFileSync(`scratch/soi-dang/lop${LOP}-c${CHUONG}.json`, JSON.stringify({ grade: LOP, subject: dm[0].subject, topic, danhMuc: dm, cau }, null, 1));

console.log(`${topic} · lớp ${LOP} · ${dm.length} dạng · ${cau.length} câu\n`);
/* mã ngắn: đuôi ngắn nhất (>= 4 kí tự) không trùng với câu nào khác trong chương - mã kiểu CH_..._09_12 hay trùng 4 kí tự cuối */
const tatCa = [...cau.map(q => q.question_id)];
const ma = (q) => { for (let n = 4; n <= q.question_id.length; n++) { const s = q.question_id.slice(-n); if (tatCa.filter(x => x.endsWith(s)).length === 1) return s; } return q.question_id; };
const gon = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\\(left|right|mathbb|quad|,|;|color\{blue\})/g, '').replace(/\$/g, '').trim();
let i = 0;
for (const d of dm) {
  i++;
  const ds = cau.filter(q => q.lesson === d.lesson && q.math_form === d.math_form);
  if (i < TU || i > DEN) continue;
  console.log(`\n### [${i}] ${d.lesson} | ${d.math_form} (${ds.length})\n    yêu cầu: ${gon(d.yeu_cau_can_dat).slice(0, 140)}`);
  for (const q of ds) console.log(`  ${ma(q)} ${q.question_type} ${q.difficulty} | ${gon(q.content).slice(0, 110)}`);
}
const lac = cau.filter(q => !dm.some(d => d.lesson === q.lesson && d.math_form === q.math_form));
if (lac.length) { console.log(`\n### NGOÀI DANH MỤC (${lac.length})`); for (const q of lac) console.log(`  ${ma(q)} ${q.lesson} | ${q.math_form} | ${gon(q.content).slice(0, 80)}`); }
