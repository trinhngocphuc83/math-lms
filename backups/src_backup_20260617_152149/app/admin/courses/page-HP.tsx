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
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        categories (
          name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (data) setCourses(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cáº£nh bÃ¡o: Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a khÃ³a há»c nÃ y vÃ  toÃ n bá»™ bÃ i giáº£ng bÃªn trong? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c!")) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) fetchCourses();
    else alert("Lá»—i khi xoÃ¡ khoÃ¡ há»c: " + error.message);
  };

  return (
    <div className="p-8 w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-600" />
            Quáº£n lÃ½ KhÃ³a há»c & GiÃ¡o trÃ¬nh
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Quáº£n lÃ½ vÃ  tá»• chá»©c cÃ¡c bÃ i giáº£ng trá»±c tuyáº¿n cá»§a há»‡ thá»‘ng</p>
        </div>
        <Link 
          href="/admin/courses/new" 
          className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Táº¡o khÃ³a há»c má»›i</span>
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
          <p className="text-lg font-medium text-gray-800 mb-2">ChÆ°a cÃ³ khÃ³a há»c nÃ o</p>
          <p className="text-gray-500 mb-6">HÃ£y táº¡o khÃ³a há»c Ä‘áº§u tiÃªn Ä‘á»ƒ thÃªm bÃ i giáº£ng vÃ  chia sáº» cho há»c sinh!</p>
          <button 
            onClick={() => router.push('/admin/courses/new')}
            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:underline"
          >
            <Plus size={18} /> Táº¡o ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl text-gray-800 leading-tight line-clamp-2 pr-2">{course.title}</h3>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase whitespace-nowrap ${course.status === 'published' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                  {course.status === 'published' ? 'Xuáº¥t báº£n' : 'Báº£n nhÃ¡p'}
                </span>
              </div>
              
              <div className="text-sm text-gray-500 mb-5 line-clamp-2 min-h-[40px] leading-relaxed">
                {course.description || "ChÆ°a cÃ³ mÃ´ táº£ cho khÃ³a há»c nÃ y..."}
              </div>

              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100/50">
                  PhÃ¢n loáº¡i: {course.categories?.name || "ChÆ°a phÃ¢n loáº¡i"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                <button 
                  onClick={() => router.push(`/admin/courses/${course.id}/lessons`)}
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <ListVideo size={18} /> Quáº£n lÃ½ bÃ i giáº£ng
                </button>
                <div className="flex gap-1">
                  <button 
                    onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Chá»‰nh sá»­a khÃ³a há»c"
                  >
                    <Edit size={18} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={() => handleDelete(course.id)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="XÃ³a khÃ³a há»c"
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
