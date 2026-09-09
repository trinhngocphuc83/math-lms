/* Đo lại bốn chỗ sau khi sửa. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { count: tsl } = await sb.from('question_categories')
  .select('id', { count: 'exact', head: true }).eq('math_form', 'Tự suy luận');
console.log(`1. danh mục tên "Tự suy luận"          : ${tsl}   (trước: 11)`);

const { count: nhan } = await sb.from('questions')
  .select('id', { count: 'exact', head: true }).ilike('content', '%CÂU HỎI CÓ THỂ BỊ SAI ĐỀ%');
console.log(`2. câu còn nhãn nháp trong đề          : ${nhan}   (trước: 15)`);

const { count: thieu } = await sb.from('questions')
  .select('id', { count: 'exact', head: true })
  .in('question_type', ['NLC', 'DS', 'TLN']).or('correct_answer.is.null,correct_answer.eq.');
console.log(`3. câu thiếu đáp án (nay lọc được)     : ${thieu}   (trước: 193, không có đường tìm)`);

const { data: kh } = await sb.from('courses').select('id').ilike('title', '%11%');
const { data: ch } = await sb.from('chapters').select('title')
  .eq('course_id', kh[0].id).ilike('title', '%DÃY SỐ%').maybeSingle();
const { data: tp } = await sb.from('question_categories').select('topic')
  .eq('grade', '11').ilike('topic', '%Dãy số%').limit(1).maybeSingle();
console.log(`4. tên chương bài giảng                : ${ch.title}`);
console.log(`   tên chương trong kho                : ${tp.topic}`);
console.log(`   khớp từ ngữ (bỏ qua hoa/thường)     : ${ch.title.toLowerCase() === tp.topic.toLowerCase() ? '✓' : '✗'}`);

/* Câu đã rót vào bài chương 2 lớp 11 có câu nào thiếu đáp án lọt vào không */
const { data: chuong } = await sb.from('chapters').select('id')
  .eq('course_id', kh[0].id).ilike('title', '%DÃY SỐ%').maybeSingle();
const { data: ls } = await sb.from('lessons').select('id').eq('chapter_id', chuong.id);
const { data: chOn } = await sb.from('chapters').select('id').eq('course_id', kh[0].id).eq('loai', 'on-tap').maybeSingle();
const { data: lsOn } = await sb.from('lessons').select('id').eq('chapter_id', chOn.id).eq('title', 'Cuối chương 2').maybeSingle();
const { data: mods } = await sb.from('lesson_modules').select('content_markdown')
  .in('lesson_id', [...ls.map(x => x.id), lsOn.id]);
const ids = new Set();
for (const m of mods || []) for (const x of (m.content_markdown || '').matchAll(/"sourceQuestionId":\s*"([^"]+)"/g)) ids.add(x[1]);
let hong = 0;
const ds = [...ids];
for (let i = 0; i < ds.length; i += 200) {
  const { data } = await sb.from('questions').select('question_type,correct_answer').in('id', ds.slice(i, i + 200));
  hong += (data || []).filter(q => ['NLC', 'DS', 'TLN'].includes(q.question_type)
    && !String(q.correct_answer || '').trim()).length;
}
console.log(`\n5. chương 2 lớp 11: ${ids.size} câu đã rót vào bài · thiếu đáp án lọt vào: ${hong}`);
