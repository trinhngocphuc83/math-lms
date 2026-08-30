"use client";

// Đồng hồ đếm ngược cho tiết dạy, hiện ở góc DƯỚI phải trong khung slide.
//
// Dùng khi cho học sinh làm câu hỏi tương tác hoặc ví dụ mẫu: thầy đặt giờ ngay
// trên màn hình đang chiếu (bấm phím T, bấm nhanh 1/2/3/5 phút, gõ bàn phím, hoặc
// bấm micro rồi nói "hai phút"), 10 giây cuối có tiếng bíp báo để cả lớp biết sắp hết giờ.
//
// Đặt absolute TRONG canvas 1600x900 (không dùng fixed theo màn hình) để đồng hồ
// co giãn cùng slide khi phóng to/thu nhỏ cửa sổ.
//
// Vì sao nằm ở GÓC DƯỚI: trước đây để góc trên, nhưng thanh điều khiển trình chiếu
// (tên bài, số slide, nút phóng to) nằm đè lên đỉnh màn hình nên vừa bấm mở bảng đặt
// giờ là bị thanh đó che mất. Chuyển xuống dưới và cho bảng bung LÊN TRÊN thì tránh
// được cả thanh trên lẫn mép dưới canvas.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Mic, Play, Pause, RotateCcw, X, Volume2, VolumeX, Loader2 } from "lucide-react";
import { docThoiLuongTiengViet, dinhDangMMSS } from "@/utils/parseVietnameseDuration";

const MOC_CANH_BAO = 10; // giây cuối bắt đầu bíp

export default function PresentationTimer({ lenhNgoai, onDoi }: {
  /** Lệnh đặt giờ bấm từ điện thoại; `dem` tăng mỗi lần bấm nên bấm lại là chạy lại. */
  lenhNgoai?: { viec: string; phut?: number; dem: number; luc: number } | null;
  /** Báo số giây còn lại ra ngoài để máy chiếu phát xuống điện thoại */
  onDoi?: (conLai: number) => void;
} = {}) {
  const [dangMoBang, setDangMoBang] = useState(false);
  const [tongGiay, setTongGiay] = useState(0);      // thời lượng đã đặt
  const [conLai, setConLai] = useState(0);          // giây còn lại
  const [dangChay, setDangChay] = useState(false);
  const [tatTieng, setTatTieng] = useState(false);
  const [dangNgheMic, setDangNgheMic] = useState(false);
  const [loiMic, setLoiMic] = useState("");
  const [nhapPhut, setNhapPhut] = useState("");
  const [nhapGiay, setNhapGiay] = useState("");

  // Mốc thời gian thực để không bị trôi khi trình duyệt giảm nhịp lúc chuyển tab
  const mocKetThucRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const giayDaBipRef = useRef<number | null>(null);
  const nhanDangRef = useRef<any>(null);

  const hoTroMic = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  /** Tạo tiếng bíp bằng Web Audio, không cần file âm thanh. */
  const bip = useCallback((tanSo: number, thoiLuong: number) => {
    if (tatTieng) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current!;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = tanSo;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + thoiLuong);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + thoiLuong + 0.02);
    } catch {
      // Trình duyệt chặn âm thanh thì bỏ qua, đồng hồ vẫn chạy
    }
  }, [tatTieng]);

  // Vòng đếm: tính theo mốc kết thúc thật nên chuyển tab quay lại vẫn đúng giờ
  useEffect(() => {
    if (!dangChay) return;
    const id = setInterval(() => {
      const moc = mocKetThucRef.current;
      if (moc === null) return;
      const conLaiMoi = Math.max(0, Math.ceil((moc - Date.now()) / 1000));
      setConLai(conLaiMoi);

      if (conLaiMoi > 0 && conLaiMoi <= MOC_CANH_BAO && giayDaBipRef.current !== conLaiMoi) {
        giayDaBipRef.current = conLaiMoi;
        bip(880, 0.12);
      }
      if (conLaiMoi === 0) {
        setDangChay(false);
        mocKetThucRef.current = null;
        bip(520, 0.9); // hết giờ: tiếng trầm và dài hơn
      }
    }, 200);
    return () => clearInterval(id);
  }, [dangChay, bip]);

  const batDau = (giay: number) => {
    if (!giay || giay <= 0) return;
    setTongGiay(giay);
    setConLai(giay);
    giayDaBipRef.current = null;
    mocKetThucRef.current = Date.now() + giay * 1000;
    setDangChay(true);
    setDangMoBang(false);
    // Chạm vào âm thanh ngay lúc có thao tác bấm để trình duyệt cho phép phát về sau
    if (!tatTieng) bip(660, 0.06);
  };

  const tamDung = () => {
    if (dangChay) {
      setDangChay(false);
      mocKetThucRef.current = null;
    } else if (conLai > 0) {
      mocKetThucRef.current = Date.now() + conLai * 1000;
      setDangChay(true);
    }
  };

  const datLai = () => {
    setDangChay(false);
    mocKetThucRef.current = null;
    setConLai(0);
    setTongGiay(0);
    giayDaBipRef.current = null;
  };

  const batDauTuONhap = () => {
    const p = parseInt(nhapPhut || '0', 10) || 0;
    const g = parseInt(nhapGiay || '0', 10) || 0;
    batDau(p * 60 + g);
  };

  /** Bấm micro rồi nói thời lượng. Chỉ hiện nút này nếu trình duyệt hỗ trợ. */
  const ngheMic = () => {
    const Nhan = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Nhan) return;
    setLoiMic("");
    try {
      const nd = new Nhan();
      nhanDangRef.current = nd;
      nd.lang = 'vi-VN';
      nd.interimResults = false;
      nd.maxAlternatives = 3;

      nd.onstart = () => setDangNgheMic(true);
      nd.onerror = (e: any) => {
        setDangNgheMic(false);
        setLoiMic(e?.error === 'not-allowed' ? 'Chưa cho phép dùng micro' : 'Không nghe được, thử lại');
      };
      nd.onend = () => setDangNgheMic(false);
      nd.onresult = (e: any) => {
        // Duyệt các phương án nhận dạng, lấy phương án đầu tiên đọc ra được thời lượng
        for (let i = 0; i < e.results[0].length; i++) {
          const cau = e.results[0][i].transcript;
          const giay = docThoiLuongTiengViet(cau);
          if (giay) { batDau(giay); return; }
        }
        setLoiMic(`Chưa hiểu "${e.results[0][0]?.transcript || ''}", nói lại nhé`);
      };

      nd.start();
    } catch {
      setLoiMic('Không mở được micro');
    }
  };

  // Phím tắt T: mở nhanh bảng đặt giờ (khi chưa đặt) hoặc tạm dừng / chạy tiếp (khi đang chạy),
  // đúng như bấm vào nút. Esc để đóng bảng. Bỏ qua khi con trỏ đang ở trong ô nhập, nếu không
  // gõ số phút xong bấm phải chữ nào cũng làm đồng hồ nhảy lung tung.
  useEffect(() => {
    const dangGoTrongO = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const the = el?.tagName;
      return the === 'INPUT' || the === 'TEXTAREA' || the === 'SELECT' || !!el?.isContentEditable;
    };
    const batPhim = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || dangGoTrongO(e)) return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (tongGiay > 0) tamDung();
        else setDangMoBang((v) => !v);
      } else if (e.key === 'Escape' && dangMoBang) {
        setDangMoBang(false);
      }
    };
    window.addEventListener('keydown', batPhim);
    return () => window.removeEventListener('keydown', batPhim);
  }, [tongGiay, dangChay, conLai, dangMoBang]);

  /* Nhận lệnh đặt giờ từ điện thoại.
     Khởi đầu bộ đếm bằng ĐÚNG số lệnh hiện có chứ không phải 0: đồng hồ được dựng lại
     mỗi lần sang slide (có `key`), nếu đếm từ 0 thì vừa sang slide mới là nó tưởng có
     lệnh chưa làm và tự bấm giờ lại. */
  const demDaLam = useRef(
    /* Lệnh vừa bấm xong (dưới 3 giây) thì để 0 cho hiệu ứng bên dưới chạy: slide thường
       vốn không có đồng hồ, lệnh đặt giờ từ điện thoại làm đồng hồ mọc ra - nó dựng mới
       nên nếu ghi luôn số lệnh hiện tại thì tưởng đã làm rồi, bấm mà không thấy gì. */
    lenhNgoai && Date.now() - lenhNgoai.luc < 3000 ? 0 : (lenhNgoai?.dem ?? 0)
  );
  useEffect(() => {
    if (!lenhNgoai || lenhNgoai.dem === demDaLam.current) return;
    demDaLam.current = lenhNgoai.dem;
    if (lenhNgoai.viec === 'dat-gio') batDau(Math.round((lenhNgoai.phut || 0) * 60));
    else if (lenhNgoai.viec === 'dung-gio') datLai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenhNgoai]);

  useEffect(() => {
    onDoi?.(dangChay ? conLai : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conLai, dangChay]);

  const sapHet = dangChay && conLai > 0 && conLai <= MOC_CANH_BAO;
  const hetGio = tongGiay > 0 && conLai === 0 && !dangChay;

  return (
    // flex-col-reverse: nút nằm dưới cùng, bảng đặt giờ bung NGƯỢC LÊN TRÊN nút
    <div className="absolute bottom-6 right-7 z-50 flex flex-col-reverse items-end gap-2">
      {/* Nút / mặt đồng hồ */}
      <button
        onClick={() => (tongGiay > 0 ? tamDung() : setDangMoBang((v) => !v))}
        className={`flex items-center gap-2.5 rounded-full border-[3px] px-5 py-2.5 shadow-lg transition-all duration-200
          ${hetGio
            ? 'bg-red-600 border-red-700 text-white animate-pulse'
            : sapHet
              ? 'bg-red-50 border-red-500 text-red-600 scale-105'
              : tongGiay > 0
                ? 'bg-white border-indigo-500 text-indigo-700'
                : 'bg-white/95 border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'}`}
        title={tongGiay > 0
          ? (dangChay ? 'Tạm dừng (phím T)' : 'Chạy tiếp (phím T)')
          : 'Đặt giờ cho học sinh làm bài (phím T)'}
      >
        {dangChay ? <Pause className="w-[26px] h-[26px]" /> : <Timer className="w-[26px] h-[26px]" />}
        <span className={`font-black tabular-nums ${tongGiay > 0 ? 'text-[34px]' : 'text-[26px]'}`}>
          {tongGiay > 0 ? dinhDangMMSS(conLai) : 'Đặt giờ'}
        </span>
      </button>

      {tongGiay > 0 && (
        <button
          onClick={datLai}
          className="flex items-center gap-1.5 bg-white/95 border-2 border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-400
                     rounded-full px-3.5 py-1.5 text-[20px] font-bold shadow"
        >
          <RotateCcw className="w-[18px] h-[18px]" /> Đặt lại
        </button>
      )}

      {/* Bảng đặt giờ */}
      {dangMoBang && tongGiay === 0 && (
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-5 w-[430px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-[24px] font-black text-slate-800">Đặt thời gian làm bài</h4>
              <p className="text-[15px] text-slate-400 font-semibold">Phím tắt: T để mở/đóng nhanh, Esc để đóng</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTatTieng((v) => !v)}
                title={tatTieng ? 'Bật tiếng báo' : 'Tắt tiếng báo'}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
              >
                {tatTieng ? <VolumeX className="w-[22px] h-[22px]" /> : <Volume2 className="w-[22px] h-[22px]" />}
              </button>
              <button onClick={() => setDangMoBang(false)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                <X className="w-[22px] h-[22px]" />
              </button>
            </div>
          </div>

          {/* Chọn nhanh */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 5].map((p) => (
              <button
                key={p}
                onClick={() => batDau(p * 60)}
                className="flex-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border-2 border-indigo-200
                           rounded-xl py-2.5 text-[24px] font-black transition-colors"
              >
                {p} phút
              </button>
            ))}
          </div>

          {/* Nhập tay */}
          <div className="flex items-end gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-[16px] font-bold text-slate-500 mb-1">Phút</label>
              <input
                type="number" min="0" max="90" value={nhapPhut}
                onChange={(e) => setNhapPhut(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') batDauTuONhap(); }}
                placeholder="0"
                className="w-full border-2 border-slate-200 focus:border-indigo-500 outline-none rounded-xl px-3 py-2 text-[26px] font-bold text-center"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[16px] font-bold text-slate-500 mb-1">Giây</label>
              <input
                type="number" min="0" max="59" value={nhapGiay}
                onChange={(e) => setNhapGiay(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') batDauTuONhap(); }}
                placeholder="0"
                className="w-full border-2 border-slate-200 focus:border-indigo-500 outline-none rounded-xl px-3 py-2 text-[26px] font-bold text-center"
              />
            </div>
            <button
              onClick={batDauTuONhap}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-[22px] font-black flex items-center gap-2"
            >
              <Play className="w-[20px] h-[20px]" /> Bắt đầu
            </button>
          </div>

          {/* Nói bằng micro - ẩn hẳn nếu trình duyệt không hỗ trợ */}
          {hoTroMic && (
            <button
              onClick={ngheMic}
              disabled={dangNgheMic}
              className={`w-full rounded-xl py-2.5 text-[21px] font-bold flex items-center justify-center gap-2 border-2 transition-colors
                ${dangNgheMic
                  ? 'bg-red-50 border-red-400 text-red-600'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-500 hover:text-indigo-600'}`}
            >
              {dangNgheMic
                ? <><Loader2 className="w-[22px] h-[22px] animate-spin" /> Đang nghe... nói ví dụ “hai phút”</>
                : <><Mic className="w-[22px] h-[22px]" /> Bấm rồi nói thời gian</>}
            </button>
          )}

          {loiMic && <p className="mt-2 text-[17px] text-red-600 font-semibold text-center">{loiMic}</p>}
        </div>
      )}
    </div>
  );
}
