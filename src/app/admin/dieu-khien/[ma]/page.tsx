"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import {
  ChevronLeft, ChevronRight, Dices, Trophy, Maximize2, Wifi, WifiOff,
  Plus, Minus, UserX, Undo2, X, Timer, Eye, EyeOff, Send, Check, LogOut, Mic, Loader2,
  ChevronUp, ChevronDown,
  BookOpen,
} from "lucide-react";
import { studentMarkdownComponents } from "@/components/CustomMarkdownComponents";
import { moKenhDienThoai, type TrangThaiChieu, type TrangThaiTroChoi } from "@/utils/dieuKhienXa";
import { TEN_MUC } from "@/utils/troChoi";
import { docThoiLuongTiengViet } from "@/utils/parseVietnameseDuration";
import { useNhanGiongNoi } from "@/hooks/useNhanGiongNoi";

/**
 * Trang điều khiển trên ĐIỆN THOẠI.
 *
 * Nằm dưới /admin nên dùng chung lớp bảo vệ đã có: điện thoại phải đăng nhập tài khoản
 * của thầy cô mới vào được. Cộng thêm mã phiên ngẫu nhiên trên địa chỉ, nên học sinh
 * nhìn trộm màn chiếu cũng không điều khiển được.
 *
 * GỌN LÀ CHÍNH. Bản đầu bày cả slide đang chiếu lẫn slide kế tiếp cùng lúc, gặp slide
 * câu hỏi thì hiện nguyên khối ```quiz``` thô - vừa xấu vừa chiếm hết chỗ, nút bấm bị
 * đẩy xuống. Nay:
 *   · phần xem trước chỉ hiện MỘT khung, gạt qua lại giữa "Đang chiếu" và "Tiếp theo";
 *   · slide câu hỏi thì bày thẳng A B C D bấm được, kèm đáp án đúng cho Thầy cô đối chiếu;
 *   · hàng nút luôn dính đáy, ngón cái với tới.
 *
 * Trang phủ KÍN màn hình (`fixed inset-0`) chứ không nằm gọn trong khung /admin: thanh
 * tiêu đề và lề của khu quản trị ăn mất non nửa màn hình điện thoại, hàng nút bị đẩy
 * khuất xuống dưới - đo trên máy 375x812 thì chỉ còn thấy đúng hai nút chuyển slide.
 */

const BO_DUNG = {
  remarkPlugins: [remarkMath, remarkBreaks, remarkGfm] as any,
  rehypePlugins: [rehypeKatex, rehypeRaw] as any,
  components: studentMarkdownComponents,
};

const CHU_CAI = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Chữ trong nút phương án. Phải dựng qua KaTeX chứ không in thô: phương án Toán hầu hết
 * là công thức, để nguyên thì trên máy Thầy cô hiện ra "$2\sqrt{2}$" - đọc không nổi.
 */
function ChuToan({ chu }: { chu: unknown }) {
  return (
    <ReactMarkdown
      remarkPlugins={BO_DUNG.remarkPlugins}
      rehypePlugins={BO_DUNG.rehypePlugins}
      components={{ p: (p: any) => <span {...p} /> }}
    >
      {typeof chu === 'string' ? chu : String(chu ?? '')}
    </ReactMarkdown>
  );
}

export default function TrangDieuKhien() {
  const params = useParams();
  const router = useRouter();
  const ma = String(params?.ma || '').toUpperCase();

  const [tt, setTt] = React.useState<TrangThaiChieu | null>(null);
  const [noiDuoc, setNoiDuoc] = React.useState(false);
  const [chuaThayChieu, setChuaThayChieu] = React.useState(false);
  const [xemKeTiep, setXemKeTiep] = React.useState(false);
  const [moBangGio, setMoBangGio] = React.useState(false);
  const [chuTraLoi, setChuTraLoi] = React.useState('');
  const [oCau, setOCau] = React.useState('');
  /** Nghe được câu nhưng không ra được số phút - khác với lỗi micro của bộ nghe. */
  const [loiHieu, setLoiHieu] = React.useState('');
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
  const cauHoi = tt?.cauHoi || null;
  const conLai = tt?.gioConLai || 0;
  const traLoiNgan = cauHoi?.loai === 'short_answer';

  /* Slide đổi thì xoá ô nhập của câu trước, khỏi gửi nhầm sang câu sau. */
  React.useEffect(() => { setChuTraLoi(''); }, [tt?.slide]);
  /* Ô số câu bám theo câu máy chiếu đang chiếu, trừ lúc Thầy cô đang gõ dở. */
  React.useEffect(() => { setOCau(String(tt?.soCau || '')); }, [tt?.soCau]);

  const dinhGio = (g: number) =>
    `${Math.floor(g / 60)}:${String(g % 60).padStart(2, '0')}`;

  /**
   * Bấm rồi nói thời lượng, ví dụ "hai phút" hay "chín mươi giây".
   *
   * Nghe ngay trên ĐIỆN THOẠI chứ không nhờ máy chiếu nghe: micro của máy chiếu ở tận
   * bàn giáo viên, thầy cô đang đứng giữa lớp nói thì nó không nghe rõ. Nghe xong mới
   * gửi số phút lên bảng.
   *
   * Dùng bộ nghe chung: iPhone thêm vào Màn hình chính không nhận được giọng nói bằng
   * Web Speech, bộ chung tự chuyển sang ghi âm rồi nhờ AI chép - xem hooks/useNhanGiongNoi.
   */
  const { hoTro: hoTroMic, dangNghe: dangNgheMic, loi: loiBoNghe, batDauNghe: ngheMic } =
    useNhanGiongNoi((chu, xong) => {
      if (!xong) return;
      const giay = docThoiLuongTiengViet(chu);
      if (giay) {
        /* Máy chiếu nhận theo PHÚT, nên chia ra - "chín mươi giây" thành 1,5 phút. */
        setLoiHieu('');
        gui({ viec: 'dat-gio', phut: giay / 60 });
        setMoBangGio(false);
        return;
      }
      setLoiHieu(`Chưa hiểu “${chu}”, nói lại nhé`);
    });

  const loiMic = loiBoNghe || loiHieu;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900 text-white flex flex-col">

      {/* Thanh trạng thái - mỏng hết mức, nhường chỗ cho nút */}
      <div className="shrink-0 px-3 py-2 bg-slate-800 flex items-center gap-2 border-b border-white/10">
        {noiDuoc && !chuaThayChieu
          ? <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          : <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />}
        <span className="text-[13px] font-bold text-slate-300">
          {chuaThayChieu ? 'Không thấy máy chiếu'
            : noiDuoc ? `Slide ${(tt?.slide ?? 0) + 1}/${tt?.tongSlide ?? '?'}`
            : 'Đang kết nối...'}
        </span>
        {conLai > 0 && (
          <span className={`px-2 py-0.5 rounded-full text-[13px] font-black tabular-nums ${
            conLai <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-500/25 text-indigo-200'
          }`}>
            ⏱ {dinhGio(conLai)}
          </span>
        )}
        {/* Chữa bài là nhảy tới đúng câu lớp làm sai, nên số câu phải gõ được ngay đây */}
        {!!tt?.tongCau && (
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[12px] font-bold text-slate-400">Câu</span>
            <input
              value={oCau}
              onChange={e => setOCau(e.target.value.replace(/\D/g, '').slice(0, 3))}
              onFocus={e => e.currentTarget.select()}
              onBlur={() => setOCau(String(tt?.soCau || ''))}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                const n = parseInt(oCau || '0', 10);
                if (n > 0) gui({ viec: 'nhay-cau', cau: n });
                e.currentTarget.blur();
              }}
              inputMode="numeric"
              className="w-[38px] bg-white/10 border border-white/20 rounded-md px-1 py-0.5 text-center
                         text-white font-black text-[13px] outline-none focus:border-indigo-400"
            />
            <span className="text-[12px] font-bold text-slate-500">/{tt.tongCau}</span>
          </div>
        )}
        <span className="ml-auto text-[11px] font-mono text-slate-500 tracking-widest">{ma}</span>
        <button onClick={() => router.push('/admin/dieu-khien')} title="Thoát"
                className="p-1 -mr-1 text-slate-500 active:text-white">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {chuaThayChieu && (
        <div className="mx-3 mt-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[13px] font-bold">
          Máy chiếu không trả lời. Có thể Thầy cô vừa tải lại trang trình chiếu — mã phiên
          đã đổi, quét lại mã QR mới nhé.
        </div>
      )}

      {/* Phần giữa: câu hỏi bấm được, hoặc khung xem trước */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5">
        {cauHoi ? (
          <BangCauHoi
            cauHoi={cauHoi}
            chu={chuTraLoi}
            datChu={setChuTraLoi}
            traLoiNgan={traLoiNgan}
            gui={gui}
            chonDS={!!tt?.troChoi}
          />
        ) : tt?.troChoi ? (
          <BangTroChoi tc={tt.troChoi} gui={gui} />
        ) : (
          <>
            {/* Một khung thôi, gạt qua lại - hai khung cùng lúc chiếm hết màn hình */}
            <div className="flex gap-1 mb-2 p-1 rounded-xl bg-white/5">
              {[false, true].map((ke) => (
                <button key={String(ke)} onClick={() => setXemKeTiep(ke)}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] font-black transition-colors ${
                          xemKeTiep === ke ? 'bg-white/15 text-white' : 'text-slate-400'
                        }`}>
                  {ke ? 'Tiếp theo' : 'Đang chiếu'}
                </button>
              ))}
            </div>
            <div className="rounded-2xl bg-white text-slate-800 px-3 py-2.5 overflow-auto max-h-[46vh]
                            [&_img]:max-h-[110px] [&_*]:!text-[13px] [&_h1]:!text-[16px]
                            [&_h2]:!text-[15px] [&_h3]:!text-[14px]">
              {(xemKeTiep ? tt?.keTiep : tt?.dangChieu)
                ? <ReactMarkdown {...BO_DUNG}>{(xemKeTiep ? tt!.keTiep : tt!.dangChieu)}</ReactMarkdown>
                : <p className="text-slate-400 text-sm">{xemKeTiep ? 'Hết bài rồi.' : 'Chưa có nội dung.'}</p>}
            </div>
          </>
        )}
      </div>

      {/* Bảng đặt giờ - bung lên trên hàng nút khi bấm ⏱ */}
      {moBangGio && (
        <div className="shrink-0 mx-3 mb-2 p-2.5 rounded-2xl bg-slate-800 border border-white/10">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 5].map((p) => (
              <button key={p}
                      onClick={() => { gui({ viec: 'dat-gio', phut: p }); setMoBangGio(false); }}
                      className="py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-black text-[15px]">
                {p} phút
              </button>
            ))}
          </div>
          {/* Nói thời gian - ẩn hẳn nếu trình duyệt không nghe được */}
          {hoTroMic && (
            <button onClick={() => { setLoiHieu(''); ngheMic(); }}
                    className={`w-full mt-2 py-3 rounded-xl font-black text-[14px] flex items-center
                                justify-center gap-2 border ${
                      dangNgheMic
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : 'bg-white/5 border-white/15 text-slate-200 active:bg-white/15'
                    }`}>
              {dangNgheMic
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang nghe… nói “hai phút”</>
                : <><Mic className="w-5 h-5" /> Bấm rồi nói thời gian</>}
            </button>
          )}

          {loiMic && <p className="mt-2 text-[12.5px] text-rose-300 font-bold text-center">{loiMic}</p>}

          <button onClick={() => { gui({ viec: 'dung-gio' }); setMoBangGio(false); }}
                  className="w-full mt-2 py-2.5 rounded-xl bg-white/10 active:bg-white/20 text-slate-200 font-bold text-[13.5px]">
            Dừng và xoá đồng hồ
          </button>
        </div>
      )}

      {/* Hàng nút */}
      <div className="shrink-0 border-t border-white/10 bg-slate-800 px-3 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
        {tt?.troChoi ? (
          <BangNutTroChoi tc={tt.troChoi} gui={gui} />
        ) : dangGoiTen ? (
          <>
            <div className="text-center mb-2">
              <div className="text-[11.5px] font-bold text-violet-300">{tt?.tomTatQuay}</div>
              <div className="text-[22px] font-black text-white leading-tight mt-0.5 break-words">
                {tt?.trungAi || 'Bấm QUAY để gọi tên'}
              </div>
            </div>
            <button onClick={() => gui({ viec: 'quay' })}
                    className="w-full bg-violet-600 active:bg-violet-700 text-white font-black
                               py-4 rounded-2xl text-[21px] flex items-center justify-center gap-2.5">
              <Dices className="w-7 h-7" /> QUAY
            </button>
            <div className="grid grid-cols-4 gap-2 mt-2">
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
                    className="w-full mt-2 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-slate-300
                               font-bold text-[13.5px] flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Đóng vòng quay
            </button>
          </>
        ) : (
          <>
            {/* Hai nút chuyển slide là thứ dùng nhiều nhất nên to nhất */}
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => gui({ viec: 'truoc' })}
                      className="bg-white/10 active:bg-white/20 text-white font-black py-5 rounded-2xl
                                 flex items-center justify-center">
                <ChevronLeft className="w-9 h-9" />
              </button>
              <button onClick={() => gui({ viec: 'sau' })}
                      className="bg-indigo-600 active:bg-indigo-700 text-white font-black py-5 rounded-2xl
                                 flex items-center justify-center">
                <ChevronRight className="w-9 h-9" />
              </button>
            </div>
            {/* Cuộn phần đang chiếu trên bảng. Đặt ở hàng nút LUÔN THẤY chứ không đặt
                dưới ô xem trước: slide câu hỏi thay chỗ ô đó, mà lời giải dài bị khuất
                lại đúng là ở slide câu hỏi. */}
            <div className="grid grid-cols-2 gap-2.5 mt-2">
              <button onClick={() => gui({ viec: 'cuon', huong: -1 })}
                      className="py-2.5 rounded-xl bg-white/10 active:bg-white/20 text-slate-200
                                 font-bold text-[13px] flex items-center justify-center gap-1.5">
                <ChevronUp className="w-4 h-4" /> Cuộn lên
              </button>
              <button onClick={() => gui({ viec: 'cuon', huong: 1 })}
                      className="py-2.5 rounded-xl bg-white/10 active:bg-white/20 text-slate-200
                                 font-bold text-[13px] flex items-center justify-center gap-1.5">
                <ChevronDown className="w-4 h-4" /> Cuộn xuống
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2">
              <NutPhu onClick={() => setMoBangGio(v => !v)}
                      mau={moBangGio ? 'bg-indigo-600 text-white' : 'bg-white/10 active:bg-white/20 text-slate-200'}>
                <Timer className="w-5 h-5" /> Đặt giờ
              </NutPhu>
              <NutPhu onClick={() => gui({ viec: 'mo-goi-ten' })}
                      mau="bg-violet-600 active:bg-violet-700 text-white"><Dices className="w-5 h-5" /> Gọi tên</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'mo-san-khau' })}
                      mau="bg-amber-500 active:bg-amber-600 text-amber-950"><Trophy className="w-5 h-5" /> Vinh danh</NutPhu>
              <NutPhu onClick={() => gui({ viec: 'toan-man-hinh' })}
                      mau="bg-white/10 active:bg-white/20 text-slate-200"><Maximize2 className="w-5 h-5" /> Toàn màn</NutPhu>
            </div>
            <button onClick={() => gui({ viec: 'tro-choi', hanh: 'mo' })}
                    className="w-full mt-2 py-2.5 rounded-xl bg-orange-500/25 active:bg-orange-500/40 text-orange-200
                               font-black text-[13.5px] flex items-center justify-center gap-2">
              🎯 Trò chơi trên lớp
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Slide đang chiếu là câu hỏi tương tác: bày đề và các phương án BẤM ĐƯỢC.
 *
 * Bấm một phương án là trên bảng nó sáng lên đúng như Thầy cô bấm chuột, nên có thể đứng
 * giữa lớp cho các em chọn. Đáp án đúng hiện sẵn ngay trên máy Thầy cô (viền xanh mảnh)
 * để khỏi phải ngoái nhìn bảng mới biết đúng sai.
 */
function BangCauHoi({ cauHoi, chu, datChu, traLoiNgan, gui, chonDS }: {
  cauHoi: NonNullable<TrangThaiChieu['cauHoi']>;
  chu: string;
  datChu: (s: string) => void;
  traLoiNgan: boolean;
  gui: (l: any) => void;
  /** Trò chơi: cụm Đúng/Sai bấm được Đ/S từng ý để máy chấm */
  chonDS?: boolean;
}) {
  /* Đ/S đã bấm cho từng ý — chỉ để tô nút trên máy này; máy chiếu mới giữ trạng thái thật */
  const [daBamDS, setDaBamDS] = React.useState<Record<number, boolean>>({});
  React.useEffect(() => { setDaBamDS({}); }, [cauHoi.de]);
  const cumDS = chonDS && cauHoi.loai === 'true_false_cluster';
  return (
    <>
      <div className="rounded-2xl bg-white text-slate-800 px-3 py-2.5 max-h-[26vh] overflow-auto
                      [&_*]:!text-[13.5px] [&_img]:max-h-[90px]">
        <ReactMarkdown {...BO_DUNG}>{cauHoi.de || '(Không có đề)'}</ReactMarkdown>
      </div>

      {traLoiNgan ? (
        <div className="mt-2.5">
          <div className="flex gap-2">
            <input
              value={chu}
              onChange={e => datChu(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') gui({ viec: 'nhap-dap-an', chu }); }}
              placeholder="Gõ câu trả lời của lớp…"
              className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-white/10 border border-white/15
                         text-white placeholder:text-slate-500 text-[16px] font-bold outline-none
                         focus:border-indigo-400"
            />
            <button onClick={() => gui({ viec: 'nhap-dap-an', chu })}
                    className="px-4 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-black flex items-center">
              <Send className="w-5 h-5" />
            </button>
          </div>
          {cauHoi.hienDapAn && cauHoi.dapAnChu && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30
                            text-emerald-200 text-[13.5px] font-bold">
              Đáp án: <ChuToan chu={cauHoi.dapAnChu} />
            </div>
          )}
        </div>
      ) : (
        <div className={`grid gap-2 mt-2.5 ${cauHoi.bamDuoc ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {(cauHoi.phuongAn.length ? cauHoi.phuongAn : ['ĐÚNG', 'SAI']).map((pa, i) => {
            const dangChon = cauHoi.bamDuoc && cauHoi.dangChon === i;
            const laDung = cauHoi.bamDuoc && cauHoi.dapAn === i;
            return (
              <button key={i} disabled={!cauHoi.bamDuoc && !cumDS}
                      onClick={() => { if (cauHoi.bamDuoc) gui({ viec: 'chon-dap-an', chon: i }); }}
                      className={`min-h-[58px] px-2.5 py-2 rounded-xl text-left flex items-start gap-2
                                  border-2 transition-colors ${
                        cauHoi.hienDapAn && laDung
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : dangChon
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : laDung
                              ? 'bg-white/5 border-emerald-500/50 text-slate-200'
                              : 'bg-white/5 border-white/10 text-slate-200'
                      }`}>
                {/* Cụm mệnh đề đã tự mang sẵn a) b) c) d) trong lời, khỏi gắn thêm A B C D */}
                {cauHoi.bamDuoc && (
                  <span className="shrink-0 w-6 h-6 rounded-lg bg-black/25 text-[12.5px] font-black
                                   flex items-center justify-center">
                    {CHU_CAI[i] || i + 1}
                  </span>
                )}
                <span className="text-[13px] font-bold leading-snug break-words min-w-0
                                 [&_.katex]:text-[13px]">
                  <ChuToan chu={pa} />
                </span>
                {laDung && <Check className="w-4 h-4 shrink-0 ml-auto text-emerald-300" />}
                {cumDS && !cauHoi.hienDapAn && (
                  <span className="shrink-0 ml-auto flex gap-1" onClick={e => e.stopPropagation()}>
                    {[true, false].map(v => (
                      <span key={String(v)} role="button"
                            onClick={() => { setDaBamDS(d => ({ ...d, [i]: v })); gui({ viec: 'chon-ds', y: i, dung: v }); }}
                            className={`w-9 h-9 rounded-lg text-[13px] font-black flex items-center justify-center border ${
                              daBamDS[i] === v ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-black/25 border-white/15 text-slate-300'}`}>
                        {v ? 'Đ' : 'S'}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Cụm mệnh đề Đúng/Sai không bấm chọn được, nhưng vẫn phải cho Thầy cô xem đáp án */}
      {!traLoiNgan && !cauHoi.bamDuoc && cauHoi.hienDapAn && cauHoi.dapAnChu && (
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30
                        text-emerald-200 text-[13.5px] font-bold">
          Đáp án: {cauHoi.dapAnChu}
        </div>
      )}

      {/* Một nút đi hết ba bước, đúng như trên bảng: đề → đáp án → lời giải */}
      <button onClick={() => gui({ viec: 'hien-dap-an' })}
              className={`w-full mt-2.5 py-3 rounded-xl font-black text-[15px] flex items-center
                          justify-center gap-2 ${
                cauHoi.buoc === 0
                  ? 'bg-emerald-600 active:bg-emerald-700 text-white'
                  : cauHoi.buoc === 1 && cauHoi.loiGiai
                    ? 'bg-indigo-600 active:bg-indigo-700 text-white'
                    : 'bg-white/10 active:bg-white/20 text-slate-200'
              }`}>
        {cauHoi.buoc === 0
          ? <><Eye className="w-5 h-5" /> Hiển thị đáp án</>
          : cauHoi.buoc === 1 && cauHoi.loiGiai
            ? <><BookOpen className="w-5 h-5" /> Xem lời giải</>
            : <><EyeOff className="w-5 h-5" /> Làm lại</>}
      </button>

      {/*
        LỜI GIẢI NGAY TRÊN TAY.
        Đọc được lời giải trên điện thoại trong khi cả lớp nhìn đề trên bảng - Thầy cô
        không phải quay lưng lại đọc màn chiếu. Hiện từ bước đáp án, không chờ tới bước
        lời giải, vì lúc chữa là lúc cần đọc.
      */}
      {cauHoi.buoc >= 1 && !!cauHoi.loiGiai && (
        <div className="mt-2.5 rounded-2xl bg-white text-slate-800 px-3 py-2.5 max-h-[34vh] overflow-auto
                        [&_*]:!text-[13px]">
          <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-1">
            Lời giải
          </div>
          <ReactMarkdown {...BO_DUNG}>{cauHoi.loiGiai}</ReactMarkdown>
        </div>
      )}
    </>
  );
}

function NutPhu({ onClick, mau, children }: {
  onClick: () => void; mau: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
            className={`${mau} font-black py-2.5 rounded-xl text-[11.5px] flex flex-col items-center justify-center gap-1`}>
      {children}
    </button>
  );
}

/* ====================== TRÒ CHƠI TRÊN LỚP ====================== */

/** Phần giữa màn hình khi đang chơi mà không có câu hỏi: cài đặt, chờ quay, hoặc bảng tổng kết. */
function BangTroChoi({ tc, gui }: { tc: TrangThaiTroChoi; gui: (l: any) => void }) {
  if (tc.giaiDoan === 'chon') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-2">🎮 Chọn trò chơi</div>
        <p className="text-[13px] text-slate-400">Chọn ở hàng nút bên dưới. Trò nào cũng lấy câu từ bài đang chiếu hoặc cả chương, điểm ±1/±2/±3 theo mức câu.</p>
      </div>
    );
  }
  if (tc.tro === 'dau-doi') return <BangDauDoi tc={tc} gui={gui} />;
  /* Số câu và nguồn đọc từ máy chiếu (nơi giữ trạng thái thật), bấm ± là gửi số mới lên */
  const soCau = tc.caiDat?.soCau ?? 8;
  const nguon = tc.caiDat?.nguon ?? 'bai';
  if (tc.giaiDoan === 'cai-dat' || tc.giaiDoan === 'tai') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-2">🎯 Truy đuổi · cài đặt</div>
        <div className="text-[12.5px] text-slate-400 mb-1">Lấy câu từ</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(['bai', 'chuong'] as const).map(n => (
            <button key={n} onClick={() => gui({ viec: 'tro-choi', hanh: 'nguon', gia: n })}
                    className={`py-2.5 rounded-xl font-black text-[14px] ${nguon === n ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200'}`}>
              {n === 'bai' ? 'Bài này' : 'Cả chương'}
            </button>
          ))}
        </div>
        <div className="text-[12.5px] text-slate-400 mb-1">Số câu</div>
        <div className="flex items-center gap-2">
          <button onClick={() => gui({ viec: 'tro-choi', hanh: 'so-cau', gia: Math.max(1, soCau - 1) })}
                  className="w-12 h-12 rounded-xl bg-white/10 active:bg-white/20 text-[22px] font-black">−</button>
          <span className="flex-1 text-center text-[26px] font-black text-white tabular-nums">{soCau}</span>
          <button onClick={() => gui({ viec: 'tro-choi', hanh: 'so-cau', gia: Math.min(50, soCau + 1) })}
                  className="w-12 h-12 rounded-xl bg-white/10 active:bg-white/20 text-[22px] font-black">+</button>
        </div>
        <p className="text-[12px] text-slate-500 mt-2">Lớp chọn trên máy chiếu (đã nhớ từ lần gọi tên trước).</p>
      </div>
    );
  }
  if (tc.giaiDoan === 'tong-ket') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-2">🎯 Tổng kết</div>
        {tc.bangDiem.length === 0 ? <p className="text-slate-400 text-[13px]">Chưa em nào được gọi.</p> : tc.bangDiem.map((d, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
            <span className="w-6 text-[12px] text-slate-500 font-black">{i + 1}</span>
            <span className="flex-1 text-[14px] font-bold text-white truncate">{d.ten}</span>
            <span className={`text-[15px] font-black tabular-nums ${d.diem > 0 ? 'text-emerald-300' : d.diem < 0 ? 'text-rose-300' : 'text-slate-400'}`}>{d.diem > 0 ? '+' + d.diem : d.diem}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
      <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-1">🎯 Truy đuổi · câu {tc.cau}/{tc.tongCau}</div>
      <div className="text-[13px] text-amber-200 font-bold">{TEN_MUC[tc.muc] || 'Nhận biết'} · ±{tc.diemCau}{tc.lanChuyen ? ` · chuyền ${tc.lanChuyen}/2` : ''}</div>
      <div className="text-[22px] font-black text-white mt-1">{tc.tenHS || 'Bấm QUAY để gọi tên'}</div>
      {tc.bangDiem.length > 0 && (
        <div className="mt-2 text-[12px] text-slate-400">
          Đang dẫn: {tc.bangDiem.slice(0, 3).map(d => `${d.ten} (${d.diem > 0 ? '+' : ''}${d.diem})`).join(' · ')}
        </div>
      )}
    </div>
  );
}

/** Hàng nút dưới cùng khi đang chơi — đổi theo giai đoạn, đúng mấy nút cần bấm lúc đó. */
function BangNutTroChoi({ tc, gui }: { tc: TrangThaiTroChoi; gui: (l: any) => void }) {
  const tro = (hanh: string, gia?: any) => gui({ viec: 'tro-choi', hanh, gia });
  if (tc.giaiDoan === 'chon') {
    return (<>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => tro('chon-tro', 'truy-duoi')} className="bg-indigo-600 active:bg-indigo-700 text-white font-black py-4 rounded-2xl text-[17px]">🎯 Truy đuổi</button>
        <button onClick={() => tro('chon-tro', 'dau-doi')} className="bg-amber-500 active:bg-amber-600 text-amber-950 font-black py-4 rounded-2xl text-[17px]">🏁 Đấu đội</button>
      </div>
      <button onClick={() => tro('dong')} className="w-full mt-2 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-slate-300 font-bold text-[13.5px]">Về bài giảng</button>
    </>);
  }
  if (tc.tro === 'dau-doi') return <BangNutDauDoi tc={tc} gui={gui} />;
  const To = ({ onClick, mau, children }: { onClick: () => void; mau: string; children: React.ReactNode }) => (
    <button onClick={onClick} className={`${mau} w-full text-white font-black py-4 rounded-2xl text-[19px] flex items-center justify-center gap-2`}>{children}</button>
  );
  const dong = (
    <button onClick={() => tro('dong')}
            className="w-full mt-2 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-slate-300 font-bold text-[13.5px] flex items-center justify-center gap-2">
      <X className="w-4 h-4" /> Đóng trò chơi
    </button>
  );
  switch (tc.giaiDoan) {
    case 'cai-dat': case 'tai':
      return (<><To onClick={() => tro('bat-dau')} mau="bg-indigo-600 active:bg-indigo-700">{tc.giaiDoan === 'tai' ? 'Đang tải…' : '▶ Bắt đầu'}</To>{dong}</>);
    case 'quay':
      return (<>
        <To onClick={() => tro('quay')} mau="bg-violet-600 active:bg-violet-700"><Dices className="w-7 h-7" /> QUAY{tc.lanChuyen ? ' (chuyền)' : ''}</To>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NutPhu onClick={() => tro('chi-dinh')} mau="bg-white/10 active:bg-white/20 text-slate-200">Chỉ định trên bảng</NutPhu>
          <NutPhu onClick={() => tro('ket-thuc')} mau="bg-white/10 active:bg-white/20 text-slate-200">Kết thúc</NutPhu>
        </div>
        {dong}
      </>);
    case 'hoi':
      return (<>
        <p className="text-center text-[12.5px] text-slate-400 mb-2">{tc.tenHS} đang trả lời — bấm phương án em chọn ở trên rồi <b>Hiển thị đáp án</b>, máy tự chấm.</p>
        <div className="grid grid-cols-2 gap-2">
          <NutPhu onClick={() => tro('ket-thuc')} mau="bg-white/10 active:bg-white/20 text-slate-200">Kết thúc</NutPhu>
          <NutPhu onClick={() => tro('dong')} mau="bg-white/10 active:bg-white/20 text-slate-200">Đóng</NutPhu>
        </div>
      </>);
    case 'cham-tl': case 'hoi-tl':
      return (<>
        <p className="text-center text-[12.5px] text-slate-400 mb-2">{tc.tenHS} trình bày xong — thầy chấm:</p>
        <div className="grid grid-cols-2 gap-2">
          <To onClick={() => tro('cham', true)} mau="bg-emerald-600 active:bg-emerald-700">Đúng +{tc.diemCau}</To>
          <To onClick={() => tro('cham', false)} mau="bg-rose-600 active:bg-rose-700">Sai −{tc.diemCau}</To>
        </div>
      </>);
    case 'ket-qua': case 'chua': {
      const conChuyen = tc.ketQua === 'sai' && tc.lanChuyen < 2 && tc.giaiDoan === 'ket-qua';
      return (<>
        <div className={`text-center text-[15px] font-black mb-2 ${tc.ketQua === 'dung' ? 'text-emerald-300' : 'text-rose-300'}`}>
          {tc.tenHS}: {tc.ketQua === 'dung' ? `đúng +${tc.diemCau}` : `sai −${tc.diemCau}`}
        </div>
        <div className={`grid gap-2 ${conChuyen ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {conChuyen && <To onClick={() => tro('chuyen')} mau="bg-orange-500 active:bg-orange-600">Chuyền {tc.lanChuyen + 1}/2</To>}
          <To onClick={() => tro('cau-tiep')} mau="bg-indigo-600 active:bg-indigo-700">{tc.cau >= tc.tongCau ? 'Tổng kết' : 'Câu tiếp'} <ChevronRight className="w-6 h-6" /></To>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {tc.giaiDoan === 'ket-qua'
            ? <NutPhu onClick={() => tro('chua')} mau="bg-white/10 active:bg-white/20 text-slate-200">Chữa (lời giải)</NutPhu>
            : <NutPhu onClick={() => gui({ viec: 'cuon', huong: 1 })} mau="bg-white/10 active:bg-white/20 text-slate-200">Cuộn xuống</NutPhu>}
          <NutPhu onClick={() => tro('ket-thuc')} mau="bg-white/10 active:bg-white/20 text-slate-200">Kết thúc</NutPhu>
        </div>
      </>);
    }
    case 'tong-ket':
      return (<>
        <To onClick={() => tro('van-moi')} mau="bg-indigo-600 active:bg-indigo-700">Chơi ván mới</To>
        {dong}
      </>);
    default:
      return dong;
  }
}

/* ---------- Đấu đội tiếp sức: phần giữa và hàng nút trên điện thoại ---------- */

function BangDauDoi({ tc, gui }: { tc: TrangThaiTroChoi; gui: (l: any) => void }) {
  const tro = (hanh: string, gia?: any) => gui({ viec: 'tro-choi', hanh, gia });
  const cd = tc.caiDat || { soCau: 6, nguon: 'bai' as const };
  const soDoi = cd.soDoi ?? 3;
  const thuong = cd.thuong ?? [3, 2, 1, 0];
  const Dong = ({ nhan, gia, dat, min, max }: { nhan: string; gia: number; dat: (n: number) => void; min: number; max: number }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex-1 text-[13px] text-slate-300 font-bold">{nhan}</span>
      <button onClick={() => dat(Math.max(min, gia - 1))} className="w-10 h-10 rounded-xl bg-white/10 active:bg-white/20 text-[20px] font-black">−</button>
      <span className="w-10 text-center text-[20px] font-black text-white tabular-nums">{gia}</span>
      <button onClick={() => dat(Math.min(max, gia + 1))} className="w-10 h-10 rounded-xl bg-white/10 active:bg-white/20 text-[20px] font-black">+</button>
    </div>
  );
  if (tc.giaiDoan === 'cai-dat' || tc.giaiDoan === 'tai') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-2">🏁 Đấu đội · cài đặt</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(['bai', 'chuong'] as const).map(n => (
            <button key={n} onClick={() => tro('nguon', n)}
                    className={`py-2.5 rounded-xl font-black text-[14px] ${cd.nguon === n ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200'}`}>
              {n === 'bai' ? 'Bài này' : 'Cả chương'}
            </button>
          ))}
        </div>
        <Dong nhan="Số câu (câu cuối ×2)" gia={cd.soCau} dat={n => tro('so-cau', n)} min={1} max={30} />
        <Dong nhan="Số đội" gia={soDoi} dat={n => tro('so-doi', n)} min={2} max={4} />
        <div className="text-[12px] text-slate-400 mt-2 mb-1">Điểm thưởng mỗi em theo hạng đội</div>
        {Array.from({ length: soDoi }, (_, k) => (
          <Dong key={k} nhan={`Hạng ${k + 1}`} gia={thuong[k] || 0} dat={n => tro('thuong', thuong.map((x, i) => i === k ? n : x))} min={0} max={10} />
        ))}
      </div>
    );
  }
  const bangDiem = (
    <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, tc.bangDiem.length)}, 1fr)` }}>
      {tc.bangDiem.map((d, i) => (
        <div key={i} className={`rounded-xl px-2 py-1.5 text-center ${cd.doiDaThu?.includes(i) ? 'bg-white/5 opacity-40' : 'bg-white/10'}`}>
          <div className="text-[11px] font-bold text-slate-300 truncate">{d.ten}</div>
          <div className="text-[20px] font-black text-white tabular-nums">{d.diem}</div>
        </div>
      ))}
    </div>
  );
  if (tc.giaiDoan === 'chia-doi') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-2">🏁 Đã chia {tc.bangDiem.length} đội</div>
        {bangDiem}
        <p className="text-[12.5px] text-slate-400">Đổi em sang đội khác thì bấm tên em ấy trên máy chiếu. Xong bấm Bắt đầu câu 1.</p>
      </div>
    );
  }
  if (tc.giaiDoan === 'tong-ket') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-2">🏁 Tổng kết</div>
        {[...tc.bangDiem].sort((a, b) => b.diem - a.diem).map((d, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
            <span className="w-6 text-[12px] text-slate-500 font-black">{i + 1}</span>
            <span className="flex-1 text-[14px] font-bold text-white">{d.ten}</span>
            <span className="text-[15px] font-black text-white tabular-nums">{d.diem}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
      <div className="text-[12px] font-black text-orange-300 uppercase tracking-widest mb-1">🏁 Đấu đội · câu {tc.cau}/{tc.tongCau}</div>
      <div className="text-[13px] text-amber-200 font-bold mb-2">{TEN_MUC[tc.muc] || 'Nhận biết'} · ±{tc.diemCau}</div>
      {bangDiem}
      {tc.tenHS && <div className="text-[18px] font-black text-white">{tc.tenHS}</div>}
    </div>
  );
}

function BangNutDauDoi({ tc, gui }: { tc: TrangThaiTroChoi; gui: (l: any) => void }) {
  const tro = (hanh: string, gia?: any) => gui({ viec: 'tro-choi', hanh, gia });
  const cd = tc.caiDat || { soCau: 6, nguon: 'bai' as const };
  const To = ({ onClick, mau, children }: { onClick: () => void; mau: string; children: React.ReactNode }) => (
    <button onClick={onClick} className={`${mau} w-full text-white font-black py-4 rounded-2xl text-[19px] flex items-center justify-center gap-2`}>{children}</button>
  );
  const dong = (
    <button onClick={() => tro('dong')}
            className="w-full mt-2 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-slate-300 font-bold text-[13.5px] flex items-center justify-center gap-2">
      <X className="w-4 h-4" /> Đóng trò chơi
    </button>
  );
  const MAU = ['bg-rose-500 active:bg-rose-600', 'bg-sky-500 active:bg-sky-600', 'bg-amber-500 active:bg-amber-600', 'bg-violet-500 active:bg-violet-600'];
  switch (tc.giaiDoan) {
    case 'cai-dat': case 'tai':
      return (<><To onClick={() => tro('bat-dau')} mau="bg-indigo-600 active:bg-indigo-700">{tc.giaiDoan === 'tai' ? 'Đang tải…' : 'Chia đội'}</To>{dong}</>);
    case 'chia-doi':
      return (<>
        <To onClick={() => tro('bat-dau')} mau="bg-indigo-600 active:bg-indigo-700">▶ Bắt đầu câu 1</To>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NutPhu onClick={() => tro('xao-doi')} mau="bg-white/10 active:bg-white/20 text-slate-200">Xáo lại đội</NutPhu>
          <NutPhu onClick={() => tro('dong')} mau="bg-white/10 active:bg-white/20 text-slate-200">Đóng</NutPhu>
        </div>
      </>);
    case 'hoi':
      return (<>
        <p className="text-center text-[12.5px] text-slate-400 mb-2">Đội nào giơ bảng trước?</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, tc.bangDiem.length)}, 1fr)` }}>
          {tc.bangDiem.map((d, i) => (
            <button key={i} disabled={cd.doiDaThu?.includes(i)} onClick={() => tro('doi-gio', i)}
                    className={`${MAU[i]} disabled:opacity-30 text-white font-black py-4 rounded-2xl text-[15px]`}>{d.ten}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NutPhu onClick={() => gui({ viec: 'hien-dap-an' })} mau="bg-white/10 active:bg-white/20 text-slate-200">Không đội nào — chữa</NutPhu>
          <NutPhu onClick={() => tro('ket-thuc')} mau="bg-white/10 active:bg-white/20 text-slate-200">Kết thúc</NutPhu>
        </div>
      </>);
    case 'cham':
      return (<>
        <p className="text-center text-[12.5px] text-slate-400 mb-2">{tc.tenHS} — bấm đáp án đội viết ở trên rồi <b>Hiển thị đáp án</b>.</p>
        <div className="grid grid-cols-2 gap-2">
          <NutPhu onClick={() => tro('ket-thuc')} mau="bg-white/10 active:bg-white/20 text-slate-200">Kết thúc</NutPhu>
          <NutPhu onClick={() => tro('dong')} mau="bg-white/10 active:bg-white/20 text-slate-200">Đóng</NutPhu>
        </div>
      </>);
    case 'cham-tl':
      return (<>
        <p className="text-center text-[12.5px] text-slate-400 mb-2">{tc.tenHS} trình bày xong — thầy chấm:</p>
        <div className="grid grid-cols-2 gap-2">
          <To onClick={() => tro('cham', true)} mau="bg-emerald-600 active:bg-emerald-700">Đúng +{tc.diemCau}</To>
          <To onClick={() => tro('cham', false)} mau="bg-rose-600 active:bg-rose-700">Sai −{tc.diemCau}</To>
        </div>
      </>);
    case 'ket-qua': case 'chua': {
      const gianh = tc.giaiDoan === 'ket-qua' && tc.ketQua === 'sai' && !!cd.conDoiGianh;
      return (<>
        {tc.ketQua && (
          <div className={`text-center text-[15px] font-black mb-2 ${tc.ketQua === 'dung' ? 'text-emerald-300' : 'text-rose-300'}`}>
            {tc.tenHS}: {tc.ketQua === 'dung' ? `đúng +${tc.diemCau}` : `sai −${tc.diemCau}`}
          </div>
        )}
        <div className={`grid gap-2 ${gianh ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {gianh && <To onClick={() => tro('gianh')} mau="bg-orange-500 active:bg-orange-600">Đội khác giành</To>}
          <To onClick={() => tro('cau-tiep')} mau="bg-indigo-600 active:bg-indigo-700">{tc.cau >= tc.tongCau ? 'Tổng kết' : 'Câu tiếp'} <ChevronRight className="w-6 h-6" /></To>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {tc.giaiDoan === 'ket-qua' && tc.ketQua === 'dung'
            ? <NutPhu onClick={() => tro('nguoi-khac')} mau="bg-white/10 active:bg-white/20 text-slate-200">Người khác</NutPhu>
            : <NutPhu onClick={() => gui({ viec: 'cuon', huong: 1 })} mau="bg-white/10 active:bg-white/20 text-slate-200">Cuộn xuống</NutPhu>}
          {tc.giaiDoan === 'ket-qua'
            ? <NutPhu onClick={() => tro('chua')} mau="bg-white/10 active:bg-white/20 text-slate-200">Chữa</NutPhu>
            : <NutPhu onClick={() => gui({ viec: 'cuon', huong: -1 })} mau="bg-white/10 active:bg-white/20 text-slate-200">Cuộn lên</NutPhu>}
          <NutPhu onClick={() => tro('ket-thuc')} mau="bg-white/10 active:bg-white/20 text-slate-200">Kết thúc</NutPhu>
        </div>
      </>);
    }
    case 'tong-ket':
      return (<><To onClick={() => tro('van-moi')} mau="bg-indigo-600 active:bg-indigo-700">Chơi ván mới</To>{dong}</>);
    default:
      return dong;
  }
}
