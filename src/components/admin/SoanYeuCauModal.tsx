"use client";

import { useState } from "react";
import { X, Loader2, Sparkles, AlertTriangle, Save, BookOpen, Database } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import {
  soanYeuCauNhieuLo, type DangCanSoan, type YeuCauDaSoan,
} from "@/utils/soanYeuCauCanDat";

/**
 * Nhờ AI soạn "Yêu cầu cần đạt" hàng loạt cho các dạng còn trống.
 *
 * Máy bám câu hỏi thật trong kho khi có; dạng nào kho chưa có câu nào thì bám sách
 * giáo khoa, và những dòng đó được đánh dấu riêng để thầy cô soát kỹ hơn - suy từ sách
 * thì đúng chương trình nhưng có thể lệch với kiểu bài thầy cô vẫn ra.
 */

export interface DangTrong {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Các dạng đang trống yêu cầu cần đạt, đã lọc theo ô tìm kiếm của trang danh mục. */
  dangTrong: DangTrong[];
  onDaLuu: () => void;
}

export default function SoanYeuCauModal({ isOpen, onClose, dangTrong, onDaLuu }: Props) {
  const supabase = createClient();
  const [dangChay, setDangChay] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [loi, setLoi] = useState("");
  const [ketQua, setKetQua] = useState<YeuCauDaSoan[] | null>(null);
  const [model, setModel] = useState("");
  const [thieu, setThieu] = useState(0);
  const [loLoi, setLoLoi] = useState<string[]>([]);
  const [dangLuu, setDangLuu] = useState(false);

  if (!isOpen) return null;

  const dongLai = () => {
    setKetQua(null); setLoi(""); setTienDo(""); setModel(""); setThieu(0); setLoLoi([]);
    onClose();
  };

  const chay = async () => {
    setDangChay(true); setLoi(""); setKetQua(null);
    try {
      setTienDo("Đang lấy câu mẫu trong kho...");
      // Lấy tối đa 2 câu thật cho mỗi dạng để máy biết kiểu bài đang ra. Chỉ nạp cột
      // content, không nạp cả câu, cho nhẹ.
      const tenDang = Array.from(new Set(dangTrong.map(d => d.math_form)));
      const mauTheoDang = new Map<string, string[]>();
      for (let i = 0; i < tenDang.length; i += 60) {
        const { data } = await supabase
          .from("questions").select("math_form, content")
          .in("math_form", tenDang.slice(i, i + 60)).limit(600);
        for (const q of data || []) {
          const k = String(q.math_form || "");
          const ds = mauTheoDang.get(k) || [];
          if (ds.length < 2 && q.content) { ds.push(q.content); mauTheoDang.set(k, ds); }
        }
      }

      const canSoan: DangCanSoan[] = dangTrong.map(d => ({
        ...d, cauMau: mauTheoDang.get(d.math_form) || [],
      }));

      setTienDo("Đang xin khoá AI...");
      const cauHinh = await layCauHinhAI();
      const kq = await soanYeuCauNhieuLo(canSoan, cauHinh, setTienDo);

      if (kq.ketQua.length === 0) {
        setLoi("Máy không soạn được dòng nào. " + (kq.loLoi[0] || "Thử lại sau."));
        setLoLoi(kq.loLoi);
      } else {
        setKetQua(kq.ketQua); setModel(kq.model); setThieu(kq.soBoQua); setLoLoi(kq.loLoi);
      }
    } catch (e: any) {
      setLoi(e?.message || "Không gọi được AI.");
    } finally {
      setDangChay(false); setTienDo("");
    }
  };

  const sua = (i: number, patch: Partial<YeuCauDaSoan>) =>
    setKetQua(prev => prev ? prev.map((r, k) => (k === i ? { ...r, ...patch } : r)) : prev);

  const luu = async () => {
    const ds = (ketQua || []).filter(r => r.chon && r.yeuCau.trim());
    if (ds.length === 0) return alert("Chưa tick dòng nào để lưu.");
    setDangLuu(true);
    try {
      let xong = 0;
      const hong: string[] = [];
      for (const r of ds) {
        const { error } = await supabase.from("question_categories")
          .update({ yeu_cau_can_dat: r.yeuCau.trim() }).eq("id", r.id);
        if (error) hong.push(r.math_form); else xong++;
      }
      alert(`Đã lưu yêu cầu cần đạt cho ${xong} dạng.` +
        (hong.length ? `\n\n${hong.length} dạng không lưu được: ${hong.slice(0, 5).join(", ")}` : ""));
      onDaLuu();
      dongLai();
    } catch (e: any) {
      alert("Lỗi khi lưu: " + (e?.message || "không rõ"));
    } finally {
      setDangLuu(false);
    }
  };

  const soChon = (ketQua || []).filter(r => r.chon).length;
  const soTheoSach = (ketQua || []).filter(r => r.theoSach).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-emerald-100 bg-emerald-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-emerald-900 truncate">AI soạn Yêu cầu cần đạt</h2>
            {model && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-emerald-300 text-emerald-700">{model}</span>}
          </div>
          <button onClick={dongLai} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {!ketQua && (
            <div className="text-center py-6">
              <div className="mx-auto max-w-2xl p-3 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-left mb-5">
                <div className="font-black text-gray-800 mb-1">
                  {dangTrong.length} dạng đang trống yêu cầu cần đạt
                </div>
                <p className="text-gray-600">
                  Máy bám <b>câu hỏi thật trong kho</b> của từng dạng để viết. Dạng nào kho chưa có
                  câu nào thì bám <b>Chương trình GDPT 2018 và sách giáo khoa</b> của đúng bài đó,
                  và dòng ấy sẽ được đánh dấu riêng để thầy cô soát kỹ hơn.
                </p>
              </div>

              <button
                onClick={chay}
                disabled={dangChay || dangTrong.length === 0}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl disabled:opacity-60 transition-colors"
              >
                {dangChay ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {dangChay ? (tienDo || "Đang chạy...") : `Soạn cho ${dangTrong.length} dạng`}
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Chia thành nhiều lô nhỏ. Lô nào hỏng thì báo riêng, các lô đã xong vẫn giữ nguyên.
              </p>

              {loi && (
                <div className="mt-4 mx-auto max-w-2xl p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2 text-left">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{loi}</span>
                </div>
              )}
            </div>
          )}

          {ketQua && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Soạn được {ketQua.length} dạng
                </span>
                {soTheoSach > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {soTheoSach} dạng suy từ sách giáo khoa
                  </span>
                )}
                {thieu > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-300">
                    {thieu} dạng máy chưa trả về — chạy lại lần nữa cho phần còn lại
                  </span>
                )}
                <button onClick={() => setKetQua(null)} className="ml-auto px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold">
                  Soạn lại
                </button>
              </div>

              {loLoi.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-800">
                  <b>Lô chạy hỏng:</b> {loLoi.join(" · ")}
                </div>
              )}

              <p className="text-[12px] text-gray-500 font-medium">
                Dòng có nhãn <b className="text-amber-700">sách giáo khoa</b> là kho chưa có câu nào nên máy phải suy từ
                chương trình — đúng chuẩn nhưng có thể lệch với kiểu bài thầy cô vẫn ra, nên đọc kỹ hơn.
                Sửa thẳng trong ô rồi mới lưu.
              </p>

              <div className="space-y-2">
                {ketQua.map((r, i) => (
                  <div key={r.id} className={`rounded-xl border p-3 ${r.chon ? (r.theoSach ? "border-amber-300 bg-amber-50/40" : "border-gray-200") : "border-gray-200 opacity-50"}`}>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={r.chon} onChange={() => sua(i, { chon: !r.chon })} className="w-4 h-4 mt-1 accent-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-bold text-gray-800 text-[13px]">{r.math_form}</span>
                          <span className="text-[11px] text-gray-400">{r.lesson}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${r.theoSach ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-700"}`}>
                            {r.theoSach ? <><BookOpen className="w-3 h-3" /> sách giáo khoa</> : <><Database className="w-3 h-3" /> theo câu trong kho</>}
                          </span>
                        </div>
                        <textarea
                          value={r.yeuCau}
                          onChange={e => sua(i, { yeuCau: e.target.value })}
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg p-2 text-[13px] outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {ketQua && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-[12px] text-gray-500 font-medium">Máy chỉ soạn nháp. Thầy cô đọc rồi mới lưu.</p>
            <div className="flex items-center gap-2">
              <button onClick={dongLai} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white text-sm font-bold">Huỷ</button>
              <button
                onClick={luu}
                disabled={dangLuu || soChon === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm disabled:opacity-40 transition-colors"
              >
                {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu {soChon} dạng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
