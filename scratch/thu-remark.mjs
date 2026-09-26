/* Thử xem khuôn bọc bảng nào qua được đúng chuỗi plugin mà app đang dùng. */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';

const bang = [
  '\\begin{array}{|c|c|c|}',
  '\\hline',
  '165 & 150 & 155 \\\\',
  '\\hline',
  '\\end{array}',
].join('\n');

const thu = {
  'liền một dòng': `Bảng sau:\n\n$$${bang}$$\n\nTìm mốt.`,
  '$$ trên dòng riêng': `Bảng sau:\n\n$$\n${bang}\n$$\n\nTìm mốt.`,
  'một dòng phẳng': `Bảng sau:\n\n$$${bang.replace(/\n/g, ' ')}$$\n\nTìm mốt.`,
  'phẳng, không dòng trống': `Bảng sau:\n$$${bang.replace(/\n/g, ' ')}$$\nTìm mốt.`,
};

const bo = unified().use(remarkParse).use(remarkMath).use(remarkBreaks).use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true }).use(rehypeKatex, { throwOnError: false });

const dem = (n, ra = { loi: [], o: 0 }) => {
  const lop = n.properties?.className;
  const co = (x) => Array.isArray(lop) ? lop.includes(x) : String(lop || '').includes(x);
  if (co('katex-error')) ra.loi.push(String(n.properties.title || '').slice(0, 80));
  if (co('mord')) ra.o++;
  (n.children || []).forEach((c) => dem(c, ra));
  return ra;
};

for (const [ten, md] of Object.entries(thu)) {
  const cay = await bo.run(bo.parse(md));
  const r = dem(cay);
  console.log(ten.padEnd(26), r.loi.length ? 'LỖI: ' + r.loi[0] : `OK · ${r.o} ô`);
}
