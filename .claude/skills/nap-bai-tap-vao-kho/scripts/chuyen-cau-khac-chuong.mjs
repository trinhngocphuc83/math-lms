/**
 * Chuyển vài câu sang CHƯƠNG KHÁC (ap-ke-hoach-dang.mjs chỉ đổi bài/dạng trong một chương).
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/chuyen-cau-khac-chuong.mjs scratch/soi-dang/lop9-khac-chuong.json [ghi]
 *
 * Tệp JSON: { "lop": "9", "chuyen": { "<4 kí tự cuối mã câu>": ["Chương N. …", "Bài K. …", "tên dạng"], … } }
 * Dạng đích phải đã có trong question_categories (subject lấy theo dạng đích). Sao lưu trước khi ghi.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const TEP = process.argv[2]; const GHI = process.argv.includes('ghi');
if (!TEP) { console.error('Cần tệp JSON'); process.exit(1); }
const KH = JSON.parse(readFileSync(TEP, 'utf8'));
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dm } = await sb.from('question_categories').select('subject,topic,lesson,math_form').eq('grade', KH.lop);
const ke = [];
for (const [id, [topic, lesson, math_form]] of Object.entries(KH.chuyen)) {
  const d = dm.find(x => x.topic === topic && x.lesson === lesson && x.math_form === math_form);
  if (!d) { console.log(`  ✗ ${id}: không có dạng "${lesson} | ${math_form}" trong ${topic}`); process.exit(1); }
  const { data: q } = await sb.from('questions').select('id,question_id,subject,topic,lesson,math_form').eq('grade', KH.lop).like('question_id', `%${id}`);
  if (!q || q.length !== 1) { console.log(`  ✗ ${id}: tìm thấy ${q?.length ?? 0} câu`); process.exit(1); }
  ke.push({ cu: q[0], moi: { subject: d.subject, topic, lesson, math_form } });
  console.log(`  ${id}  ${q[0].topic.slice(0, 10)} | ${q[0].math_form}  →  ${topic.slice(0, 10)} | ${math_form}`);
}
console.log(`\n${ke.length} câu chuyển chương`);
if (!GHI) { console.log('Thêm "ghi" để ghi thật.'); process.exit(0); }
const thuMuc = `backups/chuyen-chuong-lop${KH.lop}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
mkdirSync(thuMuc, { recursive: true });
writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify(ke.map(k => k.cu), null, 1));
for (const k of ke) { const { error } = await sb.from('questions').update(k.moi).eq('id', k.cu.id); if (error) console.log('  ✗', k.cu.question_id, error.message); }
console.log(`✓ đã ghi · sao lưu ${thuMuc}/`);
