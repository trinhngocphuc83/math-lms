// Giãn dòng bảng GTLG Bài 1 (dòng 35 của bản thảo): `\\ \hline` -> `\\[6pt] \hline`
// để tử/mẫu của phân số không chạm đường kẻ trên màn chiếu. Ghi cả bản thảo lẫn module.
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
const GHI = process.argv.includes('ghi');
const p = 'scratch/lt-l10c3-bai1.md';
const dong = readFileSync(p, 'utf8').split('\n');
const cu = dong[34];
if (!cu.startsWith('$$\\begin{array}')) { console.log('dòng 35 không phải bảng:', cu.slice(0, 40)); process.exit(1); }
const moi = cu.split('\\\\ \\hline').join('\\\\[6pt] \\hline');
console.log((moi.match(/\[6pt\]/g) || []).length, 'chỗ giãn');
dong[34] = moi; writeFileSync(p, dong.join('\n'));
const dd = 'scratch/lt-l10c3-bai1-day-du.md';
let a = readFileSync(dd, 'utf8');
if (!a.includes(cu)) { console.log('bản đầy đủ không có bảng cũ'); process.exit(1); }
a = a.split(cu).join(moi); writeFileSync(dd, a);
if (!GHI) { console.log('(thử)'); process.exit(0); }
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const id = '180ff14b-1a8a-474d-8340-c513eb1982ed';
const { data: m } = await sb.from('lesson_modules').select('content_markdown,presentation_markdown').eq('id', id).single();
if (!m.content_markdown.includes(cu)) { console.log('module không có bảng cũ'); process.exit(1); }
const { error } = await sb.from('lesson_modules').update({
  content_markdown: m.content_markdown.split(cu).join(moi),
  presentation_markdown: (m.presentation_markdown || '').split(cu).join(moi),
}).eq('id', id);
console.log(error ? '✗ ' + error.message : '✓ đã ghi module');
