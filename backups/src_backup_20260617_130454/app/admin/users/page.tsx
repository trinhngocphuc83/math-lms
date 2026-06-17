import { createClient } from '@/utils/supabase/server';
import UsersTable from './users-table';
import { Users as UsersIcon } from 'lucide-react';

export const metadata = {
  title: 'Quản lý Học sinh & Phụ huynh',
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Fetch all profiles where role is student or parent
  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      username,
      school,
      class_name,
      student_phone,
      parent_name,
      parent_phone,
      is_active,
      created_at
    `)
    .in('role', ['student', 'parent'])
    .order('created_at', { ascending: false });

  // Fetch courses for the import modal
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, grade_level');

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Học sinh & Phụ huynh</h1>
            <p className="text-gray-500 text-sm mt-1">Quản lý danh sách tài khoản học sinh, kích hoạt và nhập liệu.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <UsersTable 
          initialUsers={users || []} 
          courses={courses || []} 
        />
      </div>
    </div>
  );
}
