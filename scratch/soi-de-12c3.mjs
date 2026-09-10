import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const kho = JSON.parse(readFileSync('scratch/kho-12c3.json', 'utf8'));
const cua = new Map(kho.map(q => [q.id, q]));

const { data: mods } = await sb.from('lesson_modules')
  .select('id,title,content_markdown').eq('lesson_id', 'd0a680f8-abba-4dc0-a768-d56703172bab')
  .order('order_index');

for (const m of (mods || []).filter(x => /ĐỀ/.test(x.title || ''))) {
  const md = m.content_markdown || '';
  const khoi = [...md.matchAll(/^```quiz[ \t]*\r?\n([\s\S]*?)^```/gm)];
  const loai = {}; let coNguon = 0; const trongKho = new Set();
  for (const k of khoi) {
    let d; try { d = JSON.parse(k[1]); } catch { continue; }
    for (const q of Array.isArray(d) ? d : [d]) {
      loai[q.type || '?'] = (loai[q.type || '?'] || 0) + 1;
      if (q.sourceQuestionId) { coNguon++; if (cua.has(q.sourceQuestionId)) trongKho.add(q.sourceQuestionId); }
    }
  }
  console.log(`${m.title}: ${khoi.length} khối · ${JSON.stringify(loai)}`);
  console.log(`   có sourceQuestionId: ${coNguon} · trong đó thuộc chương 3: ${trongKho.size}`);
  const chu = md.toLowerCase();
  const dau = ['tứ phân vị', 'khoảng biến thiên', 'phương sai', 'độ lệch chuẩn', 'ngoại lệ']
    .map(t => `${t}:${(chu.match(new RegExp(t, 'g')) || []).length}`).join(' · ');
  console.log(`   ${dau}`);
}
