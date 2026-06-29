"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function EditCoursePage() {
  const [grades, setGrades] = useState<{id: string, name: string}[]>([]);
  const [courseCategories, setCourseCategories] = useState<{id: string, name: string}[]>([]);
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  // Form State
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [scheduleUrl, setScheduleUrl] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load Categories
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) {
        const removeAccents = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D') : "";
        const gradesList: any[] = [];
        const catsList: any[] = [];
        
        catData.forEach(item => {
          let t = item.type;
          if (!t) {
            const nameLower = removeAccents(item.name?.toLowerCase());
            t = (nameLower.startsWith("khoi") || nameLower.startsWith("lop")) ? 'GRADE' : 'CATEGORY';
          }
          if (t === 'GRADE') gradesList.push(item);
          else catsList.push(item);
        });
        setGrades(gradesList);
        setCourseCategories(catsList);
      }

      // Load Course Info
      if (courseId) {
        const { data: courseData, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        
        if (courseData) {
          setTitle(courseData.title || "");
          setCategoryId(courseData.category_id || "");
          setGradeId(courseData.grade_id || "");
          setDescription(courseData.description || "");
          setStatus(courseData.status || "draft");
        } else if (error) {
          alert("Không tìm thấy dữ liệu khóa học!");
          router.push('/admin/courses');
        }
      }
      setIsLoading(false);
    };
    
    loadData();
  }, [courseId]);

  const handleUpdate = async (publishStatus: string) => {
    if (!title) return alert("Vui lòng nhập tên khóa học");
    setIsSaving(true);

    const { error } = await supabase.from('courses').update({
      title, 
      category_id: categoryId || null, 
      grade_id: gradeId || null,
      description, 
      status: publishStatus
    }).eq('id', courseId);

    setIsSaving(false);
    if (error) {
      alert("Lỗi cập nhật khóa học: " + error.message);
    } else {
      router.push('/admin/courses');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => router.push('/admin/courses')} className="text-teal-600 font-medium text-sm flex items-center gap-2 hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Chỉnh sửa Khóa học</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleUpdate("draft")}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl border border-gray-200 font-medium transition-colors disabled:opacity-50 ${status === 'draft' ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Chuyển thành Bản Nháp
          </button>
          <button 
            onClick={() => handleUpdate("published")}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 ${status === 'published' ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/20' : 'bg-white border border-teal-600 text-teal-600 hover:bg-teal-50'}`}
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Cập nhật (Xuất bản)
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1: Thông tin chung */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">1. Thông tin cơ bản</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tên khóa học (Giáo trình) <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Toán Lớp 9 - Đại số Cơ bản" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Khối lớp <span className="text-red-500">*</span></label>
                <select 
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="">-- Chọn khối lớp --</option>
                  {grades.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Danh mục khóa học</label>
                <select 
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="">-- Bỏ trống --</option>
                  {courseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Trạng thái hiển thị ban đầu</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500">
                  {status === 'published' ? 'Đang xuất bản (Mọi người đều thấy)' : 'Bản nháp (Đang ẩn)'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả khóa học</label>
              <textarea 
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Viết một đoạn giới thiệu ngắn về những gì học sinh sẽ đạt được sau khi học..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </section>

        {/* Section 2: Ảnh Lịch học */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">2. Ảnh Lịch học</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Tải ảnh lên</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-teal-500 hover:bg-teal-50 transition-colors">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsSaving(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch(`/api/admin/courses/${courseId}/upload-schedule`, {
                        method: 'POST',
                        body: formData
                      });
                      if (res.ok) {
                        alert("Tải ảnh lịch học thành công!");
                        // Reload ảnh bằng cách update state để force render lại
                        setScheduleUrl(`${supabase.storage.from('system-assets').getPublicUrl(`schedule_course_${courseId}.png`).data.publicUrl}?t=${Date.now()}`);
                      } else {
                        const err = await res.json();
                        alert(err.error || "Lỗi tải ảnh");
                      }
                    } catch (error) {
                      alert("Lỗi kết nối");
                    } finally {
                      setIsSaving(false);
                      e.target.value = '';
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-500">
                Ảnh Lịch học này sẽ được hiển thị ở màn hình Dashboard của Học sinh thuộc khóa học này.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">Lịch học hiện tại</label>
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center min-h-[150px] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={scheduleUrl || `${supabase.storage.from('system-assets').getPublicUrl(`schedule_course_${courseId}.png`).data.publicUrl}?t=${Date.now()}`} 
                  alt="Chưa có ảnh" 
                  className="max-h-[250px] object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-sm text-gray-400 font-medium">Chưa có ảnh</span>';
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
