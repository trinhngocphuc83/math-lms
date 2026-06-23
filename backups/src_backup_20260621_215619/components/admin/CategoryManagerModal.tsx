import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Database, UploadCloud, Download, Trash2, Search, X, FileSpreadsheet, Edit2
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface CategoryData {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

export default function CategoryManagerModal({ isOpen, onClose, onCategoriesUpdated }: CategoryManagerModalProps) {
  const supabase = createClient();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New States
  const [isManualAdding, setIsManualAdding] = useState(false);
  const [newCategory, setNewCategory] = useState({ grade: "", subject: "", topic: "", lesson: "", math_form: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEditing = (cat: CategoryData) => {
    setEditingId(cat.id);
    setNewCategory({
      grade: cat.grade || "",
      subject: cat.subject || "",
      topic: cat.topic || "",
      lesson: cat.lesson || "",
      math_form: cat.math_form || ""
    });
    setIsManualAdding(true);
  };

  const handleUpdate = async () => {
    if (!newCategory.grade || !newCategory.subject || !newCategory.topic || !newCategory.math_form) {
      return alert("Vui lòng điền đủ Lớp, Phân môn, Chuyên đề và Dạng toán!");
    }
    try {
      const { error } = await supabase.from('question_categories').update({
        grade: newCategory.grade.trim(),
        subject: newCategory.subject.trim(),
        topic: newCategory.topic.trim(),
        lesson: newCategory.lesson.trim(),
        math_form: newCategory.math_form.trim()
      }).eq('id', editingId);
      
      if (error) throw error;
      setNewCategory({ grade: "", subject: "", topic: "", lesson: "", math_form: "" });
      setEditingId(null);
      setIsManualAdding(false);
      fetchCategories();
      onCategoriesUpdated();
    } catch (e: any) {
      alert("Lỗi khi cập nhật: " + e.message);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setNewCategory({ grade: "", subject: "", topic: "", lesson: "", math_form: "" });
    setIsManualAdding(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('question_categories').select('*').order('grade', { ascending: true }).order('subject').order('topic');
      if (error && error.code !== '42P01') throw error;
      setCategories(data || []);
    } catch (e: any) {
      console.error("Lỗi lấy danh mục:", e);
    }
  };

  const processImportedData = async (rows: any[]) => {
    try {
      const insertData = rows.map(row => ({
        grade: String(row['Lớp'] || row['grade'] || '').trim(),
        subject: String(row['Phân môn'] || row['subject'] || '').trim(),
        topic: String(row['Chuyên đề'] || row['topic'] || '').trim(),
        lesson: String(row['Tên bài'] || row['lesson'] || '').trim(),
        math_form: String(row['Dạng toán'] || row['math_form'] || '').trim()
      })).filter(r => r.grade && r.subject && r.topic && r.math_form);

      if (insertData.length === 0) {
        alert("File không có dữ liệu hợp lệ. Vui lòng đảm bảo các cột có tên là: Lớp, Phân môn, Chuyên đề, Tên bài, Dạng toán.");
        setIsImporting(false);
        return;
      }

      const { error } = await supabase.from('question_categories').insert(insertData);
      if (error) throw error;

      alert(`Đã nhập thành công ${insertData.length} dạng toán!`);
      fetchCategories();
      onCategoriesUpdated();
    } catch (err: any) {
      alert("Lỗi khi import: " + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          processImportedData(data);
        } catch (error: any) {
          alert("Lỗi đọc Excel: " + error.message);
          setIsImporting(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processImportedData(results.data);
        },
        error: (error) => {
          alert("Lỗi đọc file CSV: " + error.message);
          setIsImporting(false);
        }
      });
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "Lớp": "12", "Phân môn": "Đại số", "Chuyên đề": "Chương 1. Ứng dụng đạo hàm", "Tên bài": "Bài 1. Tính đơn điệu", "Dạng toán": "Tìm khoảng đơn điệu dựa vào BBT"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau");
    XLSX.writeFile(wb, "Mau_Danh_Muc_Ngan_Hang_De.xlsx");
  };

  const handleManualAdd = async () => {
    if (!newCategory.grade || !newCategory.subject || !newCategory.topic || !newCategory.math_form) {
      return alert("Vui lòng điền đủ Lớp, Phân môn, Chuyên đề và Dạng toán!");
    }
    try {
      const { error } = await supabase.from('question_categories').insert([{
        grade: newCategory.grade.trim(),
        subject: newCategory.subject.trim(),
        topic: newCategory.topic.trim(),
        lesson: newCategory.lesson.trim(),
        math_form: newCategory.math_form.trim()
      }]);
      if (error) throw error;
      setNewCategory({ grade: "", subject: "", topic: "", lesson: "", math_form: "" });
      setIsManualAdding(false);
      fetchCategories();
      onCategoriesUpdated();
    } catch (e: any) {
      alert("Lỗi khi thêm: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá danh mục này?")) return;
    try {
      const { error } = await supabase.from('question_categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      onCategoriesUpdated();
    } catch (e: any) {
      alert("Lỗi xóa: " + e.message);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => 
    c.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.math_form.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lesson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex bg-white animate-in fade-in duration-200">
      <div className="w-full h-full flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Database className="w-6 h-6 text-emerald-600" />
              Khung Ngân hàng đề (Danh mục)
            </h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">Quản lý cây thư mục và Import hàng loạt dạng toán từ file Excel.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm chuyên đề, tên bài, dạng toán..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 font-medium transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-bold transition-all text-sm border border-indigo-200"
            >
              <Download className="w-4 h-4" /> Tải file mẫu
            </button>
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400 px-4 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm"
            >
              {isImporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Import Excel
            </button>
            <button 
              onClick={() => setIsManualAdding(!isManualAdding)}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm"
            >
              <Database className="w-4 h-4" /> {isManualAdding ? "Đóng" : "Thêm thủ công"}
            </button>
          </div>
        </div>

        {isManualAdding && (
          <div className="bg-blue-50 border-b border-blue-100 p-5 flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1 w-24">
              <label className="text-xs font-bold text-blue-800">Lớp *</label>
              <input value={newCategory.grade} onChange={e => setNewCategory({...newCategory, grade: e.target.value})} placeholder="VD: 12" className="border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1 w-32">
              <label className="text-xs font-bold text-blue-800">Phân môn *</label>
              <input value={newCategory.subject} onChange={e => setNewCategory({...newCategory, subject: e.target.value})} placeholder="Đại số / Hình" className="border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-blue-800">Chuyên đề *</label>
              <input value={newCategory.topic} onChange={e => setNewCategory({...newCategory, topic: e.target.value})} placeholder="Chương 1. Khảo sát hàm số..." className="border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-blue-800">Tên bài</label>
              <input value={newCategory.lesson} onChange={e => setNewCategory({...newCategory, lesson: e.target.value})} placeholder="Bài 1. Sự đồng biến..." className="border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-blue-800">Dạng toán *</label>
              <input value={newCategory.math_form} onChange={e => setNewCategory({...newCategory, math_form: e.target.value})} placeholder="Tìm khoảng đơn điệu..." className="border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            {editingId ? (
              <div className="flex gap-2 shrink-0">
                <button onClick={handleUpdate} className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm h-[42px]">Cập nhật</button>
                <button onClick={cancelEditing} className="bg-gray-200 text-gray-700 font-bold px-5 py-2.5 rounded-lg hover:bg-gray-300 transition-colors shadow-sm text-sm h-[42px]">Hủy</button>
              </div>
            ) : (
              <button onClick={handleManualAdd} className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm h-[42px] shrink-0">Lưu Dạng</button>
            )}
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-auto bg-gray-50/30">
          {categories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <Database className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có dữ liệu danh mục</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">Bạn có thể sử dụng file Excel (.xlsx) với 5 cột: Lớp, Phân môn, Chuyên đề, Tên bài, Dạng toán để nhập hàng loạt.</p>
              <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-50 text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2 text-sm border border-emerald-200/50">
                <FileSpreadsheet className="w-4 h-4" /> Import từ Excel
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4 pl-6">Lớp / Phân môn</th>
                  <th className="p-4">Chuyên đề / Tên bài</th>
                  <th className="p-4">Dạng toán</th>
                  <th className="p-4 text-right pr-6">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCategories.map((cat, i) => (
                  <tr key={cat.id || i} className="hover:bg-white transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                          {cat.grade}
                        </span>
                        <span className="font-bold text-gray-700 text-sm">{cat.subject}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-800 text-sm">{cat.topic}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{cat.lesson}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                        {cat.math_form}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right flex items-center justify-end gap-1">
                      <button onClick={() => startEditing(cat)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
