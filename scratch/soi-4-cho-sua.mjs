/* Đo bốn chỗ cần sửa trước khi động vào cơ sở dữ liệu. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/* ---- 1. Dạng "Tự suy luận" dùng ở đâu ---- */
const { data: dm } = await sb.from('question_categories').select('*').eq('math_form', 'Tự suy luận');
console.log(`1. Danh mục tên "Tự suy luận": ${dm.length}`);
for (const d of dm) console.log(`   ${d.grade} · ${d.topic} · ${d.lesson}`);

/* ---- 2. Câu mang nhãn nháp, TOÀN KHO chứ không riêng chương này ---- */
let nhan = [];
for (let tu = 0; ; tu += 1000) {
  const { data } = await sb.from('questions').select('id,question_id,grade,topic,lesson,content')
    .ilike('content', '%CÂU HỎI CÓ THỂ BỊ SAI ĐỀ%').range(tu, tu + 999);
  if (!data?.length) break;
  nhan.push(...data);
  if (data.length < 1000) break;
}
console.log(`\n2. Câu mang nhãn nháp trong toàn kho: ${nhan.length}`);
for (const q of nhan.slice(0, 10)) console.log(`   ${q.question_id} · lớp ${q.grade} · ${q.lesson}`);

/* ---- 3. Câu thiếu đáp án trong chương 2 lớp 11 ---- */
const kho = JSON.parse(readFileSync('scratch/kho-11c2.json', 'utf8'));
for (const t of ['TLN', 'DS']) {
  const thieu = kho.filter(q => q.question_type === t && !String(q.correct_answer || '').trim());
  const coGiai = thieu.filter(q => String(q.explanation || '').trim()).length;
  console.log(`\n3. ${t} thiếu đáp án: ${thieu.length} câu · trong đó ${coGiai} câu CÓ lời giải để dò lại`);
}

/* ---- 4. Tên chương: app và kho ---- */
const { data: kh } = await sb.from('courses').select('id,title').ilike('title', '%11%');
const { data: ch } = await sb.from('chapters').select('title,loai').eq('course_id', kh[0].id).order('order_index');
const topics = [...new Set((await sb.from('question_categories').select('topic').eq('grade', '11')).data.map(x => x.topic))];
console.log('\n4. Tên chương bên BÀI GIẢNG:');
for (const c of ch) console.log(`   [${c.loai}] ${c.title}`);
console.log('   Tên chương bên KHO:');
for (const t of topics.sort()) console.log(`   ${t}`);
