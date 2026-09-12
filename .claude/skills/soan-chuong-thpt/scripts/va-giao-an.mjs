/**
 * VÁ giáo án theo kết quả của kiem-giao-an.mjs - sửa những gì máy tự sửa được, không đụng
 * phần cần người:
 *
 *   1. LỜI GIẢI  - khối quiz chưa có lời giải thì lấy `explanation` của câu gốc trong kho,
 *                  tách "Phương pháp giải:" vào `phuong_phap_giai`, các dòng của "Lời giải:"
 *                  vào `cac_buoc_thuc_hien` (app bày từng bước, đánh số tròn) - học sinh nhìn
 *                  theo từng bước chứ không phải một khối chữ.
 *   2. ẢNH RỜI    - trường `imageUrl` được ghép vào đề dưới dạng ảnh markdown, để mọi màn
 *                  (học sinh, trình chiếu, Word) cùng một đường dựng và xếp ảnh cạnh đề được.
 *   3. ĐỒNG BỘ ĐỀ - `--dong-bo-de`: chép lại `question` từ `content` của kho. Dùng sau khi
 *                  đã sửa kho (thay ảnh bảng bằng bảng LaTeX, sửa đề sai...) để bài giảng
 *                  hưởng theo.
 *   4. THAY ẢNH   - `--thay-anh <tệp.json>` [{url, bang}]: đổi thẳng ảnh trong đề thành bảng
 *                  LaTeX, kể cả khối không có sourceQuestionId (đề ôn tập dựng bằng đường cũ).
 *   5. TRUY NGUỒN - khối không có sourceQuestionId thì tìm câu kho có đề trùng (cùng bài của
 *                  chương) và gắn vào, để các phép đo sau còn tra ngược được.
 *
 * Không tự thay câu LẠC DẠNG hay câu THIẾU DỮ LIỆU mà kho cũng không có - hai việc ấy phải
 * người chọn câu khác / cắt lại hình; máy chỉ liệt kê.
 *
 *   node .claude/skills/soan-chuong-thpt/scripts/va-giao-an.mjs --lop 12 --chuong "PHÂN TÁN" [--dong-bo-de] [ghi]
 * Không có `ghi` thì chỉ in ra sẽ sửa gì. Có `ghi` thì sao lưu module vào
 * backups/va-giao-an-<ngày>/ rồi mới update.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const CO = process.argv.slice(2);
const lay = (t, m) => { const i = CO.indexOf(`--${t}`); return i >= 0 && CO[i + 1] ? CO[i + 1] : m; };
const LOP = lay('lop', '12');
const TEN_CHUONG = lay('chuong', null);
const DONG_BO_DE = CO.includes('--dong-bo-de');
const TEP_THAY_ANH = lay('thay-anh', null);
const THAY_ANH = TEP_THAY_ANH ? JSON.parse(readFileSync(TEP_THAY_ANH, 'utf8')) : [];
const GHI = CO.includes('ghi');
if (!TEN_CHUONG) { console.error('Thiếu --chuong'); process.exit(1); }

const MAU_QUIZ = /^```quiz[ \t]*\r?\n([\s\S]*?)^```/gm;

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Xuống dòng thật từ chuỗi "\n" - né các lệnh LaTeX bắt đầu bằng n (\neq, \ne, \nabla, \nu, \not). */
const xuongDong = (s) => String(s || '').replace(/\\n(?!eq\b|e\b|abla\b|u\b|ot\b|ewline\b|onumber\b)/g, '\n').trim();
/** Gỡ nhãn "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ...]" ở đầu đề - ghi chú cho thầy, không phải đề. */
const donDe = (s) => String(s || '').replace(/^\s*\[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ[^\]]*\]\s*/i, '').trim();

/**
 * Tách lời giải của kho thành phương pháp + các bước.
 * Kho viết theo khuôn "Phương pháp giải:\n...\n\nLời giải:\n...". Mỗi dòng của phần lời giải
 * là một bước; dòng chỉ có công thức thì gộp vào bước trước cho khỏi lẻ.
 */
function tachLoiGiai(explanation) {
  const s = xuongDong(explanation);
  if (!s) return null;
  const m = s.match(/^\s*(?:\*\*)?Phương pháp giải:?(?:\*\*)?\s*\n([\s\S]*?)\n\s*(?:\*\*)?Lời giải:?(?:\*\*)?\s*\n([\s\S]*)$/i);
  const phuongPhap = m ? m[1].trim() : '';
  const than = (m ? m[2] : s.replace(/^\s*(?:\*\*)?Lời giải:?(?:\*\*)?\s*\n?/i, '')).trim();
  const buoc = [];
  for (const d of than.split('\n').map(x => x.trim()).filter(Boolean)) {
    const chiCongThuc = /^\$[^$]*\$\.?$/.test(d) || /^\$\$[\s\S]*\$\$$/.test(d);
    if (chiCongThuc && buoc.length) buoc[buoc.length - 1] += '\n' + d;
    else buoc.push(d);
  }
  return { phuongPhap, buoc };
}


/** Chèn bảng vào đề ngay sau câu "...bảng sau:" (dòng kết thúc bằng dấu hai chấm); không có thì nối cuối. */
function chenBang(de, bang) {
  const dong = String(de || '').split('\n');
  const i = dong.findIndex(d => /:\s*$/.test(d.trim()));
  if (i >= 0 && i < dong.length - 1) dong.splice(i + 1, 0, '', bang, '');
  else dong.push('', bang);
  return dong.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const { data: kh } = await sb.from('courses').select('id,title').ilike('title', `%${LOP}%`);
const { data: ch } = await sb.from('chapters').select('id,title').eq('course_id', kh[0].id).ilike('title', `%${TEN_CHUONG}%`);
const { data: dsBai } = await sb.from('lessons').select('id,title').eq('chapter_id', ch[0].id);
const { data: modsGoc } = await sb.from('lesson_modules').select('id,title,lesson_id,content_markdown,presentation_markdown').in('lesson_id', dsBai.map(b => b.id));
/*
 * Một module có thể có HAI bản: `content_markdown` (học sinh xem) và `presentation_markdown`
 * (màn chiếu ưu tiên đọc bản này nếu có). Trang soạn bài lưu cả hai; sửa mỗi bản nội dung
 * thì bài chiếu trên lớp vẫn là bản cũ - Bài 1 chương 3 Toán 12 từng thế (12/9/2026). Nên
 * vá cả hai, mỗi bản là một "module ảo" mang tên trường cần ghi.
 */
const mods = [];
for (const m of modsGoc || []) {
  mods.push({ ...m, truong: 'content_markdown' });
  if (String(m.presentation_markdown || '').trim())
    mods.push({ ...m, truong: 'presentation_markdown', title: m.title + ' (trình chiếu)', content_markdown: m.presentation_markdown });
}

const ids = new Set();
for (const m of mods) for (const k of (m.content_markdown || '').matchAll(MAU_QUIZ)) {
  try { const d = JSON.parse(k[1]); for (const q of Array.isArray(d) ? d : [d]) if (q.sourceQuestionId) ids.add(q.sourceQuestionId); } catch { /* bỏ */ }
}
const goc = {};
const dsId = [...ids];
for (let i = 0; i < dsId.length; i += 200) {
  const { data } = await sb.from('questions').select('id,content,explanation,image_url,question_type').in('id', dsId.slice(i, i + 200));
  for (const q of data || []) goc[q.id] = q;
}

/* Kho của các bài trong chương, để truy nguồn khối không có sourceQuestionId (khớp 60 ký tự đầu của đề). */
const chuanDe = (t) => String(t || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const theoDe = {};
for (const b of dsBai) {
  const { data } = await sb.from('questions').select('id,content,explanation,image_url,question_type').eq('lesson', b.title);
  for (const q of data || []) { goc[q.id] ||= q; const k = chuanDe(donDe(q.content)); if (k) (theoDe[k] ||= []).push(q.id); }
}

const thuMuc = `backups/va-giao-an-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
let tongGiai = 0, tongAnh = 0, tongDe = 0, tongMod = 0, tongNguon = 0, tongBang = 0;
for (const m of mods) {
  let giai = 0, anh = 0, de = 0, nguon = 0, bang = 0;
  const md = (m.content_markdown || '').replace(MAU_QUIZ, (nguyen, than) => {
    let d; try { d = JSON.parse(than); } catch { return nguyen; }
    const mang = Array.isArray(d);
    const ds = mang ? d : [d];
    for (const q of ds) {
      /* 5. truy nguồn - phải cùng LOẠI: kho có câu NLC và câu TLN chung một đề (biến thể),
            khớp mỗi chữ thì gắn nhầm, phép đo đáp án sau đó báo lệch giả. */
      const loaiKho = { multiple_choice: 'NLC', short_answer: 'TLN', true_false_cluster: 'DS' }[q.type || 'multiple_choice'];
      if (q.sourceQuestionId && goc[q.sourceQuestionId] && loaiKho && goc[q.sourceQuestionId].question_type !== loaiKho) {
        delete q.sourceQuestionId; nguon++;   // gắn nhầm từ lượt trước, gỡ ra để tìm lại
      }
      if (!q.sourceQuestionId) {
        const ung = (theoDe[chuanDe(q.question)] || []).filter(id => !loaiKho || goc[id]?.question_type === loaiKho);
        if (ung.length === 1) { q.sourceQuestionId = ung[0]; nguon++; }
      }
      /* 4. thay ảnh theo bản đồ */
      for (const { url, bang: b } of THAY_ANH) {
        const mau = new RegExp('\\n*!\\[[^\\]]*\\]\\(' + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^)]*\\)\\n*', 'g');
        if (mau.test(String(q.question))) {
          /* dùng hàm thay thế: chuỗi thay có `$$` sẽ bị String.replace hiểu là ký hiệu đặc biệt */
          q.question = String(q.question).replace(mau, () => `\n\n${b}\n\n`).replace(/\n{3,}/g, '\n\n').trim();
          bang++;
        }
        if (q.imageUrl === url) {
          if (!String(q.question).includes(b)) q.question = chenBang(q.question, b);
          delete q.imageUrl; bang++;
        }
      }
      const g = goc[q.sourceQuestionId];
      /* 1. lời giải */
      const coGiai = String(q.answer || q.sampleAnswer || q.explanation || '').trim()
        || q.phuong_phap_giai || (Array.isArray(q.cac_buoc_thuc_hien) && q.cac_buoc_thuc_hien.length);
      if (!coGiai && g?.explanation) {
        const t = tachLoiGiai(g.explanation);
        if (t && (t.phuongPhap || t.buoc.length)) {
          if (t.phuongPhap) q.phuong_phap_giai = t.phuongPhap;
          if (t.buoc.length) q.cac_buoc_thuc_hien = t.buoc;
          giai++;
        }
      }
      /* 3. đồng bộ đề từ kho - chỉ cho câu có đề nguyên khối (NLC, TLN); Đúng/Sai phần đề
            là phần dẫn đã tách, không chép đè. */
      if (DONG_BO_DE && g && q.type !== 'true_false_cluster') {
        let moi = donDe(g.content);
        /* Kho để ảnh ở cột image_url thì đề chép về phải mang ảnh theo - lượt trước từng chép
           đề "cho ở bảng sau:" mà rơi mất bảng vì ảnh rời đã bị gỡ ở bước 2 */
        if (moi && g.image_url && !moi.includes(g.image_url)) moi = chenBang(moi, `![Hình ảnh](${g.image_url})`);
        if (moi && moi !== q.question) {
          /* Chạy thử thì bày hai bản cạnh nhau - đề trong bài từng được sửa tay thì thầy còn thấy để giữ */
          if (!GHI) console.log(`     ~ đề đổi: "${String(q.question).replace(/\s+/g, ' ').slice(0, 70)}"\n              -> "${moi.replace(/\s+/g, ' ').slice(0, 70)}"`);
          q.question = moi; de++;
        }
      }
      /* 2. ảnh rời -> vào đề. Với Đúng/Sai đồng bộ: kho đã đổi ảnh thành bảng thì ảnh rời
            cũ bỏ đi và chép bảng vào phần dẫn. */
      if (q.imageUrl) {
        const u = String(q.imageUrl).trim();
        if (DONG_BO_DE && g && g.image_url !== u && !String(g.content).includes(u)) {
          /* kho không còn dùng ảnh này: lấy phần bảng LaTeX/ảnh mới từ kho ghép vào đề */
          const bang = (String(g.content).match(/\$\$\\begin\{array\}[\s\S]*?\\end\{array\}\$\$/) || [])[0];
          if (bang && !String(q.question).includes(bang)) q.question = String(q.question).trimEnd() + '\n\n' + bang;
          delete q.imageUrl; anh++;
        } else if (!String(q.question).includes(u)) {
          q.question = String(q.question).trimEnd() + `\n\n![Hình ảnh](${u})`;
          delete q.imageUrl; anh++;
        } else { delete q.imageUrl; anh++; }
      }
    }
    return '```quiz\n' + JSON.stringify(mang ? ds : ds[0], null, 2) + '\n```';
  });
  /* Chỉ ghi khi có sửa thật - dựng lại JSON đổi khoảng trắng cũng làm chuỗi khác đi */
  if (!(giai + anh + de + nguon + bang)) continue;
  tongMod++; tongGiai += giai; tongAnh += anh; tongDe += de; tongNguon += nguon; tongBang += bang;
  const ten = dsBai.find(b => b.id === m.lesson_id)?.title || '';
  console.log(`  ${ten.slice(0, 32)} › ${m.title.slice(0, 30)}: +${giai} lời giải · ${anh} ảnh vào đề · ${de} đề đồng bộ · ${nguon} truy nguồn · ${bang} bảng`);
  if (GHI) {
    mkdirSync(thuMuc, { recursive: true });
    writeFileSync(`${thuMuc}/${m.id}${m.truong === 'presentation_markdown' ? '-trinh-chieu' : ''}.md`, m.content_markdown || '');
    const { error } = await sb.from('lesson_modules').update({ [m.truong]: md }).eq('id', m.id);
    if (error) console.log('   ✗', error.message);
  }
}
console.log(`\n${GHI ? '✓ đã ghi' : 'Sẽ sửa'} ${tongMod} module · ${tongGiai} lời giải · ${tongAnh} ảnh · ${tongDe} đề`
  + (GHI ? ` · sao lưu ${thuMuc}/` : ' · thêm "ghi" để ghi thật'));
