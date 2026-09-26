/* Nâng độ to các đoạn giọng ĐÃ THU của một bài, không phải thu lại (không tốn lượt).
 * Tải từ kho về, chạy loudnorm lên mức mới, kiểm đỉnh rồi tải đè lên.
 *   node scratch/to-lai-giong.mjs <moduleId> [xem]
 * Biến môi trường TO đặt mức LUFS (mặc định -11, đo ra khoảng -12,6 LUFS, đỉnh -1,4 dBFS nên không vỡ tiếng), TP giữ -1 dBTP nên không vỡ tiếng.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync, spawnSync } from 'child_process';

const TO = process.env.TO || '-11';
const TAM = 'scratch/giong-tam';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const id = process.argv[2];
const CHI_XEM = process.argv[3] === 'xem';
if (!id) { console.error('Cần moduleId'); process.exit(1); }
mkdirSync(TAM, { recursive: true });

/** Đo độ to thật của một tệp bằng ffmpeg (ebur128) - ffmpeg in kết quả ra stderr. */
function doDoTo(tep) {
  const r = spawnSync('ffmpeg', ['-i', tep, '-filter:a', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  return String(r.stderr || '');
}
/* Chỉ đọc BẢNG TỔNG KẾT ở cuối. Trong lúc chạy, ffmpeg in liên tục "I: -70.0" cho từng
   khoảnh khắc, bắt nhầm dòng ấy thì lúc nào cũng thấy -70 (mức im lặng ở vài phần trăm
   giây đầu tệp), không phải độ to thật của cả đoạn. */
const lay = (van, nhan) => {
  const i = van.lastIndexOf('Integrated loudness');
  const m = (i < 0 ? van : van.slice(i)).match(new RegExp('\\n\\s*' + nhan + ':\\s*(-?[\\d.]+)'));
  return m ? Number(m[1]) : null;
};

const { data: kbf } = await sb.storage.from('system-assets').download(`giong-bai-giang/${id}/kich-ban.json`);
const kb = JSON.parse(await kbf.text());
const daThu = kb.doan.filter((d) => d.mp3);
console.log(`${daThu.length} đoạn đã thu · nâng lên ${TO} LUFS, đỉnh -1 dBTP\n`);

for (const d of daThu) {
  const goc = `${TAM}/${d.khoa}.cu.mp3`;
  const moi = `${TAM}/${d.khoa}.to.mp3`;
  const { data } = await sb.storage.from('system-assets').download(`giong-bai-giang/${id}/${d.mp3}`);
  writeFileSync(goc, Buffer.from(await data.arrayBuffer()));

  const truoc = doDoTo(goc);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', goc, '-filter:a',
    `loudnorm=I=${TO}:TP=-1.0:LRA=11`, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', moi]);
  const sau = doDoTo(moi);

  const dinh = lay(sau, 'Peak');
  console.log(`${d.khoa.padEnd(6)} ${String(lay(truoc, 'I') ?? '?').padStart(6)} → ${String(lay(sau, 'I') ?? '?').padStart(6)} LUFS · đỉnh ${dinh ?? '?'} dBFS${dinh !== null && dinh > -0.5 ? '  ⚠ sát mức vỡ tiếng' : ''}`);

  if (!CHI_XEM) {
    const { error } = await sb.storage.from('system-assets')
      .upload(`giong-bai-giang/${id}/${d.mp3}`, readFileSync(moi), { contentType: 'audio/mpeg', upsert: true });
    if (error) console.log('   LỖI ' + error.message);
  }
}
if (CHI_XEM) console.log('\n(chỉ xem — bỏ tham số xem để tải đè lên kho)');
