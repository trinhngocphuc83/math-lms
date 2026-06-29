"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, PlayCircle, Users, AlertTriangle, CheckCircle2, Clock, ShieldAlert, BarChart3, RefreshCw } from "lucide-react";

export default function ExamMonitorPage() {
  const params = useParams<{ id: string }>();
  const [exam, setExam] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMonitorData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetch(`/api/admin/exams/${params.id}/submissions`);
      const data = await res.json();
      if (res.ok) {
        setExam(data.exam);
        setSubmissions(data.submissions || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
    // Auto refresh every 10 seconds
    const interval = setInterval(() => fetchMonitorData(true), 10000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="font-bold">Đang tải trung tâm giám sát...</p>
      </div>
    );
  }

  if (!exam) {
    return <div className="p-8 text-center text-red-500 font-bold">Không tìm thấy dữ liệu kỳ thi!</div>;
  }

  // Thống kê nhanh
  const totalStudents = submissions.length;
  const submittedCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'GRADED').length;
  const testingCount = submissions.filter(s => s.status === 'IN_PROGRESS').length;
  const cheatCount = submissions.filter(s => s.cheat_warnings > 0).length;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/admin/online-exams" className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-2 font-medium transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <PlayCircle className="w-8 h-8 text-indigo-600" />
            Giám sát Trực tiếp
          </h1>
          <p className="text-slate-600 mt-2 font-medium text-lg">{exam.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500 text-right">
            <div>Tự động làm mới mỗi 10s</div>
            <div className="flex items-center gap-1 justify-end">
              Cập nhật lúc: <span className="font-bold text-slate-700">{lastRefreshed.toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>
          <button 
            onClick={async () => {
              if(!confirm('Bạn có chắc chắn muốn Công bố điểm cho toàn bộ Thí sinh đã nộp bài? Học sinh sẽ lập tức nhìn thấy Điểm số và Lời giải chi tiết.')) return;
              setIsRefreshing(true);
              const res = await fetch(`/api/admin/exams/${params.id}/publish-results`, { method: 'POST' });
              if (res.ok) {
                alert('Đã công bố điểm thành công!');
                fetchMonitorData(true);
              } else {
                alert('Lỗi công bố điểm');
                setIsRefreshing(false);
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> Công bố điểm toàn lớp
          </button>
          <button 
            onClick={() => fetchMonitorData(true)}
            className={`p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bảng thống kê tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-500">Tổng tham gia</h3>
            <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-5 h-5 text-indigo-600" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800">{totalStudents}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-500">Đang làm bài</h3>
            <div className="p-2 bg-blue-50 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
          </div>
          <div className="text-3xl font-black text-blue-600">{testingCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-500">Đã nộp bài</h3>
            <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          </div>
          <div className="text-3xl font-black text-emerald-600">{submittedCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-red-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-500">Vi phạm (Cảnh báo)</h3>
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          </div>
          <div className="text-3xl font-black text-red-600">{cheatCount}</div>
        </div>
      </div>

      {/* Danh sách học sinh */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-800">Trạng thái Thí sinh</h2>
        </div>
        
        {submissions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có học sinh nào tham gia</h3>
            <p className="text-slate-500">Ngay khi học sinh bắt đầu làm bài, danh sách sẽ được cập nhật tự động tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold border-b border-slate-200">Học sinh</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200">Trạng thái</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200 text-center">Cảnh báo gian lận</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Điểm số</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{sub.profiles?.full_name || 'Học sinh Ẩn danh'}</div>
                      <div className="text-xs text-slate-500">{sub.profiles?.email || sub.student_id.substring(0,8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {sub.status === 'IN_PROGRESS' && <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Đang làm bài</span>}
                      {(sub.status === 'SUBMITTED' || sub.status === 'GRADED') && <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Đã nộp bài</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {sub.cheat_warnings > 0 ? (
                        <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-100">
                          <AlertTriangle className="w-4 h-4" />
                          {sub.cheat_warnings} lần
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm font-medium">Không có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(sub.status === 'SUBMITTED' || sub.status === 'GRADED' || sub.status === 'PUBLISHED') ? (
                        <span className="text-2xl font-black text-indigo-600">{sub.score !== null ? sub.score : '-'} <span className="text-sm text-slate-400 font-medium">/10</span></span>
                      ) : (
                        <span className="text-slate-400 italic text-sm">Chưa có điểm</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        href={`/admin/online-exams/${params.id}/submissions/${sub.student_id}`}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Xem lại bài làm và Chấm điểm"
                      >
                        <PlayCircle className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
