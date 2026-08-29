"use client";

import React from "react";
import { X, Loader2, Library, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { createClient } from "@/utils/supabase/client";
import { doTrung, type CongThucGon } from "@/utils/trungCongThuc";
import { rutCongThucCuoiBai, coMucCongThuc, dungPromptRutCongThuc, type CongThucRut } from "@/utils/congThucCuoiBai";
import { goiGeminiTrenTrinhDuyet, layCauHinhAI } from "@/utils/geminiBrowser";

/**
 * Đưa mục "📌 CÔNG THỨC CẦN NHỚ" của bài giảng vào Sổ tay công thức, bằng một nút.
 *
 * Trước đây soạn xong bài rồi lại phải sang trang Sổ tay gõ lại từng công thức. Nay đọc
 * thẳng mục cuối bài - vốn đã theo khuôn cố định - rồi thêm một lượt.
 *
 * Cái nào đã có trong kho thì ĐÁNH DẤU SẴN và bỏ tick, dùng chính cơ chế chống trùng toàn
 * kho (hiểu \\dfrac ≡ \\frac, bỏ \\left/\\right...) chứ không so chuỗi thô.
 */

interface CongThucDuyet extends CongThucRut {
  chon: boolean;
  trungVoi: CongThucGon | null;
  lyDoTrung: string | null;
}

export default function DayCongThucVaoSoTayModal({
  isOpen, onClose, noiDungBai, tenBai,
}: {
  isOpen: boolean;
  onClose: () => void;
  noiDungBai: string;
  tenBai?: string;
}) {
  const supabase = createClient();
  const [dangTai, setDangTai] = React.useState(false);
  const [dsCongThuc, setDsCongThuc] = React.useState<CongThucDuyet[]>([]);
  const [chuong, setChuong] = React.useState<any[]>([]);
  const [chuongDich, setChuongDich] = React.useState('');
  const [loi, setLoi] = React.useState('');
  const [dangLuu, setDangLuu] = React.useState(false);
  const [xong, setXong] = React.useState<number | null>(null);
  const [dangNhoAI, setDangNhoAI] = React.useState(false);

  /** Dò trùng cho một lô công thức vừa rút ra. */
  const chamTrung = async (ds: CongThucRut[]) => {
    const { data: kho } = await supabase.from('formulas').select('id, title, latex_content, category_id');
    return ds.map(c => {
      const kq = doTrung(c, kho || []);
      return {
        ...c,
        trungVoi: kq.trungVoi,
        lyDoTrung: kq.lyDo === 'latex' ? 'đã có công thức này' : kq.lyDo === 'ten' ? 'đã có tên này' : null,
        // Trùng thì bỏ tick sẵn - thêm nữa chỉ làm kho rối
        chon: !kq.trungVoi,
      };
    });
  };

  React.useEffect(() => {
    if (!isOpen) return;
    setXong(null); setLoi('');
    (async () => {
      setDangTai(true);
      try {
        const { data: dm } = await supabase.from('formula_categories').select('id, name, grade').order('name');
        setChuong(dm || []);
        if (dm && dm.length && !chuongDich) setChuongDich(dm[0].id);
        setDsCongThuc(await chamTrung(rutCongThucCuoiBai(noiDungBai)));
      } catch (e: any) {
        setLoi(e?.message || 'Không đọc được danh sách chương.');
      } finally {
        setDangTai(false);
      }
    })();
  }, [isOpen, noiDungBai]);

  if (!isOpen) return null;

  /** Bài chưa có mục cuối bài thì nhờ AI rút ra, vẫn theo đúng khuôn dòng đó. */
  const nhoAIRut = async () => {
    setDangNhoAI(true); setLoi('');
    try {
      const cauHinh = await layCauHinhAI();
      const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: dungPromptRutCongThuc(noiDungBai) }], { temperature: 0.2 });
      // Dùng lại đúng đường đọc của mục cuối bài, khỏi viết hai bộ đọc
      const ds = rutCongThucCuoiBai('## 📌 CÔNG THỨC CẦN NHỚ\n' + kq.text);
      if (ds.length === 0) throw new Error('AI không rút được công thức nào theo đúng khuôn.');
      setDsCongThuc(await chamTrung(ds));
    } catch (e: any) {
      setLoi(e?.message || 'Không gọi được AI.');
    } finally {
      setDangNhoAI(false);
    }
  };

  const soChon = dsCongThuc.filter(c => c.chon).length;

  const luu = async () => {
    const chon = dsCongThuc.filter(c => c.chon);
    if (chon.length === 0 || !chuongDich) return;
    setDangLuu(true);
    try {
      const { data, error } = await supabase.from('formulas').insert(
        chon.map(c => ({
          category_id: chuongDich,
          title: c.title,
          latex_content: c.latex_content,
          description: c.description || null,
        })),
      ).select('id');
      if (error) throw error;
      setXong((data || []).length);
    } catch (e: any) {
      setLoi(e?.message || 'Không lưu được.');
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-[820px] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center gap-2 px-4 py-3 border-b border-indigo-100 bg-indigo-50 shrink-0 rounded-t-2xl">
          <Library className="w-5 h-5 text-indigo-600 shrink-0" />
          <h2 className="text-[15px] font-black text-indigo-900">Đưa công thức của bài vào Sổ tay</h2>
          <button onClick={onClose} className="ml-auto p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {dangTai ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang đọc công thức trong bài...
            </div>
          ) : xong !== null ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-emerald-800">Đã thêm {xong} công thức vào Sổ tay.</p>
            </div>
          ) : dsCongThuc.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-[14px] font-bold text-gray-700">
                {coMucCongThuc(noiDungBai)
                  ? 'Bài có mục "CÔNG THỨC CẦN NHỚ" nhưng chưa dòng nào đúng khuôn.'
                  : 'Bài này chưa có mục "📌 CÔNG THỨC CẦN NHỚ" ở cuối.'}
              </p>
              <p className="text-[12.5px] text-gray-500 mt-1 mb-4">
                Khuôn mỗi dòng: <code className="bg-gray-100 px-1 rounded">- **Tên** | $công thức$ | dùng khi nào</code>
              </p>
              <button onClick={nhoAIRut} disabled={dangNhoAI}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-black px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 disabled:opacity-60">
                {dangNhoAI ? <><Loader2 className="w-4 h-4 animate-spin" /> AI đang đọc bài...</> : <><Sparkles className="w-4 h-4" /> Nhờ AI rút công thức từ bài</>}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[12.5px] font-bold text-gray-600">Thêm vào chương:</span>
                <select value={chuongDich} onChange={e => setChuongDich(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-[13px] bg-white max-w-[380px]">
                  {chuong.map(c => <option key={c.id} value={c.id}>{c.name}{c.grade ? ` (lớp ${c.grade})` : ''}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                {dsCongThuc.map((c, i) => (
                  <label key={i}
                         className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                           c.trungVoi ? 'border-amber-200 bg-amber-50/50' : c.chon ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200'
                         }`}>
                    <input type="checkbox" checked={c.chon} className="mt-1 shrink-0"
                           onChange={e => setDsCongThuc(p => p.map((x, k) => k === i ? { ...x, chon: e.target.checked } : x))} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-[13.5px] text-gray-800">{c.title}</span>
                        {c.trungVoi && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10.5px] font-bold">
                            {c.lyDoTrung} — "{c.trungVoi.title}"
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto text-[13px] mt-0.5"><BlockMath math={c.latex_content} /></div>
                      {c.description && <p className="text-[12px] text-gray-500">{c.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {loi && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold">{loi}</div>
          )}
        </div>

        {xong === null && dsCongThuc.length > 0 && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-2 bg-gray-50 rounded-b-2xl">
            <span className="text-[12.5px] text-gray-600">
              Chọn <b className="text-indigo-700">{soChon}</b>/{dsCongThuc.length} công thức
              {dsCongThuc.some(c => c.trungVoi) && ' (cái đã có trong kho đã bỏ tick sẵn)'}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">
                Để sau
              </button>
              <button onClick={luu} disabled={dangLuu || soChon === 0}
                      className="px-5 py-2 rounded-xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Library className="w-4 h-4" />}
                Thêm {soChon} công thức
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
