"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Save, Loader2, Calendar, Check, AlertCircle, ImageIcon, Download, MessageSquare, X } from "lucide-react";
import { getSessions, createSession, deleteSession, getAttendance, saveBulkAttendance } from "./attendanceActions";
import { captureElement, downloadOrShare } from "@/utils/imageExport";

export default function AttendanceTab({ classId, enrollments, className }: { classId: string, enrollments: any[], className?: string }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<string, {status: string, note: string}>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");

  const getTodayString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
  };

  const currentSessionDate = selectedSessionId === "NEW_TODAY" 
    ? getTodayString() 
    : sessions.find(s => s.id === selectedSessionId)?.session_date || getTodayString();

  const filteredEnrollments = enrollments.filter(en => {
    if (!en.enrolled_at) return true;
    const enrollDateStr = en.enrolled_at.split('T')[0];
    return enrollDateStr <= currentSessionDate;
  });

  useEffect(() => {
    fetchSessions();
  }, [classId]);

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
        setSelectedSessionId("NEW_TODAY");
        initDefaultAttendance();
      }
    }
    setLoading(false);
  };

  const initDefaultAttendance = () => {
    const attMap: Record<string, {status: string, note: string}> = {};
    filteredEnrollments.forEach(en => {
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
    filteredEnrollments.forEach(en => {
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
      const dataUrl = await captureElement(printRef.current);
      const fileName = `Bao_cao_diem_danh_${className || 'Lop'}_${getTodayString()}.png`;
      await downloadOrShare(dataUrl, fileName);
    } catch (err: any) {
      console.error('Export image error:', err);
      alert(`Đã xảy ra lỗi khi xuất ảnh! Chi tiết: ${err.message || 'Unknown error'}`);
    }
    setSaving(false);
  };

  const setAllPresent = () => {
    const attMap = { ...attendance };
    filteredEnrollments.forEach(en => {
      attMap[en.profiles.id] = { ...attMap[en.profiles.id], status: 'PRESENT' };
    });
    setAttendance(attMap);
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" /></div>;

  const todayStr = getTodayString();
  const hasTodaySession = sessions.some(s => s.session_date === todayStr);

  const countPresent = filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'PRESENT').length;
  const countLate = filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'LATE').length;
  const countExcused = filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'EXCUSED_ABSENCE').length;
  const countUnexcused = filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'UNEXCUSED_ABSENCE').length;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar: Danh sách Buổi học */}
      <div className="w-full md:w-1/3 xl:w-1/4 order-2 md:order-1">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-700">Lịch sử điểm danh</div>
          <div className="max-h-[600px] overflow-y-auto">
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
                  title="Xóa dữ liệu"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Điểm danh (Mobile First) */}
      <div className="w-full md:w-2/3 xl:w-3/4 order-1 md:order-2">
        <div className="bg-white md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full -mx-4 md:mx-0">
          
          {/* Header Mobile: Thống kê Sĩ số ngang */}
          <div className="bg-[#18392b] text-white p-3 flex flex-wrap gap-2 justify-center text-xs sm:text-sm font-bold shadow-md z-10 sticky top-0">
            <div className="px-2.5 py-1.5 bg-gray-600/50 rounded-lg whitespace-nowrap">Sĩ số: {filteredEnrollments.length}</div>
            <div className="px-2.5 py-1.5 bg-emerald-600/80 rounded-lg whitespace-nowrap flex items-center gap-1">Có: {countPresent}</div>
            <div className="px-2.5 py-1.5 bg-amber-500/80 rounded-lg whitespace-nowrap flex items-center gap-1">Trễ: {countLate}</div>
            <div className="px-2.5 py-1.5 bg-orange-500/80 rounded-lg whitespace-nowrap flex items-center gap-1">Phép: {countExcused}</div>
            <div className="px-2.5 py-1.5 bg-rose-600/80 rounded-lg whitespace-nowrap flex items-center gap-1">Vắng: {countUnexcused}</div>
          </div>

          {/* Action Toolbar */}
          <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <button onClick={setAllPresent} className="px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors">
              <Check size={16} /> <span className="hidden sm:inline">Tất cả Có mặt</span><span className="sm:hidden">✓ Đủ</span>
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span className="hidden sm:inline">Lưu điểm danh</span><span className="sm:hidden">Lưu</span>
              </button>
              <button 
                onClick={handleExportImage}
                disabled={saving}
                className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-2 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
                title="Xuất ảnh báo cáo"
              >
                <ImageIcon size={20} />
              </button>
            </div>
          </div>
          
          {/* List Điểm danh (Thay thế Table) */}
          <div className="bg-white">
            <div className="flex px-4 py-2 text-xs font-bold text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <div className="w-8 text-center hidden sm:block">#</div>
              <div className="flex-1">Học sinh</div>
              <div className="w-[180px] text-center">Trạng thái</div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {filteredEnrollments.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-bold">Lớp chưa có học sinh trong thời điểm này.</div>
              ) : (
                filteredEnrollments.map((en, idx) => {
                  const stId = en.profiles.id;
                  const stat = attendance[stId]?.status || 'PRESENT';
                  const note = attendance[stId]?.note || '';
                  const isEditingNote = editingNoteId === stId;
                  
                  return (
                    <div key={stId} className="hover:bg-gray-50 transition-colors flex flex-col sm:flex-row items-stretch sm:items-center">
                      <div className="flex items-center flex-1 p-3">
                        <div className="w-8 text-center text-gray-400 font-medium text-sm hidden sm:block">{idx + 1}</div>
                        <div className="flex flex-col ml-1">
                          <span className="font-bold text-gray-800">{en.profiles.full_name}</span>
                          {stat === 'PRESENT' && <span className="text-xs text-emerald-600 font-medium">Có mặt</span>}
                          {stat === 'LATE' && <span className="text-xs text-amber-600 font-medium">Đi trễ</span>}
                          {stat === 'EXCUSED_ABSENCE' && <span className="text-xs text-orange-600 font-medium">Vắng có phép</span>}
                          {stat === 'UNEXCUSED_ABSENCE' && <span className="text-xs text-rose-600 font-medium">Vắng không phép</span>}
                          {note && !isEditingNote && <span className="text-xs text-gray-500 italic mt-0.5 line-clamp-1">Ghi chú: {note}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-1 px-4 pb-3 sm:pb-0 sm:py-3 w-full sm:w-[220px]">
                        <div className="flex gap-1.5 ml-auto sm:ml-0 border-l border-gray-100 pl-4 sm:border-0 sm:pl-0">
                          {/* Nút Có mặt */}
                          <button 
                            onClick={() => handleStatusChange(stId, 'PRESENT')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${stat === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm' : 'bg-white text-gray-300 border-gray-200 hover:border-emerald-300 hover:text-emerald-500'}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                          {/* Nút Đi trễ */}
                          <button 
                            onClick={() => handleStatusChange(stId, 'LATE')}
                            title="Đi trễ"
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${stat === 'LATE' ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm' : 'bg-white text-gray-300 border-gray-200 hover:border-amber-300 hover:text-amber-500'}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          </button>
                          {/* Nút Vắng Phép */}
                          <button 
                            onClick={() => handleStatusChange(stId, 'EXCUSED_ABSENCE')}
                            title="Vắng có phép"
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${stat === 'EXCUSED_ABSENCE' ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-sm' : 'bg-white text-gray-300 border-gray-200 hover:border-orange-300 hover:text-orange-500'}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          </button>
                          {/* Nút Vắng K.Phép */}
                          <button 
                            onClick={() => handleStatusChange(stId, 'UNEXCUSED_ABSENCE')}
                            title="Vắng không phép"
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${stat === 'UNEXCUSED_ABSENCE' ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm' : 'bg-white text-gray-300 border-gray-200 hover:border-rose-300 hover:text-rose-500'}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                          
                          {/* Nút Ghi chú */}
                          <button 
                            onClick={() => {
                              if (isEditingNote) {
                                setEditingNoteId(null);
                              } else {
                                setTempNote(note);
                                setEditingNoteId(stId);
                              }
                            }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ml-1 ${note || isEditingNote ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-300 border-gray-200 hover:border-blue-200 hover:text-blue-400'}`}
                          >
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Modal nhập Note (inline) */}
                      {isEditingNote && (
                        <div className="w-full px-4 pb-3 sm:px-4 sm:py-2 bg-blue-50/30 border-t border-blue-50 sm:border-0 sm:mt-0">
                          <div className="flex gap-2 items-center">
                            <input 
                              type="text" 
                              placeholder="Nhập ghi chú..." 
                              value={tempNote}
                              onChange={(e) => setTempNote(e.target.value)}
                              onBlur={() => { handleNoteChange(stId, tempNote); setEditingNoteId(null); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { handleNoteChange(stId, tempNote); setEditingNoteId(null); } }}
                              autoFocus
                              className="flex-1 text-sm px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                            />
                            <button onClick={() => { handleNoteChange(stId, tempNote); setEditingNoteId(null); }} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GIAO DIỆN BÁO CÁO ẨN ĐỂ XUẤT ẢNH (GIỮ NGUYÊN) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -50 }}>
        <div ref={printRef} className="w-[850px] bg-white p-0 font-sans border-0 relative">
          <div className="bg-emerald-500 rounded-[2rem] p-3 shadow-xl">
             <div className="bg-emerald-50 rounded-[1.5rem] p-8 border-4 border-white shadow-inner flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>
                
                <div className="flex flex-col items-center mb-8 relative z-10 w-full">
                   <div className="flex flex-col pb-4 mb-6 relative w-full items-center">
                      <div className="absolute bottom-0 w-2/3 h-[3px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full opacity-70"></div>
                      <h2 className="text-4xl font-black text-emerald-800 tracking-tight uppercase flex items-center gap-3">
                        <span className="text-emerald-400">✦</span>
                        <span>
                          <span className="text-red-600 text-5xl leading-none font-serif">T</span>OÁN
                          <span className="text-red-600 text-5xl leading-none font-serif ml-1">T</span>HẦY
                          <span className="text-red-600 text-5xl leading-none font-serif ml-1">P</span>HÚC
                        </span>
                        <span className="text-emerald-400">✦</span>
                      </h2>
                      <div className="text-xs text-emerald-700 tracking-[0.3em] font-bold mt-2 text-center whitespace-nowrap">NƠI KHƠI NGUỒN ĐAM MÊ</div>
                   </div>
                   
                   <div className="text-center">
                     <h1 className="text-5xl font-black text-teal-700 uppercase tracking-widest mb-4 drop-shadow-sm">
                       THÔNG BÁO ĐIỂM DANH
                     </h1>
                     <div className="flex items-center justify-center gap-4 text-xl font-bold text-gray-700 mb-4">
                       Ngày: {new Date(currentSessionDate).toLocaleDateString('vi-VN')}
                     </div>
                     <div className="inline-block bg-emerald-100 text-emerald-800 px-8 py-2.5 rounded-2xl font-black text-2xl uppercase shadow-sm border border-emerald-200">
                       Lớp: {className || 'Chưa cập nhật'}
                     </div>
                   </div>
                </div>

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
                        <td className="py-4 text-3xl font-black text-gray-800">{filteredEnrollments.length}</td>
                        <td className="py-4 text-3xl font-black text-teal-600">{filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'PRESENT').length}</td>
                        <td className="py-4 text-3xl font-black text-orange-500">{filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'EXCUSED_ABSENCE').length}</td>
                        <td className="py-4 text-3xl font-black text-rose-600">{filteredEnrollments.filter(en => attendance[en.profiles.id]?.status === 'UNEXCUSED_ABSENCE').length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

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
                      {filteredEnrollments.filter(en => ['LATE', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE'].includes(attendance[en.profiles.id]?.status)).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-emerald-600 font-bold text-lg bg-emerald-50/30">
                            🎉 Tuyệt vời! Buổi học hôm nay tất cả học sinh đều đi học đầy đủ và đúng giờ!
                          </td>
                        </tr>
                      ) : (
                        filteredEnrollments.filter(en => ['LATE', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE'].includes(attendance[en.profiles.id]?.status)).map((en, index) => {
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
