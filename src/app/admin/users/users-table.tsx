'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Check, X, FileSpreadsheet, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type UserProfile = {
  id: string;
  full_name: string;
  username: string;
  school: string;
  class_name: string;
  student_phone: string;
  parent_name: string;
  parent_phone: string;
  is_active: boolean;
  course_id?: string | null;
  created_at: string;
};

type Course = {
  id: string;
  title: string;
  grade_level: number;
};

export default function UsersTable({ initialUsers, courses }: { initialUsers: UserProfile[], courses: Course[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  
  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Partial<UserProfile> & { password?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus })
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        router.refresh();
      } else {
        alert('Có lỗi xảy ra khi cập nhật trạng thái.');
      }
    } catch (e) {
      alert('Lỗi hệ thống');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);
    if (selectedCourse) {
      formData.append('courseId', selectedCourse);
    }

    try {
      const res = await fetch('/api/admin/import-students', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        router.refresh(); 
      }
    } catch (e) {
      setImportResult({ error: 'Lỗi mạng khi tải file lên.' });
    } finally {
      setImporting(false);
    }
  };

  const openEditModal = async (user: UserProfile) => {
    setUserToEdit({
      id: user.id,
      full_name: user.full_name || '',
      school: user.school || '',
      class_name: user.class_name || '',
      student_phone: user.student_phone || '',
      parent_name: user.parent_name || '',
      parent_phone: user.parent_phone || '',
      course_id: '',
      password: '' // rỗng mặc định
    });
    setIsEditModalOpen(true);

    const supabase = createClient();
    const { data } = await supabase
      .from('student_course_requests')
      .select('course_id')
      .eq('student_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (data?.course_id) {
      setUserToEdit(prev => ({...prev, course_id: data.course_id}));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit.id) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToEdit)
      });
      
      const data = await res.json();
      if (res.ok) {
        // Update local list
        setUsers(users.map(u => u.id === userToEdit.id ? { ...u, ...userToEdit } as UserProfile : u));
        setIsEditModalOpen(false);
        router.refresh();
        alert('Cập nhật thành công!');
      } else {
        alert(data.error || 'Lỗi cập nhật');
      }
    } catch (error) {
      alert('Lỗi hệ thống khi cập nhật');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        router.refresh();
      } else {
        alert('Có lỗi xảy ra khi xóa: ' + (data.error || 'Không xác định'));
      }
    } catch (e) {
      alert('Lỗi hệ thống khi gọi API xóa');
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <input 
          type="text" 
          placeholder="Tìm kiếm tài khoản..." 
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[300px]"
        />
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import từ Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 font-medium">
            <tr>
              <th className="px-6 py-3">Học sinh</th>
              <th className="px-6 py-3">Trường / Lớp</th>
              <th className="px-6 py-3">Tài khoản</th>
              <th className="px-6 py-3">Phụ huynh</th>
              <th className="px-6 py-3 text-center">Trạng thái</th>
              <th className="px-6 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.student_phone || 'Không có SĐT'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-800">{user.school || '-'}</p>
                  <p className="text-xs text-gray-500">Lớp phổ thông: {user.class_name || '-'}</p>
                </td>
                <td className="px-6 py-4 font-mono text-gray-600 text-xs">
                  {user.username}
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-800">{user.parent_name || '-'}</p>
                  <p className="text-xs text-gray-500">{user.parent_phone || ''}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.is_active ? 'Đã kích hoạt' : 'Chờ duyệt'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className={`inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
                        user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    >
                      {user.is_active ? 'Khóa' : 'Kích hoạt'}
                    </button>
                    
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => openDeleteModal(user)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Chưa có tài khoản nào được tạo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <button onClick={() => setIsImportModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Nhập danh sách từ Excel</h2>
            <div className="space-y-4">
              <div>
                <input type="file" accept=".xlsx, .xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="w-full text-sm"/>
                <a href="/api/admin/import-students/template" download className="text-xs text-teal-600 hover:underline block mt-2">Tải file Excel mẫu</a>
              </div>
              <div>
                <label className="block text-sm mb-1">Gán vào khóa học</label>
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full border p-2 rounded">
                  <option value="">-- Không gán ngay --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 border rounded">Hủy</button>
                <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-teal-600 text-white rounded">Nhập</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl relative my-8">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Chỉnh sửa Tài khoản Học sinh</h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Họ tên HS *</label>
                  <input required value={userToEdit.full_name || ''} onChange={e => setUserToEdit({...userToEdit, full_name: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">SĐT HS</label>
                  <input value={userToEdit.student_phone || ''} onChange={e => setUserToEdit({...userToEdit, student_phone: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Trường</label>
                  <input value={userToEdit.school || ''} onChange={e => setUserToEdit({...userToEdit, school: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Lớp ở trường phổ thông</label>
                  <input value={userToEdit.class_name || ''} onChange={e => setUserToEdit({...userToEdit, class_name: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div className="sm:col-span-2 border-t pt-2 mt-2">
                  <h3 className="font-bold text-sm text-gray-600 mb-2">Quản lý Học tập</h3>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Gán Lớp học thêm / Khóa học (LMS)</label>
                  <select value={userToEdit.course_id || ''} onChange={e => setUserToEdit({...userToEdit, course_id: e.target.value})} className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors">
                    <option value="">-- Chưa liên kết Khóa học --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 border-t pt-2 mt-2">
                  <h3 className="font-bold text-sm text-gray-600 mb-2">Thông tin Phụ huynh</h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Họ tên PH</label>
                  <input value={userToEdit.parent_name || ''} onChange={e => setUserToEdit({...userToEdit, parent_name: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">SĐT PH</label>
                  <input value={userToEdit.parent_phone || ''} onChange={e => setUserToEdit({...userToEdit, parent_phone: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
                <div className="sm:col-span-2 border-t pt-2 mt-2">
                  <h3 className="font-bold text-sm text-gray-600 mb-2">Đổi Mật khẩu</h3>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Mật khẩu mới (bỏ trống nếu không đổi)</label>
                  <input type="text" placeholder="Nhập mật khẩu mới..." value={userToEdit.password || ''} onChange={e => setUserToEdit({...userToEdit, password: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xóa tài khoản?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Bạn có chắc chắn muốn xóa tài khoản <strong>{userToDelete.full_name}</strong> (User: {userToDelete.username}) không? 
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium">Hủy</button>
                <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Xóa vĩnh viễn</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
