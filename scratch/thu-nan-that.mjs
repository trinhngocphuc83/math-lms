/* Nắn 5 bảng thật trong bản nháp của thầy rồi đẩy qua ĐÚNG chuỗi plugin của app, xem có
   dựng thành bảng không (đây là phép đo cuối trước khi báo xong). */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import { nanBangLatex } from '../src/utils/nanBangLatex.ts';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const bo = unified().use(remarkParse).use(remarkMath).use(remarkBreaks).use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true }).use(rehypeKatex, { throwOnError: false });

const dem = (n, ra = { loi: [], o: 0 }) => {
  const lop = n.properties?.className;
  const co = (x) => (Array.isArray(lop) ? lop.includes(x) : String(lop || '').includes(x));
  if (co('katex-error')) ra.loi.push(String(n.properties.title || '').slice(0, 80));
  if (co('mord')) ra.o++;
  (n.children || []).forEach((c) => dem(c, ra));
  return ra;
};

const { data } = await sb.from('ban_nhap_soan').select('du_lieu').eq('loai', 'ngan_hang');
let ok = 0, hong = 0;
for (const n of data) {
  for (const q of n.du_lieu?.parsedQuestions || []) {
    const t = nanBangLatex(q.content).text;
    if (!t.includes('begin{array}')) continue;
    const r = dem(await bo.run(bo.parse(t)));
    if (r.loi.length) { hong++; console.log('✗', q.temp_id.slice(0, 12), r.loi[0]); }
    else { ok++; console.log('✓', q.temp_id.slice(0, 12), r.o, 'ô chữ'); }
  }
}
console.log(`\nbảng dựng thành bảng thật: ${ok} · hỏng: ${hong}`);
