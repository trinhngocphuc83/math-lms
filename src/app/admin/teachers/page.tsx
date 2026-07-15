"use client";

import { useState, useEffect } from "react";
import { GraduationCap, Plus, Trash2, Shield, Loader2, X, CheckSquare, Square, Edit } from "lucide-react";
import { getTeachers, createTeacher, deleteTeacher, updateTeacherPermissions } from "./actions";

const PERMISSIONS_LIST = [
  { id: '/admin/finance', name: 'Tài chính & Học phí' },
  { id: '/admin/categories', name: 'Khối lớp & Danh mục' },
  { id: '/admin/courses', name: 'Khóa học & Bài giảng' },
  { id: '/admin/handbook', name: 'Sổ Tay Công Thức' },
  { id: '/admin/lessons/editor', name: 'Soạn bài bằng AI' },
  { id: '/admin/classes', name: 'Lớp học (Classes)' },
  { id: '/admin/questions', name: 'Ngân hàng Câu hỏi' },
  { id: '/admin/exams', name: 'Quản lý Đề thi' },
  { id: '/admin/online-exams', name: 'Kỳ thi Online' },
  { id: '/admin/online-exam-results', name: 'Kết quả Thi Online' },
  { id: '/admin/exam-results', name: 'Kết quả Bài tập' },
  { id: '/admin/users', name: 'Học sinh & Phụ huynh' },
];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    permissions: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchTeachers = async () => {
    setIsLoading(true);
    const res = await getTeachers();
    if (res.success) {
      setTeachers(res.teachers);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const togglePermission = (id: string) => {
    setFormData(prev => {
      const perms = prev.permissions;
      if (perms.includes(id)) {
        return { ...prev, permissions: perms.filter(p => p !== id) };
      } else {
        return { ...prev, permissions: [...perms, id] };
      }
    });
  };

  const handleOpenModal = (teacher?: any) => {
    setError("");
    if (teacher) {
      setEditUserId(teacher.id);
      setFormData({
        email: teacher.email,
        password: '',
        full_name: teacher.full_name,
        permissions: teacher.permissions || []
      });
    } else {
      setEditUserId(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        permissions: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (editUserId) {
      // Just update permissions for now
      const res = await updateTeacherPermissions(editUserId, formData.permissions);
      if (res.success) {
        setIsModalOpen(false);
        fetchTeachers();
      } else {
        setError(res.error || "Có lỗi xảy ra");
      }
    } else {
      // Create new
      if (!formData.email || !formData.password || !formData.full_name) {
        setError("Vui lòng điền đủ thông tin");
        setIsSubmitting(false);
        return;
      }
      const res = await createTeacher(formData);
      if (res.success) {
        setIsModalOpen(false);
        fetchTeachers();
      } else {
        setError(res.error || "Có lỗi xảy ra khi tạo tài khoản");
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) {
      const res = await deleteTeacher(id);
      if (res.success) {
        fetchTeachers();
      } else {
        alert(res.error);
      }
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-teal-600" />
            Quản lý Giáo viên & Phân quyền
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Tạo tài khoản và cấp quyền truy cập các chức năng cho cộng tác viên.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm tài khoản
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 font-semibold">Tên Giáo viên</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Quyền hạn (Modules)</th>
                <th className="p-4 font-semibold w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-teal-50/20 transition-colors">
                  <td className="p-4 font-bold text-gray-800">{t.full_name}</td>
                  <td className="p-4 text-gray-600">{t.email}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {t.permissions && t.permissions.length > 0 ? (
                        t.permissions.map((p: string) => {
                          const name = PERMISSIONS_LIST.find(x => x.id === p)?.name || p;
                          return <span key={p} className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-md font-medium">{name}</span>
                        })
                      ) : (
                        <span className="text-gray-400 text-sm italic">Chưa cấp quyền</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 flex items-center justify-center gap-2">
                    <button onClick={() => handleOpenModal(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa quyền hạn">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa tài khoản">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">Chưa có tài khoản giáo viên nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="w-6 h-6 text-teal-600" />
                {editUserId ? "Chỉnh sửa quyền hạn" : "Tạo tài khoản Giáo viên"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                  <input 
                    type="text" required
                    disabled={!!editUserId}
                    value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-600/20 disabled:bg-gray-100"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email / Tài khoản</label>
                  <input 
                    type="email" required
                    disabled={!!editUserId}
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-600/20 disabled:bg-gray-100"
                    placeholder="VD: gv_vana@gmail.com"
                  />
                </div>
              </div>

              {!editUserId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu khởi tạo</label>
                  <input 
                    type="text" required
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-600/20"
                    placeholder="Ít nhất 6 ký tự"
                  />
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-800 mb-3 border-t border-gray-100 pt-4">Phân quyền Truy cập (Modules)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PERMISSIONS_LIST.map(perm => {
                    const isSelected = formData.permissions.includes(perm.id);
                    return (
                      <div 
                        key={perm.id} 
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50 border-teal-200 text-teal-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {isSelected ? <CheckSquare className="w-5 h-5 text-teal-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                        <span className="font-medium text-sm">{perm.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                Hủy
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 flex items-center gap-2 transition-colors disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editUserId ? "Cập nhật quyền" : "Tạo tài khoản")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
