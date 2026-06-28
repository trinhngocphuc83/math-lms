import React, { forwardRef } from 'react';
import { Trophy, Star, Medal, Award } from 'lucide-react';

interface ReportCardTemplateProps {
  results: any[];
  classNameName?: string;
  lessonName?: string;
}

const ReportCardTemplate = forwardRef<HTMLDivElement, ReportCardTemplateProps>(
  ({ results, classNameName, lessonName }, ref) => {
    // Chỉ lấy những bạn đã nộp bài và có điểm
    const validResults = results
      .filter(r => !r.is_unsubmitted && typeof r.score === 'number')
      .sort((a, b) => b.score - a.score);

    const title = lessonName && lessonName !== 'Tất cả bài học' 
      ? `KẾT QUẢ: ${lessonName}` 
      : 'BẢNG VÀNG THÀNH TÍCH LUYỆN TẬP';

    const subtitle = classNameName && classNameName !== 'Tất cả các lớp'
      ? `Lớp: ${classNameName}`
      : 'Tổng hợp học sinh xuất sắc';

    return (
      <div 
        ref={ref} 
        style={{ width: '800px', backgroundColor: '#f0fdfa' }} 
        className="p-8 rounded-3xl overflow-hidden relative font-sans text-zinc-900 border-8 border-teal-600/20 shadow-2xl"
      >
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-200 rounded-full blur-3xl opacity-40 translate-y-1/3 -translate-x-1/4" />
        
        {/* Header */}
        <div className="relative z-10 text-center mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center shadow-lg mb-4 text-white">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-teal-900 uppercase tracking-wider mb-2">{title}</h1>
          <h2 className="text-xl font-bold text-teal-700 bg-teal-100/80 px-6 py-2 rounded-full inline-block shadow-sm">
            {subtitle}
          </h2>
        </div>

        {/* List of students */}
        <div className="relative z-10 flex flex-col gap-3">
          {validResults.map((r, index) => {
            // Determine rank colors
            let rankColor = "bg-white border-zinc-200";
            let rankIcon = null;
            let rankTextClass = "text-zinc-500";

            if (index === 0) {
              rankColor = "bg-gradient-to-r from-yellow-50 to-amber-100 border-amber-300 shadow-md";
              rankIcon = <Trophy className="w-6 h-6 text-amber-500" />;
              rankTextClass = "text-amber-700 font-black";
            } else if (index === 1) {
              rankColor = "bg-gradient-to-r from-zinc-50 to-slate-200 border-slate-300 shadow-sm";
              rankIcon = <Medal className="w-6 h-6 text-slate-500" />;
              rankTextClass = "text-slate-700 font-bold";
            } else if (index === 2) {
              rankColor = "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 shadow-sm";
              rankIcon = <Award className="w-6 h-6 text-orange-600" />;
              rankTextClass = "text-orange-800 font-bold";
            } else if (r.score >= 8) {
              rankIcon = <Star className="w-5 h-5 text-emerald-500" />;
            }

            return (
              <div key={r.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${rankColor}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 flex items-center justify-center text-lg rounded-full bg-white/80 border shadow-sm ${rankTextClass}`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-zinc-800">{r.profiles?.full_name || 'Học sinh'}</h3>
                    <p className="text-sm font-semibold text-zinc-500">{r.lessons?.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {rankIcon}
                  <div className="bg-white/80 px-4 py-2 rounded-xl shadow-inner border border-zinc-100">
                    <span className="font-black text-2xl text-teal-700">{r.score}</span>
                    <span className="text-sm font-bold text-teal-900/50 ml-1">điểm</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {validResults.length === 0 && (
            <div className="text-center p-8 bg-white/50 rounded-2xl border border-dashed border-teal-300 text-teal-800 font-bold">
              Chưa có dữ liệu điểm số nào.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-8 text-center text-teal-800/60 font-semibold text-sm border-t border-teal-600/10 pt-4">
          Được xuất tự động bởi Hệ thống Quản lý Học tập (LMS)
        </div>
      </div>
    );
  }
);

ReportCardTemplate.displayName = 'ReportCardTemplate';

export default ReportCardTemplate;
