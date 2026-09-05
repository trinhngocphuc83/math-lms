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

/** Một trang ảnh đã đọc xong. */
interface TrangDaDoc {
  tenTep: string;
  anhUrl: string;
  /** Trang thứ mấy của phiếu, đọc từ mã QR; không đọc được thì đoán theo thứ tự nạp. */
  trang: number;
  tuQR: boolean;
  doc?: KetQuaDocPhieu;
  loi?: string;
}

/** Một bài - gom các trang của cùng một học sinh. */
interface BaiQuet {
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

        /* Không đọc được QR thì đoán theo thứ tự nạp - vẫn đọc được lưới, chỉ là Thầy cô
           phải tự soát xem có xếp đúng trang không. */
        const trang = qr?.trang ?? ((daDoc.length % Math.max(1, cacTrang.length)) + 1);
        const luoi = cacTrang.find(t => t.trang === trang);

        if (qr && qr.boDeId !== boDe.id) {
          daDoc.push({ tenTep: anhTep[i].name, anhUrl: url, trang, tuQR: true,
            loi: 'Tờ này là phiếu của một bộ đề KHÁC - đã để riêng ra.' });
          continue;
        }
        if (!luoi) {
          daDoc.push({ tenTep: anhTep[i].name, anhUrl: url, trang, tuQR: !!qr,
            loi: `Phiếu của đề này chỉ có ${cacTrang.length} trang, không có trang ${trang}.` });
          continue;
        }
        const kq = docPhieuQuet(anh, luoi);
        daDoc.push({
          tenTep: anhTep[i].name, anhUrl: url, trang, tuQR: !!qr,
          doc: kq, loi: kq.timDuocNeo ? undefined : kq.loi,
        });
      }

      /* Gom trang thành bài: gặp trang 1 là mở một bài mới. */
      const raBai: BaiQuet[] = [];
      for (const t of daDoc) {
        if (t.trang === 1 || raBai.length === 0) raBai.push({ trang: [], suaTay: {} });
        raBai[raBai.length - 1].trang.push(t);
      }
      setBai(b => [...b, ...raBai]);
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
      </div>

      {/* Bước 3: bảng soát */}
      {bai.length > 0 && !baiDangMo && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-black text-slate-800">3. Bảng soát — {bai.length} bài</span>
            <button onClick={() => { setBai([]); setMoBai(null); }}
                    className="text-[13px] font-bold text-slate-400 hover:text-rose-600">
              Xoá hết, quét lại
            </button>
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
                    <td className="px-5 py-2.5 font-bold text-slate-700">Bài {i + 1}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {b.trang.map(t => `tr.${t.trang}${t.tuQR ? '' : '?'}`).join(' · ')}
                      {hongTrang > 0 && (
                        <span className="ml-2 text-rose-600 font-bold">{hongTrang} tờ không đọc được</span>
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
          ten={`Bài ${moBai + 1}`}
          onDong={() => setMoBai(null)}
          onSua={(ma, v) => doiSuaTay(moBai, ma, v)}
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

function ChiTietBai({ bai, kq, ten, onDong, onSua }: {
  bai: BaiQuet; kq: KetQuaChamPhieu; ten: string;
  onDong: () => void; onSua: (ma: string, v: string) => void;
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
      </div>

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

              {LUA_CHON[c.loai] && c.loai !== 'DS' ? (
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
