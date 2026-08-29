"use client";

import React from "react";
import confetti from "canvas-confetti";
import { X, Loader2, RefreshCw, Volume2, UserX, Plus, Minus, Dices, AlertTriangle } from "lucide-react";
import {
  docTrangThaiQuay, ghiDaGoi, congDiem, dsLop, timLopTheoBai, daChotThang,
  LOI_CHUA_TAO_BANG, type HocSinh, type TrangThaiQuay,
} from "@/utils/goiTenVaDiem";
import { doiTen, type CachDoc } from "@/utils/giongDocAI";

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
  isOpen, onClose, lopGoiY, lessonId,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Lớp muốn dùng sẵn (mở từ trang lớp học thì truyền vào đây) */
  lopGoiY?: string;
  /** Chỉ để ghi nhớ đã gọi ở bài nào - không dùng để lọc */
  lessonId?: string;
}) {
  const [dsCacLop, setDsCacLop] = React.useState<{ id: string; name: string }[]>([]);
  const [lopId, setLopId] = React.useState<string>('');
  const [trangThai, setTrangThai] = React.useState<TrangThaiQuay | null>(null);
  const [dangTai, setDangTai] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [chuaTaoBang, setChuaTaoBang] = React.useState(false);
  const [daChot, setDaChot] = React.useState(false);

  const [dangQuay, setDangQuay] = React.useState(false);
  const [tenChay, setTenChay] = React.useState('');
  const [trungAi, setTrungAi] = React.useState<HocSinh | null>(null);
  const [cachDoc, setCachDoc] = React.useState<CachDoc | null>(null);

  /** Em vắng - chỉ bỏ qua trong BUỔI NÀY, không ghi vào CSDL, không tính là đã gọi. */
  const [vangHomNay, setVangHomNay] = React.useState<Set<string>>(new Set());

  const [emKhac, setEmKhac] = React.useState('');
  const [vuaCong, setVuaCong] = React.useState('');

  /* ------------------------------------------------------------------ nạp lớp */
  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const tatCa = await dsLop();
      setDsCacLop(tatCa);

      let chon = lopGoiY || '';
      if (!chon && lessonId) {
        const theoBai = await timLopTheoBai(lessonId);
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
      setTrangThai(await docTrangThaiQuay(lopId));
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
  const quay = async () => {
    if (dangQuay || dsQuay.length === 0 || !trangThai) return;
    setDangQuay(true); setTrungAi(null); setCachDoc(null);

    const trung = dsQuay[Math.floor(Math.random() * dsQuay.length)];

    // Chạy tên nhanh rồi chậm dần cho ra dáng vòng quay
    const batDau = Date.now();
    const KEO_DAI = 2200;
    await new Promise<void>((xong) => {
      const buoc = () => {
        const troi = Date.now() - batDau;
        if (troi >= KEO_DAI) { setTenChay(trung.ten); xong(); return; }
        setTenChay(dsQuay[Math.floor(Math.random() * dsQuay.length)].ten);
        // chậm dần: 40ms -> 260ms
        setTimeout(buoc, 40 + (troi / KEO_DAI) ** 2 * 220);
      };
      buoc();
    });

    setTrungAi(trung);
    setDangQuay(false);
    try { confetti({ particleCount: 90, spread: 75, origin: { y: 0.35 } }); } catch { /* thôi */ }

    try { await ghiDaGoi(lopId, trung.id, trangThai.vong, lessonId); } catch { /* vẫn quay tiếp được */ }
    setTrangThai(t => t ? { ...t, conLai: t.conLai.filter(h => h.id !== trung.id) } : t);

    setCachDoc(await doiTen(trung.id, trung.ten));
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
    } catch (e: any) {
      setVuaCong(e?.message === LOI_CHUA_TAO_BANG ? 'Chưa tạo bảng điểm.' : 'Không cộng được điểm.');
    }
    setTimeout(() => setVuaCong(''), 2600);
  };

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

              {/* Ô quay */}
              <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 py-7 px-4 text-center">
                <div className={`font-black text-violet-900 leading-tight break-words transition-all ${
                  trungAi ? 'text-[30px]' : 'text-[24px] opacity-70'
                }`}>
                  {tenChay || 'Bấm QUAY để gọi tên'}
                </div>
                {trungAi && (
                  <div className="mt-1.5 text-[12.5px] font-bold text-violet-500">
                    {cachDoc === 'ai' && '🔊 giọng AI'}
                    {cachDoc === 'da-nho' && '🔊 giọng đã nhớ'}
                    {cachDoc === 'giong-may' && '🔊 giọng máy'}
                    {cachDoc === 'chuong' && '🔔 không có giọng, dùng chuông'}
                  </div>
                )}
              </div>

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
                </div>
              )}

              {/* Cộng cho em xung phong, không cần quay */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-1.5">
                  Cộng cho em xung phong (không cần quay)
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
