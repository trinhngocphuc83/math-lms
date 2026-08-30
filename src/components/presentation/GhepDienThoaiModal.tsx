"use client";

import React from "react";
import QRCode from "qrcode";
import { X, Smartphone, Check, Copy } from "lucide-react";

/**
 * Ghép điện thoại vào buổi trình chiếu.
 *
 * Địa chỉ trong mã QR dựng từ chính `window.location.origin`, nên chạy trên Vercel hay
 * chạy ở máy nhà đều ra đúng địa chỉ, không phải cấu hình gì thêm.
 *
 * Vẫn hiện MÃ 6 KÝ TỰ gõ tay bên cạnh: lớp học tối, camera cũ, hay điện thoại không mở
 * được app quét thì vẫn vào được.
 */
export default function GhepDienThoaiModal({
  isOpen, onClose, ma, lessonId, moduleId, daNoi,
}: {
  isOpen: boolean;
  onClose: () => void;
  ma: string;
  lessonId?: string;
  moduleId?: string;
  /** Điện thoại đã kết nối chưa - để báo cho Thầy cô biết mà cất máy đi */
  daNoi: boolean;
}) {
  const [anhQR, setAnhQR] = React.useState('');
  const [daChep, setDaChep] = React.useState(false);

  const duongDan = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const t = new URLSearchParams();
    if (lessonId) t.set('bai', lessonId);
    if (moduleId) t.set('muc', moduleId);
    return `${window.location.origin}/admin/dieu-khien/${ma}?${t.toString()}`;
  }, [ma, lessonId, moduleId]);

  React.useEffect(() => {
    if (!isOpen || !duongDan) return;
    QRCode.toDataURL(duongDan, { width: 460, margin: 1, errorCorrectionLevel: 'M' })
      .then(setAnhQR)
      .catch(() => setAnhQR(''));
  }, [isOpen, duongDan]);

  React.useEffect(() => {
    if (!isOpen) return;
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-[520px] rounded-3xl shadow-2xl overflow-hidden">

        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-white shrink-0" />
          <h2 className="text-[17px] font-black text-white flex-1">Dùng điện thoại điều khiển</h2>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {daNoi ? (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="text-[18px] font-black text-emerald-800">Điện thoại đã kết nối</p>
              <p className="text-[13.5px] text-emerald-700 mt-1">
                Thầy cô đóng khung này lại và điều khiển từ điện thoại được rồi.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[13.5px] text-slate-500 text-center mb-4 leading-relaxed">
                Mở camera điện thoại quét mã dưới đây. Lần đầu sẽ hỏi đăng nhập — dùng đúng
                tài khoản của Thầy cô.
              </p>

              <div className="flex justify-center">
                {anhQR ? (
                  <img src={anhQR} alt="Mã QR" className="w-[240px] h-[240px] rounded-2xl border-4 border-slate-100" />
                ) : (
                  <div className="w-[240px] h-[240px] rounded-2xl bg-slate-100 animate-pulse" />
                )}
              </div>

              <div className="mt-5 text-center">
                <div className="text-[11.5px] font-black text-slate-400 uppercase tracking-wider">
                  Hoặc gõ tay mã này
                </div>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="text-[34px] font-black text-slate-800 tracking-[0.25em] font-mono">
                    {ma}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(duongDan).then(() => {
                        setDaChep(true);
                        setTimeout(() => setDaChep(false), 2000);
                      }).catch(() => { /* trình duyệt chặn thì thôi */ });
                    }}
                    title="Chép địa chỉ để gửi qua Zalo cho chính mình"
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                    {daChep ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[12px] text-slate-400 mt-2">
                  vào <b>{typeof window !== 'undefined' ? window.location.host : ''}</b> →
                  Điều khiển → gõ mã
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
