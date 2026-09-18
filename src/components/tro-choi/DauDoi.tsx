"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Play, ChevronRight, Flag, X, Loader2, Users, Redo2, BookOpenCheck, Shuffle, Mic } from 'lucide-react';
import PresentationQuiz, { type TrangThaiQuiz } from '@/components/presentation/PresentationQuiz';
import { layCauTroChoi, ghiDiemTroChoi, type CauTroChoi, type NguonCau } from '@/app/actions/troChoi';
import { layDsLop, layLopTheoBai, layDsHocSinh } from '@/app/actions/goiTenVaDiem';
import type { HocSinh } from '@/utils/goiTenVaDiem';
import { diemTheoMuc, TEN_MUC, TEN_LOAI, xao } from '@/utils/troChoi';
import type { TrangThaiTroChoi } from '@/utils/dieuKhienXa';

/**
 * TRÒ 3 — ĐẤU ĐỘI TIẾP SỨC (đợt 1, chế độ một màn hình).
 *
 * Lớp chia 2–4 đội (máy chia xen kẽ theo danh sách, thầy bấm tên để đổi đội). Mỗi lượt
 * một câu: đội giơ bảng trước được thầy bấm tên đội, rồi chấm như Truy đuổi (máy tự chấm
 * trắc nghiệm / Đúng-Sai / trả lời ngắn; tự luận thầy bấm). Đúng: đội cộng theo mức câu
 * (+1/+2/+3); sai: trừ ngần ấy và đội khác được giành. Đội đúng phải cử một em (máy chọn
 * ngẫu nhiên người chưa trình bày) đứng lên nói cách làm — nên gọi là tiếp sức.
 * Cuối trận, điểm thưởng theo thứ hạng do thầy đặt ghi cho TỪNG EM của đội.
 * Luật do thầy chốt 16/9/2026.
 */

type GiaiDoan = 'cai-dat' | 'tai' | 'chia-doi' | 'hoi' | 'cham' | 'cham-tl' | 'ket-qua' | 'chua' | 'tong-ket';
const NHO = 'tro-choi-dau-doi';
const NHO_LOP = 'lop-goi-ten-lan-truoc';
const MAU_DOI = [
  { ten: 'Đội Đỏ', nen: 'bg-rose-500', nhat: 'bg-rose-50 border-rose-300', chu: 'text-rose-700' },
  { ten: 'Đội Xanh', nen: 'bg-sky-500', nhat: 'bg-sky-50 border-sky-300', chu: 'text-sky-700' },
  { ten: 'Đội Vàng', nen: 'bg-amber-500', nhat: 'bg-amber-50 border-amber-300', chu: 'text-amber-700' },
  { ten: 'Đội Tím', nen: 'bg-violet-500', nhat: 'bg-violet-50 border-violet-300', chu: 'text-violet-700' },
];

interface Doi { ten: string; thanhVien: HocSinh[]; diem: number }

export default function DauDoi({ lessonId, lenhTuXa, lenhChoQuiz, onTrangThai, onBatDauCau, onDong }: {
  lessonId?: string;
  lenhTuXa?: { hanh: string; gia?: any; dem: number } | null;
  lenhChoQuiz?: { viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null;
  onTrangThai?: (tt: TrangThaiTroChoi, cauHoi: any | null, quiz: { hienDapAn: boolean; dangChon: number | null; buoc: number; loiGiai: string }) => void;
  onBatDauCau?: (khoa: string) => void;
  onDong: () => void;
}) {
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan>('cai-dat');
  const [loi, setLoi] = useState('');

  /* ---- cài đặt ---- */
  const [nguon, setNguon] = useState<NguonCau>('bai');
  const [soCau, setSoCau] = useState(6);
  const [soDoi, setSoDoi] = useState(3);
  const [thuong, setThuong] = useState<number[]>([3, 2, 1, 0]);
  const [dsLop, setDsLop] = useState<{ id: string; name: string }[]>([]);
  const [lopId, setLopId] = useState('');
  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem(NHO) || 'null');
      if (n) { if (n.soCau) setSoCau(n.soCau); if (n.soDoi) setSoDoi(n.soDoi); if (Array.isArray(n.thuong)) setThuong(n.thuong); if (n.nguon) setNguon(n.nguon); }
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
  const [doi, setDoi] = useState<Doi[]>([]);
  const [doiDangTraLoi, setDoiDangTraLoi] = useState<number | null>(null);
  const [doiDaThu, setDoiDaThu] = useState<number[]>([]);     // đội đã trả lời sai câu này
  const [lanThu, setLanThu] = useState(0);                    // để dựng lại câu khi đội khác giành
  const [ketQua, setKetQua] = useState<'dung' | 'sai' | ''>('');
  const [nguoiTrinhBay, setNguoiTrinhBay] = useState<HocSinh | null>(null);
  const daTrinhBay = useRef<Set<string>>(new Set());
  const [lenhQuiz, setLenhQuiz] = useState<{ viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null>(null);
  const demLenh = useRef(0);
  const guiQuiz = (viec: string, them: any = {}) => setLenhQuiz({ viec, ...them, dem: ++demLenh.current });
  const ttQuiz = useRef<TrangThaiQuiz>({
    hienDapAn: false, dangChon: null, buoc: 0, loiGiai: '', chonCum: {}, chuNhap: '', lanCham: 0, ketQuaCham: null, daSai: [],
  });
  const [ttQuizHien, setTtQuizHien] = useState(ttQuiz.current);
  const [daGhiThuong, setDaGhiThuong] = useState(false);

  const cau = cauList[iCau];
  const muc = cau?.muc || 0;
  const diemCau = cau ? diemTheoMuc(muc) : 0;
  const loai = String(cau?.quiz?.type || 'multiple_choice');
  const cauCuoi = iCau === cauList.length - 1 && cauList.length > 1;
  /* Câu cuối tính gấp đôi — cho đội đang thua còn cơ hội lật */
  const heSo = cauCuoi ? 2 : 1;

  useEffect(() => { if (lenhChoQuiz) setLenhQuiz({ ...lenhChoQuiz, dem: ++demLenh.current }); }, [lenhChoQuiz]);

  /* ---- bắt đầu: rút câu, chia đội ---- */
  const chiaDoi = (hs: HocSinh[], n: number): Doi[] => {
    const ds: Doi[] = Array.from({ length: n }, (_, i) => ({ ten: MAU_DOI[i].ten, thanhVien: [], diem: 0 }));
    hs.forEach((h, i) => ds[i % n].thanhVien.push(h));
    return ds;
  };
  const batDau = async () => {
    if (!lopId) { setLoi('Chưa chọn lớp.'); return; }
    if (!lessonId) { setLoi('Không biết đang chiếu bài nào.'); return; }
    setGiaiDoan('tai'); setLoi('');
    try {
      try { localStorage.setItem(NHO, JSON.stringify({ soCau, soDoi, thuong, nguon })); localStorage.setItem(NHO_LOP, lopId); } catch { /* thôi */ }
      const [tatCa, hs] = await Promise.all([layCauTroChoi(lessonId, nguon), layDsHocSinh(lopId)]);
      if (!tatCa.length) { setLoi(nguon === 'bai' ? 'Bài này chưa có Bộ câu hỏi trò chơi. Vào Soạn bài → "Thêm Bộ câu hỏi trò chơi" rồi đưa câu vào (rút kho, hoặc nhập từ tự luyện có tách ý).' : 'Chương này chưa có Bộ câu hỏi trò chơi nào.'); setGiaiDoan('cai-dat'); return; }
      if (hs.length < soDoi) { setLoi('Lớp không đủ học sinh để chia đội.'); setGiaiDoan('cai-dat'); return; }
      /* Sắp câu theo mức tăng dần để câu khó về cuối (câu cuối ×2) */
      const chon = xao(tatCa).slice(0, Math.max(1, soCau)).sort((a, b) => a.muc - b.muc);
      setCauList(chon);
      setDoi(chiaDoi(xao(hs), soDoi));
      setICau(0); setDoiDangTraLoi(null); setDoiDaThu([]); setLanThu(0); setKetQua(''); setNguoiTrinhBay(null);
      daTrinhBay.current = new Set(); setDaGhiThuong(false);
      setGiaiDoan('chia-doi');
    } catch (e: any) { setLoi(e?.message || 'Không bắt đầu được'); setGiaiDoan('cai-dat'); }
  };
  /** Bấm tên một em ở màn chia đội: chuyển em ấy sang đội kế tiếp */
  const doiDoiCua = (h: HocSinh) => setDoi(ds => {
    const tu = ds.findIndex(d => d.thanhVien.some(x => x.id === h.id));
    if (tu < 0) return ds;
    const den = (tu + 1) % ds.length;
    return ds.map((d, i) => i === tu ? { ...d, thanhVien: d.thanhVien.filter(x => x.id !== h.id) }
      : i === den ? { ...d, thanhVien: [...d.thanhVien, h] } : d);
  });
  const xaoLai = () => setDoi(ds => chiaDoi(xao(ds.flatMap(d => d.thanhVien)), ds.length));
  const vaoCau = (khoa: string, giuCau = false) => {
    /* Đội khác giành (giuCau): KHÔNG dựng lại câu — phương án đội trước chọn sai đã khoá đỏ,
       đáp án vẫn giấu. Câu mới mới xoá sạch. */
    if (!giuCau) {
      ttQuiz.current = { ...ttQuiz.current, hienDapAn: false, dangChon: null, buoc: 0, chonCum: {}, chuNhap: '', lanCham: 0, ketQuaCham: null, daSai: [] };
      guiQuiz('lam-lai');
    }
    setKetQua(''); setDoiDangTraLoi(null); setNguoiTrinhBay(null);
    setGiaiDoan('hoi');
    onBatDauCau?.(khoa);
  };
  const batDauChoi = () => { setDoiDaThu([]); setLanThu(0); vaoCau('0-0'); };

  /* ---- một đội giơ bảng ---- */
  const doiGio = (i: number) => {
    if (giaiDoan !== 'hoi' || doiDaThu.includes(i)) return;
    setDoiDangTraLoi(i);
    setGiaiDoan(loai === 'essay' ? 'cham-tl' : 'cham');
  };

  /* ---- chấm ---- */
  const ghiKetQua = (dung: boolean) => {
    if (doiDangTraLoi === null) return;
    const d = (dung ? diemCau : -diemCau) * heSo;
    if (loai === 'essay' && !ttQuiz.current.hienDapAn) guiQuiz('hien-dap-an');
    setDoi(ds => ds.map((x, i) => i === doiDangTraLoi ? { ...x, diem: x.diem + d } : x));
    setKetQua(dung ? 'dung' : 'sai');
    if (dung) chonNguoiTrinhBay(doiDangTraLoi);
    else setDoiDaThu(t => [...t, doiDangTraLoi]);
    setGiaiDoan('ket-qua');
  };
  const chonNguoiTrinhBay = (i: number, tranh?: string) => {
    const tv = doi[i]?.thanhVien || [];
    let ung = tv.filter(h => !daTrinhBay.current.has(h.id) && h.id !== tranh);
    if (!ung.length) { daTrinhBay.current = new Set(); ung = tv.filter(h => h.id !== tranh); }
    if (!ung.length) ung = tv;
    const em = ung[Math.floor(Math.random() * ung.length)] || null;
    if (em) daTrinhBay.current.add(em.id);
    setNguoiTrinhBay(em);
  };
  /**
   * Đang chấm một đội (giaiDoan 'cham'): câu ở chế độ CHẤM KÍN — thầy bấm "Chấm", đúng mới
   * lật đáp án, sai thì khoá phương án ấy, đáp án vẫn giấu để đội khác giành (bản đầu chấm
   * bằng cách lật đáp án nên đội sai xong đội sau chỉ việc đọc — thầy bắt được 16/9/2026).
   * Chưa đội nào giơ ('hoi') thì nút vẫn là "Hiển thị đáp án": lật là coi như không đội nào
   * trả lời, chỉ chữa.
   */
  const khiQuizDoi = (t: TrangThaiQuiz) => {
    const truoc = ttQuiz.current;
    ttQuiz.current = t; setTtQuizHien(t);
    if (giaiDoan === 'cham' && t.lanCham > truoc.lanCham && t.ketQuaCham) ghiKetQua(t.ketQuaCham === 'dung');
    else if (giaiDoan === 'hoi' && !truoc.hienDapAn && t.hienDapAn) { setKetQua(''); setGiaiDoan('ket-qua'); }
  };
  /** Đội giơ bảng nhưng không trả lời được: tính sai, đáp án vẫn giấu để đội khác giành. */
  const boTay = () => { if (giaiDoan === 'cham') ghiKetQua(false); };

  /* ---- sau khi chấm ---- */
  const conDoiGianh = doiDaThu.length < doi.length;
  const gianh = () => {
    /* Đội khác giành: dựng lại câu (xoá lựa chọn cũ), giữ danh sách đội đã sai */
    setLanThu(l => l + 1);
    vaoCau(`${iCau}-${lanThu + 1}`, true);
  };
  const chua = () => { guiQuiz('xem-loi-giai'); setGiaiDoan('chua'); };
  const cauTiep = () => {
    if (iCau + 1 >= cauList.length) { ketThuc(); return; }
    setICau(i => i + 1); setDoiDaThu([]); setLanThu(0);
    guiQuiz('lam-lai');
    setTimeout(() => vaoCau(`${iCau + 1}-0`), 0);
  };
  /** Kết thúc: xếp hạng đội, ghi điểm thưởng thứ hạng cho từng em (hoà thì cùng nhận). */
  const ketThuc = async () => {
    setGiaiDoan('tong-ket');
    if (daGhiThuong) return;
    setDaGhiThuong(true);
    const xep = [...doi].map((d, i) => ({ ...d, i })).sort((a, b) => b.diem - a.diem);
    let hang = 0;
    const ghi: Promise<any>[] = [];
    xep.forEach((d, k) => {
      if (k > 0 && d.diem < xep[k - 1].diem) hang = k;
      const t = thuong[hang] || 0;
      if (t === 0) return;
      const lyDo = `Đấu đội · ${d.ten} · hạng ${hang + 1}`;
      for (const h of d.thanhVien) ghi.push(ghiDiemTroChoi(lopId, h.id, t, lyDo, lessonId));
    });
    try { await Promise.all(ghi); } catch (e: any) { setLoi('Không ghi được điểm thưởng: ' + (e?.message || '')); }
  };

  /* ---- lệnh từ điện thoại ---- */
  const demDaLam = useRef(lenhTuXa?.dem ?? 0);
  useEffect(() => {
    if (!lenhTuXa || lenhTuXa.dem === demDaLam.current) return;
    demDaLam.current = lenhTuXa.dem;
    switch (lenhTuXa.hanh) {
      case 'bat-dau': if (giaiDoan === 'cai-dat') batDau(); else if (giaiDoan === 'chia-doi') batDauChoi(); break;
      case 'xao-doi': if (giaiDoan === 'chia-doi') xaoLai(); break;
      case 'doi-gio': if (typeof lenhTuXa.gia === 'number') doiGio(lenhTuXa.gia); break;
      case 'cham':
        if (giaiDoan === 'cham-tl') ghiKetQua(!!lenhTuXa.gia);
        else if (giaiDoan === 'cham' && lenhTuXa.gia === false) boTay();
        break;
      case 'nguoi-khac': if (doiDangTraLoi !== null) chonNguoiTrinhBay(doiDangTraLoi, nguoiTrinhBay?.id); break;
      case 'gianh': if (giaiDoan === 'ket-qua' && ketQua === 'sai' && conDoiGianh) gianh(); break;
      case 'chua': if (giaiDoan === 'ket-qua') chua(); break;
      case 'cau-tiep': if (giaiDoan === 'ket-qua' || giaiDoan === 'chua') cauTiep(); break;
      case 'ket-thuc': if (giaiDoan !== 'cai-dat' && giaiDoan !== 'tong-ket') ketThuc(); break;
      case 'van-moi': setGiaiDoan('cai-dat'); break;
      case 'dong': onDong(); break;
      case 'so-cau': if (typeof lenhTuXa.gia === 'number') setSoCau(lenhTuXa.gia); break;
      case 'so-doi': if (typeof lenhTuXa.gia === 'number') setSoDoi(Math.max(2, Math.min(4, lenhTuXa.gia))); break;
      case 'thuong': if (Array.isArray(lenhTuXa.gia)) setThuong(lenhTuXa.gia); break;
      case 'nguon': if (lenhTuXa.gia === 'bai' || lenhTuXa.gia === 'chuong') setNguon(lenhTuXa.gia); break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenhTuXa]);

  /* ---- phát trạng thái ---- */
  useEffect(() => {
    const bang = doi.map(d => ({ ten: d.ten, diem: d.diem }));
    onTrangThai?.({
      tro: 'dau-doi', giaiDoan, cau: iCau + 1, tongCau: cauList.length, muc, diemCau: diemCau * heSo,
      tenHS: doiDangTraLoi !== null ? (doi[doiDangTraLoi]?.ten || '') + (nguoiTrinhBay ? ` · ${nguoiTrinhBay.ten}` : '') : '',
      lanChuyen: doiDaThu.length, ketQua, bangDiem: bang,
      caiDat: { soCau, nguon, soDoi, thuong, doiDaThu, conDoiGianh },
    } as TrangThaiTroChoi,
    ['hoi', 'cham', 'cham-tl', 'ket-qua', 'chua'].includes(giaiDoan) ? cau?.quiz || null : null,
    { hienDapAn: ttQuizHien.hienDapAn, dangChon: ttQuizHien.dangChon, buoc: ttQuizHien.buoc, loiGiai: ttQuizHien.loiGiai });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giaiDoan, iCau, cauList.length, muc, diemCau, heSo, doi, doiDangTraLoi, nguoiTrinhBay, doiDaThu, ketQua, ttQuizHien, soCau, nguon, soDoi, thuong]);

  /* Phím: 1–4 đội giơ · Enter câu tiếp · G giành · L chữa */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (/^[1-4]$/.test(e.key)) doiGio(Number(e.key) - 1);
      else if (e.key === 'Enter') { if (giaiDoan === 'ket-qua' || giaiDoan === 'chua') cauTiep(); else if (giaiDoan === 'chia-doi') batDauChoi(); }
      else if (e.key === 'g' || e.key === 'G') { if (giaiDoan === 'ket-qua' && ketQua === 'sai' && conDoiGianh) gianh(); }
      else if (e.key === 'l' || e.key === 'L') { if (giaiDoan === 'ket-qua') chua(); }
      else if (e.key === 'b' || e.key === 'B') { if (giaiDoan === 'cham') boTay(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giaiDoan, ketQua, doiDaThu, doi, iCau, lanThu, loai]);

  /* ============================ VẼ ============================ */
  const Nut = ({ onClick, mau, children, title, tat }: { onClick: () => void; mau: string; children: React.ReactNode; title?: string; tat?: boolean }) => (
    <button onClick={onClick} title={title} disabled={tat}
            className={`${mau} text-white px-9 py-4 rounded-full text-[30px] font-bold shadow-lg transition-all
                        hover:-translate-y-0.5 flex items-center gap-3 disabled:opacity-40`}>
      {children}
    </button>
  );
  const OSo = ({ id, gia, dat, min, max }: { id: string; gia: number; dat: (n: number) => void; min: number; max: number }) => (
    <div className="flex items-center gap-2">
      <button onClick={() => dat(Math.max(min, gia - 1))} className="w-[62px] h-[62px] rounded-xl bg-slate-100 text-[36px] font-black text-slate-600">−</button>
      <input id={id} type="number" min={min} max={max} value={gia}
             onChange={e => dat(Math.max(min, Math.min(max, parseInt(e.target.value || String(min), 10))))}
             className="w-[110px] text-center text-[40px] font-black text-indigo-800 border-[3px] border-indigo-200 rounded-xl py-1 outline-none focus:border-indigo-500" />
      <button onClick={() => dat(Math.min(max, gia + 1))} className="w-[62px] h-[62px] rounded-xl bg-slate-100 text-[36px] font-black text-slate-600">+</button>
    </div>
  );

  const dauTrang = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-4">
        <span className="text-[40px]">🏁</span>
        <h3 className="text-[40px] font-black text-indigo-800 m-0">Đấu đội tiếp sức</h3>
        {cauList.length > 0 && ['hoi', 'cham', 'cham-tl', 'ket-qua', 'chua'].includes(giaiDoan) && (
          <span className="text-[28px] font-bold text-slate-500">câu {iCau + 1}/{cauList.length}</span>
        )}
      </div>
      {cau && ['hoi', 'cham', 'cham-tl', 'ket-qua', 'chua'].includes(giaiDoan) && (
        <div className="flex items-center gap-3">
          <span className="px-5 py-2 rounded-full bg-amber-100 text-amber-800 text-[26px] font-bold">
            {TEN_MUC[muc] || 'Nhận biết'} · ±{diemCau}{cauCuoi ? ' ×2' : ''}
          </span>
          <span className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 text-[24px] font-semibold">{TEN_LOAI[loai] || loai}</span>
        </div>
      )}
    </div>
  );

  /** Bảng điểm đội — hiện suốt trận; đội đang trả lời sáng lên, đội đã sai câu này mờ đi */
  const bangDoi = (bam: boolean) => (
    <div className={`grid gap-4 mb-5`} style={{ gridTemplateColumns: `repeat(${doi.length}, 1fr)` }}>
      {doi.map((d, i) => {
        const m = MAU_DOI[i];
        const dang = doiDangTraLoi === i;
        const daSai = doiDaThu.includes(i);
        return (
          <button key={i} onClick={() => bam && doiGio(i)} disabled={!bam || daSai}
                  className={`rounded-2xl border-[4px] px-5 py-3 text-left transition-all ${
                    dang ? `${m.nen} border-transparent text-white shadow-xl scale-[1.03]` : `${m.nhat}`} ${daSai ? 'opacity-40' : ''} ${bam && !daSai ? 'hover:scale-[1.02] cursor-pointer' : ''}`}>
            <div className={`text-[24px] font-bold ${dang ? 'text-white/90' : m.chu}`}>{d.ten}{bam && !daSai ? ` · phím ${i + 1}` : ''}</div>
            <div className={`text-[48px] font-black leading-none mt-1 ${dang ? 'text-white' : 'text-slate-800'}`}>{d.diem}</div>
          </button>
        );
      })}
    </div>
  );

  /* ---- cài đặt ---- */
  if (giaiDoan === 'cai-dat' || giaiDoan === 'tai') {
    return (
      <div className="w-full">
        {dauTrang}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl border-[3px] border-slate-200 p-5">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Lấy câu từ</div>
            <div className="flex gap-3">
              {(['bai', 'chuong'] as NguonCau[]).map(n => (
                <button key={n} onClick={() => setNguon(n)}
                        className={`flex-1 py-3 rounded-xl text-[28px] font-bold border-[3px] ${
                          nguon === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>
                  {n === 'bai' ? 'Bài này' : 'Cả chương'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-5">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Lớp</div>
            <select id="dau-doi-lop" value={lopId} onChange={e => setLopId(e.target.value)}
                    className="w-full text-[30px] font-bold text-slate-800 border-[3px] border-slate-300 rounded-xl px-4 py-3 bg-white">
              {dsLop.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-5 flex items-center justify-between">
            <div className="text-[26px] font-bold text-slate-500">Số câu <span className="text-[20px] font-normal">(câu cuối ×2)</span></div>
            <OSo id="dau-doi-so-cau" gia={soCau} dat={setSoCau} min={1} max={30} />
          </div>
          <div className="rounded-2xl border-[3px] border-slate-200 p-5 flex items-center justify-between">
            <div className="text-[26px] font-bold text-slate-500">Số đội</div>
            <OSo id="dau-doi-so-doi" gia={soDoi} dat={setSoDoi} min={2} max={4} />
          </div>
          <div className="col-span-2 rounded-2xl border-[3px] border-slate-200 p-5">
            <div className="text-[26px] font-bold text-slate-500 mb-3">Điểm thưởng cuối trận cho <b>mỗi em</b> theo thứ hạng đội (hoà thì cùng nhận)</div>
            <div className="flex gap-8 flex-wrap">
              {Array.from({ length: soDoi }, (_, k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-[26px] font-bold text-slate-700">Hạng {k + 1}</span>
                  <OSo id={`dau-doi-thuong-${k}`} gia={thuong[k] || 0} dat={n => setThuong(t => t.map((x, i) => i === k ? n : x))} min={0} max={10} />
                </div>
              ))}
            </div>
          </div>
        </div>
        {loi && <div className="text-rose-600 text-[26px] font-bold mb-4">{loi}</div>}
        <div className="flex justify-center gap-5">
          <Nut onClick={batDau} mau="bg-indigo-600 hover:bg-indigo-700">
            {giaiDoan === 'tai' ? <Loader2 className="w-[34px] h-[34px] animate-spin" /> : <Users className="w-[34px] h-[34px]" />} Chia đội
          </Nut>
          <Nut onClick={onDong} mau="bg-slate-500 hover:bg-slate-600"><X className="w-[34px] h-[34px]" /> Đóng</Nut>
        </div>
      </div>
    );
  }

  /* ---- chia đội ---- */
  if (giaiDoan === 'chia-doi') {
    return (
      <div className="w-full">
        {dauTrang}
        <p className="text-[26px] text-slate-500 mb-4">Máy đã chia xen kẽ. Bấm tên một em để chuyển em ấy sang đội kế; bấm Xáo lại để chia lại.</p>
        <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: `repeat(${doi.length}, 1fr)` }}>
          {doi.map((d, i) => (
            <div key={i} className={`rounded-2xl border-[4px] ${MAU_DOI[i].nhat} p-4`}>
              <div className={`text-[30px] font-black mb-2 ${MAU_DOI[i].chu}`}>{d.ten} <span className="text-[22px] font-semibold text-slate-500">· {d.thanhVien.length} em</span></div>
              <div className="flex flex-wrap gap-2">
                {d.thanhVien.map(h => (
                  <button key={h.id} onClick={() => doiDoiCua(h)}
                          className="px-3 py-1.5 rounded-lg bg-white border-2 border-slate-200 text-[22px] font-semibold text-slate-800 hover:border-indigo-400">
                    {h.ten}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-5">
          <Nut onClick={xaoLai} mau="bg-slate-500 hover:bg-slate-600"><Shuffle className="w-[34px] h-[34px]" /> Xáo lại</Nut>
          <Nut onClick={batDauChoi} mau="bg-indigo-600 hover:bg-indigo-700" title="Enter"><Play className="w-[34px] h-[34px]" /> Bắt đầu câu 1</Nut>
          <Nut onClick={onDong} mau="bg-slate-400 hover:bg-slate-500"><X className="w-[34px] h-[34px]" /> Đóng</Nut>
        </div>
      </div>
    );
  }

  /* ---- tổng kết ---- */
  if (giaiDoan === 'tong-ket') {
    const xep = [...doi].map((d, i) => ({ ...d, i })).sort((a, b) => b.diem - a.diem);
    let hang = 0;
    return (
      <div className="w-full">
        {dauTrang}
        <h4 className="text-[36px] font-black text-slate-800 mb-5">Tổng kết · {Math.min(iCau + 1, cauList.length)}/{cauList.length} câu</h4>
        <div className="flex flex-col gap-4 mb-6">
          {xep.map((d, k) => {
            if (k > 0 && d.diem < xep[k - 1].diem) hang = k;
            const t = thuong[hang] || 0;
            const m = MAU_DOI[d.i];
            return (
              <div key={d.i} className={`rounded-2xl border-[4px] ${m.nhat} px-6 py-4 flex items-center gap-6`}>
                <span className={`w-[64px] h-[64px] rounded-full ${m.nen} text-white text-[34px] font-black flex items-center justify-center`}>{hang + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[32px] font-black ${m.chu}`}>{d.ten} <span className="text-slate-800">· {d.diem} điểm</span></div>
                  <div className="text-[22px] text-slate-600 truncate">{d.thanhVien.map(h => h.ten).join(', ')}</div>
                </div>
                <span className={`text-[34px] font-black ${t > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{t > 0 ? `+${t} / em` : '—'}</span>
              </div>
            );
          })}
        </div>
        {loi && <div className="text-rose-600 text-[24px] font-bold mb-4">{loi}</div>}
        <p className="text-[24px] text-slate-500 mb-6">Điểm thưởng theo thứ hạng đã ghi vào sổ điểm thưởng cho từng em (nguồn "trò chơi").</p>
        <div className="flex justify-center gap-5">
          <Nut onClick={() => setGiaiDoan('cai-dat')} mau="bg-indigo-600 hover:bg-indigo-700"><Redo2 className="w-[34px] h-[34px]" /> Chơi ván mới</Nut>
          <Nut onClick={onDong} mau="bg-slate-500 hover:bg-slate-600"><X className="w-[34px] h-[34px]" /> Về bài giảng</Nut>
        </div>
      </div>
    );
  }

  /* ---- hỏi / chấm / kết quả ---- */
  const doiTL = doiDangTraLoi !== null ? doi[doiDangTraLoi] : null;
  return (
    <div className="w-full">
      {dauTrang}
      {bangDoi(giaiDoan === 'hoi')}
      {giaiDoan === 'hoi' && (
        <p className="text-[26px] text-slate-500 mb-4">Đội nào giơ bảng trước — bấm tên đội (hoặc phím 1–{doi.length}) rồi chấm.</p>
      )}
      {doiTL && giaiDoan !== 'hoi' && (
        <div className={`inline-flex items-center gap-4 px-8 py-3 rounded-2xl text-[32px] font-black shadow-lg mb-4 ${
          ketQua === 'dung' ? 'bg-emerald-600 text-white' : ketQua === 'sai' ? 'bg-rose-600 text-white' : `${MAU_DOI[doiDangTraLoi!].nen} text-white`}`}>
          {doiTL.ten} {ketQua === 'dung' ? `+${diemCau * heSo}` : ketQua === 'sai' ? `−${diemCau * heSo}` : 'đang trả lời'}
          {nguoiTrinhBay && <span className="ml-4 flex items-center gap-2 text-[28px] font-bold bg-white/20 px-4 py-1 rounded-xl"><Mic className="w-[28px] h-[28px]" /> {nguoiTrinhBay.ten} trình bày</span>}
        </div>
      )}
      {cau && (
        <PresentationQuiz key={iCau} chamKin={giaiDoan === 'cham'} khoa={giaiDoan !== 'cham' && giaiDoan !== 'hoi'}
                          quizData={cau.quiz} lenhNgoai={lenhQuiz} onDoi={khiQuizDoi}
                          soCau={iCau + 1} tongCau={cauList.length} />
      )}
      {loi && <div className="text-rose-600 text-[24px] font-bold mt-4">{loi}</div>}

      {giaiDoan === 'cham-tl' && doiTL && (
        <div className="mt-8 rounded-2xl border-[3px] border-indigo-200 bg-indigo-50 px-8 py-6 flex items-center gap-6">
          <span className="text-[30px] font-bold text-slate-700 flex-1">{doiTL.ten} trình bày xong — thầy chấm:</span>
          <Nut onClick={() => ghiKetQua(true)} mau="bg-emerald-600 hover:bg-emerald-700">Đúng +{diemCau * heSo}</Nut>
          <Nut onClick={() => ghiKetQua(false)} mau="bg-rose-600 hover:bg-rose-700">Sai −{diemCau * heSo}</Nut>
        </div>
      )}
      {giaiDoan === 'cham' && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-center text-[24px] text-slate-400">Bấm đáp án đội {doiTL?.ten} viết trên bảng rồi <b>✓ Chấm</b> — đúng mới lật đáp án, sai thì khoá phương án đó, đội khác giành được.</p>
          <Nut onClick={boTay} mau="bg-rose-500 hover:bg-rose-600" title="Phím B — đội không trả lời được: tính sai, đáp án vẫn giấu">
            <X className="w-[34px] h-[34px]" /> Bó tay −{diemCau * heSo}
          </Nut>
        </div>
      )}

      {(giaiDoan === 'ket-qua' || giaiDoan === 'chua') && (
        <div className="mt-8 flex justify-center gap-5 flex-wrap">
          {giaiDoan === 'ket-qua' && ketQua === 'sai' && conDoiGianh && (
            <Nut onClick={gianh} mau="bg-orange-500 hover:bg-orange-600" title="Phím G"><Redo2 className="w-[34px] h-[34px]" /> Đội khác giành</Nut>
          )}
          {giaiDoan === 'ket-qua' && ketQua === 'dung' && doiDangTraLoi !== null && (
            <Nut onClick={() => chonNguoiTrinhBay(doiDangTraLoi, nguoiTrinhBay?.id)} mau="bg-slate-500 hover:bg-slate-600"><Mic className="w-[34px] h-[34px]" /> Người khác</Nut>
          )}
          {giaiDoan === 'ket-qua' && (
            <Nut onClick={chua} mau="bg-slate-500 hover:bg-slate-600" title="Phím L"><BookOpenCheck className="w-[34px] h-[34px]" /> Chữa</Nut>
          )}
          <Nut onClick={cauTiep} mau="bg-indigo-600 hover:bg-indigo-700" title="Enter">
            <ChevronRight className="w-[34px] h-[34px]" /> {iCau + 1 >= cauList.length ? 'Tổng kết' : 'Câu tiếp'}
          </Nut>
          <Nut onClick={ketThuc} mau="bg-slate-400 hover:bg-slate-500"><Flag className="w-[34px] h-[34px]" /> Kết thúc</Nut>
        </div>
      )}
    </div>
  );
}
