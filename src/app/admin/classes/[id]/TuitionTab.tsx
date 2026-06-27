"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, DollarSign, CalendarDays, Download, CreditCard, Send, Edit, Save, ShieldAlert, ArrowRight, ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";
import { getTuitionFees, updateTuitionFee, rolloverDebt } from "./tuitionActions";

export default function TuitionTab({ classId, classInfo, enrollments }: { classId: string, classInfo: any, enrollments: any[] }) {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [tuitionData, setTuitionData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [exportingImage, setExportingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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
    
    // Khởi tạo map
    const tMap: Record<string, any> = {};
    const defaultFee = classInfo?.tuition_fee || 0; // Giá trị học phí mặc định từ class

    if (res.success && res.data) {
      res.data.forEach((t: any) => {
        tMap[t.student_id] = t;
      });
    }
    
    // Áp dụng học phí mặc định nếu chưa có record
    enrollments.forEach(en => {
      const stId = en.profiles.id;
      if (!tMap[stId]) {
        tMap[stId] = { base_fee: defaultFee, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
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
      const updated = { ...current, discount: calculatedDiscount };
      
      let newStatus = updated.status;
      const totalDue = updated.base_fee + updated.old_debt - updated.discount;
      if (updated.paid_amount >= totalDue && totalDue > 0) newStatus = 'PAID';
      else if (updated.paid_amount > 0) newStatus = 'PARTIAL';
      else newStatus = 'UNPAID';
      
      updated.status = newStatus;
      
      await updateTuitionFee(classId, stId, month, year, {
        discount: calculatedDiscount,
        status: newStatus
      });
      
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

  const sendZalo = (student: any, tuition: any) => {
    if (!student.parent_phone) {
      alert("Học sinh này chưa có số điện thoại Phụ huynh để nhắn Zalo.");
      return;
    }
    const totalDue = tuition.base_fee + tuition.old_debt - tuition.discount;
    const msg = `🌟 THÔNG BÁO HỌC PHÍ THÁNG ${month}/${year} 🌟\n\nKính gửi Phụ huynh em: ${student.full_name}\n\nXin thông báo học phí tháng ${month} của em là:\n💰 Số tiền cần đóng: ${totalDue.toLocaleString('vi-VN')} VNĐ\n(Học phí: ${tuition.base_fee.toLocaleString()}đ | Nợ cũ: ${tuition.old_debt.toLocaleString()}đ | Giảm trừ: ${tuition.discount.toLocaleString()}đ)\n\nPhụ huynh vui lòng hoàn thành qua chuyển khoản:\n🏦 Ngân hàng: MBbank\n💳 Số tài khoản: 0793898911\n📝 Nội dung: ${student.full_name} hoc phi T${month}\n\nTrân trọng cảm ơn!`;
    const rawPhone = String(student.parent_phone).replace(/[^0-9]/g, '');
    navigator.clipboard.writeText(msg).then(() => {
      alert("Đã copy tin nhắn mẫu. Hệ thống sẽ mở Zalo, Thầy/Cô hãy Dán (Ctrl+V) vào khung chat nhé!");
      window.open(`https://zalo.me/${rawPhone}`, '_blank');
    }).catch(() => {
      window.open(`https://zalo.me/${rawPhone}`, '_blank');
    });
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
                        
                        <button onClick={() => sendZalo(en.profiles, t)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors" title="Nhắn Zalo">
                          <Send size={14} />
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
        <div ref={printRef} className="w-[650px] bg-white p-8 font-sans border-[12px] border-gray-800 rounded-[2.5rem] relative shadow-2xl">
          <div className="text-center relative mb-10">
            <div className="absolute top-0 left-0 w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center -mt-2 -ml-2">
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-black text-emerald-800 uppercase tracking-[0.2em] mb-3">
              THÔNG BÁO HỌC PHÍ
            </h1>
            <p className="text-lg font-bold text-gray-700 mb-1">Lớp: {classInfo?.name || 'Chưa cập nhật'}</p>
            <p className="text-base text-gray-500 font-medium">Kỳ thu phí: Tháng {month}/{year}</p>
          </div>

          <div className="w-full h-0.5 bg-gradient-to-r from-emerald-100 via-emerald-300 to-emerald-100 mb-8 rounded-full"></div>

          <div className="mb-6 min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
                  <th className="p-3 font-black rounded-tl-xl w-12 text-center">STT</th>
                  <th className="p-3 font-black">Học sinh</th>
                  <th className="p-3 font-black text-right">Số tiền</th>
                  <th className="p-3 font-black rounded-tr-xl text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrollments.map((en, idx) => {
                  const stId = en.profiles.id;
                  const t = tuitionData[stId] || { base_fee: 0, old_debt: 0, discount: 0, paid_amount: 0, status: 'UNPAID' };
                  const totalDue = t.base_fee + t.old_debt - t.discount;
                  return (
                    <tr key={stId}>
                      <td className="p-3 text-center font-bold text-gray-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-gray-800 text-base">{en.profiles.full_name}</td>
                      <td className="p-3 text-right font-bold text-gray-700">{totalDue.toLocaleString('vi-VN')} đ</td>
                      <td className="p-3 text-center">
                         <span className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap inline-block ${
                            t.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                            t.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-rose-100 text-rose-700'
                         }`}>
                           {t.status === 'PAID' ? 'ĐÃ THU' : t.status === 'PARTIAL' ? 'THU 1 PHẦN' : 'CHƯA THU'}
                         </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Thông tin thanh toán */}
            <div className="mt-8 flex flex-col items-center bg-emerald-50/40 border-2 border-dashed border-emerald-500/30 rounded-3xl p-6 gap-4">
              <h3 className="text-xl font-black text-emerald-800 uppercase tracking-widest text-center">Thông tin chuyển khoản</h3>
              <div className="w-44 h-44 bg-white border-2 border-gray-100 rounded-2xl p-2 shadow-sm">
                <img src="https://img.vietqr.io/image/MB-0793898911-compact2.png?amount=0&addInfo=Hoc%20phi" alt="QR Code" crossOrigin="anonymous" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div className="space-y-1 text-lg font-bold text-gray-700 text-center">
                <p>Ngân hàng: <span className="text-emerald-700">MBBank</span></p>
                <p>Số tài khoản: <span className="text-emerald-700">0793898911</span></p>
              </div>
              <div className="mt-2 bg-rose-50 text-rose-600 px-4 py-3 rounded-xl font-bold border border-rose-100 shadow-sm text-sm text-center w-full leading-relaxed">
                ⚠️ <span className="uppercase">Lưu ý:</span> Phụ huynh chuyển khoản nhớ <b>CHỤP BILL</b> gởi thầy để tránh nhầm lẫn!
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t-2 border-dashed border-gray-200 text-center text-gray-400 font-medium text-sm italic">
            Hệ thống quản lý lớp Toán thầy Phúc.
          </div>
        </div>
      </div>
    </div>
  );
}
