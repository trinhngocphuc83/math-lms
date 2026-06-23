"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, PlayCircle, Lock, Calendar, FileText, LayoutDashboard } from "lucide-react";

export default function StudentExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch("/api/student/exams");
        const data = await res.json();
        if (res.ok) setExams(data);
      } catch (error) {
        console.error("Lỗi lấy danh sách kỳ thi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/student/dashboard" className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-2 font-medium transition-colors w-fit">
            <LayoutDashboard className="w-4 h-4" /> Bảng Điều Khiển
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            Trung tâm Thi Cử
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Tham gia các kỳ thi trực tuyến và đánh giá năng lực của bạn.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="font-medium animate-pulse">Đang tải danh sách bài thi...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-indigo-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có kỳ thi nào</h3>
          <p className="text-slate-500">Hiện tại chưa có kỳ thi nào được mở. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const hasPassword = exam.description && exam.description.includes('"password":'); 
            // Lưu ý: hiện tại password nằm riêng ở DB, ko nằm trong description. Nhưng vì lý do bảo mật API không trả về trường password.
            // Có thể dựa vào một flag "has_password" nếu có. Nếu không thì cứ hiện icon nếu thích.
            
            return (
              <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all group flex flex-col h-full">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 flex flex-col justify-end min-h-[120px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <BookOpen className="w-24 h-24" />
                  </div>
                  <h3 className="text-xl font-bold text-white relative z-10 drop-shadow-md line-clamp-2">
                    {exam.title}
                  </h3>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                      Thời gian làm bài: <span className="font-bold text-slate-800 ml-1">{exam.duration_minutes} phút</span>
                    </div>
                    
                    {exam.start_time && (
                      <div className="flex items-center text-sm text-slate-600 font-medium">
                        <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                        Mở lúc: <span className="text-slate-800 ml-1">{new Date(exam.start_time).toLocaleString('vi-VN')}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <Link 
                      href={`/student/online-exams/${exam.id}`}
                      className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <PlayCircle className="w-5 h-5" /> Vào Phòng Chờ
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
