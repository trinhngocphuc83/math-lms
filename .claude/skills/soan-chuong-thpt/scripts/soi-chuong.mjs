/**
 * Soi một chương TRONG APP, trước khi xuất Word. Ba phép đo, đều là chỗ từng hỏng thật:
 *
 *   1. PHỦ DẠNG   - bài giảng có nhắc hết các dạng mà kho đang có cho bài đó không.
 *                   Bài 3 chương IV từng chỉ có 2 dạng trong khi kho có 7 dạng · 215 câu.
 *   2. answerIndex - khối trắc nghiệm nào ghi đáp án ở `answer`/`correct_answer` thay vì
 *                   `answerIndex` thì học sinh chọn đúng vẫn báo sai, mà không có dấu
 *                   hiệu gì. Từng dính 19 khối.
 *   3. HẠN NGẠCH  - bài tập tự luyện có đủ số câu và đúng cơ cấu loại/mức không.
 *
 *   node .claude/skills/soan-chuong-thpt/scripts/soi-chuong.mjs --lop 12 --chuong "NGUYÊN HÀM"
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const CO = process.argv.slice(2);
const lay = (t, m) => { const i = CO.indexOf(`--${t}`); return i >= 0 && CO[i + 1] ? CO[i + 1] : m; };
const LOP = lay('lop', '12');
const TEN_CHUONG = lay('chuong', null);
if (!TEN_CHUONG) { console.error('Thiếu --chuong'); process.exit(1); }

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: kh } = await sb.from('courses').select('id,title').ilike('title', `%${LOP}%`);
const { data: ch } = await sb.from('chapters').select('id,title')
  .eq('course_id', kh[0].id).ilike('title', `%${TEN_CHUONG}%`);
const { data: dsBaiTatCa } = await sb.from('lessons').select('id,title')
  .eq('chapter_id', ch[0].id).order('order_index');
/* Bài "Ôn tập chương" không phải bài học thường: không có bài tập tự luyện riêng, và
   danh mục gắn vào nó thường lẫn dạng của chương khác - soi vào chỉ ra nhiễu. */
const dsBai = (dsBaiTatCa || []).filter(x => /^Bài \d+\./.test(x.title) && !/[ÔO]n t[aậ]p/i.test(x.title));
const { data: danhMuc } = await sb.from('question_categories').select('*');

console.log(`${ch[0].title} · ${kh[0].title}\n`);

/* ---------- 1. Phủ dạng ---------- */
console.log('═══ PHỦ DẠNG: kho có dạng nào mà bài giảng chưa dạy? ═══');
for (const b of dsBai) {
  const { data: lt } = await sb.from('lesson_modules').select('content_markdown')
    .eq('lesson_id', b.id).eq('type', 'theory').maybeSingle();
  const md = lt?.content_markdown || '';
  const dangTrongBai = md.split('\n').filter(d => /^#{1,4}\s*.*D[ẠA]NG\s*\d/i.test(d.trim())).length;

  const cua = (danhMuc || []).filter(c => (c.lesson || '') === b.title);
  const dem = [];
  for (const c of cua) {
    const { count } = await sb.from('questions')
      .select('id', { count: 'exact', head: true }).eq('math_form', c.math_form).eq('lesson', c.lesson);
    dem.push({ ten: c.math_form, so: count || 0 });
  }
  dem.sort((a, z) => z.so - a.so);
  const tongCau = dem.reduce((s, x) => s + x.so, 0);
  const thieuYeuCau = cua.filter(c => !String(c.yeu_cau_can_dat || '').trim()).length;

  console.log(`\n  ${b.title}`);
  console.log(`     bài giảng: ${dangTrongBai} dạng · kho: ${dem.length} dạng, ${tongCau} câu`
    + (dangTrongBai < dem.length ? `   ⚠ hụt ${dem.length - dangTrongBai} dạng` : '   ✓'));
  if (thieuYeuCau) console.log(`     ⚠ ${thieuYeuCau} dạng trong kho chưa có yêu cầu cần đạt`);
  for (const d of dem) {
    /* dò thô theo mấy chữ đầu của tên dạng - đủ để biết bài giảng có nhắc tới hay chưa */
    const khoa = d.ten.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
    const co = md.toLowerCase().includes(khoa);
    console.log(`       ${co ? '·' : '✗'} ${String(d.so).padStart(3)} câu  ${d.ten}`);
  }
}

/* ---------- 2. answerIndex ---------- */
console.log('\n═══ KHỐI TRẮC NGHIỆM THIẾU answerIndex (chọn đúng vẫn báo sai) ═══');
const idBai = (dsBaiTatCa || []).map(b => b.id);
const { data: mods } = await sb.from('lesson_modules').select('id,title,lesson_id,content_markdown').in('lesson_id', idBai);
let tongKhoi = 0, hong = 0;
for (const m of mods || []) {
  for (const kh2 of (m.content_markdown || '').matchAll(/^```quiz[ \t]*\r?\n([\s\S]*?)^```/gm)) {
    let d; try { d = JSON.parse(kh2[1]); } catch { continue; }
    for (const q of Array.isArray(d) ? d : [d]) {
      const loai = q.type || 'multiple_choice';
      if (loai !== 'multiple_choice' && loai !== 'true_false') continue;
      tongKhoi++;
      if (typeof q.answerIndex !== 'number') { hong++; console.log(`   ✗ ${m.title} (${m.id.slice(0, 8)})`); }
    }
  }
}
console.log(`   ${hong}/${tongKhoi} khối hỏng` + (hong ? '  <- phải vá trước khi giao cho học sinh' : '  ✓'));

/* ---------- 3. Hạn ngạch bài tập tự luyện ---------- */
console.log('\n═══ BÀI TẬP TỰ LUYỆN: số câu và cơ cấu ═══');
const CHUAN = LOP === '12'
  ? { NLC: 20, DS: 4, TLN: 6 }
  : { NLC: 20, DS: 4, TLN: 6, TL: 4 };
console.log(`   chuẩn lớp ${LOP}: ${Object.entries(CHUAN).map(([k, v]) => `${v} ${k}`).join(' + ')}`);
for (const b of dsBai) {
  const { data: m } = await sb.from('lesson_modules').select('content_markdown')
    .eq('lesson_id', b.id).eq('title', 'Bài tập tự luyện').maybeSingle();
  if (!m) { console.log(`   ✗ ${b.title}: chưa có module "Bài tập tự luyện"`); continue; }
  const ids = [];
  for (const k of String(m.content_markdown || '').matchAll(/```quiz[^\n]*\n([\s\S]*?)```/g)) {
    try {
      const j = JSON.parse(k[1]);
      for (const c of (Array.isArray(j) ? j : [j])) if (c?.sourceQuestionId) ids.push(c.sourceQuestionId);
    } catch { /* bỏ */ }
  }
  const { data: q } = ids.length
    ? await sb.from('questions').select('question_type,difficulty').in('id', ids) : { data: [] };
  const loai = {}, muc = {};
  for (const x of q || []) { loai[x.question_type] = (loai[x.question_type] || 0) + 1; muc[x.difficulty] = (muc[x.difficulty] || 0) + 1; }
  const lech = Object.entries(CHUAN).filter(([k, v]) => (loai[k] || 0) !== v)
    .map(([k, v]) => `${k} ${loai[k] || 0}/${v}`);
  console.log(`   ${lech.length ? '⚠' : '✓'} ${b.title}: ${ids.length} câu · loại ${JSON.stringify(loai)} · mức ${JSON.stringify(muc)}`
    + (lech.length ? `   lệch: ${lech.join(', ')}` : ''));
  /* Trắc nghiệm nhiều lựa chọn chỉ lấy nhận biết và thông hiểu (mức 1-2) */
  const nlcKho = (q || []).filter(x => x.question_type === 'NLC' && x.difficulty > 2).length;
  if (nlcKho) console.log(`       ⚠ ${nlcKho} câu NLC ở mức 3-4; quy ước là NLC chỉ lấy mức 1-2`);
}
