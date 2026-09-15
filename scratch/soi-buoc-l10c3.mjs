// Soi các khối quiz trong mọi module chương 3 lớp 10: bước nào chỉ là tiêu đề
// ("Phương pháp giải:", "Lời giải:") hay phương pháp trùng nguyên văn bước 1.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const IDS = ['180ff14b-1a8a-474d-8340-c513eb1982ed', 'acd97216-75b9-44bc-9715-c942ca2a946d',
  '7139de4d-2690-406e-bf6f-63b552a4eeb4', '287ea12d-bf4d-4afb-ac28-55e84946c757',
  'd99f9b56-eb38-4819-a4f0-35e605c00286', 'ad5a7f4f-b168-4fb8-be98-ac1b2a330517', '6bc5b263-12e7-419a-8bb9-9305f2379b0a',
  'bbc47553-67da-43b1-b676-44f4f034adf6', '4d076cf4-3b7e-48af-9c78-d690a72782af'];
const { data } = await sb.from('lesson_modules').select('id,title,content_markdown').in('id', IDS);
let tong = 0, tieuDe = 0, trung = 0, thieu = 0;
for (const m of data) {
  const blocks = [...m.content_markdown.matchAll(/```quiz\n([\s\S]*?)```/g)].map(x => { try { return JSON.parse(x[1]); } catch { return null; } }).filter(Boolean);
  for (const b of blocks) {
    tong++;
    const buoc = b.cac_buoc_thuc_hien || [];
    if (buoc.some(s => /^(Phương pháp giải|Lời giải|Hướng dẫn giải)\s*:/i.test(String(s).trim())) || /^(Phương pháp giải|Lời giải)\s*:/i.test(String(b.phuong_phap_giai || '').trim())) { tieuDe++; if (tieuDe <= 3) console.log('TIÊU ĐỀ', m.title, b.maCauHoi || b.sourceQuestionId, JSON.stringify(buoc.slice(0, 2))); }
    if (buoc.length && String(b.phuong_phap_giai || '').trim() === String(buoc[0]).trim()) trung++;
    if (!buoc.length) thieu++;
  }
}
console.log({ tong, tieuDe, trung, thieu });
