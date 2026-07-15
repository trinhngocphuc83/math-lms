"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert } from "lucide-react";

export default function SecurityGuard() {
  const [isBlackout, setIsBlackout] = useState(false);
  const [message, setMessage] = useState("");

  const triggerBlackout = useCallback((msg: string) => {
    setMessage(msg);
    setIsBlackout(true);
    
    // Xóa Clipboard
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText('');
      } else {
        // Fallback for older browsers
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
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

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

    // Cảnh báo thêm với Mac (Cmd + Shift + 4/3/5 cho screenshot)
    // Trình duyệt không bắt được phím tắt hệ thống của Mac, nhưng việc focus mất có thể là 1 dấu hiệu
    // Tuy nhiên nó có thể gây false positive nên ta chỉ dùng các phím cơ bản.

    // Đăng ký sự kiện
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKeyDown);

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

    // Bắt sự kiện Print Media (Đôi khi user bấm print menu từ trình duyệt)
    const beforePrint = () => {
      triggerBlackout("Hành vi In ấn bị từ chối!");
    };
    window.addEventListener("beforeprint", beforePrint);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeprint", beforePrint);
      document.head.removeChild(style);
    };
  }, [triggerBlackout]);

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
