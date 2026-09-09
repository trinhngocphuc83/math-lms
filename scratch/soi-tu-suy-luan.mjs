/* Đọc thử câu của từng danh mục "Tự suy luận" để biết nó thật ra là dạng gì.
   Không đặt tên mới khi chưa đọc - lần trước đoán theo từ khoá đã cho ra kết luận sai. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dm } = await sb.from('question_categories').select('*').eq('math_form', 'Tự suy luận');
for (const d of dm.sort((a, b) => (a.grade + a.topic).localeCompare(b.grade + b.topic))) {
  const { data: q } = await sb.from('questions')
    .select('question_id,question_type,difficulty,content')
    .eq('grade', d.grade).eq('topic', d.topic).eq('lesson', d.lesson).eq('math_form', 'Tự suy luận');
  console.log(`\n■ lớp ${d.grade} · ${d.lesson}  (${q?.length || 0} câu)`);
  console.log(`   ycđ: ${(d.yeu_cau_can_dat || '(trống)').slice(0, 90)}`);
  for (const x of (q || []).slice(0, 4)) {
    console.log(`   · ${x.question_type} m${x.difficulty} | ${String(x.content).replace(/\s+/g, ' ').slice(0, 120)}`);
  }
}
