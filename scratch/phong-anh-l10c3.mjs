// Ba hình cắt từ PDF chỉ rộng 320-355 px, dưới ngưỡng 600 px của đề trong bài giảng.
// Tải bản đang có về, phóng ×2 (lanczos), tải lên dưới TÊN MỚI (URL cũ bị CDN giữ bản cũ cả giờ),
// rồi thay URL trong kho và trong mọi module đang dùng. Chạy thử trước; thêm `ghi` mới ghi.
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const GOC = 'https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/';
const TEN = ['nap-kho-l10c3-ds-p12c8', 'nap-kho-l10c3-lkn-c11', 'nap-kho-l10c3-lkn-c20'];
mkdirSync('backups/phong-anh-l10c3-20260915', { recursive: true });

for (const ten of TEN) {
  const cu = GOC + ten + '.png';
  const { data: tep, error: e1 } = await sb.storage.from('lesson_images').download('editor_images/' + ten + '.png');
  if (e1) { console.log('✗ tải về', ten, e1.message); continue; }
  const buf0 = Buffer.from(await tep.arrayBuffer());
  const w0 = (await sharp(buf0).metadata()).width;
  const buf = await sharp(buf0).resize({ width: Math.max(720, w0 * 2), kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();
  const duongMoi = 'editor_images/' + ten + '-lon.png';
  const moi = GOC + ten + '-lon.png';

  const { data: cauKho } = await sb.from('questions').select('id,question_id,content').ilike('content', `%${ten}.png%`);
  const { data: mods } = await sb.from('lesson_modules').select('id,title,content_markdown,presentation_markdown').ilike('content_markdown', `%${ten}.png%`);
  console.log(`${ten}: ${w0}px → ${(await sharp(buf).metadata()).width}px · kho ${cauKho?.length || 0} câu · module ${mods?.length || 0}`);
  if (!GHI) continue;

  const { error } = await sb.storage.from('lesson_images').upload(duongMoi, buf, { contentType: 'image/png', upsert: true });
  if (error) { console.log('✗ tải lên', error.message); continue; }
  for (const q of cauKho || []) {
    writeFileSync(`backups/phong-anh-l10c3-20260915/${q.question_id}.json`, JSON.stringify(q, null, 1));
    await sb.from('questions').update({ content: q.content.split(cu).join(moi) }).eq('id', q.id);
  }
  for (const m of mods || []) {
    writeFileSync(`backups/phong-anh-l10c3-20260915/module-${m.id}.md`, m.content_markdown || '');
    const upd = { content_markdown: (m.content_markdown || '').split(cu).join(moi) };
    if (m.presentation_markdown && m.presentation_markdown.includes(cu)) upd.presentation_markdown = m.presentation_markdown.split(cu).join(moi);
    await sb.from('lesson_modules').update(upd).eq('id', m.id);
  }
  console.log(`   ✓ ${moi}`);
}
