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
 * Quét bằng BarcodeDetector có sẵn trong trình duyệt, KHÔNG thêm thư viện. Máy nào không
 * có (iPhone, trình duyệt cũ) thì phần quét tự ẩn, gõ tay vẫn vào bình thường.
 */

export default function VaoDieuKhien() {
  const router = useRouter();
  const [ma, setMa] = React.useState('');
  const [dangQuet, setDangQuet] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [quetDuoc, setQuetDuoc] = React.useState<boolean | null>(null);
  const video = React.useRef<HTMLVideoElement>(null);
  const dong = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    setQuetDuoc(typeof window !== 'undefined' && 'BarcodeDetector' in window);
    return () => { dong.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const vao = (m: string) => {
    const s = m.trim().toUpperCase();
    if (s.length !== 6) { setLoi('Mã gồm đúng 6 ký tự.'); return; }
    router.push(`/admin/dieu-khien/${s}`);
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
        await video.current.play();
      }

      const Bo = (window as any).BarcodeDetector;
      const bo = new Bo({ formats: ['qr_code'] });

      const doc = async () => {
        if (!video.current || !dong.current) return;
        try {
          const kq = await bo.detect(video.current);
          if (kq && kq[0]?.rawValue) {
            /* Mã QR chứa cả đường dẫn - lấy đúng đoạn mã 6 ký tự trong đó. */
            const m = String(kq[0].rawValue).match(/dieu-khien\/([A-Z2-9]{6})/i);
            dong.current.getTracks().forEach(t => t.stop());
            dong.current = null;
            if (m) { router.push(`/admin/dieu-khien/${m[1].toUpperCase()}`); return; }
            setLoi('Mã này không phải mã điều khiển trình chiếu.');
            setDangQuet(false);
            return;
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
            Máy này không quét được trong app — Thầy cô dùng camera của điện thoại quét mã
            QR, hoặc gõ mã bên dưới.
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
