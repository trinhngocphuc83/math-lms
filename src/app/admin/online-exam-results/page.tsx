"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Search, Filter, RefreshCw, Download, Image as ImageIcon, Trophy, Award, Medal, CheckCircle2, AlertCircle, PlayCircle, Eye } from "lucide-react";
import Link from "next/link";
import { fetchOnlineExamResultsAdmin } from "./actions";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";

export default function OnlineExamResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportStudent, setExportStudent] = useState<any | null>(null); // For personal certificate
  
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await fetchOnlineExamResultsAdmin();
    if (data.error) {
      alert("Lỗi tải dữ liệu: " + data.error);
    } else {
      setCourses(data.courses || []);
      setAllExams(data.allExams || []);
      setResults(data.results || []);
    }
    setLoading(false);
  };

  const uniqueExams = allExams.map(ex => {
    return {
      id: ex.id,
      title: ex.exam_group_name 
        ? `${ex.exam_group_name} - ${ex.variant_name || ex.title}`
        : ex.title || "Không rõ",
      assigned_classes: ex.assigned_classes || []
    };
  }).filter(ex => selectedCourseId === "all" || ex.assigned_classes.includes(selectedCourseId));

  const filteredResults = results.filter(r => {
    const term = searchTerm.toLowerCase();
    const studentName = (r.profiles?.full_name || "").toLowerCase();
    const studentPhone = (r.profiles?.student_phone || "").toLowerCase();
    const examTitle = (r.online_exams?.title || "").toLowerCase();
    const groupTitle = (r.online_exams?.exam_group_name || "").toLowerCase();
    
    const matchesSearch = studentName.includes(term) || studentPhone.includes(term) || examTitle.includes(term) || groupTitle.includes(term);
    
    const matchesExam = selectedExamId === "all" || r.exam_id === selectedExamId;
    
    // Check if the exam belongs to the selected course
    let matchesCourse = true;
    if (selectedCourseId !== "all") {
      const examClasses = r.online_exams?.assigned_classes || [];
      matchesCourse = examClasses.includes(selectedCourseId);
    }

    return matchesSearch && matchesExam && matchesCourse;
  });

  // Export Excel
  const exportToExcel = () => {
    if (filteredResults.length === 0) return alert("Không có dữ liệu để xuất");
    
    const dataToExport = filteredResults.map((r, i) => ({
      "STT": i + 1,
      "Họ và tên": r.profiles?.full_name || "Không rõ",
      "SĐT Học sinh": r.profiles?.student_phone || "Không rõ",
      "Lớp PT": r.profiles?.class_name || "Không rõ",
      "Kỳ thi": r.online_exams?.exam_group_name ? `${r.online_exams.exam_group_name} - ${r.online_exams.variant_name}` : r.online_exams?.title,
      "Điểm số": r.score,
      "Trạng thái": r.status === "GRADED" ? "Đã chấm điểm" : r.status === "SUBMITTED" ? "Chờ chấm" : "Đang làm bài",
      "Thời gian nộp": new Date(r.created_at).toLocaleString("vi-VN"),
      "Cảnh báo gian lận": r.cheat_warnings || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangDiem");
    XLSX.writeFile(workbook, `BangDiem_ThiOnline_${new Date().getTime()}.xlsx`);
  };

  // Export Leaderboard Image
  const exportLeaderboardImage = async () => {
    if (!leaderboardRef.current) return;
    setIsExportingImage(true);
    try {
      const dataUrl = await toPng(leaderboardRef.current, { cacheBust: true, backgroundColor: 'transparent', pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `BangVang_${new Date().getTime()}.png`;
      link.click();
    } catch (err) {
      alert("Có lỗi khi xuất ảnh: " + err);
    }
    setIsExportingImage(false);
  };

  // Export Personal Certificate Image
  const exportPersonalCertificate = async (student: any) => {
    setExportStudent(student);
    setIsExportingImage(true);
    
    // Đợi React render xong certificate ẩn
    setTimeout(async () => {
      if (!certificateRef.current) {
        setIsExportingImage(false);
        setExportStudent(null);
        return;
      }
      try {
        const dataUrl = await toPng(certificateRef.current, { cacheBust: true, backgroundColor: 'transparent', pixelRatio: 2 });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `PhieuDiem_${student.profiles?.full_name}_${new Date().getTime()}.png`;
        link.click();
      } catch (err) {
        alert("Có lỗi khi xuất ảnh: " + err);
      }
      setIsExportingImage(false);
      setExportStudent(null);
    }, 500);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full flex-1 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Kết quả Thi Online</h1>
          <p className="text-zinc-500 mt-2 font-medium">Quản lý điểm số các kỳ thi, xuất bảng điểm và báo cáo</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button 
            onClick={exportToExcel}
            className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:shadow-emerald-100/50 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-bold transition-all"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          <button 
            onClick={exportLeaderboardImage}
            disabled={isExportingImage || filteredResults.length === 0}
            className="bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 hover:shadow-orange-500/30 px-4 py-2 rounded-xl shadow-md flex items-center gap-2 font-bold transition-all disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" /> Xuất Bảng Vàng (Ảnh)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden mb-8">
        {/* Toolbar */}
        <div className="p-5 border-b border-zinc-100 flex flex-col lg:flex-row gap-4 bg-zinc-50/50">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên học sinh, sđt hoặc tên đề thi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <div className="p-2.5 bg-white border border-zinc-200 rounded-xl shadow-sm hidden sm:block">
              <Filter className="w-5 h-5 text-zinc-500" />
            </div>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full sm:w-48 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả Khóa học</option>
              {courses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.title}</option>
              ))}
            </select>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer truncate"
            >
              <option value="all">Tất cả Đề thi</option>
              {uniqueExams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <p className="text-zinc-500 font-bold animate-pulse">Đang tải dữ liệu điểm số...</p>
            </div>
          )}

          {!loading && filteredResults.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border border-zinc-100 shadow-sm">
                <Search className="w-10 h-10 text-zinc-300" />
              </div>
              <p className="text-xl font-bold text-zinc-700 mb-2">Không tìm thấy kết quả nào!</p>
              <p>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase font-black border-b border-zinc-200 tracking-wider">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Học sinh</th>
                  <th className="px-6 py-4">Đề thi</th>
                  <th className="px-6 py-4 text-center">Điểm số</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4">Thời gian nộp</th>
                  <th className="px-6 py-4 text-center">Cảnh báo</th>
                  <th className="px-6 py-4 text-center rounded-tr-xl">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredResults.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-black rounded-xl flex items-center justify-center border border-indigo-200/50 shrink-0">
                          {r.profiles?.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800 text-base">{r.profiles?.full_name || "Không rõ"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">Lớp PT: {r.profiles?.class_name || "-"}</span>
                            <span className="text-xs text-zinc-500">{r.profiles?.student_phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[250px]">
                      {r.online_exams ? (
                        <>
                          <p className="font-bold text-zinc-700 truncate" title={r.online_exams.exam_group_name ? `${r.online_exams.exam_group_name} - ${r.online_exams.variant_name}` : r.online_exams.title}>
                            {r.online_exams.exam_group_name || r.online_exams.title}
                          </p>
                          {r.online_exams.variant_name && (
                            <p className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-wider">{r.online_exams.variant_name}</p>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200/50">
                          <AlertCircle className="w-3.5 h-3.5" /> Đề đã bị xóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-xl font-black text-lg ${
                        r.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
                        r.score >= 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {r.score !== null ? r.score : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.status === 'GRADED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã chấm
                        </span>
                      ) : r.status === 'SUBMITTED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200/50">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chờ chấm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-200/50">
                          Đang thi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-600 font-medium">{new Date(r.created_at).toLocaleDateString("vi-VN")}</p>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{new Date(r.created_at).toLocaleTimeString("vi-VN")}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.cheat_warnings > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" /> {r.cheat_warnings} lần
                        </span>
                      ) : (
                        <span className="text-zinc-300 font-medium">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/admin/online-exams/${r.exam_id}/monitor`}
                          className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Xem Chi tiết Báo cáo Exam"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => exportPersonalCertificate(r)}
                          className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                          title="Xuất Phiếu điểm Cá nhân (Ảnh)"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- PHẦN ẨN ĐỂ RENDER ẢNH --- */}
      
      {/* 1. BẢNG VÀNG TOÀN LỚP (LEADERBOARD) */}
      <div className="fixed top-[200%] left-[200%] opacity-0 pointer-events-none">
        <div ref={leaderboardRef} className="w-[1200px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-16 rounded-[3rem] shadow-2xl relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-fuchsia-500/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
          
          {/* Header */}
          <div className="relative z-10 flex flex-col items-center mb-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/50 mb-6 rotate-3">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-widest drop-shadow-sm mb-4">
              BẢNG VÀNG THÀNH TÍCH
            </h1>
            <p className="text-2xl text-indigo-200 font-medium">
              {selectedExamId !== 'all' && filteredResults.length > 0 
                ? (filteredResults[0].online_exams?.exam_group_name || filteredResults[0].online_exams?.title)
                : "KỲ THI TRẮC NGHIỆM TRỰC TUYẾN"
              }
            </p>
          </div>

          {/* Top 3 Podium (Chỉ hiển thị nếu có đủ data và đã sort theo điểm) */}
          <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10">
            <div className="grid grid-cols-2 gap-6">
              {/* Lấy max 10 học sinh có điểm cao nhất để lên bảng vàng */}
              {[...filteredResults].sort((a,b) => (b.score || 0) - (a.score || 0)).slice(0, 10).map((student, index) => (
                <div key={index} className="flex items-center gap-6 bg-white/10 p-5 rounded-2xl border border-white/5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shrink-0 ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-white shadow-lg shadow-yellow-500/40' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-lg shadow-slate-500/40' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-800 text-white shadow-lg shadow-orange-700/40' :
                    'bg-white/10 text-indigo-200'
                  }`}>
                    {index === 0 ? <Trophy className="w-6 h-6" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-1">{student.profiles?.full_name}</h3>
                    <p className="text-indigo-300 text-sm font-medium">Lớp: {student.profiles?.class_name || '-'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-emerald-500">
                      {student.score}
                    </div>
                    <p className="text-emerald-500/80 text-xs font-black uppercase tracking-wider mt-1">ĐIỂM</p>
                  </div>
                </div>
              ))}
            </div>
            {filteredResults.length === 0 && (
               <div className="text-center text-white/50 py-10">Không có dữ liệu hiển thị</div>
            )}
          </div>
          
          <div className="mt-10 text-center relative z-10">
            <p className="text-indigo-400/60 font-bold uppercase tracking-widest text-sm">Hệ Thống Đào Tạo Math LMS • {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* 2. PHIẾU BÁO ĐIỂM CÁ NHÂN (PERSONAL CERTIFICATE) */}
      {exportStudent && (
        <div className="fixed top-[200%] left-[200%] opacity-0 pointer-events-none">
          <div ref={certificateRef} className="w-[800px] bg-gradient-to-br from-white to-slate-50 p-12 rounded-[2rem] shadow-2xl relative overflow-hidden border-8 border-indigo-50">
            {/* Corner decors */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600 rounded-br-[100px] opacity-10"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-rose-500 rounded-tl-[150px] opacity-10"></div>
            
            <div className="text-center mb-10 relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4 text-indigo-600">
                <Medal className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-indigo-600 tracking-widest uppercase mb-2">LỚP TOÁN THẦY PHÚC</h2>
              <h1 className="text-5xl font-black text-slate-800 mb-6 uppercase">PHIẾU BÁO ĐIỂM</h1>
              <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 to-rose-500 mx-auto rounded-full"></div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100 relative z-10 mb-8">
              <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100 border-dashed">
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Họ và tên Học sinh</p>
                  <p className="text-2xl font-black text-slate-800">{exportStudent.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Lớp / Trường</p>
                  <p className="text-xl font-bold text-slate-700">{exportStudent.profiles?.class_name || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Bài thi</p>
                  <p className="text-xl font-bold text-indigo-900">
                    {exportStudent.online_exams?.exam_group_name ? `${exportStudent.online_exams.exam_group_name} - ${exportStudent.online_exams.variant_name || exportStudent.online_exams.title}` : exportStudent.online_exams?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Thành tích Đạt được</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-lg font-bold text-slate-700">Hoàn thành Tốt</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">ĐIỂM SỐ</p>
                  <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-rose-500">
                    {exportStudent.score}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end relative z-10">
              <div>
                <p className="text-sm font-bold text-slate-500">Ngày xuất phiếu: {new Date().toLocaleDateString('vi-VN')}</p>
              </div>
              <div className="text-center">
                <div className="h-16 w-32 mx-auto flex items-center justify-center mb-1">
                  <img src="/signature.png" alt="Chữ ký" className="h-full w-full object-contain mix-blend-multiply opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
                <p className="font-bold text-slate-800 uppercase tracking-wider mb-1">GIÁO VIÊN PHỤ TRÁCH</p>
                <p className="font-black text-indigo-700 uppercase tracking-widest text-xl">TRỊNH NGỌC PHÚC</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
