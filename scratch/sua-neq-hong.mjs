/**
 * Sửa \neq / \ne bị phép thay "\n" làm hỏng trong khối ```quiz``` của bài giảng.
 *
 * Trong JSON, xuống dòng là "\n" (một dấu chéo), còn lệnh LaTeX là "\\neq" (hai dấu chéo).
 * Chỗ hỏng là "\neq" một dấu chéo — JSON đọc thành xuống dòng + "eq". Sửa bằng cách thêm
 * một dấu chéo nữa. Chỉ đụng bên trong khối quiz; sao lưu từng module trước khi ghi.
 *
 *   node scratch/sua-neq-hong.mjs        -> thử
 *   node scratch/sua-neq-hong.mjs ghi    -> ghi thật
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const GHI = process.argv.includes('ghi');
const SAO_LUU = 'backups/neq-hong-20260911';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let mods = [], from = 0;
while (true) {
  const { data } = await sb.from('lesson_modules').select('id,title,content_markdown').range(from, from + 999);
  mods.push(...(data || [])); if (!data || data.length < 1000) break; from += 1000;
}

const HONG = /(^|[^\\])\\n(?=eq\b|e\b|abla\b|u\b|ot\b|ewline\b)/g;
const sua = (md) => (md || '').replace(/```quiz\n([\s\S]*?)\n```/g, (khoi, ruot) =>
  '```quiz\n' + ruot.replace(HONG, '$1\\\\n') + '\n```');

let tongModule = 0, tongCho = 0;
for (const m of mods) {
  const moi = sua(m.content_markdown);
  if (moi === (m.content_markdown || '')) continue;
  const so = ((m.content_markdown || '').match(/```quiz\n[\s\S]*?\n```/g) || []).join('\n').match(HONG)?.length || 0;
  tongModule++; tongCho += so;
  /* Khối sửa xong phải vẫn là JSON hợp lệ. */
  for (const k of moi.matchAll(/```quiz\n([\s\S]*?)\n```/g)) JSON.parse(k[1]);
  console.log(`${so} chỗ · ${m.title} (${m.id})`);
  if (!GHI) continue;
  mkdirSync(SAO_LUU, { recursive: true });
  const tep = `${SAO_LUU}/${m.id}.md`;
  if (!existsSync(tep)) writeFileSync(tep, m.content_markdown || '');
  const { error } = await sb.from('lesson_modules').update({ content_markdown: moi }).eq('id', m.id);
  console.log(error ? `   ✗ ${error.message}` : '   ✓');
}
console.log(`\n${tongModule} module · ${tongCho} chỗ${GHI ? '' : ' (thử - chưa ghi)'}`);
