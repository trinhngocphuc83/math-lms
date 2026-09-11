/**
 * Bước 2: tải danh mục (chương › bài › dạng + yêu cầu cần đạt) của một khối để xếp câu vào ĐÚNG TÊN.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/tai-danh-muc.mjs --lop 9 [--chuong "Đường tròn"]
 *
 * Ghi ra scratch/nap-kho/danh-muc-lop<N>.md và .json. Tên dạng trong tệp câu hỏi phải chép
 * NGUYÊN VĂN từ đây - lệch một chữ là kho đẻ thêm dạng song sinh.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const CO = process.argv.slice(2);
const lay = (k, d) => { const i = CO.indexOf('--' + k); return i >= 0 ? CO[i + 1] : d; };
const LOP = lay('lop', null);
const CHUONG = lay('chuong', '');
if (!LOP) { console.error('Thiếu --lop'); process.exit(1); }

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let dm = [], f = 0;
while (true) { const { data, error } = await sb.from('question_categories').select('*').eq('grade', String(LOP)).range(f, f + 999); if (error) throw error; dm.push(...data); if (data.length < 1000) break; f += 1000; }
if (CHUONG) dm = dm.filter(c => String(c.topic).toLowerCase().includes(CHUONG.toLowerCase()));

let kho = []; f = 0;
while (true) { const { data } = await sb.from('questions').select('subject,topic,lesson,math_form,question_type,difficulty').eq('grade', String(LOP)).range(f, f + 999); kho.push(...(data || [])); if (!data || data.length < 1000) break; f += 1000; }

const so = (n) => (String(n).match(/\d+/) || ['0'])[0].padStart(2, '0');
dm.sort((a, b) => `${a.subject}|${so(a.topic)}|${/Ôn tập/.test(a.lesson) ? '99' : so(a.lesson)}|${a.math_form}`.localeCompare(`${b.subject}|${so(b.topic)}|${/Ôn tập/.test(b.lesson) ? '99' : so(b.lesson)}|${b.math_form}`, 'vi'));

mkdirSync('scratch/nap-kho', { recursive: true });
const dong = [`# Danh mục Toán ${LOP}${CHUONG ? ` — lọc "${CHUONG}"` : ''} · ${dm.length} dạng`, '', 'Số trong ngoặc là số câu kho đang có (NLC/DS/TLN/TL). Tên dạng phải chép NGUYÊN VĂN.', ''];
let cur = '';
for (const c of dm) {
  const k = `${c.subject} › ${c.topic} › ${c.lesson}`;
  if (k !== cur) { cur = k; dong.push(`\n## ${k}`); }
  const cau = kho.filter(q => q.subject === c.subject && q.topic === c.topic && q.lesson === c.lesson && q.math_form === c.math_form);
  const dem = (t) => cau.filter(q => q.question_type === t).length;
  dong.push(`- **${c.math_form}** (${dem('NLC')}/${dem('DS')}/${dem('TLN')}/${dem('TL')})\n    ${c.yeu_cau_can_dat || '(chưa có yêu cầu)'}`);
}
writeFileSync(`scratch/nap-kho/danh-muc-lop${LOP}.md`, dong.join('\n'));
writeFileSync(`scratch/nap-kho/danh-muc-lop${LOP}.json`, JSON.stringify(dm.map(c => ({ subject: c.subject, topic: c.topic, lesson: c.lesson, math_form: c.math_form })), null, 1));
console.log(dong.join('\n'));
console.log(`\nĐã ghi scratch/nap-kho/danh-muc-lop${LOP}.md`);
