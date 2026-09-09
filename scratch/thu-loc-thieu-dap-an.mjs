/* Chạy đúng truy vấn mà ô lọc "Thiếu đáp án" sẽ dựng, xem có ra đúng 193 câu không. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { count, error } = await sb.from('questions')
  .select('id', { count: 'exact', head: true })
  .in('question_type', ['NLC', 'DS', 'TLN'])
  .or('correct_answer.is.null,correct_answer.eq.');
console.log(error ? '✗ ' + error.message : `Ô lọc trả về: ${count} câu`);

/* Có lọc kèm lớp không */
const { count: c11 } = await sb.from('questions')
  .select('id', { count: 'exact', head: true })
  .eq('grade', '11')
  .in('question_type', ['NLC', 'DS', 'TLN'])
  .or('correct_answer.is.null,correct_answer.eq.');
console.log(`   lọc thêm lớp 11: ${c11} câu`);

/* Tự luận KHÔNG được lọt vào */
const { count: ctl } = await sb.from('questions')
  .select('id', { count: 'exact', head: true })
  .eq('question_type', 'TL')
  .or('correct_answer.is.null,correct_answer.eq.');
console.log(`   (tự luận trống đáp án, cố ý KHÔNG tính: ${ctl} câu)`);
