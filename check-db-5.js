const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function testUpdate() {
  const { error } = await supabase.from('lessons').update({ title: 'TEST TITLE 123' }).eq('id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a');
  console.log('Update Error:', error);
  
  const { data } = await supabase.from('lessons').select('title').eq('id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a').single();
  console.log('Fetched Title:', data.title);
}
testUpdate();
