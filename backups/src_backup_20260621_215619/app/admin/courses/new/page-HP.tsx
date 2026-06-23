"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Save, Loader2, PlusCircle } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    grade_level: 10,
    status: "draft"
  });

  useEffect(() => {
    async function fetchCategories() {
      const { data: cats } = await supabase.from('categories').select('*');
      if (cats) setCategories(cats);
    }
    fetchCategories();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('courses')
      .insert([{
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id || null,
        grade_level: formData.grade_level,
        status: formData.status
      }]);

    if (error) {
      alert("Lỗi khi tạo khóa học: " + error.message);
      setSaving(false);
    } else {
      router.push('/admin/courses');
      router.refresh();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <button 
        onClick={() => router.push('/admin/courses')}
        className="flex items-center gap-2 text-gray-500 hover:text-teal-600 font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại danh sách
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-white flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
            <PlusCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Tạo Khóa học mới</h1>
            <p className="text-teal-50 font-medium opacity-90">Điền thông tin bên dưới để thêm khóa học vào hệ thống</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Tên khóa học <span className="text-red-500">*</span></label>
            <input 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              placeholder="VD: Toán Đại Số Lớp 12 - Ôn thi THPT"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Mô tả khóa học</label>
            <textarea 
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors resize-none"
              placeholder="Mô tả tóm tắt nội dung, mục tiêu của khóa học..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Phân loại (Danh mục)</label>
              <select 
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Khối lớp</label>
              <select 
                value={formData.grade_level}
                onChange={(e) => setFormData({...formData, grade_level: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>Khối Lớp {i+1}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Trạng thái xuất bản</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-4 border border-gray-200 rounded-xl flex-1 hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="status" 
                  value="published" 
                  checked={formData.status === 'published'}
                  onChange={() => setFormData({...formData, status: 'published'})}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <span className="font-semibold text-gray-800">Xuất bản ngay</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-4 border border-gray-200 rounded-xl flex-1 hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="status" 
                  value="draft" 
                  checked={formData.status === 'draft'}
                  onChange={() => setFormData({...formData, status: 'draft'})}
                  className="w-4 h-4 text-gray-600 focus:ring-gray-500"
                />
                <span className="font-semibold text-gray-800">Lưu bản nháp (Ẩn)</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => router.push('/admin/courses')}
              className="px-6 py-3 font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/20 transition-all disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Đang lưu..." : "Tạo khóa học"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
