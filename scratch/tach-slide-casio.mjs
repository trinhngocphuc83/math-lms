// Slide "Phương pháp giải" + "Bấm máy" gộp chung bị màn chiếu co nhỏ chữ. Chèn `---`
// trước mỗi mục `### 🖩 Bấm máy Casio` để bấm máy thành slide riêng — sửa bản thảo,
// bản đầy đủ và module (content + presentation) của cả hai bài.
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
const GHI = process.argv.includes('ghi');
const MUC = '### 🖩 Bấm máy Casio fx-580VN X';

function ap(ten, a) {
  const dong = a.split('\n');
  let n = 0;
  for (let i = 0; i < dong.length; i++) {
    if (!dong[i].startsWith(MUC)) continue;
    let j = i - 1; while (j >= 0 && dong[j].trim() === '') j--;
    if (dong[j] === '---') continue;
    dong.splice(i, 0, '---', ''); i += 2; n++;
  }
  console.log(`   ${ten}: chèn ${n} chỗ`);
  return dong.join('\n');
}

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BAI = [
  { tep: 'scratch/lt-l10c3-bai1', id: '180ff14b-1a8a-474d-8340-c513eb1982ed' },
  { tep: 'scratch/lt-l10c3-bai2', id: 'acd97216-75b9-44bc-9715-c942ca2a946d' },
];
for (const b of BAI) {
  for (const p of [b.tep + '.md', b.tep + '-day-du.md']) {
    const moi = ap(p, readFileSync(p, 'utf8'));
    if (GHI) writeFileSync(p, moi);
  }
  const { data: m } = await sb.from('lesson_modules').select('content_markdown,presentation_markdown').eq('id', b.id).single();
  const upd = { content_markdown: ap(b.id + ' content', m.content_markdown), presentation_markdown: ap(b.id + ' presentation', m.presentation_markdown || '') };
  if (!GHI) continue;
  const { error } = await sb.from('lesson_modules').update(upd).eq('id', b.id);
  console.log(error ? '✗ ' + error.message : '✓ đã ghi ' + b.id);
}
if (!GHI) console.log('(thử)');
