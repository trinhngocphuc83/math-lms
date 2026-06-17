"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  PlusCircle, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  FolderOpen,
  X
} from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'GRADE' | 'CATEGORY'>('GRADE');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<'GRADE' | 'CATEGORY'>('GRADE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // Fallback: Nếu bảng chưa có cột type, nó sẽ hiện tất cả
        console.error("Lỗi tải danh mục:", error);
      }
      
      if (data) {
        // Tự động phân loại dữ liệu cũ nếu chưa có cột type
        const mappedData = data.map(item => {
          let derivedType = item.type;
          if (!derivedType) {
            const nameLower = removeAccents(item.name?.toLowerCase() || "");
            if (nameLower.startsWith("khoi") || nameLower.startsWith("lop")) {
              derivedType = 'GRADE';
            } else {
              derivedType = 'CATEGORY';
            }
          }
          return {
            ...item,
            type: derivedType
          };
        });
        setCategories(mappedData);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}" không? Thao tác này có thể ảnh hưởng đến các khóa học thuộc danh mục.`)) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert("Lỗi khi xóa: " + error.message);
    } else {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    setIsSubmitting(true);
    
    // Auto generate slug from Vietnamese name
    const slug = newCategoryName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '-');
      
    const { error } = await supabase.from('categories').insert([{
      name: newCategoryName.trim(),
      slug: slug,
      type: newCategoryType
    }]);

    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('unique constraint') || error.code === '23505') {
        alert("Khối lớp hoặc Danh mục này đã tồn tại (có thể đang nằm ở Tab bên kia). Vui lòng kiểm tra lại!");
      } else {
        alert("Lỗi khi thêm: " + error.message);
      }
    } else {
      // Đóng modal và reset form
      setIsModalOpen(false);
      setNewCategoryName("");
      fetchCategories();
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !editingCategory) return;
    
    setIsSubmitting(true);
    
    const { error } = await supabase.from('categories').update({
      name: newCategoryName.trim(),
      type: newCategoryType
    }).eq('id', editingCategory.id);

    setIsSubmitting(false);
    
    if (error) {
      alert("Lỗi khi cập nhật: " + error.message);
    } else {
      setIsModalOpen(false);
      setEditingCategory(null);
      setNewCategoryName("");
      fetchCategories();
    }
  };

  const removeAccents = (str: string) => {
    if (!str) return "";
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const filteredCategories = categories.filter(c => 
    c.type === activeTab &&
    (removeAccents(c.name?.toLowerCase() || "").includes(removeAccents(searchTerm.toLowerCase())) || 
     c.slug?.toLowerCase().includes(removeAccents(searchTerm.toLowerCase())))
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
             <FolderOpen className="w-7 h-7 text-teal-600" />
             Khối lớp & Danh mục
          </h1>
          <p className="text-gray-500 mt-1">Phân loại các giáo trình và môn học theo từng khối lớp.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setNewCategoryName("");
            setNewCategoryType(activeTab);
            setIsModalOpen(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <PlusCircle className="w-5 h-5" />
          Thêm {activeTab === 'GRADE' ? 'Khối Lớp' : 'Danh Mục'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('GRADE')}
          className={`px-6 py-3 font-bold text-sm transition-colors relative ${activeTab === 'GRADE' ? 'text-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Khối Lớp
          {activeTab === 'GRADE' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('CATEGORY')}
          className={`px-6 py-3 font-bold text-sm transition-colors relative ${activeTab === 'CATEGORY' ? 'text-teal-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          Danh Mục Khóa Học
          {activeTab === 'CATEGORY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm danh mục..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-6 py-4">Tên {activeTab === 'GRADE' ? 'Khối Lớp' : 'Danh Mục'}</th>
                <th className="px-6 py-4">Đường Dẫn (Slug)</th>
                <th className="px-6 py-4 text-center">Ngày Tạo</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Chưa có danh mục nào được tìm thấy.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{cat.name || "Không tên"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {cat.slug || "-"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                      {cat.created_at ? new Date(cat.created_at).toLocaleDateString('vi-VN') : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setNewCategoryName(cat.name);
                            setNewCategoryType(cat.type);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id, cat.name)} 
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Xóa"
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

      {/* CREATE/EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {editingCategory ? 'Sửa' : 'Thêm'} {newCategoryType === 'GRADE' ? 'Khối Lớp' : 'Danh Mục'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Loại phân loại <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="catType" checked={newCategoryType === 'GRADE'} onChange={() => setNewCategoryType('GRADE')} className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-gray-700">Khối Lớp</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="catType" checked={newCategoryType === 'CATEGORY'} onChange={() => setNewCategoryType('CATEGORY')} className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-gray-700">Danh Mục Khóa Học</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Tên {newCategoryType === 'GRADE' ? 'khối lớp' : 'danh mục'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={newCategoryType === 'GRADE' ? "VD: Khối 12" : "VD: Luyện thi đại học"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Đang lưu..." : "Lưu danh mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
