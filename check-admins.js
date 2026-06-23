require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function check() {
  const { data: profiles, error } = await supabase.from('profiles').select('*').eq('role', 'admin');
  if (error) console.error('Error fetching profiles:', error);
  console.log('Admins:', profiles);
  
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) console.error('Error fetching users:', authError);
  
  if (profiles && profiles.length > 0) {
    const adminIds = profiles.map(p => p.id);
    const adminAuths = users.users.filter(u => adminIds.includes(u.id));
    console.log('Admin Auth Users:', adminAuths.map(u => ({ email: u.email, id: u.id })));
  }
}
check();
