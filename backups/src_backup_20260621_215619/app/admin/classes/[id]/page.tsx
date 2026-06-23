"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Users, UserPlus, Upload, Trash2, Loader2, Search, X, FileSpreadsheet, Download, Plus, Edit2, CheckSquare, DollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getEnrollments, addEnrollment, removeEnrollment, updateStudentProfile } from "./actions";
import AttendanceTab from "./AttendanceTab";
import TuitionTab from "./TuitionTab";

export default function ClassDetailsPage() {
  const [classInfo, setClassInfo] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'tuition'>('students');

  // Search Students
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: "", student_phone: "", school: "", parent_name: "", parent_phone: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Excel Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch class info
    const { data: cls } = await supabase.from('classes').select('*, courses(title), categories(name)').eq('id', classId).single();
    if (cls) setClassInfo(cls);

    // Fetch enrollments bằng Server Action
    const enrollData = await getEnrollments(classId);
    if (enrollData) {
      setEnrollments(enrollData);
    }
    setLoading(false);
  };

  const handleSearchStudents = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, student_phone')
      .eq('role', 'student')
      .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,student_phone.ilike.%${searchTerm}%`)
      .limit(20);
    
    if (data) {
      // Lọc ra những hs chưa có trong lớp
      const existingIds = enrollments.map(e => e.profiles?.id);
      setSearchResults(data.filter(s => !existingIds.includes(s.id)));
    }
    setSearching(false);
  };

  const handleAddStudent = async (studentId: string) => {
    setAddingId(studentId);
    const result = await addEnrollment(classId, studentId);
    setAddingId("");
    if (!result.success) {
      alert("Lỗi khi thêm học sinh: " + result.error);
    } else {
      setIsSearchModalOpen(false);
      setSearchTerm("");
      fetchData();
    }
  };

  const handleRemoveStudent = async (enrollmentId: string, name: string) => {
    if (!confirm(`Xóa học sinh ${name} khỏi lớp này?`)) return;
    const result = await removeEnrollment(enrollmentId);
    if (!result.success) alert("Lỗi: " + result.error);
    else setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name || "",
      student_phone: student.student_phone || "",
      school: student.school || "",
      parent_name: student.parent_name || "",
      parent_phone: student.parent_phone || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setSavingEdit(true);
    const result = await updateStudentProfile(editingStudent.id, editForm);
    setSavingEdit(false);
    
    if (result.success) {
      setIsEditModalOpen(false);
      fetchData(); // Reload enrollments
    } else {
      alert("Lỗi khi lưu thông tin: " + result.error);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResults(null);

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('classId', classId);

    try {
      const res = await fetch('/api/admin/classes/import-students', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Có lỗi xảy ra');
      } else {
        setImportResults(data.results);
        fetchData();
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    }
    setImporting(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>;
  if (!classInfo) return <div className="p-8 text-center text-red-500">Không tìm thấy Lớp học!</div>;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <Link href="/admin/classes" className="inline-flex items-center gap-2 text-gray-500 hover:text-teal-600 mb-6 font-medium transition-colors">
        <ArrowLeft size={18} /> Quay lại danh sách Lớp
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-indigo-500" />
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-3 py-1 rounded-full mb-3 inline-block">
              {classInfo.categories?.name || 'Chưa phân khối'}
            </span>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">{classInfo.name}</h1>
            <p className="text-gray-600 font-medium">
              Khóa học: <span className="text-gray-800">{classInfo.courses?.title || 'Chưa liên kết'}</span>
            </p>
          </div>
          <div className="bg-gray-50 px-6 py-4 rounded-xl text-center min-w-[150px] border border-gray-100">
            <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Sĩ số</div>
            <div className="text-3xl font-black text-teal-600">
              {enrollments.length} <span className="text-base text-gray-400 font-medium">/ {classInfo.max_students || 30}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar mb-6 pb-2 border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('students')} 
          className={`flex items-center gap-2 px-5 py-3 font-bold rounded-t-xl transition-all border-b-2 ${activeTab === 'students' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Users size={18} /> Danh sách Học sinh
        </button>
        <button 
          onClick={() => setActiveTab('attendance')} 
          className={`flex items-center gap-2 px-5 py-3 font-bold rounded-t-xl transition-all border-b-2 ${activeTab === 'attendance' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <CheckSquare size={18} /> Điểm danh
        </button>
        <button 
          onClick={() => setActiveTab('tuition')} 
          className={`flex items-center gap-2 px-5 py-3 font-bold rounded-t-xl transition-all border-b-2 ${activeTab === 'tuition' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <DollarSign size={18} /> Học phí
        </button>
      </div>

      {activeTab === 'students' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600" />
              Danh sách Học sinh
            </h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
          >
            <Upload size={18} /> Nhập Excel
          </button>
          <button 
            onClick={() => { setIsSearchModalOpen(true); setSearchResults([]); setSearchTerm(""); }}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors"
          >
            <UserPlus size={18} /> Thêm thủ công
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">STT</th>
                <th className="px-6 py-4">Học sinh</th>
                <th className="px-6 py-4">Trường/Lớp</th>
                <th className="px-6 py-4">Phụ huynh</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {enrollments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Lớp học chưa có học sinh nào.</td></tr>
              ) : (
                enrollments.map((en, idx) => (
                  <tr key={en.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{en.profiles?.full_name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">TK: {en.profiles?.username} {en.profiles?.student_phone && `• ĐT: ${en.profiles.student_phone}`}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {en.profiles?.school || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {en.profiles?.parent_name ? (
                        <>
                          <div className="font-medium text-gray-800">{en.profiles.parent_name}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{en.profiles.parent_phone}</div>
                        </>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${en.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {en.status === 'ACTIVE' ? 'Đang học' : 'Đã nghỉ'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEditClick(en.profiles)} className="p-2 hover:bg-teal-50 text-teal-600 rounded-lg transition-colors" title="Sửa thông tin">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRemoveStudent(en.id, en.profiles?.full_name)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors" title="Xóa khỏi lớp">
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
      )}

      {activeTab === 'attendance' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AttendanceTab classId={classId} enrollments={enrollments} className={classInfo.name} />
        </div>
      )}

      {activeTab === 'tuition' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TuitionTab classId={classId} classInfo={classInfo} enrollments={enrollments} />
        </div>
      )}

      {/* SEARCH MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsSearchModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Thêm học sinh thủ công</h3>
              <button onClick={() => setIsSearchModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Nhập tên, số điện thoại hoặc tài khoản học sinh..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchStudents()}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <button 
                  onClick={handleSearchStudents} disabled={searching}
                  className="px-6 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tìm'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map(hs => (
                    <div key={hs.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-teal-200 transition-colors">
                      <div>
                        <div className="font-bold text-gray-800">{hs.full_name}</div>
                        <div className="text-sm text-gray-500">TK: {hs.username} {hs.student_phone && `• ĐT: ${hs.student_phone}`}</div>
                      </div>
                      <button 
                        onClick={() => handleAddStudent(hs.id)}
                        disabled={addingId === hs.id}
                        className="px-4 py-2 text-sm font-bold bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {addingId === hs.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  {searchTerm ? 'Không tìm thấy học sinh nào phù hợp hoặc đã có trong lớp.' : 'Hãy nhập từ khóa để tìm kiếm'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Nhập danh sách từ Excel</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {!importResults ? (
                <form onSubmit={handleImportExcel} className="space-y-6">
                  <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm leading-relaxed">
                    <strong>Lưu ý:</strong> File Excel phải có các cột: <b>Họ tên, Tài khoản, Mật khẩu, SĐT HS, Họ tên PH, SĐT PH, Trường, Lớp</b>. <br/>
                    Hệ thống sẽ tự động tạo tài khoản Học sinh (và Phụ huynh) nếu chưa tồn tại, sau đó xếp em đó vào lớp này.
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={e => setImportFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileSpreadsheet className="w-12 h-12 text-teal-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-gray-700">
                      {importFile ? importFile.name : 'Nhấn hoặc kéo thả file Excel vào đây'}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                      Hủy bỏ
                    </button>
                    <button type="submit" disabled={!importFile || importing} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50">
                      {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      Bắt đầu Nhập
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
                    <div className="text-green-600 font-bold text-lg mb-2">Hoàn tất quá trình nhập liệu!</div>
                    <div className="text-sm text-gray-700">
                      Thành công: <b>{importResults.success}</b> | 
                      Thất bại: <b className="text-red-500">{importResults.failed}</b> |
                      Tạo tài khoản PH: <b>{importResults.parentCreated}</b>
                    </div>
                  </div>

                  {importResults.errors?.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <div className="font-bold text-red-700 mb-2 text-sm">Chi tiết lỗi:</div>
                      <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                        {importResults.errors.map((e: string, i: number) => <li key={i}>• {e}</li>)}
                      </ul>
                    </div>
                  )}

                  <button 
                    onClick={() => { setIsImportModalOpen(false); setImportResults(null); }}
                    className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal Chỉnh sửa thông tin Học sinh */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">Chỉnh sửa Học sinh</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên Học sinh</label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại HS</label>
                  <input type="text" value={editForm.student_phone} onChange={e => setEditForm({...editForm, student_phone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Trường học</label>
                  <input type="text" value={editForm.school} onChange={e => setEditForm({...editForm, school: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ tên Phụ huynh</label>
                  <input type="text" value={editForm.parent_name} onChange={e => setEditForm({...editForm, parent_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">SĐT Phụ huynh</label>
                  <input type="text" value={editForm.parent_phone} onChange={e => setEditForm({...editForm, parent_phone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-colors" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                Hủy bỏ
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-50">
                {savingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
