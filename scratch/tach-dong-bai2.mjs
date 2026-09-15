// Màn chiếu co slide dài lại và bẻ dòng công thức nối bằng \qquad: định lí côsin, hệ quả,
// Heron, trung tuyến đều gãy giữa chừng. Tách mỗi công thức một dòng, bảng chọn công thức
// diện tích sang slide riêng. Sửa bản thảo, bản đầy đủ và module (content + presentation).
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
const GHI = process.argv.includes('ghi');

const THAY = [
  ['$$\\color{blue} a^2 = b^2 + c^2 - 2bc\\cos A \\qquad b^2 = c^2 + a^2 - 2ca\\cos B \\qquad c^2 = a^2 + b^2 - 2ab\\cos C$$',
   '$$\\color{blue} a^2 = b^2 + c^2 - 2bc\\cos A$$\n$$\\color{blue} b^2 = c^2 + a^2 - 2ca\\cos B$$\n$$\\color{blue} c^2 = a^2 + b^2 - 2ab\\cos C$$'],
  ['$$\\color{blue} \\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc} \\qquad \\cos B = \\dfrac{c^2 + a^2 - b^2}{2ca} \\qquad \\cos C = \\dfrac{a^2 + b^2 - c^2}{2ab}$$',
   '$$\\color{blue} \\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc} \\qquad \\cos B = \\dfrac{c^2 + a^2 - b^2}{2ca}$$\n$$\\color{blue} \\cos C = \\dfrac{a^2 + b^2 - c^2}{2ab}$$'],
  ['$$\\color{blue} S = \\dfrac{abc}{4R} \\qquad S = pr \\qquad S = \\sqrt{p(p-a)(p-b)(p-c)} \\ \\text{(công thức Heron)}$$\n\n**Chọn công thức theo dữ kiện:**',
   '$$\\color{blue} S = \\dfrac{abc}{4R} \\qquad S = pr$$\n$$\\color{blue} S = \\sqrt{p(p-a)(p-b)(p-c)} \\ \\text{(công thức Heron)}$$\n\n---\n\n**Chọn công thức theo dữ kiện:**'],
  ['$$\\color{blue} m_a^2 = \\dfrac{2\\left(b^2 + c^2\\right) - a^2}{4} \\qquad m_b^2 = \\dfrac{2\\left(c^2 + a^2\\right) - b^2}{4} \\qquad m_c^2 = \\dfrac{2\\left(a^2 + b^2\\right) - c^2}{4}$$',
   '$$\\color{blue} m_a^2 = \\dfrac{2\\left(b^2 + c^2\\right) - a^2}{4} \\qquad m_b^2 = \\dfrac{2\\left(c^2 + a^2\\right) - b^2}{4}$$\n$$\\color{blue} m_c^2 = \\dfrac{2\\left(a^2 + b^2\\right) - c^2}{4}$$'],
];

function ap(ten, a) {
  let n = 0;
  for (const [cu, moi] of THAY) {
    if (!a.includes(cu)) { console.log(`   ✗ ${ten}: không thấy "${cu.slice(0, 40)}…"`); continue; }
    a = a.split(cu).join(moi); n++;
  }
  console.log(`   ${ten}: thay ${n}/${THAY.length}`);
  return a;
}

for (const p of ['scratch/lt-l10c3-bai2.md', 'scratch/lt-l10c3-bai2-day-du.md']) {
  const moi = ap(p, readFileSync(p, 'utf8'));
  if (GHI) writeFileSync(p, moi);
}

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const id = 'acd97216-75b9-44bc-9715-c942ca2a946d';
const { data: m } = await sb.from('lesson_modules').select('content_markdown,presentation_markdown').eq('id', id).single();
const upd = { content_markdown: ap('content', m.content_markdown), presentation_markdown: ap('presentation', m.presentation_markdown || '') };
if (!GHI) { console.log('(thử)'); process.exit(0); }
const { error } = await sb.from('lesson_modules').update(upd).eq('id', id);
console.log(error ? '✗ ' + error.message : '✓ đã ghi module Bài 2');
