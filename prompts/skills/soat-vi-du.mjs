/**
 * VÍ DỤ MẪU TRONG SKILL PHẢI QUA ĐƯỢC CHÍNH BỘ KIỂM THỬ CỦA APP.
 *
 * Chạy:  node prompts/skills/soat-vi-du.mjs
 *
 * Vì sao soi ví dụ chứ không chỉ đọc lời dặn: AI học theo ví dụ mạnh hơn học theo lời dặn.
 * Skill Toán từng dặn đúng ("nhân đôi gạch chéo") nhưng ví dụ lại viết BỐN gạch chéo, và AI
 * làm theo ví dụ - sinh ra 74 câu hỏng trong ngân hàng, công thức in ra đứt giữa chừng
 * thành "Leftrightarrow x=3".
 *
 * Script tự chép src/utils sang thư mục tạm và thêm đuôi .ts vào các import tương đối, vì
 * node chạy TypeScript thẳng thì đòi đuôi đầy đủ mà mã nguồn lại viết theo lối của bundler.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

const GOC_REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Để ngoài node_modules: node từ chối đọc TypeScript nằm trong đó. */
const TAM = join(tmpdir(), 'soat-skill-lms');

/* ---------- Dựng bản .ts chạy được ---------- */
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
const THU_MUC_UTILS = join(GOC_REPO, 'src', 'utils');
for (const ten of readdirSync(THU_MUC_UTILS)) {
  if (!ten.endsWith('.ts')) continue;
  const ma = readFileSync(join(THU_MUC_UTILS, ten), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"');
  writeFileSync(join(TAM, ten), ma);
}
const nap = async (ten) => import(pathToFileURL(join(TAM, ten)).href);
const { docJsonCauHoi } = await nap('vaJson.ts');
const { cacCauTrongBai } = await nap('khoiSangCauHoi.ts');
const { soatMotCau } = await nap('kiemThuDe.ts');

/* ---------- Bốn skill cần soi ---------- */
const GOC_SKILL = 'G:/My Drive/Antigravity/';
const TEP = [
  ['Toán · bóc câu', 'luyen-tap/fervent-archimedes/.agents/skills/math-quiz-extractor/SKILL.md'],
  ['Lý · bóc câu', 'luyen-tap/fervent-archimedes/.agents/skills/physics-quiz-extractor/SKILL.md'],
  ['Toán · soạn bài', 'lythuyet-phandang/.agents/skills/lesson-drafter/SKILL.md'],
  ['Lý · soạn bài', 'lythuyet-phandang/.agents/skills/physics-lesson-drafter/SKILL.md'],
];

/* Chỉ soi lỗi công thức và cấu trúc câu. Không soi "thiếu phương pháp giải" vì ví dụ trong
   skill cố tình rút gọn cho ngắn, báo vào là báo oan. */
const NHOM_SOI = new Set(['congThucRong', 'doLaLe', 'latexTran', 'cheoDoi', 'matDauCheo',
  'dsThieuY', 'phuongAnTongHop', 'tlnKhongToDuoc', 'thieuPhuongAn']);

let tongCau = 0, tongLoi = 0;

for (const [ten, duong] of TEP) {
  console.log(`\n======== ${ten} ========`);
  let md;
  try { md = readFileSync(GOC_SKILL + duong, 'utf8'); }
  catch { console.log('  KHÔNG MỞ ĐƯỢC TỆP - kiểm lại ổ G có đang kết nối không'); tongLoi++; continue; }

  /* Hàng rào phải NẰM ĐẦU DÒNG: trong skill có cả chuỗi ```quiz``` viết chen trong câu văn. */
  const khoi = [...md.matchAll(/^```quiz[ \t]*\r?\n([\s\S]*?)^```/gm)];
  if (!khoi.length) { console.log('  (không có khối quiz nào)'); continue; }

  khoi.forEach((k, i) => {
    const than = k[1].trim();
    let items = [];
    try {
      /* Skill soạn bài viết MỘT object {…}, skill bóc câu viết MẢNG […]. Bộ đọc dành cho
         mảng - đưa object đơn vào thì nó tưởng mảng options là danh sách câu hỏi. */
      items = than.startsWith('{') ? [JSON.parse(than)] : docJsonCauHoi(than).items;
    } catch (e) {
      tongLoi++;
      console.log(`  khối ${i + 1}: KHÔNG ĐỌC ĐƯỢC JSON — ${String(e?.message).slice(0, 60)}`);
      return;
    }
    const cau = cacCauTrongBai(items.map((c, j) => ({ id: `k${i}-${j}`, type: 'quiz', content: c })));
    tongCau += cau.length;
    console.log(`  khối ${i + 1}: ${cau.length} câu`);
    for (const q of cau) {
      for (const l of soatMotCau(q, `câu ${q.soCau}`).filter(x => NHOM_SOI.has(x.ma))) {
        tongLoi++;
        console.log(`      ✗ câu ${q.soCau} [${l.ma}] ${l.moTa.slice(0, 68)}`);
      }
    }
  });
}

rmSync(TAM, { recursive: true, force: true });
console.log(`\n======== TỔNG ========`);
console.log(`${tongCau} câu ví dụ trong bốn skill · ${tongLoi} lỗi`);
console.log(tongLoi === 0
  ? 'Mọi ví dụ mẫu đều qua được bộ kiểm thử của app.'
  : 'CÒN LỖI - AI sẽ học theo ví dụ hỏng này.');
process.exit(tongLoi === 0 ? 0 : 1);
