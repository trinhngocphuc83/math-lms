"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Smartphone, ScanLine, ArrowRight, CameraOff, Loader2 } from "lucide-react";

/**
 * Vào phần điều khiển trình chiếu: quét mã QR hoặc gõ mã 6 ký tự.
 *
 * Trước đây chỉ vào được bằng cách quét QR bằng camera của điện thoại. Thầy cô mở app
 * lên thì không thấy đường nào vào cả - đây là chỗ vào đó.
 *
 * Quét mã theo HAI đường:
 *   - BarcodeDetector có sẵn trong trình duyệt (Android Chrome): nhanh, máy tự lo.
 *   - Không có thì đọc bằng jsQR ngay trong trang. iPhone/Safari KHÔNG có BarcodeDetector
 *     nên trước đây phần quét tự ẩn hẳn, Thầy cô cầm iPhone chỉ còn cách gõ tay 6 ký tự.
 *
 * Trên iPhone thẻ <video> BẮT BUỘC có playsInline và muted, thiếu là Safari bung video ra
 * toàn màn hình rồi play() văng lỗi.
 */

export default function VaoDieuKhien() {
  const router = useRouter();
  const [ma, setMa] = React.useState('');
  const [dangQuet, setDangQuet] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [quetDuoc, setQuetDuoc] = React.useState<boolean | null>(null);
  const video = React.useRef<HTMLVideoElement>(null);
  const dong = React.useRef<MediaStream | null>(null);
  const khungVe = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    /* Chỉ cần máy có camera là quét được: không có BarcodeDetector thì đã có jsQR. */
    setQuetDuoc(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
    return () => { dong.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const vao = (m: string) => {
    const s = m.trim().toUpperCase();
    if (s.length !== 6) { setLoi('Mã gồm đúng 6 ký tự.'); return; }
    router.push(`/admin/dieu-khien/${s}`);
  };

  /** Đọc được mã rồi thì tắt camera và đi tiếp; mã lạ thì báo chứ không đi đâu cả. */
  const nhanMaQuetDuoc = (chuTrongMa: string) => {
    dong.current?.getTracks().forEach(t => t.stop());
    dong.current = null;
    setDangQuet(false);
    /* Mã QR chứa cả đường dẫn - lấy đúng đoạn mã 6 ký tự trong đó. */
    const m = chuTrongMa.match(/dieu-khien\/([A-Z2-9]{6})/i);
    if (m) { router.push(`/admin/dieu-khien/${m[1].toUpperCase()}`); return; }
    setLoi('Mã này không phải mã điều khiển trình chiếu.');
  };

  const batQuet = async () => {
    setLoi(''); setDangQuet(true);
    try {
      const luong = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      dong.current = luong;
      if (video.current) {
        video.current.srcObject = luong;
        // iPhone cần hai thuộc tính này đặt THẲNG lên thẻ, đặt qua React thôi chưa chắc ăn
        video.current.setAttribute('playsinline', 'true');
        video.current.muted = true;
        await video.current.play();
      }

      /* Đường 1: máy có sẵn bộ đọc mã (Android Chrome). */
      const Bo = (window as any).BarcodeDetector;
      const boMay = Bo ? new Bo({ formats: ['qr_code'] }) : null;

      /* Đường 2: đọc bằng jsQR - dành cho iPhone/Safari và trình duyệt cũ. */
      const jsQR = boMay ? null : (await import('jsqr')).default;

      const doc = async () => {
        if (!video.current || !dong.current) return;
        try {
          if (boMay) {
            const kq = await boMay.detect(video.current);
            if (kq && kq[0]?.rawValue) { nhanMaQuetDuoc(String(kq[0].rawValue)); return; }
          } else if (jsQR && video.current.videoWidth > 0) {
            /* Thu nhỏ khung hình trước khi dò: đọc thẳng ảnh 1920px trên iPhone thì mỗi
               khung mất cả trăm mili-giây, camera giật và khó bắt được mã. */
            const rong = 480;
            const cao = Math.round(video.current.videoHeight * (rong / video.current.videoWidth));
            const khung = khungVe.current || (khungVe.current = document.createElement('canvas'));
            khung.width = rong; khung.height = cao;
            const ve = khung.getContext('2d', { willReadFrequently: true });
            if (ve) {
              ve.drawImage(video.current, 0, 0, rong, cao);
              const anh = ve.getImageData(0, 0, rong, cao);
              const kq = jsQR(anh.data, rong, cao, { inversionAttempts: 'dontInvert' });
              if (kq?.data) { nhanMaQuetDuoc(kq.data); return; }
            }
          }
        } catch { /* khung này không đọc được thì thử khung sau */ }
        requestAnimationFrame(doc);
      };
      requestAnimationFrame(doc);
    } catch {
      setLoi('Không mở được camera. Thầy cô gõ mã bằng tay bên dưới nhé.');
      setDangQuet(false);
    }
  };

  return (
    <div className="max-w-[520px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-black text-gray-800 leading-tight">Điều khiển trình chiếu</h1>
          <p className="text-[13px] text-gray-500">Dùng điện thoại bấm chuyển slide, gọi tên, cộng điểm</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-[13.5px] text-gray-500 leading-relaxed mb-3">
          Mở bài giảng trên máy tính → bấm nút <b>📱</b> ở thanh điều khiển → quét mã QR
          hiện ra, hoặc gõ mã 6 ký tự vào đây.
        </p>

        {dangQuet ? (
          <div className="rounded-2xl overflow-hidden bg-black relative">
            <video ref={video} playsInline muted className="w-full aspect-square object-cover" />
            <div className="absolute inset-8 border-4 border-white/70 rounded-2xl pointer-events-none" />
            <button onClick={() => {
                      dong.current?.getTracks().forEach(t => t.stop());
                      dong.current = null; setDangQuet(false);
                    }}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full
                               bg-white/90 text-slate-800 font-bold text-[13px]">
              Dừng quét
            </button>
          </div>
        ) : quetDuoc ? (
          <button onClick={batQuet}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl
                             text-[16px] flex items-center justify-center gap-2.5 transition-colors">
            <ScanLine className="w-6 h-6" /> Quét mã QR
          </button>
        ) : quetDuoc === false ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[12.5px] flex items-center gap-2">
            <CameraOff className="w-4 h-4 shrink-0" />
            Máy này không có camera dùng được — Thầy cô gõ mã 6 ký tự bên dưới nhé.
          </div>
        ) : (
          <div className="py-3 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        )}

        <div className="mt-4">
          <label className="block text-[11.5px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
            Hoặc gõ mã 6 ký tự
          </label>
          <div className="flex gap-2">
            <input
              value={ma}
              onChange={e => { setMa(e.target.value.toUpperCase().slice(0, 6)); setLoi(''); }}
              onKeyDown={e => { if (e.key === 'Enter') vao(ma); }}
              placeholder="K7MP2Q"
              inputMode="text"
              autoCapitalize="characters"
              className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-indigo-500
                         outline-none text-[22px] font-black tracking-[0.22em] text-center font-mono uppercase
                         placeholder:text-gray-300"
            />
            <button onClick={() => vao(ma)} disabled={ma.length !== 6}
                    className="px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                               text-white font-black flex items-center transition-colors">
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
          {loi && <p className="text-[12.5px] text-rose-600 font-bold mt-2">{loi}</p>}
        </div>
      </div>
    </div>
  );
}
