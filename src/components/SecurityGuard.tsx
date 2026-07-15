"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";

export default function SecurityGuard() {
  const [isBlackout, setIsBlackout] = useState(false);
  const [message, setMessage] = useState("");
  const [shouldBypass, setShouldBypass] = useState(false); // Default to secure until admin is confirmed
  const supabase = createClient();
  const pathname = usePathname();

  useEffect(() => {
    const checkRole = async (session: any) => {
      let bypass = false;
      if (session?.user) {
        // Query bảng profiles để lấy role chính xác nhất
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        const role = profile?.role || session.user.user_metadata?.role;
        const permissions = session.user.user_metadata?.permissions || [];
        
        if (role === 'admin') {
          bypass = true; // Admin master
        } else if (role === 'teacher' && permissions.length === 12) {
          bypass = true; // Teacher with full 12 permissions
        }
      }
      setShouldBypass(bypass);
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkRole(session);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkRole(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]); // Re-check when route changes just to be absolutely sure

  const triggerBlackout = useCallback((msg: string) => {
    setMessage(msg);
    setIsBlackout(true);
    
    // Xóa Clipboard
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText('');
      } else {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.value = ' ';
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
    } catch (err) {}
    
    // Tự động mở lại sau 5 giây
    setTimeout(() => {
      setIsBlackout(false);
    }, 5000);
  }, []);

  useEffect(() => {
    if (shouldBypass) return; // Không cài đặt sự kiện nếu được bypass

    // 1. Chặn chuột phải (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Chặn bôi đen (Select Start)
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Ngoại trừ các thẻ input và textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      e.preventDefault();
    };

    // 3. Chặn kéo thả (Drag Start)
    const handleDragStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'A') {
        e.preventDefault();
      }
    };

    // 4. Chặn phím tắt (PrintScreen, F12, Ctrl+P, Ctrl+C, Ctrl+S)
    const handleKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cắt Win+Shift+S (Snipping Tool) hoặc Cmd+Shift+4 (Mac)
      if (
        (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) || 
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        e.preventDefault();
        triggerBlackout("Phát hiện phím tắt Chụp ảnh màn hình!");
        return;
      }

      // PrintScreen Key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        triggerBlackout("Phát hiện hành vi Chụp ảnh màn hình! Dữ liệu đã bị xóa khỏi Clipboard.");
        return;
      }

      // Ctrl + P or Cmd + P (Print)
      if (cmdOrCtrl && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        alert("Tính năng in ấn (Ctrl+P) đã bị vô hiệu hóa để bảo vệ bản quyền.");
        return;
      }

      // Ctrl + S or Cmd + S (Save)
      if (cmdOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        alert("Tính năng lưu trang (Ctrl+S) đã bị vô hiệu hóa.");
        return;
      }

      // Ctrl + C or Cmd + C (Copy)
      if (cmdOrCtrl && (e.key === 'c' || e.key === 'C')) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          triggerBlackout("Hành vi sao chép văn bản bị nghiêm cấm trên hệ thống này!");
          return;
        }
      }

      // F12 or Ctrl+Shift+I or Cmd+Option+I (DevTools)
      if (
        e.key === 'F12' || 
        (cmdOrCtrl && e.shiftKey && (e.key === 'i' || e.key === 'I')) ||
        (cmdOrCtrl && e.shiftKey && (e.key === 'c' || e.key === 'C')) ||
        (cmdOrCtrl && e.shiftKey && (e.key === 'j' || e.key === 'J')) ||
        (cmdOrCtrl && e.key === 'u' || e.key === 'U') // View source
      ) {
        e.preventDefault();
        triggerBlackout("Hành vi soi mã nguồn bị từ chối!");
        return;
      }
    };

    // 5. Chống Snipping Tool (Bằng cách phát hiện mất focus)
    // Khi bật Snipping Tool (Win+Shift+S), trình duyệt sẽ bị mất Focus. Ta sẽ che đen ngay lập tức.
    const handleBlur = () => {
      // Dùng 1 thẻ div đè lên thay vì gọi triggerBlackout (vì triggerBlackout có timeout 5s)
      const overlay = document.createElement('div');
      overlay.id = 'anti-snipping-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = '#000';
      overlay.style.color = '#ef4444';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert mb-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        <h1 style="font-size: 24px; font-weight: bold; text-transform: uppercase;">Màn hình đã bị khóa</h1>
        <p style="margin-top: 10px; font-size: 16px; color: #ccc;">Trình duyệt mất tiêu điểm hoặc đang sử dụng công cụ chụp ảnh màn hình ngoài.</p>
        <p style="margin-top: 10px; font-size: 14px; color: #888;">Hãy click chuột vào đây để tiếp tục học.</p>
      `;
      if (!document.getElementById('anti-snipping-overlay')) {
        document.body.appendChild(overlay);
      }
    };

    const handleFocus = () => {
      const overlay = document.getElementById('anti-snipping-overlay');
      if (overlay) {
        document.body.removeChild(overlay);
      }
    };

    // Đăng ký sự kiện
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey); // Bắt cả keyup vì PrintScreen thường nổ ở keyup
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // CSS để chặn Print (Media Print) và User Select
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body { 
          display: none !important; 
        }
      }
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
      /* Prevent image downloading via long-press on mobile */
      img {
        -webkit-touch-callout: none;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    // Bắt sự kiện Print Media
    const beforePrint = () => {
      triggerBlackout("Hành vi In ấn bị từ chối!");
    };
    window.addEventListener("beforeprint", beforePrint);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeprint", beforePrint);
      document.head.removeChild(style);
      
      const overlay = document.getElementById('anti-snipping-overlay');
      if (overlay) document.body.removeChild(overlay);
    };
  }, [shouldBypass, triggerBlackout]);

  if (!isBlackout) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[99999] flex flex-col items-center justify-center text-white">
      <ShieldAlert className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
      <h1 className="text-3xl font-black text-red-500 uppercase mb-4 tracking-wider text-center px-4">
        Cảnh báo Bản quyền
      </h1>
      <p className="text-xl text-gray-300 font-medium text-center max-w-2xl px-4 leading-relaxed">
        {message}
      </p>
      <p className="text-sm text-gray-500 mt-8 animate-pulse">Hệ thống sẽ tự động khôi phục sau vài giây...</p>
    </div>
  );
}
