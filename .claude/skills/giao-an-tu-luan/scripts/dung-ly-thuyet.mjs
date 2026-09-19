/**
 * Dựng module lý thuyết từ một tệp markdown do người soạn viết:
 *   {{Q:<mã câu kho>}}       → khối ```quiz``` (NLC / TLN / ĐS của kho, đúng khuôn app)
 *   {{Q:<mã câu kho>:tln}}   → câu TỰ LUẬN của kho ép thành trả lời ngắn (khi kho không có trắc
 *                              nghiệm cho dạng ấy; cần correct_answer ngắn trong kho)
 * Ghi content_markdown + presentation_markdown (khung màu, tách slide "Hướng dẫn giải").
 *
 *   node …/dung-ly-thuyet.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --bai 1 --tep scratch/…/lt-bai1.md [--ghi]
 *   node …/dung-ly-thuyet.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --cuoi --tep scratch/…/cong-thuc.md [--ghi]
 *      (--cuoi: module "Tổng hợp công thức cả chương" của bài Cuối chương N; không có bản trình chiếu)
 * Không --ghi thì chỉ in ra <tệp>.ra.md để soát.
 */
import { readFileSync, writeFileSync } from 'fs';
import { sb, lay, co, timChuong, khoCuaChuong, lopTu, khoiTuCau, khoiMd, sangTrinhChieu } from './_chung.mjs';

const LOP = lay('lop'), TEN_CHUONG = lay('chuong'), SO_BAI = lay('bai'), TEP = lay('tep'), CUOI = co('cuoi'), GHI = co('ghi');
if (!LOP || !TEN_CHUONG || !TEP || (!SO_BAI && !CUOI)) { console.error('Cần --lop --chuong --tep và (--bai N | --cuoi) [--ghi]'); process.exit(1); }

const { khoa, onTap, dsBai, soChuong } = await timChuong(LOP, TEN_CHUONG);
let lessonId, tenBai;
if (CUOI) {
  const { data } = await sb.from('lessons').select('id,title').eq('chapter_id', onTap.id).eq('title', `Cuối chương ${soChuong}`).maybeSingle();
  if (!data) { console.error(`Chưa có bài "Cuối chương ${soChuong}" — chạy dung-khung.mjs --ghi trước`); process.exit(1); }
  lessonId = data.id; tenBai = data.title;
} else {
  const b = dsBai.find(x => new RegExp(`^Bài ${SO_BAI}\\.`).test(x.title));
  if (!b) { console.error(`Không thấy "Bài ${SO_BAI}." trong chương`); process.exit(1); }
  lessonId = b.id; tenBai = b.title;
}

const kho = await khoCuaChuong(lopTu(khoa.title), TEN_CHUONG);
const theoMa = Object.fromEntries(kho.map(q => [q.question_id, q]));
const src = readFileSync(TEP, 'utf8').replace(/\r\n/g, '\n');
const loi = [];
const noiDung = src.replace(/\{\{Q:([^}:]+)(?::(tln))?\}\}/g, (_, ma, ep) => {
  const q = theoMa[ma.trim()];
  if (!q) { loi.push(`không thấy ${ma} trong kho chương này`); return `<!-- THIẾU ${ma} -->`; }
  try { return khoiMd(khoiTuCau(q, { epTLN: ep === 'tln' })); }
  catch (e) { loi.push(e.message); return `<!-- LỖI ${ma} -->`; }
});
if (loi.length) { console.error('Dừng vì:\n  ' + loi.join('\n  ')); process.exit(1); }
const trinhChieu = CUOI ? null : sangTrinhChieu(noiDung);
const soQuiz = (noiDung.match(/```quiz/g) || []).length;
writeFileSync(TEP.replace(/\.md$/, '') + '.ra.md', noiDung + (trinhChieu ? '\n\n<<<<<<<< PRESENTATION >>>>>>>>\n\n' + trinhChieu : ''));
console.log(`${tenBai}: ${noiDung.length} kí tự · ${soQuiz} câu tương tác${trinhChieu ? ` · trình chiếu ${trinhChieu.length} kí tự` : ''}`);
if (!GHI) { console.log('(chỉ xem — thêm --ghi để ghi)'); process.exit(0); }
const { data: mod } = await sb.from('lesson_modules').select('id,title').eq('lesson_id', lessonId).eq('type', 'theory').maybeSingle();
if (!mod) { console.error('Bài chưa có module theory — chạy dung-khung.mjs --ghi'); process.exit(1); }
const ghi = { content_markdown: noiDung }; if (trinhChieu) ghi.presentation_markdown = trinhChieu;
const { error } = await sb.from('lesson_modules').update(ghi).eq('id', mod.id);
console.log(error ? 'LỖI ' + error.message : `đã ghi module "${mod.title}" (${mod.id})`);
