/* Soi cả bộ giọng của một bài: đủ đoạn chưa, tỉ lệ chữ/giây có đoạn nào lạ không. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const id = process.argv[2];
mkdirSync('scratch/giong-tam', { recursive: true });
const { data: kbf } = await sb.storage.from('system-assets').download(`giong-bai-giang/${id}/kich-ban.json`);
const kb = JSON.parse(await kbf.text());
let la = 0;
for (const d of kb.doan) {
  if (!d.mp3) { console.log('✗', d.khoa, 'CHƯA THU'); la++; continue; }
  const tep = `scratch/giong-tam/${d.khoa}.soi.mp3`;
  const { data } = await sb.storage.from('system-assets').download(`giong-bai-giang/${id}/${d.mp3}`);
  writeFileSync(tep, Buffer.from(await data.arrayBuffer()));
  const van = String(spawnSync('ffmpeg', ['-i', tep, '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '');
  const m = van.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const giay = m ? (+m[1]*3600 + +m[2]*60 + parseFloat(m[3])) : 0;
  const tyLe = giay ? d.loi.length / giay : 0;
  const co = tyLe < 8 || tyLe > 28;
  if (co) la++;
  console.log(co ? '⚠' : '✓', d.khoa.padEnd(5), String(d.loi.length).padStart(4), 'chữ ·', giay.toFixed(1).padStart(5), 'giây ·', tyLe.toFixed(1), 'chữ/giây');
}
const tong = kb.doan.reduce((t,d)=>t+d.loi.length,0);
console.log(`\n${kb.doan.length} đoạn · ${tong} ký tự · ${la ? la + ' đoạn cần soi lại' : 'không có đoạn nào bất thường'}`);
