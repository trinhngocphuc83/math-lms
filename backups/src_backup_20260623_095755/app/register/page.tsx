import { createClient } from '@/utils/supabase/server';
import RegisterForm from './register-form';

export const metadata = {
  title: 'Đăng ký Tài khoản - EduCenter',
  description: 'Đăng ký tài khoản học sinh cho nền tảng EduCenter',
};

export default async function RegisterPage() {
  const supabase = await createClient();

  // Fetch published courses for the dropdown
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, grade_level, status')
    .eq('status', 'published') // Assuming 'published' is the status for active courses. Using a basic query without status filter if it fails later.
    .order('grade_level', { ascending: true });

  // If status is not 'published' in current DB, let's just fetch all courses
  let finalCourses = courses;
  if (!courses || courses.length === 0) {
     const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title, grade_level, status')
      .order('grade_level', { ascending: true });
     finalCourses = allCourses;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f9f8] p-4 font-sans">
      {/* Box chính giới hạn chiều cao 90vh để không bao giờ bị tràn ra ngoài màn hình */}
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-teal-100 flex flex-col overflow-hidden max-h-[95vh]">
        
        {/* Header Section (Cố định ở trên) */}
        <div className="bg-[#0f6f60] p-6 text-center text-white shrink-0">
          <h1 className="text-2xl font-bold mb-1">ĐĂNG KÝ TÀI KHOẢN</h1>
          <p className="text-teal-100 text-sm">Học sinh / Phụ huynh</p>
        </div>

        {/* Form Section (Tự động xuất hiện thanh cuộn nếu nội dung dài) */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          <RegisterForm courses={finalCourses || []} />
        </div>
      </div>
    </div>
  );
}
