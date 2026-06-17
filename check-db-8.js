const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function checkLesson() {
  const { data: lesson } = await supabase.from('lessons').select('content_markdown').eq('id', '39a3c4ef-0076-423b-b3a0-f5fd541d2c3a').single();
  console.log('Lesson Content:', lesson.content_markdown?.substring(0, 100));
}
checkLesson();
