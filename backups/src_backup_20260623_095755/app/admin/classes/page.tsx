"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Users, BookOpen, Trash2, Edit2, Loader2, Calendar, DollarSign, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getEnrollmentCounts } from "./[id]/actions";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();
  const router = useRouter();

  // Reference data
  const [gradesMap, setGradesMap] = useState<Map<string, string>>(new Map());
  const [coursesMap, setCoursesMap] = useState<Map<string, string>>(new Map());
  const [enrollmentCounts, setEnrollmentCounts] = useState<Map<string, number>>(new Map());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [className, setClassName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [maxStudents, setMaxStudents] = useState("30");
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

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !gradeId || !courseId) return alert("Vui lòng điền đầy đủ Tên lớp, Khối lớp và Khóa học!");
    
    setIsSubmitting(true);
    const { error } = await supabase.from('classes').insert([{
      name: className.trim(),
      grade_level_category_id: gradeId,
      course_id: courseId,
      max_students: parseInt(maxStudents) || 30,
      tuition_fee: parseInt(tuitionFee) || 0,
      schedule: schedule.trim() || null,
      start_date: startDate || null,
      status: 'active'
    }]);

    setIsSubmitting(false);
    if (error) {
      alert("Lỗi khi tạo lớp học: " + error.message);
    } else {
      setIsModalOpen(false);
      setClassName("");
      setGradeId("");
      setCourseId("");
      setSchedule("");
      setStartDate("");
      fetchData();
    }
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Tạo lớp học mới</span>
        </button>
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
            onClick={() => setIsModalOpen(true)}
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
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cls.tuition_fee || 0)}/tháng
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
              <h3 className="text-xl font-bold text-gray-800">Tạo Lớp học mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="createClassForm" onSubmit={handleCreateClass} className="space-y-5">
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
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Học phí (VNĐ/Tháng)</label>
                    <input 
                      type="number" 
                      value={tuitionFee} onChange={e => setTuitionFee(e.target.value)}
                      placeholder="VD: 600000"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-medium"
                    />
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
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} 
                Lưu Lớp học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
