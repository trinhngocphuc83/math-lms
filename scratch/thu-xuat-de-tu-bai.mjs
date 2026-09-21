// Thử bộ xuất đề từ bài (khoiQuizSangCauKho + dungTaiLieuWord) ngoài trình duyệt, để soi Word.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { Packer } from 'docx';

const TAM = join(process.cwd(), '.tam-word');
rmSync(TAM, { recursive: true, force: true }); mkdirSync(TAM, { recursive: true });
for (const t of readdirSync('src/utils')) {
  if (!t.endsWith('.ts')) continue;
  writeFileSync(join(TAM, t), readFileSync(join('src/utils', t), 'utf8')
    .replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from './$1.ts'").replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.ts"'));
}
globalThis.window ??= { atob: (s) => Buffer.from(s, 'base64').toString('binary') };
globalThis.URL.createObjectURL ??= () => ''; globalThis.URL.revokeObjectURL ??= () => {};
function doKichThuoc(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8) { let i = 2; while (i + 9 < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } const ma = buf[i+1]; if (ma >= 0xC0 && ma <= 0xC3) return { height: buf.readUInt16BE(i+5), width: buf.readUInt16BE(i+7) }; i += 2 + buf.readUInt16BE(i+2); } }
  return { width: 480, height: 320 };
}
globalThis.Image ??= class { set src(u) { (async () => { try { const r = await fetch(u); const kt = doKichThuoc(Buffer.from(await r.arrayBuffer())); this.naturalWidth = this.width = kt.width; this.naturalHeight = this.height = kt.height; this.onload?.(); } catch { this.onerror?.(); } })(); } };

const { dungTaiLieuWord } = await import(pathToFileURL(join(TAM, 'exportDocx.ts')).href);
const { cauKhoTuMarkdown } = await import(pathToFileURL(join(TAM, 'khoiQuizSangCauKho.ts')).href);
const { chiaPhanDeThi, dauDeMacDinh, DIEM_MAC_DINH } = await import(pathToFileURL(join(TAM, 'deThi.ts')).href);

const env = {}; for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: m } = await sb.from('lesson_modules').select('title, content_markdown').eq('id', process.argv[2]).single();
const cau = cauKhoTuMarkdown(m.content_markdown);
const cacPhan = chiaPhanDeThi(cau);
const diemPhan = Object.fromEntries(cacPhan.map(p => [p.ma, p.cauHoi.length * DIEM_MAC_DINH[p.ma]]));
const dauDe = dauDeMacDinh(m.title); dauDe.monLop = 'Toán - Lớp 12';
console.log(m.title, '|', cau.length, 'câu |', cacPhan.map(p => `${p.ma}:${p.cauHoi.length}`).join(' '), '| thiếu đáp án:', cau.filter(q => q.question_type !== 'TL' && !q.correct_answer).length);
mkdirSync('scratch/word/thu-xuat-de', { recursive: true });
for (const loai of ['student', 'teacher']) {
  const doc = await dungTaiLieuWord(cau, loai, { dauDe, chiaPhan: true, diemPhan });
  const buf = await Packer.toBuffer(doc);
  writeFileSync(`scratch/word/thu-xuat-de/${loai}.docx`, buf);
  console.log(loai, buf.length, 'byte');
}
