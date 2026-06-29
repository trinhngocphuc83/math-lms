"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, Search, Filter, AlertCircle, CheckCircle2, RefreshCw, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import { fetchExamResultsAdmin } from "./actions";
import ReviewModal from './ReviewModal';

export default function ExamResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResultData, setSelectedResultData] = useState<any>(null);

  const openReviewModal = (row: any) => {
      setSelectedResultData(row);
      setIsModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const data = await fetchExamResultsAdmin();
    
    if (data.error === '42P01') {
      alert("Chưa tạo bảng exam_results. Hãy chạy file exam_results.sql trong SQL Editor.");
    } else {
      setClasses(data.classes || []);
      setEnrollments(data.enrollments || []);
      setResults(data.results || []);
      setStudents(data.students || []);
      setLessons(data.lessons || []);
    }
    
    setLoading(false);
  };

  const getStudentClasses = (studentId: string) => {
    const classIds = enrollments.filter(e => e.student_id === studentId).map(e => e.class_id);
    return classes.filter(c => classIds.includes(c.id)).map(c => c.name);
  };

  const isStudentInSelectedClass = (studentId: string) => {
    if (selectedClassId === "all") return true;
    return enrollments.some(e => e.student_id === studentId && e.class_id === selectedClassId);
  };

  const displayResults = () => {
    const term = searchTerm.toLowerCase();

    let submittedResults = results.filter(r => {
      const studentName = (r.profiles?.full_name || "").toLowerCase();
      const lessonTitle = (r.lessons?.title || "").toLowerCase();
      
      const matchesSearch = studentName.includes(term) || lessonTitle.includes(term);
      const matchesClass = isStudentInSelectedClass(r.student_id);
      const matchesLesson = selectedLessonId === "all" || r.lesson_id === selectedLessonId;

      return matchesSearch && matchesClass && matchesLesson;
    });

    let unsubmittedResults: any[] = [];
    if (selectedClassId !== "all" && selectedLessonId !== "all") {
      const studentIdsInClass = enrollments
        .filter(e => e.class_id === selectedClassId)
        .map(e => e.student_id);

      const submittedStudentIds = submittedResults.map(r => r.student_id);
      const unsubmittedStudentIds = studentIdsInClass.filter(id => !submittedStudentIds.includes(id));

      unsubmittedResults = unsubmittedStudentIds.map(studentId => {
        const studentProfile = students.find(s => s.id === studentId);
        const lessonInfo = lessons.find(l => l.id === selectedLessonId);
        
        const studentName = (studentProfile?.full_name || "").toLowerCase();
        const lessonTitle = (lessonInfo?.title || "").toLowerCase();
        const matchesSearch = studentName.includes(term) || lessonTitle.includes(term);

        if (!matchesSearch) return null;

        return {
          id: `unsubmitted-${studentId}`,
          student_id: studentId,
          lesson_id: selectedLessonId,
          profiles: studentProfile,
          lessons: lessonInfo,
          attempt_number: 0,
          cheat_warnings: 0,
          score: null,
          passed: false,
          created_at: null,
          is_unsubmitted: true
        };
      }).filter(Boolean);
    }

    return [...submittedResults, ...unsubmittedResults];
  };

  const finalResults = displayResults();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(finalResults.filter(r => !r.is_unsubmitted).map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`BẠN CÓ CHẮC CHẮN MUỐN XÓA ${selectedIds.length} BÀI LÀM ĐÃ CHỌN?\nHành động này sẽ Xóa vĩnh viễn dữ liệu điểm và Toàn bộ File Ảnh của các bài làm này!`)) return;
    
    setLoading(true);
    for (const id of selectedIds) {
      try {
        const res = await fetch('/api/admin/delete-exam-result', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const d = await res.json();
        if (!res.ok) {
           throw new Error(d.error || 'Server error');
        }
      } catch (e: any) {
        console.error("Lỗi xóa: ", e);
        alert("Lỗi khi xóa bài: " + (e.message || e));
      }
    }
    setSelectedIds([]);
    fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full flex-1 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Kết quả Luyện tập</h1>
          <p className="text-zinc-500 mt-2 font-medium">Theo dõi tiến độ, điểm số và quản lý theo lớp học</p>
        </div>
        {selectedIds.length > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Xóa ({selectedIds.length}) mục
          </button>
        )}
        <button 
          onClick={fetchData}
          className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-bold"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row gap-4 bg-zinc-50/50">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm học sinh hoặc tên bài học..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
          
          <div className="shrink-0 flex items-center gap-2">
            <div className="p-2.5 bg-white border border-zinc-200 rounded-xl shadow-sm">
              <Filter className="w-5 h-5 text-zinc-500" />
            </div>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full md:w-48 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              <option value="all">Tất cả các lớp</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <select
              value={selectedLessonId}
              onChange={e => setSelectedLessonId(e.target.value)}
              className="w-full md:w-64 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              <option value="all">Tất cả bài học</option>
              {lessons.map(ls => (
                <option key={ls.id} value={ls.id}>{ls.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input type="checkbox" onChange={handleSelectAll} checked={finalResults.filter(r => !r.is_unsubmitted).length > 0 && selectedIds.length === finalResults.filter(r => !r.is_unsubmitted).length} className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                </th>
                <th className="px-6 py-4">Học sinh / Lớp</th>
                <th className="px-6 py-4">Bài học</th>
                <th className="px-6 py-4 text-center">Lần nộp</th>
                <th className="px-6 py-4 text-center">Gian lận</th>
                <th className="px-6 py-4 text-center">Điểm số</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thời gian</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : finalResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 font-medium bg-zinc-50/50">
                    Không tìm thấy kết quả nào.
                  </td>
                </tr>
              ) : (
                finalResults.map((row) => (
                  <tr key={row.id} className={`transition-colors ${row.is_unsubmitted ? 'bg-zinc-50/80 grayscale-[30%] opacity-80' : 'hover:bg-zinc-50'}`}>
                    <td className="px-6 py-4 text-center">
                      {!row.is_unsubmitted && (
                        <input type="checkbox" onChange={(e) => handleSelectRow(e, row.id)} checked={selectedIds.includes(row.id)} className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold ${row.is_unsubmitted ? 'text-zinc-600' : 'text-zinc-900'}`}>{row.profiles?.full_name || 'Học sinh ẩn'}</div>
                      <div className="text-zinc-500 text-xs flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" /> 
                        {getStudentClasses(row.student_id).join(', ') || 'Chưa xếp lớp'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-800 line-clamp-2 max-w-xs">{row.lessons?.title || 'Bài giảng không xác định'}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-zinc-600">
                      {row.is_unsubmitted ? '-' : `Lần ${row.attempt_number}`}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_unsubmitted ? (
                        <span className="text-zinc-300 font-medium">-</span>
                      ) : row.cheat_warnings > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> {row.cheat_warnings} lần
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_unsubmitted ? (
                        <span className="text-zinc-300 font-bold">-</span>
                      ) : (
                        <span className="font-black text-lg text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                          {row.score}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_unsubmitted ? (
                        <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-500 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          Chưa làm bài
                        </span>
                      ) : row.passed ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> Đạt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          <AlertCircle className="w-4 h-4" /> Chưa Đạt
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-500 text-xs font-medium">
                      {row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : <span className="text-zinc-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!row.is_unsubmitted && (
                        <button onClick={() => openReviewModal(row)} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors" title="Chấm chi tiết">
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ReviewModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resultData={selectedResultData}
        onUpdateSuccess={fetchData}
      />
    </div>
  );
}
