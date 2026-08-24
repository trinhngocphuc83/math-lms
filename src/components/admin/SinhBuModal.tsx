"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import { sinhBuMotO, type YeuCauSinhBu } from "@/utils/sinhBuCauHoi";
import { taoKhoaSoSanh, type KhoaSoSanh } from "@/utils/questionFingerprint";
import { saveQuestionsToBank } from "@/utils/questionBankSave";
import QuestionPreviewCard, { taoStatements } from "@/components/admin/QuestionPreviewCard";
import { bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";
import type { QuestionData } from "@/utils/aiQuestionScan";

/**
 * Nhờ AI soạn thêm câu cho một ô ma trận đang thiếu so với kho.
 *
 * Câu AI soạn KHÔNG vào thẳng ngân hàng. Nó đi qua chuẩn hoá, dò trùng, rồi nằm ở
 * bảng này chờ thầy cô đọc từng câu và tự tick. Câu nghi trùng bị bỏ tick sẵn.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  yeuCau: Omit<YeuCauSinhBu, "cauMau"> | null;
  /** Gọi sau khi lưu xong, để trang ma trận quét lại kho cho số câu cập nhật. */
  onDaLuu: (soCau: number) => void;
}

export default function SinhBuModal({ isOpen, onClose, yeuCau, onDaLuu }: Props) {
  const supabase = createClient();
  const [dangChay, setDangChay] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [loi, setLoi] = useState("");
  const [cau, setCau] = useState<QuestionData[] | null>(null);
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [model, setModel] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (!isOpen) { setCau(null); setLoi(""); setTienDo(""); setModel(""); setChon(new Set()); }
  }, [isOpen]);

  if (!isOpen || !yeuCau) return null;

  const batDau = async () => {
    setDangChay(true); setLoi(""); setCau(null);
    try {
      setTienDo("Đang lấy câu mẫu cùng dạng trong kho...");
      // Chỉ so trùng trong phạm vi CÙNG BÀI. Một câu về cực trị không thể trùng với câu
      // về tích phân, mà nạp cả kho nghìn câu chỉ để dò thì chờ rất lâu.
      const { data: cungBai } = await supabase
        .from("questions")
        .select("id, content, option_a, option_b, option_c, option_d, correct_answer, math_form, question_type, difficulty")
        .eq("grade", yeuCau.grade).eq("lesson", yeuCau.lesson);

      const kho = cungBai || [];
      const khoSoSanh: KhoaSoSanh[] = kho
        .map(q => taoKhoaSoSanh({ id: q.id, content: q.content, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d }))
        .filter(k => k.vanTay);

      const cauMau = kho
        .filter(q => q.math_form === yeuCau.math_form && q.question_type === yeuCau.question_type)
        .slice(0, 3);

      setTienDo("Đang xin khoá AI...");
      const cauHinh = await layCauHinhAI();
      const kq = await sinhBuMotO({ ...yeuCau, cauMau }, cauHinh, khoSoSanh, setTienDo);

      if (kq.cauMoi.length === 0) {
        setLoi("Máy không soạn được câu nào dùng được. Thử lại, hoặc giảm số câu cần thêm.");
      } else {
        setCau(kq.cauMoi);
        setModel(kq.model);
        // Câu nghi trùng bỏ tick sẵn, thầy cô muốn giữ thì tự tick lại
        setChon(new Set(kq.cauMoi.filter(q => !q.isDuplicate).map(q => q.temp_id!)));
      }
    } catch (e: any) {
      setLoi(e?.message || "Không gọi được AI.");
    } finally {
      setDangChay(false); setTienDo("");
    }
  };

  const luu = async () => {
    const dsLuu = (cau || []).filter(q => chon.has(q.temp_id!));
    if (dsLuu.length === 0) return alert("Chưa tick câu nào để lưu.");
    setDangLuu(true);
    try {
      // Bỏ cờ nghi trùng cho câu thầy cô đã tự tay tick giữ lại, nếu không
      // saveQuestionsToBank sẽ lọc bỏ chính những câu vừa được duyệt.
      const kq = await saveQuestionsToBank(supabase, dsLuu.map(q => ({ ...q, isDuplicate: false })));
      let tb = `Đã lưu ${kq.insertedCount} câu vào ngân hàng.`;
      if (kq.thieuPhanLoai.length) tb += `\n${kq.thieuPhanLoai.length} câu bị giữ lại vì thiếu Chương/Bài.`;
      alert(tb);
      onDaLuu(kq.insertedCount);
      onClose();
    } catch (e: any) {
      alert("Lỗi khi lưu: " + (e?.message || "không rõ"));
    } finally {
      setDangLuu(false);
    }
  };

  const lat = (id: string) => setChon(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-violet-100 bg-violet-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-violet-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-violet-900 truncate">Nhờ AI soạn thêm câu</h2>
            {model && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-violet-300 text-violet-700">{model}</span>}
          </div>
          <button onClick={onClose} className="p-2 text-violet-600 hover:bg-violet-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Đang cần gì */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[13px]">
            <div className="font-black text-gray-800 mb-1">Cần thêm {yeuCau.soCanThem} câu</div>
            <div className="text-gray-600">
              {yeuCau.topic} · {yeuCau.lesson}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[11px]">{yeuCau.math_form}</span>
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-bold text-[11px]">{bankTypeLabel(yeuCau.question_type)}</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[11px]">{difficultyLabel(yeuCau.difficulty)}</span>
            </div>
          </div>

          {!cau && (
            <div className="text-center py-8">
              <button
                onClick={batDau}
                disabled={dangChay}
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl disabled:opacity-60 transition-colors"
              >
                {dangChay ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {dangChay ? (tienDo || "Đang chạy...") : `Soạn ${yeuCau.soCanThem} câu`}
              </button>
              <p className="text-xs text-gray-500 mt-3 max-w-xl mx-auto">
                Máy lấy vài câu cùng dạng trong kho làm mẫu để bám đúng độ khó, rồi soạn câu mới.
                Câu soạn xong <b>không vào kho ngay</b> — thầy cô đọc và tick từng câu.
              </p>
              {loi && (
                <div className="mt-4 mx-auto max-w-xl p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2 text-left">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{loi}</span>
                </div>
              )}
            </div>
          )}

          {cau && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Máy soạn được {cau.length} câu
                </span>
                {cau.some(q => q.isDuplicate) && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300">
                    {cau.filter(q => q.isDuplicate).length} câu nghi trùng — đã bỏ tick sẵn
                  </span>
                )}
                <button onClick={() => setCau(null)} className="ml-auto px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold">
                  Soạn lại
                </button>
              </div>

              <div className="space-y-3">
                {cau.map(q => {
                  const { statements, statementsLayout } = taoStatements(q);
                  const daTick = chon.has(q.temp_id!);
                  return (
                    <div key={q.temp_id} className={`rounded-xl border p-3 ${daTick ? "border-violet-300 bg-violet-50/30" : "border-gray-200 opacity-60"}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <input type="checkbox" checked={daTick} onChange={() => lat(q.temp_id!)} className="w-4 h-4 mt-1 accent-violet-600" />
                        <div className="flex-1 min-w-0 space-y-1">
                          {q.isDuplicate && (
                            <p className="text-[12px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                              {q.lyDoTrung}
                            </p>
                          )}
                          {(q.canhBaoChuanHoa?.length ?? 0) > 0 && (
                            <p className="text-[12px] font-bold text-violet-800 bg-violet-50 border border-violet-200 rounded-md px-2 py-1">
                              MÁY ĐÃ TỰ CHỈNH: {q.canhBaoChuanHoa!.join("; ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <QuestionPreviewCard
                        content={q.content}
                        statements={statements}
                        statementsLayout={statementsLayout}
                        correctAnswerDisplay={q.correct_answer || undefined}
                        explanation={q.explanation}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {cau && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-[12px] text-gray-500 font-medium">Câu AI soạn phải qua mắt thầy cô mới được vào kho.</p>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white text-sm font-bold">Huỷ</button>
              <button
                onClick={luu}
                disabled={dangLuu || chon.size === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-sm disabled:opacity-40 transition-colors"
              >
                {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu {chon.size} câu vào ngân hàng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
