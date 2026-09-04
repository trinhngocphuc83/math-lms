"use client";

import React from "react";
import { X, Loader2, Save, ArrowRight, AlertCircle, Code2, Eye } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { createClient } from "@/utils/supabase/client";
import { cacChoDoi, type BanVa } from "@/utils/suaLoiKiemThu";
import type { CauDeSoat } from "@/utils/kiemThuDe";

/**
 * Bảng SO SÁNH TRƯỚC / SAU của một lần sửa, và nút lưu vào ngân hàng.
 *
 * Không bao giờ ghi thẳng: sai một câu trong kho là sai mãi về sau, nên bản vá phải bày
 * ra cho Thầy cô soi từng chỗ đổi rồi mới có nút lưu. Lưu xong thì báo ngược cho màn
 * kiểm thử để nó cập nhật câu đang cầm trên tay, khỏi phải tải lại cả trang.
 */

/**
 * Một ô trong bảng so sánh trước/sau.
 *
 * Mặc định HIỆN CÔNG THỨC đã dựng, không phải mã nguồn LaTeX: thầy cô soát bản sửa là
 * soát nội dung toán, mà nhìn "$\frac{7\pi}{18}$" thì không ai kiểm được nhanh. Vẫn
 * giữ nút xem mã nguồn, vì có những lỗi nằm ngay ở mã - ví dụ lời giải dồn một dòng thì
 * chỗ khác nhau chính là dấu xuống dòng, dựng ra công thức lại không thấy.
 */
function KhungChu({ nhan, chu, mau, hienMa }: { nhan: string; chu: string; mau: 'cu' | 'moi'; hienMa: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <div className={`text-[11px] font-black uppercase tracking-wide mb-1 ${
        mau === 'cu' ? 'text-rose-500' : 'text-emerald-600'}`}>{nhan}</div>
      <div className={`rounded-xl border px-3 py-2 text-[13px] break-words max-h-52 overflow-y-auto ${
        hienMa ? 'whitespace-pre-wrap font-mono text-[12px]' : ''} ${
        mau === 'cu' ? 'bg-rose-50/60 border-rose-200 text-slate-700'
                     : 'bg-emerald-50/60 border-emerald-200 text-slate-800'}`}>
        {!chu ? <span className="italic text-slate-400">(trống)</span>
              : hienMa ? chu
              : <MathRenderer htmlContent={chu} />}
      </div>
    </div>
  );
}

export default function SuaLoiModal({
  cau, va, moTaLoi, ghiChu = [], onDong, onDaLuu,
}: {
  cau: CauDeSoat | null;
  va: BanVa | null;
  moTaLoi: string;
  ghiChu?: string[];
  onDong: () => void;
  onDaLuu: (cauId: string, va: BanVa) => void;
}) {
  const [dangLuu, setDangLuu] = React.useState(false);
  /* Mặc định hiện công thức đã dựng; bật sang mã nguồn khi cần soi đúng chỗ LaTeX. */
  const [hienMa, setHienMa] = React.useState(false);
  const [loi, setLoi] = React.useState('');

  if (!cau || !va) return null;
  const choDoi = cacChoDoi(cau, va);

  const luu = async () => {
    if (!cau.id) { setLoi('Câu này chưa có trong ngân hàng nên không lưu được.'); return; }
    setDangLuu(true); setLoi('');
    try {
      const supabase = createClient();
      const { error } = await supabase.from('questions').update(va).eq('id', cau.id);
      if (error) throw error;
      onDaLuu(cau.id, va);
      onDong();
    } catch (e: any) {
      setLoi('Không lưu được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4" onClick={onDong}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-black text-gray-800">Xem lại trước khi lưu</div>
            <div className="text-[12.5px] text-gray-500 mt-0.5">{moTaLoi}</div>
          </div>
          <button
            onClick={() => setHienMa(v => !v)}
            title={hienMa ? 'Xem công thức đã dựng' : 'Xem mã nguồn LaTeX'}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300
                       text-gray-600 text-[12px] font-bold hover:bg-gray-50">
            {hienMa ? <><Eye className="w-3.5 h-3.5" /> Xem công thức</>
                    : <><Code2 className="w-3.5 h-3.5" /> Xem mã nguồn</>}
          </button>
          <button onClick={onDong} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Máy làm tròn hay chuyển đơn vị thì phải nói rõ, không được lặng lẽ đổi số. */}
        {ghiChu.length > 0 && (
          <div className="mx-5 mt-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
            {ghiChu.map((g, i) => (
              <div key={i} className="text-[12.5px] font-semibold text-amber-900">• {g}</div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {choDoi.map(d => (
            <div key={d.truong}>
              <div className="text-[12.5px] font-black text-slate-700 mb-1.5">{d.ten}</div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <KhungChu nhan="Hiện tại" chu={d.cu} mau="cu" hienMa={hienMa} />
                <div className="hidden sm:flex items-center text-slate-300 shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <KhungChu nhan="Sau khi sửa" chu={d.moi} mau="moi" hienMa={hienMa} />
              </div>
            </div>
          ))}
          {choDoi.length === 0 && (
            <p className="p-8 text-center text-slate-400 text-sm">Không có chỗ nào thay đổi.</p>
          )}
        </div>

        {loi && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {loi}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
          <span className="text-[11.5px] text-gray-400 flex-1 min-w-0">
            Lưu là ghi đè câu này trong Ngân hàng câu hỏi, mọi đề dùng lại câu ấy về sau đều theo bản mới.
          </span>
          <button onClick={onDong}
                  className="px-4 py-2 rounded-xl font-bold text-[13px] border border-gray-300 text-gray-600 hover:bg-gray-50">
            Thôi, giữ nguyên
          </button>
          <button onClick={luu} disabled={dangLuu || choDoi.length === 0}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-[13px]
                             flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
            {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu vào ngân hàng
          </button>
        </div>
      </div>
    </div>
  );
}
