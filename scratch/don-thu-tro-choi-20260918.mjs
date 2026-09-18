// Xoá dữ liệu thử trò chơi 18/9/2026: điểm nguồn tro_choi và lượt gọi tên ghi sau mốc bắt đầu thử.
//   node scratch/don-thu-tro-choi-20260918.mjs        -> chỉ liệt kê
//   node scratch/don-thu-tro-choi-20260918.mjs xoa    -> xoá thật (có sao lưu)
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const MOC = '2026-09-18T05:05:00Z'; // lúc bắt đầu thử (đo trước khi chơi: 11 dòng tro_choi, 92 lượt gọi)
const { data: diem } = await sb.from('diem_thuong').select('id, student_id, diem, ly_do, created_at').eq('nguon', 'tro_choi').gt('created_at', MOC).order('created_at');
const { data: luot } = await sb.from('luot_goi_ten').select('*').gt('created_at', MOC).order('created_at');
console.log('Điểm trò chơi sau mốc:', diem.length); diem.forEach(d => console.log('  ', d.created_at.slice(11, 19), d.diem, d.ly_do));
console.log('Lượt gọi tên sau mốc:', luot.length);
if (process.argv[2] === 'xoa') {
  mkdirSync('D:/claude/math-lms/backups/tro-choi-thu-20260918', { recursive: true });
  writeFileSync('D:/claude/math-lms/backups/tro-choi-thu-20260918/da-xoa.json', JSON.stringify({ diem, luot }, null, 2));
  const a = await sb.from('diem_thuong').delete().in('id', diem.map(d => d.id));
  const b = await sb.from('luot_goi_ten').delete().in('id', luot.map(d => d.id));
  console.log('xoá điểm:', a.error?.message || 'xong', '· xoá lượt:', b.error?.message || 'xong');
  const c = await sb.from('diem_thuong').select('id', { count: 'exact', head: true }).eq('nguon', 'tro_choi');
  const d = await sb.from('luot_goi_ten').select('id', { count: 'exact', head: true });
  console.log('còn lại: diem tro_choi', c.count, '· luot_goi_ten', d.count);
}
