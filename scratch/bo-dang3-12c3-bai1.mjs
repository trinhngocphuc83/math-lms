/**
 * Bỏ mục "DẠNG 3: CÁC SỐ ĐẶC TRƯNG CỦA MẪU KHÔNG GHÉP NHÓM" khỏi lý thuyết Bài 1 chương 3
 * Toán 12 và đổi DẠNG 4 thành DẠNG 3.
 *
 * Vì sao bỏ: chương này (KNTT Toán 12, chương III) chỉ nói về mẫu GHÉP NHÓM; số liệu gốc
 * là bài của lớp 10. Kho không có câu nào của Bài 1 cho mẫu không ghép nhóm - hai câu
 * tương tác từng nằm ở mục này thực ra hỏi SỐ TRUNG BÌNH ghép nhóm (đã gắn lại dạng, chuyển
 * sang lớp 11). Giữ mục mà không có câu rút từ kho thì trái nguyên tắc của skill; hỏi
 * điều chưa dạy thì trái điều thầy vừa nhắc. Bản cũ được sao lưu, muốn khôi phục thì
 * update lại từ tệp trong backups/.
 *
 *   node scratch/bo-dang3-12c3-bai1.mjs [ghi]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ID = '83dc4d8b-7a22-405b-9db6-2e798f2e7c26';   // Lý thuyết Bài 1

const { data: m } = await sb.from('lesson_modules').select('content_markdown').eq('id', ID).single();
const md = m.content_markdown;
const a = md.indexOf('## 💡 DẠNG 3:');
const b = md.indexOf('## 💡 DẠNG 4:');
if (a < 0 || b < 0 || b < a) { console.error('Không thấy mốc DẠNG 3 / DẠNG 4'); process.exit(1); }
const moi = (md.slice(0, a) + md.slice(b).replace('## 💡 DẠNG 4:', '## 💡 DẠNG 3:')).replace(/\n{3,}/g, '\n\n');
const soQuiz = (s) => (s.match(/```quiz/g) || []).length;
console.log(`bỏ ${b - a} ký tự · quiz ${soQuiz(md)} -> ${soQuiz(moi)} · heading còn:`);
console.log(moi.split('\n').filter(l => /DẠNG \d/.test(l)).join('\n'));
if (!GHI) { console.log('Thêm "ghi" để ghi.'); process.exit(0); }
const thuMuc = `backups/bo-dang3-12c3-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
mkdirSync(thuMuc, { recursive: true });
writeFileSync(`${thuMuc}/${ID}.md`, md);
const { error } = await sb.from('lesson_modules').update({ content_markdown: moi }).eq('id', ID);
console.log(error ? '✗ ' + error.message : `✓ đã ghi · sao lưu ${thuMuc}/${ID}.md`);
