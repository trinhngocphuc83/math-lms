import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const env = {}; for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('question_categories').select('*');
const seen = new Map(), xoa = [];
for (const d of data) { const k = [d.grade, d.topic, d.lesson, d.math_form].map(s => String(s).normalize('NFC')).join('|');
  if (!seen.has(k)) { seen.set(k, d); continue; }
  const a = seen.get(k); const giu = (a.yeu_cau_can_dat ? a : d), bo = giu === a ? d : a; seen.set(k, giu); xoa.push(bo); }
console.log(xoa.length, 'dòng trùng');
if (!process.argv.includes('ghi')) process.exit(0);
mkdirSync('backups/danh-muc-trung-20260913', { recursive: true }); writeFileSync('backups/danh-muc-trung-20260913/sao-luu.json', JSON.stringify(xoa, null, 1));
for (const x of xoa) await sb.from('question_categories').delete().eq('id', x.id);
console.log('✓ đã xoá');
