"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, TrendingUp, Calendar, Clock, Activity, PenTool, DollarSign, ListTodo, BookOpenText, ClipboardCheck, ArrowRight, CheckCircle2, Target } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Custom CountUp Component
const CountUp = ({ end, duration = 1500 }: { end: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * end));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count}</span>;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalExams: 0,
    totalSubmissions: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  /* Hàng chờ chấm tự luận (bài thi online + bài luyện tập) - máy không chấm tự luận, nên
     thầy cô phải thấy ngay khi mở Dashboard là đang có bao nhiêu bài đợi mình. */
  const [choCham, setChoCham] = useState<any[]>([]);
  const [dangTaiChoCham, setDangTaiChoCham] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const supabase = createClient();
      
      // 1. Fetch Stats
      const [
        { count: coursesCount },
        { count: studentsCount },
        { count: examsCount },
        { count: submissionsCount }
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('online_exams').select('*', { count: 'exact', head: true }),
        supabase.from('exam_results').select('*', { count: 'exact', head: true }).gt('attempt_number', 0)
      ]);

      setStats({
        totalCourses: coursesCount || 0,
        totalStudents: studentsCount || 0,
        totalExams: examsCount || 0,
        totalSubmissions: submissionsCount || 0,
      });

      // 2. Fetch Chart Data (Last 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentSubmissions, error: recentError } = await supabase
        .from('exam_results')
        .select('created_at')
        .gt('attempt_number', 0)
        .gte('created_at', sevenDaysAgo.toISOString());
        
      if (recentError) console.error("Chart data error:", recentError);

      // Aggregate data by date
      const dateMap: Record<string, number> = {};
      // Initialize last 7 days with 0
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        dateMap[dateStr] = 0;
      }

      if (recentSubmissions) {
        recentSubmissions.forEach(sub => {
          if (!sub.created_at) return;
          const dateStr = new Date(sub.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          if (dateMap[dateStr] !== undefined) {
            dateMap[dateStr]++;
          }
        });
      }

      const finalChartData = Object.keys(dateMap).map(key => ({
        name: key,
        'Bài Nộp': dateMap[key]
      }));
      setChartData(finalChartData);

      // 3. Fetch Recent Activities
      const { data: activities, error: actError } = await supabase
        .from('exam_results')
        .select('id, created_at, profiles(full_name), lessons(title)')
        .gt('attempt_number', 0)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (actError) console.error("Activities data error:", actError);

      if (activities) {
        setRecentActivities(activities);
      }

      setLoading(false);
    };
    
    fetchDashboardData();
    fetch('/api/admin/cho-cham')
      .then(r => r.ok ? r.json() : { ds: [] })
      .then(d => setChoCham(d.ds || []))
      .catch(() => setChoCham([]))
      .finally(() => setDangTaiChoCham(false));
  }, []);

  const soCauChoCham = choCham.reduce((t, d) => t + Number(d.conThieu || 0), 0);
  const duongCham = (d: any) => d.loai === 'luyen_tap'
    ? `/admin/exam-results?mo=${d.ket_qua_id}`
    : `/admin/online-exams/${d.exam_id}/submissions/${d.student_id}`;

  const statCards = [
    { title: "Tổng Học Sinh", value: stats.totalStudents, icon: Users, color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/30", bg: "bg-blue-50" },
    { title: "Tổng Khóa Học", value: stats.totalCourses, icon: BookOpen, color: "from-teal-400 to-emerald-500", shadow: "shadow-emerald-500/30", bg: "bg-teal-50" },
    { title: "Kỳ Thi Trực Tuyến", value: stats.totalExams, icon: Target, color: "from-rose-400 to-red-500", shadow: "shadow-rose-500/30", bg: "bg-rose-50", href: "/admin/online-exams" },
    { title: "Bài Chờ Chấm", value: choCham.length, icon: ClipboardCheck, color: choCham.length ? "from-amber-400 to-orange-500" : "from-emerald-400 to-teal-500", shadow: choCham.length ? "shadow-amber-500/30" : "shadow-emerald-500/30", bg: choCham.length ? "bg-amber-50" : "bg-emerald-50", href: "/admin/cho-cham" },
    { title: "Lượt Nộp Bài", value: stats.totalSubmissions, icon: TrendingUp, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/30", bg: "bg-violet-50" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-600 mb-2">Trung Tâm Điều Khiển</h1>
          <p className="text-gray-500 font-medium">Theo dõi và quản lý mọi hoạt động trên nền tảng Math LMS</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50/50 px-5 py-3 rounded-2xl border border-gray-100 backdrop-blur-sm">
          <Calendar className="w-5 h-5 text-teal-600" />
          <span className="text-sm font-bold text-gray-700">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Thông báo bài tự luận chờ chấm - đặt ngay dưới tiêu đề, trước mọi con số thống kê,
          vì đây là việc duy nhất trên Dashboard cần thầy cô làm ngay. */}
      {!dangTaiChoCham && (choCham.length > 0 ? (
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-amber-900">
                  Có {choCham.length} bài tự luận đang chờ chấm
                  <span className="text-base font-bold text-amber-700 ml-2">({soCauChoCham} câu)</span>
                </h2>
                <p className="text-amber-800 font-medium mt-1">
                  Máy không chấm tự luận. Học sinh đang thấy "chờ thầy cô chấm"; chấm xong và lưu chốt thì điểm mới tính vào bảng điểm và điểm thưởng tháng.
                </p>
              </div>
            </div>
            <Link href="/admin/cho-cham" className="shrink-0 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.02]">
              Vào chấm ngay <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {choCham.slice(0, 3).map((d: any, i: number) => (
              <Link key={d.ket_qua_id || `${d.exam_id}_${d.student_id}_${i}`} href={duongCham(d)}
                className="bg-white/80 hover:bg-white rounded-2xl border border-amber-200 p-4 transition-all hover:shadow-md group">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 truncate">{d.tenHs}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">{d.conThieu} câu</span>
                </div>
                <div className="text-sm text-slate-600 truncate mt-1">{d.tenDe}</div>
                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {d.nopLuc ? new Date(d.nopLuc).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  {d.lop && <span className="ml-auto font-semibold text-slate-500">{d.lop}</span>}
                </div>
              </Link>
            ))}
          </div>
          {choCham.length > 3 && (
            <p className="text-sm text-amber-800 font-semibold mt-3">… và {choCham.length - 3} bài nữa trong hàng chờ.</p>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-4 flex items-center gap-3 text-emerald-800 font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Không có bài tự luận nào chờ chấm.
        </div>
      ))}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((stat, idx) => (
          <Link href={stat.href || '#'} key={idx} className={`block bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden ${stat.href ? '' : 'pointer-events-none'}`}>
            {/* Background Decoration */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br ${stat.color} group-hover:scale-150 transition-transform duration-700`} />
            
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg ${stat.shadow} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <stat.icon className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className={`px-3 py-1.5 rounded-xl ${stat.bg} transition-colors`}>
                <Activity className={`w-4 h-4 opacity-70`} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-3xl xl:text-4xl font-black text-gray-800">
                {loading ? <span className="animate-pulse">...</span> : <CountUp end={stat.value} />}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              Lượt nộp bài 7 ngày qua
            </h2>
          </div>
          
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="Bài Nộp" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions & Glassmorphism Panel */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-teal-900/20">
          {/* Awesome Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-emerald-600 to-indigo-700"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

          <div className="relative z-10 p-8 h-full flex flex-col">
            <h2 className="text-2xl font-black text-white mb-2">Truy cập nhanh</h2>
            <p className="text-teal-100 text-sm mb-8 opacity-90 font-medium">Bảng điều khiển siêu tốc dành cho Quản trị viên</p>
            
            <div className="space-y-4 flex-1">
              {/* Cẩm nang để đầu và tô nổi: thầy cô mới vào là thấy ngay chỗ đọc hướng dẫn,
                  không phải mò tới nút ❓ trong trang soạn bài. */}
              <Link href="/admin/huong-dan" className="group flex items-center justify-between bg-amber-400/90 hover:bg-amber-300 p-4 rounded-2xl border border-amber-200/60 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-3 text-amber-950">
                  <div className="p-2 bg-white/40 rounded-xl group-hover:bg-white/60 transition-colors">
                    <BookOpenText className="w-5 h-5" />
                  </div>
                  <div className="leading-tight">
                    <span className="font-bold block">Cẩm nang hướng dẫn</span>
                    <span className="text-[11.5px] font-medium opacity-80">Soạn bài · Đứng lớp · Trò chơi · Điện thoại</span>
                  </div>
                </div>
              </Link>

              <Link href="/admin/cho-cham" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Chờ chấm tự luận</span>
                </div>
                {choCham.length > 0 && (
                  <span className="bg-amber-400 text-amber-950 text-xs font-black px-2.5 py-1 rounded-full shadow">{choCham.length}</span>
                )}
              </Link>

              <Link href="/admin/exam-results" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Chấm điểm Bài tập</span>
                </div>
              </Link>
              
              <Link href="/admin/finance" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Quản lý Tài chính</span>
                </div>
              </Link>

              <Link href="/admin/questions" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Ngân hàng Câu hỏi</span>
                </div>
              </Link>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-sm shadow-inner">
                  <span className="font-black text-white">AD</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Xin chào, Admin</p>
                  <p className="text-teal-100 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Hệ thống hoạt động tốt
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            Hoạt động mới nhất
          </h2>
          <Link href="/admin/exam-results" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            Xem tất cả
          </Link>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
               <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có hoạt động nào gần đây.</p>
          ) : (
            recentActivities.map((activity, i) => (
              <div key={activity.id} className="flex items-start gap-5 group">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-black border border-indigo-100 group-hover:scale-110 group-hover:shadow-md transition-all">
                    {activity.profiles?.full_name?.charAt(0) || "HS"}
                  </div>
                  {i !== recentActivities.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-100 mt-2"></div>
                  )}
                </div>
                <div className="pt-2 flex-1 pb-4">
                  <p className="text-base text-gray-800 font-medium">
                    <span className="font-bold text-indigo-900">{activity.profiles?.full_name || "Học sinh ẩn danh"}</span> vừa nộp bài 
                  </p>
                  <p className="text-sm text-gray-500 mt-1 font-medium bg-gray-50 inline-block px-3 py-1 rounded-lg border border-gray-100">
                    {activity.lessons?.title || "Bài tập không xác định"}
                  </p>
                  <p className="text-xs font-semibold text-gray-400 mt-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 
                    {new Date(activity.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
