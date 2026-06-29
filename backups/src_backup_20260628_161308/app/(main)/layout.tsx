import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MainLayoutClient from './client-layout';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, expiration_date')
    .eq('id', user.id)
    .single();

  if (profile) {
    // If student/parent and not active, block access
    if (profile.role === 'student' || profile.role === 'parent') {
      if (!profile.is_active) {
        redirect('/pending-approval');
      }

      if (profile.expiration_date && new Date(profile.expiration_date) < new Date()) {
        redirect('/expired');
      }
    }
  }

  return <MainLayoutClient>{children}</MainLayoutClient>;
}
