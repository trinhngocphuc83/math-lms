/**
 * Cắt hình vẽ ra khỏi ảnh trang rồi tải lên kho ảnh bài giảng, in ra địa chỉ để nhúng vào đề.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/cat-anh.mjs <ảnh trang> <x> <y> <rộng> <cao> <tên-anh> [--xem]
 *
 * Toạ độ tính bằng pixel trên chính ảnh trang (đã dựng ở bước 1). `--xem` chỉ cắt ra
 * scratch/nap-kho/xem/<tên>.png để mở lên nhìn cho đúng khung rồi mới tải; không có `--xem`
 * thì cắt + tải luôn và in URL. Tải lại cùng tên là ghi đè (upsert).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const [nguon, x, y, w, h, ten] = process.argv.slice(2);
const XEM = process.argv.includes('--xem');
if (!nguon || !ten) { console.error('Cần: <ảnh trang> <x> <y> <rộng> <cao> <tên-anh> [--xem]'); process.exit(1); }

const anh = sharp(nguon).extract({ left: Number(x), top: Number(y), width: Number(w), height: Number(h) });
mkdirSync('scratch/nap-kho/xem', { recursive: true });
const tepXem = `scratch/nap-kho/xem/${ten}.png`;
await anh.clone().png().toFile(tepXem);
if (XEM) { console.log(`Đã cắt để xem: ${tepXem}`); process.exit(0); }

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const buf = await sharp(tepXem).png({ compressionLevel: 9 }).toBuffer();
const duong = `editor_images/nap-kho-${ten}.png`;
const { error } = await sb.storage.from('lesson_images').upload(duong, buf, { contentType: 'image/png', upsert: true });
if (error) { console.error('✗ tải lên:', error.message); process.exit(1); }
const { data } = sb.storage.from('lesson_images').getPublicUrl(duong);
console.log(`![Hình ảnh](${data.publicUrl})`);
