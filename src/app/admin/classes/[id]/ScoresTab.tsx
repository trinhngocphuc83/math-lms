"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { Loader2, ImageIcon } from "lucide-react";

export default function ScoresTab({ classId, classInfo, enrollments }: { classId: string, classInfo: any, enrollments: any[] }) {
  const [testName, setTestName] = useState("Bài kiểm tra 15 phút");
  const [passingScore, setPassingScore] = useState<number>(5.0);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [exportingImage, setExportingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleScoreChange = (studentId: string, value: string) => {
    setScores(prev => ({ ...prev, [studentId]: value }));
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;
    setExportingImage(true); 
    try {
      const dataUrl = await toPng(printRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipFonts: true
      });
      const link = document.createElement("a");
      link.download = `Bao_cao_diem_${classInfo?.name || 'Lop'}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi xuất ảnh! Vui lòng thử lại.");
    }
    setExportingImage(false);
  };

  const getRemark = (scoreStr: string) => {
    if (!scoreStr || scoreStr.trim() === '') return null;
    const s = parseFloat(scoreStr);
    if (isNaN(s)) return null;
    if (s >= passingScore) return <span className="text-green-600 font-bold">Đạt</span>;
    return <span className="text-red-600 font-bold">Không đạt</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên bài kiểm tra</label>
            <input 
              type="text" 
              value={testName}
              onChange={e => setTestName(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Điểm đạt (≥)</label>
            <input 
              type="number" 
              step="0.5"
              min="0"
              max="10"
              value={passingScore}
              onChange={e => setPassingScore(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 w-24"
            />
          </div>
        </div>
        <div>
          <button 
            onClick={handleExportImage}
            disabled={exportingImage}
            className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50 border border-indigo-100 shadow-sm"
          >
            {exportingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            Xuất ảnh báo cáo
          </button>
        </div>
      </div>

      {/* Exportable Area */}
      <div ref={printRef} className="bg-white p-4">
        {/* Header with Logo */}
        <div className="flex items-center justify-between border-b-2 border-teal-600 pb-4 mb-4">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="Logo" className="h-16 object-contain rounded-lg" />
            <div>
              <h3 className="text-xl font-black text-teal-700 uppercase">{classInfo?.name}</h3>
              <p className="text-gray-600 font-medium">Báo cáo điểm: <span className="text-gray-800 font-bold">{testName}</span></p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-500">Ngày báo cáo</div>
            <div className="text-lg font-black text-gray-800">{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 border font-bold text-center w-16">STT</th>
              <th className="p-3 border font-bold">Họ và tên</th>
              <th className="p-3 border font-bold text-center w-32">Điểm</th>
              <th className="p-3 border font-bold text-center w-40">Nhận xét</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment, idx) => {
              const studentId = enrollment.profiles?.id || enrollment.id;
              return (
              <tr key={studentId} className="hover:bg-gray-50">
                <td className="p-2 border text-center font-medium text-gray-500">{idx + 1}</td>
                <td className="p-2 border font-bold text-gray-800">{enrollment.profiles?.full_name}</td>
                <td className="p-2 border text-center">
                  <input 
                    type="number" 
                    step="0.1"
                    min="0" max="10"
                    value={scores[studentId] || ''}
                    onChange={e => handleScoreChange(studentId, e.target.value)}
                    className="w-full text-center py-1 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-teal-500 font-bold text-gray-800"
                    data-html2canvas-ignore="false"
                  />
                </td>
                <td className="p-2 border text-center bg-gray-50/50">
                  {getRemark(scores[studentId])}
                </td>
              </tr>
            )})}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">Lớp chưa có học sinh nào.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="mt-4 text-right text-xs text-gray-400 italic">
          * Đạt (≥ {passingScore} điểm) | Báo cáo được xuất tự động từ hệ thống
        </div>
      </div>
    </div>
  );
}
