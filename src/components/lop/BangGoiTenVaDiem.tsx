"use client";

import React from "react";
import confetti from "canvas-confetti";
import { X, Loader2, RefreshCw, Volume2, VolumeX, Download, UserX, Undo2, Plus, Minus, Dices, AlertTriangle } from "lucide-react";
/* Việc của thầy cô phải đi qua máy chủ: bảng enrollments có RLS chặn, trình duyệt đọc
   thẳng ra 0 dòng dù lớp có 16 em. Trang lớp học cũng đi đường này. */
import {
  layTrangThaiQuay, ghiDaGoi, boGoiTen, congDiem, layDsLop, layLopTheoBai, daChotThang,
} from "@/app/actions/goiTenVaDiem";
import { LOI_CHUA_TAO_BANG, type HocSinh, type TrangThaiQuay } from "@/utils/goiTenVaDiem";
import { chuanBiMoiEm, noiCongDiem, noiNgay, type CachDoc } from "@/utils/giongDocAI";
import VongQuayTen from "./VongQuayTen";
import { NhacNen } from "@/utils/amThanhSanKhau";

/**
 * Bảng "Gọi tên & Điểm" - MỘT bảng dùng chung, mở được ở bất cứ đâu.
 *
 * Cố ý làm thành thành phần tự chứa, chỉ nhận `lopId` (và `lessonId` nếu có): nó không
 * biết gì về slide, không phụ thuộc trang nào. Nhờ vậy sau này dựng màn chữa bài luyện
 * tập thì chỉ việc thả nó vào, không phải làm lại và không làm đứt mạch điểm.
 *
 * Mọi thứ khoá theo LỚP nên vòng quay và điểm nối liền qua mọi bài giảng, mọi buổi.
 */

const NHO_LOP = 'lop-goi-ten-lan-truoc';

export default function BangGoiTenVaDiem({
  isOpen, onClose, lopGoiY, lessonId, lenhTuXa, onDoiTrangThai,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Lớp muốn dùng sẵn (mở từ trang lớp học thì truyền vào đây) */
  lopGoiY?: string;
  /** Chỉ để ghi nhớ đã gọi ở bài nào - không dùng để lọc */
  lessonId?: string;
  /**
   * Lệnh bấm từ ĐIỆN THOẠI. `dem` tăng mỗi lần bấm - nhờ đó bấm hai lần cùng một việc
   * vẫn chạy hai lần, chứ so nội dung lệnh thì lần thứ hai bị bỏ qua.
   */
  lenhTuXa?: { viec: string; diem?: number; dem: number } | null;
  /** Báo ngược lên để máy chiếu phát xuống điện thoại */
  onDoiTrangThai?: (tt: { trungAi: string; tomTat: string }) => void;
}) {
  const [dsCacLop, setDsCacLop] = React.useState<{ id: string; name: string }[]>([]);
  const [lopId, setLopId] = React.useState<string>('');
  const [trangThai, setTrangThai] = React.useState<TrangThaiQuay | null>(null);
  const [dangTai, setDangTai] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [chuaTaoBang, setChuaTaoBang] = React.useState(false);
  const [daChot, setDaChot] = React.useState(false);

  const [dangQuay, setDangQuay] = React.useState(false);
  /** Người trúng được bốc TRƯỚC rồi băng mới dừng vào đó - xem VongQuayTen. */
  const [seTrung, setSeTrung] = React.useState<HocSinh | null>(null);
  const [trungAi, setTrungAi] = React.useState<HocSinh | null>(null);
  const [cachDoc, setCachDoc] = React.useState<CachDoc | null>(null);

  /** Em vắng - chỉ bỏ qua trong BUỔI NÀY, không ghi vào CSDL, không tính là đã gọi. */
  const [vangHomNay, setVangHomNay] = React.useState<Set<string>>(new Set());

  /** Nhạc chạy trong lúc quay - tắt gọn khi dừng để nghe rõ tiếng đọc tên. */
  const nhacQuay = React.useRef<NhacNen | null>(null);
  const [batNhac, setBatNhac] = React.useState(true);

  /** Tiếng đọc tên đã lấy sẵn, chờ băng cuộn dừng là phát. */
  const tiengCho = React.useRef<Promise<{ phat: () => Promise<CachDoc> }> | null>(null);

  /** Tải sẵn giọng cả lớp trước buổi dạy - xem nút "Tải sẵn giọng". */
  const [dangTaiGiong, setDangTaiGiong] = React.useState(0);

  const [emKhac, setEmKhac] = React.useState('');
  const [vuaCong, setVuaCong] = React.useState('');

  /* ------------------------------------------------------------------ nạp lớp */
  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const tatCa = await layDsLop();
      setDsCacLop(tatCa);

      let chon = lopGoiY || '';
      if (!chon && lessonId) {
        const theoBai = await layLopTheoBai(lessonId);
        if (theoBai.length > 0) chon = theoBai[0].id;
      }
      if (!chon) chon = localStorage.getItem(NHO_LOP) || '';
      if (!chon || !tatCa.some(l => l.id === chon)) chon = tatCa[0]?.id || '';
      setLopId(chon);
    })();
  }, [isOpen, lopGoiY, lessonId]);

  /* ------------------------------------------------- nạp trạng thái theo lớp */
  const napLai = React.useCallback(async () => {
    if (!lopId) return;
    setDangTai(true); setLoi(''); setChuaTaoBang(false);
    try {
      setTrangThai(await layTrangThaiQuay(lopId));
      setDaChot(await daChotThang(lopId));
    } catch (e: any) {
      if (e?.message === LOI_CHUA_TAO_BANG) setChuaTaoBang(true);
      else setLoi(e?.message || 'Không đọc được danh sách.');
    } finally {
      setDangTai(false);
    }
  }, [lopId]);

  React.useEffect(() => {
    if (!isOpen || !lopId) return;
    localStorage.setItem(NHO_LOP, lopId);
    setTrungAi(null); setVangHomNay(new Set());
    napLai();
  }, [isOpen, lopId, napLai]);

  React.useEffect(() => {
    if (!isOpen) return;
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /** Những em thật sự được đưa vào vòng quay lúc này. */
  const dsQuay: HocSinh[] = (trangThai?.conLai || []).filter(h => !vangHomNay.has(h.id));

  /* ------------------------------------------------------------------- quay */
  const quay = () => {
    if (dangQuay || dsQuay.length === 0 || !trangThai) return;
    const trung = dsQuay[Math.floor(Math.random() * dsQuay.length)];
    setTrungAi(null); setCachDoc(null);
    setSeTrung(trung);
    setDangQuay(true);

    /*
     * ĐI LẤY TIẾNG NGAY TỪ LÚC NÀY, chạy song song với lúc băng đang cuộn.
     *
     * Gọi giọng AI mất mấy giây. Bản trước đợi quay xong mới gọi nên tiếng ra trễ hẳn -
     * Thầy nghe như phải bấm nút cộng điểm thì mới đọc. Nay quay dừng là phát liền.
     */
    const tiengDaSan = chuanBiMoiEm(trung.id, trung.ten);

    /* Nhạc quay số cho có không khí. Tắt gọn ngay khi băng dừng để không át tiếng đọc tên. */
    if (batNhac) {
      nhacQuay.current = new NhacNen('quay-so.mp3', true);
      nhacQuay.current.bat(0.5);
    }

    /* Ghi nhận đã gọi, cũng làm luôn trong lúc quay cho khỏi chờ thêm. */
    ghiDaGoi(lopId, trung.id, trangThai.vong, lessonId).catch(() => { /* vẫn quay tiếp được */ });

    tiengCho.current = tiengDaSan;
  };

  /** Băng cuộn dừng: hiện tên, nổ pháo giấy, và ĐỌC NGAY. */
  const quayXong = async () => {
    const trung = seTrung;
    setDangQuay(false);
    if (!trung) return;

    nhacQuay.current?.tat(true);   // tắt gọn, nhường chỗ cho tiếng đọc tên
    nhacQuay.current = null;

    setTrungAi(trung);
    try { confetti({ particleCount: 110, spread: 80, origin: { y: 0.35 } }); } catch { /* thôi */ }
    setTrangThai(t => t ? { ...t, conLai: t.conLai.filter(h => h.id !== trung.id) } : t);

    /*
     * CHỜ GIỌNG AI TỐI ĐA 1,2 GIÂY rồi thôi.
     *
     * Lần đầu đọc một cái tên, gọi Google mất mấy giây - đo trên máy là quá 6 giây vẫn
     * chưa xong. Quay dừng mà im lặng chừng ấy thì cả lớp cụt hứng. Nên chờ một nhịp
     * ngắn, không kịp thì để giọng máy đọc ngay. Lần sau đã có bản nhớ nên tức thì.
     */
    try {
      const kip = await Promise.race([
        tiengCho.current,
        new Promise<null>(x => setTimeout(() => x(null), 1200)),
      ]);
      if (kip) {
        setCachDoc(await kip.phat());
      } else {
        setCachDoc(noiNgay(`Mời em ${trung.ten}`));
      }
    } catch { /* im tiếng thì thôi, không được vỡ giao diện lúc đang dạy */ }
  };

  /**
   * QUAY NHẦM: bỏ em vừa trúng ra khỏi danh sách đã gọi, trả lại vòng quay.
   *
   * Khác hẳn nút "Vắng": vắng là em đó CÓ được gọi rồi nhưng hôm nay không có mặt nên bỏ
   * qua trong buổi này; còn quay nhầm thì coi như chưa từng gọi, em vẫn nằm nguyên trong
   * vòng và lần sau vẫn quay ra được.
   */
  const boLaiVaoVong = async () => {
    if (!trungAi || !trangThai) return;
    try {
      await boGoiTen(lopId, trungAi.id, trangThai.vong);
      setTrangThai(t => t && !t.conLai.some(h => h.id === trungAi.id)
        ? { ...t, conLai: [...t.conLai, trungAi] } : t);
      setVuaCong(`Đã bỏ lại ${trungAi.ten} vào vòng quay.`);
      setTimeout(() => setVuaCong(''), 3000);
    } catch { setVuaCong('Không bỏ lại được.'); }
    setTrungAi(null); setCachDoc(null);
  };

  /** Em vắng: KHÔNG tính là đã gọi, chỉ bỏ qua trong buổi này. */
  const danhDauVang = () => {
    if (!trungAi) return;
    setVangHomNay(s => new Set(s).add(trungAi.id));
    // Trả em đó lại danh sách chưa gọi (dsQuay đã lọc riêng theo vangHomNay)
    setTrangThai(t => t && !t.conLai.some(h => h.id === trungAi.id)
      ? { ...t, conLai: [...t.conLai, trungAi] } : t);
    setTrungAi(null); setCachDoc(null);
  };

  const cong = async (hs: HocSinh | null, diem: number) => {
    if (!hs) return;
    try {
      const duoc = await congDiem(lopId, {
        student_id: hs.id, diem,
        ly_do: diem > 0 ? 'Trả lời đúng trên lớp' : 'Chưa trả lời được',
        nguon: 'tuong_tac',
      }, lessonId);
      setVuaCong(duoc
        ? `${diem > 0 ? '+' : ''}${diem} cho ${hs.ten}`
        : 'Tháng này đã chốt, không cộng thêm được.');
      /* Nói ra cho cả lớp nghe, không phải chỉ mình thầy cô thấy con số nhảy. */
      if (duoc) noiCongDiem(hs.id, hs.ten, diem).catch(() => { /* im tiếng thì thôi */ });
    } catch (e: any) {
      setVuaCong(e?.message === LOI_CHUA_TAO_BANG ? 'Chưa tạo bảng điểm.' : 'Không cộng được điểm.');
    }
    setTimeout(() => setVuaCong(''), 2600);
  };

  /**
   * Lấy trước giọng đọc tên cho CẢ LỚP.
   *
   * Lần đầu đọc một cái tên, gọi Google mất mấy giây - quay xong phải chờ, hoặc rơi vào
   * giọng máy. Bấm nút này một lần trước buổi dạy là cả buổi đọc tức thì, và mạng chập
   * chờn cũng không sao vì đã có bản nhớ.
   */
  const taiSanGiong = async () => {
    const ds = trangThai?.caLop || [];
    if (dangTaiGiong || ds.length === 0) return;
    let xong = 0, hong = 0;
    for (let i = 0; i < ds.length; i++) {
      setDangTaiGiong(i + 1);
      try {
        const g = await chuanBiMoiEm(ds[i].id, ds[i].ten);
        if (g.nguon === 'du-phong') hong++; else { xong++; hong = 0; }
      } catch { hong++; }
      /*
       * HẾT HẠN MỨC THÌ DỪNG, đừng cố chạy hết.
       *
       * Đo trên máy: tải liền 16 tên là cạn sạch hạn mức giọng AI trong ngày của cả 5
       * khoá. Hỏng ba lần liên tiếp gần như chắc chắn là hết hạn mức, chạy tiếp cũng
       * không được gì mà còn mất thời gian.
       */
      if (hong >= 3) break;
    }
    setDangTaiGiong(0);
    setVuaCong(hong >= 3
      ? `Hết hạn mức giọng AI hôm nay. Đã tải được ${xong}/${ds.length} em - mai bấm tiếp, số đã tải vẫn đọc ngay.`
      : `Đã tải sẵn giọng cho ${xong}/${ds.length} em - cả buổi sẽ đọc ngay.`);
    setTimeout(() => setVuaCong(''), 6000);
  };

  /* Nhận lệnh bấm từ điện thoại. Chỉ chạy khi số đếm đổi, nên bấm mấy lần chạy mấy lần. */
  const demDaLam = React.useRef(0);
  React.useEffect(() => {
    if (!isOpen || !lenhTuXa || lenhTuXa.dem === demDaLam.current) return;
    demDaLam.current = lenhTuXa.dem;
    switch (lenhTuXa.viec) {
      case 'quay': quay(); break;
      case 'vang': danhDauVang(); break;
      case 'bo-lai': boLaiVaoVong(); break;
      case 'diem': cong(trungAi, lenhTuXa.diem ?? 1); break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenhTuXa, isOpen]);

  /* Đổi gì thì báo lên để máy chiếu phát xuống điện thoại. */
  React.useEffect(() => {
    if (!isOpen || !trangThai) return;
    onDoiTrangThai?.({
      trungAi: trungAi?.ten || '',
      tomTat: `Vòng ${trangThai.vong} · còn ${dsQuay.length}/${trangThai.caLop.length}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, trungAi, trangThai, vangHomNay]);

  const emDuocChon = trangThai?.caLop.find(h => h.id === emKhac) || null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-[560px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Đầu bảng */}
        <div className="shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 flex items-center gap-3">
          <Dices className="w-6 h-6 text-white shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-black text-white leading-tight">Gọi tên &amp; Điểm</h2>
            {trangThai && (
              <p className="text-[11.5px] text-violet-50/90 leading-tight">
                Vòng {trangThai.vong} · còn {dsQuay.length}/{trangThai.caLop.length} em chưa gọi
              </p>
            )}
          </div>
          <select value={lopId} onChange={e => setLopId(e.target.value)}
                  className="ml-auto max-w-[150px] px-2 py-1.5 rounded-lg bg-white/15 border border-white/25
                             text-[12.5px] text-white outline-none focus:bg-white/25">
            {dsCacLop.map(l => (
              <option key={l.id} value={l.id} className="text-slate-800">{l.name}</option>
            ))}
          </select>
          <button onClick={() => { setBatNhac(v => !v); if (batNhac) { nhacQuay.current?.tat(true); nhacQuay.current = null; } }}
                  title={batNhac ? 'Đang bật nhạc quay số - bấm để tắt' : 'Đang tắt nhạc quay số - bấm để bật'}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg shrink-0">
            {batNhac ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={napLai} title="Tải lại danh sách lớp"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg shrink-0">
            <RefreshCw className={`w-4 h-4 ${dangTai ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} title="Đóng (Esc)"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {chuaTaoBang ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13.5px]">
              <div className="font-black flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4" /> Chưa tạo bảng dữ liệu
              </div>
              Chạy một lần tệp <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">
              scratch/tao-bang-diem-thuong.sql</code> trong Supabase → SQL Editor, rồi mở lại bảng này.
            </div>
          ) : loi ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold">{loi}</div>
          ) : (
            <>
              {daChot && (
                <div className="mb-3 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[12.5px] font-bold">
                  Tháng này đã chốt — vẫn quay tên được, nhưng không cộng/trừ điểm nữa.
                </div>
              )}

              {/* Vòng quay */}
              <VongQuayTen
                dsTen={dsQuay.map(h => h.ten)}
                trungTen={seTrung?.ten || null}
                dangQuay={dangQuay}
                onXong={quayXong}
              />
              {trungAi && (
                <div className="mt-1.5 text-center text-[12.5px] font-bold text-violet-500">
                  {cachDoc === 'ai' && '🔊 giọng AI'}
                  {cachDoc === 'da-nho' && '🔊 giọng đã nhớ'}
                  {cachDoc === 'giong-may' && '🔊 giọng máy'}
                  {cachDoc === 'chuong' && '🔔 không có giọng, dùng chuông'}
                  {cachDoc === null && '🔊 đang lấy giọng...'}
                </div>
              )}

              <button onClick={quay} disabled={dangQuay || dsQuay.length === 0}
                      className="mt-3 w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50
                                 text-white font-black py-3 rounded-xl text-[15px] flex items-center justify-center gap-2">
                {dangQuay ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang quay...</>
                  : dsQuay.length === 0 ? 'Lớp chưa có học sinh nào'
                  : <><Dices className="w-5 h-5" /> QUAY</>}
              </button>

              {/* Cộng điểm cho em vừa quay trúng */}
              {trungAi && (
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => cong(trungAi, 1)} disabled={daChot}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white
                                     font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4" /> Đúng
                  </button>
                  <button onClick={() => cong(trungAi, -1)} disabled={daChot}
                          className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white
                                     font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5">
                    <Minus className="w-4 h-4" /> Chưa được
                  </button>
                  <button onClick={danhDauVang} title="Em này vắng - bỏ qua buổi hôm nay, không tính là đã gọi"
                          className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-50
                                     font-bold text-sm flex items-center gap-1.5">
                    <UserX className="w-4 h-4" /> Vắng
                  </button>
                  <button onClick={boLaiVaoVong}
                          title="Quay nhầm - bỏ em này lại vào vòng quay, coi như chưa từng gọi"
                          className="px-3 py-2.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50
                                     font-bold text-sm flex items-center gap-1.5">
                    <Undo2 className="w-4 h-4" /> Bỏ lại
                  </button>
                </div>
              )}

              {/* Cộng cho em xung phong, không cần quay */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wide">
                    Cộng cho em xung phong (không cần quay)
                  </div>
                  <button onClick={taiSanGiong} disabled={dangTaiGiong > 0}
                          title="Lấy trước giọng đọc tên cả lớp - bấm một lần trước buổi dạy thì cả buổi đọc ngay"
                          className="ml-auto shrink-0 px-2 py-1 rounded-md text-[11px] font-bold border
                                     bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60
                                     flex items-center gap-1">
                    {dangTaiGiong > 0
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {dangTaiGiong}/{trangThai?.caLop.length}</>
                      : <><Download className="w-3.5 h-3.5" /> Tải sẵn giọng</>}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select value={emKhac} onChange={e => setEmKhac(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-violet-400">
                    <option value="">— chọn tên —</option>
                    {(trangThai?.caLop || []).map(h => (
                      <option key={h.id} value={h.id}>{h.ten}</option>
                    ))}
                  </select>
                  <button onClick={() => cong(emDuocChon, 1)} disabled={!emDuocChon || daChot}
                          className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700
                                     font-black disabled:opacity-40">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => cong(emDuocChon, -1)} disabled={!emDuocChon || daChot}
                          className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600
                                     font-black disabled:opacity-40">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                {vuaCong && (
                  <p className="text-[12.5px] font-bold text-violet-700 mt-2 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> {vuaCong}
                  </p>
                )}
              </div>

              {vangHomNay.size > 0 && (
                <p className="text-[11.5px] text-slate-400 mt-3">
                  Buổi này bỏ qua {vangHomNay.size} em vắng — các em đó vẫn còn nguyên trong vòng, hôm sau vẫn được gọi.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
