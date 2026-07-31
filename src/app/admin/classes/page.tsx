"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Users, BookOpen, Trash2, Edit2, Loader2, Calendar, DollarSign, Search, X, Download, FileWarning } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getEnrollmentCounts, getAllGlobalEnrollments } from "./[id]/actions";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  // Reference data
  const [gradesMap, setGradesMap] = useState<Map<string, string>>(new Map());
  const [coursesMap, setCoursesMap] = useState<Map<string, string>>(new Map());
  const [enrollmentCounts, setEnrollmentCounts] = useState<Map<string, number>>(new Map());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  // Form State
  const [className, setClassName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [maxStudents, setMaxStudents] = useState("30");
  const [sessionsPerMonth, setSessionsPerMonth] = useState("8");
  const [tuitionFee, setTuitionFee] = useState("0");
  const [schedule, setSchedule] = useState("");
  const [startDate, setStartDate] = useState("");

  // Select Options
  const [grades, setGrades] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Categories (Grades)
    const { data: catData } = await supabase.from('categories').select('id, name, type');
    const gMap = new Map();
    const gList: any[] = [];
    if (catData) {
      catData.forEach(c => {
        gMap.set(c.id, c.name);
        if (c.type === 'GRADE' || (!c.type && (c.name.toLowerCase().startsWith('khối') || c.name.toLowerCase().startsWith('lớp')))) {
          gList.push(c);
        }
      });
    }
    setGradesMap(gMap);
    setGrades(gList);

    // 2. Fetch Courses
    const { data: courseData } = await supabase.from('courses').select('id, title, grade_id');
    const cMap = new Map();
    if (courseData) {
      courseData.forEach(c => cMap.set(c.id, c.title));
      setCourses(courseData);
    }
    setCoursesMap(cMap);

    // 3. Fetch Enrollment Counts
    const eMap = new Map();
    try {
      const enrollData = await getEnrollmentCounts();
      if (enrollData) {
        enrollData.forEach(e => {
          const current = eMap.get(e.class_id) || 0;
          eMap.set(e.class_id, current + 1);
        });
      }
    } catch (err) {
      console.log("No enrollments yet");
    }
    setEnrollmentCounts(eMap);

    // 4. Fetch Classes
    const { data: classesData, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (classesData) setClasses(classesData);
    
    setLoading(false);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !gradeId || !courseId) return alert("Vui lòng điền đầy đủ Tên lớp, Khối lớp và Khóa học!");
    
    setIsSubmitting(true);
    const payload = {
      name: className.trim(),
      grade_level_category_id: gradeId,
      course_id: courseId,
      max_students: parseInt(maxStudents) || 30,
      sessions_per_month: parseInt(sessionsPerMonth) || 8,
      tuition_fee: parseInt(tuitionFee) || 0,
      schedule: schedule.trim() || null,
      start_date: startDate || null,
      status: 'active'
    };

    let error;
    if (editingClassId) {
      const res = await supabase.from('classes').update(payload).eq('id', editingClassId);
      error = res.error;
    } else {
      const res = await supabase.from('classes').insert([payload]);
      error = res.error;
    }

    setIsSubmitting(false);
    if (error) {
      alert("Lỗi khi lưu lớp học: " + error.message);
    } else {
      setIsModalOpen(false);
      setEditingClassId(null);
      setClassName("");
      setGradeId("");
      setCourseId("");
      setSchedule("");
      setStartDate("");
      setTuitionFee("0");
      setSessionsPerMonth("8");
      setMaxStudents("30");
      fetchData();
    }
  };

  const handleEditClick = (cls: any) => {
    setEditingClassId(cls.id);
    setClassName(cls.name || "");
    setGradeId(cls.grade_level_category_id || "");
    setCourseId(cls.course_id || "");
    setMaxStudents((cls.max_students || 30).toString());
    setSessionsPerMonth((cls.sessions_per_month || 8).toString());
    setTuitionFee((cls.tuition_fee || 0).toString());
    setSchedule(cls.schedule || "");
    setStartDate(cls.start_date || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Lớp học "${name}" không? Thao tác này sẽ xóa tất cả học sinh khỏi lớp!`)) return;
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) alert("Lỗi khi xóa: " + error.message);
    else setClasses(classes.filter(c => c.id !== id));
  };

  const filteredClasses = classes.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportAllClasses = async () => {
    const monthStr = prompt("Nhập THÁNG cần xuất báo cáo (VD: 7):", (new Date().getMonth() + 1).toString());
    if (!monthStr) return;
    const yearStr = prompt("Nhập NĂM cần xuất báo cáo (VD: 2026):", new Date().getFullYear().toString());
    if (!yearStr) return;
    
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return alert("Tháng/Năm không hợp lệ!");

    setIsExporting(true);
    try {
      const [{ data: fees, error: feesError }, enrollments] = await Promise.all([
        supabase.from('tuition_fees').select('*').eq('month', month).eq('year', year),
        getAllGlobalEnrollments()
      ]);
        
      if (feesError) throw feesError;
      if (!fees) throw new Error("Không thể tải dữ liệu học phí");

      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      
      const workbook = new ExcelJS.Workbook();
      
      // ============ SHEET 1: TỔNG HỢP CÁC LỚP ============
      const sheet = workbook.addWorksheet(`Tổng Hợp T${month}`);

      sheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên Lớp', key: 'name', width: 20 },
        { header: 'Khóa học', key: 'course', width: 25 },
        { header: 'Sĩ số', key: 'total', width: 10 },
        { header: 'Học phí cơ bản', key: 'base', width: 18 },
        { header: 'HS đã nộp', key: 'paid', width: 12 },
        { header: 'HS còn nợ', key: 'unpaid', width: 12 },
        { header: 'Tổng tiền ĐÃ THU', key: 'totalPaid', width: 20 },
        { header: '% trích TT (10%)', key: 'tt', width: 20 },
        { header: 'Còn lại của GV', key: 'gv', width: 20 },
      ];

      // Format header
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      let sumPaid = 0;
      let sumTotal = 0;
      let sumPaidStudents = 0;
      let sumUnpaidStudents = 0;

      classes.forEach((cls, idx) => {
        const classFees = fees.filter(f => f.class_id === cls.id);
        const totalPaid = classFees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
        const totalPaidStudents = classFees.filter(f => (f.paid_amount || 0) > 0 || f.status === 'PAID').length;
        const totalStudents = enrollmentCounts.get(cls.id) || 0;

        sumPaid += totalPaid;
        sumTotal += totalStudents;
        sumPaidStudents += totalPaidStudents;
        sumUnpaidStudents += (totalStudents - totalPaidStudents);

        sheet.addRow({
          stt: idx + 1,
          name: cls.name,
          course: coursesMap.get(cls.course_id) || "",
          total: totalStudents,
          base: cls.tuition_fee || 0,
          paid: totalPaidStudents,
          unpaid: totalStudents - totalPaidStudents,
          totalPaid: totalPaid,
          tt: totalPaid * 0.1,
          gv: totalPaid * 0.9
        });
      });

      // TỔNG CỘNG
      const sumRow = sheet.addRow({
        name: 'TỔNG CỘNG',
        total: sumTotal,
        paid: sumPaidStudents,
        unpaid: sumUnpaidStudents,
        totalPaid: sumPaid,
        tt: sumPaid * 0.1,
        gv: sumPaid * 0.9
      });
      sumRow.font = { bold: true };
      sumRow.eachCell((cell) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      });

      // Format các cell từ dòng 2
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if ([5, 8, 9, 10].includes(colNumber)) {
              cell.numFmt = '#,##0';
            }
            if ([1, 4, 6, 7].includes(colNumber)) {
              cell.alignment = { horizontal: 'center' };
            }
          });
        }
      });

      // ============ SHEET NỢ HỌC PHÍ TỔNG ============
      const uSheet = workbook.addWorksheet(`DS Nợ T${month}`);

      uSheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên Học sinh', key: 'name', width: 25 },
        { header: 'SĐT Học sinh', key: 'phone', width: 15 },
        { header: 'Tên Phụ huynh', key: 'parent', width: 25 },
        { header: 'SĐT Phụ huynh', key: 'parentPhone', width: 15 },
        { header: 'Lớp đang học', key: 'className', width: 20 },
        { header: 'Khóa học', key: 'course', width: 25 },
        { header: 'Học phí nợ (Dự kiến)', key: 'debt', width: 22 },
        { header: 'Ghi chú', key: 'note', width: 20 },
      ];

      uSheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      let debtStt = 1;
      (enrollments || []).forEach(en => {
        const cls = classes.find(c => c.id === en.class_id);
        if (!cls) return;

        const profile = en.profiles as any;
        if (!profile) return;

        const feeRecord = (fees || []).find(f => f.class_id === en.class_id && f.student_id === profile.id);
        const isPaid = feeRecord && (feeRecord.status === 'PAID' || (feeRecord.paid_amount || 0) > 0);
        
        if (!isPaid) {
          const debtAmount = feeRecord 
            ? ((feeRecord.base_fee || 0) + (feeRecord.old_debt || 0) - (feeRecord.discount || 0))
            : (cls.tuition_fee || 0);

          uSheet.addRow({
            stt: debtStt++,
            name: profile.full_name || "",
            phone: profile.student_phone || "",
            parent: profile.parent_name || "",
            parentPhone: profile.parent_phone || "",
            className: cls.name,
            course: coursesMap.get(cls.course_id) || "",
            debt: debtAmount,
            note: ""
          });
        }
      });

      uSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (colNumber === 8) {
              cell.numFmt = '#,##0';
              cell.font = { color: { argb: 'FFDC2626' }, bold: true };
            }
            if ([1, 6].includes(colNumber)) {
              cell.alignment = { horizontal: 'center' };
            }
          });
        }
      });

      // ============ CÁC SHEET CHI TIẾT THEO TỪNG LỚP ============
      const classesToExport = classes.filter(cls => (enrollmentCounts.get(cls.id) || 0) > 0);
      
      classesToExport.forEach(cls => {
        const classEnrollments = (enrollments || []).filter(en => en.class_id === cls.id);
        if (classEnrollments.length === 0) return;
        
        let sheetName = cls.name.replace(/[\[\]\*\\\/\?]/g, '').trim(); 
        if (sheetName.length > 30) sheetName = sheetName.substring(0, 30);
        let count = 1;
        let finalSheetName = sheetName;
        while (workbook.getWorksheet(finalSheetName)) {
           finalSheetName = `${sheetName}_${count}`;
           count++;
        }

        const cSheet = workbook.addWorksheet(finalSheetName);
        cSheet.columns = [
          { header: 'STT', key: 'stt', width: 6 },
          { header: 'Tên Học sinh', key: 'name', width: 25 },
          { header: 'SĐT Học sinh', key: 'phone', width: 15 },
          { header: 'Tên Phụ huynh', key: 'parent', width: 25 },
          { header: 'SĐT Phụ huynh', key: 'parentPhone', width: 15 },
          { header: 'Trạng thái', key: 'status', width: 15 },
          { header: 'Số tiền Đã Nộp', key: 'paidAmount', width: 20 },
          { header: 'Học phí nợ (Dự kiến)', key: 'debt', width: 22 },
        ];

        cSheet.getRow(1).eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // bg-blue-600
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        let stt = 1;
        classEnrollments.forEach(en => {
          const profile = en.profiles as any;
          if (!profile) return;

          const feeRecord = (fees || []).find(f => f.class_id === en.class_id && f.student_id === profile.id);
          const isPaid = feeRecord && (feeRecord.status === 'PAID' || (feeRecord.paid_amount || 0) > 0);
          
          let debtAmount = 0;
          if (!isPaid) {
            debtAmount = feeRecord 
              ? ((feeRecord.base_fee || 0) + (feeRecord.old_debt || 0) - (feeRecord.discount || 0))
              : (cls.tuition_fee || 0);
          }

          const row = cSheet.addRow({
            stt: stt++,
            name: profile.full_name || "",
            phone: profile.student_phone || "",
            parent: profile.parent_name || "",
            parentPhone: profile.parent_phone || "",
            status: isPaid ? "Đã nộp" : "Chưa nộp",
            paidAmount: isPaid ? (feeRecord.paid_amount || 0) : 0,
            debt: isPaid ? 0 : debtAmount,
          });
          
          if (!isPaid) {
             row.getCell('status').font = { color: { argb: 'FFEF4444' }, bold: true };
          } else {
             row.getCell('status').font = { color: { argb: 'FF10B981' }, bold: true };
          }
        });

        cSheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.eachCell((cell, colNumber) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              if ([7, 8].includes(colNumber)) {
                cell.numFmt = '#,##0';
              }
              if ([1, 6].includes(colNumber)) {
                cell.alignment = { horizontal: 'center' };
              }
            });
          }
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Bao_Cao_Hoc_Phi_Tat_Ca_Lop_T${month}_${year}.xlsx`);
    } catch (e: any) {
      alert("Lỗi xuất Excel: " + e.message);
    }
    setIsExporting(false);
  };

  const handleExportUnpaidStudents = async () => {
    const monthStr = prompt("Nhập THÁNG cần xuất DS Nợ (VD: 7):", (new Date().getMonth() + 1).toString());
    if (!monthStr) return;
    const yearStr = prompt("Nhập NĂM cần xuất DS Nợ (VD: 2026):", new Date().getFullYear().toString());
    if (!yearStr) return;
    
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return alert("Tháng/Năm không hợp lệ!");

    setIsExporting(true);
    try {
      const [{ data: fees, error: feesError }, enrollments] = await Promise.all([
        supabase.from('tuition_fees').select('*').eq('month', month).eq('year', year),
        getAllGlobalEnrollments()
      ]);

      if (feesError) throw feesError;
      if (!enrollments) throw new Error("Không thể tải danh sách học sinh");

      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      const uSheet = workbook.addWorksheet(`Nợ HP T${month}`);

      uSheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên Học sinh', key: 'name', width: 25 },
        { header: 'SĐT Học sinh', key: 'phone', width: 15 },
        { header: 'Tên Phụ huynh', key: 'parent', width: 25 },
        { header: 'SĐT Phụ huynh', key: 'parentPhone', width: 15 },
        { header: 'Lớp đang học', key: 'className', width: 20 },
        { header: 'Khóa học', key: 'course', width: 25 },
        { header: 'Học phí nợ (Dự kiến)', key: 'debt', width: 22 },
        { header: 'Ghi chú', key: 'note', width: 20 },
      ];

      uSheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // bg-red-600
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      let stt = 1;
      let hasUnpaid = false;

      enrollments.forEach(en => {
        const cls = classes.find(c => c.id === en.class_id);
        if (!cls) return;

        const profile = en.profiles as any;
        if (!profile) return;

        const feeRecord = (fees || []).find(f => f.class_id === en.class_id && f.student_id === profile.id);
        const isPaid = feeRecord && (feeRecord.status === 'PAID' || (feeRecord.paid_amount || 0) > 0);
        
        if (!isPaid) {
          hasUnpaid = true;
          const debtAmount = feeRecord 
            ? ((feeRecord.base_fee || 0) + (feeRecord.old_debt || 0) - (feeRecord.discount || 0))
            : (cls.tuition_fee || 0);

          uSheet.addRow({
            stt: stt++,
            name: profile.full_name || "",
            phone: profile.student_phone || "",
            parent: profile.parent_name || "",
            parentPhone: profile.parent_phone || "",
            className: cls.name,
            course: coursesMap.get(cls.course_id) || "",
            debt: debtAmount,
            note: ""
          });
        }
      });

      if (!hasUnpaid) {
         alert("Tuyệt vời! Tất cả học sinh đã đóng đủ học phí trong tháng " + month);
         setIsExporting(false);
         return;
      }

      uSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (colNumber === 8) {
              cell.numFmt = '#,##0';
              cell.font = { color: { argb: 'FFDC2626' }, bold: true };
            }
            if ([1, 6].includes(colNumber)) {
              cell.alignment = { horizontal: 'center' };
            }
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Danh_Sach_No_Hoc_Phi_Tat_Ca_Lop_T${month}_${year}.xlsx`);
    } catch (e: any) {
      alert("Lỗi xuất Excel DS Nợ: " + e.message);
    }
    setIsExporting(false);
  };

  return (
    <div className="p-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-teal-600" />
            Quản lý Lớp học
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Tổ chức lớp học, sắp xếp học sinh và quản lý lịch học.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportUnpaidStudents}
            disabled={isExporting || classes.length === 0}
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileWarning className="w-5 h-5" />}
            <span className="hidden sm:inline">Xuất HS Chưa Nộp</span>
          </button>
          
          <button 
            onClick={handleExportAllClasses}
            disabled={isExporting || classes.length === 0}
            className="flex items-center gap-2 bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-200 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span className="hidden sm:inline">Xuất Excel Tổng</span>
          </button>
          
          <button 
            onClick={() => {
              setEditingClassId(null);
              setClassName("");
              setGradeId("");
              setCourseId("");
              setSchedule("");
              setStartDate("");
              setTuitionFee("0");
              setSessionsPerMonth("8");
              setMaxStudents("30");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Tạo lớp học mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm lớp học..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-800 mb-2">Chưa có lớp học nào</p>
          <p className="text-gray-500 mb-6">Hãy tạo lớp học đầu tiên để bắt đầu thêm học sinh vào lớp!</p>
          <button 
            onClick={() => {
              setEditingClassId(null);
              setClassName("");
              setGradeId("");
              setCourseId("");
              setSchedule("");
              setStartDate("");
              setTuitionFee("0");
              setSessionsPerMonth("8");
              setMaxStudents("30");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 text-teal-600 font-bold hover:underline"
          >
            <Plus size={18} /> Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClasses.map(cls => {
            const gradeName = gradesMap.get(cls.grade_level_category_id) || "Chưa xác định";
            const courseName = coursesMap.get(cls.course_id) || "Chưa xác định";
            const enrolled = enrollmentCounts.get(cls.id) || 0;
            const max = cls.max_students || 30;
            const isFull = enrolled >= max;
            
            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-teal-400 to-teal-600" />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100/50 mb-2 inline-block">
                      {gradeName}
                    </span>
                    <h3 className="font-extrabold text-2xl text-gray-800 leading-tight pr-2 hover:text-teal-600 transition-colors cursor-pointer" onClick={() => router.push(`/admin/classes/${cls.id}`)}>
                      {cls.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                    <button onClick={() => handleEditClick(cls)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Sửa">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cls.id, cls.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    <span className="line-clamp-2 font-medium">{courseName}</span>
                  </div>
                  
                  {cls.schedule && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium">{cls.schedule}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-emerald-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cls.tuition_fee || 0)}/tháng ({cls.sessions_per_month || 8} buổi)
                      </span>
                    </div>
                </div>

                <div className="pt-5 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex flex-col gap-1 w-1/2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-500">Sĩ số</span>
                      <span className={isFull ? 'text-red-500' : 'text-teal-600'}>{enrolled} / {max}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-teal-500'}`} 
                        style={{ width: `${Math.min((enrolled / max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <Link 
                    href={`/admin/classes/${cls.id}`}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg font-bold text-sm transition-colors"
                  >
                    Quản lý học sinh
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-gray-800">{editingClassId ? 'Chỉnh sửa Lớp học' : 'Tạo Lớp học mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="createClassForm" onSubmit={handleSaveClass} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tên lớp học <span className="text-red-500">*</span></label>
                  <input 
                    type="text" required
                    value={className} onChange={e => setClassName(e.target.value)}
                    placeholder="VD: Toán 12A1"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Khối lớp <span className="text-red-500">*</span></label>
                    <select 
                      required value={gradeId} onChange={e => setGradeId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                    >
                      <option value="">-- Chọn Khối --</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Khóa học <span className="text-red-500">*</span></label>
                    <select 
                      required value={courseId} onChange={e => setCourseId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                    >
                      <option value="">-- Chọn Khóa học --</option>
                      {courses.filter(c => !gradeId || c.grade_id === gradeId).map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lịch học</label>
                  <input 
                    type="text" 
                    value={schedule} onChange={e => setSchedule(e.target.value)}
                    placeholder="VD: Tối Thứ 2 - 4 - 6 (18:00 - 19:30)"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Số buổi/tháng</label>
                      <input 
                        type="number" 
                        value={sessionsPerMonth} onChange={e => setSessionsPerMonth(e.target.value)}
                        placeholder="VD: 8"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Học phí (VNĐ/Tháng)</label>
                      <input 
                        type="number" 
                        value={tuitionFee} onChange={e => setTuitionFee(e.target.value)}
                        placeholder="VD: 600000"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Sĩ số tối đa</label>
                    <input 
                      type="number" 
                      value={maxStudents} onChange={e => setMaxStudents(e.target.value)}
                      placeholder="VD: 30"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ngày khai giảng</label>
                  <input 
                    type="date" 
                    value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button 
                type="button" onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" form="createClassForm" disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingClassId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />)} 
                {editingClassId ? 'Cập nhật Lớp học' : 'Lưu Lớp học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
