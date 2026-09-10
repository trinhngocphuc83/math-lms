import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: bd } = await sb.from('bang_diem').select('*').order('created_at', { ascending: false });
for (const b of bd || []) {
  const { data: ct } = await sb.from('bang_diem_chi_tiet').select('diem').eq('bang_diem_id', b.id);
  const ds = (ct || []).map(x => Number(x.diem)).sort((a, z) => a - z);
  console.log(`\n${String(b.ngay).slice(0, 10)} · "${b.ten_bai}"`);
  console.log(`   lớp ${b.class_id} · ${ds.length} điểm · thấp ${ds[0]} · cao ${ds.at(-1)}`);
  console.log(`   người tạo: ${b.nguoi_tao || '(trống)'} · tạo lúc ${String(b.created_at).slice(0, 19)}`);
}

/* Kho ảnh có tệp nào không - nếu có thì việc tải ảnh đã chạy, chỉ hỏng bước ghi bảng. */
const { data: tep } = await sb.storage.from('bai-quet').list('', { limit: 20 });
console.log(`\nKho ảnh bai-quet: ${(tep || []).length} mục ở gốc`);
for (const t of (tep || []).slice(0, 5)) {
  const { data: trong } = await sb.storage.from('bai-quet').list(t.name, { limit: 5 });
  console.log(`   ${t.name}/  (${(trong || []).length} tệp)`);
}
