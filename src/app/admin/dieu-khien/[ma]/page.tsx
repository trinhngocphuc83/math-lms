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
  BookOpen,
} from "lucide-react";
import { studentMarkdownComponents } from "@/components/CustomMarkdownComponents";
import { moKenhDienThoai, type TrangThaiChieu } from "@/utils/dieuKhienXa";
import { docThoiLuongTiengViet } from "@/utils/parseVietnameseDuration";

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
  const [dangNgheMic, setDangNgheMic] = React.useState(false);
  const [loiMic, setLoiMic] = React.useState('');
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

  const hoTroMic = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  /**
   * Bấm rồi nói thời lượng, ví dụ "hai phút" hay "chín mươi giây".
   *
   * Nghe ngay trên ĐIỆN THOẠI chứ không nhờ máy chiếu nghe: micro của máy chiếu ở tận
   * bàn giáo viên, thầy cô đang đứng giữa lớp nói thì nó không nghe rõ. Nghe xong mới
   * gửi số phút lên bảng.
   */
  const ngheMic = () => {
    const Nhan = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Nhan) return;
    setLoiMic('');
    try {
      const nd = new Nhan();
      nd.lang = 'vi-VN';
      nd.interimResults = false;
      nd.maxAlternatives = 3;
      nd.onstart = () => setDangNgheMic(true);
      nd.onend = () => setDangNgheMic(false);
      nd.onerror = (e: any) => {
        setDangNgheMic(false);
        setLoiMic(e?.error === 'not-allowed' ? 'Chưa cho phép dùng micro' : 'Không nghe được, thử lại');
      };
      nd.onresult = (e: any) => {
        for (let i = 0; i < e.results[0].length; i++) {
          const giay = docThoiLuongTiengViet(e.results[0][i].transcript);
          if (giay) {
            /* Máy chiếu nhận theo PHÚT, nên chia ra - "chín mươi giây" thành 1,5 phút. */
            gui({ viec: 'dat-gio', phut: giay / 60 });
            setMoBangGio(false);
            return;
          }
        }
        setLoiMic(`Chưa hiểu “${e.results[0][0]?.transcript || ''}”, nói lại nhé`);
      };
      nd.start();
    } catch { setLoiMic('Không mở được micro'); }
  };

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
          />
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
            <button onClick={ngheMic} disabled={dangNgheMic}
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
        {dangGoiTen ? (
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
function BangCauHoi({ cauHoi, chu, datChu, traLoiNgan, gui }: {
  cauHoi: NonNullable<TrangThaiChieu['cauHoi']>;
  chu: string;
  datChu: (s: string) => void;
  traLoiNgan: boolean;
  gui: (l: any) => void;
}) {
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
              <button key={i} disabled={!cauHoi.bamDuoc}
                      onClick={() => gui({ viec: 'chon-dap-an', chon: i })}
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
