/* Chấm quét xong thì điểm nằm ở đâu? Đo thẳng trên cơ sở dữ liệu. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

for (const bang of ['bang_diem', 'bang_diem_chi_tiet', 'bai_quet']) {
  const { count, error } = await sb.from(bang).select('id', { count: 'exact', head: true });
  console.log(`${bang.padEnd(20)} ${error ? '✗ ' + error.message.slice(0, 60) : count + ' dòng'}`);
}

const { data: bd } = await sb.from('bang_diem')
  .select('id,class_id,ten_bai,ngay,created_at').order('created_at', { ascending: false }).limit(8);
console.log('\nTám bài kiểm tra mới nhất trong sổ điểm:');
for (const b of bd || []) {
  const { count } = await sb.from('bang_diem_chi_tiet')
    .select('id', { count: 'exact', head: true }).eq('bang_diem_id', b.id);
  console.log(`   ${String(b.ngay).slice(0, 10)} · ${count} điểm · ${b.ten_bai}`);
}

const { data: bq, error: eq } = await sb.from('bai_quet')
  .select('id,class_id,ten_de,diem,created_at').order('created_at', { ascending: false }).limit(5);
console.log('\nBằng chứng bài quét mới nhất:');
if (eq) console.log('   ✗ ' + eq.message);
else if (!bq?.length) console.log('   (chưa có dòng nào)');
else for (const x of bq) console.log(`   ${String(x.created_at).slice(0, 16)} · ${x.diem} · ${x.ten_de}`);
