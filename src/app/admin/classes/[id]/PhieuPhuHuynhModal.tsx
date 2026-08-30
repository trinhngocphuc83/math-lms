"use client";

import React, { useRef } from "react";
import { X, Loader2, ImageIcon, Images, FileSpreadsheet, Trophy, TrendingUp } from "lucide-react";
import { captureElement, downloadOrShare } from "@/utils/imageExport";
import { layChiTietThang, type BangVinhDanh, type DongVinhDanh } from "@/app/actions/goiTenVaDiem";

/**
 * Phiếu điểm thưởng gửi riêng từng phụ huynh.
 *
 * Trang trí và xuất ẢNH giống hệt phần Báo điểm - vì phụ huynh nhận qua Zalo, một tấm ảnh
 * mở ra là thấy ngay, không phải tải tệp Excel về rồi mở bằng ứng dụng khác.
 * Excel giữ lại cho Thầy cô lưu hồ sơ cả lớp.
 */

const TEN_NGUON: Record<string, { ten: string; mau: string }> = {
  tuong_tac:  { ten: 'Phát biểu trên lớp', mau: 'bg-violet-100 text-violet-700' },
  kiem_tra:   { ten: 'Bài kiểm tra',       mau: 'bg-rose-100 text-rose-700' },
  luyen_tap:  { ten: 'Bài luyện tập',      mau: 'bg-teal-100 text-teal-700' },
  thi_online: { ten: 'Thi online',         mau: 'bg-sky-100 text-sky-700' },
  tien_bo:    { ten: 'Thưởng tiến bộ',     mau: 'bg-amber-100 text-amber-700' },
};

type DongChiTiet = { diem: number; nguon: string; ly_do: string; luc: string };

export default function PhieuPhuHuynhModal({
  isOpen, onClose, classId, classInfo, thang, bang,
}: {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  classInfo: any;
  thang: string;
  bang: BangVinhDanh | null;
}) {
  const [chiTiet, setChiTiet] = React.useState<Record<string, DongChiTiet[]>>({});
  const [dangTai, setDangTai] = React.useState(false);
  const [emId, setEmId] = React.useState('');
  const [dangLam, setDangLam] = React.useState('');
  const [tienDo, setTienDo] = React.useState('');
  const khung = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen || !classId) return;
    setDangTai(true);
    layChiTietThang(classId, thang)
      .then(d => {
        setChiTiet(d);
        const dau = bang?.theoTong?.[0]?.hs.id || '';
        setEmId(v => v || dau);
      })
      .catch(() => { /* lỗi thì bảng rỗng, không vỡ giao diện */ })
      .finally(() => setDangTai(false));
  }, [isOpen, classId, thang, bang]);

  React.useEffect(() => {
    if (!isOpen) return;
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ds = bang?.theoTong || [];
  const em = ds.find(d => d.hs.id === emId) || ds[0] || null;
  const hang = em ? ds.findIndex(d => d.hs.id === em.hs.id) + 1 : 0;

  const tenTep = (ten: string) =>
    `Phieu_diem_${ten.replace(/\s+/g, '_')}_${thang}.png`;

  const xuatMotEm = async () => {
    if (!khung.current || !em) return;
    setDangLam('mot');
    try {
      const url = await captureElement(khung.current, { width: 900 });
      await downloadOrShare(url, tenTep(em.hs.ten));
    } catch (e: any) {
      alert('Không xuất được ảnh: ' + (e?.message || ''));
    }
    setDangLam('');
  };

  /**
   * Xuất ảnh cả lớp: đổi sang từng em, chờ vẽ xong rồi mới chụp.
   * Phải chờ thật vì ảnh chụp lấy đúng những gì đang hiện trên màn hình.
   */
  const xuatCaLop = async () => {
    if (ds.length === 0) return;
    setDangLam('calop');
    const nho = emId;
    for (let i = 0; i < ds.length; i++) {
      setEmId(ds[i].hs.id);
      setTienDo(`${i + 1}/${ds.length} — ${ds[i].hs.ten}`);
      await new Promise(x => setTimeout(x, 450));   // chờ vẽ lại
      try {
        if (khung.current) {
          const url = await captureElement(khung.current, { width: 900 });
          await downloadOrShare(url, tenTep(ds[i].hs.ten));
        }
      } catch { /* em này hỏng thì bỏ qua, đừng dừng cả lượt */ }
      await new Promise(x => setTimeout(x, 350));   // giãn ra cho trình duyệt kịp tải
    }
    setEmId(nho); setTienDo(''); setDangLam('');
  };

  const xuatExcel = async () => {
    setDangLam('excel');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      for (const d of ds) {
        const ws = wb.addWorksheet(d.hs.ten.slice(0, 30).replace(/[\\/*?:[\]]/g, ' '));
        ws.columns = [
          { header: 'Ngày', key: 'ngay', width: 12 },
          { header: 'Nội dung', key: 'noi', width: 46 },
          { header: 'Loại', key: 'loai', width: 20 },
          { header: 'Điểm', key: 'diem', width: 8 },
        ];
        ws.getRow(1).font = { bold: true };
        for (const r of chiTiet[d.hs.id] || []) {
          ws.addRow({
            ngay: new Date(r.luc).toLocaleDateString('vi-VN'),
            noi: r.ly_do || TEN_NGUON[r.nguon]?.ten || r.nguon,
            loai: TEN_NGUON[r.nguon]?.ten || r.nguon,
            diem: r.diem,
          });
        }
        const t = ws.addRow({ noi: 'TỔNG ĐIỂM THÁNG', diem: d.tong });
        t.font = { bold: true };
        if (bang?.coThangTruoc) {
          ws.addRow({ noi: 'Tháng trước', diem: d.truoc });
          const x = ws.addRow({ noi: 'Mức tiến bộ', diem: d.tang });
          x.font = { bold: true };
        }
      }
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Phieu_phu_huynh_${classInfo?.name || 'Lop'}_${thang}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      alert('Không xuất được Excel: ' + (e?.message || ''));
    }
    setDangLam('');
  };

  const dong = em ? (chiTiet[em.hs.id] || []) : [];
  const tenThang = thang.split('-').reverse().join('/');

  return (
    <div className="fixed inset-0 z-[125] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-3 overflow-y-auto"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-[940px] rounded-2xl shadow-2xl my-6 overflow-hidden">

        {/* Thanh công cụ */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-black text-gray-800 mr-1">Phiếu điểm gửi phụ huynh</h2>

          <select value={emId} onChange={e => setEmId(e.target.value)} disabled={!!dangLam}
                  className="px-3 py-2 border border-gray-200 rounded-xl font-bold text-gray-700 bg-white outline-none focus:border-teal-500 max-w-[230px]">
            {ds.map(d => <option key={d.hs.id} value={d.hs.id}>{d.hs.ten}</option>)}
          </select>

          <button onClick={xuatMotEm} disabled={!!dangLam || !em}
                  className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 disabled:opacity-50">
            {dangLam === 'mot' ? <Loader2 size={17} className="animate-spin" /> : <ImageIcon size={17} />}
            Xuất ảnh em này
          </button>

          <button onClick={xuatCaLop} disabled={!!dangLam || ds.length === 0}
                  title="Lần lượt xuất ảnh phiếu của từng em trong lớp"
                  className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 disabled:opacity-50">
            {dangLam === 'calop' ? <Loader2 size={17} className="animate-spin" /> : <Images size={17} />}
            {dangLam === 'calop' ? tienDo : `Ảnh cả lớp (${ds.length})`}
          </button>

          <button onClick={xuatExcel} disabled={!!dangLam}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-50">
            {dangLam === 'excel' ? <Loader2 size={17} className="animate-spin" /> : <FileSpreadsheet size={17} />}
            Excel
          </button>

          <button onClick={onClose} className="ml-auto p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* PHIẾU - đây chính là vùng được chụp thành ảnh */}
        <div className="p-4 bg-gray-100">
          {dangTai ? (
            <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
          ) : !em ? (
            <p className="p-12 text-center text-gray-400">Lớp chưa có học sinh nào.</p>
          ) : (
            <div ref={khung} className="bg-white rounded-xl overflow-hidden">
              {/* Dải đầu phiếu */}
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex items-center gap-4">
                <img src="/logo.jpg" alt="Logo" className="h-14 w-14 object-cover rounded-xl bg-white shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-white/80 text-[12px] font-bold tracking-[0.2em] uppercase">
                    {classInfo?.name}
                  </div>
                  <div className="text-white text-[24px] font-black leading-tight">
                    PHIẾU ĐIỂM THƯỞNG THÁNG {tenThang}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white/70 text-[11px] font-bold">Ngày xuất</div>
                  <div className="text-white text-[15px] font-black">
                    {new Date().toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Tên em + tổng điểm */}
              <div className="px-6 py-5 flex items-center gap-5 border-b border-gray-100">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">Học sinh</div>
                  <div className="text-[28px] font-black text-gray-900 leading-tight break-words">{em.hs.ten}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                    <Trophy size={14} /> Hạng {hang}/{ds.length} của lớp
                  </div>
                </div>
                <div className="shrink-0 text-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white px-7 py-4">
                  <div className="text-[11.5px] font-bold text-teal-50">Điểm thưởng</div>
                  <div className="text-[46px] font-black leading-none">{em.tong}</div>
                </div>
              </div>

              {/* So với tháng trước */}
              {bang?.coThangTruoc && (
                <div className={`px-6 py-3 flex items-center gap-2 text-[14px] font-bold border-b border-gray-100 ${
                  em.tang > 0 ? 'bg-emerald-50 text-emerald-800'
                  : em.tang < 0 ? 'bg-rose-50 text-rose-700'
                  : 'bg-gray-50 text-gray-600'}`}>
                  <TrendingUp size={17} />
                  {em.tang > 0 && `Tiến bộ! Tăng ${em.tang} điểm so với tháng trước (${em.truoc} → ${em.tong}).`}
                  {em.tang === 0 && `Giữ nguyên như tháng trước (${em.truoc} điểm).`}
                  {em.tang < 0 && `Ít hơn tháng trước ${Math.abs(em.tang)} điểm (${em.truoc} → ${em.tong}).`}
                </div>
              )}

              {/* Bảng chi tiết */}
              <div className="px-6 py-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="p-2.5 border border-gray-200 font-bold text-center w-24 text-[13px]">Ngày</th>
                      <th className="p-2.5 border border-gray-200 font-bold text-[13px]">Nội dung</th>
                      <th className="p-2.5 border border-gray-200 font-bold text-center w-44 text-[13px]">Loại</th>
                      <th className="p-2.5 border border-gray-200 font-bold text-center w-20 text-[13px]">Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dong.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-400 border border-gray-200">
                          Tháng này em chưa có điểm thưởng nào.
                        </td>
                      </tr>
                    ) : dong.map((r, i) => {
                      const n = TEN_NGUON[r.nguon] || { ten: r.nguon, mau: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={i} className="even:bg-gray-50/60">
                          <td className="p-2.5 border border-gray-200 text-center text-[13px] text-gray-500">
                            {new Date(r.luc).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-2.5 border border-gray-200 text-[13.5px] font-medium text-gray-800">
                            {r.ly_do || n.ten}
                          </td>
                          <td className="p-2.5 border border-gray-200 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[12px] font-bold ${n.mau}`}>
                              {n.ten}
                            </span>
                          </td>
                          <td className={`p-2.5 border border-gray-200 text-center font-black text-[16px] ${
                            r.diem > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {r.diem > 0 ? '+' : ''}{r.diem}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Chân phiếu */}
              <div className="px-6 pb-5">
                <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-[12.5px] text-teal-900 leading-relaxed">
                  <b>Điểm thưởng được cộng từ:</b> phát biểu đúng khi được gọi trên lớp;
                  bài luyện tập và bài kiểm tra đạt từ 7 điểm trở lên (7 → 1đ, 8 → 2đ,
                  9 → 3đ, 10 → 4đ); và thưởng thêm khi bài sau tiến bộ hơn bài trước.
                  Điểm được tổng kết cuối tháng để khen thưởng những em tiến bộ.
                </div>
                <div className="mt-3 text-right text-[11px] text-gray-400 italic">
                  Phiếu được xuất tự động từ hệ thống — {classInfo?.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
