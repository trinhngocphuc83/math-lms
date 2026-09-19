/**
 * RÚT CÂU TỰ LUẬN từ kho cho cả chương THCS, một lượt cho mọi module:
 *   mỗi bài:   "Bài tập ví dụ"     8–10 câu (2/dạng, chỉ NB–TH)
 *              "Bài tập tự luyện"  20 câu (14 TH · 3 NB · 3 VD), xoay vòng dạng
 *   cuối chương: ĐỀ 1…k, mỗi đề 5 bài [NB, TH, TH, TH nhiều ý, VD], 5 dạng khác nhau, xoay vòng bài
 *
 * Luật: chỉ câu TL sạch (bộ kiểm thử app), có lời giải; đề nhắc hình mà không có ảnh thì bỏ;
 * không trùng câu tương tác đã chèn trong lý thuyết; không trùng giữa các module — so bằng id,
 * vân tay chữ của app VÀ vân tay số liệu (cùng dạng + cùng bộ số trong đề, quy "2{,}5" về "2,5").
 *
 *   node …/rut-cau.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" [--de 4] [--vi-du 10] [--loai CH_a,CH_b]
 *   → scratch/giao-an-tu-luan/<chương>/rut.json (đọc soát rồi mới dung-module.mjs)
 * --loai: mã câu loại thêm sau khi rà (dùng hệ thức ngoài chương trình, trùng đề…).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { sb, lay, timChuong, khoCuaChuong, lopTu, thuMucLamViec } from './_chung.mjs';

const LOP = lay('lop'), TEN_CHUONG = lay('chuong');
const SO_DE = Number(lay('de', 4)), SO_VI_DU = Number(lay('vi-du', 10)), SO_TU_LUYEN = 20;
const LOAI = new Set(String(lay('loai', '')).split(',').map(s => s.trim()).filter(Boolean));
if (!LOP || !TEN_CHUONG) { console.error('Cần --lop --chuong [--de 4] [--vi-du 10] [--loai …]'); process.exit(1); }

/* Bộ kiểm thử và vân tay của app (TypeScript) */
const TAM = join(process.cwd(), '.tam-rut');
rmSync(TAM, { recursive: true, force: true }); mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'").replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
const { soatMotCau } = await import(pathToFileURL(join(TAM, 'kiemThuDe.ts')).href);
const { taoKhoaSoSanh, doGiongNhau, NGUONG_NGHI_TRUNG } = await import(pathToFileURL(join(TAM, 'questionFingerprint.ts')).href);
const LOI_HONG = new Set(['congThucRong', 'doLaLe', 'latexTran', 'cheoDoi', 'matDauCheo', 'khongCoDapAn', 'choHinhChuaCoAnh']);

const { khoa, onTap, dsBai, soChuong } = await timChuong(LOP, TEN_CHUONG);
const lop = lopTu(khoa.title);
const kho = await khoCuaChuong(lop, TEN_CHUONG);

/* câu tương tác đã chèn trong các module lý thuyết của chương */
const daDungId = new Set(); const daDungVan = [];
for (const b of dsBai) {
  const { data: mods } = await sb.from('lesson_modules').select('content_markdown').eq('lesson_id', b.id).eq('type', 'theory');
  for (const m of mods || []) for (const k of String(m.content_markdown || '').matchAll(/```quiz[^\n]*\n([\s\S]*?)```/g)) {
    try { const j = JSON.parse(k[1]); for (const c of (Array.isArray(j) ? j : [j])) { if (c?.sourceQuestionId) daDungId.add(c.sourceQuestionId); if (c?.question) daDungVan.push(taoKhoaSoSanh({ content: c.question }).khuonChu); } } catch { /* thôi */ }
  }
}

const nhacHinh = (q) => /hình (bên|vẽ|sau|dưới|trên)|\(H\.\s*\d|H\.\d|hình \d/i.test(String(q.content)) && !q.image_url && !/!\[/.test(String(q.content));
const boSo = (q) => {
  const so = (String(q.content).replace(/\{,\}/g, ',').replace(/!\[[^\]]*\]\([^)]*\)/g, '').match(/\d+(?:[.,]\d+)?/g) || [])
    .map(x => x.replace(',', '.')).filter(x => !['90', '180', '0'].includes(x)).sort();
  return so.length >= 2 ? String(q.math_form) + '|' + so.join(',') : null;
};
const soY = (q) => (String(q.content).match(/(^|\n)\s*[a-e]\)/g) || []).length;

let boHong = 0, boHinh = 0, boTrung = 0;
const sach = [];
for (const q of kho) {
  if (q.question_type !== 'TL') continue;
  if (LOAI.has(q.question_id) || daDungId.has(q.id)) { boTrung++; continue; }
  if (!String(q.explanation || '').trim() || soatMotCau(q, '').some(l => LOI_HONG.has(l.ma))) { boHong++; continue; }
  if (nhacHinh(q)) { boHinh++; continue; }
  const v = taoKhoaSoSanh(q).khuonChu;
  if (daDungVan.some(d => doGiongNhau(v, d) >= NGUONG_NGHI_TRUNG)) { boTrung++; continue; }
  sach.push(q);
}
console.log(`${khoa.title} › ${TEN_CHUONG}: kho ${kho.length} câu, tự luận sạch ${sach.length} (bỏ ${boHong} hỏng · ${boHinh} thiếu hình · ${boTrung} đã dùng/loại)`);

/* ---- chọn ---- */
const daLay = new Set(); const soDaLay = new Set();
const lay1 = (q) => { const k = boSo(q); if (k && soDaLay.has(k)) return false; if (k) soDaLay.add(k); daLay.add(q.id); return true; };
const khoaVanTay = (q) => { const v = taoKhoaSoSanh(q).khuonChu; for (const x of sach) if (!daLay.has(x.id) && doGiongNhau(taoKhoaSoSanh(x).khuonChu, v) >= NGUONG_NGHI_TRUNG) daLay.add(x.id); };
const theoDang = (nguon) => {
  const m = new Map();
  for (const q of nguon) { if (daLay.has(q.id)) continue; const d = q.math_form || '?'; if (!m.has(d)) m.set(d, []); m.get(d).push(q); }
  for (const ds of m.values()) ds.sort((a, b) => (Number(a.usage_count) || 0) - (Number(b.usage_count) || 0));
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};
const mucLa = (q, ds) => ds.includes(String(q.difficulty));

/** Chọn `can` câu theo hạn ngạch mức, xoay vòng dạng; kho thiếu thì bù theo `buThuTu`. */
function chon(nguon, can, hanNgach, buThuTu) {
  const dang = theoDang(nguon); const ra = []; const con = { ...hanNgach };
  for (const muc of Object.keys(hanNgach)) {
    let vong = 0;
    while (con[muc] > 0 && ra.length < can) {
      let them = false;
      for (const [, ds] of dang) {
        if (con[muc] <= 0 || ra.length >= can) break;
        const q = ds.filter(x => String(x.difficulty) === muc && !daLay.has(x.id))[vong];
        if (!q || !lay1(q)) continue;
        ra.push(q); khoaVanTay(q); con[muc]--; them = true;
      }
      if (!them) break; vong++;
    }
  }
  for (const muc of buThuTu) for (const [, ds] of dang) for (const q of ds) {
    if (ra.length >= can) break;
    if (!daLay.has(q.id) && String(q.difficulty) === muc && lay1(q)) { ra.push(q); khoaVanTay(q); }
  }
  return ra.sort((a, b) => Number(a.difficulty) - Number(b.difficulty));
}
/** Bài tập ví dụ: 2 câu mỗi dạng, chỉ NB–TH, dạng đông trước. */
function chonViDu(nguon, can) {
  const dang = theoDang(nguon.filter(q => mucLa(q, ['1', '2']))); const ra = [];
  for (let vong = 0; vong < 2 && ra.length < can; vong++) for (const [, ds] of dang) {
    if (ra.length >= can) break;
    const q = ds.filter(x => !daLay.has(x.id))[0];
    if (q && lay1(q)) { ra.push(q); khoaVanTay(q); }
  }
  return ra.sort((a, b) => Number(a.difficulty) - Number(b.difficulty));
}
/** Một đề 5 bài: [NB, TH, TH, TH nhiều ý, VD] — 5 dạng khác nhau, xoay vòng bài (bài ít câu trước). */
const dangBai5DaDung = new Set();   // để bài 5 của các đề không cùng một dạng
function chonDe(nguon, dsBaiTen) {
  const KHUON = [['1'], ['2'], ['2'], ['2'], ['3', '4']];
  const ra = []; const dangDung = new Set();
  const thuTuBai = [...dsBaiTen].sort((a, b) => nguon.filter(q => q.lesson === a).length - nguon.filter(q => q.lesson === b).length);
  for (let i = 0; i < 5; i++) {
    let chonDuoc = null;
    const uuTien = i === 3 ? (q) => soY(q) >= 2 : i === 4 ? (q) => !dangBai5DaDung.has(q.math_form) : () => true;
    for (const lan of [0, 1, 2]) {   // lan 0: đúng mức + ưu tiên; 1: đúng mức; 2: bù mức khác
      for (const ten of thuTuBai) {
        const ung = nguon.filter(q => q.lesson === ten && !daLay.has(q.id) && !dangDung.has(q.math_form)
          && (lan === 2 ? mucLa(q, ['1', '2', '3', '4']) : mucLa(q, KHUON[i])) && (lan === 0 ? uuTien(q) : true))
          .sort((a, b) => (Number(a.usage_count) || 0) - (Number(b.usage_count) || 0));
        const q = ung.find(x => { const k = boSo(x); return !(k && soDaLay.has(k)); });
        if (q) { chonDuoc = q; break; }
      }
      if (chonDuoc) break;
    }
    if (!chonDuoc) break;
    lay1(chonDuoc); khoaVanTay(chonDuoc); dangDung.add(chonDuoc.math_form); ra.push(chonDuoc);
    if (i === 4) dangBai5DaDung.add(chonDuoc.math_form);
    thuTuBai.push(thuTuBai.shift());   // xoay vòng bài
  }
  return ra;
}

const kq = { khoa: khoa.title, chuong: TEN_CHUONG, soChuong, bai: [], de: [] };
for (const b of dsBai) {
  if (/Ôn tập chương/i.test(b.title)) continue;   // bài ấy chỉ có trong danh mục kho, câu của nó dành cho đề
  const nguon = sach.filter(q => q.lesson === b.title);
  const canVD = Math.min(SO_VI_DU, 2 * new Set(nguon.map(q => q.math_form)).size);
  const viDu = chonViDu(nguon, canVD);
  const tuLuyen = chon(nguon, SO_TU_LUYEN, { '2': 14, '1': 3, '3': 3 }, ['2', '1', '3', '4']);
  const dem = (ds) => JSON.stringify(ds.reduce((a, q) => (a[q.difficulty] = (a[q.difficulty] || 0) + 1, a), {}));
  console.log(`\n═══ ${b.title} (kho TL sạch: ${nguon.length}) ═══`);
  console.log(`   ví dụ    ${viDu.length}/${canVD}${viDu.length < canVD ? ' ✗ THIẾU' : ''} · mức ${dem(viDu)} · ${new Set(viDu.map(q => q.math_form)).size} dạng`);
  console.log(`   tự luyện ${tuLuyen.length}/${SO_TU_LUYEN}${tuLuyen.length < SO_TU_LUYEN ? ' ✗ THIẾU' : ''} · mức ${dem(tuLuyen)} · ${new Set(tuLuyen.map(q => q.math_form)).size} dạng`);
  for (const d of new Set(tuLuyen.map(q => q.math_form))) console.log(`      - ${d}: ${tuLuyen.filter(q => q.math_form === d).length}`);
  kq.bai.push({ lessonId: b.id, ten: b.title, viDu, tuLuyen });
}
for (let i = 1; i <= SO_DE; i++) {
  const de = chonDe(sach, [...new Set(sach.map(q => q.lesson))]);   // theo bài trong KHO (có cả câu của "Ôn tập chương")
  console.log(`\n═══ ĐỀ ${i} ═══ ${de.length}/5 bài${de.length < 5 ? ' ✗ THIẾU' : ''}: ` + de.map(q => `[${q.difficulty}${soY(q) >= 2 ? '·' + soY(q) + 'ý' : ''}] ${String(q.math_form).slice(0, 28)}`).join(' | '));
  kq.de.push({ ten: `ĐỀ ${i}`, cau: de });
}
const tm = thuMucLamViec(TEN_CHUONG); mkdirSync(tm, { recursive: true });
writeFileSync(`${tm}/rut.json`, JSON.stringify(kq, null, 1));
console.log(`\n→ ${tm}/rut.json — soát rồi chạy dung-module.mjs`);
rmSync(TAM, { recursive: true, force: true });
