"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import { veLaiHinhBangAI, luuHinhVeLai, chamDoNetAnh, type DiemNetAnh } from "@/utils/veLaiHinhAI";

/**
 * Nhờ AI vẽ lại một hình minh hoạ bằng SVG, khi ảnh cắt ra bị mờ hoặc quá nhỏ.
 *
 * Bản vẽ lại KHÔNG bao giờ tự thay vào bài. Máy VẼ LẠI chứ không phải làm sạch, nên nó
 * có thể chép sai một con số trên trục hay một nhãn điểm - câu hỏi thành sai mà không ai
 * hay. Vì vậy hai hình luôn nằm cạnh nhau, kèm danh sách chữ máy đọc được, thầy cô soi
 * từng con số rồi mới bấm nhận.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Địa chỉ ảnh hình vẽ hiện tại. */
  urlAnhGoc: string | null;
  /** Nhận địa chỉ ảnh PNG mới sau khi thầy cô duyệt. */
  onNhan: (urlAnhMoi: string) => void;
}

export default function VeLaiHinhModal({ isOpen, onClose, urlAnhGoc, onNhan }: Props) {
  const supabase = createClient();
  const [dangChay, setDangChay] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [loi, setLoi] = useState("");
  const [svg, setSvg] = useState("");
  const [chuTrongHinh, setChuTrongHinh] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [doNet, setDoNet] = useState<DiemNetAnh | null>(null);

  useEffect(() => {
    if (!isOpen) { setSvg(""); setLoi(""); setTienDo(""); setModel(""); setChuTrongHinh([]); setDoNet(null); return; }
    if (!urlAnhGoc) return;
    chamDoNetAnh(urlAnhGoc).then(setDoNet).catch(() => setDoNet(null));
  }, [isOpen, urlAnhGoc]);

  if (!isOpen || !urlAnhGoc) return null;

  const chay = async () => {
    setDangChay(true); setLoi(""); setSvg("");
    try {
      setTienDo("Đang xin khoá AI...");
      const cauHinh = await layCauHinhAI();
      const kq = await veLaiHinhBangAI(cauHinh, urlAnhGoc, setTienDo);
      setSvg(kq.svg);
      setChuTrongHinh(kq.chuTrongHinh);
      setModel(kq.model);
    } catch (e: any) {
      setLoi(e?.message || "Không vẽ lại được hình.");
    } finally {
      setDangChay(false); setTienDo("");
    }
  };

  const nhan = async () => {
    if (!svg) return;
    setDangLuu(true);
    try {
      const { urlPng } = await luuHinhVeLai(supabase, svg);
      onNhan(urlPng);
      onClose();
    } catch (e: any) {
      alert("Không lưu được hình vẽ lại: " + (e?.message || "lỗi không rõ"));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1150px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-sky-100 bg-sky-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
            <h2 className="text-base font-black text-sky-900 truncate">AI vẽ lại hình cho sắc nét</h2>
            {model && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-sky-300 text-sky-700">{model}</span>}
          </div>
          <button onClick={onClose} className="p-2 text-sky-600 hover:bg-sky-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Vì sao nên vẽ lại */}
          {doNet && (
            <div className={`p-3 rounded-xl border text-[13px] font-bold flex items-center gap-2 ${
              doNet.nenVeLai ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {doNet.moTa} · độ nét {doNet.diem}, bề ngang {doNet.beRong}px
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-3">
              <div className="text-[11px] font-black uppercase text-gray-400 mb-2">Hình đang dùng (ảnh chụp)</div>
              <img src={urlAnhGoc} alt="Hình gốc" className="w-full h-auto rounded-lg border border-gray-100" />
            </div>
            <div className="border-2 border-sky-200 rounded-xl p-3 bg-sky-50/30">
              <div className="text-[11px] font-black uppercase text-sky-500 mb-2">Máy vẽ lại (nét vector)</div>
              {svg ? (
                <div className="w-full [&>svg]:w-full [&>svg]:h-auto bg-white rounded-lg border border-sky-100"
                     dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="min-h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  {dangChay ? (tienDo || "Đang vẽ...") : "Bấm “Vẽ lại hình” để máy dựng bản mới"}
                </div>
              )}
            </div>
          </div>

          {/* Chữ máy đọc được - soi nhanh xem có sai số nào không */}
          {svg && chuTrongHinh.length > 0 && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-[11px] font-black uppercase text-gray-500 mb-1.5">
                Chữ và số máy đọc được ({chuTrongHinh.length}) - soi kỹ chỗ này
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chuTrongHinh.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white border border-gray-200 text-[12px] font-bold text-gray-700">{t}</span>
                ))}
              </div>
            </div>
          )}

          {loi && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{loi}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[12px] text-amber-700 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Máy VẼ LẠI chứ không làm sạch - soi kỹ từng con số trước khi nhận.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white text-sm font-bold">Đóng</button>
            <button
              onClick={chay}
              disabled={dangChay}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-sm disabled:opacity-60"
            >
              {dangChay ? <Loader2 className="w-4 h-4 animate-spin" /> : svg ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {dangChay ? (tienDo || "Đang vẽ...") : svg ? "Vẽ lại lượt khác" : "Vẽ lại hình"}
            </button>
            {svg && (
              <button
                onClick={nhan}
                disabled={dangLuu}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm disabled:opacity-50"
              >
                {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Dùng bản vẽ lại
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
