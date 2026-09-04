"use client";

import React from "react";
import { X, Loader2, Save, ArrowRight, AlertCircle, Code2, Eye, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cacChoDoi, type BanVa } from "@/utils/suaLoiKiemThu";
import type { CauDeSoat } from "@/utils/kiemThuDe";
import { MathRenderer } from "@/components/MathRenderer";

export interface MucSuaHangLoat {
  cau: CauDeSoat;
  /** Bản vá đã GỘP của mọi lỗi cùng trỏ vào câu này. */
  va: BanVa;
  ghiChu: string[];
  /** Những lỗi đã sinh ra bản vá này, để thầy cô biết đang sửa cái gì. */
  moTa: string[];
}

/**
 * Duyệt một LOẠT bản sửa trước khi ghi vào ngân hàng câu hỏi.
 *
 * Vẫn giữ nguyên luật của bản sửa từng câu: máy không bao giờ tự ghi, phải gật đầu mới
 * lưu. Chỉ khác là gật một lần cho nhiều câu, và bỏ tick được câu nào thấy chưa ổn.
 *
 * Mặc định hiện CÔNG THỨC đã dựng chứ không phải mã LaTeX - soát nội dung toán mà nhìn
 * "$\\frac{7\\pi}{18}$" thì không kiểm được nhanh. Vẫn có nút xem mã nguồn cho những lỗi
 * nằm ngay ở mã, ví dụ lời giải dồn một dòng thì chỗ khác nhau chính là dấu xuống dòng.
 */
export default function SuaHangLoatModal({
  ds, onDong, onDaLuu,
}: {
  ds: MucSuaHangLoat[];
  onDong: () => void;
  onDaLuu: (cauId: string, va: BanVa) => void;
}) {
  const [hienMa, setHienMa] = React.useState(false);
  const [dangLuu, setDangLuu] = React.useState(false);
  const [tienDo, setTienDo] = React.useState(0);
  const [loi, setLoi] = React.useState('');
  const [xong, setXong] = React.useState<string[]>([]);
  /* Mặc định tick hết - thầy cô bỏ tick câu nào thấy chưa ổn. */
  const [chon, setChon] = React.useState<Set<string>>(
    () => new Set(ds.map(m => m.cau.id).filter(Boolean) as string[]));

  if (ds.length === 0) return null;
  const dsChon = ds.filter(m => m.cau.id && chon.has(m.cau.id) && !xong.includes(m.cau.id));

  const doiTick = (id: string) =>
    setChon(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const luuHet = async () => {
    setDangLuu(true); setLoi(''); setTienDo(0);
    const supabase = createClient();
    const daXong: string[] = [];
    const hong: string[] = [];
    for (let i = 0; i < dsChon.length; i++) {
      const m = dsChon[i];
      try {
        const { error } = await supabase.from('questions').update(m.va).eq('id', m.cau.id!);
        if (error) throw error;
        onDaLuu(m.cau.id!, m.va);
        daXong.push(m.cau.id!);
      } catch (e: any) {
        hong.push(`${m.moTa[0] || m.cau.id}: ${e?.message || 'lỗi không rõ'}`);
      }
      setTienDo(i + 1);
      setXong([...daXong]);
    }
    setDangLuu(false);
    if (hong.length) setLoi(`${hong.length} câu không lưu được — ${hong[0]}`);
    else onDong();
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4" onClick={onDong}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-black text-gray-800">Xem lại {ds.length} chỗ sửa trước khi lưu</div>
            <div className="text-[12.5px] text-gray-500 mt-0.5">
              Bỏ tick câu nào thấy chưa ổn. Chỉ những câu còn tick mới được ghi vào ngân hàng.
            </div>
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {ds.map((m, idx) => {
            const id = m.cau.id || String(idx);
            const daLuu = xong.includes(id);
            const dangTick = !!m.cau.id && chon.has(m.cau.id);
            return (
              <div key={id}
                   className={`rounded-xl border p-3 ${daLuu ? 'border-emerald-300 bg-emerald-50/40'
                     : dangTick ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                <div className="flex items-start gap-2.5 mb-2">
                  <input
                    type="checkbox"
                    checked={dangTick}
                    disabled={daLuu || dangLuu || !m.cau.id}
                    onChange={() => m.cau.id && doiTick(m.cau.id)}
                    className="mt-1 w-4 h-4 accent-emerald-600 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    {m.moTa.map((x, i) => (
                      <div key={i} className="text-[12.5px] font-semibold text-slate-700">• {x}</div>
                    ))}
                    {m.ghiChu.map((g, i) => (
                      <div key={`g${i}`} className="text-[12px] text-amber-800 mt-0.5">⚠ {g}</div>
                    ))}
                  </div>
                  {daLuu && (
                    <span className="shrink-0 text-[11.5px] font-black text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu
                    </span>
                  )}
                </div>

                {cacChoDoi(m.cau, m.va).map(d => (
                  <div key={d.truong} className="mt-2">
                    <div className="text-[11.5px] font-black text-slate-600 mb-1">{d.ten}</div>
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                      <O nhan="Hiện tại" chu={d.cu} mau="cu" hienMa={hienMa} />
                      <div className="hidden sm:flex items-center text-slate-300 shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <O nhan="Sau khi sửa" chu={d.moi} mau="moi" hienMa={hienMa} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {loi && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {loi}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
          <span className="text-[11.5px] text-gray-400 flex-1 min-w-0">
            Lưu là ghi đè những câu này trong Ngân hàng câu hỏi, mọi đề dùng lại câu ấy về sau đều theo bản mới.
          </span>
          <button onClick={onDong} disabled={dangLuu}
                  className="px-4 py-2 rounded-xl font-bold text-[13px] border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Thôi, giữ nguyên
          </button>
          <button onClick={luuHet} disabled={dangLuu || dsChon.length === 0}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-[13px]
                             flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
            {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {dangLuu ? `Đang lưu ${tienDo}/${dsChon.length}...` : `Lưu ${dsChon.length} câu vào ngân hàng`}
          </button>
        </div>
      </div>
    </div>
  );
}

function O({ nhan, chu, mau, hienMa }: { nhan: string; chu: string; mau: 'cu' | 'moi'; hienMa: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <div className={`text-[10.5px] font-black uppercase tracking-wide mb-1 ${
        mau === 'cu' ? 'text-rose-500' : 'text-emerald-600'}`}>{nhan}</div>
      <div className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] break-words max-h-40 overflow-y-auto ${
        hienMa ? 'whitespace-pre-wrap font-mono text-[11.5px]' : ''} ${
        mau === 'cu' ? 'bg-rose-50/60 border-rose-200 text-slate-700'
                     : 'bg-emerald-50/60 border-emerald-200 text-slate-800'}`}>
        {!chu ? <span className="italic text-slate-400">(trống)</span>
              : hienMa ? chu
              : <MathRenderer htmlContent={chu} />}
      </div>
    </div>
  );
}
