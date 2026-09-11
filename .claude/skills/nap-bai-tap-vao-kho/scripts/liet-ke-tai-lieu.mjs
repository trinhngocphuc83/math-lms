/**
 * Bước 1: kê tài liệu trong thư mục thầy để sẵn và chuẩn bị để đọc được.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/liet-ke-tai-lieu.mjs "G:\My Drive\Bai tap Toan 9"
 *
 * Với mỗi tệp:
 *   - PDF  → dựng từng trang thành ảnh PNG (pdftoppm, 130 dpi) vào scratch/nap-kho/<tên>/trang-NN.png,
 *            đồng thời thử bóc chữ (pdftotext); có chữ thì đỡ phải nhìn ảnh.
 *   - DOCX → bóc chữ dạng Markdown (mammoth) vào scratch/nap-kho/<tên>.md; ảnh trong Word được
 *            trích ra thành tệp riêng.
 *   - Ảnh  → chép vào scratch/nap-kho/<tên>/.
 * In ra danh sách để biết phải đọc gì. Không đụng tới cơ sở dữ liệu.
 */
import { readdirSync, statSync, mkdirSync, existsSync, copyFileSync, writeFileSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { execFileSync } from 'child_process';

const thuMuc = process.argv[2];
if (!thuMuc || !existsSync(thuMuc)) { console.error('Cần đường dẫn thư mục tài liệu.'); process.exit(1); }
const RA = 'scratch/nap-kho';
mkdirSync(RA, { recursive: true });

const tenSach = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const kq = [];

for (const ten of readdirSync(thuMuc)) {
  const duong = join(thuMuc, ten);
  if (!statSync(duong).isFile()) continue;
  const duoi = extname(ten).toLowerCase();
  const goc = tenSach(basename(ten, extname(ten)));

  if (duoi === '.pdf') {
    const th = join(RA, goc); mkdirSync(th, { recursive: true });
    const tam = join(RA, goc + '.pdf'); copyFileSync(duong, tam);   // pdftoppm không ưa đường dẫn có dấu
    let soTrang = 0;
    try {
      execFileSync('pdftoppm', ['-r', '130', '-png', tam, join(th, 'trang')]);
      soTrang = readdirSync(th).filter(f => /^trang-\d+\.png$/.test(f)).length;
    } catch (e) { console.log(`  ✗ pdftoppm hỏng với ${ten}: ${e.message}`); }
    let chu = '';
    try { chu = execFileSync('pdftotext', ['-layout', tam, '-'], { encoding: 'utf8' }); } catch { /* không có pdftotext cũng được */ }
    const coChu = chu.replace(/\s+/g, '').length > 200 * Math.max(1, soTrang) * 0.2;
    if (coChu) writeFileSync(join(RA, goc + '.txt'), chu);
    kq.push({ ten, loai: 'PDF', trang: soTrang, chu: coChu ? 'có chữ → đọc ' + goc + '.txt' : 'ảnh quét → nhìn từng trang', thuMuc: th });
  } else if (duoi === '.docx' || duoi === '.doc') {
    try {
      const mammoth = await import('mammoth');
      const anhDir = join(RA, goc + '-anh'); mkdirSync(anhDir, { recursive: true });
      let dem = 0;
      const r = await mammoth.default.convertToMarkdown({ path: duong }, {
        convertImage: mammoth.default.images.imgElement(async (img) => {
          const buf = await img.read(); const f = `anh-${String(++dem).padStart(2, '0')}.${(img.contentType || 'image/png').split('/')[1]}`;
          writeFileSync(join(anhDir, f), buf); return { src: join(anhDir, f) };
        }),
      });
      writeFileSync(join(RA, goc + '.md'), r.value);
      kq.push({ ten, loai: 'Word', chu: `đọc ${goc}.md · ${dem} ảnh ở ${goc}-anh/` });
    } catch (e) { console.log(`  ✗ không đọc được ${ten}: ${e.message}`); }
  } else if (/\.(png|jpe?g|webp)$/.test(duoi)) {
    const th = join(RA, 'anh-roi'); mkdirSync(th, { recursive: true });
    copyFileSync(duong, join(th, goc + duoi));
    kq.push({ ten, loai: 'Ảnh', chu: 'nhìn ' + join(th, goc + duoi) });
  } else {
    kq.push({ ten, loai: duoi, chu: 'bỏ qua (không biết đọc)' });
  }
}

console.log(`Thư mục: ${thuMuc} · ${kq.length} tệp\n`);
for (const k of kq) console.log(`• ${k.ten}\n     ${k.loai}${k.trang ? ` · ${k.trang} trang → ${k.thuMuc}/trang-NN.png` : ''} · ${k.chu}`);
writeFileSync(join(RA, 'tai-lieu.json'), JSON.stringify(kq, null, 1));
