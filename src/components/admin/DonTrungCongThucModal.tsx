"use client";

import React from "react";
import { X, Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import type { NhomTrung, CongThucGon } from "@/utils/trungCongThuc";

/**
 * Dọn các công thức đã lỡ nhập trùng.
 *
 * Kho thật đang có 5 nhóm trùng (4 nhóm trùng công thức, 1 nhóm trùng tên), trong đó 3
 * nhóm nằm ở hai chương khác nhau nên bộ lọc cũ - vốn chỉ so trong chương đang mở - không
 * thể bắt được.
 *
 * KHÔNG tự xoá: bày từng nhóm ra cạnh nhau, Thầy cô chọn bản nào giữ rồi mới xoá. Đây là
 * cách đã dùng cho mọi lần dọn dữ liệu trước đây.
 */

export default function DonTrungCongThucModal({
  isOpen, onClose, nhomTrung, tenChuong, onXoa,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhomTrung: NhomTrung[];
  /** Tra tên chương từ category_id, để biết bản trùng nằm ở đâu. */
  tenChuong: (id?: string | null) => string;
  /** Xoá các id đã chọn. Trả về số dòng thật sự xoá được. */
  onXoa: (ids: string[]) => Promise<number>;
}) {
  /** Với mỗi nhóm, id của bản được GIỮ. Mặc định giữ bản đầu tiên. */
  const [banGiu, setBanGiu] = React.useState<Record<string, string>>({});
  const [dangXoa, setDangXoa] = React.useState(false);
  const [xong, setXong] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const md: Record<string, string> = {};
    nhomTrung.forEach(n => { if (n.cacBan[0]?.id) md[n.khoa] = n.cacBan[0].id!; });
    setBanGiu(md);
    setXong(null);
  }, [isOpen, nhomTrung]);

  if (!isOpen) return null;

  const idSeXoa = nhomTrung.flatMap(n =>
    n.cacBan.filter(c => c.id && c.id !== banGiu[n.khoa]).map(c => c.id!),
  );

  const xoa = async () => {
    if (idSeXoa.length === 0) return;
    if (!confirm(`Sẽ xoá ${idSeXoa.length} bản trùng, giữ lại ${nhomTrung.length} bản chính. Đồng ý?`)) return;
    setDangXoa(true);
    try {
      setXong(await onXoa(idSeXoa));
    } catch (e: any) {
      alert('Lỗi khi xoá: ' + (e?.message || e));
    } finally {
      setDangXoa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full max-w-[900px] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center gap-2 px-4 py-3 border-b border-rose-100 bg-rose-50 shrink-0 rounded-t-2xl">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <h2 className="text-[15px] font-black text-rose-900">
            Dọn công thức trùng — {nhomTrung.length} nhóm
          </h2>
          <button onClick={onClose} className="ml-auto p-1.5 text-rose-600 hover:bg-rose-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          {xong !== null ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-emerald-800">Đã xoá {xong} bản trùng.</p>
              <p className="text-[13px] text-gray-500 mt-1">Sổ tay giờ mỗi công thức chỉ còn một bản.</p>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                Mỗi nhóm dưới đây là cùng một công thức bị nhập nhiều lần. Chọn bản muốn <b>GIỮ</b>;
                các bản còn lại sẽ bị xoá. Chưa bấm nút xoá thì chưa có gì thay đổi.
              </p>

              {nhomTrung.map(n => (
                <div key={n.khoa} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 text-[11px] font-black text-gray-500 uppercase tracking-wide">
                    {n.cacBan.length} bản · {n.lyDo === 'latex' ? 'trùng công thức' : 'trùng tên'}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {n.cacBan.map((c: CongThucGon) => {
                      const giu = banGiu[n.khoa] === c.id;
                      return (
                        <label key={c.id}
                               className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${giu ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                          <input
                            type="radio" name={`giu-${n.khoa}`} checked={giu}
                            onChange={() => setBanGiu(p => ({ ...p, [n.khoa]: c.id! }))}
                            className="mt-1 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-bold text-[13.5px] text-gray-800">{c.title}</span>
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                                {tenChuong(c.category_id)}
                              </span>
                              <span className={`text-[11px] font-black ${giu ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {giu ? 'GIỮ LẠI' : 'sẽ xoá'}
                              </span>
                            </div>
                            {c.latex_content && (
                              <div className="mt-1 overflow-x-auto text-[13px]">
                                <BlockMath math={c.latex_content} />
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {xong === null && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-2 bg-gray-50 rounded-b-2xl">
            <span className="text-[12.5px] text-gray-600">
              Sẽ xoá <b className="text-rose-700">{idSeXoa.length}</b> bản, giữ <b>{nhomTrung.length}</b> bản chính.
            </span>
            <div className="flex gap-2">
              <button onClick={onClose}
                      className="px-4 py-2 rounded-xl font-bold text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">
                Để sau
              </button>
              <button onClick={xoa} disabled={dangXoa || idSeXoa.length === 0}
                      className="px-5 py-2 rounded-xl font-black text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
                {dangXoa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xoá {idSeXoa.length} bản trùng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
