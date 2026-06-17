const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function checkModules() {
  const { data: modules } = await supabase.from('lesson_modules').select('id, title, content_markdown, order_index').eq('lesson_id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a').order('order_index');
  for (const m of modules) {
     console.log('--- Module:', m.title, 'ID:', m.id, 'Order:', m.order_index);
     console.log(m.content_markdown?.substring(0, 150));
  }
}
checkModules();
