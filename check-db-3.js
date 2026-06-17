const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmjithgtecypxmisbzvw.supabase.co', 'sb_publishable_PnQ3WvH25LAnPNEbQ_hZpg_3MEb-CwD');

async function check() {
  const { data: lessons } = await supabase.from('lessons').select('id, title');
  lessons.forEach(l => console.log(l.id, l.title));
}
check();
