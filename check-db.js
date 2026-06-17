const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function check() {
  const { data: lessons } = await supabase.from('lessons').select('*').order('created_at', { ascending: false }).limit(2);
  console.log('--- LATEST LESSONS ---');
  lessons.forEach(l => console.log('Lesson:', l.id, l.title, '\nContent:', l.content_markdown?.substring(0, 100)));

  if (lessons.length > 0) {
    const { data: modules } = await supabase.from('lesson_modules').select('*').eq('lesson_id', lessons[0].id);
    console.log('\n--- MODULES FOR LATEST LESSON ---');
    modules.forEach(m => console.log('Module:', m.id, m.title, '\nContent:', m.content_markdown?.substring(0, 100)));
  }
}
check();
