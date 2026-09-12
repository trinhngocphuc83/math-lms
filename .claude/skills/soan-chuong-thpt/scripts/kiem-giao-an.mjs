/**
 * KIỂM LẠI TOÀN BỘ GIÁO ÁN của một chương sau khi soạn - soi từng câu hỏi tương tác
 * trong mọi module (lý thuyết, tự luyện, đề ôn tập). Đây là bước bắt buộc trước khi
 * giao bài cho học sinh: mấy lỗi dưới đây đều IM LẶNG, trên màn hình soạn không thấy gì,
 * mở bài dạy lên mới lộ ra (thầy đã bắt được 12/9/2026 ở Toán 12 chương 3).
 *
 *   ✗ THIẾU DỮ LIỆU  - đề nói "cho ở bảng sau", "hình vẽ bên" mà không có ảnh, không có
 *                      bảng: học sinh không làm được. Câu trong kho có ảnh mà khối quiz
 *                      không mang theo cũng rơi vào đây.
 *   ✗ LẠC DẠNG       - câu tương tác nằm dưới "DẠNG 2: KHOẢNG TỨ PHÂN VỊ" mà lại hỏi số
 *                      trung bình; phần phân dạng chưa dạy thì chưa được hỏi. Đo bằng
 *                      dạng-trong-kho của câu: hai câu cùng một mục mà khác dạng, hoặc
 *                      từ khoá của dạng không xuất hiện trong mục đó.
 *   ✗ HỎI ĐIỀU CHƯA DẠY - đề hoặc phương án nhắc một khái niệm (số trung bình, phương sai,
 *                      tích phân...) mà từ đầu bài tới hết mục chứa câu chưa hề dạy. Đo bằng
 *                      khái niệm trong đề nên bắt được cả khi nhãn dạng trong kho gắn sai -
 *                      chính là ca "tính số trung bình" nằm dưới mục "mẫu không ghép nhóm".
 *   ✗ THIẾU LỜI GIẢI - khối quiz không có answer / explanation / phuong_phap_giai /
 *                      cac_buoc_thuc_hien: bấm "Xem lời giải" không ra gì.
 *   ⚠ ẢNH NHỎ        - ảnh trong đề dưới 600 px bề ngang: bảng số liệu hiện lên như con
 *                      kiến, học sinh cuối lớp không đọc nổi. Bảng thì chép lại thành bảng
 *                      markdown; hình thì cắt lại từ ảnh gốc độ phân giải cao.
 *   ✗ ĐÁP ÁN LỆCH    - answerIndex trong khối khác đáp án của câu gốc trong kho.
 *   ✗ THIẾU answerIndex - chọn đúng vẫn báo sai (đã có ở soi-chuong, đo lại cho đủ bộ).
 *
 *   node .claude/skills/soan-chuong-thpt/scripts/kiem-giao-an.mjs --lop 12 --chuong "PHÂN TÁN"
 *   thêm --json scratch/kiem-12c3.json để ghi danh sách lỗi ra tệp cho bộ vá đọc.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';

const CO = process.argv.slice(2);
const lay = (t, m) => { const i = CO.indexOf(`--${t}`); return i >= 0 && CO[i + 1] ? CO[i + 1] : m; };
const LOP = lay('lop', '12');
const TEN_CHUONG = lay('chuong', null);
const TEP_JSON = lay('json', null);
if (!TEN_CHUONG) { console.error('Thiếu --chuong'); process.exit(1); }

const MAU_QUIZ = /^```quiz[ \t]*\r?\n([\s\S]*?)^```/gm;
const MAU_ANH = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)[^)]*\)/g;
/* Đề nhắc tới dữ liệu ở ngoài chữ. "bảng" đứng một mình cũng bắt: "cho trong bảng:" */
const NHAC_DU_LIEU = /(bảng|hình vẽ|hình bên|hình sau|hình dưới|biểu đồ|đồ thị|sơ đồ)\b/i;
const NGUONG_ANH = 600;
/*
 * Khái niệm hay bị hỏi mà bài chưa dạy. Danh sách theo chương trình THPT, ghi chữ thường,
 * dạng ngắn nhất còn phân biệt được ("số trung bình" chứ không "tính số trung bình").
 * Thêm vào đây khi soạn chương mới gặp khái niệm chưa có.
 */
const KHAI_NIEM = [
  // thống kê
  'số trung bình', 'trung vị', 'mốt', 'tứ phân vị', 'khoảng biến thiên', 'phương sai', 'độ lệch chuẩn',
  'giá trị ngoại lệ', 'tần số tương đối', 'biểu đồ hộp',
  // giải tích
  'đạo hàm', 'nguyên hàm', 'tích phân', 'tiệm cận', 'cực trị', 'giá trị lớn nhất', 'giá trị nhỏ nhất',
  'đồng biến', 'nghịch biến', 'điểm uốn', 'lãi kép', 'tốc độ tăng trưởng',
  // đại số
  'cấp số cộng', 'cấp số nhân', 'giới hạn', 'logarit', 'lũy thừa', 'bất phương trình', 'hệ phương trình',
  // hình học
  'vectơ', 'tích vô hướng', 'tích có hướng', 'phương trình mặt phẳng', 'phương trình đường thẳng',
  'phương trình mặt cầu', 'góc nhị diện', 'khoảng cách', 'thể tích', 'diện tích xung quanh',
  // xác suất
  'xác suất có điều kiện', 'công thức bayes', 'xác suất toàn phần', 'biến cố độc lập', 'hoán vị', 'tổ hợp', 'chỉnh hợp',
];

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: kh } = await sb.from('courses').select('id,title').ilike('title', `%${LOP}%`);
const { data: ch } = await sb.from('chapters').select('id,title')
  .eq('course_id', kh[0].id).ilike('title', `%${TEN_CHUONG}%`);
if (!ch?.length) { console.error('Không thấy chương'); process.exit(1); }
const { data: dsBai } = await sb.from('lessons').select('id,title')
  .eq('chapter_id', ch[0].id).order('order_index');
const { data: modsGoc } = await sb.from('lesson_modules')
  .select('id,title,type,lesson_id,content_markdown,presentation_markdown').in('lesson_id', dsBai.map(b => b.id)).order('order_index');
/* Bản trình chiếu (presentation_markdown) là bản màn chiếu đọc trước - soi như một module riêng */
const mods = [];
for (const m of modsGoc || []) {
  mods.push(m);
  if (String(m.presentation_markdown || '').trim())
    mods.push({ ...m, title: m.title + ' (trình chiếu)', content_markdown: m.presentation_markdown });
}
const tenBai = Object.fromEntries(dsBai.map(b => [b.id, b.title]));

console.log(`${ch[0].title} · ${kh[0].title}\n`);

/* ---------- gom mọi khối quiz kèm mục (heading DẠNG) chứa nó ---------- */
const khoi = [];   // { mod, stt, d, muc, chuMuc }
for (const m of mods || []) {
  const md = m.content_markdown || '';
  /* Cắt bài thành các mục theo heading "DẠNG n"; chữ của mục = chữ giữa hai heading, bỏ quiz */
  const dong = md.split('\n');
  let mucHienTai = '(đầu bài)';
  const chuTheoMuc = { '(đầu bài)': '' };
  const viTriMuc = [];   // [chỉ số ký tự bắt đầu, tên mục]
  let dem = 0;
  for (const l of dong) {
    if (/^#{1,4}\s*.*D[ẠA]NG\s*\d/i.test(l.trim())) {
      mucHienTai = l.replace(/^#+\s*/, '').replace(/[💡🛠📌]/g, '').trim();
      chuTheoMuc[mucHienTai] = '';
      viTriMuc.push([dem, mucHienTai]);
    }
    chuTheoMuc[mucHienTai] += l + '\n';
    dem += l.length + 1;
  }
  let stt = 0;
  for (const k of md.matchAll(MAU_QUIZ)) {
    let d; try { d = JSON.parse(k[1]); } catch { continue; }
    const muc = [...viTriMuc].reverse().find(v => v[0] <= k.index)?.[1] || '(đầu bài)';
    /* chữ của bài từ đầu tới hết mục này (bỏ các khối quiz) - "đã dạy tới đâu" khi gặp câu này */
    const cuoiMuc = viTriMuc.find(v => v[0] > k.index)?.[0] ?? md.length;
    const chuTruoc = md.slice(0, cuoiMuc).replace(MAU_QUIZ, '');
    for (const q of Array.isArray(d) ? d : [d]) {
      stt++;
      khoi.push({ mod: m, stt, d: q, muc, chuMuc: chuTheoMuc[muc].replace(MAU_QUIZ, ''), chuTruoc });
    }
  }
}

/* ---------- tra câu gốc trong kho ---------- */
const ids = [...new Set(khoi.map(k => k.d.sourceQuestionId).filter(Boolean))];
const goc = {};
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb.from('questions')
    .select('id,math_form,lesson,question_type,correct_answer,explanation,image_url,content').in('id', ids.slice(i, i + 200));
  for (const q of data || []) goc[q.id] = q;
}

/* ---------- đo ---------- */
const loi = [];
const ghi = (k, loai, chi) => loi.push({ loai, chi, module: k.mod.title, moduleId: k.mod.id,
  bai: tenBai[k.mod.lesson_id], stt: k.stt, muc: k.muc, maCauHoi: k.d.maCauHoi, sourceQuestionId: k.d.sourceQuestionId });

const kichThuocAnh = {};
async function doAnh(url) {
  if (kichThuocAnh[url] !== undefined) return kichThuocAnh[url];
  try {
    const r = await fetch(url); const buf = Buffer.from(await r.arrayBuffer());
    const meta = await sharp(buf).metadata();
    kichThuocAnh[url] = meta.width || 0;
  } catch { kichThuocAnh[url] = -1; }
  return kichThuocAnh[url];
}

/* Từ khoá phân biệt của một dạng trong kho: bỏ chữ chung chung */
const CHUNG = new Set(['tính', 'của', 'mẫu', 'số', 'liệu', 'ghép', 'nhóm', 'bài', 'toán', 'các', 'và', 'với',
  'trong', 'cho', 'một', 'về', 'theo', 'dạng', 'tìm', 'xác', 'định', 'được', 'từ', 'có', 'là', 'ứng', 'dụng',
  'thực', 'tế', 'nhận', 'biết', 'so', 'sánh', 'hai', 'giá', 'trị', 'biểu', 'thức', 'phương', 'pháp', 'chứng', 'minh']);
function tuKhoa(ten) {
  const t = String(ten || '').toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  /* ghép đôi liền kề để giữ nghĩa: "trung bình", "tứ phân vị", "độ lệch" */
  const ra = [];
  for (let i = 0; i < t.length - 1; i++) if (!CHUNG.has(t[i]) && !CHUNG.has(t[i + 1])) ra.push(t[i] + ' ' + t[i + 1]);
  for (const w of t) if (!CHUNG.has(w) && w.length >= 4) ra.push(w);
  return [...new Set(ra)];
}

for (const k of khoi) {
  const d = k.d, q = goc[d.sourceQuestionId];
  const de = String(d.question || '');
  const anhTrongDe = [...de.matchAll(MAU_ANH)].map(m => m[1]);
  if (d.imageUrl) anhTrongDe.push(d.imageUrl);
  /* Bảng có thể là bảng markdown hoặc bảng LaTeX \begin{array} kẻ ô (\hline) - cả hai đều là dữ liệu thật */
  const coBangMd = /^\s*\|.*\|\s*$/m.test(de) || (/\\begin\{array\}/.test(de) && /\\hline/.test(de));

  /* 1. thiếu dữ liệu */
  if (NHAC_DU_LIEU.test(de) && !anhTrongDe.length && !coBangMd) {
    ghi(k, 'THIẾU DỮ LIỆU', `đề nhắc "${de.match(NHAC_DU_LIEU)[1]}" mà không có ảnh/bảng`
      + (q?.image_url ? ` · kho có ảnh: ${q.image_url}` : q ? ' · kho cũng không có ảnh' : ''));
  }

  /* 2. lạc dạng - chỉ đo ở module lý thuyết, nơi câu nằm dưới heading DẠNG */
  /* Dạng "tổng hợp" trong kho gom nhiều kĩ năng, đặt dưới mục nào cũng được - không đo tên. */
  if (k.mod.type === 'theory' && q && k.muc !== '(đầu bài)' && !/tổng hợp/i.test(q.math_form)) {
    const kw = tuKhoa(q.math_form);
    const chuMuc = (k.muc + '\n' + k.chuMuc).toLowerCase();
    const khop = kw.filter(w => chuMuc.includes(w));
    if (!khop.length) ghi(k, 'LẠC DẠNG', `dạng kho "${q.math_form}" không thấy trong mục "${k.muc}"`);
  }

  /* 2b. hỏi điều chưa dạy - đo bằng KHÁI NIỆM trong đề, không tin nhãn dạng của kho.
        Câu "tính số trung bình" từng nằm dưới mục "mẫu không ghép nhóm" mà lọt lưới phép đo
        trên, vì nhãn dạng trong kho gắn sai. Khái niệm mà đề/phương án nhắc tới phải xuất
        hiện trong mục chứa nó (cả phần trước đó của bài cũng được: dạng sau dùng lại dạng trước). */
  if (k.mod.type === 'theory' && k.muc !== '(đầu bài)') {
    const hoi = (de + '\n' + (Array.isArray(d.options) ? d.options.map(o => typeof o === 'string' ? o : o?.content || '').join('\n') : ''))
      .replace(/\$\$[\s\S]*?\$\$/g, ' ').toLowerCase();
    const daDay = k.chuTruoc.toLowerCase();
    const thieu = KHAI_NIEM.filter(kn => hoi.includes(kn) && !daDay.includes(kn));
    if (thieu.length) ghi(k, 'HỎI ĐIỀU CHƯA DẠY', `đề nhắc "${thieu.join('", "')}" mà bài chưa dạy tới (tính đến mục "${k.muc.slice(0, 40)}")`);
  }

  /* 3. thiếu lời giải */
  const coGiai = String(d.answer || d.sampleAnswer || d.explanation || '').trim()
    || d.phuong_phap_giai || (Array.isArray(d.cac_buoc_thuc_hien) && d.cac_buoc_thuc_hien.length);
  if (!coGiai) ghi(k, 'THIẾU LỜI GIẢI', q?.explanation ? 'kho có lời giải, khối chưa mang theo' : 'kho cũng chưa có lời giải');

  /* 4. ảnh nhỏ */
  for (const u of anhTrongDe) {
    const w = await doAnh(u);
    if (w === -1) ghi(k, 'ẢNH HỎNG', `không tải được ${u}`);
    else if (w < NGUONG_ANH) ghi(k, 'ẢNH NHỎ', `${w}px · ${u}`);
  }

  /* 5. đáp án lệch kho, 6. thiếu answerIndex */
  const loai = d.type || 'multiple_choice';
  if (loai === 'multiple_choice') {
    if (typeof d.answerIndex !== 'number') ghi(k, 'THIẾU answerIndex', '');
    else if (q && q.question_type === 'NLC') {
      const idxKho = 'ABCD'.indexOf(String(q.correct_answer || '').trim().toUpperCase());
      if (idxKho >= 0 && idxKho !== d.answerIndex) ghi(k, 'ĐÁP ÁN LỆCH', `khối ${'ABCD'[d.answerIndex]} · kho ${'ABCD'[idxKho]}`);
    }
  }
  if (loai === 'short_answer' && q && String(d.exactAnswer ?? '').trim() !== String(q.correct_answer ?? '').trim()) {
    ghi(k, 'ĐÁP ÁN LỆCH', `khối "${d.exactAnswer}" · kho "${q.correct_answer}"`);
  }
  if (d.sourceQuestionId && !q) ghi(k, 'MẤT CÂU GỐC', `kho không còn ${d.sourceQuestionId}`);
}

/* 2b. lạc dạng theo đa số: cùng một mục mà câu này khác dạng với các câu còn lại */
const theoMuc = {};
for (const k of khoi) {
  if (k.mod.type !== 'theory' || k.muc === '(đầu bài)') continue;
  const q = goc[k.d.sourceQuestionId]; if (!q) continue;
  const key = k.mod.id + '|' + k.muc;
  (theoMuc[key] ||= []).push({ k, dang: q.math_form });
}
for (const ds of Object.values(theoMuc)) {
  const dem = {}; for (const x of ds) dem[x.dang] = (dem[x.dang] || 0) + 1;
  const daSo = Object.entries(dem).sort((a, b) => b[1] - a[1])[0][0];
  for (const x of ds) if (x.dang !== daSo && dem[x.dang] < dem[daSo]) {
    if (!loi.some(l => l.loai === 'LẠC DẠNG' && l.moduleId === x.k.mod.id && l.stt === x.k.stt))
      ghi(x.k, 'LẠC DẠNG', `dạng kho "${x.dang}" trong khi các câu cùng mục thuộc "${daSo}"`);
  }
}

/* ---------- báo ---------- */
const theoLoai = {};
for (const l of loi) (theoLoai[l.loai] ||= []).push(l);
console.log(`${khoi.length} câu tương tác trong ${mods.length} module · ${loi.length} lỗi\n`);
for (const [loai, ds] of Object.entries(theoLoai).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`═══ ${loai} (${ds.length}) ═══`);
  for (const l of ds) console.log(`   ${l.bai.slice(0, 30)} › ${l.module.slice(0, 28)} › câu ${l.stt} [${l.muc.slice(0, 40)}]  ${l.chi}`);
  console.log();
}
if (!loi.length) console.log('✓ Không thấy lỗi nào trong sáu phép đo.');
if (TEP_JSON) { writeFileSync(TEP_JSON, JSON.stringify(loi, null, 2)); console.log(`Đã ghi ${TEP_JSON}`); }
