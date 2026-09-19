// Kéo toàn bộ kho lớp 9 chương Hệ thức lượng ra tệp để soát và rút câu.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('questions').select('*').eq('grade', '9').ilike('topic', '%Hệ thức lượng%').order('lesson').order('math_form');
writeFileSync('D:/claude/math-lms/scratch/l9c4/kho.json', JSON.stringify(data, null, 1));
const tom = data.map(q => ({ id: q.id, ma: q.question_id, bai: q.lesson.slice(0, 6), dang: q.math_form, loai: q.question_type, muc: q.difficulty, anh: !!q.image_url, dung: q.usage_count || 0,
  de: String(q.content).replace(/\s+/g, ' ').slice(0, 160), dapAn: String(q.correct_answer || '').slice(0, 40), giai: String(q.explanation || '').length }));
writeFileSync('D:/claude/math-lms/scratch/l9c4/kho-tom.json', JSON.stringify(tom, null, 1));
console.log(data.length, 'câu; cột:', Object.keys(data[0]).join(', '));
