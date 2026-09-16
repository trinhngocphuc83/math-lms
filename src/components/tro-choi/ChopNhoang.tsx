"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Dices, Play, ChevronRight, Flag, UserCheck, X, Loader2, Redo2, BookOpenCheck, SkipForward } from 'lucide-react';
import PresentationQuiz from '@/components/presentation/PresentationQuiz';
import VongQuayTen from '@/components/lop/VongQuayTen';
import { layCauTroChoi, ghiDiemTroChoi, type CauTroChoi, type NguonCau } from '@/app/actions/troChoi';
import { layDsLop, layLopTheoBai, layTrangThaiQuay, ghiDaGoi } from '@/app/actions/goiTenVaDiem';
import type { HocSinh } from '@/utils/goiTenVaDiem';
import { diemTheoMuc, TEN_MUC, TEN_LOAI, xao } from '@/utils/troChoi';
import type { TrangThaiTroChoi } from '@/utils/dieuKhienXa';

/**
 * TRÒ 2 — CHỚP NHOÁNG (đợt 1, chế độ một màn hình).
 *
 * Khác Truy đuổi ở chỗ CẢ LỚP cùng trả lời trước (giơ thẻ A/B/C/D, thẻ Đ/S, viết bảng con):
 * câu hiện, đồng hồ chạy, hết giờ máy TỰ LẬT đáp án để giữ nhịp; rồi thầy bấm Gọi tên,
 * vòng quay chọn một em giải thích cách làm, thầy chấm em ấy theo thang của Truy đuổi
 * (±1/±2/±3 theo mức câu). Có thể gọi thêm em thứ hai bổ sung. Tự luận: không lật, em
 * được gọi trình bày rồi thầy chấm, xong mới hiện bài giải mẫu.
 * Luật do thầy chốt 16/9/2026.
 */

type GiaiDoan = 'cai-dat' | 'tai' | 'hoi' | 'lat' | 'quay' | 'cham' | 'ket-qua' | 'chua' | 'tong-ket';
const NHO_SO_CAU = 'tro-choi-chop-nhoang-so-cau';
const NHO_NGUON = 'tro-choi-nguon';
const NHO_LOP = 'lop-goi-ten-lan-truoc';

interface DongDiem { id: string; ten: string; diem: number; luot: number }

export default function ChopNhoang({ lessonId, lenhTuXa, lenhChoQuiz, gioConLai, onTrangThai, onBatDauCau, onDong }: {
  lessonId?: string;
  lenhTuXa?: { hanh: string; gia?: any; dem: number } | null;
  lenhChoQuiz?: { viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null;
  /** Giây còn lại của đồng hồ trên máy chiếu — về 0 là máy tự lật đáp án */
  gioConLai?: number;
  onTrangThai?: (tt: TrangThaiTroChoi, cauHoi: any | null, quiz: { hienDapAn: boolean; dangChon: number | null; buoc: number; loiGiai: string }) => void;
  onBatDauCau?: (khoa: string) => void;
  onDong: () => void;
}) {
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan>('cai-dat');
  const [loi, setLoi] = useState('');

  const [nguon, setNguon] = useState<NguonCau>('bai');
  const [soCau, setSoCau] = useState(6);
  const [dsLop, setDsLop] = useState<{ id: string; name: string }[]>([]);
  const [lopId, setLopId] = useState('');
  useEffect(() => {
    try {
      const n = parseInt(localStorage.getItem(NHO_SO_CAU) || '0', 10); if (n > 0) setSoCau(n);
      const ng = localStorage.getItem(NHO_NGUON); if (ng === 'bai' || ng === 'chuong') setNguon(ng);
    } catch { /* thôi */ }
    (async () => {
      try {
        let ds = lessonId ? await layLopTheoBai(lessonId) : [];
        if (!ds.length) ds = await layDsLop();
        setDsLop(ds);
        let nho = ''; try { nho = localStorage.getItem(NHO_LOP) || ''; } catch { /* thôi */ }
        setLopId(ds.find(l => l.id === nho)?.id || ds[0]?.id || '');
      } catch (e: any) { setLoi(e?.message || 'Không tải được danh sách lớp'); }
    })();
  }, [lessonId]);

  const [cauList, setCauList] = useState<CauTroChoi[]>([]);
  const [iCau, setICau] = useState(0);
  const [caLop, setCaLop] = useState<HocSinh[]>([]);
  const [conLai, setConLai] = useState<HocSinh[]>([]);
  const [vong, setVong] = useState(1);
  const [hs, setHs] = useState<HocSinh | null>(null);
  const [dangQuay, setDangQuay] = useState(false);
  const [ketQua, setKetQua] = useState<'dung' | 'sai' | ''>('');
  const [diemVua, setDiemVua] = useState(0);
  const [soLanGoi, setSoLanGoi] = useState(0);
  const [bangDiem, setBangDiem] = useState<Record<string, DongDiem>>({});
  const [lenhQuiz, setLenhQuiz] = useState<{ viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null>(null);
  const demLenh = useRef(0);
  const guiQuiz = (viec: string, them: any = {}) => setLenhQuiz({ viec, ...them, dem: ++demLenh.current });
  const ttQuiz = useRef({ hienDapAn: false, dangChon: null as number | null, buoc: 0, loiGiai: '' });
  const [ttQuizHien, setTtQuizHien] = useState(ttQuiz.current);

  const cau = cauList[iCau];
  const muc = cau?.muc || 0;
  const diemCau = cau ? diemTheoMuc(muc) : 0;
  const loai = String(cau?.quiz?.type || 'multiple_choice');
  const tuLuan = loai === 'essay';

  useEffect(() => { if (lenhChoQuiz) setLenhQuiz({ ...lenhChoQuiz, dem: ++demLenh.current }); }, [lenhChoQuiz]);

  const batDau = async () => {
    if (!lopId) { setLoi('Chưa chọn lớp.'); return; }
    if (!lessonId) { setLoi('Không biết đang chiếu bài nào.'); return; }
    setGiaiDoan('tai'); setLoi('');
    try {
      try { localStorage.setItem(NHO_SO_CAU, String(soCau)); localStorage.setItem(NHO_NGUON, nguon); localStorage.setItem(NHO_LOP, lopId); } catch { /* thôi */ }
      const [tatCa, tq] = await Promise.all([layCauTroChoi(lessonId, nguon), layTrangThaiQuay(lopId)]);
      if (!tatCa.length) { setLoi('Bài này chưa có câu tương tác nào.'); setGiaiDoan('cai-dat'); return; }
      if (!tq.caLop.length) { setLoi('Lớp này chưa có học sinh.'); setGiaiDoan('cai-dat'); return; }
      setCauList(xao(tatCa).slice(0, Math.max(1, soCau)));
      setCaLop(tq.caLop); setConLai(tq.conLai); setVong(tq.vong);
      setBangDiem({}); setICau(0);
      vaoCau(0);
    } catch (e: any) { setLoi(e?.message || 'Không bắt đầu được'); setGiaiDoan('cai-dat'); }
  };
  const vaoCau = (i: number) => {
    ttQuiz.current = { hienDapAn: false, dangChon: null, buoc: 0, loiGiai: '' };
    guiQuiz('lam-lai');
    setHs(null); setKetQua(''); setSoLanGoi(0);
    daChayTrongCau.current = false;
    setGiaiDoan('hoi');
    onBatDauCau?.(String(i));
  };

  /* Hết giờ thì máy tự lật đáp án (trừ tự luận) — đây là cái "chớp nhoáng" */
  /* Chỉ lật khi đồng hồ ĐÃ CHẠY trong câu này rồi về 0: sang câu mới đồng hồ dựng lại và báo 0
     trước khi chạy — bản đầu coi đó là hết giờ, câu 2 vừa hiện đã lật đáp án. */
  const daChayTrongCau = useRef(false);
  useEffect(() => {
    const g = gioConLai || 0;
    if (g > 0) daChayTrongCau.current = true;
    else if (giaiDoan === 'hoi' && !tuLuan && daChayTrongCau.current) { daChayTrongCau.current = false; guiQuiz('hien-dap-an'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gioConLai]);

  const khiQuizDoi = (t: typeof ttQuiz.current & { chonCum?: any; chuNhap?: string }) => {
    const truoc = ttQuiz.current;
    ttQuiz.current = { hienDapAn: t.hienDapAn, dangChon: t.dangChon, buoc: t.buoc, loiGiai: t.loiGiai };
    setTtQuizHien(ttQuiz.current);
    if (giaiDoan === 'hoi' && !truoc.hienDapAn && t.hienDapAn) setGiaiDoan('lat');
  };

  /* ---- gọi tên ---- */
  const quay = () => {
    if (dangQuay || !caLop.length) return;
    let pool = conLai, v = vong;
    if (!pool.length) { pool = caLop; v = vong + 1; setVong(v); }
    const em = pool[Math.floor(Math.random() * pool.length)];
    setHs(em); setDangQuay(true); setKetQua(''); setGiaiDoan('quay');
    setConLai(pool.filter(h => h.id !== em.id));
    ghiDaGoi(lopId, em.id, v, lessonId).catch(() => { /* thôi */ });
  };
  const ghiKetQua = async (dung: boolean) => {
    if (!hs || !cau) return;
    const d = dung ? diemCau : -diemCau;
    if (tuLuan && !ttQuiz.current.hienDapAn) guiQuiz('hien-dap-an');
    setKetQua(dung ? 'dung' : 'sai'); setDiemVua(d); setSoLanGoi(n => n + 1); setGiaiDoan('ket-qua');
    setBangDiem(b => {
      const cu = b[hs.id] || { id: hs.id, ten: hs.ten, diem: 0, luot: 0 };
      return { ...b, [hs.id]: { ...cu, diem: cu.diem + d, luot: cu.luot + 1 } };
    });
    try { await ghiDiemTroChoi(lopId, hs.id, d, `Chớp nhoáng · câu ${iCau + 1} · ${dung ? 'đúng' : 'sai'}`, lessonId); }
    catch (e: any) { setLoi('Không ghi được điểm: ' + (e?.message || '')); }
  };
  const chua = () => { guiQuiz('xem-loi-giai'); setGiaiDoan('chua'); };
  const cauTiep = () => {
    if (iCau + 1 >= cauList.length) { setGiaiDoan('tong-ket'); return; }
    setICau(i => i + 1);
    setTimeout(() => vaoCau(iCau + 1), 0);
  };
  const ketThuc = () => setGiaiDoan('tong-ket');

  /* ---- lệnh điện thoại ---- */
  const demDaLam = useRef(lenhTuXa?.dem ?? 0);
  useEffect(() => {
    if (!lenhTuXa || lenhTuXa.dem === demDaLam.current) return;
    demDaLam.current = lenhTuXa.dem;
    switch (lenhTuXa.hanh) {
      case 'bat-dau': if (giaiDoan === 'cai-dat') batDau(); break;
      case 'quay': if (['lat', 'ket-qua', 'chua', 'hoi'].includes(giaiDoan)) quay(); break;
      case 'cham': if (giaiDoan === 'cham') ghiKetQua(!!lenhTuXa.gia); break;
      case 'chua': chua(); break;
      case 'cau-tiep': cauTiep(); break;
      case 'ket-thuc': ketThuc(); break;
      case 'van-moi': setGiaiDoan('cai-dat'); break;
      case 'dong': onDong(); break;
      case 'so-cau': if (typeof lenhTuXa.gia === 'number') setSoCau(lenhTuXa.gia); break;
      case 'nguon': if (lenhTuXa.gia === 'bai' || lenhTuXa.gia === 'chuong') setNguon(lenhTuXa.gia); break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenhTuXa]);

  useEffect(() => {
    const bang = Object.values(bangDiem).sort((a, b) => b.diem - a.diem).map(d => ({ ten: d.ten, diem: d.diem }));
    onTrangThai?.({
      tro: 'chop-nhoang', giaiDoan, cau: iCau + 1, tongCau: cauList.length, muc, diemCau,
      tenHS: hs?.ten || '', lanChuyen: soLanGoi, ketQua, bangDiem: bang, caiDat: { soCau, nguon },
    }, ['hoi', 'lat', 'quay', 'cham', 'ket-qua', 'chua'].includes(giaiDoan) ? cau?.quiz || null : null, ttQuizHien);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giaiDoan, iCau, cauList.length, muc, diemCau, hs, soLanGoi, ketQua, bangDiem, ttQuizHien, soCau, nguon]);

  /* Phím: Q gọi tên · Enter câu tiếp · L chữa · B bỏ qua */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'q' || e.key === 'Q') { if (['lat', 'ket-qua', 'chua', 'hoi'].includes(giaiDoan)) quay(); }
      else if (e.key === 'Enter') { if (['lat', 'ket-qua', 'chua'].includes(giaiDoan)) cauTiep(); }
      else if (e.key === 'l' || e.key === 'L') { if (giaiDoan === 'lat' || giaiDoan === 'ket-qua') chua(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giaiDoan, conLai, caLop, vong, iCau, dangQuay]);

  /* ============================ VẼ ============================ */
  const Nut = ({ onClick, mau, children, title }: { onClick: () => void; mau: string; children: React.ReactNode; title?: string }) => (
    <button onClick={onClick} title={title}
            className={`${mau} text-white px-9 py-4 rounded-full text-[30px] font-bold shadow-lg transition-all hover:-translate-y-0.5 flex items-center gap-3`}>
      {children}
    </button>
  );
  const dangChoi = !['cai-dat', 'tai', 'tong-ket'].includes(giaiDoan);
  const dauTrang = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-4">
        <span className="text-[40px]">⚡</span>
        <h3 className="text-[40px] font-black text-indigo-800 m-0">Chớp nhoáng</h3>
        {dangChoi && <span className="text-[28px] font-bold text-slate-500">câu {iCau + 1}/{cauList.length}</span>}
      </div>
      {cau && dangChoi && (
        <div className="flex items-center gap-3">
          <span className="px-5 py-2 rounded-full bg-amber-100 text-amber-800 text-[26px] font-bold">{TEN_MUC[muc] || 'Nhận biết'} · ±{diemCau}</span>
          <span className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 text-[24px] font-semibold">{TEN_LOAI[loai] || loai}</span>
        </div>
      )}
    </div>
  );

  if (giaiDoan === 'cai-dat' || giaiDoan === 'tai') {
    return (
      <div className="w-full">
        {dauTrang}
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="rounded-2xl border-[3px] border-slate-200 p-6">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Lấy câu từ</div>
            <div className="flex gap-3">
              {(['bai', 'chuong'] as NguonCau[]).map(n => (
                <button key={n} onClick={() => setNguon(n)}
                        className={`flex-1 py-4 rounded-xl text-[30px] font-bold border-[3px] ${nguon === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>
                  {n === 'bai' ? 'Bài này' : 'Cả chương'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-6">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Số câu</div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSoCau(s => Math.max(1, s - 1))} className="w-[70px] h-[70px] rounded-xl bg-slate-100 text-[40px] font-black text-slate-600">−</button>
              <input id="chop-nhoang-so-cau" type="number" min={1} max={50} value={soCau}
                     onChange={e => setSoCau(Math.max(1, parseInt(e.target.value || '1', 10)))}
                     className="flex-1 text-center text-[44px] font-black text-indigo-800 border-[3px] border-indigo-200 rounded-xl py-2 outline-none focus:border-indigo-500" />
              <button onClick={() => setSoCau(s => Math.min(50, s + 1))} className="w-[70px] h-[70px] rounded-xl bg-slate-100 text-[40px] font-black text-slate-600">+</button>
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-6">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Lớp</div>
            <select id="chop-nhoang-lop" value={lopId} onChange={e => setLopId(e.target.value)}
                    className="w-full text-[30px] font-bold text-slate-800 border-[3px] border-slate-300 rounded-xl px-4 py-3 bg-white">
              {dsLop.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border-[3px] border-indigo-100 px-8 py-5 text-[26px] text-slate-700 leading-relaxed mb-8">
          Câu hiện, đồng hồ chạy, <b>cả lớp</b> giơ thẻ / viết bảng con. Hết giờ máy <b>tự lật đáp án</b>. Bấm <b>Gọi tên</b> để vòng quay chọn một em giải thích,
          rồi chấm em ấy <b>±1/±2/±3</b> theo mức câu. Tự luận: em được gọi trình bày, thầy chấm, rồi mới hiện bài giải mẫu.
        </div>
        {loi && <div className="text-rose-600 text-[26px] font-bold mb-4">{loi}</div>}
        <div className="flex justify-center gap-5">
          <Nut onClick={batDau} mau="bg-indigo-600 hover:bg-indigo-700">
            {giaiDoan === 'tai' ? <Loader2 className="w-[34px] h-[34px] animate-spin" /> : <Play className="w-[34px] h-[34px]" />} Bắt đầu
          </Nut>
          <Nut onClick={onDong} mau="bg-slate-500 hover:bg-slate-600"><X className="w-[34px] h-[34px]" /> Đóng</Nut>
        </div>
      </div>
    );
  }

  if (giaiDoan === 'tong-ket') {
    const ds = Object.values(bangDiem).sort((a, b) => b.diem - a.diem || b.luot - a.luot);
    return (
      <div className="w-full">
        {dauTrang}
        <h4 className="text-[36px] font-black text-slate-800 mb-5">Tổng kết · {Math.min(iCau + 1, cauList.length)}/{cauList.length} câu</h4>
        {ds.length === 0 ? <p className="text-[30px] text-slate-500">Chưa có em nào được gọi.</p> : (
          <div className="grid grid-cols-2 gap-x-10 gap-y-3 mb-8">
            {ds.map((d, i) => (
              <div key={d.id} className={`flex items-center gap-5 px-6 py-3 rounded-2xl border-[3px] ${i === 0 && d.diem > 0 ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <span className="w-[54px] h-[54px] rounded-full bg-slate-100 text-slate-600 text-[28px] font-black flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-[32px] font-bold text-slate-800 truncate">{d.ten}</span>
                <span className="text-[24px] text-slate-400">{d.luot} lượt</span>
                <span className={`text-[36px] font-black ${d.diem > 0 ? 'text-emerald-600' : d.diem < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{d.diem > 0 ? `+${d.diem}` : d.diem}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[24px] text-slate-500 mb-6">Điểm đã ghi vào sổ điểm thưởng của lớp (nguồn "trò chơi").</p>
        <div className="flex justify-center gap-5">
          <Nut onClick={() => setGiaiDoan('cai-dat')} mau="bg-indigo-600 hover:bg-indigo-700"><Redo2 className="w-[34px] h-[34px]" /> Chơi ván mới</Nut>
          <Nut onClick={onDong} mau="bg-slate-500 hover:bg-slate-600"><X className="w-[34px] h-[34px]" /> Về bài giảng</Nut>
        </div>
      </div>
    );
  }

  /* ---- hỏi / lật / quay / chấm / kết quả ---- */
  return (
    <div className="w-full">
      {dauTrang}
      {giaiDoan === 'hoi' && (
        <div className="mb-4 rounded-2xl bg-sky-50 border-[3px] border-sky-200 px-6 py-3 text-[26px] font-bold text-sky-800">
          Cả lớp trả lời: {loai === 'multiple_choice' ? 'giơ thẻ A/B/C/D' : loai === 'true_false_cluster' ? 'giơ thẻ xanh (Đúng) / đỏ (Sai) cho từng ý' : loai === 'short_answer' ? 'viết đáp số lên bảng con' : 'làm nháp, chờ gọi tên trình bày'}.
          {!tuLuan && ' Hết giờ máy tự lật đáp án.'}
        </div>
      )}
      {giaiDoan === 'quay' && (
        <div className="mb-5 flex items-center gap-8">
          <div className="origin-top-left shrink-0" style={{ transform: 'scale(1.1)', width: 420, height: 92 * 3 * 1.1 }}>
            <VongQuayTen dsTen={caLop.map(h => h.ten)} trungTen={hs?.ten || null} dangQuay={dangQuay}
                         onXong={() => { setDangQuay(false); setGiaiDoan('cham'); }} />
          </div>
          <div className="text-[30px] text-slate-500">Vòng quay đang chọn em giải thích… <span className="text-slate-400">Vòng {vong} · còn {conLai.length}/{caLop.length}</span></div>
        </div>
      )}
      {hs && (giaiDoan === 'cham' || giaiDoan === 'ket-qua' || giaiDoan === 'chua') && (
        <div className={`mb-4 inline-flex items-center gap-4 px-8 py-4 rounded-2xl text-[36px] font-black shadow-lg ${
          ketQua === 'dung' ? 'bg-emerald-600 text-white' : ketQua === 'sai' ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'}`}>
          <UserCheck className="w-[38px] h-[38px]" /> {hs.ten}
          {ketQua ? <span className="ml-3 text-[40px]">{diemVua > 0 ? `+${diemVua}` : diemVua}</span> : <span className="ml-3 text-[28px] font-bold opacity-90">giải thích cách làm</span>}
        </div>
      )}
      {cau && <PresentationQuiz key={iCau} quizData={cau.quiz} lenhNgoai={lenhQuiz} onDoi={khiQuizDoi} soCau={iCau + 1} tongCau={cauList.length} />}
      {loi && <div className="text-rose-600 text-[24px] font-bold mt-4">{loi}</div>}

      {giaiDoan === 'cham' && (
        <div className="mt-8 rounded-2xl border-[3px] border-indigo-200 bg-indigo-50 px-8 py-6 flex items-center gap-6">
          <span className="text-[30px] font-bold text-slate-700 flex-1">{hs?.ten} giải thích xong — thầy chấm:</span>
          <Nut onClick={() => ghiKetQua(true)} mau="bg-emerald-600 hover:bg-emerald-700">Đúng +{diemCau}</Nut>
          <Nut onClick={() => ghiKetQua(false)} mau="bg-rose-600 hover:bg-rose-700">Sai −{diemCau}</Nut>
        </div>
      )}
      {(giaiDoan === 'lat' || giaiDoan === 'ket-qua' || giaiDoan === 'chua' || (giaiDoan === 'hoi' && tuLuan)) && (
        <div className="mt-8 flex justify-center gap-5 flex-wrap">
          <Nut onClick={quay} mau="bg-violet-600 hover:bg-violet-700" title="Phím Q"><Dices className="w-[34px] h-[34px]" /> {soLanGoi ? 'Gọi thêm' : 'Gọi tên'}</Nut>
          {giaiDoan !== 'chua' && !tuLuan && (
            <Nut onClick={chua} mau="bg-slate-500 hover:bg-slate-600" title="Phím L"><BookOpenCheck className="w-[34px] h-[34px]" /> Lời giải</Nut>
          )}
          {giaiDoan !== 'hoi' && (
            <Nut onClick={cauTiep} mau="bg-indigo-600 hover:bg-indigo-700" title="Enter">
              {giaiDoan === 'lat' && !soLanGoi ? <SkipForward className="w-[34px] h-[34px]" /> : <ChevronRight className="w-[34px] h-[34px]" />}
              {iCau + 1 >= cauList.length ? 'Tổng kết' : giaiDoan === 'lat' && !soLanGoi ? 'Bỏ qua, câu tiếp' : 'Câu tiếp'}
            </Nut>
          )}
          <Nut onClick={ketThuc} mau="bg-slate-400 hover:bg-slate-500"><Flag className="w-[34px] h-[34px]" /> Kết thúc</Nut>
        </div>
      )}
      {giaiDoan === 'hoi' && !tuLuan && (
        <p className="mt-6 text-center text-[24px] text-slate-400">Chưa hết giờ mà lớp đã xong: bấm <b>Hiển thị đáp án</b> để lật sớm.</p>
      )}
    </div>
  );
}
