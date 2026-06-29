"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CalendarCheck, 
  FileQuestion,
  FileEdit,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings
} from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNav = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Lớp học", href: "/classes", icon: BookOpen },
    { name: "Học sinh", href: "/students", icon: Users },
    { name: "Điểm danh", href: "/attendance", icon: CalendarCheck },
  ];

  const contentNav = [
    { name: "Khóa học & Bài giảng", href: "/courses", icon: BookOpen },
    { name: "Ngân hàng đề", href: "/bank", icon: FileQuestion },
    { name: "Ngân hàng câu hỏi", href: "/questions", icon: FileQuestion },
    { name: "Tạo đề từ ngân hàng", href: "/generate", icon: FileEdit },
    { name: "Tạo đề PDF", href: "/pdf", icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-[#f4f9f8] font-sans">
      {/* Sidebar Học sinh/Giáo viên */}
      <aside 
        className={`${
          isCollapsed ? "w-[80px]" : "w-[260px]"
        } bg-[#0f6f60] text-white flex flex-col transition-all duration-300 relative`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-white text-[#0f6f60] p-1.5 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 z-10"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <div className={`p-6 flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="bg-white text-[#0f6f60] p-2 rounded-xl flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-xl whitespace-nowrap">Math LMS</h1>
              <p className="text-xs text-teal-100 whitespace-nowrap">HỆ THỐNG QUẢN LÝ</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 pb-10 overflow-x-hidden no-scrollbar">
          {/* Main Nav */}
          <div className="px-4 mb-6">
            {!isCollapsed && <p className="text-xs font-bold text-teal-600/50 uppercase tracking-wider mb-4 px-2">Quản lý đào tạo</p>}
            <ul className="space-y-1">
              {mainNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? "bg-white/10 text-white font-semibold shadow-inner" 
                          : "text-teal-50 hover:bg-white/5"
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

          {/* Content Nav */}
          <div className="px-4 mb-6">
            {!isCollapsed && <p className="text-xs font-bold text-teal-600/50 uppercase tracking-wider mb-4 px-2">Học liệu & Thi cử</p>}
            <ul className="space-y-1">
              {contentNav.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? "bg-white/10 text-white font-semibold shadow-inner" 
                          : "text-teal-50 hover:bg-white/5"
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
        </nav>

        {/* Settings at the bottom */}
        <div className="p-4 mt-auto border-t border-white/10">
          <Link 
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              pathname === "/settings" 
                ? "bg-white/10 text-white font-semibold shadow-inner" 
                : "text-teal-50 hover:bg-white/5"
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Cài đặt tài khoản" : ""}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Cài đặt tài khoản</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
