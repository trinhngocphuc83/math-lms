"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Save, Loader2, Calendar, Check, AlertCircle, ImageIcon, Download } from "lucide-react";
import { getSessions, createSession, deleteSession, getAttendance, saveBulkAttendance } from "./attendanceActions";
import { toPng } from "html-to-image";

export default function AttendanceTab({ classId, enrollments, className }: { classId: string, enrollments: any[], className?: string }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<string, {status: string, note: string}>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [classId]);

  const getTodayString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
  };

  const fetchSessions = async () => {
    setLoading(true);
    const res = await getSessions(classId);
    if (res.success && res.data) {
      setSessions(res.data);
      
      const todayStr = getTodayString();
      const todaySession = res.data.find((s: any) => s.session_date === todayStr);

      if (todaySession) {
        handleSelectSession(todaySession.id, res.data);
      } else {
        // Nếu hôm nay chưa điểm danh, tự động focus vào chức năng Điểm danh hôm nay
        setSelectedSessionId("NEW_TODAY");
        initDefaultAttendance();
      }
    }
    setLoading(false);
  };

  const initDefaultAttendance = () => {
    const attMap: Record<string, {status: string, note: string}> = {};
    enrollments.forEach(en => {
      attMap[en.profiles.id] = { status: 'PRESENT', note: '' };
    });
    setAttendance(attMap);
  };

  const handleSelectSession = async (sessionId: string, sessionList: any[] = sessions) => {
    if (sessionId === "NEW_TODAY") {
      setSelectedSessionId("NEW_TODAY");
      initDefaultAttendance();
      return;
    }

    setSelectedSessionId(sessionId);
    const res = await getAttendance(sessionId);
    
    const attMap: Record<string, {status: string, note: string}> = {};
    enrollments.forEach(en => {
      attMap[en.profiles.id] = { status: 'PRESENT', note: '' };
    });

    if (res.success && res.data) {
      res.data.forEach((record: any) => {
        attMap[record.student_id] = { status: record.status, note: record.note || '' };
      });
    }
    setAttendance(attMap);
  };

  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa dữ liệu điểm danh "${title}"?`)) return;
    const res = await deleteSession(sessionId);
    if (res.success) {
      const updated = sessions.filter(s => s.id !== sessionId);
      setSessions(updated);
      
      if (selectedSessionId === sessionId) {
        const todayStr = getTodayString();
        const stillHasToday = updated.find(s => s.session_date === todayStr);
        if (!stillHasToday) {
           setSelectedSessionId("NEW_TODAY");
           initDefaultAttendance();
        } else if (updated.length > 0) {
           handleSelectSession(updated[0].id, updated);
        } else {
           setSelectedSessionId("NEW_TODAY");
           initDefaultAttendance();
        }
      }
    } else {
      alert("Lỗi xóa: " + res.error);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance({
      ...attendance,
      [studentId]: { ...attendance[studentId], status }
    });
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendance({
      ...attendance,
      [studentId]: { ...attendance[studentId], note }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    let targetSessionId = selectedSessionId;
    
    // Nếu là điểm danh hôm nay (chưa có session), hệ thống tự động tạo session
    if (selectedSessionId === "NEW_TODAY") {
      const todayStr = getTodayString();
      const dateParts = todayStr.split('-');
      const title = `Điểm danh ngày ${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      
      const createRes = await createSession(classId, title, todayStr);
      if (createRes.success && createRes.data) {
         targetSessionId = createRes.data.id;
         setSessions([createRes.data, ...sessions]);
         setSelectedSessionId(targetSessionId);
      } else {
         alert("Lỗi tự động tạo buổi học: " + createRes.error);
         setSaving(false);
         return;
      }
    }

    const updates = Object.keys(attendance).map(studentId => ({
      student_id: studentId,
      status: attendance[studentId].status,
      note: attendance[studentId].note
    }));

    const res = await saveBulkAttendance(targetSessionId, updates);
    if (res.success) {
      alert("Lưu điểm danh thành công!");
    } else {
      alert("Lỗi lưu điểm danh: " + res.error);
    }
    setSaving(false);
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;
    setSaving(true); 
    try {
      const dataUrl = await toPng(printRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipFonts: true // Tránh lỗi load font nếu có
      });
      const link = document.createElement("a");
      link.download = `Bao_cao_diem_danh_${className || 'Lop'}_${getTodayString()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi xuất ảnh! Vui lòng thử lại.");
    }
    setSaving(false);
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" /></div>;

  const todayStr = getTodayString();
  const hasTodaySession = sessions.some(s => s.session_date === todayStr);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar: Danh sách Buổi học */}
      <div className="w-full md:w-1/3 xl:w-1/4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-700">Lịch sử điểm danh</div>
          <div className="max-h-[600px] overflow-y-auto">
            
            {/* Nút ảo cho Hôm nay nếu chưa điểm danh */}
            {!hasTodaySession && (
               <div 
                  onClick={() => handleSelectSession("NEW_TODAY")}
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-colors flex justify-between items-center ${selectedSessionId === "NEW_TODAY" ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-gray-50'}`}
                >
                  <div>
                    <div className={`font-bold ${selectedSessionId === "NEW_TODAY" ? 'text-teal-700' : 'text-gray-800'}`}>Hôm nay</div>
                    <div className="text-sm text-amber-500 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle size={14} /> Chưa điểm danh
                    </div>
                  </div>
                </div>
            )}

            {sessions.length === 0 && hasTodaySession === false && (
               <div className="p-4 text-center text-gray-500 text-sm">Chưa có lịch sử điểm danh.</div>
            )}

            {sessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => handleSelectSession(session.id)}
                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors flex justify-between items-center group ${selectedSessionId === session.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-gray-50'}`}
              >
                <div>
                  <div className={`font-bold ${selectedSessionId === session.id ? 'text-teal-700' : 'text-gray-800'}`}>{session.title}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar size={14} /> {new Date(session.session_date).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id, session.title); }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Xóa dữ liệu điểm danh ngày này"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Điểm danh */}
      <div className="w-full md:w-2/3 xl:w-3/4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Check className="text-teal-600" /> 
              {selectedSessionId === "NEW_TODAY" ? "Điểm danh lớp (Hôm nay)" : "Cập nhật điểm danh"}
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportImage}
                disabled={saving}
                className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50 border border-indigo-100 shadow-sm"
              >
                <ImageIcon size={18} />
                Xuất ảnh báo cáo
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm shadow-teal-600/20"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Lưu lại
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">STT</th>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3 min-w-[320px]">Trạng thái</th>
                  <th className="px-4 py-3 w-1/4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enrollments.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">Lớp chưa có học sinh nào.</td></tr>
                ) : (
                  enrollments.map((en, idx) => {
                    const stId = en.profiles.id;
                    const stat = attendance[stId]?.status || 'PRESENT';
                    const note = attendance[stId]?.note || '';
                    
                    return (
                      <tr key={stId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-800">{en.profiles.full_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleStatusChange(stId, 'PRESENT')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border ${stat === 'PRESENT' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>CÓ MẶT</button>
                            <button onClick={() => handleStatusChange(stId, 'LATE')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border ${stat === 'LATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>ĐI TRỄ</button>
                            <button onClick={() => handleStatusChange(stId, 'EXCUSED_ABSENCE')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border ${stat === 'EXCUSED_ABSENCE' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>VẮNG CÓ PHÉP</button>
                            <button onClick={() => handleStatusChange(stId, 'UNEXCUSED_ABSENCE')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border ${stat === 'UNEXCUSED_ABSENCE' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>VẮNG K.PHÉP</button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            placeholder="Ghi chú..." 
                            value={note}
                            onChange={(e) => handleNoteChange(stId, e.target.value)}
                            className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* GIAO DIỆN BÁO CÁO ẨN ĐỂ XUẤT ẢNH */}
      <div className="fixed top-[200vh] left-0 pointer-events-none -z-50">
        <div ref={printRef} className="w-[850px] bg-white p-12 font-sans border-[16px] border-gray-800 rounded-[3rem] relative shadow-2xl">
          {/* Header */}
          <div className="text-center relative mb-12">
            <div className="absolute top-0 left-0 w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center -mt-4 -ml-4">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-black text-emerald-800 uppercase tracking-[0.2em] mb-4">
              BÁO CÁO ĐIỂM DANH
            </h1>
            <p className="text-xl font-bold text-gray-700 mb-2">Lớp: {className || 'Chưa cập nhật'}</p>
            <p className="text-lg text-gray-500 font-medium">Ngày học: {
              selectedSessionId === "NEW_TODAY" 
                ? new Date().toLocaleDateString('vi-VN') 
                : new Date(sessions.find(s => s.id === selectedSessionId)?.session_date || Date.now()).toLocaleDateString('vi-VN')
            }</p>
          </div>

          {/* Divider */}
          <div className="w-full h-0.5 bg-gradient-to-r from-emerald-100 via-emerald-300 to-emerald-100 mb-10 rounded-full"></div>

          {/* Content */}
          <div className="mb-8 min-h-[300px]">
            <h2 className="text-2xl font-bold text-rose-600 mb-8 flex items-center gap-3 border-l-8 border-rose-500 pl-4">
               Danh sách Học sinh vắng / trễ
            </h2>
            <div className="space-y-4">
              {enrollments.filter(en => ['LATE', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE'].includes(attendance[en.profiles.id]?.status)).length === 0 ? (
                <div className="p-8 bg-green-50 text-green-700 rounded-[2rem] border-2 border-green-100 text-center font-bold text-xl flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">🎉</div>
                  Tuyệt vời! Buổi học hôm nay tất cả học sinh đều đi học đầy đủ và đúng giờ!
                </div>
              ) : (
                enrollments.filter(en => ['LATE', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE'].includes(attendance[en.profiles.id]?.status)).map((en, index) => {
                  const stat = attendance[en.profiles.id]?.status;
                  const note = attendance[en.profiles.id]?.note;
                  return (
                    <div key={en.profiles.id} className="flex justify-between items-center p-5 bg-gray-50/80 border border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center font-black text-gray-400 shadow-sm shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-gray-800 text-xl">{en.profiles.full_name}</div>
                          {note && <div className="text-base text-gray-500 mt-1 italic text-justify pr-10">Ghi chú: {note}</div>}
                        </div>
                      </div>
                      <div className="shrink-0">
                         <span className={`px-6 py-2.5 text-sm font-bold rounded-full border whitespace-nowrap tracking-wide inline-block ${
                            stat === 'LATE' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm shadow-amber-100/50' : 
                            stat === 'EXCUSED_ABSENCE' ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm shadow-orange-100/50' : 
                            'bg-rose-50 text-rose-600 border-rose-200 shadow-sm shadow-rose-100/50'
                         }`}>
                           {stat === 'LATE' ? 'ĐI TRỄ' : stat === 'EXCUSED_ABSENCE' ? 'VẮNG (CÓ PHÉP)' : 'VẮNG (K.PHÉP)'}
                         </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-200 text-center text-gray-400 font-medium text-base italic">
            Hệ thống quản lý lớp Toán thầy Phúc.
          </div>
        </div>
      </div>

    </div>
  );
}
