"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { 
  PlusCircle, 
  Search, 
  Settings, 
  Trash2, 
  Users, 
  Clock, 
  PlayCircle,
  FileText,
  FolderOpen
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function OnlineExamsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [exams, setExams] = useState<any[]>([]);
  const [coursesMap, setCoursesMap] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExams(data);

      const { data: coursesData } = await supabase.from('courses').select('id, title');
      if (coursesData) {
        const map: any = {};
        coursesData.forEach((c: any) => map[c.id] = c.title);
        setCoursesMap(map);
      }
    } catch (error: any) {
      console.error("Fetch exams error:", error);
      alert("Lỗi khi tải kỳ thi: " + error.message);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DRAFT': return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">BẢN NHÁP</span>;
      case 'PUBLISHED': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ĐANG MỞ</span>;
      case 'CLOSED': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">ĐÃ ĐÓNG</span>;
      default: return null;
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa kỳ thi này? Dữ liệu bài làm của học sinh cũng sẽ bị xóa vĩnh viễn.")) return;
    
    try {
      const res = await fetch(`/api/admin/exams?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExams(exams.filter(e => e.id !== id));
    } catch (error: any) {
      alert("Lỗi khi xóa: " + error.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Quản lý Kỳ thi Online
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Tạo đề, cấu hình thời gian và theo dõi học sinh thi trực tuyến.</p>
        </div>
        <Link 
          href="/admin/online-exams/new" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          Tạo kỳ thi mới
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Thanh công cụ */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm kỳ thi..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>
        </div>

        {/* Danh sách */}
        {loading ? (
          <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Đang tải danh sách kỳ thi...</div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có kỳ thi nào</h3>
            <p className="text-slate-500 mb-6 max-w-md">Bạn chưa tạo kỳ thi online nào. Hãy bấm "Tạo kỳ thi mới" để bắt đầu thiết lập đề thi cho học sinh.</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Thuật toán nhóm dữ liệu theo Cấu trúc Lớp -> Nhóm Đề -> Đề */}
            {(() => {
              const groupedData: any = {};
              
              exams.forEach(exam => {
                const classes = exam.assigned_classes && exam.assigned_classes.length > 0 
                  ? exam.assigned_classes 
                  : ['[Mở Tự Do - Mọi lớp đều thi được]'];
                
                const groupName = exam.exam_group_name || exam.title; // Lấy tên nhóm hoặc tên đề nếu rỗng
                
                classes.forEach((c: string) => {
                  const className = coursesMap[c] || c; // Dịch ID thành Tên Khóa Học
                  if (!groupedData[className]) groupedData[className] = {};
                  if (!groupedData[className][groupName]) groupedData[className][groupName] = [];
                  groupedData[className][groupName].push(exam);
                });
              });

              return Object.keys(groupedData).sort().map(className => (
                <div key={className} className="mb-8 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <div className="bg-indigo-50 border-b border-indigo-100 p-4 flex items-center gap-3">
                    <Users className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-black text-indigo-900">Khóa Học (LMS): {className}</h3>
                  </div>
                  <div className="p-4 space-y-6">
                    {Object.keys(groupedData[className]).sort().map(groupName => (
                      <div key={groupName} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                        <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-4">
                          <FolderOpen className="w-5 h-5 text-indigo-400 fill-indigo-100" />
                          {groupName}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left bg-white rounded-lg overflow-hidden border border-slate-100">
                            <thead className="bg-slate-100/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                              <tr>
                                <th className="px-4 py-3 border-b">Mã Đề thi</th>
                                <th className="px-4 py-3 border-b">Trạng thái</th>
                                <th className="px-4 py-3 border-b">Thời gian</th>
                                <th className="px-4 py-3 border-b text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {groupedData[className][groupName].map((exam: any) => (
                                <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-800">{exam.variant_name || exam.title}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" /> {exam.duration_minutes} phút
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">{getStatusBadge(exam.status)}</td>
                                  <td className="px-4 py-3">
                                    {exam.start_time ? (
                                      <div className="text-xs">
                                        <div className="text-slate-700 font-medium">{new Date(exam.start_time).toLocaleString('vi-VN')}</div>
                                        <div className="text-slate-400">đến {exam.end_time ? new Date(exam.end_time).toLocaleString('vi-VN') : 'Vô thời hạn'}</div>
                                      </div>
                                    ) : <span className="text-xs text-slate-500 italic">Mở tự do</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right space-x-1">
                                    <Link href={`/admin/online-exams/${exam.id}/edit`} className="inline-block p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Cấu hình">
                                      <Settings className="w-4 h-4" />
                                    </Link>
                                    <Link href={`/admin/online-exams/${exam.id}/monitor`} className="inline-block p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Báo cáo">
                                      <PlayCircle className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => handleDelete(exam.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
// Import ShieldAlert here since it's used in the code but not imported initially
import { ShieldAlert } from "lucide-react";
