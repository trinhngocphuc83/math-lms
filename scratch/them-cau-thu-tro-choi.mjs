// Thêm/gỡ câu trắc nghiệm thử vào Bộ câu hỏi trò chơi của Bài 2 Toán 10 C3 để test chấm kín.
//   node scratch/them-cau-thu-tro-choi.mjs them   -> sao lưu rồi thêm 2 câu NLC + 1 TLN + 1 ĐS 4 ý
//   node scratch/them-cau-thu-tro-choi.mjs go     -> khôi phục bản đã sao lưu
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ID = '6d810d97-5308-47d9-8241-d72527da0da4';
const LUU = 'D:/claude/math-lms/backups/tro-choi-thu-20260918/module-6d810d97.md';
const viec = process.argv[2];
if (viec === 'them') {
  const { data } = await sb.from('lesson_modules').select('content_markdown').eq('id', ID).single();
  if (!existsSync(LUU)) { const { mkdirSync } = await import('fs'); mkdirSync('D:/claude/math-lms/backups/tro-choi-thu-20260918', { recursive: true }); writeFileSync(LUU, data.content_markdown); }
  const them = [
    { type: 'multiple_choice', muc: 1, question: 'THỬ 1. Trong tam giác $ABC$, định lí côsin cho $a^2$ bằng', options: ['$b^2 + c^2 - 2bc\\cos A$', '$b^2 + c^2 + 2bc\\cos A$', '$b^2 - c^2 - 2bc\\cos A$', '$2bc\\cos A$'], answerIndex: 0, answer: 'Định lí côsin: $a^2 = b^2 + c^2 - 2bc\\cos A$.' },
    { type: 'multiple_choice', muc: 2, question: 'THỬ 2. Tam giác $ABC$ có $b = 3$, $c = 4$, $\\widehat{A} = 90^\\circ$. Độ dài $a$ là', options: ['$5$', '$7$', '$\\sqrt{7}$', '$1$'], answerIndex: 0, answer: '$a^2 = 9 + 16 = 25 \\Rightarrow a = 5$.' },
    { type: 'short_answer', muc: 2, question: 'THỬ 3. Tam giác vuông cân có cạnh góc vuông bằng $1$. Cạnh huyền bằng bao nhiêu (làm tròn 2 chữ số)?', exactAnswer: '1,41', answer: '$\\sqrt{2} \\approx 1{,}41$.' },
    { type: 'true_false_cluster', muc: 3, question: 'THỬ 4. Xét tam giác $ABC$ bất kì.', options: [{ id: 'a', content: '$a = 2R\\sin A$', isTrue: true }, { id: 'b', content: '$S = \\dfrac{1}{2}ab\\sin C$', isTrue: true }, { id: 'c', content: '$a^2 = b^2 + c^2$', isTrue: false }, { id: 'd', content: '$\\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc}$', isTrue: true }], answer: 'a đúng (định lí sin), b đúng, c chỉ đúng khi vuông tại A, d đúng.' },
  ];
  const md = data.content_markdown.trimEnd() + '\n\n' + them.map(k => '```quiz\n' + JSON.stringify(k, null, 2) + '\n```').join('\n\n') + '\n';
  const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', ID);
  console.log(error ? error.message : 'đã thêm 4 câu thử, sao lưu ở ' + LUU);
} else if (viec === 'go') {
  const cu = readFileSync(LUU, 'utf8');
  const { error } = await sb.from('lesson_modules').update({ content_markdown: cu }).eq('id', ID);
  console.log(error ? error.message : 'đã khôi phục bản gốc (3 câu)');
} else console.log('them | go');
