// Soi các câu có ảnh: địa chỉ ảnh đang ở dạng gì, và tải về được không.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
for (const l of fs.readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const nap = async () => {
  const ra = [];
  for (let p = 0; ; p++) {
    const { data } = await sb.from('questions')
      .select('question_id, grade, subject, content, image_url')
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!data?.length) break; ra.push(...data); if (data.length < 1000) break;
  }
  return ra;
};
const kho = await nap();
const T = (s) => String(s ?? '').trim();

/** Mọi địa chỉ ảnh của một câu: cột image_url và ảnh markdown nhúng trong nội dung. */
const layAnh = (q) => {
  const ra = [];
  if (T(q.image_url)) ra.push({ nguon: 'image_url', url: T(q.image_url) });
  for (const m of T(q.content).matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    ra.push({ nguon: 'trong nội dung', url: m[1] });
  }
  for (const m of T(q.content).matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    ra.push({ nguon: 'thẻ img', url: m[1] });
  }
  return ra;
};

const coAnh = kho.filter(q => layAnh(q).length > 0);
console.log(`${kho.length} câu, trong đó ${coAnh.length} câu có ảnh.\n`);

/* --- 1. Địa chỉ ảnh đang ở dạng gì --- */
const kieu = new Map();
const mau = new Map();
for (const q of coAnh) {
  for (const a of layAnh(q)) {
    let k;
    if (/^https?:\/\//i.test(a.url)) {
      try { k = 'http · ' + new URL(a.url).host; } catch { k = 'http · địa chỉ hỏng'; }
    } else if (/^data:/i.test(a.url)) k = 'data: nhúng thẳng';
    else if (/^blob:/i.test(a.url)) k = 'blob: (tạm, chắc chắn vỡ)';
    else if (/^\//.test(a.url)) k = 'đường dẫn tương đối';
    else k = 'dạng lạ';
    kieu.set(k, (kieu.get(k) || 0) + 1);
    if (!mau.has(k)) mau.set(k, { q: q.question_id, url: a.url.slice(0, 110), nguon: a.nguon });
  }
}
console.log('=== ĐỊA CHỈ ẢNH ĐANG Ở DẠNG GÌ ===');
[...kieu.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
  const v = mau.get(k);
  console.log(`  ${String(n).padStart(4)}  ${k}`);
  console.log(`        ví dụ ${v.q} (${v.nguon}): ${v.url}`);
});

/* --- 2. Thử tải thật một mẫu --- */
const dsUrl = [];
for (const q of coAnh) for (const a of layAnh(q)) if (/^https?:/i.test(a.url)) dsUrl.push({ q: q.question_id, ...a });

const buoc = Math.max(1, Math.floor(dsUrl.length / 40));
const thu = dsUrl.filter((_, i) => i % buoc === 0).slice(0, 40);
console.log(`\n=== THỬ TẢI ${thu.length} ẢNH (mẫu rải đều trong ${dsUrl.length} ảnh) ===`);

const theoMa = new Map();
const hong = [];
for (const t of thu) {
  try {
    const res = await fetch(t.url, { method: 'GET' });
    const k = `${res.status} ${res.headers.get('content-type') || ''}`.trim();
    theoMa.set(k, (theoMa.get(k) || 0) + 1);
    if (!res.ok) hong.push(`${t.q} · ${res.status} · ${t.url.slice(0, 90)}`);
  } catch (e) {
    theoMa.set('không kết nối được', (theoMa.get('không kết nối được') || 0) + 1);
    hong.push(`${t.q} · lỗi mạng · ${t.url.slice(0, 90)}`);
  }
}
[...theoMa.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}  ${k}`));
if (hong.length) {
  console.log('\n  Ảnh tải không được:');
  hong.slice(0, 8).forEach(x => console.log('    ' + x));
}
