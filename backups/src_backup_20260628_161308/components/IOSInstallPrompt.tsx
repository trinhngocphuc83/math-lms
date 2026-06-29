"use client";

import { useState, useEffect } from 'react';
import { Share, PlusSquare, AlertTriangle, Compass } from 'lucide-react';

export default function IOSInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra môi trường Client
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    
    // 2. Phát hiện thiết bị iOS
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // 3. Phát hiện chế độ Standalone (Đã cài App)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             ('standalone' in window.navigator && (window.navigator as any).standalone === true);
    setIsStandalone(isStandaloneMode);

    // 4. Phát hiện In-App Browser (Zalo, Facebook, Messenger, Instagram...)
    const inAppBrowsers = ['zalo', 'fbav', 'messenger', 'instagram', 'snapchat', 'line', 'viber'];
    const isInApp = inAppBrowsers.some(browser => ua.includes(browser));
    setIsInAppBrowser(isInApp);

    // Kiểm tra xem user đã đóng popup safari chưa (lưu session/local)
    const hasDismissed = sessionStorage.getItem('ios_prompt_dismissed');
    if (hasDismissed) {
      setDismissed(true);
    } else {
      // Chỉ hiện prompt cài đặt nếu là iOS, chưa cài App, và không phải In-App Browser
      if (isIOSDevice && !isStandaloneMode && !isInApp) {
        // Có thể delay một chút để không gây choáng ngợp
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('ios_prompt_dismissed', 'true');
  };

  // NẾU LÀ IN-APP BROWSER TRÊN IOS -> Khóa màn hình bắt buộc mở trình duyệt ngoài
  if (isIOS && isInAppBrowser && !isStandalone) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="bg-rose-500 p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-white mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white">Cảnh Báo Lỗi Trình Duyệt</h2>
          </div>
          <div className="p-6 text-center space-y-4">
            <p className="text-slate-600 font-medium">
              Bạn đang mở bằng Trình duyệt nội bộ của Zalo/Facebook.
            </p>
            <p className="text-sm text-slate-500 bg-rose-50 p-3 rounded-lg border border-rose-100">
              Trình duyệt này bị lỗi khi <b>Đăng Nhập</b> và không hỗ trợ <b>Tải App</b>.
            </p>
            
            <div className="pt-2">
              <p className="text-sm font-semibold text-slate-700 mb-2">Cách khắc phục:</p>
              <div className="flex items-center justify-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 mb-1">...</div>
                  <span className="text-xs text-slate-500">1. Nhấn nút 3 chấm</span>
                </div>
                <div className="text-slate-300">➜</div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                    <Compass className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs text-slate-500">2. Mở bằng Safari</span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mt-4">
              Vui lòng nhấp vào biểu tượng 3 chấm ở góc trên (hoặc dưới) màn hình.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // NẾU LÀ SAFARI VÀ CHƯA CÀI ĐẶT -> Hiện Popup hướng dẫn Cài App
  if (showPrompt && !dismissed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200 p-4 max-w-sm mx-auto animate-in slide-in-from-bottom-5 duration-500 relative">
          
          <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div className="flex items-start gap-3">
            <img src="/icon.svg" alt="Logo" className="w-12 h-12 rounded-xl bg-teal-50 p-1" />
            <div>
              <h3 className="font-bold text-slate-800">Tải App Toán Thầy Phúc</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Cài đặt ứng dụng vào màn hình chính để trải nghiệm mượt mà hơn.
              </p>
            </div>
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-600">
            Nhấn <Share className="w-5 h-5 text-blue-500" /> và chọn 
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <PlusSquare className="w-4 h-4" /> Thêm vào MH chính
            </span>
          </div>
          
          {/* Mũi tên chỉ xuống đáy màn hình */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 rotate-45"></div>
        </div>
      </div>
    );
  }

  return null;
}
