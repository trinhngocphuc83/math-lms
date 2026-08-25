"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2, Trash2, Check, Columns2, Highlighter, Link2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import QuestionPreviewCard, { taoStatements } from "@/components/admin/QuestionPreviewCard";
import { bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";
import { soSanhTheoTu, demTuKhac, type DoanChu } from "@/utils/soSanhChu";

/**
 * Đặt CÂU ĐANG SOẠN cạnh CÂU ĐÃ CÓ TRONG KHO để thầy cô tự quyết bỏ hay giữ.
 *
 * Trước đây chỉ có một dòng cảnh báo "Giống 92% một câu đã có" mà không cho xem
 * câu kia là câu nào - muốn kiểm chứng phải mở Ngân hàng ở tab khác rồi mò tìm.
 *
 * Hai chế độ xem, vì mỗi chế độ trả lời một câu hỏi khác nhau:
 *   - "Xem như đề thi": dựng đủ công thức, hình ảnh - để thấy hai câu có thật sự
 *     hỏi cùng một việc không.
 *   - "Soi chữ khác nhau": chữ thô, tô đúng những từ lệch - để thấy hai câu chỉ
 *     khác nhau con số hay khác hẳn nội dung. CỐ Ý không tô trên bản đã dựng công
 *     thức: chèn thẻ đánh dấu vào giữa LaTeX sẽ làm vỡ công thức.
 */

interface DuplicateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Câu đang soạn, cần có duplicateId trỏ tới câu giống nó. */
  cauMoi: any;
  /** Các câu khác trong cùng lô - dùng khi câu giống nằm ngay trong lô này (khớp theo temp_id). */
  cauTrongLo?: any[];
  /** Bỏ hẳn câu đang soạn. Không truyền thì ẩn nút. */
  onBoCau?: () => void;
  /**
   * Thầy cô đã soi hai câu và quyết GIỮ - gỡ hẳn cờ nghi trùng cho câu đang soạn.
   *
   * Bắt buộc phải có việc này chứ không chỉ đóng hộp thoại: cửa lưu chung loại thẳng
   * mọi câu còn mang cờ isDuplicate, nên bấm "Vẫn giữ" xong đi lưu vẫn bị báo "câu này
   * bị bỏ qua vì trùng" - đúng cái bẫy thầy cô gặp. Hai câu dùng chung dữ liệu nhưng
   * hỏi khác nhau là chuyện bình thường, máy chỉ báo chứ không được quyết thay.
   */
  onGiuCau?: () => void;
}

type CheDoXem = "dung" | "soi";

const O_TRONG = "—";

export default function DuplicateCompareModal({
  isOpen, onClose, cauMoi, cauTrongLo = [], onBoCau, onGiuCau,
}: DuplicateCompareModalProps) {
  const [cauCu, setCauCu] = useState<any>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const [cheDo, setCheDo] = useState<CheDoXem>("dung");
  const [cuonCungNhau, setCuonCungNhau] = useState(true);

  const oTrai = useRef<HTMLDivElement>(null);
  const oPhai = useRef<HTMLDivElement>(null);
  const dangDongBo = useRef(false);

  const maCauCu = cauMoi?.duplicateId || "";

  useEffect(() => {
    if (!isOpen || !maCauCu) return;

    // Câu giống có thể nằm ngay trong lô đang soạn (khớp theo temp_id) - khỏi hỏi máy chủ.
    const trongLo = cauTrongLo.find((q) => q?.temp_id && q.temp_id === maCauCu);
    if (trongLo) { setCauCu({ ...trongLo, __trongLo: true }); setLoi(""); return; }

    let huy = false;
    setDangTai(true); setLoi(""); setCauCu(null);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("questions").select("*").eq("question_id", maCauCu).maybeSingle();
      if (huy) return;
      if (error) setLoi("Không đọc được câu trong kho: " + error.message);
      else if (!data) setLoi("Không tìm thấy câu mã " + maCauCu + " trong kho. Có thể câu đó đã bị xoá.");
      else setCauCu(data);
      setDangTai(false);
    })();
    return () => { huy = true; };
  }, [isOpen, maCauCu, cauTrongLo]);

  /** Cuộn một bên thì bên kia chạy theo cùng tỉ lệ, để hai câu luôn ngang tầm mắt. */
  const cuonTheo = (nguon: HTMLDivElement | null, dich: HTMLDivElement | null) => {
    if (!cuonCungNhau || !nguon || !dich || dangDongBo.current) return;
    dangDongBo.current = true;
    const dai = nguon.scrollHeight - nguon.clientHeight;
    const ti = dai > 0 ? nguon.scrollTop / dai : 0;
    dich.scrollTop = ti * (dich.scrollHeight - dich.clientHeight);
    requestAnimationFrame(() => { dangDongBo.current = false; });
  };

  const noiDungMoi = String(cauMoi?.content || "");
  const noiDungCu = String(cauCu?.content || "");
  const khac = useMemo(() => soSanhTheoTu(noiDungMoi, noiDungCu), [noiDungMoi, noiDungCu]);
  const soTuKhac = useMemo(() => demTuKhac(khac.trai) + demTuKhac(khac.phai), [khac]);

  if (!isOpen) return null;

  const khacSoLieu = cauMoi?.mucDoTrung === "khac-so-lieu";
  // "Khác số liệu" luôn có điểm giống bằng 0 (cùng khuôn nhưng số khác nhau) nên
  // không hiện phần trăm - hiện "giống 0%" chỉ làm thầy cô hiểu nhầm là không liên quan.
  const phanTramGiong = !khacSoLieu && typeof cauMoi?.diemTrung === "number" && cauMoi.diemTrung > 0
    ? Math.round(cauMoi.diemTrung * 100) : null;
  const giongHet = cauMoi?.mucDoTrung === "trung";

  /** Các mục đem ra soi: nhãn, giá trị câu mới, giá trị câu cũ. */
  const cacMuc: { nhan: string; moi: string; cu: string }[] = cauCu ? [
    { nhan: "Chương", moi: cauMoi?.topic || O_TRONG, cu: cauCu?.topic || O_TRONG },
    { nhan: "Bài", moi: cauMoi?.lesson || O_TRONG, cu: cauCu?.lesson || O_TRONG },
    { nhan: "Dạng toán", moi: cauMoi?.math_form || O_TRONG, cu: cauCu?.math_form || O_TRONG },
    { nhan: "Loại câu", moi: bankTypeLabel(cauMoi?.question_type) || O_TRONG, cu: bankTypeLabel(cauCu?.question_type) || O_TRONG },
    { nhan: "Mức độ", moi: difficultyLabel(cauMoi?.difficulty) || O_TRONG, cu: difficultyLabel(cauCu?.difficulty) || O_TRONG },
    { nhan: "Đáp án", moi: cauMoi?.correct_answer || O_TRONG, cu: cauCu?.correct_answer || O_TRONG },
  ] : [];

  const veThe = (q: any) => {
    const { statements, statementsLayout } = taoStatements(q);
    return (
      <QuestionPreviewCard
        content={q?.content || ""}
        imageUrl={q?.image_url}
        statements={statements}
        statementsLayout={statementsLayout}
        correctAnswerDisplay={q?.correct_answer || undefined}
        explanation={q?.explanation}
        size="sm"
      />
    );
  };

  const veChuTho = (doan: DoanChu[]) => (
    <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-gray-800">
      {doan.map((d, i) => d.trangThai === "khac"
        ? <mark key={i} className="bg-amber-200 text-amber-950 rounded px-0.5">{d.chu}</mark>
        : <span key={i}>{d.chu}</span>)}
    </pre>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Thanh đầu */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b shrink-0 ${giongHet ? "bg-red-50 border-red-100" : khacSoLieu ? "bg-sky-50 border-sky-100" : "bg-amber-50 border-amber-100"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Columns2 className={`w-5 h-5 shrink-0 ${giongHet ? "text-red-600" : khacSoLieu ? "text-sky-600" : "text-amber-600"}`} />
            <h2 className={`text-base sm:text-lg font-black truncate ${giongHet ? "text-red-800" : khacSoLieu ? "text-sky-800" : "text-amber-900"}`}>
              Đối chiếu câu {giongHet ? "trùng" : khacSoLieu ? "cùng khuôn khác số liệu" : "nghi trùng"}
            </h2>
            {phanTramGiong !== null && (
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-black ${giongHet ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
                giống {phanTramGiong}%
              </span>
            )}
            {cheDo === "soi" && cauCu && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-white border border-amber-300 text-amber-800">
                lệch {soTuKhac} từ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-300 bg-white">
              <button
                onClick={() => setCheDo("dung")}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${cheDo === "dung" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Xem như đề thi
              </button>
              <button
                onClick={() => setCheDo("soi")}
                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${cheDo === "soi" ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <Highlighter className="w-3.5 h-3.5" /> Soi chữ khác nhau
              </button>
            </div>
            <button
              onClick={() => setCuonCungNhau((v) => !v)}
              title="Cuộn hai bên cùng lúc"
              className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${cuonCungNhau ? "bg-teal-50 text-teal-700 border-teal-300" : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"}`}
            >
              <Link2 className="w-3.5 h-3.5" /> Cuộn cùng nhau
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bảng soi nhanh các mục phân loại */}
        {cacMuc.length > 0 && (
          <div className="shrink-0 border-b border-gray-100 bg-gray-50/70 px-4 py-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12px]">
              <tbody>
                {cacMuc.map((m) => {
                  const lech = m.moi !== m.cu;
                  return (
                    <tr key={m.nhan} className={lech ? "bg-amber-50" : ""}>
                      <td className="py-1 pr-3 w-24 font-bold text-gray-500 whitespace-nowrap">{m.nhan}</td>
                      <td className={`py-1 pr-3 w-1/2 ${lech ? "text-amber-900 font-bold" : "text-gray-700"}`}>{m.moi}</td>
                      <td className={`py-1 w-1/2 ${lech ? "text-amber-900 font-bold" : "text-gray-700"}`}>{m.cu}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Hai cột */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-gray-200">

          {/* Bên trái: câu đang soạn */}
          <div className="flex flex-col min-h-0 border-b lg:border-b-0 border-gray-200">
            <div className="shrink-0 px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-indigo-800 uppercase tracking-wide">Câu đang soạn</span>
              <span className="text-[11px] font-bold text-indigo-500 truncate">{cauMoi?.temp_id || ""}</span>
            </div>
            <div
              ref={oTrai}
              onScroll={() => cuonTheo(oTrai.current, oPhai.current)}
              className="flex-1 overflow-y-auto p-4 bg-white"
            >
              {cheDo === "dung" ? veThe(cauMoi) : veChuTho(khac.trai)}
            </div>
          </div>

          {/* Bên phải: câu đã có trong kho */}
          <div className="flex flex-col min-h-0">
            <div className="shrink-0 px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                {cauCu?.__trongLo ? "Câu khác trong cùng lô này" : "Câu đã có trong kho"}
              </span>
              <span className="text-[11px] font-bold text-slate-500 truncate">
                {maCauCu}
                {typeof cauCu?.usage_count === "number" ? " · đã dùng " + cauCu.usage_count + " lần" : ""}
              </span>
            </div>
            <div
              ref={oPhai}
              onScroll={() => cuonTheo(oPhai.current, oTrai.current)}
              className="flex-1 overflow-y-auto p-4 bg-slate-50/40"
            >
              {dangTai && (
                <div className="h-full flex items-center justify-center gap-2 text-gray-400 py-10">
                  <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm font-bold">Đang lấy câu trong kho…</span>
                </div>
              )}
              {!dangTai && loi && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{loi}</div>
              )}
              {!dangTai && !loi && cauCu && (cheDo === "dung" ? veThe(cauCu) : veChuTho(khac.phai))}
            </div>
          </div>
        </div>

        {/* Thanh cuối */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[12px] text-gray-500 font-medium">
            Máy chỉ báo, không tự xoá. Thầy cô xem rồi quyết.
          </p>
          <div className="flex items-center gap-2">
            {onBoCau && (
              <button
                onClick={() => { onBoCau(); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-sm border border-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Bỏ câu đang soạn
              </button>
            )}
            {/* Giữ câu thì phải GỠ CỜ nghi trùng, không chỉ đóng hộp thoại - xem onGiuCau */}
            <button
              onClick={() => { onGiuCau?.(); onClose(); }}
              title={onGiuCau ? "Bỏ dấu nghi trùng, câu này lưu vào kho bình thường" : undefined}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              <Check className="w-4 h-4" /> Vẫn giữ câu này
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
