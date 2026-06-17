const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function check() {
  const { data: lessons } = await supabase.from('lessons').select('*').ilike('title', '%don di?u%');
  if (lessons.length > 0) {
    console.log('Lesson:', lessons[0].id, lessons[0].title);
    console.log('Content:', lessons[0].content_markdown?.substring(0, 100));
    const { data: modules } = await supabase.from('lesson_modules').select('*').eq('lesson_id', lessons[0].id);
    console.log('\n--- MODULES ---');
    modules.forEach(m => console.log('Module:', m.id, m.title, '\nContent:', m.content_markdown?.substring(0, 100)));
  } else {
    console.log('Not found');
  }
}
check();
