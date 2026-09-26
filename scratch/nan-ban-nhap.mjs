/* Nắn bảng LaTeX để trần trong các bản nháp soạn câu (thầy đang giữ câu ở đó).
   node scratch/nan-ban-nhap.mjs           xem trước
   node scratch/nan-ban-nhap.mjs ghi       ghi thật (có sao lưu ra backups/) */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { nanBangLatex } from '../src/utils/nanBangLatex.ts';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const GHI = process.argv[2] === 'ghi';
const { data } = await sb.from('ban_nhap_soan').select('id,ten,du_lieu').eq('loai','ngan_hang');
const ngay = new Date().toISOString().slice(0,10).replace(/-/g,'');
for (const n of data) {
  const ds = n.du_lieu?.parsedQuestions;
  if (!Array.isArray(ds)) continue;
  let sua = 0;
  for (const q of ds) {
    for (const t of ['content','option_a','option_b','option_c','option_d','explanation']) {
      const k = nanBangLatex(q[t]);
      if (k.daSua) { q[t] = k.text; sua++; }
    }
  }
  console.log(n.id.slice(0,8), '|', (n.ten||'').slice(0,30), '| sửa', sua, 'trường');
  if (GHI && sua) {
    mkdirSync(`backups/nan-bang-nhap-${ngay}`, { recursive: true });
    writeFileSync(`backups/nan-bang-nhap-${ngay}/${n.id}.json`, JSON.stringify(n.du_lieu, null, 1));
    const { error } = await sb.from('ban_nhap_soan').update({ du_lieu: n.du_lieu }).eq('id', n.id);
    console.log(error ? '   LỖI ' + error.message : '   đã ghi');
  }
}
if (!GHI) console.log('\n(chỉ xem — thêm tham số ghi để ghi thật)');
