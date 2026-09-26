import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const id = process.argv[2];
const u = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/system-assets/giong-bai-giang/${id}/kich-ban.json?t=${Date.now()}`;
const r = await fetch(u);
if (!r.ok) { console.log('chưa có kịch bản', r.status); process.exit(0); }
const kb = await r.json();
console.log('nhịp', kb.nhip, '| đoạn', kb.doan.length, '| có lời', kb.doan.filter(d=>d.loi).length, '| đã thu', kb.doan.filter(d=>d.mp3).length);
console.log('tổng ký tự lời:', kb.doan.reduce((t,d)=>t+d.loi.length,0));
for (const d of kb.doan.slice(0,4)) console.log(' ', d.khoa, '|', d.loi.slice(0,90));
