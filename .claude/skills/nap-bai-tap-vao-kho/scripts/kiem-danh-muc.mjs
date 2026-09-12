/**
 * KIỂM CÂY DANH MỤC của ngân hàng theo quy ước ở docs/quy-uoc-danh-muc.md. Chạy sau mỗi lần
 * nạp câu, soạn chương, hay sửa danh mục; phải về 0 ✗ trước khi báo xong.
 *
 * Thầy bắt được 12/9/2026: "Toán 12 mà có hằng đẳng thức" - 10 câu lớp 8 gắn nhầm lớp 12,
 * kéo theo cả loạt lệch khác (La Mã / Ả Rập, hai tên cho một bài ôn tập, viết thường, thiếu
 * dấu chấm, sai chính tả, phân môn lệch). Bộ này đo đúng những chỗ ấy để không tái diễn.
 *
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-danh-muc.mjs            # kiểm
 *   node .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-danh-muc.mjs --cap-nhat # ghi lại cây chuẩn
 *
 * Cây chuẩn docs/cay-danh-muc.json = ảnh chụp cây lớp › phân môn › chương › bài đã được thầy
 * duyệt. Chương/bài mới xuất hiện trong kho mà không có trong cây chuẩn thì báo ⚠ - đúng SGK
 * thì chạy --cap-nhat để nhận, sai thì sửa kho.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CAP_NHAT = process.argv.includes('--cap-nhat');
const TEP_CAY = 'docs/cay-danh-muc.json';
/* Phân môn được phép: lấy từ cây chuẩn nếu đã có (kho Lý dùng 'Vật lí'), chưa có thì bộ mặc định của Toán */
const PHAN_MON = new Set(existsSync(TEP_CAY)
  ? Object.values(JSON.parse(readFileSync(TEP_CAY, 'utf8'))).flatMap(mons => Object.keys(mons))
  : ['Đại số', 'Hình học', 'Giải tích', 'Thống kê']);
const CHINH_TA = [/thoã/, /biễu diễn/, /\bHIệu\b/, /  /];

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dm } = await sb.from('question_categories').select('id,grade,subject,topic,lesson,math_form');
const cau = [];
for (let i = 0; ; i += 1000) {
  const { data } = await sb.from('questions').select('question_id,grade,subject,topic,lesson,math_form').range(i, i + 999);
  cau.push(...(data || [])); if (!data || data.length < 1000) break;
}

const loi = [], canhBao = [];
const soChuong = (t) => { const m = String(t).match(/^Chương (\d+)\. /); return m ? +m[1] : null; };
const soBai = (t) => { const m = String(t).match(/^Bài (\d+)\. /); return m ? +m[1] : null; };

/* 1. từng dòng danh mục: hình thức */
for (const d of dm) {
  const o = `[${d.grade} · ${d.subject} · ${String(d.topic).slice(0, 30)} · ${String(d.lesson).slice(0, 30)} · ${d.math_form}]`;
  if (!/^\d+$/.test(String(d.grade))) loi.push(`lớp không phải số ${o}`);
  if (!PHAN_MON.has(d.subject)) loi.push(`phân môn lạ "${d.subject}" ${o}`);
  if (soChuong(d.topic) == null) loi.push(`chương không theo khuôn "Chương N. Tên" ${o}`);
  if (soBai(d.lesson) == null) loi.push(`bài không theo khuôn "Bài N. Tên" ${o}`);
  else if (!/^Bài \d+\. [A-ZĐÀ-Ỹ(]/.test(d.lesson)) loi.push(`tên bài không viết hoa chữ đầu ${o}`);
  if (/^Ôn tập chương/i.test(d.lesson)) loi.push(`bài ôn tập phải là "Bài K. Ôn tập chương" ${o}`);
  for (const re of CHINH_TA) for (const f of ['topic', 'lesson', 'math_form']) if (re.test(String(d[f] || ''))) loi.push(`chính tả ${re} trong ${f} ${o}`);
  if (/[.\s]$/.test(String(d.math_form))) loi.push(`tên dạng có dấu chấm/khoảng trắng cuối ${o}`);
  if (!String(d.math_form || '').trim()) loi.push(`tên dạng trống ${o}`);
}

/* 2. một số chương -> một tên; một chương -> một phân môn; số bài liền nhau; ôn tập đúng K */
const theoChuong = {};
for (const d of dm) {
  const c = soChuong(d.topic); if (c == null) continue;
  const k = `${d.grade}|${c}`;
  const g = (theoChuong[k] ||= { ten: new Set(), mon: new Set(), bai: new Map() });
  g.ten.add(d.topic); g.mon.add(d.subject);
  const b = soBai(d.lesson); if (b != null) g.bai.set(d.lesson, b);
}
for (const [k, g] of Object.entries(theoChuong)) {
  const [lop, c] = k.split('|');
  if (g.ten.size > 1) loi.push(`lớp ${lop} chương ${c} có ${g.ten.size} tên: ${[...g.ten].join(' / ')}`);
  if (g.mon.size > 1) loi.push(`lớp ${lop} chương ${c} thuộc ${g.mon.size} phân môn: ${[...g.mon].join(' / ')}`);
  const thuong = [...g.bai].filter(([t]) => !/Ôn tập chương/.test(t)).map(([, n]) => n).sort((a, b) => a - b);
  const onTap = [...g.bai].filter(([t]) => /Ôn tập chương/.test(t));
  for (let i = 0; i < thuong.length; i++) if (thuong[i] !== i + 1) { canhBao.push(`lớp ${lop} chương ${c}: số bài không liền 1..n (${thuong.join(',')})`); break; }
  const trung = thuong.filter((n, i) => thuong.indexOf(n) !== i);
  if (trung.length) loi.push(`lớp ${lop} chương ${c}: hai bài cùng số ${[...new Set(trung)].join(',')}`);
  if (onTap.length > 1) loi.push(`lớp ${lop} chương ${c}: ${onTap.length} bài ôn tập`);
  for (const [t, n] of onTap) if (n !== thuong.length + 1) loi.push(`lớp ${lop} chương ${c}: "${t}" phải là "Bài ${thuong.length + 1}. Ôn tập chương"`);
}

/* 3. câu không khớp dòng danh mục nào */
const khoa = new Set(dm.map(d => [d.grade, d.subject, d.topic, d.lesson, d.math_form].join('|')));
const lac = {};
for (const q of cau) { const k = [q.grade, q.subject, q.topic, q.lesson, q.math_form].join('|'); if (!khoa.has(k)) lac[k] = (lac[k] || 0) + 1; }
for (const [k, n] of Object.entries(lac)) loi.push(`${n} câu ngoài danh mục: ${k}`);

/* 4. tên bài trong khoá học lệch tên trong kho */
const LA_MA = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const soChuongKhoa = (t) => { const m = String(t).match(/ch[uư][oơ]ng\s+([IVX]+|\d+)/i); return m ? (LA_MA[m[1].toUpperCase()] ?? +m[1]) : null; };
const { data: kh } = await sb.from('courses').select('id,title');
for (const k of kh || []) {
  const lop = (k.title.match(/TOÁN\s+(\d+)/i) || [])[1]; if (!lop) continue;
  const { data: ch } = await sb.from('chapters').select('id,title').eq('course_id', k.id);
  for (const c of ch || []) {
    const sc = soChuongKhoa(c.title); const g = theoChuong[`${lop}|${sc}`]; if (!g) continue;
    const { data: ls } = await sb.from('lessons').select('title').eq('chapter_id', c.id);
    for (const l of ls || []) { const b = soBai(l.title); if (b == null) continue; if (![...g.bai.keys()].includes(l.title)) canhBao.push(`khoá học lớp ${lop} chương ${sc}: bài "${l.title}" không có trong kho (kho: ${[...g.bai.keys()].find(t => soBai(t) === b) || 'không có bài số ' + b})`); }
  }
}

/* 5. so với cây chuẩn */
const cay = {};
for (const d of dm) ((cay[d.grade] ||= {})[d.subject] ||= {})[d.topic] = [...new Set(dm.filter(x => x.grade === d.grade && x.topic === d.topic).map(x => x.lesson))].sort();
if (CAP_NHAT) { writeFileSync(TEP_CAY, JSON.stringify(cay, null, 1)); console.log(`Đã ghi cây chuẩn ${TEP_CAY}`); }
else if (existsSync(TEP_CAY)) {
  const chuan = JSON.parse(readFileSync(TEP_CAY, 'utf8'));
  for (const [lop, mons] of Object.entries(cay)) for (const [mon, chuongs] of Object.entries(mons)) for (const [ch, bais] of Object.entries(chuongs)) {
    const cb = chuan[lop]?.[mon]?.[ch];
    if (!cb) { canhBao.push(`chương chưa có trong cây chuẩn: lớp ${lop} · ${mon} · ${ch}`); continue; }
    for (const b of bais) if (!cb.includes(b)) canhBao.push(`bài chưa có trong cây chuẩn: lớp ${lop} · ${ch.slice(0, 30)} · ${b}`);
  }
  for (const [lop, mons] of Object.entries(chuan)) for (const [mon, chuongs] of Object.entries(mons)) for (const ch of Object.keys(chuongs))
    if (!cay[lop]?.[mon]?.[ch]) canhBao.push(`chương trong cây chuẩn không còn trong kho: lớp ${lop} · ${mon} · ${ch}`);
}

console.log(`${dm.length} dạng · ${cau.length} câu · ${loi.length} lỗi · ${canhBao.length} cảnh báo\n`);
for (const l of loi) console.log('  ✗ ' + l);
for (const l of canhBao) console.log('  ⚠ ' + l);
if (!loi.length) console.log('✓ cây danh mục đúng quy ước');
process.exit(loi.length ? 1 : 0);
