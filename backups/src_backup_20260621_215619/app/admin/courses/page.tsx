"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Edit, Trash2, ListVideo, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    // 1. Fetch categories
    const { data: catData } = await supabase.from('categories').select('id, name');
    const catMap = new Map();
    if (catData) {
      catData.forEach((c: any) => catMap.set(c.id, c.name));
    }

    // 2. Fetch courses
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      const enriched = data.map(course => ({
        ...course,
        grade_name: catMap.get(course.grade_id),
        category_name: catMap.get(course.category_id)
      }));
      setCourses(enriched);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cảnh báo: Bạn có chắc chắn muốn xóa khóa học này và toàn bộ bài giảng bên trong? Hành động này không thể hoàn tác!")) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) fetchCourses();
    else alert("Lỗi khi xoá khoá học: " + error.message);
  };

  return (
    <div className="p-8 w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-600" />
            Quản lý Khóa học & Giáo trình
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Quản lý và tổ chức các bài giảng trực tuyến của hệ thống</p>
        </div>
        <Link 
          href="/admin/courses/new" 
          className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Tạo khóa học mới</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-800 mb-2">Chưa có khóa học nào</p>
          <p className="text-gray-500 mb-6">Hãy tạo khóa học đầu tiên để thêm bài giảng và chia sẻ cho học sinh!</p>
          <button 
            onClick={() => router.push('/admin/courses/new')}
            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:underline"
          >
            <Plus size={18} /> Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl text-gray-800 leading-tight line-clamp-2 pr-2">{course.title}</h3>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase whitespace-nowrap ${course.status === 'published' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                  {course.status === 'published' ? 'Xuất bản' : 'Bản nháp'}
                </span>
              </div>
              
              <div className="text-sm text-gray-500 mb-5 line-clamp-2 min-h-[40px] leading-relaxed">
                {course.description || "Chưa có mô tả cho khóa học này..."}
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {course.grade_name && (
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100/50">
                    Khối: {course.grade_name}
                  </span>
                )}
                {course.category_name && (
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                    {course.category_name}
                  </span>
                )}
                {!course.grade_name && !course.category_name && (
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    Chưa phân loại
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                <button 
                  onClick={() => router.push(`/admin/courses/${course.id}/lessons`)}
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <ListVideo size={18} /> Quản lý bài giảng
                </button>
                <div className="flex gap-1">
                  <button 
                    onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Chỉnh sửa khóa học"
                  >
                    <Edit size={18} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={() => handleDelete(course.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Xóa khóa học"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
