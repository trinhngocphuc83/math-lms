require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function setup() {
  const email = 'admin@toanthayphuc.com';
  const password = 'admin123456';
  
  // Check if exists
  const { data: users } = await supabase.auth.admin.listUsers();
  const existingUser = users.users.find(u => u.email === email);
  
  let userId;
  if (existingUser) {
    userId = existingUser.id;
    await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (authError) {
      console.error('Error creating user:', authError);
      return;
    }
    userId = authData.user.id;
  }
  
  // Set role to admin
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Quản trị viên',
    role: 'admin',
    is_active: true
  });
  
  if (profileError) {
    console.error('Error setting profile:', profileError);
  } else {
    console.log('Successfully created admin account:');
    console.log('Email:', email);
    console.log('Password:', password);
  }
}
setup();
