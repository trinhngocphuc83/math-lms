"use client";

import React from "react";
import confetti from "canvas-confetti";
import { X, Loader2, Play, Volume2, VolumeX, RotateCcw, Trophy, TrendingUp } from "lucide-react";
import { layBangVinhDanh, type BangVinhDanh, type DongVinhDanh } from "@/app/actions/goiTenVaDiem";
import { LOI_CHUA_TAO_BANG, thangNay } from "@/utils/goiTenVaDiem";
import { keoFanfare, trongDon, NhacNen } from "@/utils/amThanhSanKhau";
import { chuanBiGiong, noiNgay } from "@/utils/giongDocAI";

/**
 * Sân khấu vinh danh - chiếu lên tivi cuối tháng.
 *
 * DIỄN THEO TRÌNH TỰ, KHÔNG BÀY HẾT MỘT LÚC: trống dồn → lộ hạng ba → hạng nhì → hạng
 * nhất, mỗi lần một tràng pháo giấy và xướng tên. Bày sẵn cả bảng thì hết cái để chờ,
 * mà chờ mới là chỗ vui của lễ vinh danh.
 *
 * Dựng theo khung 16:9 rồi phóng cả khối cho vừa màn - đúng cách trang trình chiếu đang
 * làm, nhờ vậy chiếu tivi to hay màn nhỏ đều cân.
 */

const BUC = [
  { hang: 1, cao: 210, mau: 'from-amber-300 to-yellow-500', vien: 'border-amber-200', huy: '🥇', chu: 'text-amber-950' },
  { hang: 2, cao: 155, mau: 'from-slate-200 to-slate-400', vien: 'border-slate-100', huy: '🥈', chu: 'text-slate-900' },
  { hang: 3, cao: 115, mau: 'from-orange-300 to-amber-600', vien: 'border-orange-200', huy: '🥉', chu: 'text-orange-950' },
];

/** Thứ tự lộ mặt: hạng ba trước, hạng nhất sau cùng. */
const THU_TU_LO = [2, 1, 0];

export default function SanKhauVinhDanh({
  isOpen, onClose, lopId, thang,
}: {
  isOpen: boolean;
  onClose: () => void;
  lopId: string;
  /** 'YYYY-MM'; bỏ trống thì lấy tháng này */
  thang?: string;
}) {
  const [bang, setBang] = React.useState<BangVinhDanh | null>(null);
  const [dangTai, setDangTai] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [chuaTaoBang, setChuaTaoBang] = React.useState(false);

  /** Đã lộ mấy vị trí trong bục (0..3) */
  const [daLo, setDaLo] = React.useState(0);
  const [dangDien, setDangDien] = React.useState(false);
  const [dangChuanBi, setDangChuanBi] = React.useState(false);
  const [xong, setXong] = React.useState(false);
  const [coNhac, setCoNhac] = React.useState(true);
  const [bang2, setBang2] = React.useState(false);   // đã mở bảng tổng điểm chưa

  const nhac = React.useRef<NhacNen | null>(null);
  const boc = React.useRef<HTMLDivElement>(null);
  const [tiLe, setTiLe] = React.useState(1);

  /* ------------------------------------------------------------- nạp dữ liệu */
  React.useEffect(() => {
    if (!isOpen || !lopId) return;
    setDaLo(0); setXong(false); setBang2(false); setLoi(''); setChuaTaoBang(false);
    setDangTai(true);
    layBangVinhDanh(lopId, thang)
      .then(setBang)
      .catch((e: any) => {
        if (e?.message === LOI_CHUA_TAO_BANG) setChuaTaoBang(true);
        else setLoi(e?.message || 'Không đọc được bảng vinh danh.');
      })
      .finally(() => setDangTai(false));
  }, [isOpen, lopId, thang]);

  /* Phóng khung 1600x900 cho vừa màn hình, giống trang trình chiếu. */
  React.useEffect(() => {
    if (!isOpen) return;
    const do_ = () => {
      const w = window.innerWidth, h = window.innerHeight;
      setTiLe(Math.min(w / 1600, h / 900));
    };
    do_();
    window.addEventListener('resize', do_);
    return () => window.removeEventListener('resize', do_);
  }, [isOpen]);

  /* Đóng thì tắt nhạc, đừng để nhạc chạy tiếp sau lưng. */
  React.useEffect(() => {
    if (isOpen) return;
    nhac.current?.tat();
    nhac.current = null;
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') { nhac.current?.tat(); onClose(); } };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ds: DongVinhDanh[] = (bang?.coThangTruoc ? bang?.theoTienBo : bang?.theoTong) || [];
  const top3 = ds.slice(0, 3);

  const banPhaoGiay = (manh = 1) => {
    try {
      confetti({ particleCount: Math.round(120 * manh), spread: 95, origin: { y: 0.4 } });
      confetti({ particleCount: Math.round(60 * manh), angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: Math.round(60 * manh), angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
    } catch { /* thôi */ }
  };

  /** Diễn cả buổi: trống dồn → lộ từng hạng → kèn chào. */
  const dien = async () => {
    if (dangDien || top3.length === 0) return;
    setDangDien(true); setDaLo(0); setXong(false);

    if (coNhac) {
      nhac.current = new NhacNen();
      await nhac.current.bat(0.4);
    }

    /*
     * LẤY SẴN CẢ BA CÂU XƯỚNG TÊN NGAY TỪ ĐẦU, chạy song song.
     *
     * Đo trên máy: xướng từng tên mới đi gọi giọng AI thì cả buổi lễ quá 15 giây vẫn chưa
     * xong, đứng im chờ tiếng. Nay ba câu cùng lấy một lúc trong lúc trống đang dồn.
     */
    const cauXuong = top3.map((em, k) => {
      const hang = k + 1;
      return {
        cau: `Hạng ${hang === 1 ? 'nhất' : hang === 2 ? 'nhì' : 'ba'}, em ${em.hs.ten}`,
        tieng: chuanBiGiong(
          `vinh-danh-hang-${hang}-${em.hs.id}`,
          `Hạng ${hang === 1 ? 'nhất' : hang === 2 ? 'nhì' : 'ba'}, em ${em.hs.ten}`,
        ),
      };
    });

    /*
     * CHỜ LẤY XONG CẢ BA GIỌNG RỒI MỚI MỞ MÀN.
     *
     * Bản trước cho chạy song song rồi xướng luôn, nhưng hạng ba xướng chỉ sau 1,6 giây
     * trống dồn - chưa kịp lấy giọng nên rơi vào giọng dự phòng, máy không có giọng Việt
     * thì chỉ kêu chuông: nghe như KHÔNG ĐỌC TÊN HẠNG BA. Nay đợi hẳn (tối đa 9 giây,
     * có nhạc nền chạy nên không bị trống trải), vào lễ là cả ba đều đọc trót lọt.
     */
    setDangChuanBi(true);
    await Promise.race([
      Promise.all(cauXuong.map(x => x.tieng)),
      new Promise(o => setTimeout(o, 9000)),
    ]);
    setDangChuanBi(false);

    for (let i = 0; i < top3.length; i++) {
      const viTri = THU_TU_LO[3 - top3.length + i] ?? (top3.length - 1 - i);
      await trongDon(i === top3.length - 1 ? 2.6 : 1.6);

      setDaLo(n => n + 1);
      banPhaoGiay(viTri === 0 ? 1.6 : 1);

      const em = top3[viTri];
      if (em) {
        nhac.current?.haNho();
        /* Chờ giọng AI tối đa 1,5 giây rồi để giọng máy đọc - đừng để sân khấu đứng im. */
        const x = cauXuong[viTri];
        const kip = await Promise.race([
          x.tieng,
          new Promise<null>(o => setTimeout(() => o(null), 1500)),
        ]);
        if (kip) await kip.phat(); else noiNgay(x.cau);
        nhac.current?.nangLai(0.4);
      }
      await new Promise(x => setTimeout(x, 700));
    }

    await keoFanfare();
    banPhaoGiay(2);
    setXong(true);
    setDangDien(false);
  };

  const dienLai = () => { setDaLo(0); setXong(false); setBang2(false); dien(); };

  const tenThang = (bang?.thang || thang || thangNay()).split('-').reverse().join('/');

  return (
    <div className="fixed inset-0 z-[130] bg-black flex items-center justify-center overflow-hidden">

      {/* Nút điều khiển - nổi góc, không nằm trong khung phóng */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {xong && (
          <button onClick={dienLai} title="Diễn lại"
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => { setCoNhac(v => !v); if (coNhac) nhac.current?.tat(); }}
                title={coNhac ? 'Tắt nhạc' : 'Bật nhạc'}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          {coNhac ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button onClick={() => { nhac.current?.tat(); onClose(); }} title="Đóng (Esc)"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Phông sân khấu */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b3d] via-[#2b1155] to-[#0b0620]" />
      {/* Hai luồng đèn quét từ trên xuống */}
      <div className="absolute -top-1/3 left-1/4 w-[520px] h-[160%] -rotate-12 opacity-30 blur-2xl
                      bg-gradient-to-b from-fuchsia-400/70 via-violet-500/25 to-transparent" />
      <div className="absolute -top-1/3 right-1/4 w-[520px] h-[160%] rotate-12 opacity-30 blur-2xl
                      bg-gradient-to-b from-amber-300/70 via-orange-500/25 to-transparent" />
      {/* Vầng sáng nền sàn */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[380px] rounded-[50%]
                      bg-amber-300/10 blur-3xl" />

      <div ref={boc}
           style={{ width: 1600, height: 900, transform: `scale(${tiLe})` }}
           className="relative z-10 flex flex-col items-center justify-center px-16">

        {chuaTaoBang ? (
          <p className="text-amber-200 text-[30px] font-black text-center">
            Chưa tạo bảng dữ liệu — chạy tệp scratch/tao-bang-diem-thuong.sql trước đã.
          </p>
        ) : loi ? (
          <p className="text-rose-300 text-[26px] font-bold">{loi}</p>
        ) : dangTai ? (
          <Loader2 className="w-14 h-14 text-white/70 animate-spin" />
        ) : ds.length === 0 ? (
          <p className="text-white/70 text-[28px] font-bold text-center">
            Lớp chưa có học sinh nào.
          </p>
        ) : (
          <>
            {/* Tiêu đề */}
            <div className="text-center mb-2">
              <div className="text-amber-300/90 text-[26px] font-black tracking-[0.35em] uppercase">
                {bang?.tenLop} · Tháng {tenThang}
              </div>
              <h1 className="text-[86px] leading-none font-black text-transparent bg-clip-text
                             bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500
                             drop-shadow-[0_6px_30px_rgba(251,191,36,0.35)] mt-1">
                VINH DANH
              </h1>
              <div className="text-white/70 text-[24px] font-bold mt-1">
                {bang?.coThangTruoc ? 'Những bạn TIẾN BỘ nhất tháng' : 'Những bạn nhiều điểm nhất tháng'}
              </div>
            </div>

            {/* Bục vinh danh */}
            <div className="flex items-end justify-center gap-8 mt-6">
              {[1, 0, 2].map(viTri => {                     // nhì - nhất - ba, nhất ở giữa
                const em = top3[viTri];
                const b = BUC[viTri];
                if (!em) return null;
                const hien = daLo > THU_TU_LO.indexOf(viTri);
                return (
                  <div key={viTri} className="flex flex-col items-center"
                       style={{ width: viTri === 0 ? 400 : 340 }}>
                    <div className={`transition-all duration-700 ${hien ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                      <div className="text-center mb-3">
                        <div className="text-[56px] leading-none">{b.huy}</div>
                        <div className="text-white font-black leading-tight mt-2 break-words"
                             style={{ fontSize: viTri === 0 ? 42 : 34 }}>
                          {hien ? em.hs.ten : ''}
                        </div>
                        <div className="text-amber-300 font-black mt-1"
                             style={{ fontSize: viTri === 0 ? 30 : 25 }}>
                          {/* Gói cả dòng điểm trong `hien`: chỉ mờ đi thôi thì trình
                              đọc màn hình và ảnh chụp vẫn lộ thứ hạng trước khi xướng. */}
                          {!hien ? '' : bang?.coThangTruoc
                            ? `${em.tang >= 0 ? '+' : ''}${em.tang} điểm so với tháng trước`
                            : `${em.tong} điểm`}
                        </div>
                      </div>
                    </div>
                    {/* overflow-hidden: bục chưa lộ thì cao 0, không có nó thì con số vẫn
                        tràn ra ngoài, lộ hết trước khi xướng tên. */}
                    <div className={`w-full overflow-hidden rounded-t-2xl border-t-4 bg-gradient-to-b ${b.mau} ${b.vien}
                                     flex items-start justify-center pt-3 shadow-[0_-10px_40px_-10px_rgba(251,191,36,0.5)]
                                     transition-all duration-700`}
                         style={{ height: hien ? b.cao : 0 }}>
                      <span className={`font-black ${b.chu}`} style={{ fontSize: viTri === 0 ? 64 : 52 }}>
                        {b.hang}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mở màn / bảng đầy đủ */}
            {dangChuanBi && (
              <div className="mt-10 flex items-center gap-3 text-amber-200 text-[26px] font-black">
                <Loader2 className="w-8 h-8 animate-spin" /> Đang chuẩn bị lời xướng tên...
              </div>
            )}

            {daLo === 0 && !dangDien && (
              <button onClick={dien}
                      className="mt-10 px-12 py-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500
                                 text-amber-950 text-[30px] font-black shadow-2xl hover:scale-105 transition-transform
                                 flex items-center gap-3">
                <Play className="w-8 h-8" /> BẮT ĐẦU LỄ VINH DANH
              </button>
            )}

            {xong && !bang2 && (
              <button onClick={() => setBang2(true)}
                      className="mt-8 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white
                                 text-[22px] font-bold flex items-center gap-2.5 transition-colors">
                <Trophy className="w-6 h-6" /> Xem bảng cả lớp
              </button>
            )}

            {bang2 && (
              <div className="mt-7 w-full grid grid-cols-2 gap-7 max-h-[300px]">
                <BangCon
                  ten="TỔNG ĐIỂM THÁNG"
                  Icon={Trophy}
                  ds={bang?.theoTong || []}
                  so={(d) => `${d.tong}`}
                />
                {bang?.coThangTruoc ? (
                  <BangCon
                    ten="TIẾN BỘ NHẤT"
                    Icon={TrendingUp}
                    ds={bang?.theoTienBo || []}
                    so={(d) => `${d.tang >= 0 ? '+' : ''}${d.tang}`}
                  />
                ) : (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-center">
                    <p className="text-white/60 text-[19px] leading-relaxed">
                      Tháng trước chưa có điểm nào nên chưa so được mức tiến bộ. Từ tháng sau
                      bảng này sẽ hiện.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BangCon({ ten, Icon, ds, so }: {
  ten: string;
  Icon: any;
  ds: DongVinhDanh[];
  so: (d: DongVinhDanh) => string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex flex-col">
      <div className="px-5 py-3 bg-white/10 flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-amber-300" />
        <span className="text-amber-200 font-black tracking-widest text-[17px]">{ten}</span>
      </div>
      <div className="overflow-y-auto">
        {ds.slice(0, 8).map((d, i) => (
          <div key={d.hs.id}
               className="flex items-center gap-3 px-5 py-2 border-b border-white/5 last:border-0">
            <span className="w-8 text-center text-white/40 font-black text-[18px]">{i + 1}</span>
            <span className="flex-1 min-w-0 text-white font-bold text-[20px] truncate">{d.hs.ten}</span>
            <span className="text-amber-300 font-black text-[21px]">{so(d)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
