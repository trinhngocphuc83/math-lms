"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Dices, Play, Redo2, BookOpenCheck, ChevronRight, Flag, UserCheck, X, Loader2 } from 'lucide-react';
import PresentationQuiz, { type TrangThaiQuiz } from '@/components/presentation/PresentationQuiz';
import VongQuayTen from '@/components/lop/VongQuayTen';
import { layCauTroChoi, ghiDiemTroChoi, type CauTroChoi, type NguonCau } from '@/app/actions/troChoi';
import { layDsLop, layLopTheoBai, layTrangThaiQuay, ghiDaGoi } from '@/app/actions/goiTenVaDiem';
import type { HocSinh } from '@/utils/goiTenVaDiem';
import { diemTheoMuc, TEN_MUC, TEN_LOAI, xao } from '@/utils/troChoi';
import type { TrangThaiTroChoi } from '@/utils/dieuKhienXa';

/**
 * TRÒ 1 — TRUY ĐUỔI (đợt 1, chế độ một màn hình).
 *
 * Vòng quay gọi một em, câu hiện, thầy chấm (máy tự chấm trắc nghiệm / Đúng-Sai / trả lời
 * ngắn; tự luận thầy bấm Đúng-Sai). Đúng cộng, sai TRỪ đúng bằng số điểm cộng, theo mức
 * câu trong kho (±1/±2/±3). Sai thì "chuyền" sang em khác tối đa hai lần rồi thầy chữa.
 * Luật do thầy chốt 16/9/2026 — xem kế hoạch đợt 1.
 *
 * Toàn bộ trạng thái trận nằm ở đây (máy chiếu). Điện thoại chỉ gửi lệnh `tro-choi`
 * (qua `lenhTuXa`) và nhận lại `TrangThaiTroChoi` (qua `onTrangThai`) để bày đúng nút.
 * Không có bảng CSDL nào cho trận đấu: điểm ghi thẳng vào sổ điểm thưởng, lượt gọi ghi
 * vào vòng quay như bảng Gọi tên — tắt trình duyệt giữa trận là mất trận, nhưng điểm đã
 * ghi thì còn.
 */

type GiaiDoan = 'cai-dat' | 'tai' | 'quay' | 'hoi' | 'cham-tl' | 'ket-qua' | 'chua' | 'tong-ket';
const NHO_SO_CAU = 'tro-choi-so-cau';
const NHO_NGUON = 'tro-choi-nguon';
const NHO_LOP = 'lop-goi-ten-lan-truoc';   // cùng khoá với bảng Gọi tên, để nhớ chung một lớp
const TOI_DA_CHUYEN = 2;

interface DongDiem { id: string; ten: string; diem: number; luot: number }

export default function TruyDuoi({ lessonId, lenhTuXa, lenhChoQuiz, onTrangThai, onBatDauCau, onDong }: {
  lessonId?: string;
  /** Lệnh `tro-choi` từ điện thoại; `dem` tăng mỗi lần bấm. */
  lenhTuXa?: { hanh: string; gia?: any; dem: number } | null;
  /** Lệnh thao tác trên câu hỏi (chọn đáp án, hiện đáp án, gõ số) từ điện thoại — chuyển thẳng xuống câu. */
  lenhChoQuiz?: { viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null;
  /** Báo ngược lên máy chiếu để phát xuống điện thoại (kèm câu đang hỏi và trạng thái chọn). */
  onTrangThai?: (tt: TrangThaiTroChoi, cauHoi: any | null, quiz: { hienDapAn: boolean; dangChon: number | null; buoc: number; loiGiai: string }) => void;
  /** Câu mới bắt đầu (hoặc chuyền) — máy chiếu đặt lại đồng hồ theo số giây thầy đã đặt. */
  onBatDauCau?: (khoa: string) => void;
  onDong: () => void;
}) {
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan>('cai-dat');
  const [loi, setLoi] = useState('');

  /* ---- cài đặt ---- */
  const [nguon, setNguon] = useState<NguonCau>('bai');
  const [soCau, setSoCau] = useState(8);
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

  /* ---- trận ---- */
  const [cauList, setCauList] = useState<CauTroChoi[]>([]);
  const [iCau, setICau] = useState(0);
  const [caLop, setCaLop] = useState<HocSinh[]>([]);
  const [conLai, setConLai] = useState<HocSinh[]>([]);
  const [vong, setVong] = useState(1);
  const [hs, setHs] = useState<HocSinh | null>(null);
  const [dangQuay, setDangQuay] = useState(false);
  const [lanChuyen, setLanChuyen] = useState(0);
  const [ketQua, setKetQua] = useState<'dung' | 'sai' | ''>('');
  const [diemVua, setDiemVua] = useState(0);
  const [bangDiem, setBangDiem] = useState<Record<string, DongDiem>>({});
  const [chonTay, setChonTay] = useState(false);
  const [lenhQuiz, setLenhQuiz] = useState<{ viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null>(null);
  const demLenh = useRef(0);
  const guiQuiz = (viec: string, them: any = {}) => setLenhQuiz({ viec, ...them, dem: ++demLenh.current });
  /* Trạng thái chọn của câu đang chiếu (do PresentationQuiz báo lên) */
  const ttQuiz = useRef<TrangThaiQuiz>({
    hienDapAn: false, dangChon: null, buoc: 0, loiGiai: '', chonCum: {}, chuNhap: '', lanCham: 0, ketQuaCham: null, daSai: [],
  });
  const [ttQuizHien, setTtQuizHien] = useState(ttQuiz.current);

  const cau = cauList[iCau];
  const muc = cau?.muc || 0;
  const diemCau = cau ? diemTheoMuc(muc) : 0;
  const loai = String(cau?.quiz?.type || 'multiple_choice');

  /* Lệnh từ điện thoại dành cho câu hỏi: chuyển thẳng xuống (giữ nguyên bộ đếm riêng) */
  useEffect(() => {
    if (!lenhChoQuiz) return;
    setLenhQuiz({ ...lenhChoQuiz, dem: ++demLenh.current });
  }, [lenhChoQuiz]);

  /* ---- bắt đầu trận ---- */
  const batDau = async () => {
    if (!lopId) { setLoi('Chưa chọn lớp.'); return; }
    if (!lessonId) { setLoi('Không biết đang chiếu bài nào.'); return; }
    setGiaiDoan('tai'); setLoi('');
    try {
      try { localStorage.setItem(NHO_SO_CAU, String(soCau)); localStorage.setItem(NHO_NGUON, nguon); localStorage.setItem(NHO_LOP, lopId); } catch { /* thôi */ }
      const [tatCa, tq] = await Promise.all([layCauTroChoi(lessonId, nguon), layTrangThaiQuay(lopId)]);
      if (!tatCa.length) { setLoi(nguon === 'bai' ? 'Bài này chưa có Bộ câu hỏi trò chơi. Vào Soạn bài → "Thêm Bộ câu hỏi trò chơi" rồi đưa câu vào (rút kho, hoặc nhập từ tự luyện có tách ý).' : 'Chương này chưa có Bộ câu hỏi trò chơi nào.'); setGiaiDoan('cai-dat'); return; }
      if (!tq.caLop.length) { setLoi('Lớp này chưa có học sinh.'); setGiaiDoan('cai-dat'); return; }
      setCauList(xao(tatCa).slice(0, Math.max(1, soCau)));
      setCaLop(tq.caLop); setConLai(tq.conLai); setVong(tq.vong);
      setICau(0); setLanChuyen(0); setHs(null); setKetQua(''); setBangDiem({});
      setGiaiDoan('quay');
    } catch (e: any) { setLoi(e?.message || 'Không bắt đầu được'); setGiaiDoan('cai-dat'); }
  };

  /* ---- gọi tên ---- */
  const chonNgauNhien = () => {
    let pool = conLai, v = vong;
    if (!pool.length) { pool = caLop; v = vong + 1; setVong(v); }
    const em = pool[Math.floor(Math.random() * pool.length)];
    return { em, v, pool };
  };
  const quay = () => {
    if (dangQuay || giaiDoan !== 'quay' || !caLop.length) return;
    const { em, v, pool } = chonNgauNhien();
    setHs(em); setDangQuay(true); setChonTay(false);
    setConLai(pool.filter(h => h.id !== em.id));
    ghiDaGoi(lopId, em.id, v, lessonId).catch(() => { /* ghi lượt gọi hỏng thì trận vẫn chạy */ });
  };
  const chiDinh = (em: HocSinh) => {
    if (giaiDoan !== 'quay') return;
    setHs(em); setChonTay(false);
    setConLai(c => c.filter(h => h.id !== em.id));
    ghiDaGoi(lopId, em.id, vong, lessonId).catch(() => { /* thôi */ });
    vaoCau();
  };
  const vaoCau = () => {
    /* Nhận chuyền (lanChuyen > 0) thì KHÔNG dựng lại câu: phương án em trước chọn sai đã
       khoá đỏ, đáp án vẫn giấu, em sau chọn trong phần còn lại. Chỉ câu mới mới xoá sạch. */
    if (lanChuyen === 0) {
      ttQuiz.current = { ...ttQuiz.current, hienDapAn: false, dangChon: null, buoc: 0, chonCum: {}, chuNhap: '', lanCham: 0, ketQuaCham: null, daSai: [] };
      guiQuiz('lam-lai');
    }
    setKetQua(''); setGiaiDoan('hoi');
    onBatDauCau?.(`${iCau}-${lanChuyen}`);
  };

  /* ---- chấm ---- */
  const ghiKetQua = async (dung: boolean) => {
    if (!hs || !cau) return;
    const d = dung ? diemCau : -diemCau;
    /* Tự luận chấm xong mới lật bài giải mẫu (em trình bày trước, lời giải sau) */
    if (loai === 'essay' && !ttQuiz.current.hienDapAn) guiQuiz('hien-dap-an');
    setKetQua(dung ? 'dung' : 'sai'); setDiemVua(d); setGiaiDoan('ket-qua');
    setBangDiem(b => {
      const cu = b[hs.id] || { id: hs.id, ten: hs.ten, diem: 0, luot: 0 };
      return { ...b, [hs.id]: { ...cu, diem: cu.diem + d, luot: cu.luot + 1 } };
    });
    const lyDo = `Truy đuổi · câu ${iCau + 1}${lanChuyen ? ' · nhận chuyền' : ''} · ${dung ? 'đúng' : 'sai'}`;
    try { await ghiDiemTroChoi(lopId, hs.id, d, lyDo, lessonId); }
    catch (e: any) { setLoi('Không ghi được điểm: ' + (e?.message || '')); }
  };
  /**
   * Câu tự chấm KÍN (PresentationQuiz chamKin): mỗi lần thầy bấm "Chấm", lanCham tăng và
   * ketQuaCham cho biết đúng/sai — đúng thì câu tự lật đáp án, sai thì chỉ khoá phương án
   * vừa chọn. Bản đầu chấm khi thấy hienDapAn lật lên, tức là phải lộ đáp án mới chấm được —
   * em sai xong cả lớp đã thấy đáp án, chuyền là vô nghĩa (thầy bắt được 16/9/2026).
   * Tự luận vẫn đi đường cũ: thầy bấm Hiển thị đáp án / Đúng-Sai.
   */
  const khiQuizDoi = (t: TrangThaiQuiz) => {
    const truoc = ttQuiz.current;
    ttQuiz.current = t; setTtQuizHien(t);
    if (giaiDoan !== 'hoi') return;
    if (loai === 'essay') { if (!truoc.hienDapAn && t.hienDapAn) setGiaiDoan('cham-tl'); return; }
    if (t.lanCham > truoc.lanCham && t.ketQuaCham) ghiKetQua(t.ketQuaCham === 'dung');
  };
  /** Em không trả lời được (hết giờ, bó tay): tính sai, đáp án vẫn giấu để chuyền. */
  const boTay = () => { if (giaiDoan === 'hoi') ghiKetQua(false); };

  /* ---- sau khi chấm ---- */
  const chuyen = () => {
    if (lanChuyen >= TOI_DA_CHUYEN) return;
    setLanChuyen(l => l + 1); setHs(null); setKetQua('');
    setGiaiDoan('quay');
  };
  const chua = () => { guiQuiz('xem-loi-giai'); setGiaiDoan('chua'); };
  const cauTiep = () => {
    if (iCau + 1 >= cauList.length) { setGiaiDoan('tong-ket'); return; }
    setICau(i => i + 1); setLanChuyen(0); setHs(null); setKetQua('');
    guiQuiz('lam-lai');
    setGiaiDoan('quay');
  };
  const ketThuc = () => setGiaiDoan('tong-ket');

  /* Khi chuyền: bước 'quay' với cùng câu — đồng hồ đặt lại lúc vào lại câu (vaoCau) */
  useEffect(() => { if (giaiDoan === 'quay') setDangQuay(false); }, [giaiDoan]);

  /* ---- lệnh từ điện thoại ---- */
  const demDaLam = useRef(lenhTuXa?.dem ?? 0);
  useEffect(() => {
    if (!lenhTuXa || lenhTuXa.dem === demDaLam.current) return;
    demDaLam.current = lenhTuXa.dem;
    switch (lenhTuXa.hanh) {
      case 'bat-dau': batDau(); break;
      case 'quay': quay(); break;
      case 'chi-dinh': {
        const em = caLop.find(h => h.id === lenhTuXa.gia);
        if (em) chiDinh(em); else setChonTay(true);
        break;
      }
      case 'cham':
        if (giaiDoan === 'cham-tl' || (giaiDoan === 'hoi' && loai === 'essay')) ghiKetQua(!!lenhTuXa.gia);
        else if (giaiDoan === 'hoi' && lenhTuXa.gia === false) boTay();
        break;
      case 'chuyen': chuyen(); break;
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

  /* ---- phát trạng thái xuống điện thoại ---- */
  useEffect(() => {
    const bang = Object.values(bangDiem).sort((a, b) => b.diem - a.diem).map(d => ({ ten: d.ten, diem: d.diem }));
    onTrangThai?.({
      tro: 'truy-duoi', giaiDoan, cau: iCau + 1, tongCau: cauList.length, muc, diemCau,
      tenHS: hs?.ten || '', lanChuyen, ketQua, bangDiem: bang, caiDat: { soCau, nguon },
    }, giaiDoan === 'hoi' || giaiDoan === 'cham-tl' || giaiDoan === 'ket-qua' || giaiDoan === 'chua' ? cau?.quiz || null : null,
    { hienDapAn: ttQuizHien.hienDapAn, dangChon: ttQuizHien.dangChon, buoc: ttQuizHien.buoc, loiGiai: ttQuizHien.loiGiai });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giaiDoan, iCau, cauList.length, muc, diemCau, hs, lanChuyen, ketQua, bangDiem, ttQuizHien, soCau, nguon]);

  /* Phím tắt trên máy chiếu: Q quay · Enter câu tiếp · C chuyền · L chữa */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'q' || e.key === 'Q') { if (giaiDoan === 'quay') quay(); }
      else if (e.key === 'Enter') { if (giaiDoan === 'ket-qua' || giaiDoan === 'chua') cauTiep(); }
      else if (e.key === 'c' || e.key === 'C') { if (giaiDoan === 'ket-qua' && ketQua === 'sai') chuyen(); }
      else if (e.key === 'l' || e.key === 'L') { if (giaiDoan === 'ket-qua') chua(); }
      else if (e.key === 'b' || e.key === 'B') { if (giaiDoan === 'hoi' && loai !== 'essay') boTay(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giaiDoan, ketQua, conLai, caLop, vong, iCau, lanChuyen]);

  /* ============================ VẼ ============================ */
  const Nut = ({ onClick, mau, children, title }: { onClick: () => void; mau: string; children: React.ReactNode; title?: string }) => (
    <button onClick={onClick} title={title}
            className={`${mau} text-white px-9 py-4 rounded-full text-[30px] font-bold shadow-lg transition-all
                        hover:-translate-y-0.5 flex items-center gap-3 disabled:opacity-40`}>
      {children}
    </button>
  );

  const dauTrang = (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <span className="text-[40px]">🎯</span>
        <h3 className="text-[40px] font-black text-indigo-800 m-0">Truy đuổi</h3>
        {cauList.length > 0 && giaiDoan !== 'cai-dat' && giaiDoan !== 'tong-ket' && (
          <span className="text-[28px] font-bold text-slate-500">câu {iCau + 1}/{cauList.length}</span>
        )}
      </div>
      {cau && giaiDoan !== 'cai-dat' && giaiDoan !== 'tong-ket' && (
        <div className="flex items-center gap-3">
          <span className="px-5 py-2 rounded-full bg-amber-100 text-amber-800 text-[26px] font-bold">
            {TEN_MUC[muc] || 'Nhận biết'} · ±{diemCau}
          </span>
          <span className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 text-[24px] font-semibold">{TEN_LOAI[loai] || loai}</span>
          {lanChuyen > 0 && (
            <span className="px-5 py-2 rounded-full bg-rose-100 text-rose-700 text-[26px] font-bold">Chuyền {lanChuyen}/{TOI_DA_CHUYEN}</span>
          )}
        </div>
      )}
    </div>
  );

  const theTen = hs && (giaiDoan === 'hoi' || giaiDoan === 'cham-tl' || giaiDoan === 'ket-qua' || giaiDoan === 'chua') && (
    <div className={`inline-flex items-center gap-4 px-8 py-4 rounded-2xl text-[36px] font-black shadow-lg ${
      ketQua === 'dung' ? 'bg-emerald-600 text-white' : ketQua === 'sai' ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'}`}>
      <UserCheck className="w-[38px] h-[38px]" /> {hs.ten}
      {ketQua && <span className="ml-3 text-[40px]">{diemVua > 0 ? `+${diemVua}` : diemVua}</span>}
    </div>
  );

  /* ---- màn cài đặt ---- */
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
                        className={`flex-1 py-4 rounded-xl text-[30px] font-bold border-[3px] ${
                          nguon === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>
                  {n === 'bai' ? 'Bài này' : 'Cả chương'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-6">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Số câu</div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSoCau(s => Math.max(1, s - 1))} className="w-[70px] h-[70px] rounded-xl bg-slate-100 text-[40px] font-black text-slate-600">−</button>
              <input id="tro-choi-so-cau" type="number" min={1} max={50} value={soCau}
                     onChange={e => setSoCau(Math.max(1, parseInt(e.target.value || '1', 10)))}
                     className="flex-1 text-center text-[44px] font-black text-indigo-800 border-[3px] border-indigo-200 rounded-xl py-2 outline-none focus:border-indigo-500" />
              <button onClick={() => setSoCau(s => Math.min(50, s + 1))} className="w-[70px] h-[70px] rounded-xl bg-slate-100 text-[40px] font-black text-slate-600">+</button>
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-6">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Lớp</div>
            <select id="tro-choi-lop" value={lopId} onChange={e => setLopId(e.target.value)}
                    className="w-full text-[30px] font-bold text-slate-800 border-[3px] border-slate-300 rounded-xl px-4 py-3 bg-white">
              {dsLop.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border-[3px] border-indigo-100 px-8 py-5 text-[26px] text-slate-700 leading-relaxed mb-8">
          Vòng quay gọi một em → câu hiện → em trả lời, máy chấm. Đúng <b>+1/+2/+3</b> theo mức câu, sai <b>trừ</b> bằng ngần ấy.
          Sai thì <b>chuyền</b> sang em khác, tối đa {TOI_DA_CHUYEN} lần rồi thầy chữa. Thời gian mỗi câu đặt bằng đồng hồ góc trên (nhớ cho câu sau). Câu lấy từ <b>Bộ câu hỏi trò chơi</b> của bài (hoặc của mọi bài trong chương).
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

  /* ---- màn tổng kết ---- */
  if (giaiDoan === 'tong-ket') {
    const ds = Object.values(bangDiem).sort((a, b) => b.diem - a.diem || b.luot - a.luot);
    return (
      <div className="w-full">
        {dauTrang}
        <h4 className="text-[36px] font-black text-slate-800 mb-5">Tổng kết · {Math.min(iCau + 1, cauList.length)}/{cauList.length} câu</h4>
        {ds.length === 0 ? (
          <p className="text-[30px] text-slate-500">Chưa có em nào được gọi.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-10 gap-y-3 mb-8">
            {ds.map((d, i) => (
              <div key={d.id} className={`flex items-center gap-5 px-6 py-3 rounded-2xl border-[3px] ${
                i === 0 && d.diem > 0 ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <span className="w-[54px] h-[54px] rounded-full bg-slate-100 text-slate-600 text-[28px] font-black flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-[32px] font-bold text-slate-800 truncate">{d.ten}</span>
                <span className="text-[24px] text-slate-400">{d.luot} lượt</span>
                <span className={`text-[36px] font-black ${d.diem > 0 ? 'text-emerald-600' : d.diem < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {d.diem > 0 ? `+${d.diem}` : d.diem}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[24px] text-slate-500 mb-6">Điểm đã ghi vào sổ điểm thưởng của lớp (nguồn "trò chơi"). Muốn sửa em nào, mở bảng Gọi tên như thường.</p>
        <div className="flex justify-center gap-5">
          <Nut onClick={() => { setGiaiDoan('cai-dat'); }} mau="bg-indigo-600 hover:bg-indigo-700"><Redo2 className="w-[34px] h-[34px]" /> Chơi ván mới</Nut>
          <Nut onClick={onDong} mau="bg-slate-500 hover:bg-slate-600"><X className="w-[34px] h-[34px]" /> Về bài giảng</Nut>
        </div>
      </div>
    );
  }

  /* ---- màn quay ---- */
  if (giaiDoan === 'quay') {
    return (
      <div className="w-full">
        {dauTrang}
        <div className="grid grid-cols-[1fr_520px] gap-10 items-start">
          <div>
            <p className="text-[30px] text-slate-600 mb-4">
              {lanChuyen > 0 ? <>Câu được <b className="text-rose-600">chuyền</b> — quay để tìm người nhận.</> : <>Quay để gọi em trả lời câu {iCau + 1}.</>}
              {' '}<span className="text-slate-400">Vòng {vong} · còn {conLai.length}/{caLop.length}</span>
            </p>
            <div className="origin-top-left" style={{ transform: 'scale(1.55)', width: 520, height: 92 * 3 * 1.55 }}>
              <VongQuayTen dsTen={caLop.map(h => h.ten)} trungTen={hs?.ten || null} dangQuay={dangQuay}
                           onXong={() => { setDangQuay(false); vaoCau(); }} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Nut onClick={quay} mau="bg-violet-600 hover:bg-violet-700" title="Phím Q"><Dices className="w-[34px] h-[34px]" /> Quay</Nut>
            <Nut onClick={() => setChonTay(v => !v)} mau="bg-slate-600 hover:bg-slate-700"><UserCheck className="w-[34px] h-[34px]" /> Chỉ định</Nut>
            {chonTay && (
              <div className="max-h-[420px] overflow-y-auto rounded-2xl border-[3px] border-slate-200 bg-white p-2 grid grid-cols-2 gap-2">
                {caLop.map(h => (
                  <button key={h.id} onClick={() => chiDinh(h)}
                          className={`text-left px-4 py-2 rounded-xl text-[24px] font-semibold hover:bg-indigo-50 ${
                            conLai.some(c => c.id === h.id) ? 'text-slate-800' : 'text-slate-400'}`}>
                    {h.ten}
                  </button>
                ))}
              </div>
            )}
            <Nut onClick={ketThuc} mau="bg-slate-400 hover:bg-slate-500"><Flag className="w-[34px] h-[34px]" /> Kết thúc</Nut>
          </div>
        </div>
      </div>
    );
  }

  /* ---- màn hỏi / chấm / kết quả / chữa ---- */
  return (
    <div className="w-full">
      {dauTrang}
      <div className="mb-5">{theTen}</div>
      {cau && (
        <PresentationQuiz key={iCau} chamKin quizData={cau.quiz} lenhNgoai={lenhQuiz} onDoi={khiQuizDoi}
                          soCau={iCau + 1} tongCau={cauList.length} />
      )}
      {loi && <div className="text-rose-600 text-[24px] font-bold mt-4">{loi}</div>}

      {(giaiDoan === 'cham-tl' || (giaiDoan === 'hoi' && loai === 'essay')) && (
        <div className="mt-8 rounded-2xl border-[3px] border-indigo-200 bg-indigo-50 px-8 py-6 flex items-center gap-6">
          <span className="text-[30px] font-bold text-slate-700 flex-1">{hs?.ten} trình bày xong — thầy chấm:</span>
          <Nut onClick={() => ghiKetQua(true)} mau="bg-emerald-600 hover:bg-emerald-700">Đúng +{diemCau}</Nut>
          <Nut onClick={() => ghiKetQua(false)} mau="bg-rose-600 hover:bg-rose-700">Sai −{diemCau}</Nut>
        </div>
      )}

      {(giaiDoan === 'ket-qua' || giaiDoan === 'chua') && (
        <div className="mt-8 flex justify-center gap-5 flex-wrap">
          {ketQua === 'sai' && lanChuyen < TOI_DA_CHUYEN && giaiDoan === 'ket-qua' && (
            <Nut onClick={chuyen} mau="bg-orange-500 hover:bg-orange-600" title="Phím C"><Redo2 className="w-[34px] h-[34px]" /> Chuyền {lanChuyen + 1}/{TOI_DA_CHUYEN}</Nut>
          )}
          {giaiDoan === 'ket-qua' && (
            <Nut onClick={chua} mau={ketQua === 'sai' && lanChuyen >= TOI_DA_CHUYEN ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-500 hover:bg-slate-600'} title="Phím L">
              <BookOpenCheck className="w-[34px] h-[34px]" /> Chữa
            </Nut>
          )}
          <Nut onClick={cauTiep} mau="bg-indigo-600 hover:bg-indigo-700" title="Enter">
            <ChevronRight className="w-[34px] h-[34px]" /> {iCau + 1 >= cauList.length ? 'Tổng kết' : 'Câu tiếp'}
          </Nut>
          <Nut onClick={ketThuc} mau="bg-slate-400 hover:bg-slate-500"><Flag className="w-[34px] h-[34px]" /> Kết thúc</Nut>
        </div>
      )}
      {giaiDoan === 'hoi' && loai !== 'essay' && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-center text-[24px] text-slate-400">
            Bấm phương án em chọn (hoặc trên điện thoại) rồi <b>✓ Chấm</b> — đúng mới lật đáp án, sai thì khoá phương án đó và chuyền được.
          </p>
          <Nut onClick={boTay} mau="bg-rose-500 hover:bg-rose-600" title="Phím B — em không trả lời được: tính sai, đáp án vẫn giấu">
            <X className="w-[34px] h-[34px]" /> Bó tay −{diemCau}
          </Nut>
        </div>
      )}
      {giaiDoan === 'hoi' && loai === 'essay' && (
        <p className="mt-6 text-center text-[24px] text-slate-400">Tự luận: nghe em trình bày rồi bấm Đúng/Sai.</p>
      )}
    </div>
  );
}
