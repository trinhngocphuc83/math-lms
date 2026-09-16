import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('D:/claude/math-lms/.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: mods } = await sb.from('lesson_modules').select('content_markdown').limit(3000);
const dem = {};
for (const m of mods) for (const x of String(m.content_markdown||'').matchAll(/```quiz\s*\n([\s\S]*?)```/g)) { try { const q = JSON.parse(x[1]); for (const k of Array.isArray(q)?q:[q]) for (const key of Object.keys(k||{})) dem[key]=(dem[key]||0)+1; } catch {} }
console.log(Object.entries(dem).sort((a,b)=>b[1]-a[1]));
