/**
 * Nhận giọng ElevenLabs cho bài giảng trong app — bản Node của `am/nhan-giong.sh` bên
 * PowerPoint, dùng khi thu hàng loạt (tôi lái Chrome tạo giọng, mỗi lần tải một tệp).
 *
 *   node scratch/giong-bai-giang.mjs xem <moduleId>
 *       liệt kê các đoạn CHƯA thu kèm lời và tổng ký tự (lượt web ≈ 1,5 lần số này)
 *
 *   node scratch/giong-bai-giang.mjs nhan <moduleId> <khoa>
 *       lấy tệp ElevenLabs_*.mp3 DUY NHẤT trong Downloads → chuẩn hoá bằng ffmpeg nếu có
 *       (nhịp 1,05 · −14 LUFS) → tải lên kho → ghi kich-ban.json → in đoạn kế tiếp
 *
 *   node scratch/giong-bai-giang.mjs chep <moduleId> <khoaGoc> <khoa1> <khoa2>…
 *       đoạn trùng lời thì chép, không tốn lượt
 *
 * Kịch bản (lời giảng) soạn ở trang /admin/thu-giong; script này chỉ lo phần nhận tệp.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, copyFileSync, unlinkSync, mkdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

const KHO = 'system-assets';
const THU_MUC = 'giong-bai-giang';
const NHIP = process.env.NHIP || '1.05';
const TAI_VE = process.env.TAI_VE || join(homedir(), 'Downloads');
const TAM = 'scratch/giong-tam';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [viec, moduleId, ...doiSo] = process.argv.slice(2);
if (!viec || !moduleId) { console.error('Cần: xem|nhan|chep <moduleId> …'); process.exit(1); }

const duong = ten => `${THU_MUC}/${moduleId}/${ten}`;

async function docKichBan() {
  const { data, error } = await sb.storage.from(KHO).download(duong('kich-ban.json'));
  if (error || !data) { console.error('Chưa có kịch bản — soạn lời ở trang /admin/thu-giong trước.'); process.exit(1); }
  return JSON.parse(await data.text());
}

async function ghiKichBan(kb) {
  kb.cap_nhat = new Date().toISOString();
  const { error } = await sb.storage.from(KHO).upload(duong('kich-ban.json'),
    Buffer.from(JSON.stringify(kb, null, 1)),
    { contentType: 'application/json', upsert: true, cacheControl: '10' });
  if (error) throw error;
}

const chuaThu = kb => kb.doan.filter(d => d.loi && !d.mp3);

function keTiep(kb, sl = 3) {
  const con = chuaThu(kb);
  for (const d of con.slice(0, sl)) console.log(`KẾ TIẾP ${d.khoa}: ${d.loi}`);
  const tong = con.reduce((t, d) => t + d.loi.length, 0);
  console.log(`— còn ${con.length} đoạn, khoảng ${tong} ký tự (lượt web ≈ ${Math.round(tong * 1.5)})`);
}

/** Thời lượng mp3, đọc bằng ffprobe; không có ffmpeg thì trả 0 (app vẫn phát được). */
function doGiay(tep) {
  try {
    const ra = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', tep], { encoding: 'utf8' });
    return Math.round(parseFloat(ra) * 10) / 10;
  } catch { return 0; }
}

const kb = await docKichBan();

if (viec === 'xem') { keTiep(kb, 200); process.exit(0); }

if (viec === 'chep') {
  const [goc, ...dich] = doiSo;
  const dGoc = kb.doan.find(d => d.khoa === goc);
  if (!dGoc?.mp3) { console.error(`Đoạn ${goc} chưa có giọng.`); process.exit(1); }
  const { data } = await sb.storage.from(KHO).download(duong(dGoc.mp3));
  const bytes = Buffer.from(await data.arrayBuffer());
  for (const k of dich) {
    const ten = `${k}.mp3`;
    await sb.storage.from(KHO).upload(duong(ten), bytes, { contentType: 'audio/mpeg', upsert: true });
    const d = kb.doan.find(x => x.khoa === k);
    if (d) { d.mp3 = ten; d.giay = dGoc.giay; }
    console.log(`chép ${goc} → ${k}`);
  }
  await ghiKichBan(kb);
  process.exit(0);
}

if (viec !== 'nhan') { console.error('Việc không rõ.'); process.exit(1); }

const khoa = doiSo[0];
if (!khoa) { console.error('Thiếu khoá đoạn, ví dụ s03 hay s03-m1.'); process.exit(1); }

const ds = readdirSync(TAI_VE).filter(t => /^ElevenLabs_.*\.mp3$/i.test(t));
if (ds.length !== 1) {
  console.error(`LỖI: Downloads có ${ds.length} tệp ElevenLabs (phải đúng 1).`);
  if (ds.length === 0) console.error('   Chrome có thể đang CHẶN tải nhiều tệp — nhờ thầy bấm "Luôn cho phép". Bản đã tạo vẫn ở History, tải lại không tốn lượt.');
  process.exit(1);
}

mkdirSync(TAM, { recursive: true });
const goc = join(TAM, `${khoa}.goc.mp3`);
/* Downloads ở ổ C còn repo ở ổ D - đổi tên qua hai ổ thì Windows báo EXDEV, phải chép rồi xoá. */
copyFileSync(join(TAI_VE, ds[0]), goc);
unlinkSync(join(TAI_VE, ds[0]));

/* Chuẩn hoá nhịp và độ to như bên PowerPoint. Máy không có ffmpeg thì dùng bản gốc và
   để app tự đặt nhịp lúc phát (playbackRate) — vẫn nghe được, chỉ là không cân độ to. */
let tep = goc;
try {
  const ra = join(TAM, `${khoa}.mp3`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', goc, '-filter:a',
    `atempo=${NHIP},loudnorm=I=-14:TP=-1.5:LRA=11`, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', ra]);
  tep = ra;
} catch { console.log('(không có ffmpeg — dùng bản gốc, app tự chỉnh nhịp lúc phát)'); }

const giay = doGiay(tep);
const ten = `${khoa}.mp3`;
const { error } = await sb.storage.from(KHO).upload(duong(ten), readFileSync(tep),
  { contentType: 'audio/mpeg', upsert: true });
if (error) { console.error('Không tải lên được:', error.message); process.exit(1); }

const d = kb.doan.find(x => x.khoa === khoa);
if (!d) { console.error(`Kịch bản không có đoạn ${khoa}.`); process.exit(1); }
/* Nhịp đã nén sẵn vào tệp thì app khỏi chỉnh lần nữa. */
d.mp3 = ten; d.giay = giay || undefined;
if (tep !== goc) kb.nhip = 1;
await ghiKichBan(kb);

const tyLe = giay > 0 ? (d.loi.length / giay) : 0;
console.log(`${khoa} xong — ${statSync(tep).size} byte${giay ? `, ${giay}s, ${tyLe.toFixed(1)} chữ/giây` : ''}`);
if (giay > 1 && (tyLe < 8 || tyLe > 28)) console.log('⚠ tỉ lệ chữ/giây lạ — nghe lại xem có tải nhầm đoạn không');
keTiep(kb, 1);
