const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function testUpdate() {
  const { data: modules } = await supabase.from('lesson_modules').select('*').eq('lesson_id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a').ilike('title', '%Lý thuy?t%');
  if (modules.length > 0) {
     console.log('Module ID:', modules[0].id);
     const { error } = await supabase.from('lesson_modules').update({ content_markdown: 'TEST UPDATE' }).eq('id', modules[0].id);
     console.log('Update Error:', error);
  }
}
testUpdate();
