/**
 * Dựng markdown cho "Bài tập ví dụ", "Bài tập tự luyện" của từng bài và ĐỀ 1…k của bài Cuối
 * chương N từ rut.json (rut-cau.mjs), rồi ghi vào đúng module. Mỗi câu một khối ```quiz``` tự
 * luận đúng khuôn app (answer = Phương pháp giải + Lời giải, sourceQuestionId, maCauHoi, muc).
 *
 *   node …/dung-module.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" [--ghi]
 * Không --ghi thì in ra scratch/giao-an-tu-luan/<chương>/ra-*.md để soát.
 */
import { readFileSync, writeFileSync } from 'fs';
import { sb, lay, co, timChuong, khoiTuCau, khoiMd, TEN_MUC, thuMucLamViec } from './_chung.mjs';

const LOP = lay('lop'), TEN_CHUONG = lay('chuong'), GHI = co('ghi');
if (!LOP || !TEN_CHUONG) { console.error('Cần --lop --chuong [--ghi]'); process.exit(1); }
const tm = thuMucLamViec(TEN_CHUONG);
const kq = JSON.parse(readFileSync(`${tm}/rut.json`, 'utf8'));
const { onTap, soChuong, chuong } = await timChuong(LOP, TEN_CHUONG);
const DIEM_DE = [2, 2, 2, 3, 1];

const nhomTheoDang = (cau, tieuDe, dan) => {
  const theoDang = new Map();
  for (const q of cau) { if (!theoDang.has(q.math_form)) theoDang.set(q.math_form, []); theoDang.get(q.math_form).push(q); }
  const ra = [tieuDe, '', dan, '']; let stt = 0;
  for (const [ten, ds] of [...theoDang.entries()].sort((a, b) => b[1].length - a[1].length)) {
    ra.push(`### 💡 ${ten}`, '');
    for (const q of ds.sort((a, b) => Number(a.difficulty) - Number(b.difficulty))) {
      stt++; const k = khoiTuCau(q);
      k.question = `**Câu ${stt}** *(${TEN_MUC[Number(q.difficulty)] || 'Thông hiểu'})*. ` + k.question;
      ra.push(khoiMd(k), '');
    }
    ra.push('---', '');
  }
  return ra.join('\n').trim() + '\n';
};

async function ghiModule(lessonId, title, md) {
  const { data: mod } = await sb.from('lesson_modules').select('id').eq('lesson_id', lessonId).eq('title', title).maybeSingle();
  if (!mod) { console.log(`   ✗ chưa có module "${title}" — chạy dung-khung.mjs --ghi`); return; }
  const { error } = await sb.from('lesson_modules').update({ content_markdown: md }).eq('id', mod.id);
  console.log(error ? `   LỖI ${error.message}` : `   đã ghi "${title}"`);
}

for (const b of kq.bai) {
  const mdVD = nhomTheoDang(b.viDu, `## 📘 BÀI TẬP VÍ DỤ — ${b.viDu.length} bài giải mẫu`,
    'Mỗi dạng hai bài, đọc đề, tự làm nháp rồi bấm **Hiển thị đáp án** để so với lời giải mẫu từng bước.');
  const mdTL = nhomTheoDang(b.tuLuyen, `## 📝 BÀI TẬP TỰ LUYỆN — ${b.tuLuyen.length} CÂU TỰ LUẬN`,
    'Trình bày lời giải đầy đủ từng câu. Làm xong bấm **Hiển thị đáp án** để đối chiếu. Mỗi câu ghi mức: *Nhận biết · Thông hiểu · Vận dụng*.');
  writeFileSync(`${tm}/ra-vi-du-${b.ten.slice(0, 6).replace(/\W/g, '')}.md`, mdVD);
  writeFileSync(`${tm}/ra-tu-luyen-${b.ten.slice(0, 6).replace(/\W/g, '')}.md`, mdTL);
  console.log(`${b.ten}: ví dụ ${b.viDu.length} câu (${mdVD.length} kí tự) · tự luyện ${b.tuLuyen.length} câu (${mdTL.length} kí tự)`);
  if (GHI) { await ghiModule(b.lessonId, 'Bài tập ví dụ', mdVD); await ghiModule(b.lessonId, 'Bài tập tự luyện', mdTL); }
}

const { data: cc } = await sb.from('lessons').select('id').eq('chapter_id', onTap.id).eq('title', `Cuối chương ${soChuong}`).maybeSingle();
for (const de of kq.de) {
  const ra = [`## 📝 ${de.ten} — ÔN TẬP CUỐI ${chuong.title}`, '', '**Thời gian 90 phút · 10 điểm.** Năm bài tự luận, trình bày đầy đủ; làm xong bấm **Hiển thị đáp án** từng bài để đối chiếu.', ''];
  de.cau.forEach((q, i) => {
    const k = khoiTuCau(q);
    k.question = `**Bài ${i + 1}** *(${DIEM_DE[i]},0 điểm · ${TEN_MUC[Number(q.difficulty)] || 'Thông hiểu'})*. ` + k.question;
    ra.push(khoiMd(k), '');
  });
  const md = ra.join('\n').trim() + '\n';
  writeFileSync(`${tm}/ra-${de.ten.replace(/\s/g, '-')}.md`, md);
  console.log(`${de.ten}: ${de.cau.length} bài (${md.length} kí tự)`);
  if (GHI) { if (!cc) console.log(`   ✗ chưa có bài "Cuối chương ${soChuong}"`); else await ghiModule(cc.id, de.ten, md); }
}
if (!GHI) console.log('\n(chỉ xem — thêm --ghi để ghi vào app)');
