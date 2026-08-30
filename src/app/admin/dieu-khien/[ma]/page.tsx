"use client";

import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import {
  ChevronLeft, ChevronRight, Dices, Trophy, Maximize2, Wifi, WifiOff,
  Plus, Minus, UserX, Undo2, X,
} from "lucide-react";
import { studentMarkdownComponents } from "@/components/CustomMarkdownComponents";
import { moKenhDienThoai, type TrangThaiChieu } from "@/utils/dieuKhienXa";

/**
 * Trang điều khiển trên ĐIỆN THOẠI.
 *
 * Nằm dưới /admin nên dùng chung lớp bảo vệ đã có: điện thoại phải đăng nhập tài khoản
 * của thầy cô mới vào được. Cộng thêm mã phiên ngẫu nhiên trên địa chỉ, nên học sinh
 * nhìn trộm màn chiếu cũng không điều khiển được.
 *
 * Chia ba tầng cho ngón cái với tới hết: trên là slide ĐANG chiếu, giữa là slide KẾ TIẾP
 * (để biết sắp giảng gì mà không phải quay đầu nhìn bảng), dưới là hàng nút.
 */

const BO_DUNG = {
  remarkPlugins: [remarkMath, remarkBreaks, remarkGfm] as any,
  rehypePlugins: [rehypeKatex, rehypeRaw] as any,
  components: studentMarkdownComponents,
};

export default function TrangDieuKhien() {
  const params = useParams();
  const timKiem = useSearchParams();
  const ma = String(params?.ma || '').toUpperCase();

  const [tt, setTt] = React.useState<TrangThaiChieu | null>(null);
  const [noiDuoc, setNoiDuoc] = React.useState(false);
  const [chuaThayChieu, setChuaThayChieu] = React.useState(false);
  const guiRef = React.useRef<((l: any) => void) | null>(null);
  /* Đã nghe được máy chiếu lần nào chưa. Phải dùng ref chứ không dùng state: bộ đếm
     4 giây bên dưới chỉ chạy một lần nên nó đọc phải giá trị của lần vẽ đầu, lúc đó
     tất nhiên là chưa nhận được gì - thành ra lúc nào cũng báo "không thấy máy chiếu". */
  const daNhan = React.useRef(false);

  React.useEffect(() => {
    if (!ma) return;
    const k = moKenhDienThoai(ma, (t) => {
      daNhan.current = true;
      setTt(t); setChuaThayChieu(false);
    }, setNoiDuoc);
    guiRef.current = k.gui;

    /* Vào kênh rồi mà 4 giây không nghe máy chiếu nói gì thì gần như chắc là máy chiếu đã
       tải lại trang (mã phiên đổi) hoặc đã tắt - phải báo chứ đừng để Thầy bấm mãi. */
    const hen = setTimeout(() => { if (!daNhan.current) setChuaThayChieu(true); }, 4000);

    return () => { clearTimeout(hen); k.dong(); guiRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ma]);

  const gui = (l: any) => {
    guiRef.current?.(l);
    /* Rung nhẹ cho biết đã bấm - lớp ồn, nhìn màn hình không kịp. */
    try { navigator.vibrate?.(18); } catch { /* máy không có thì thôi */ }
  };

  const dangGoiTen = !!tt?.moGoiTen;

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col">

      {/* Thanh trạng thái */}
      <div className="shrink-0 px-4 py-2.5 bg-slate-800 flex items-center gap-2 border-b border-white/10">
        {noiDuoc && !chuaThayChieu
          ? <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          : <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />}
        <span className="text-[13px] font-bold text-slate-300">
          {chuaThayChieu ? 'Không thấy máy chiếu'
            : noiDuoc ? `Slide ${(tt?.slide ?? 0) + 1}/${tt?.tongSlide ?? '?'}`
            : 'Đang kết nối...'}
        </span>
        <span className="ml-auto text-[12px] font-mono text-slate-500 tracking-widest">{ma}</span>
      </div>

      {chuaThayChieu && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[13px] font-bold">
          Máy chiếu không trả lời. Có thể Thầy cô vừa tải lại trang trình chiếu — mã phiên
          đã đổi, quét lại mã QR mới nhé.
        </div>
      )}

      {/* Slide đang chiếu + slide kế tiếp */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        <Khung nhan="Đang chiếu" mau="border-emerald-500/40 bg-emerald-500/5" noiBat>
          {tt?.dangChieu
            ? <ReactMarkdown {...BO_DUNG}>{tt.dangChieu}</ReactMarkdown>
            : <p className="text-slate-500 text-sm">Chưa có nội dung.</p>}
        </Khung>

        <Khung nhan="Tiếp theo" mau="border-white/10 bg-white/5">
          {tt?.keTiep
            ? <ReactMarkdown {...BO_DUNG}>{tt.keTiep}</ReactMarkdown>
            : <p className="text-slate-500 text-sm">Hết bài rồi.</p>}
        </Khung>
      </div>

      {/* Hàng nút */}
      <div className="shrink-0 border-t border-white/10 bg-slate-800 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {dangGoiTen ? (
          <>
            <div className="text-center mb-2.5">
              <div className="text-[12px] font-bold text-violet-300">{tt?.tomTatQuay}</div>
              <div className="text-[24px] font-black text-white leading-tight mt-0.5 break-words">
                {tt?.trungAi || 'Bấm QUAY để gọi tên'}
              </div>
            </div>
            <button onClick={() => gui({ viec: 'quay' })}
                    className="w-full bg-violet-600 active:bg-violet-700 text-white font-black
                               py-5 rounded-2xl text-[22px] flex items-center justify-center gap-2.5">
              <Dices className="w-7 h-7" /> QUAY
            </button>
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              <NutPhu onClick={() => gui({ viec: 'diem', diem: 1 })}
                      mau="bg-emerald-600 active:bg-emerald-700 text-white"><Plus className="w-5 h-5" /> Đúng</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'diem', diem: -1 })}
                      mau="bg-rose-600 active:bg-rose-700 text-white"><Minus className="w-5 h-5" /> Chưa</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'vang' })}
                      mau="bg-white/10 active:bg-white/20 text-slate-200"><UserX className="w-5 h-5" /> Vắng</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'bo-lai' })}
                      mau="bg-amber-500/20 active:bg-amber-500/30 text-amber-200"><Undo2 className="w-5 h-5" /> Bỏ lại</NutPhu>
            </div>
            <button onClick={() => gui({ viec: 'dong-goi-ten' })}
                    className="w-full mt-2.5 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-slate-300
                               font-bold text-[14px] flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Đóng vòng quay
            </button>
          </>
        ) : (
          <>
            {/* Hai nút chuyển slide là thứ dùng nhiều nhất nên to nhất */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => gui({ viec: 'truoc' })}
                      className="bg-white/10 active:bg-white/20 text-white font-black py-7 rounded-2xl
                                 flex items-center justify-center">
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button onClick={() => gui({ viec: 'sau' })}
                      className="bg-indigo-600 active:bg-indigo-700 text-white font-black py-7 rounded-2xl
                                 flex items-center justify-center">
                <ChevronRight className="w-10 h-10" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <NutPhu onClick={() => gui({ viec: 'mo-goi-ten' })}
                      mau="bg-violet-600 active:bg-violet-700 text-white"><Dices className="w-5 h-5" /> Gọi tên</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'mo-san-khau' })}
                      mau="bg-amber-500 active:bg-amber-600 text-amber-950"><Trophy className="w-5 h-5" /> Vinh danh</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'toan-man-hinh' })}
                      mau="bg-white/10 active:bg-white/20 text-slate-200"><Maximize2 className="w-5 h-5" /> Toàn màn</NutPhu>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Khung({ nhan, mau, noiBat, children }: {
  nhan: string; mau: string; noiBat?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border-2 ${mau} overflow-hidden`}>
      <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5">
        {nhan}
      </div>
      {/* Nền trắng cho slide vì bài giảng vốn dựng trên nền sáng */}
      <div className={`bg-white text-slate-800 px-3 py-2.5 overflow-x-auto ${
        noiBat ? 'max-h-[42vh]' : 'max-h-[26vh] opacity-80'
      } overflow-y-auto [&_img]:max-h-[120px] [&_*]:!text-[13px] [&_h1]:!text-[17px] [&_h2]:!text-[16px] [&_h3]:!text-[15px]`}>
        {children}
      </div>
    </div>
  );
}

function NutPhu({ onClick, mau, children }: {
  onClick: () => void; mau: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
            className={`${mau} font-black py-3 rounded-xl text-[12.5px] flex flex-col items-center justify-center gap-1`}>
      {children}
    </button>
  );
}
