/**
 * Áp một KẾ HOẠCH soi dạng cho một chương (sau khi đọc bằng mắt bằng soi-dang-chuong.mjs).
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/ap-ke-hoach-dang.mjs scratch/soi-dang/lop7-c1.ke-hoach.json [ghi]
 *
 * Kế hoạch (JSON):
 * {
 *   "lop": "7", "chuong": 1,
 *   "dang": [                                  // danh sách dạng ĐÍCH đầy đủ của chương
 *     { "bai": "Bài 1. …", "cu": "tên cũ hoặc null", "moi": "tên mới", "yc": "yêu cầu cần đạt",
 *       "gop": ["tên dạng cũ khác cùng bài cần gộp vào", …] }     // gop: tuỳ chọn
 *   ],
 *   "xoa": [ { "bai": "…", "dang": "…" } ],   // dạng bỏ (phải 0 câu sau khi chuyển)
 *   "chuyen": { "<4 kí tự cuối mã câu>": ["Bài …", "tên dạng đích"], … }
 * }
 * Câu không nằm trong "chuyen" thì đi theo dạng cũ của nó (đổi tên nếu dạng đổi tên).
 * Mọi câu phải rơi vào một dạng đích, nếu không script dừng ngay - không ghi nửa chừng.
 * Có sao lưu backups/soi-dang-lop<N>-c<M>-<ngày>/ và chỉ ghi khi có "ghi".
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const TEP = process.argv[2]; const GHI = process.argv.includes('ghi');
if (!TEP) { console.error('Cần tệp kế hoạch'); process.exit(1); }
const KH = JSON.parse(readFileSync(TEP, 'utf8'));
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dm } = await sb.from('question_categories').select('*').eq('grade', KH.lop).like('topic', `Chương ${KH.chuong}. %`);
const topic = dm[0].topic, subject = dm[0].subject;
const cau = [];
for (let i = 0; ; i += 1000) {
  const { data } = await sb.from('questions').select('id,question_id,lesson,math_form').eq('grade', KH.lop).eq('topic', topic).range(i, i + 999);
  cau.push(...(data || [])); if (!data || data.length < 1000) break;
}
const doiTen = {};
for (const d of KH.dang) {
  if (d.cu) doiTen[`${d.bai}|${d.cu}`] = d.moi;
  for (const g of d.gop || []) doiTen[`${d.bai}|${g}`] = d.moi;   // dạng gộp: câu đi theo dạng đích, dòng cũ xoá
}
const dem = {}, ke = [];
for (const q of cau) {
  const id = q.question_id.slice(-4);
  const c = KH.chuyen?.[id];
  const dich = c ? { lesson: c[0], math_form: c[1] } : { lesson: q.lesson, math_form: doiTen[`${q.lesson}|${q.math_form}`] || q.math_form };
  const k = `${dich.lesson}|${dich.math_form}`;
  if (!KH.dang.some(d => d.bai === dich.lesson && d.moi === dich.math_form)) { console.log(`  ✗ câu ${id} rơi ngoài dạng đích: ${k}`); process.exit(1); }
  dem[k] = (dem[k] || 0) + 1;
  if (dich.lesson !== q.lesson || dich.math_form !== q.math_form) ke.push({ id: q.id, ...dich });
}
for (const id of Object.keys(KH.chuyen || {})) if (!cau.some(q => q.question_id.endsWith(id))) console.log(`  ⚠ mã ${id} trong "chuyen" không có trong chương`);
for (const d of KH.dang) console.log(`  ${String(dem[`${d.bai}|${d.moi}`] || 0).padStart(3)}  ${d.bai.slice(0, 8)} | ${d.moi}`);
const doiTenSo = KH.dang.filter(d => d.cu && d.cu !== d.moi).length, moiSo = KH.dang.filter(d => !d.cu).length;
const gopSo = KH.dang.reduce((n, d) => n + (d.gop || []).length, 0);
console.log(`\n${ke.length} câu đổi bài/dạng · ${doiTenSo} dạng đổi tên · ${moiSo} dạng mới · ${gopSo} dạng gộp · ${(KH.xoa || []).length} dạng xoá`);
if (!GHI) { console.log('Thêm "ghi" để ghi thật.'); process.exit(0); }

const thuMuc = `backups/soi-dang-lop${KH.lop}-c${KH.chuong}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
mkdirSync(thuMuc, { recursive: true });
writeFileSync(`${thuMuc}/sao-luu.json`, JSON.stringify({ question_categories: dm, questions: cau }, null, 1));
for (const d of KH.dang) {
  const cuRow = d.cu ? dm.find(x => x.lesson === d.bai && x.math_form === d.cu) : dm.find(x => x.lesson === d.bai && x.math_form === d.moi);
  if (cuRow) { const { error } = await sb.from('question_categories').update({ lesson: d.bai, math_form: d.moi, yeu_cau_can_dat: d.yc }).eq('id', cuRow.id); if (error) console.log('  ✗', d.moi, error.message); }
  else { const { error } = await sb.from('question_categories').insert({ grade: KH.lop, subject, topic, lesson: d.bai, math_form: d.moi, yeu_cau_can_dat: d.yc }); if (error) console.log('  ✗ tạo', d.moi, error.message); }
}
for (const k of ke) { const { error } = await sb.from('questions').update({ lesson: k.lesson, math_form: k.math_form }).eq('id', k.id); if (error) console.log('  ✗ câu', k.id, error.message); }
const xoaTatCa = [...(KH.xoa || [])];
for (const d of KH.dang) for (const g of d.gop || []) xoaTatCa.push({ bai: d.bai, dang: g });
for (const x of xoaTatCa) {
  const { count } = await sb.from('questions').select('id', { count: 'exact', head: true }).eq('grade', KH.lop).eq('topic', topic).eq('lesson', x.bai).eq('math_form', x.dang);
  if (count) { console.log(`  ⚠ còn ${count} câu ở "${x.dang}", không xoá`); continue; }
  await sb.from('question_categories').delete().eq('grade', KH.lop).eq('topic', topic).eq('lesson', x.bai).eq('math_form', x.dang);
}
console.log(`✓ đã ghi · sao lưu ${thuMuc}/`);
