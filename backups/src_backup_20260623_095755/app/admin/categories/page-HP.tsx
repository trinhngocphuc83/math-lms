"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  PlusCircle, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  FolderOpen
} from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setCategories(data);
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

  const filteredCategories = categories.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.slug?.toLowerCase().includes(searchTerm.toLowerCase())
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
          onClick={() => alert('Tính năng thêm danh mục đang hoàn thiện...')}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <PlusCircle className="w-5 h-5" />
          Thêm Danh Mục
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
                <th className="px-6 py-4">Tên Danh Mục</th>
                <th className="px-6 py-4">Đường Dẫn (Slug)</th>
                <th className="px-6 py-4 text-center">Khối Lớp</th>
                <th className="px-6 py-4 text-center">Ngày Tạo</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
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
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 inline-block">
                        Khối {cat.grade_level || "?"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                      {cat.created_at ? new Date(cat.created_at).toLocaleDateString('vi-VN') : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => alert('Sửa danh mục: ' + cat.name)}
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
    </div>
  );
}
