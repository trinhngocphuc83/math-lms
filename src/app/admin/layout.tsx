"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  List, 
  Settings, 
  ShieldAlert, 
  Users,
  LayoutDashboard,
  FileEdit,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  DollarSign,
  Library
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const adminMenu = [
    {
      group: "Tổng quan",
      items: [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Tài chính & Học phí", href: "/admin/finance", icon: DollarSign }
      ]
    },
    {
      group: "Quản lý Đào tạo",
      items: [
        { name: "Khối lớp & Danh mục", href: "/admin/categories", icon: List },
        { name: "Khóa học & Bài giảng", href: "/admin/courses", icon: BookOpen },
        { name: "Sổ Tay Công Thức", href: "/admin/handbook", icon: Library },
        { name: "Soạn bài bằng AI", href: "/admin/lessons/editor", icon: Sparkles },
        { name: "Lớp học (Classes)", href: "/admin/classes", icon: Users },
        { name: "Ngân hàng Câu hỏi", href: "/admin/questions", icon: FileEdit },
        { name: "Quản lý Đề thi", href: "/admin/exams", icon: LayoutDashboard },
        { name: "Kỳ thi Online", href: "/admin/online-exams", icon: ShieldAlert },
        { name: "Kết quả Thi Online", href: "/admin/online-exam-results", icon: GraduationCap },
        { name: "Kết quả Bài tập", href: "/admin/exam-results", icon: FileEdit },
      ]
    },
    {
      group: "Quản lý Người Dùng",
      items: [
        { name: "Học sinh & Phụ huynh", href: "/admin/users", icon: Users },
        { name: "Giáo viên", href: "/admin/teachers", icon: GraduationCap },
      ]
    },
    {
      group: "Hệ thống",
      items: [
        { name: "Cài đặt chung", href: "/admin/settings", icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Admin Sidebar (Màu Đen) với tính năng Thu gọn */}
      <aside 
        className={`${
          isCollapsed ? "w-[80px]" : "w-[260px]"
        } bg-zinc-900 text-zinc-300 flex flex-col transition-all duration-300 relative z-20`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-zinc-800 text-white p-1.5 rounded-full shadow-md border border-zinc-700 hover:bg-zinc-700 z-30 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 border-b border-white/10 flex items-center gap-3 text-white ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="bg-teal-500 p-2 rounded-lg flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg leading-tight whitespace-nowrap">Math LMS</h1>
              <p className="text-[10px] text-teal-400 font-semibold uppercase tracking-widest mt-1 whitespace-nowrap">Dashboard</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 pb-10 overflow-x-hidden no-scrollbar">
          {adminMenu.map((group, gIdx) => (
            <div key={gIdx} className="mb-6 px-4">
              {!isCollapsed && (
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2 whitespace-nowrap">
                  {group.group}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          isActive 
                            ? "bg-teal-600 text-white font-medium shadow-sm" 
                            : "hover:bg-white/5 hover:text-white"
                        } ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? item.name : ""}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col h-screen relative">
        {/* Topbar Admin */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">Khu vực Quản trị</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-800">Admin</p>
              <p className="text-xs text-gray-500">Quản lý tối cao</p>
            </div>
            <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold border-2 border-teal-200 cursor-pointer">
              AD
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 flex-1 bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
}
