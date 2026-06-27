"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Save, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewCoursePage() {
  const [grades, setGrades] = useState<{id: string, name: string}[]>([]);
  const [courseCategories, setCourseCategories] = useState<{id: string, name: string}[]>([]);
  const supabase = createClient();
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) {
        // Áp dụng thuật toán phân loại tự động nếu thiếu type
        const removeAccents = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D') : "";
        
        const gradesList: any[] = [];
        const catsList: any[] = [];
        
        data.forEach(item => {
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
    };
    loadCategories();
  }, []);

  const handleSave = async (publishStatus: string) => {
    if (!title) return alert("Vui lòng nhập tên khóa học");
    setIsSaving(true);

    const { error } = await supabase.from('courses').insert([
      { 
        title, 
        category_id: categoryId || null, 
        grade_id: gradeId || null,
        description, 
        status: publishStatus,
        grade_level: 0
      }
    ]);

    setIsSaving(false);
    if (error) {
      alert("Lỗi lưu khóa học: " + error.message);
    } else {
      router.push('/admin/courses');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => router.push('/admin/courses')} className="text-teal-600 font-medium text-sm flex items-center gap-2 hover:underline mb-2">
            &larr; Quay lại danh sách
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Thêm khóa học mới</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Lưu nháp
          </button>
          <button 
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Xuất bản
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1: Thông tin chung */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">1. Thông tin chung</h2>
          
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
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                >
                  <option value="draft">Bản nháp (Chưa ai thấy)</option>
                  <option value="published">Xuất bản (Hiển thị ngay)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả khóa học</label>
              <textarea 
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Viết một đoạn giới thiệu ngắn về những gì học sinh sẽ đạt được sau khi học..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
