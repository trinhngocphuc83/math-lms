import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: bo } = await sb.from('bo_de_thi').select('*').eq('id', 'b13dd9eb-b3f7-4b47-99ef-2f1713c19633').maybeSingle();
if (!bo) { console.log('không thấy bộ đề'); process.exit(0); }
const dem = {};
for (const q of bo.cau_hoi || []) dem[q.question_type || '?'] = (dem[q.question_type || '?'] || 0) + 1;
console.log(`Bộ đề: ${bo.ten}`);
console.log(`   ${(bo.cau_hoi || []).length} câu · ${JSON.stringify(dem)} · tổng ${bo.tong_diem} điểm`);

/* Em nào có mã e092a6 */
const { data: hs } = await sb.from('profiles').select('id,full_name').limit(3000);
const ma = (id) => String(id).replace(/-/g, '').slice(0, 6).toLowerCase();
const em = (hs || []).find(h => ma(h.id) === 'e092a6');
console.log(`\nMã QR "e092a6" -> ${em ? em.full_name : '(không tìm ra)'}`);

/* Lớp nào đang có em ấy, sĩ số bao nhiêu */
if (em) {
  const { data: en } = await sb.from('enrollments').select('class_id').eq('student_id', em.id);
  for (const e of en || []) {
    const { data: lop } = await sb.from('classes').select('name').eq('id', e.class_id).maybeSingle();
    const { count } = await sb.from('enrollments').select('id', { count: 'exact', head: true }).eq('class_id', e.class_id);
    console.log(`   lớp ${lop?.name} · ${count} em`);
  }
}
