"use client";

/**
 * CHẤM BÀI QUÉT ẢNH - nạp ảnh phiếu trả lời rồi máy đọc lưới tô tròn và chấm.
 *
 * Bản này làm tới bảng soát: nạp ảnh, đọc, chấm, sửa tay từng câu. CHƯA ghi điểm vào sổ -
 * việc đó để đợt sau, khi có bảng lưu bài quét trong cơ sở dữ liệu.
 *
 * Không tốn khoá AI: phần trắc nghiệm đọc bằng hình học thuần (xem docPhieuQuet.ts).
 *
 * NGUYÊN TẮC: máy KHÔNG ĐOÁN. Ô mờ, tô hai ô, ảnh không nắn được - đều bày ra cho Thầy cô
 * nhìn chứ không chọn bừa. Câu nào máy chưa dám chấm thì để trống điểm, không tính 0.
 */

import React from "react";
import Link from "next/link";
import {
  Upload, Loader2, ScanLine, CheckCircle2, AlertTriangle, X, ChevronLeft, FileImage,
} from "lucide-react";
import { chuanHoaNguonThanhAnh } from "@/utils/pdfToImages";
import { chiaPhanDeThi, soDiemVN, type PhanDeThi } from "@/utils/deThi";
import { khoiPhieuTuCacPhan } from "@/utils/phieuTraLoi";
import { dungLuoi, type BanDoLuoi } from "@/utils/luoiToTron";
import { docPhieuQuet, type KetQuaDocPhieu } from "@/utils/docPhieuQuet";
import { chamPhieuQuet, type CauTrongDe, type KetQuaChamPhieu } from "@/utils/chamPhieuQuet";

interface BoDe {
  id: string; ten: string; grade: string; subject: string;
  tong_diem: number; so_cau: number; da_chot?: boolean; dau_de?: any;
  /** Chỉ có khi tải riêng một bộ - danh sách không kèm cột này vì nó rất nặng. */
  cau_hoi?: any[];
}

/**
 * VAI TRÒ của một tờ ảnh. Học sinh không phải lúc nào cũng làm trên đúng tờ phiếu in ra:
 * tờ rách góc, viết tràn sang giấy đôi, hay quên phiếu nên làm hẳn ra giấy ô ly. Mỗi
 * cảnh cần một cách xử khác nhau, nên phải phân vai rõ ràng chứ không gộp làm một.
 */
export type VaiTro =
  /** Tờ phiếu in ra, máy đọc được lưới - chấm bằng máy. */
  | 'luoi'
  /** Tờ phiếu nhưng lưới không đọc nổi: rách góc, mờ, nghiêng quá. KHÔNG ĐOÁN - nhập tay. */
  | 'luoiHong'
  /** Giấy khác hẳn: giấy đôi, giấy ô ly, tờ phụ tự luận. Không chấm máy, giữ làm bằng chứng. */
  | 'giayKhac';

export const TEN_VAI: Record<VaiTro, string> = {
  luoi: 'Phiếu đọc được',
  luoiHong: 'Phiếu không đọc được',
  giayKhac: 'Giấy khác',
};

/** Một trang ảnh đã đọc xong. */
interface TrangDaDoc {
  tenTep: string;
  anhUrl: string;
  vai: VaiTro;
  /** Trang thứ mấy của phiếu - CHỈ có khi đọc được mã QR. Không có thì để 0, không đoán. */
  trang: number;
  tuQR: boolean;
  doc?: KetQuaDocPhieu;
  loi?: string;
}

/** Một bài - gom các trang của cùng một học sinh. */
interface BaiQuet {
  /** Nhãn Thầy cô đặt cho bài, thường là tên em - để trống thì đánh số. */
  ten: string;
  trang: TrangDaDoc[];
  suaTay: Record<string, string | null>;
}

/** Điểm mỗi câu theo từng phần, chia đều điểm của phần cho số câu. */
function diemMoiCauTheoPhan(cacPhan: PhanDeThi[], tongDiem: number): Record<string, number> {
  /* Khuôn điểm quen dùng: trắc nghiệm 0,25 - Đúng/Sai 1,0 - trả lời ngắn 0,5. Nếu cộng
     lại không ra tổng điểm của bộ đề thì co giãn đều cho khớp, khỏi lệch với bản in. */
  const MAC_DINH: Record<string, number> = { NLC: 0.25, DS: 1, TLN: 0.5, TL: 1 };
  const tong = cacPhan.reduce((t, p) => t + (MAC_DINH[p.ma] ?? 0) * p.cauHoi.length, 0);
  const heSo = tong > 0 && tongDiem > 0 ? tongDiem / tong : 1;
  const ra: Record<string, number> = {};
  for (const p of cacPhan) ra[p.ma] = Math.round((MAC_DINH[p.ma] ?? 0) * heSo * 100) / 100;
  return ra;
}

/** Đọc một tệp ảnh thành dữ liệu điểm ảnh để đưa cho bộ đọc lưới. */
async function anhTuTep(f: File): Promise<{ anh: ImageData; url: string }> {
  const url = URL.createObjectURL(f);
  const img = await new Promise<HTMLImageElement>((ok, hong) => {
    const e = new Image();
    e.onload = () => ok(e);
    e.onerror = () => hong(new Error('Không mở được ảnh ' + f.name));
    e.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const nen = canvas.getContext('2d', { willReadFrequently: true });
  if (!nen) throw new Error('Trình duyệt không dựng được canvas.');
  nen.drawImage(img, 0, 0);
  return { anh: nen.getImageData(0, 0, canvas.width, canvas.height), url };
}

/** Đọc mã QR trên ảnh phiếu: "LTP|1|<bộ đề>|<mã đề>|pt|<trang>". */
async function docQR(anh: ImageData): Promise<{ boDeId: string; maDe: string; trang: number } | null> {
  try {
    const jsQR = (await import('jsqr')).default;
    const kq = jsQR(anh.data as any, anh.width, anh.height, { inversionAttempts: 'attemptBoth' });
    if (!kq?.data) return null;
    const p = String(kq.data).split('|');
    if (p[0] !== 'LTP' || p[4] !== 'pt') return null;
    return { boDeId: p[2], maDe: p[3], trang: Number(p[5]) || 1 };
  } catch { return null; }
}

export default function ChamQuetPage() {
  const [dsBoDe, setDsBoDe] = React.useState<BoDe[]>([]);
  const [boDeId, setBoDeId] = React.useState('');
  const [dangNap, setDangNap] = React.useState(true);
  const [dangDoc, setDangDoc] = React.useState('');
  const [bai, setBai] = React.useState<BaiQuet[]>([]);
  /** Tờ máy không biết xếp vào đâu - Thầy cô gán tay, máy tuyệt đối không đoán. */
  const [khay, setKhay] = React.useState<TrangDaDoc[]>([]);
  const [moBai, setMoBai] = React.useState<number | null>(null);
  const [keo, setKeo] = React.useState(false);

  /* Bộ đề đọc QUA API máy chủ chứ không đọc thẳng từ trình duyệt: bảng bo_de_thi chỉ mở
     cho khoá máy chủ, và cả app vẫn đi đường này (xem api/admin/bo-de). Danh sách không
     kèm cau_hoi vì cột đó rất nặng - chọn bộ nào mới tải nội dung bộ ấy. */
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/bo-de');
        const d = await r.json();
        setDsBoDe(((d.danhSach || []) as any[]).filter(b => b.da_chot));
      } catch { /* không tải được thì để danh sách rỗng, giao diện tự báo */ }
      setDangNap(false);
    })();
  }, []);

  /* Nội dung bộ đề đang chọn - tải riêng vì cột cau_hoi nặng. */
  const [boDe, setBoDe] = React.useState<BoDe | null>(null);
  const [dangTaiDe, setDangTaiDe] = React.useState(false);
  React.useEffect(() => {
    if (!boDeId) { setBoDe(null); return; }
    setDangTaiDe(true);
    (async () => {
      try {
        const r = await fetch('/api/admin/bo-de?id=' + boDeId);
        const d = await r.json();
        setBoDe(d.boDe || null);
      } catch { setBoDe(null); }
      setDangTaiDe(false);
    })();
  }, [boDeId]);

  /* Bản đồ lưới dựng lại từ chính bộ đề - đúng bằng bản đã in, không phải lưu ở đâu cả. */
  const { cacPhan, cacTrang, phanCham } = React.useMemo(() => {
    if (!boDe) return { cacPhan: [] as PhanDeThi[], cacTrang: [] as BanDoLuoi[], phanCham: [] as CauTrongDe[] };
    const phan = chiaPhanDeThi(boDe.cau_hoi || []);
    const diem = diemMoiCauTheoPhan(phan, Number(boDe.tong_diem) || 0);
    return {
      cacPhan: phan,
      cacTrang: dungLuoi(khoiPhieuTuCacPhan(phan)),
      phanCham: phan
        .filter(p => ['NLC', 'DS', 'TLN'].includes(p.ma))
        .map(p => ({ ma: p.ma, cauHoi: p.cauHoi, diemMoiCau: diem[p.ma] ?? 0 })),
    };
  }, [boDe]);

  /* ---------- Nạp ảnh ---------- */

  const napTep = async (tep: File[]) => {
    if (!boDe) { alert('Chọn bộ đề trước đã - máy cần biết đề nào mới đọc được lưới.'); return; }
    if (tep.length === 0) return;
    try {
      setDangDoc('Đang chuẩn bị ảnh…');
      const anhTep = await chuanHoaNguonThanhAnh(tep, m => setDangDoc(m));

      const daDoc: TrangDaDoc[] = [];
      for (let i = 0; i < anhTep.length; i++) {
        setDangDoc(`Đang đọc ảnh ${i + 1}/${anhTep.length}…`);
        const { anh, url } = await anhTuTep(anhTep[i]);
        const qr = await docQR(anh);
        const chung = { tenTep: anhTep[i].name, anhUrl: url };

        /* Không đọc được mã QR - phiếu in từ bản cũ chỉ có mã ở trang đầu, hoặc ảnh chụp
           hụt mất góc có mã. THỬ KHỚP với bản đồ của từng trang: bản nào sai thì chốt mốc
           chuẩn trong docPhieuQuet tự loại (mốc đen phải ra đen, mốc trắng phải ra trắng),
           nên chỉ đúng một bản lọt là chắc ăn. Hai bản cùng lọt, hay không bản nào lọt, thì
           để vào khay cho Thầy cô xếp - KHÔNG đoán. */
        if (!qr) {
          const lot = cacTrang
            .map(l => ({ l, kq: docPhieuQuet(anh, l) }))
            .filter(x => x.kq.timDuocNeo);
          if (lot.length === 1) {
            daDoc.push({ ...chung, vai: 'luoi', trang: lot[0].l.trang, tuQR: false, doc: lot[0].kq });
          } else {
            daDoc.push({ ...chung, vai: 'giayKhac', trang: 0, tuQR: false,
              loi: lot.length === 0
                ? 'Không thấy mã QR và cũng không khớp lưới trang nào - nhiều khả năng là giấy khác.'
                : `Không có mã QR, mà lại khớp ${lot.length} trang lưới - Thầy cô xếp giúp.` });
          }
          continue;
        }
        if (qr.boDeId !== boDe.id) {
          daDoc.push({ ...chung, vai: 'giayKhac', trang: qr.trang, tuQR: true,
            loi: 'Tờ này là phiếu của một bộ đề KHÁC.' });
          continue;
        }
        const luoi = cacTrang.find(t => t.trang === qr.trang);
        if (!luoi) {
          daDoc.push({ ...chung, vai: 'giayKhac', trang: qr.trang, tuQR: true,
            loi: `Phiếu của đề này chỉ có ${cacTrang.length} trang, không có trang ${qr.trang}.` });
          continue;
        }
        const kq = docPhieuQuet(anh, luoi);
        daDoc.push({
          ...chung, trang: qr.trang, tuQR: true, doc: kq,
          vai: kq.timDuocNeo ? 'luoi' : 'luoiHong',
          loi: kq.timDuocNeo ? undefined : kq.loi,
        });
      }

      /* Gom thành bài: CHỈ những tờ phiếu có mã QR mới xếp được, gặp trang 1 là mở bài
         mới. Tờ nào không xếp được thì vào khay chưa gán, không nhét bừa vào bài nào. */
      const raBai: BaiQuet[] = [];
      const raKhay: TrangDaDoc[] = [];
      for (const t of daDoc) {
        if (t.vai === 'giayKhac') { raKhay.push(t); continue; }
        if (t.trang === 1 || raBai.length === 0) raBai.push({ ten: '', trang: [], suaTay: {} });
        raBai[raBai.length - 1].trang.push(t);
      }
      setBai(b => [...b, ...raBai]);
      setKhay(k => [...k, ...raKhay]);
    } catch (e: any) {
      alert('Không đọc được: ' + (e?.message || e));
    } finally { setDangDoc(''); }
  };

  /* ---------- Chấm ---------- */

  const chamBai = React.useCallback((b: BaiQuet): KetQuaChamPhieu => {
    const traLoi: Record<string, string> = {};
    const khongChac: { ma: string; viSao: string }[] = [];
    for (const t of b.trang) {
      if (!t.doc?.timDuocNeo) continue;
      Object.assign(traLoi, t.doc.traLoi);
      khongChac.push(...t.doc.khongChac);
    }
    return chamPhieuQuet({ traLoi, khongChac }, phanCham, b.suaTay);
  }, [phanCham]);

  /** Gán một tờ trong khay vào một bài - hoặc mở hẳn một bài mới từ tờ ấy. */
  const ganToVaoBai = (iKhay: number, iBai: number | 'moi') => {
    const to = khay[iKhay];
    if (!to) return;
    setKhay(k => k.filter((_, i) => i !== iKhay));
    setBai(ds => iBai === 'moi'
      ? [...ds, { ten: '', trang: [to], suaTay: {} }]
      : ds.map((b, i) => i === iBai ? { ...b, trang: [...b.trang, to] } : b));
  };

  /** Bài của em làm hoàn toàn ra giấy khác: mở bài trống rồi nhập tay. */
  const themBaiGiayKhac = () => {
    setBai(ds => [...ds, { ten: '', trang: [], suaTay: {} }]);
    setMoBai(bai.length);
  };

  const doiTenBai = (iBai: number, ten: string) =>
    setBai(ds => ds.map((b, i) => i === iBai ? { ...b, ten } : b));

  const xoaBai = (iBai: number) => {
    setBai(ds => ds.filter((_, i) => i !== iBai));
    setMoBai(null);
  };

  const doiSuaTay = (iBai: number, ma: string, giaTri: string) => {
    setBai(ds => ds.map((b, i) => i === iBai
      ? { ...b, suaTay: { ...b.suaTay, [ma]: giaTri === '' ? null : giaTri } }
      : b));
  };

  /* ---------- Giao diện ---------- */

  if (dangNap) {
    return <div className="p-10 flex items-center gap-3 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" /> Đang nạp danh sách bộ đề…
    </div>;
  }

  const baiDangMo = moBai !== null ? bai[moBai] : null;

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ScanLine className="w-7 h-7 text-teal-600" />
        <div>
          <h1 className="text-2xl font-black text-slate-800">Chấm bài quét ảnh</h1>
          <p className="text-sm text-slate-500">
            Nạp ảnh phiếu trả lời, máy đọc lưới tô tròn và chấm phần trắc nghiệm.
            Không tốn khoá A.I.
          </p>
        </div>
      </div>

      {/* Bước 1: chọn bộ đề */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <label className="block font-bold text-slate-700 mb-2">1. Chọn bộ đề đã chốt</label>
        <select
          value={boDeId}
          onChange={e => { setBoDeId(e.target.value); setBai([]); setMoBai(null); }}
          className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-medium"
        >
          <option value="">— Chọn bộ đề —</option>
          {dsBoDe.map(b => (
            <option key={b.id} value={b.id}>
              {b.ten} · {b.so_cau} câu · {soDiemVN(Number(b.tong_diem) || 0)} điểm
            </option>
          ))}
        </select>
        {dangTaiDe && (
          <p className="mt-2 text-[13px] text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải nội dung bộ đề…
          </p>
        )}
        {boDe && !dangTaiDe && (
          <p className="mt-2 text-[13px] text-slate-600">
            Phiếu của đề này có <b>{cacTrang.length} trang lưới</b> ·{' '}
            {phanCham.map(p => `${p.ma} ${p.cauHoi.length} câu × ${soDiemVN(p.diemMoiCau)}đ`).join(' · ')}
          </p>
        )}
      </div>

      {/* Bước 2: nạp ảnh */}
      <div
        onDragOver={e => { e.preventDefault(); setKeo(true); }}
        onDragLeave={() => setKeo(false)}
        onDrop={e => { e.preventDefault(); setKeo(false); napTep([...e.dataTransfer.files]); }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center mb-5 transition-colors ${
          keo ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white'}`}
      >
        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="font-bold text-slate-700">2. Kéo ảnh phiếu vào đây</p>
        <p className="text-[13px] text-slate-500 mb-3">
          Ảnh chụp điện thoại hoặc tệp PDF nhiều trang đều được. Chụp thấy trọn bốn góc lưới.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white
                          font-bold cursor-pointer hover:bg-teal-700">
          <FileImage className="w-4 h-4" /> Chọn tệp
          <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                 onChange={e => { napTep([...(e.target.files || [])]); e.target.value = ''; }} />
        </label>
        {dangDoc && (
          <p className="mt-3 text-teal-700 font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> {dangDoc}
          </p>
        )}

        {/* Em nào làm hẳn ra giấy khác thì chẳng có ảnh phiếu nào để nạp - nút phải nằm
            ngay đây, chứ giấu trong bảng soát thì chưa nạp ảnh là không thấy. */}
        {boDe && !dangDoc && (
          <p className="mt-4 text-[13px] text-slate-500">
            Em nào làm bài trên giấy khác, không dùng phiếu?{' '}
            <button onClick={themBaiGiayKhac}
                    className="font-bold text-teal-700 hover:text-teal-900 underline">
              Mở một bài trống rồi nhập tay
            </button>
          </p>
        )}
      </div>

      {/* Khay tờ chưa gán - máy KHÔNG tự nhét vào bài nào */}
      {khay.length > 0 && !baiDangMo && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-5">
          <div className="font-black text-amber-900 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {khay.length} tờ chưa gán được vào bài nào
          </div>
          <p className="text-[13px] text-amber-800 mb-3">
            Máy không đoán tờ này của ai. Thường là giấy làm thêm, tờ phụ tự luận, hoặc ảnh
            chụp thiếu mất góc có mã QR. Thầy cô gán vào bài, hoặc mở bài mới từ tờ ấy.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {khay.map((to, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={to.anhUrl} alt={to.tenTep} className="w-full h-28 object-cover object-top" />
                <div className="p-2">
                  <p className="text-[11px] text-slate-500 truncate" title={to.loi || to.tenTep}>
                    {to.loi || to.tenTep}
                  </p>
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (!e.target.value) return;
                      ganToVaoBai(i, e.target.value === 'moi' ? 'moi' : Number(e.target.value));
                    }}
                    className="mt-1.5 w-full border border-slate-300 rounded-lg px-1.5 py-1 text-[12px] font-bold"
                  >
                    <option value="">Gán vào…</option>
                    <option value="moi">+ Bài mới</option>
                    {bai.map((b, k) => (
                      <option key={k} value={k}>{b.ten || `Bài ${k + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bước 3: bảng soát */}
      {(bai.length > 0 || khay.length > 0) && !baiDangMo && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-black text-slate-800">3. Bảng soát — {bai.length} bài</span>
            <div className="flex items-center gap-3">
              {/* Em nào làm hẳn ra giấy khác thì mở bài trống rồi nhập tay đáp án. */}
              <button onClick={themBaiGiayKhac}
                      className="text-[13px] font-bold text-teal-700 hover:text-teal-900
                                 bg-teal-50 px-3 py-1.5 rounded-lg">
                + Bài làm trên giấy khác
              </button>
              <button onClick={() => { setBai([]); setKhay([]); setMoBai(null); }}
                      className="text-[13px] font-bold text-slate-400 hover:text-rose-600">
                Xoá hết, quét lại
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-2 font-bold">Bài</th>
                <th className="text-left px-3 py-2 font-bold">Trang ảnh</th>
                <th className="text-right px-3 py-2 font-bold">Điểm trắc nghiệm</th>
                <th className="text-center px-3 py-2 font-bold">Cần Thầy cô nhìn</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {bai.map((b, i) => {
                const kq = chamBai(b);
                const hongTrang = b.trang.filter(t => t.loi).length;
                return (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <input
                        value={b.ten}
                        onChange={e => doiTenBai(i, e.target.value)}
                        placeholder={`Bài ${i + 1}`}
                        title="Ghi tên em để sau này dò lại cho nhanh"
                        className="w-36 border border-transparent hover:border-slate-300 focus:border-slate-400
                                   rounded-md px-2 py-1 font-bold text-slate-700 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {b.trang.length === 0
                        ? <span className="italic">chưa có tờ nào - làm trên giấy khác</span>
                        : b.trang.map((t, k) => (
                            <span key={k} className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[12px] ${
                              t.vai === 'luoi' ? 'bg-emerald-50 text-emerald-700'
                              : t.vai === 'luoiHong' ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'}`} title={t.loi || TEN_VAI[t.vai]}>
                              {t.trang > 0 ? `tr.${t.trang}` : 'tờ rời'} · {TEN_VAI[t.vai]}
                            </span>
                          ))}
                      {hongTrang > 0 && (
                        <span className="ml-1 text-rose-600 font-bold">— phải nhập tay</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-slate-800 tabular-nums">
                      {soDiemVN(kq.diem)} / {soDiemVN(kq.diemToiDa)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {kq.soCauVuong === 0
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                        : <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg">
                            {kq.soCauVuong} câu
                          </span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setMoBai(i)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold
                                         text-[13px] text-slate-600 hover:bg-white">
                        Xem & sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-5 py-3 text-[12.5px] text-slate-500 border-t border-slate-100">
            Bản này chưa ghi điểm vào sổ - đang là bước soát. Việc chốt điểm làm ở đợt sau.
          </p>
        </div>
      )}

      {/* Xem chi tiết một bài */}
      {baiDangMo && moBai !== null && (
        <ChiTietBai
          bai={baiDangMo}
          kq={chamBai(baiDangMo)}
          ten={baiDangMo.ten || `Bài ${moBai + 1}`}
          onDong={() => setMoBai(null)}
          onSua={(ma, v) => doiSuaTay(moBai, ma, v)}
          onXoa={() => { if (confirm('Bỏ hẳn bài này khỏi danh sách?')) xoaBai(moBai); }}
        />
      )}
    </div>
  );
}

/* ===================== CHI TIẾT MỘT BÀI ===================== */

const LUA_CHON: Record<string, string[]> = {
  NLC: ['A', 'B', 'C', 'D'],
  DS: ['Đ', 'S'],
};

function ChiTietBai({ bai, kq, ten, onDong, onSua, onXoa }: {
  bai: BaiQuet; kq: KetQuaChamPhieu; ten: string;
  onDong: () => void; onSua: (ma: string, v: string) => void; onXoa: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
        <button onClick={onDong} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-black text-slate-800">{ten}</span>
        <span className="ml-auto font-black text-teal-700">
          {soDiemVN(kq.diem)} / {soDiemVN(kq.diemToiDa)} điểm
        </span>
        <button onClick={onXoa} title="Bỏ bài này"
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {bai.trang.length === 0 && (
        <p className="mx-5 mt-4 text-[13px] text-slate-600 bg-slate-50 border border-slate-200
                      rounded-xl px-3 py-2">
          Bài này chưa gắn tờ ảnh nào - dành cho em làm hẳn ra giấy khác. Nhập tay đáp án ở
          cột bên phải; muốn đính ảnh giấy của em thì gán tờ từ khay &quot;chưa gán&quot;.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
        {/* Ảnh gốc để soi bằng mắt */}
        <div className="space-y-3">
          {bai.trang.map((t, i) => (
            <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 text-[12.5px] font-bold text-slate-600
                              flex items-center gap-2">
                Trang {t.trang}{t.tuQR ? '' : ' (đoán theo thứ tự nạp)'}
                {t.loi && <span className="text-rose-600 font-bold">· {t.loi}</span>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.anhUrl} alt={t.tenTep} className="w-full" />
            </div>
          ))}
        </div>

        {/* Từng câu: máy đọc ra gì, sửa tay được ngay */}
        <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
          {kq.cau.map(c => (
            <div key={c.ma}
                 className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-sm ${
                   c.diem === null ? 'bg-amber-50 border-amber-300'
                   : c.diem === c.diemToiDa ? 'bg-emerald-50/60 border-emerald-200'
                   : c.diem === 0 ? 'bg-rose-50/60 border-rose-200'
                   : 'bg-sky-50/60 border-sky-200'}`}>
              <span className="font-bold text-slate-700 w-24 shrink-0">
                {c.loai === 'NLC' ? 'Câu' : c.loai === 'DS' ? 'Đ/S câu' : 'TLN câu'} {c.cau}
              </span>

              {c.loai === 'DS' ? (
                /* Đúng/Sai chấm theo TỪNG Ý, nên phải sửa được từng ý một. Bản trước gộp
                   cả câu vào một ô nên Thầy cô sửa xong mà điểm không nhúc nhích: giao
                   diện ghi vào khoá "DS:2" trong khi bộ chấm đọc "DS:2:a". */
                <span className="flex items-center gap-1">
                  {['a', 'b', 'c', 'd'].map((y, k) => {
                    const dang = (c.hocSinh ?? '····')[k];
                    return (
                      <span key={y} className="flex items-center">
                        <span className="text-[11px] text-slate-400 mr-0.5">{y})</span>
                        <select
                          value={dang === 'Đ' || dang === 'S' ? dang : ''}
                          onChange={e => onSua(`${c.ma}:${y}`, e.target.value)}
                          className="border border-slate-300 rounded-md px-1 py-0.5 text-[12.5px] font-bold"
                        >
                          <option value="">·</option>
                          <option value="Đ">Đ</option>
                          <option value="S">S</option>
                        </select>
                      </span>
                    );
                  })}
                </span>
              ) : LUA_CHON[c.loai] ? (
                <select
                  value={c.hocSinh ?? ''}
                  onChange={e => onSua(c.ma, e.target.value)}
                  className="border border-slate-300 rounded-md px-2 py-0.5 text-[13px] font-bold"
                >
                  <option value="">(bỏ trống)</option>
                  {LUA_CHON[c.loai].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              ) : (
                <input
                  value={c.hocSinh ?? ''}
                  onChange={e => onSua(c.ma, e.target.value)}
                  placeholder="(bỏ trống)"
                  className="border border-slate-300 rounded-md px-2 py-0.5 text-[13px] font-bold w-24"
                />
              )}

              <span className="text-slate-400 text-[12.5px]">đáp án</span>
              <span className="font-bold text-slate-700">{c.dapAn || '—'}</span>

              <span className="ml-auto font-black tabular-nums text-slate-800">
                {c.diem === null ? '—' : soDiemVN(c.diem)}
              </span>
              {c.vuong && (
                <span title={c.vuong}><AlertTriangle className="w-4 h-4 text-amber-600" /></span>
              )}
            </div>
          ))}
          {kq.cau.some(c => c.vuong) && (
            <p className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200
                          rounded-lg px-3 py-2 mt-2">
              Câu tô vàng là chỗ máy KHÔNG DÁM đọc - rê chuột vào dấu tam giác để xem vì sao.
              Sửa tay ở ô bên trái thì điểm tự tính lại.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
