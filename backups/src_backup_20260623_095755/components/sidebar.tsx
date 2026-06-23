"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CalendarCheck, 
  MonitorPlay,
  Database,
  FileQuestion,
  FileEdit,
  FileText,
  Sigma,
  ClipboardList
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuGroups = [
    {
      title: "QUẢN LÝ ĐÀO TẠO",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Lớp học", href: "/classes", icon: BookOpen },
        { name: "Học sinh", href: "/students", icon: Users },
        { name: "Điểm danh", href: "/attendance", icon: CalendarCheck },
      ]
    },
    {
      title: "HỌC LIỆU & THI CỬ",
      items: [
        { name: "Khóa học & Bài giảng", href: "/courses", icon: MonitorPlay },
        { name: "Ngân hàng đề", href: "/exams", icon: Database },
        { name: "Ngân hàng câu hỏi", href: "/questions", icon: FileQuestion },
        { name: "Tạo đề từ ngân hàng", href: "/create-exam", icon: FileEdit },
        { name: "Tạo đề PDF", href: "/create-pdf", icon: FileText },
        { name: "Tạo đề LaTeX", href: "/create-latex", icon: Sigma },
        { name: "Phiếu Bài Tập", href: "/worksheets", icon: ClipboardList },
      ]
    }
  ];

  return (
    <aside className="w-[260px] min-w-[260px] bg-sidebar flex flex-col h-full text-sidebar-foreground">
      {/* Logo Area */}
      <div className="p-6 flex items-center space-x-3 border-b border-white/5">
        <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-sidebar" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">EduCenter</h1>
          <p className="text-[10px] text-white/70 uppercase font-medium tracking-wider mt-0.5">Hệ thống quản lý</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h2 className="text-[11px] font-semibold text-white/50 mb-3 px-3 uppercase tracking-wider">
              {group.title}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={itemIdx}>
                    <Link 
                      href={item.href}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm" 
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
