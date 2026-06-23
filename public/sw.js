self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Service Worker tối giản nhất để thoả điều kiện PWA
  // Trình duyệt sẽ nhận diện đây là PWA hợp lệ
});
