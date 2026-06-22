"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, GraduationCap, TrendingUp, Calendar, Clock, Activity, Target } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalUsers: 0,
    activeExams: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
        
      setStats({
        totalCourses: coursesCount || 0,
        totalUsers: 245,
        activeExams: 12,
      });
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { title: "Tổng Số Khóa Học", value: stats.totalCourses, icon: BookOpen, color: "bg-teal-500", shadow: "shadow-teal-500/30", trend: "+12% so với tháng trước" },
    { title: "Học Sinh Đang Học", value: stats.totalUsers, icon: Users, color: "bg-blue-500", shadow: "shadow-blue-500/30", trend: "+5% so với tháng trước" },
    { title: "Kỳ Thi Đang Mở", value: stats.activeExams, icon: Target, color: "bg-rose-500", shadow: "shadow-rose-500/30", trend: "+2 kỳ thi mới" },
    { title: "Tỷ Lệ Hoàn Thành", value: "86%", icon: TrendingUp, color: "bg-violet-500", shadow: "shadow-violet-500/30", trend: "+4% so với tháng trước" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tổng Quan Hệ Thống</h1>
          <p className="text-gray-500">Chào mừng bạn trở lại với Math LMS Dashboard</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg ${stat.shadow} transform group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div className="bg-gray-50 px-2.5 py-1 rounded-lg">
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-3xl font-black text-gray-800">{stat.value}</h3>
              <p className="text-xs font-medium text-emerald-600 mt-2 bg-emerald-50 inline-block px-2 py-1 rounded-md">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <GraduationCap className="text-teal-600" /> Hoạt động học tập gần đây
          </h2>
          <div className="space-y-6">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-start gap-4 pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold">
                  HS
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Học sinh Nguyễn Văn A đã hoàn thành bài tập</p>
                  <p className="text-sm text-gray-500 mt-1">Đại số cơ bản - Bài 1: Phương trình bậc nhất</p>
                  <p className="text-xs font-medium text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {i * 2 + 1} giờ trước
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-lg shadow-teal-500/20 p-8 text-white">
          <h2 className="text-xl font-bold mb-2">Truy cập nhanh</h2>
          <p className="text-teal-50 text-sm mb-8 opacity-90">Quản lý hệ thống nhanh chóng bằng các liên kết dưới đây.</p>
          
          <div className="space-y-3">
            <Link href="/admin/courses" className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-xl backdrop-blur-sm transition-colors border border-white/10">
              <span className="font-semibold">Quản lý Khóa học</span>
              <BookOpen className="w-5 h-5 opacity-70" />
            </Link>
            <Link href="/questions" className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-xl backdrop-blur-sm transition-colors border border-white/10">
              <span className="font-semibold">Ngân hàng Câu hỏi</span>
              <Target className="w-5 h-5 opacity-70" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
