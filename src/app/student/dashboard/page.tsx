"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  BookOpen, 
  Loader2, 
  LogOut, 
  GraduationCap, 
  CalendarDays,
  User,
  ClipboardList,
  ShieldCheck,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  DollarSign,
  CheckSquare,
  Library,
  Clock,
  PlayCircle
} from "lucide-react";

type TabType = 'info' | 'courses' | 'exams' | 'schedule' | 'finance';

export default function StudentDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [tuitionRecords, setTuitionRecords] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    if (activeTab === 'exams') {
      const fetchExams = async () => {
        setLoadingExams(true);
        try {
          const res = await fetch("/api/student/exams");
          const data = await res.json();
          if (res.ok) setExams(data);
        } catch (error) {
          console.error("Lỗi lấy danh sách kỳ thi:", error);
        } finally {
          setLoadingExams(false);
        }
      };
      fetchExams();
    }
  }, [activeTab]);
  
  // Đổi mật khẩu
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [imageError, setImageError] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (profileData) {
          // Gọi API để bypass RLS
          const res = await fetch('/api/student/my-course?userId=' + currentUser.id);
          const requestData = await res.json();

          if (requestData?.course_id) {
            profileData.course_id = requestData.course_id; // Inject course_id để JSX hiển thị đúng
            const { data: coursesData } = await supabase
              .from('courses')
              .select(`*, categories!courses_category_id_fkey ( name ), lessons ( id, title, created_at )`)
              .eq('id', requestData.course_id);
            if (coursesData) setCourses(coursesData);
          } else {
            setCourses([]);
          }
          
          setProfile(profileData);

          // Lấy dữ liệu Học phí và Điểm danh
          const { data: tf } = await supabase.from('tuition_fees').select('*, classes(name)').eq('student_id', currentUser.id).order('year', {ascending: false}).order('month', {ascending: false});
          if (tf) setTuitionRecords(tf);

          const { data: att } = await supabase.from('attendance').select('*, sessions(title, session_date)').eq('student_id', currentUser.id).order('created_at', {ascending: false});
          if (att) setAttendanceRecords(att);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 6) {
      setPwMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);

    if (error) {
      setPwMessage({ type: 'error', text: 'Lỗi: ' + error.message });
    } else {
      setPwMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        <p className="text-gray-500 font-medium animate-pulse">Đang nạp dữ liệu không gian học tập...</p>
      </div>
    );
  }

  // 1. Trạng thái Chưa kích hoạt
  if (profile && profile.is_active === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white p-12 rounded-[2rem] shadow-xl border border-gray-100 max-w-lg text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border-[6px] border-amber-100/50">
            <ShieldCheck className="w-12 h-12 text-amber-500" />
          </div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">Tài khoản chờ Duyệt!</h2>
          <p className="text-gray-500 leading-relaxed font-medium">
            Hồ sơ học sinh <strong className="text-teal-700">{profile?.full_name}</strong> đã được ghi nhận vào hệ thống. Tuy nhiên, bạn cần đợi Giáo viên hoặc Quản trị viên kích hoạt tài khoản thì mới có thể vào lớp học.
          </p>
          <div className="mt-8 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-400 font-semibold italic">
            Hãy liên hệ với Trung tâm để tiến trình này diễn ra nhanh hơn nhé!
          </div>
          <button onClick={handleLogout} className="mt-8 text-teal-600 font-bold hover:text-teal-700 flex items-center justify-center gap-2 mx-auto transition-colors">
            <LogOut className="w-4 h-4" /> Thoát tài khoản
          </button>
        </div>
      </div>
    );
  }

  // 2. Trạng thái Đã kích hoạt -> Dashboard Chính
  return (
    <div className="w-full flex-1 min-h-screen overflow-y-auto bg-gray-50 pb-20 font-sans">
      
      {/* Topbar Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl shadow-md shadow-teal-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
              EduCenter
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              <User className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-bold text-gray-700">{profile?.full_name}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 transition-colors bg-white hover:bg-red-50 px-3 py-2 rounded-lg">
              <LogOut className="w-4 h-4" /> Thoát
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 sm:p-8 max-w-[1400px] mx-auto space-y-8">
        
        {/* Tiêu đề trang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Tổng Quan Học Tập</h1>
            <p className="text-gray-500 mt-1.5 font-medium">Chào mừng <span className="font-bold text-teal-600">{profile?.full_name}</span> trở lại với góc học tập!</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Thanh Điều Hướng Ngang (Tabs) */}
        <div className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2 items-stretch justify-between relative z-10">
          <button 
            onClick={() => setActiveTab('schedule')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap ${activeTab === 'schedule' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <CalendarDays className={`w-5 h-5 ${activeTab === 'schedule' ? 'text-white' : 'text-gray-400'}`} /> Lịch học
          </button>

          <button 
            onClick={() => setActiveTab('info')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap ${activeTab === 'info' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <User className={`w-5 h-5 ${activeTab === 'info' ? 'text-white' : 'text-gray-400'}`} /> Hồ sơ học sinh
          </button>

          <button 
            onClick={() => setActiveTab('courses')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap ${activeTab === 'courses' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === 'courses' ? 'text-white' : 'text-gray-400'}`} /> Khóa học bài giảng
          </button>

          <button 
            onClick={() => setActiveTab('exams')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap ${activeTab === 'exams' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <ClipboardList className={`w-5 h-5 ${activeTab === 'exams' ? 'text-white' : 'text-gray-400'}`} /> Kiểm tra Online
          </button>

          <button 
            onClick={() => setActiveTab('finance')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap ${activeTab === 'finance' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <DollarSign className={`w-5 h-5 ${activeTab === 'finance' ? 'text-white' : 'text-gray-400'}`} /> Tài chính & Điểm danh
          </button>

          <Link 
            href="/student/handbook" 
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base whitespace-nowrap text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-l border-gray-200 ml-2 pl-6"
          >
            <Library className="w-5 h-5 text-indigo-500" /> Sổ tay Toán học
          </Link>
        </div>

        {/* KHU VỰC NỘI DUNG CHÍNH (FULL WIDTH) */}
        <div className="w-full">
          
          {/* 1. LỊCH HỌC */}
          {activeTab === 'schedule' && (
            <div className="w-full relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {!profile?.course_id ? (
                // TH 1: Không có khóa học
                <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-12 min-h-[500px] flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Chưa có khóa học nào</h3>
                  <p className="text-gray-500 font-medium max-w-md mx-auto">
                    Tài khoản của bạn chưa được liên kết với khóa học nào trên hệ thống. Vì vậy chưa có Thời khóa biểu để hiển thị. Vui lòng liên hệ Giáo viên!
                  </p>
                </div>
              ) : imageError ? (
                // TH 2: Có khóa học nhưng không có ảnh
                <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-12 min-h-[500px] flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <CalendarDays className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Giáo viên chưa tải lịch học lên</h3>
                  <p className="text-gray-500 font-medium max-w-md mx-auto">
                    Khóa học của bạn đã được ghi nhận trên hệ thống nhưng Thời khóa biểu bằng hình ảnh vẫn chưa được giáo viên đăng tải. Bạn hãy quay lại sau nhé.
                  </p>
                </div>
              ) : (
                // TH 3: Hiển thị ảnh Lịch Học đẹp tuyệt vời (Poster)
                <div className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-teal-900/10 border-[8px] border-white bg-white w-full max-w-6xl mx-auto flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`${supabase.storage.from('system-assets').getPublicUrl(`schedule_course_${profile.course_id}.png`).data.publicUrl}?t=${Date.now()}`}
                    alt="Thời khóa biểu khóa học" 
                    className="w-full h-auto object-cover transform transition-transform duration-700 hover:scale-[1.01]"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}
            </div>
          )}

          {/* 2. THÔNG TIN HỌC SINH */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-teal-600 relative p-10 sm:p-14 text-white flex items-center gap-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-600/90 to-emerald-800/90 mix-blend-multiply"></div>
                <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-5xl font-extrabold border-4 border-white/30 shrink-0 relative z-10 shadow-xl">
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-2 tracking-tight">{profile?.full_name}</h2>
                  <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                    <User className="w-4 h-4 text-teal-200" /> 
                    <span className="font-semibold text-teal-50">Hồ sơ Học sinh</span>
                  </div>
                </div>
              </div>
              
              <div className="p-10 sm:p-14">
                <h3 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3 border-b border-gray-100 pb-4">
                  <User className="text-teal-600 w-6 h-6"/> Thông tin cá nhân (Chỉ xem)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="group">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-teal-500 transition-colors">Tài khoản đăng nhập</p>
                    <p className="font-bold text-gray-800 text-lg">{profile?.username}</p>
                  </div>
                  <div className="group">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-teal-500 transition-colors">Số điện thoại HS</p>
                    <p className="font-bold text-gray-800 text-lg">{profile?.student_phone || '—'}</p>
                  </div>
                  <div className="group">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-teal-500 transition-colors">Trường</p>
                    <p className="font-bold text-gray-800 text-lg">{profile?.school || '—'}</p>
                  </div>
                  <div className="group">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-teal-500 transition-colors">Lớp</p>
                    <p className="font-bold text-gray-800 text-lg">{profile?.class_name || '—'}</p>
                  </div>
                  <div className="group border-t border-gray-50 pt-6 mt-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-teal-500 transition-colors">Họ tên Phụ huynh</p>
                    <p className="font-bold text-gray-800 text-lg">{profile?.parent_name || '—'}</p>
                  </div>
                  <div className="group border-t border-gray-50 pt-6 mt-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-teal-500 transition-colors">Số ĐT Phụ huynh</p>
                    <p className="font-bold text-gray-800 text-lg">{profile?.parent_phone || '—'}</p>
                  </div>
                </div>

                <div className="mt-10 bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 mb-1">Cập nhật thông tin</h4>
                    <p className="text-sm text-amber-700/80 font-medium">
                      Các thông tin cá nhân phía trên được khóa để đảm bảo đồng bộ hệ thống. Nếu bạn có nhu cầu sửa đổi thông tin, vui lòng liên hệ trực tiếp với Giáo viên quản lý lớp của bạn.
                    </p>
                  </div>
                </div>

                {/* ĐỔI MẬT KHẨU */}
                <div className="mt-12 pt-10 border-t border-gray-100">
                  {!showPasswordForm ? (
                    <button onClick={() => setShowPasswordForm(true)} className="flex items-center gap-2 font-bold text-teal-600 bg-teal-50 border border-teal-100 px-6 py-3 rounded-xl hover:bg-teal-100 hover:shadow-sm transition-all">
                      <Lock className="w-5 h-5" /> Kích hoạt Tự đổi mật khẩu
                    </button>
                  ) : (
                    <form onSubmit={handleChangePassword} className="max-w-md bg-white border border-gray-200 shadow-xl shadow-gray-200/50 p-8 rounded-2xl space-y-5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h4 className="font-black text-gray-800 text-xl">Đổi mật khẩu mới</h4>
                      </div>
                      
                      <div>
                        <div className="relative">
                          <input type={showNewPw ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" className="w-full px-5 py-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all" />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showNewPw ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                          </button>
                        </div>
                      </div>
                      <div>
                        <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Xác nhận lại mật khẩu mới" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium transition-all" />
                      </div>
                      
                      {pwMessage && (
                        <div className={`p-4 rounded-xl text-sm font-bold border ${pwMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {pwMessage.text}
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <button type="submit" disabled={pwLoading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 shadow-lg shadow-teal-600/30 transition-all">
                          {pwLoading ? 'Đang lưu...' : 'Lưu mật khẩu an toàn'}
                        </button>
                        <button type="button" onClick={() => setShowPasswordForm(false)} className="px-6 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                          Hủy bỏ
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. KHÓA HỌC BÀI GIẢNG */}
          {activeTab === 'courses' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-teal-100 rounded-2xl text-teal-600">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-800">Khóa học của bạn</h2>
                  <p className="text-gray-500 font-medium">Truy cập vào các bài giảng và tài liệu học tập.</p>
                </div>
              </div>

              {courses.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-16 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-xl font-bold">Bạn chưa được gán Khóa học nào.</p>
                  <p className="text-gray-400 mt-2">Vui lòng liên hệ Giáo viên để nhận thông tin vào lớp.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {courses.map((course) => (
                    <div key={course.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-teal-900/5 transition-all duration-300 hover:-translate-y-2 overflow-hidden group flex flex-col">
                      <div className="h-3 bg-gradient-to-r from-teal-500 to-emerald-500 w-full"></div>
                      <div className="p-8 sm:p-10 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-6">
                          <span className="bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-sm font-black border border-teal-100 tracking-wide uppercase">
                            Lớp {course.grade_level}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-3 group-hover:text-teal-600 transition-colors line-clamp-2 leading-tight">
                          {course.title}
                        </h3>
                        <p className="text-gray-500 mb-8 flex-1 line-clamp-3 text-justify">
                          {course.description || "Khóa học này chưa có mô tả chi tiết."}
                        </p>
                        
                        <div className="bg-gray-50 rounded-2xl p-5 flex items-center justify-between mt-auto group-hover:bg-teal-50 transition-colors border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                              <BookOpen className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Thời lượng</p>
                              <span className="text-sm font-black text-gray-700">
                                {course.lessons?.length || 0} bài giảng
                              </span>
                            </div>
                          </div>
                          
                          <button onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all">
                            {expandedCourseId === course.id ? "Đóng" : "Vào lớp học"} <ChevronRight className={`w-4 h-4 transition-transform ${expandedCourseId === course.id ? 'rotate-90' : ''}`} />
                          </button>
                        </div>
                        {/* Accordion Danh sách bài giảng */}
                        {expandedCourseId === course.id && (
                          <div className="mt-4 bg-white rounded-xl shadow-inner border border-gray-100 p-2 animate-in fade-in slide-in-from-top-2">
                            <h4 className="font-bold text-gray-700 px-3 py-2 text-sm border-b border-gray-100 mb-2">Danh sách Bài giảng</h4>
                            {course.lessons && course.lessons.length > 0 ? (
                               <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                 {course.lessons.map((lesson: any) => (
                                   <Link key={lesson.id} href={`/student/lessons/${lesson.id}`} className="block px-3 py-2 hover:bg-teal-50 rounded-lg text-gray-600 hover:text-teal-700 transition-colors text-sm font-medium">
                                      {lesson.title}
                                   </Link>
                                 ))}
                               </div>
                            ) : (
                               <div className="text-gray-400 italic px-3 py-2 text-sm">Chưa có bài giảng nào</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. KIỂM TRA ONLINE */}
          {activeTab === 'exams' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-800">Trung tâm Thi Cử</h2>
                  <p className="text-gray-500 font-medium">Tham gia các kỳ thi trực tuyến và đánh giá năng lực của bạn.</p>
                </div>
              </div>

              {loadingExams ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-medium animate-pulse">Đang tải danh sách bài thi...</p>
                </div>
              ) : exams.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                     <ClipboardList className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có kỳ thi nào</h3>
                  <p className="text-gray-500">Hiện tại chưa có bài kiểm tra nào được mở cho khóa học của bạn. Vui lòng quay lại sau.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {exams.map((exam) => (
                    <div key={exam.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-rose-900/5 hover:-translate-y-2 transition-all duration-300 group flex flex-col h-full">
                      <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-8 flex flex-col justify-end min-h-[160px] relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 p-4 opacity-20 transform rotate-12">
                          <ClipboardList className="w-32 h-32 text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white relative z-10 drop-shadow-md line-clamp-2 leading-tight">
                          {exam.exam_group_name ? `${exam.exam_group_name} - ${exam.variant_name || exam.title}` : exam.title}
                        </h3>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="space-y-4 mb-8">
                          <div className="flex items-center text-sm text-gray-600 font-medium">
                            <Clock className="w-5 h-5 mr-3 text-rose-500" />
                            Thời gian làm bài: <span className="font-bold text-gray-800 ml-1">{exam.duration_minutes} phút</span>
                          </div>
                          
                          {exam.start_time && (
                            <div className="flex items-center text-sm text-gray-600 font-medium">
                              <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                              Mở lúc: <span className="text-gray-800 ml-1">{new Date(exam.start_time).toLocaleString('vi-VN')}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-100">
                          <Link 
                            href={`/student/online-exams/${exam.id}`}
                            className="w-full bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white shadow-sm hover:shadow-rose-600/20 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                          >
                            <PlayCircle className="w-5 h-5" /> VÀO PHÒNG CHỜ
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. TÀI CHÍNH & ĐIỂM DANH */}
          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
              
              {/* Lịch sử Học phí */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <div className="p-3 bg-teal-100 rounded-xl text-teal-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800">Lịch sử Học phí</h3>
                </div>
                
                {tuitionRecords.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">Chưa có dữ liệu học phí.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-4">Kỳ/Lớp</th>
                          <th className="px-5 py-4 text-right">Học phí</th>
                          <th className="px-5 py-4 text-right">Nợ cũ</th>
                          <th className="px-5 py-4 text-right">Giảm trừ</th>
                          <th className="px-5 py-4 text-right">Thực nộp</th>
                          <th className="px-5 py-4 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                        {tuitionRecords.map(t => {
                          const total = t.base_fee + t.old_debt - t.discount;
                          return (
                            <tr key={t.id} className="hover:bg-gray-50/50">
                              <td className="px-5 py-4">
                                <div className="font-bold text-gray-800">Tháng {t.month}/{t.year}</div>
                                <div className="text-xs text-gray-500">{t.classes?.name}</div>
                              </td>
                              <td className="px-5 py-4 text-right">{t.base_fee.toLocaleString('vi-VN')} đ</td>
                              <td className="px-5 py-4 text-right text-rose-500">{t.old_debt > 0 ? t.old_debt.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                              <td className="px-5 py-4 text-right text-orange-500">{t.discount > 0 ? t.discount.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                              <td className="px-5 py-4 text-right font-bold text-teal-700">{total.toLocaleString('vi-VN')} đ</td>
                              <td className="px-5 py-4 text-center">
                                <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md ${
                                  t.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                  t.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {t.status === 'PAID' ? 'Đã thu' : t.status === 'PARTIAL' ? `Thu 1 phần (${t.paid_amount.toLocaleString()})` : 'Chưa thu'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Lịch sử Điểm danh */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800">Lịch sử Điểm danh</h3>
                </div>

                {attendanceRecords.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">Chưa có dữ liệu điểm danh.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {attendanceRecords.map(att => (
                      <div key={att.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <div className="font-bold text-gray-800">{att.sessions?.title}</div>
                          <div className="text-sm text-gray-500">{new Date(att.sessions?.session_date).toLocaleDateString('vi-VN')}</div>
                          {att.note && <div className="text-xs text-gray-400 mt-1 italic">Ghi chú: {att.note}</div>}
                        </div>
                        <div>
                          <span className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg ${
                            att.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                            att.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' :
                            att.status === 'EXCUSED_ABSENCE' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {att.status === 'PRESENT' ? 'CÓ MẶT' :
                             att.status === 'LATE' ? 'ĐI TRỄ' :
                             att.status === 'EXCUSED_ABSENCE' ? 'CÓ PHÉP' : 'KHÔNG PHÉP'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
