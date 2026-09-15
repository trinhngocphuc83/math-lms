// Dọn khối quiz đang mang cả `answer` lẫn phương pháp + bước (màn chiếu bày lời giải hai
// lần). Trắc nghiệm: bỏ `answer` khi đã có bước. Tự luận: giữ `answer`, bỏ phương pháp + bước.
// Sao lưu vào backups/soan-l10c3-20260915/don-loi-giai-<module>.md. Thêm `ghi` mới ghi.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/soan-l10c3-20260915';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const IDS = ['180ff14b-1a8a-474d-8340-c513eb1982ed', 'acd97216-75b9-44bc-9715-c942ca2a946d',
  '7139de4d-2690-406e-bf6f-63b552a4eeb4', '287ea12d-bf4d-4afb-ac28-55e84946c757',
  'd99f9b56-eb38-4819-a4f0-35e605c00286', 'ad5a7f4f-b168-4fb8-be98-ac1b2a330517', '6bc5b263-12e7-419a-8bb9-9305f2379b0a',
  'bbc47553-67da-43b1-b676-44f4f034adf6', '4d076cf4-3b7e-48af-9c78-d690a72782af'];

function don(md) {
  let n = 0;
  const ra = md.replace(/```quiz\n([\s\S]*?)```/g, (khoi, than) => {
    let q; try { q = JSON.parse(than); } catch { return khoi; }
    const coBuoc = !!q.phuong_phap_giai || (Array.isArray(q.cac_buoc_thuc_hien) && q.cac_buoc_thuc_hien.length > 0);
    if (!coBuoc || !q.answer) return khoi;
    if (q.type === 'essay') { delete q.phuong_phap_giai; delete q.cac_buoc_thuc_hien; }
    else delete q.answer;
    n++;
    return '```quiz\n' + JSON.stringify(q, null, 2) + '\n```';
  });
  return { ra, n };
}

mkdirSync(SAO_LUU, { recursive: true });
const { data } = await sb.from('lesson_modules').select('id,title,content_markdown,presentation_markdown').in('id', IDS);
for (const m of data) {
  const c = don(m.content_markdown || '');
  const p = don(m.presentation_markdown || '');
  console.log(`${m.title}: nội dung ${c.n} khối · trình chiếu ${p.n} khối`);
  if (!GHI || (c.n === 0 && p.n === 0)) continue;
  writeFileSync(`${SAO_LUU}/don-loi-giai-${m.id}.md`, m.content_markdown || '');
  if (m.presentation_markdown) writeFileSync(`${SAO_LUU}/don-loi-giai-${m.id}-trinh-chieu.md`, m.presentation_markdown);
  const upd = {};
  if (c.n) upd.content_markdown = c.ra;
  if (p.n) upd.presentation_markdown = p.ra;
  const { error } = await sb.from('lesson_modules').update(upd).eq('id', m.id);
  console.log(error ? '   ✗ ' + error.message : '   ✓ đã ghi');
}
if (!GHI) console.log('(thử)');
