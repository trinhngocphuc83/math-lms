/**
 * ÁP KẾT LUẬN RÀ CÂU (từ ra-cau.mjs) vào kho và vào mọi module đang dùng câu đó.
 *
 * Đọc tệp scratch/ra-cau/<chương>-sua.json:
 *   [{ "ma": "CH_…", "ket_luan": "…", "sua": { content?, option_a..d?, correct_answer?, explanation? } },
 *    { "ma": "CH_…", "ket_luan": "…", "bo": true }]
 *
 * Với mỗi câu:
 *   - sửa kho (`questions`) đúng các cột ghi trong `sua`, sao lưu bản cũ;
 *   - dựng lại khối ```quiz``` trong MỌI module (content_markdown + presentation_markdown) có
 *     sourceQuestionId của câu ấy: đề, phương án, answerIndex / exactAnswer / ý Đúng-Sai, lời giải
 *     (trắc nghiệm: phuong_phap_giai + cac_buoc_thuc_hien; tự luận: answer) — cùng quy tắc với
 *     script rót câu, không để lời giải hai lần;
 *   - `bo: true`: gỡ khối khỏi module, và gắn cờ "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ - <kết luận>]" vào đầu
 *     đề trong kho để lần rút sau không lấy lại (các script rút đều lọc cờ này).
 *
 * Chạy thử trước; thêm `ghi` mới ghi. Sao lưu vào backups/sua-cau-ra-<ngày>/.
 *
 *   npm run -s skill -- .claude/skills/thpt-12/scripts/sua-cau-ra.mjs scratch/ra-cau/<chương>-sua.json [ghi]
 *
 * Hai hàm dùng chung nằm ở _chung/ của thư mục skills (ổ G): tachDungSai.mjs (tách bốn ý Đúng/Sai
 * theo hai lối đánh nhãn của kho) và donDeCauHoi.mjs (bỏ cờ đầu đề, đổi "\n" thành xuống dòng).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const { tachYDungSai } = await import(new URL('../../_chung/tachDungSai.mjs', import.meta.url).href);
const { donDe, xuongDong } = await import(new URL('../../_chung/donDeCauHoi.mjs', import.meta.url).href);

const CO = process.argv.slice(2);
const TEP = CO.find(x => x.endsWith('.json'));
const GHI = CO.includes('ghi');
if (!TEP) { console.error('Cần đường dẫn tệp -sua.json'); process.exit(1); }
const NGAY = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const SAO_LUU = `backups/sua-cau-ra-${NGAY}`;
const MAU_QUIZ = /^```quiz[ \t]*\r?\n([\s\S]*?)^```\r?\n?/gm;

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ketLuan = JSON.parse(readFileSync(TEP, 'utf8'));

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

/** Dựng lại các trường của khối quiz từ câu kho đã sửa; giữ lại các trường khác của khối cũ. */
function dungLaiKhoi(khoiCu, q) {
  const d = { ...khoiCu };
  delete d.answer; delete d.phuong_phap_giai; delete d.cac_buoc_thuc_hien;
  if (q.question_type === 'NLC') {
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d];
    const idx = 'ABCD'.indexOf(String(q.correct_answer).trim().toUpperCase());
    if (idx < 0 || !opts[idx]) throw new Error('NLC: correct_answer không phải A-D hoặc phương án trống');
    Object.assign(d, { type: 'multiple_choice', question: donDe(q.content), options: opts, answerIndex: idx });
  } else if (q.question_type === 'DS') {
    const t = tachYDungSai(q); if (!t) throw new Error('DS: không tách được bốn ý');
    Object.assign(d, { type: 'true_false_cluster', question: t.de, options: t.y });
  } else if (q.question_type === 'TLN') {
    Object.assign(d, { type: 'short_answer', question: donDe(q.content), exactAnswer: String(q.correct_answer).trim() });
  } else if (khoiCu.epTuTuLuan) {
    /* Khối trả lời ngắn ép từ câu TỰ LUẬN (skill giao-an-tu-luan): giữ kiểu trả lời ngắn, đáp số bỏ "≈" và đơn vị */
    const dap = String(q.correct_answer || '').trim().replace(/^[≈~]\s*/, '').replace(/\s*(cm²|cm2|m²|m2|cm|dm|mm|km|m|độ|°|º)\s*\.?$/i, '').replace(/\.$/, '').trim();
    if (!dap) throw new Error('khối ép từ tự luận mà kho không có correct_answer ngắn');
    Object.assign(d, { type: 'short_answer', question: donDe(q.content), exactAnswer: dap });
  } else {
    Object.assign(d, { type: 'essay', question: donDe(q.content) });
  }
  const giai = xuongDong(q.explanation);
  const g = tachLoiGiai(q.explanation);
  if (q.question_type === 'TL' && !khoiCu.epTuTuLuan) { if (giai) d.answer = giai; }
  else if (g && (g.phuongPhap || g.buoc.length)) { if (g.phuongPhap) d.phuong_phap_giai = g.phuongPhap; if (g.buoc.length) d.cac_buoc_thuc_hien = g.buoc; }
  else if (giai) d.answer = giai;
  d.sourceQuestionId = q.id; d.maCauHoi = q.question_id;
  return d;
}

mkdirSync(SAO_LUU, { recursive: true });
let soKho = 0, soKhoi = 0, soBo = 0;
for (const kl of ketLuan) {
  const { data: q0 } = await sb.from('questions').select('*').eq('question_id', kl.ma).maybeSingle();
  if (!q0) { console.log(`✗ ${kl.ma}: không thấy trong kho`); continue; }
  const q = { ...q0, ...(kl.sua || {}) };
  if (kl.bo) q.content = `[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ - ${kl.ket_luan || 'rà lại thấy sai'}] ` + donDe(q0.content);
  console.log(`${kl.bo ? '⊘' : '✎'} ${kl.ma} · ${kl.ket_luan || ''}`);
  for (const k of Object.keys(kl.sua || {})) console.log(`     ${k}: "${String(q0[k] ?? '').replace(/\s+/g, ' ').slice(0, 60)}" -> "${String(q[k] ?? '').replace(/\s+/g, ' ').slice(0, 60)}"`);

  const { data: mods } = await sb.from('lesson_modules').select('id,title,content_markdown,presentation_markdown')
    .or(`content_markdown.ilike.%${q0.id}%,presentation_markdown.ilike.%${q0.id}%`);
  const capNhat = [];
  for (const m of mods || []) {
    const upd = {};
    for (const cot of ['content_markdown', 'presentation_markdown']) {
      const md = m[cot]; if (!md || !md.includes(q0.id)) continue;
      let n = 0;
      const moi = md.replace(MAU_QUIZ, (khoi, than) => {
        let k; try { k = JSON.parse(than); } catch { return khoi; }
        if (k.sourceQuestionId !== q0.id) return khoi;
        n++;
        if (kl.bo) return '';
        return '```quiz\n' + JSON.stringify(dungLaiKhoi(k, q), null, 2) + '\n```\n';
      });
      if (n) { upd[cot] = moi.replace(/\n{3,}/g, '\n\n'); soKhoi += n; }
    }
    if (Object.keys(upd).length) capNhat.push({ m, upd });
  }
  console.log(`     module đang dùng: ${capNhat.map(x => x.m.title).join(', ') || '(không)'}`);
  if (!GHI) continue;

  writeFileSync(`${SAO_LUU}/${kl.ma}.json`, JSON.stringify(q0, null, 1));
  const cotSua = kl.bo ? { content: q.content } : Object.fromEntries(Object.keys(kl.sua || {}).map(k => [k, q[k]]));
  if (Object.keys(cotSua).length) {
    const { error } = await sb.from('questions').update(cotSua).eq('id', q0.id);
    if (error) { console.log('     ✗ kho: ' + error.message); continue; }
    soKho++;
  }
  for (const { m, upd } of capNhat) {
    writeFileSync(`${SAO_LUU}/module-${m.id}.md`, m.content_markdown || '');
    if (m.presentation_markdown) writeFileSync(`${SAO_LUU}/module-${m.id}-trinh-chieu.md`, m.presentation_markdown);
    const { error } = await sb.from('lesson_modules').update(upd).eq('id', m.id);
    console.log(error ? `     ✗ ${m.title}: ${error.message}` : `     ✓ ${m.title}`);
  }
  if (kl.bo) soBo++;
}
console.log(`\n${GHI ? 'Đã ghi' : '(thử)'}: ${soKho} câu kho sửa · ${soKhoi} khối quiz dựng lại · ${soBo} câu gỡ khỏi bài`);
if (GHI) console.log('Chạy lại kiem-giao-an.mjs và xuất lại Word cho các bài vừa đụng.');
