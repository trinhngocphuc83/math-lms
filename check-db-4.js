const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function check() {
  const { data: modules } = await supabase.from('lesson_modules').select('*').eq('lesson_id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a');
  console.log('\n--- MODULES ---');
  modules.forEach(m => console.log('Module:', m.title, '\nContent:', m.content_markdown?.substring(0, 200)));
}
check();
