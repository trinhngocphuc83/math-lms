"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Library,
  ChevronUp,
  ChevronDown,
  X,
  Menu, Smartphone, ClipboardList } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [userName, setUserName] = useState("Admin");
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  /* Trên điện thoại, thanh bên chuyển thành ngăn kéo trượt (drawer) thay vì luôn
     chiếm chỗ. Trước đây <aside> luôn rộng 80px kể cả trên máy 390px, cộng với
     lề nội dung p-8 (32px mỗi bên) nên chỉ còn ~246px để hiển thị - chữ và nút
     bị vỡ dòng liên tục. */
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        /*
         * Vai trò lấy từ bảng profiles, không lấy từ user_metadata.
         *
         * Đo trên dữ liệu thật: tài khoản "Quản trị viên" có profiles.role = 'admin' nhưng
         * user_metadata KHÔNG có role - đó là lý do bản cũ phải viết `|| 'admin'`, mà cái
         * mặc định đó lại mở cửa cho mọi tài khoản thiếu vai trò. profiles là nơi giữ vai
         * trò thật; đọc hỏng thì mới lùi về user_metadata, thiếu cả hai thì không có quyền.
         */
        const { data: hoSo } = await supabase
          .from('profiles').select('role').eq('id', session.user.id).single();
        const role = hoSo?.role || session.user.user_metadata?.role || '';
        setUserRole(role);
        setUserPermissions(session.user.user_metadata?.permissions || []);
        setUserName(session.user.user_metadata?.full_name || (role === 'admin' ? 'Admin' : 'Giáo viên'));

        /*
         * Chỉ admin và giáo viên mới được vào khu Quản trị.
         *
         * Bản cũ chỉ có đúng một câu chặn cho 'teacher', nên tài khoản học sinh đi thẳng
         * qua: đăng nhập bằng tài khoản học sinh rồi gõ /admin/lessons/editor là vào được
         * và đọc được nội dung bài soạn (đã thử trên máy, 94 tài khoản học sinh đều vậy).
         *
         * Máy chủ cũng chặn ở middleware; chặn thêm ở đây để lỡ đường nào lọt qua thì trang
         * cũng không dựng ra.
         */
        if (role !== 'admin' && role !== 'teacher') {
          router.replace('/student/dashboard');
          return;
        }

        // Simple Route Protection
        if (role === 'teacher' && pathname !== '/admin/dashboard') {
           const allowed = session.user.user_metadata?.permissions || [];
           const isProtectedPath = !allowed.some((p: string) => pathname.startsWith(p));
           // Settings and Teachers are strictly forbidden
           if (pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/teachers') || (isProtectedPath && pathname !== '/admin/dashboard')) {
             router.push('/admin/dashboard');
           }
        }
      } else {
        router.push('/');
      }
      setIsSessionLoading(false);
    };
    initSession();
  }, [pathname, router]);

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
        { name: "Ôn tập & Kiểm tra", href: "/admin/on-tap", icon: ClipboardList },
        { name: "Điều khiển trình chiếu", href: "/admin/dieu-khien", icon: Smartphone },
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
        { name: "Cài đặt Cổng A.I", href: "/admin/settings/ai-keys", icon: Sparkles },
      ]
    }
  ];

  // Filter Menu Items Based on RBAC
  const filteredMenu = adminMenu.map(group => {
    return {
      ...group,
      items: group.items.filter(item => {
        if (userRole === 'admin') return true;
        if (item.name === 'Dashboard') return true;
        // Strictly block for teachers
        if (item.href.startsWith('/admin/settings') || item.href === '/admin/teachers') return false;
        // Check permissions array
        return userPermissions.includes(item.href);
      })
    };
  }).filter(group => group.items.length > 0);

  // Bấm vào một mục là sang trang khác -> tự đóng ngăn kéo
  useEffect(() => { setIsMobileNavOpen(false); }, [pathname]);

  // Mở ngăn kéo thì khoá cuộn nền để không bị trôi trang phía sau
  useEffect(() => {
    if (!isMobileNavOpen) return;
    const cu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = cu; };
  }, [isMobileNavOpen]);

  if (isSessionLoading) return <div className="h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>;

  /* flex-1 min-w-0: <body> là một khung flex, khối này không ghi flex-1 thì nó co theo
     nội dung. Đo trên màn 1366: cả khu quản trị chỉ rộng 823px, dư hơn 500px trống bên
     phải ở MỌI trang, chứ không riêng trang nào. */
  return (
    <div className="flex flex-1 min-w-0 h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Nền mờ phía sau ngăn kéo - chỉ có trên điện thoại */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Admin Sidebar: ngăn kéo trượt trên điện thoại, cột cố định từ tablet trở lên */}
      <aside
        className={`bg-zinc-900 text-zinc-300 flex flex-col transition-transform duration-300 z-50
          fixed inset-y-0 left-0 w-[262px] ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:z-20 md:transition-all
          ${isCollapsed ? "md:w-[80px]" : "md:w-[260px]"}`}
      >
        {/* Nút thu gọn - chỉ dùng ở desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:block absolute -right-3 top-6 bg-zinc-800 text-white p-1.5 rounded-full shadow-md border border-zinc-700 hover:bg-zinc-700 z-30 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Nút đóng ngăn kéo - chỉ trên điện thoại */}
        <button
          onClick={() => setIsMobileNavOpen(false)}
          className="md:hidden absolute right-3 top-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`p-6 border-b border-white/10 flex items-center gap-3 text-white ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}>
          <div className="bg-teal-500 p-2 rounded-lg flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {/* Trên điện thoại luôn hiện chữ; chỉ ẩn khi thu gọn ở desktop */}
          <div className={`overflow-hidden ${isCollapsed ? 'md:hidden' : ''}`}>
            <h1 className="font-bold text-lg leading-tight whitespace-nowrap">Math LMS</h1>
            <p className="text-[10px] text-teal-400 font-semibold uppercase tracking-widest mt-1 whitespace-nowrap">Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 pb-10 overflow-x-hidden no-scrollbar">
          {filteredMenu.map((group, gIdx) => (
            <div key={gIdx} className="mb-6 px-4">
              <p className={`text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2 whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}>
                {group.group}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/admin/dashboard');
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          isActive 
                            ? "bg-teal-600 text-white font-medium shadow-sm" 
                            : "hover:bg-white/5 hover:text-white"
                        } ${isCollapsed ? 'md:justify-center' : ''}`}
                        title={isCollapsed ? item.name : ""}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className={`whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
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
        {!isTopbarHidden && (
          <header className="bg-white border-b border-gray-200 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm transition-all">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Nút mở menu - chỉ trên điện thoại */}
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="md:hidden p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Mở menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-base sm:text-xl font-bold text-gray-800 truncate">Khu vực Quản trị</h2>
              <button onClick={() => setIsTopbarHidden(true)} className="hidden sm:block p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors shrink-0" title="Thu gọn Topbar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">{userRole === 'admin' ? 'Quản lý tối cao' : 'Giáo viên'}</p>
              </div>
              <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold border-2 border-teal-200 cursor-pointer">
                {userName.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </header>
        )}
        
        {isTopbarHidden && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
            <button onClick={() => setIsTopbarHidden(false)} className="bg-white border border-t-0 border-gray-200 px-6 py-1 rounded-b-xl shadow-md text-gray-400 hover:text-gray-600 transition-all hover:pt-2 flex items-center justify-center" title="Mở rộng Topbar">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        {/* Lề nội dung: trên điện thoại chỉ 12px thay vì 32px để nhường bề ngang cho bảng/thẻ */}
        <div className={`flex-1 bg-gray-50 ${(pathname.includes('/editor') || pathname.includes('/edit')) ? 'p-0' : 'p-3 sm:p-5 lg:p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
