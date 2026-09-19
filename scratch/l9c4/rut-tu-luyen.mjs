/**
 * Rút câu TỰ LUẬN cho Toán 9 chương IV theo yêu cầu thầy (18/9/2026): mỗi bài 20 câu tự luận,
 * ƯU TIÊN THÔNG HIỂU. Bài 3 (Ôn tập chương) là hai đề Luyện tập 1 / 2, mỗi đề 20 câu lấy
 * từ cả chương, không trùng câu đã dùng ở Bài 1, Bài 2.
 *
 * Luật rút:
 *   1. Chỉ câu TL, không hỏng (bộ kiểm thử của app), có lời giải.
 *   2. Đề nhắc "hình bên / hình vẽ / H.x" mà kho KHÔNG có ảnh thì bỏ — học sinh không có hình để làm.
 *   3. Hạn ngạch mức: 14 thông hiểu · 3 nhận biết · 3 vận dụng (kho thiếu mức nào thì bù bằng
 *      thông hiểu trước, rồi mới tới mức khác).
 *   4. Phủ dạng: xoay vòng qua các dạng của bài, dạng nhiều câu được nhiều suất.
 *   5. Không trùng câu đã dùng trong bài giảng lý thuyết (câu tương tác) hay module khác.
 *   node scratch/l9c4/rut-tu-luyen.mjs  → scratch/l9c4/tu-luyen-*.json
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';

const TAM = join(process.cwd(), '.tam-rut');
rmSync(TAM, { recursive: true, force: true });
mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'")
    .replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
const { soatMotCau } = await import(pathToFileURL(join(TAM, 'kiemThuDe.ts')).href);
const { taoKhoaSoSanh, doGiongNhau, NGUONG_NGHI_TRUNG } = await import(pathToFileURL(join(TAM, 'questionFingerprint.ts')).href);

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const LOI_HONG = new Set(['congThucRong', 'doLaLe', 'latexTran', 'cheoDoi', 'matDauCheo', 'khongCoDapAn', 'choHinhChuaCoAnh']);
const CAN = 20;
const HAN_NGACH = { '2': 14, '1': 3, '3': 3 };
const BAI = [
  { so: 1, id: '30640f6e-934d-429d-9b0f-bcedb400877d', ten: 'Bài 1. Tỉ số lượng giác của góc nhọn', module: 'Bài tập tự luyện' },
  { so: 2, id: '929d4eee-6479-4b88-999a-b0c4dd37ce05', ten: 'Bài 2. Một số hệ thức giữa cạnh, góc trong tam giác vuông và ứng dụng', module: 'Bài tập tự luyện' },
  { so: 3, id: 'c855c1b1-1fcb-485e-9dd1-3d516cd54cbc', ten: 'Bài 3. Ôn tập chương', module: 'Luyện tập 1' },
  { so: 4, id: 'c855c1b1-1fcb-485e-9dd1-3d516cd54cbc', ten: 'Bài 3. Ôn tập chương', module: 'Luyện tập 2' },
];

const kho = JSON.parse(readFileSync('scratch/l9c4/kho.json', 'utf8'));
/* Loại sau khi rà từng câu (19/9/2026): b2h1 dùng hệ thức OH² = MH·HN của chương trình cũ (Toán 9
   mới không học); các câu còn lại trùng đề với câu đã có ở module khác (cùng số liệu, khác lời văn
   nên vân tay không bắt được): ux49≡icd5, redp⊃x7yu, 63m4⊂pzre, z99z≡tsna, vl9c≡jebm, 10xr⊂5cr4. */
const LOAI = new Set(['CH_1789615911682_b2h1', 'CH_1789186716716_ux49', 'CH_1789186716733_redp',
  'CH_1789186358196_63m4', 'CH_1789643684733_z99z', 'CH_1789186716719_vl9c', 'CH_1789628591964_10xr',
  /* lượt 2: na6q (5,12 như tsna), 6n5h (P như câu tương tác r3mi), bh13 (3,4 như pzre) */
  'CH_1789186358197_na6q', 'CH_1789618793093_6n5h', 'CH_1789615911682_bh13', 'CH_1789186716732_zfyi',
  /* lượt 3: tyfl (AB² = BC·BH chương trình cũ), dfqq (trùng 9efu), rt7e (gộp 4 câu đã có) */
  'CH_1789643684733_tyfl', 'CH_1789186716722_dfqq', 'CH_1789629046259_rt7e']);
/* Vân tay SỐ LIỆU: cùng dạng và cùng bộ số trong đề (>= 2 số) thì coi là một bài, dù lời văn khác —
   vân tay chữ của app không bắt được "AB = 5, AC = 12" viết hai kiểu. */
const boSo = (q) => {
  /* kho viết số thập phân cả "2,5" lẫn "2{,}5" - quy về một kiểu trước khi bóc số */
  const so = (String(q.content).replace(/\{,\}/g, ',').replace(/!\[[^\]]*\]\([^)]*\)/g, '').match(/\d+(?:[.,]\d+)?/g) || [])
    .map(x => x.replace(',', '.')).filter(x => !['90', '180', '0'].includes(x)).sort();
  return so.length >= 2 ? String(q.math_form) + '|' + so.join(',') : null;
};
const nhacHinh = (q) => /hình (bên|vẽ|sau|dưới|trên)|\(H\.\s*\d|H\.\d|hình \d/i.test(String(q.content)) && !q.image_url && !/!\[/.test(String(q.content));

/* Câu đã dùng ở bất kì module nào trong chương (tương tác lý thuyết + các module đã rút trước) */
async function daDungTrongChuong() {
  const ids = new Set(); const van = [];
  for (const b of BAI) {
    /* Chỉ tính bài giảng lý thuyết: các module luyện tập là thứ đang dựng lại, tính vào thì lần rút
       thứ hai tự loại chính mình (bẫy đã ghi trong skill). */
    const { data: mods } = await sb.from('lesson_modules').select('content_markdown').eq('lesson_id', b.id).eq('type', 'theory');
    for (const m of mods || []) for (const k of String(m.content_markdown || '').matchAll(/```quiz[^\n]*\n([\s\S]*?)```/g)) {
      try { const j = JSON.parse(k[1]); for (const c of (Array.isArray(j) ? j : [j])) { if (c?.sourceQuestionId) ids.add(c.sourceQuestionId); if (c?.question) van.push(taoKhoaSoSanh({ content: c.question }).khuonChu); } } catch { /* thôi */ }
    }
  }
  return { ids, van };
}

function chon(nguon, daLay) {
  nguon = nguon.filter(q => { const k = boSo(q); return !(k && soDaLay.has(k)); });
  const theoDang = new Map();
  for (const q of nguon) { const d = q.math_form || '?'; if (!theoDang.has(d)) theoDang.set(d, []); theoDang.get(d).push(q); }
  for (const ds of theoDang.values()) ds.sort((a, b) => (Number(a.usage_count) || 0) - (Number(b.usage_count) || 0));
  const dang = [...theoDang.entries()].sort((a, b) => b[1].length - a[1].length);
  const ra = []; const con = { ...HAN_NGACH };
  for (const muc of ['2', '1', '3']) {
    let vong = 0;
    while (con[muc] > 0 && ra.length < CAN) {
      let them = false;
      for (const [, ds] of dang) {
        if (con[muc] <= 0 || ra.length >= CAN) break;
        const q = ds.filter(x => String(x.difficulty) === muc && !daLay.has(x.id))[vong];
        if (!q) continue;
        { const k = boSo(q); if (k && soDaLay.has(k)) continue; if (k) soDaLay.add(k); }
        ra.push(q); daLay.add(q.id); con[muc]--; them = true;
      }
      if (!them) break;
      vong++;
    }
  }
  /* Bù: thông hiểu trước, rồi nhận biết, vận dụng, cuối cùng VDC */
  for (const muc of ['2', '1', '3', '4']) {
    for (const [, ds] of dang) for (const q of ds) {
      if (ra.length >= CAN) break;
      if (!daLay.has(q.id) && String(q.difficulty) === muc) {
        const k = boSo(q); if (k && soDaLay.has(k)) continue; if (k) soDaLay.add(k);
        ra.push(q); daLay.add(q.id);
      }
    }
  }
  return ra.sort((a, b) => Number(a.difficulty) - Number(b.difficulty));
}

const { ids: daDungId, van: daDungVan } = await daDungTrongChuong();
const daLay = new Set(daDungId);
mkdirSync('scratch/l9c4/tu-luyen', { recursive: true });
let boHong = 0, boHinh = 0, boTrung = 0;
const sach = [];
for (const q of kho) {
  if (q.question_type !== 'TL') continue;
  if (LOAI.has(q.question_id)) { boTrung++; continue; }
  if (!String(q.explanation || '').trim()) { boHong++; continue; }
  if (soatMotCau(q, '').some(l => LOI_HONG.has(l.ma))) { boHong++; continue; }
  if (nhacHinh(q)) { boHinh++; continue; }
  const v = taoKhoaSoSanh(q).khuonChu;
  if (daDungVan.some(d => doGiongNhau(v, d) >= NGUONG_NGHI_TRUNG)) { boTrung++; continue; }
  sach.push(q);
}
const soDaLay = new Set();
console.log(`Kho TL sạch: ${sach.length} (bỏ ${boHong} hỏng/không lời giải · ${boHinh} nhắc hình mà không có ảnh · ${boTrung} trùng câu đã dùng)`);

for (const b of BAI) {
  const nguon = b.so <= 2 ? sach.filter(q => q.lesson === b.ten) : sach;   // ôn tập: cả chương
  const kq = chon(nguon, daLay);
  /* Câu vừa lấy: thêm vân tay để module sau không lấy câu cùng đề (khác id) */
  for (const q of kq) {
    const v = taoKhoaSoSanh(q).khuonChu;
    for (const x of sach) if (!daLay.has(x.id) && doGiongNhau(taoKhoaSoSanh(x).khuonChu, v) >= NGUONG_NGHI_TRUNG) daLay.add(x.id);
  }
  const muc = {}; for (const q of kq) muc[q.difficulty] = (muc[q.difficulty] || 0) + 1;
  const dang = new Set(kq.map(q => q.math_form));
  console.log(`\n═══ ${b.ten} › ${b.module} ═══\n   ${kq.length}/${CAN} câu · mức ${JSON.stringify(muc)} · ${dang.size} dạng`);
  for (const d of dang) console.log(`     - ${d}: ${kq.filter(q => q.math_form === d).length}`);
  writeFileSync(`scratch/l9c4/tu-luyen/${b.so}.json`, JSON.stringify({ lessonId: b.id, bai: b.ten, module: b.module, cau: kq }, null, 1));
}
rmSync(TAM, { recursive: true, force: true });
