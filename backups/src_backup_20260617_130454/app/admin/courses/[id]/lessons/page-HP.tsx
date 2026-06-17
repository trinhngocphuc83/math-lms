"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  ArrowLeft, 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  Loader2, 
  Sparkles,
  BookOpen
} from "lucide-react";

export default function CourseLessonsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      // Fetch course title
      const { data: courseData } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
        
      if (courseData) setCourseTitle(courseData.title);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (lessonsData) setLessons(lessonsData);
      setIsLoading(false);
    }
    fetchData();
  }, [courseId, supabase]);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài giảng "${title}" vĩnh viễn không?`)) {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) {
         alert("Lỗi khi xóa bài giảng: " + error.message);
      } else {
         setLessons(lessons.filter(l => l.id !== id));
      }
    }
  };

  const filteredLessons = lessons.filter(l => l.title?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/courses" className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại Danh sách Khóa học
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
             <BookOpen className="w-7 h-7 text-teal-500" />
             Quản lý Bài giảng
          </h1>
          <p className="text-gray-500 mt-1">
             Khóa học: <span className="font-bold text-gray-700">{courseTitle || "Đang tải..."}</span>
          </p>
        </div>
        
        <Link 
          href={`/admin/lessons/editor?courseId=${courseId}`}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <Sparkles className="w-5 h-5" />
          Soạn Bài Bằng AI Mới
        </Link>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài giảng..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-100 uppercase text-xs font-bold text-gray-500">
              <tr>
                <th className="px-6 py-4">Tên Bài Giảng</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4">Ngày Tạo</th>
                <th className="px-6 py-4 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
                    <p className="text-gray-400 mt-2">Đang tải dữ liệu bài giảng...</p>
                  </td>
                </tr>
              ) : filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Chưa có bài giảng nào trong khóa học này. Hãy sử dụng công cụ AI để tạo bài giảng đầu tiên!
                  </td>
                </tr>
              ) : (
                filteredLessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                          <FileText className="w-5 h-5" />
                       </div>
                       {lesson.title || "Bài giảng chưa có tên"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${lesson.is_published ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {lesson.is_published ? "• Đã Xuất Bản" : "• Nháp"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {new Date(lesson.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/admin/lessons/editor?id=${lesson.id}`}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors tooltip-trigger"
                          title="Sửa bài giảng"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(lesson.id, lesson.title)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa bài giảng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
