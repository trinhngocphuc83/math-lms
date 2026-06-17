const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function testUpdate() {
  const { data: modules } = await supabase.from('lesson_modules').select('*').eq('lesson_id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a');
  console.log('Found', modules.length, 'modules');
  if (modules.length > 0) {
     const target = modules.find(m => m.title.includes('thuy'));
     if (target) {
         console.log('Module ID:', target.id);
         const { error } = await supabase.from('lesson_modules').update({ content_markdown: 'TEST UPDATE MODULE' }).eq('id', target.id);
         console.log('Update Error:', error);
         const { data: check } = await supabase.from('lesson_modules').select('content_markdown').eq('id', target.id).single();
         console.log('Check Content:', check.content_markdown);
     }
  }
}
testUpdate();
