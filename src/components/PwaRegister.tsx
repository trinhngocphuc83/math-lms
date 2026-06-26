"use client";
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('PWA Service Worker registered successfully', registration.scope);
            
            // Lắng nghe bản cập nhật mới
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('Bản cập nhật mới đã sẵn sàng.');
                    // Nếu cần có thể trigger một event để UI hiện nút "Cập nhật ngay"
                  }
                });
              }
            });
          },
          function(err) {
            console.log('PWA Service Worker registration failed: ', err);
          }
        );
      });

      // Làm mới trang khi SW mới chiếm quyền điều khiển (được activate)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);
  
  return null;
}
