"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, DollarSign, CalendarDays, Download, CreditCard, Send, Edit, Save, ShieldAlert, ArrowRight, ImageIcon } from "lucide-react";
import { toPng, toBlob } from "html-to-image";
import { getTuitionFees, updateTuitionFee, rolloverDebt } from "./tuitionActions";

export default function TuitionTab({ classId, classInfo, enrollments }: { classId: string, classInfo: any, enrollments: any[] }) {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [tuitionData, setTuitionData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [exportingImage, setExportingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const printUnpaidRef = useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Rollover State
  const [rolling, setRolling] = useState(false);

  // Auto Deduct State
  const [teacherAbsent, setTeacherAbsent] = useState(0);
  const [standardSessions, setStandardSessions] = useState(classInfo?.sessions_per_month || 8);
  const [isApplyingDeduct, setIsApplyingDeduct] = useState(false);

  useEffect(() => {
    fetchTuition();
  }, [classId, month, year]);

  const fetchTuition = async () => {
    setLoading(true);
    const res = await getTuitionFees(classId, month, year);
    
    // Lấy dữ liệu tháng trước để kế thừa học phí cơ bản (nếu có học sinh đặc biệt)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const resPrev = await getTuitionFees(classId, prevMonth, prevYear);
    const prevMap: Record<string, any> = {};
    if (resPrev.success && resPrev.data) {
      resPrev.data.forEach((t: any) => {
        prevMap[t.student_id] = t;
      });
    }
    
    // Khởi tạo map
    const tMap: Record<string, any> = {};
    const defaultFee = classInfo?.tuition_fee || 0; // Giá trị học phí mặc định từ class

    if (res.success && res.data) {
      res.data.forEach((t: any) => {
        // FIX BUG: Nếu base_fee = 0 (do lỗi tạo tự động trước đó), tự sửa thành defaultFee hoặc kế thừa tháng trước
        if (!t.base_fee || t.base_fee === 0) {
           t.base_fee = prevMap[t.student_id]?.base_fee || defaultFee;
        }
        tMap[t.student_id] = t;
      });
    }
    
    // Áp dụng học phí mặc định nếu chưa có record
    enrollments.forEach(en => {
      const stId = en.profiles.id;
      if (!tMap[stId]) {
        const studentBaseFee = prevMap[stId]?.base_fee || defaultFee;
        tMap[stId] = { base_fee: studentBaseFee, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
      }
    });

    setTuitionData(tMap);
    setLoading(false);
  };

  const handleEditClick = (studentId: string, currentData: any, studentName: string) => {
    setEditingStudent({ id: studentId, name: studentName });
    setEditForm({
      base_fee: currentData.base_fee,
      old_debt: currentData.old_debt,
      discount: currentData.discount,
      paid_amount: currentData.paid_amount,
      status: currentData.status
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    const res = await updateTuitionFee(classId, editingStudent.id, month, year, editForm);
    if (res.success) {
      // Cập nhật lại state local
      setTuitionData({
        ...tuitionData,
        [editingStudent.id]: editForm
      });
      setIsEditModalOpen(false);
    } else {
      alert("Lỗi lưu dữ liệu: " + res.error);
    }
    setSavingEdit(false);
  };

  const toggleFullPayment = async (studentId: string) => {
    const current = tuitionData[studentId];
    const totalDue = current.base_fee + current.old_debt - current.discount;
    
    let newStatus = current.status === 'PAID' ? 'UNPAID' : 'PAID';
    let newPaid = newStatus === 'PAID' ? totalDue : 0;

    // Lập tức update UI để cảm giác mượt
    setTuitionData({
      ...tuitionData,
      [studentId]: { ...current, status: newStatus, paid_amount: newPaid }
    });

    await updateTuitionFee(classId, studentId, month, year, {
      base_fee: current.base_fee, // Giữ nguyên base_fee (sửa lỗi mất base_fee)
      old_debt: current.old_debt,
      discount: current.discount,
      status: newStatus,
      paid_amount: newPaid
    });
  };

  const handleRollover = async () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    if (!confirm(`Bạn có chắc muốn chốt sổ tháng ${month}/${year}? Các khoản chưa thanh toán sẽ được cộng dồn vào Nợ cũ của tháng ${nextMonth}/${nextYear}.`)) return;
    
    setRolling(true);
    const res = await rolloverDebt(classId, month, year, nextMonth, nextYear);
    if (res.success) {
      alert(`Đã chốt sổ thành công! Nợ cũ đã được đẩy sang tháng ${nextMonth}/${nextYear}.`);
      setMonth(nextMonth);
      setYear(nextYear);
    } else {
      alert("Lỗi chốt sổ: " + res.error);
    }
    setRolling(false);
  };

  const handleApplyDeduct = async () => {
    if (!confirm("Hệ thống sẽ tính toán lại mức Giảm trừ cho TẤT CẢ học sinh dựa trên số buổi thầy nghỉ và Ngày nhập học (nếu vào giữa tháng). Các mức giảm trừ cũ của tháng này sẽ bị ghi đè. Bạn có chắc chắn?")) return;
    
    setIsApplyingDeduct(true);
    const feePerSession = (classInfo?.tuition_fee || 0) / standardSessions;
    const currentMonthDays = new Date(year, month, 0).getDate();
    
    const newTuitionData = { ...tuitionData };
    
    for (const en of enrollments) {
      const stId = en.profiles.id;
      let missedBeforeEnrollment = 0;
      
      if (en.profiles.enrollment_date) {
        const enrollDate = new Date(en.profiles.enrollment_date);
        if (enrollDate.getMonth() + 1 === month && enrollDate.getFullYear() === year) {
          const dayEnrolled = enrollDate.getDate();
          missedBeforeEnrollment = Math.round((dayEnrolled - 1) / currentMonthDays * standardSessions);
        }
      }
      
      const totalMissed = teacherAbsent + missedBeforeEnrollment;
      const calculatedDiscount = Math.round(totalMissed * feePerSession);
      
      const current = newTuitionData[stId] || { base_fee: classInfo?.tuition_fee || 0, old_debt: 0, paid_amount: 0, status: 'UNPAID' };
      
      let newStatus = current.status;
      const totalDue = current.base_fee + current.old_debt - calculatedDiscount;
      if (current.paid_amount >= totalDue && totalDue > 0) newStatus = 'PAID';
      else if (current.paid_amount > 0) newStatus = 'PARTIAL';
      else newStatus = 'UNPAID';
      
      const updated = { ...current, discount: calculatedDiscount, status: newStatus };
      
      await updateTuitionFee(classId, stId, month, year, updated);
      
      newTuitionData[stId] = updated;
    }
    
    setTuitionData(newTuitionData);
    setIsApplyingDeduct(false);
    alert("Đã cập nhật giảm trừ thành công!");
  };

  const exportExcel = () => {
    import("xlsx").then((XLSX) => {
      const data = enrollments.map((en, idx) => {
        const stId = en.profiles.id;
        const t = tuitionData[stId] || { base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
        return {
          "STT": idx + 1,
          "Họ và tên": en.profiles.full_name,
          "Trường/Lớp": en.profiles.school || "",
          "Phụ huynh": en.profiles.parent_name ? `${en.profiles.parent_name} (${en.profiles.parent_phone})` : "",
          "Học phí": t.base_fee,
          "Nợ cũ": t.old_debt,
          "Giảm trừ": t.discount,
          "Cần thu": t.base_fee + t.old_debt - t.discount,
          "Thực thu": t.paid_amount,
          "Còn thiếu": (t.base_fee + t.old_debt - t.discount) - t.paid_amount,
          "Trạng thái": t.status === 'PAID' ? 'Đã thu' : t.status === 'PARTIAL' ? 'Thu 1 phần' : 'Chưa thu'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Học Phí");
      
      worksheet['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 30 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }
      ];

      XLSX.writeFile(workbook, `HocPhi_Thang_${month}_${year}_Lop_${classInfo?.name}.xlsx`);
    });
  };

  const exportImage = async () => {
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
      link.download = `Bao_cao_hoc_phi_Thang_${month}_${year}_Lop_${classInfo?.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi xuất ảnh! Vui lòng thử lại.");
    }
    setExportingImage(false);
  };

  const exportUnpaidImage = async () => {
    if (!printUnpaidRef.current) return;
    setExportingImage(true); 
    try {
      const dataUrl = await toPng(printUnpaidRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipFonts: true
      });
      const link = document.createElement("a");
      link.download = `Chua_nop_Thang_${month}_${year}_Lop_${classInfo?.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi xuất ảnh! Vui lòng thử lại.");
    }
    setExportingImage(false);
  };

  const [sendingZaloId, setSendingZaloId] = useState<string | null>(null);

  const sendZalo = async (student: any, tuition: any) => {
    if (!student.parent_phone) {
      alert("Học sinh này chưa có số điện thoại Phụ huynh để nhắn Zalo.");
      return;
    }
    
    setSendingZaloId(student.id);
    
    const element = document.getElementById(`print-tuition-${student.id}`);
    if (!element) {
      alert("Không tìm thấy giao diện xuất ảnh!");
      setSendingZaloId(null);
      return;
    }

    try {
      const blob = await toBlob(element, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipFonts: true
      });
      
      if (!blob) throw new Error("Không tạo được ảnh");
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      const rawPhone = String(student.parent_phone).replace(/[^0-9]/g, '');
      
      // Sử dụng Deep link để mở trực tiếp Zalo PC, bỏ qua tab web trung gian
      window.location.href = `zalo://conversation?phone=${rawPhone}`;
      
    } catch (err) {
      console.error(err);
      alert("Lỗi khi copy ảnh vào bộ nhớ tạm. Trình duyệt của bạn có thể chưa cấp quyền hoặc không hỗ trợ chức năng này.");
    }
    
    setSendingZaloId(null);
  };

  if (loading && Object.keys(tuitionData).length === 0) return <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" /></div>;

  let totalExpected = 0;
  let totalCollected = 0;
  enrollments.forEach(en => {
    const t = tuitionData[en.profiles.id];
    if (t) {
      totalExpected += (t.base_fee + t.old_debt - t.discount);
      totalCollected += t.paid_amount;
    }
  });

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <CalendarDays className="text-teal-600 ml-2 w-5 h-5" />
            <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="bg-transparent font-bold text-gray-800 outline-none pl-2 pr-4 py-1 appearance-none cursor-pointer">
              {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <span className="text-gray-300">/</span>
            <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-20 bg-transparent font-bold text-gray-800 outline-none px-2 py-1" />
          </div>

          <div className="bg-orange-50 p-2 rounded-xl border border-orange-100 flex items-center gap-3">
            <div className="flex items-center gap-2 px-2">
              <label className="text-sm font-bold text-orange-800">Số buổi/tháng:</label>
              <input type="number" value={standardSessions} onChange={e=>setStandardSessions(Number(e.target.value))} className="w-12 px-1 py-0.5 rounded border border-orange-200 text-center font-bold outline-none text-orange-900 bg-white" />
            </div>
            <div className="w-px h-6 bg-orange-200"></div>
            <div className="flex items-center gap-2 px-2">
              <label className="text-sm font-bold text-orange-800">Thầy nghỉ:</label>
              <input type="number" value={teacherAbsent} onChange={e=>setTeacherAbsent(Number(e.target.value))} className="w-12 px-1 py-0.5 rounded border border-orange-200 text-center font-bold outline-none text-orange-900 bg-white" />
            </div>
            <button onClick={handleApplyDeduct} disabled={isApplyingDeduct} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50">
              {isApplyingDeduct ? <Loader2 size={14} className="animate-spin" /> : "Tự động trừ phí"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={exportImage} disabled={exportingImage} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-colors">
            {exportingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />} Xuất ảnh
          </button>
          <button onClick={exportUnpaidImage} disabled={exportingImage} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl font-bold hover:bg-rose-100 transition-colors">
            {exportingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />} Ảnh chưa nộp
          </button>
          <button onClick={exportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-colors">
            <Download size={18} /> Xuất Excel
          </button>
          <button onClick={handleRollover} disabled={rolling} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl font-bold hover:bg-rose-100 transition-colors">
            {rolling ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
            Chốt sổ chuyển nợ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-teal-500">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Sĩ số đóng phí</div>
          <div className="text-2xl font-black text-gray-800">{enrollments.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng Cần Thu</div>
          <div className="text-2xl font-black text-blue-600">{totalExpected.toLocaleString('vi-VN')} đ</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Thực Thu</div>
          <div className="text-2xl font-black text-green-600">{totalCollected.toLocaleString('vi-VN')} đ</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Còn Thiếu</div>
          <div className="text-2xl font-black text-orange-600">{(totalExpected - totalCollected).toLocaleString('vi-VN')} đ</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-4 w-10 text-center">STT</th>
                <th className="px-5 py-4 min-w-[200px]">Học sinh / Phụ huynh</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Học phí</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Nợ cũ</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Giảm trừ</th>
                <th className="px-5 py-4 text-right whitespace-nowrap text-teal-700 bg-teal-50/50">Cần thu</th>
                <th className="px-5 py-4 text-center">Trạng thái / Nhắc phí</th>
                <th className="px-5 py-4 text-right">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {enrollments.map((en, idx) => {
                const stId = en.profiles.id;
                const t = tuitionData[stId] || { base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
                const totalDue = t.base_fee + t.old_debt - t.discount;
                
                return (
                  <tr key={stId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4 text-center font-medium text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-800">{en.profiles.full_name}</div>
                      {en.profiles.parent_name && <div className="text-xs text-gray-500 mt-0.5">PH: {en.profiles.parent_name} ({en.profiles.parent_phone})</div>}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-600">{t.base_fee.toLocaleString('vi-VN')}</td>
                    <td className="px-5 py-4 text-right text-rose-500 font-medium">{t.old_debt > 0 ? t.old_debt.toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-5 py-4 text-right text-orange-500 font-medium">{t.discount > 0 ? t.discount.toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-5 py-4 text-right font-black text-teal-700 bg-teal-50/30">{totalDue.toLocaleString('vi-VN')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer" title="Đánh dấu đã thu đủ">
                          <input type="checkbox" className="sr-only peer" checked={t.status === 'PAID'} onChange={() => toggleFullPayment(stId)} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                        {t.status === 'PARTIAL' && <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">Thu lẻ: {t.paid_amount.toLocaleString()}đ</span>}
                        
                        <button onClick={() => sendZalo(en.profiles, t)} disabled={sendingZaloId === stId} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Nhắn Zalo kèm ảnh">
                          {sendingZaloId === stId ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleEditClick(stId, t, en.profiles.full_name)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Cập nhật Học phí</h3>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="text-center font-bold text-teal-600 mb-2">{editingStudent?.name}</div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Học phí cơ bản</label>
                <input type="number" value={editForm.base_fee} onChange={e=>setEditForm({...editForm, base_fee: Number(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nợ cũ</label>
                  <input type="number" value={editForm.old_debt} onChange={e=>setEditForm({...editForm, old_debt: Number(e.target.value)})} className="w-full px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Giảm trừ</label>
                  <input type="number" value={editForm.discount} onChange={e=>setEditForm({...editForm, discount: Number(e.target.value)})} className="w-full px-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl font-bold" />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between font-bold text-gray-800 mb-2">
                  <span>Cần thu:</span>
                  <span className="text-teal-600">{(editForm.base_fee + editForm.old_debt - editForm.discount).toLocaleString('vi-VN')} đ</span>
                </div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Phụ huynh đóng thực tế (Thu lẻ)</label>
                <input 
                  type="number" 
                  value={editForm.paid_amount} 
                  onChange={e=> {
                    const paid = Number(e.target.value);
                    const total = editForm.base_fee + editForm.old_debt - editForm.discount;
                    let status = 'UNPAID';
                    if (paid >= total && total > 0) status = 'PAID';
                    else if (paid > 0) status = 'PARTIAL';
                    setEditForm({...editForm, paid_amount: paid, status});
                  }} 
                  className="w-full px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-lg" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsEditModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Hủy</button>
                <button type="submit" disabled={savingEdit} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-xl flex items-center gap-2">
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIAO DIỆN BÁO CÁO ẨN ĐỂ XUẤT ẢNH */}
      <div className="fixed top-[200vh] left-0 pointer-events-none -z-50">
        <div ref={printRef} className="w-[850px] bg-white p-0 font-sans border-0 relative">
          <div className="bg-orange-500 rounded-[2rem] p-3 shadow-xl">
             <div className="bg-orange-50 rounded-[1.5rem] p-8 border-4 border-white shadow-inner flex flex-col h-full relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>
                
                {/* Header Top: Logo & Title */}
                <div className="flex flex-col items-center mb-6 relative z-10 w-full">
                   {/* Logo Text */}
                   <div className="flex flex-col pb-3 mb-4 relative w-full items-center">
                      <div className="absolute bottom-0 w-2/3 h-[3px] bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full opacity-70"></div>
                      <h2 className="text-4xl font-black text-orange-800 tracking-tight uppercase flex items-center gap-3">
                        <span className="text-orange-400">✦</span>
                        <span>
                          <span className="text-red-600 text-5xl leading-none font-serif">T</span>OÁN
                          <span className="text-red-600 text-5xl leading-none font-serif ml-1">T</span>HẦY
                          <span className="text-red-600 text-5xl leading-none font-serif ml-1">P</span>HÚC
                        </span>
                        <span className="text-orange-400">✦</span>
                      </h2>
                      <div className="text-xs text-orange-700 tracking-[0.3em] font-bold mt-2 text-center whitespace-nowrap">NƠI KHƠI NGUỒN ĐAM MÊ</div>
                   </div>
                   
                   {/* Title & Info - Separated clearly */}
                   <div className="text-center mt-2">
                     <h1 className="text-3xl font-black text-gray-800 uppercase tracking-wider mb-4 whitespace-nowrap">
                       THÔNG BÁO HỌC PHÍ
                     </h1>
                     <div className="text-lg font-bold text-gray-500 mb-3">
                       Tháng {month}/{year}
                     </div>
                     <div className="inline-block bg-blue-100 text-blue-800 px-8 py-2.5 rounded-2xl font-black text-2xl uppercase shadow-sm border border-blue-200">
                       Lớp: {classInfo?.name || 'Chưa cập nhật'}
                     </div>
                   </div>
                </div>

                {/* Divider */}
                <div className="w-full h-0.5 bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100 mb-6 rounded-full"></div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 mb-8 overflow-hidden relative z-10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs w-20 text-center">STT</th>
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs">Học Sinh</th>
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs text-right w-40">Số Tiền</th>
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs w-48 text-center">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enrollments.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-500">Chưa có học sinh</td></tr>
                      ) : (
                        enrollments.map((en, idx) => {
                          const stId = en.profiles.id;
                          const t = tuitionData[stId] || { base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
                          const totalDue = t.base_fee + t.old_debt - t.discount;
                          return (
                            <tr key={stId} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-5 px-6 text-center font-bold text-gray-500">{idx + 1}</td>
                              <td className="py-5 px-6">
                                <div className="font-bold text-gray-800 text-lg uppercase">{en.profiles.full_name}</div>
                                <div className="text-sm font-bold text-blue-700 mt-1 uppercase">{classInfo?.name || ''}</div>
                              </td>
                              <td className="py-5 px-6 text-right font-black text-gray-800 text-lg">
                                {totalDue.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-5 px-6 text-center">
                                 <span className={`px-4 py-2 text-sm font-bold rounded-full border whitespace-nowrap inline-block ${
                                    t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                    t.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                    'bg-rose-100 text-rose-700 border-rose-200'
                                 }`}>
                                   {t.status === 'PAID' ? 'ĐÃ THU' : t.status === 'PARTIAL' ? 'THU 1 PHẦN' : 'CHƯA THU'}
                                 </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* THÔNG TIN CHUYỂN KHOẢN */}
                <div className="bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-3xl p-6 flex items-center justify-between relative z-10 shadow-sm mt-auto mb-4 mx-2">
                   <div className="flex-1 pr-6">
                     <h3 className="text-2xl font-black text-blue-800 uppercase tracking-widest mb-6">Thông Tin Chuyển Khoản</h3>
                     <div className="space-y-4 text-xl font-bold text-gray-700">
                       <p>Ngân hàng: <span className="text-blue-700">MBBank</span></p>
                       <p>Số tài khoản: <span className="text-blue-700 tracking-widest text-2xl">0793898911</span></p>
                       <p>Chủ TK: <span className="text-blue-700 uppercase">TRỊNH NGỌC PHÚC</span></p>
                     </div>
                     <div className="mt-6 bg-orange-100 text-orange-800 px-5 py-3 rounded-xl font-bold border border-orange-200 text-sm shadow-sm inline-block">
                       ⚠️ PH chuyển khoản nhớ <b>CHỤP BILL</b> gửi lại để tránh nhầm lẫn nhé ạ.
                     </div>
                   </div>
                   
                   <div className="shrink-0 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm w-48 flex items-center justify-center flex-col">
                     <div className="text-rose-600 font-bold text-sm mb-2 uppercase">VietQR</div>
                     <img src="https://img.vietqr.io/image/MB-0793898911-compact2.png?amount=0&addInfo=Hoc%20phi" alt="QR Code" crossOrigin="anonymous" className="w-full h-full object-contain rounded-xl" />
                   </div>
                </div>

             </div>
          </div>
        </div>
      </div>

      {/* GIAO DIỆN BÁO CÁO ẨN: CHỈ HỌC SINH CHƯA NỘP */}
      <div className="fixed top-[200vh] left-[200vw] pointer-events-none -z-50">
        <div ref={printUnpaidRef} className="w-[850px] bg-white p-0 font-sans border-0 relative">
          <div className="bg-rose-500 rounded-[2rem] p-3 shadow-xl">
             <div className="bg-rose-50 rounded-[1.5rem] p-8 border-4 border-white shadow-inner flex flex-col h-full relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>
                
                {/* Header */}
                <div className="flex flex-col items-center mb-6 relative z-10 w-full">
                   <div className="flex flex-col pb-3 mb-4 relative w-full items-center">
                      <div className="absolute bottom-0 w-2/3 h-[3px] bg-gradient-to-r from-transparent via-rose-500 to-transparent rounded-full opacity-70"></div>
                      <h2 className="text-4xl font-black text-rose-800 tracking-tight uppercase flex items-center gap-3">
                        <span className="text-rose-400">✦</span>
                        <span>
                          <span className="text-red-600 text-5xl leading-none font-serif">T</span>OÁN
                          <span className="text-red-600 text-5xl leading-none font-serif ml-1">T</span>HẦY
                          <span className="text-red-600 text-5xl leading-none font-serif ml-1">P</span>HÚC
                        </span>
                        <span className="text-rose-400">✦</span>
                      </h2>
                      <div className="text-xs text-rose-700 tracking-[0.3em] font-bold mt-2 text-center whitespace-nowrap">NƠI KHƠI NGUỒN ĐAM MÊ</div>
                   </div>
                   <div className="text-center mt-2">
                     <h1 className="text-3xl font-black text-gray-800 uppercase tracking-wider mb-4 whitespace-nowrap">
                       THÔNG BÁO HỌC PHÍ
                     </h1>
                     <div className="text-lg font-bold text-gray-500 mb-3">
                       Tháng {month}/{year}
                     </div>
                     <div className="inline-block bg-rose-100 text-rose-800 px-8 py-2.5 rounded-2xl font-black text-2xl uppercase shadow-sm border border-rose-200">
                       Lớp: {classInfo?.name || 'Chưa cập nhật'}
                     </div>
                   </div>
                </div>

                <div className="w-full h-0.5 bg-gradient-to-r from-rose-100 via-rose-300 to-rose-100 mb-6 rounded-full"></div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-rose-100 mb-8 overflow-hidden relative z-10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs w-20 text-center">STT</th>
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs">Học Sinh</th>
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs text-right w-40">Số Tiền</th>
                        <th className="py-4 px-6 text-gray-500 font-bold uppercase text-xs w-48 text-center">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const unpaidStudents = enrollments.filter(en => {
                          const t = tuitionData[en.profiles.id];
                          return !t || t.status !== 'PAID';
                        });
                        if (unpaidStudents.length === 0) {
                          return <tr><td colSpan={4} className="py-8 text-center text-emerald-600 font-bold text-lg">🎉 Tất cả học sinh đã nộp đủ!</td></tr>;
                        }
                        return unpaidStudents.map((en, idx) => {
                          const stId = en.profiles.id;
                          const t = tuitionData[stId] || { base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
                          const totalDue = t.base_fee + t.old_debt - t.discount;
                          const remaining = totalDue - t.paid_amount;
                          return (
                            <tr key={stId} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-5 px-6 text-center font-bold text-gray-500">{idx + 1}</td>
                              <td className="py-5 px-6">
                                <div className="font-bold text-gray-800 text-lg uppercase">{en.profiles.full_name}</div>
                                <div className="text-sm font-bold text-blue-700 mt-1 uppercase">{classInfo?.name || ''}</div>
                              </td>
                              <td className="py-5 px-6 text-right font-black text-rose-600 text-lg">
                                {remaining.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-5 px-6 text-center">
                                 <span className={`px-4 py-2 text-sm font-bold rounded-full border whitespace-nowrap inline-block ${
                                    t.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                    'bg-rose-100 text-rose-700 border-rose-200'
                                 }`}>
                                   {t.status === 'PARTIAL' ? 'THU 1 PHẦN' : 'CHƯA THU'}
                                 </span>
                              </td>
                            </tr>
                          )
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* THÔNG TIN CHUYỂN KHOẢN */}
                <div className="bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-3xl p-6 flex items-center justify-between relative z-10 shadow-sm mt-auto mb-4 mx-2">
                   <div className="flex-1 pr-6">
                     <h3 className="text-2xl font-black text-blue-800 uppercase tracking-widest mb-6">Thông Tin Chuyển Khoản</h3>
                     <div className="space-y-4 text-xl font-bold text-gray-700">
                       <p>Ngân hàng: <span className="text-blue-700">MBBank</span></p>
                       <p>Số tài khoản: <span className="text-blue-700 tracking-widest text-2xl">0793898911</span></p>
                       <p>Chủ TK: <span className="text-blue-700 uppercase">TRỊNH NGỌC PHÚC</span></p>
                     </div>
                     <div className="mt-6 bg-orange-100 text-orange-800 px-5 py-3 rounded-xl font-bold border border-orange-200 text-sm shadow-sm inline-block">
                       ⚠️ PH chuyển khoản nhớ <b>CHỤP BILL</b> gửi lại để tránh nhầm lẫn nhé ạ.
                     </div>
                   </div>
                   
                   <div className="shrink-0 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm w-48 flex items-center justify-center flex-col">
                     <div className="text-rose-600 font-bold text-sm mb-2 uppercase">VietQR</div>
                     <img src="https://img.vietqr.io/image/MB-0793898911-compact2.png?amount=0&addInfo=Hoc%20phi" alt="QR Code" crossOrigin="anonymous" className="w-full h-full object-contain rounded-xl" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* KHỐI ẨN: GIAO DIỆN BÁO CÁO CÁ NHÂN TỪNG HỌC SINH */}
      <div className="fixed top-[300vh] left-0 pointer-events-none -z-50 opacity-0">
        {enrollments.map((en, idx) => {
          const stId = en.profiles.id;
          const t = tuitionData[stId] || { base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
          const totalDue = t.base_fee + t.old_debt - t.discount;
          
          return (
            <div key={`print-${stId}`} id={`print-tuition-${stId}`} className="w-[500px] bg-white p-0 font-sans border-0 relative mb-10">
              <div className="bg-orange-500 rounded-3xl p-2 shadow-xl">
                 <div className="bg-orange-50 rounded-[1.2rem] p-6 border-4 border-white shadow-inner flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-200/50 rounded-full mix-blend-multiply filter blur-2xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-200/50 rounded-full mix-blend-multiply filter blur-2xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>
                    
                    <div className="flex flex-col items-center mb-6 relative z-10 w-full">
                       <div className="flex flex-col pb-3 mb-4 w-full items-center relative">
                          <div className="absolute bottom-0 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full opacity-70"></div>
                          <h2 className="text-2xl font-black text-orange-800 tracking-tight uppercase whitespace-nowrap flex items-center gap-2">
                            <span className="text-orange-400">✦</span>
                            <span>
                              <span className="text-red-600 text-3xl leading-none font-serif">T</span>OÁN
                              <span className="text-red-600 text-3xl leading-none font-serif ml-1">T</span>HẦY
                              <span className="text-red-600 text-3xl leading-none font-serif ml-1">P</span>HÚC
                            </span>
                            <span className="text-orange-400">✦</span>
                          </h2>
                          <div className="text-[9px] text-orange-700 tracking-[0.2em] font-bold mt-1.5 text-center whitespace-nowrap">NƠI KHƠI NGUỒN ĐAM MÊ</div>
                       </div>
                       <div className="text-center w-full">
                         <h1 className="text-2xl sm:text-3xl font-black text-orange-600 uppercase tracking-wider mb-2 drop-shadow-sm whitespace-nowrap">
                           THÔNG BÁO HỌC PHÍ
                         </h1>
                         <div className="flex items-center justify-center gap-2 text-base font-bold text-gray-700 mb-2">
                           Tháng {month}/{year}
                         </div>
                       </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 mb-6 p-5 relative z-10">
                      <div className="text-center mb-4">
                         <div className="text-sm font-bold text-gray-500 uppercase">Học sinh</div>
                         <div className="text-xl font-black text-gray-800 uppercase">{en.profiles.full_name}</div>
                         <div className="text-xs font-bold text-blue-700 mt-1 uppercase">{classInfo?.name || ''}</div>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-gray-500 font-medium text-sm">Học phí cơ bản</span>
                            <span className="font-bold text-gray-700">{t.base_fee.toLocaleString('vi-VN')} đ</span>
                         </div>
                         {t.old_debt > 0 && (
                           <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                              <span className="text-gray-500 font-medium text-sm">Nợ cũ</span>
                              <span className="font-bold text-rose-600">{t.old_debt.toLocaleString('vi-VN')} đ</span>
                           </div>
                         )}
                         {t.discount > 0 && (
                           <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                              <span className="text-gray-500 font-medium text-sm">Giảm trừ</span>
                              <span className="font-bold text-orange-600">-{t.discount.toLocaleString('vi-VN')} đ</span>
                           </div>
                         )}
                         <div className="flex justify-between items-center pt-2">
                            <span className="text-gray-800 font-black uppercase">Cần thanh toán</span>
                            <span className="font-black text-orange-700 text-2xl">{totalDue.toLocaleString('vi-VN')} đ</span>
                         </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-2xl p-4 flex flex-col items-center relative z-10 shadow-sm mt-auto mb-2">
                       <h3 className="text-lg font-black text-blue-800 uppercase tracking-widest mb-3">Thông Tin Chuyển Khoản</h3>
                       <div className="shrink-0 bg-white border border-gray-200 rounded-xl p-2 shadow-sm w-36 mb-4 flex items-center justify-center flex-col">
                         <div className="text-rose-600 font-bold text-[10px] mb-1 uppercase">VietQR</div>
                         <img src={`https://img.vietqr.io/image/MB-0793898911-compact2.png?amount=${totalDue}&addInfo=Hoc%20phi%20${en.profiles.full_name.replace(/ /g, '%20')}`} alt="QR Code" crossOrigin="anonymous" className="w-full object-contain rounded-lg" />
                       </div>
                       <div className="space-y-1 text-sm font-bold text-gray-700 text-center mb-3">
                         <p>Ngân hàng: <span className="text-blue-700">MBBank</span></p>
                         <p>Số tài khoản: <span className="text-blue-700 tracking-widest text-lg">0793898911</span></p>
                         <p>Chủ TK: <span className="text-blue-700 uppercase">TRỊNH NGỌC PHÚC</span></p>
                       </div>
                       <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg font-bold border border-orange-200 text-[11px] shadow-sm text-center">
                         ⚠️ Nhớ <b>CHỤP BILL</b> gửi lại để thầy tránh nhầm lẫn nhé.
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
