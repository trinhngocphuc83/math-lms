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
        <div ref={printRef} className="w-[850px] bg-white p-0 font-sans border-0 relative">
          <div className="bg-emerald-500 rounded-[2rem] p-3 shadow-xl">
             <div className="bg-emerald-50 rounded-[1.5rem] p-8 border-4 border-white shadow-inner flex flex-col h-full relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>
                
                {/* Header Top: Logo & Title */}
                <div className="flex flex-col items-center mb-8 relative z-10">
                   {/* Logo Text */}
                   <div className="flex flex-col border-b-2 border-emerald-600 pb-2 mb-6">
                      <h2 className="text-4xl font-black text-emerald-800 tracking-tight uppercase">
                        <span className="text-red-600 text-5xl leading-none font-serif">T</span>OÁN
                        <span className="text-red-600 text-5xl leading-none font-serif ml-1">T</span>HẦY
                        <span className="text-red-600 text-5xl leading-none font-serif ml-1">P</span>HÚC
                      </h2>
                      <div className="text-xs text-emerald-700 tracking-[0.3em] font-bold mt-1 text-center">NƠI KHƠI NGUỒN ĐAM MÊ</div>
                   </div>
                   
                   {/* Title & Info */}
                   <div className="text-center">
                     <h1 className="text-5xl font-black text-teal-700 uppercase tracking-widest mb-4 drop-shadow-sm">
                       THÔNG BÁO ĐIỂM DANH
                     </h1>
                     <div className="flex items-center justify-center gap-4 text-xl font-bold text-gray-700 mb-4">
                       Ngày: {
                         selectedSessionId === "NEW_TODAY" 
                           ? new Date().toLocaleDateString('vi-VN') 
                           : new Date(sessions.find(s => s.id === selectedSessionId)?.session_date || Date.now()).toLocaleDateString('vi-VN')
                       }
                     </div>
                     <div className="inline-block bg-emerald-100 text-emerald-800 px-8 py-2.5 rounded-2xl font-black text-2xl uppercase shadow-sm border border-emerald-200">
                       Lớp: {className || 'Chưa cập nhật'}
                     </div>
                   </div>
                </div>

                {/* Summary Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 mb-6 overflow-hidden relative z-10">
                  <table className="w-full text-center">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="py-3 text-gray-500 font-bold uppercase text-xs w-1/4">Sĩ Số</th>
                        <th className="py-3 text-gray-500 font-bold uppercase text-xs w-1/4">Có Mặt</th>
                        <th className="py-3 text-gray-500 font-bold uppercase text-xs w-1/4">Có Phép</th>
                        <th className="py-3 text-gray-500 font-bold uppercase text-xs w-1/4">Không Phép</th>
                      </tr>
                    </thead>
                    <tbody className="divide-x divide-gray-100 border-t border-gray-100">
                      <tr>
                        <td className="py-4 text-3xl font-black text-gray-800">{enrollments.length}</td>
                        <td className="py-4 text-3xl font-black text-teal-600">{enrollments.filter(en => attendance[en.profiles.id]?.status === 'PRESENT').length}</td>
                        <td className="py-4 text-3xl font-black text-orange-500">{enrollments.filter(en => attendance[en.profiles.id]?.status === 'EXCUSED_ABSENCE').length}</td>
                        <td className="py-4 text-3xl font-black text-rose-600">{enrollments.filter(en => attendance[en.profiles.id]?.status === 'UNEXCUSED_ABSENCE').length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Student List */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden relative z-10 mb-6">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="py-3 px-6 text-gray-500 font-bold uppercase text-xs w-20 text-center">STT</th>
                        <th className="py-3 px-6 text-gray-500 font-bold uppercase text-xs">Học Sinh</th>
                        <th className="py-3 px-6 text-gray-500 font-bold uppercase text-xs w-48 text-center">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enrollments.filter(en => ['LATE', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE'].includes(attendance[en.profiles.id]?.status)).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-emerald-600 font-bold text-lg bg-emerald-50/30">
                            🎉 Tuyệt vời! Buổi học hôm nay tất cả học sinh đều đi học đầy đủ và đúng giờ!
                          </td>
                        </tr>
                      ) : (
                        enrollments.filter(en => ['LATE', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE'].includes(attendance[en.profiles.id]?.status)).map((en, index) => {
                          const stat = attendance[en.profiles.id]?.status;
                          const note = attendance[en.profiles.id]?.note;
                          return (
                            <tr key={en.profiles.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-6 text-center font-bold text-gray-500">{index + 1}</td>
                              <td className="py-4 px-6">
                                <div className="font-bold text-gray-800 text-lg uppercase">{en.profiles.full_name}</div>
                                {note && (
                                  <div className="text-sm text-gray-500 italic mt-1 pr-4 text-justify">Ghi chú: {note}</div>
                                )}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`px-4 py-2 text-sm font-bold rounded-full border whitespace-nowrap inline-block ${
                                    stat === 'LATE' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                    stat === 'EXCUSED_ABSENCE' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                    'bg-rose-100 text-rose-700 border-rose-200'
                                }`}>
                                  {stat === 'LATE' ? 'ĐI TRỄ' : stat === 'EXCUSED_ABSENCE' ? 'VẮNG (CÓ PHÉP)' : 'VẮNG (KHÔNG PHÉP)'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 font-medium text-sm italic relative z-10 mt-auto pt-4">
                  Trân trọng thông báo đến quý phụ huynh để nắm bắt tình hình học tập của con em.
                </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
