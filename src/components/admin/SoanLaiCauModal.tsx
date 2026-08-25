"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import { soanLaiMotCau, type YeuCauSoanLai } from "@/utils/soanLaiCauTheoYeuCau";
import { taoKhoaSoSanh, type KhoaSoSanh } from "@/utils/questionFingerprint";
import { saveQuestionsToBank } from "@/utils/questionBankSave";
import QuestionPreviewCard, { taoStatements } from "@/components/admin/QuestionPreviewCard";
import { bankTypeLabel, difficultyLabel, type BankType } from "@/utils/questionTypes";
import type { QuestionData } from "@/utils/aiQuestionScan";

/**
 * Soạn lại MỘT câu cụ thể theo yêu cầu riêng, ngay tại chỗ đang xem đề.
 *
 * Dành cho tình huống kho còn nhiều câu cùng dạng nhưng không câu nào vừa ý - bấm "Đổi
 * câu khác" bao nhiêu lần cũng chỉ xoay vòng trong đúng những câu không dùng được.
 *
 * Câu AI soạn KHÔNG tự vào đề: nó qua chuẩn hoá, dò trùng, rồi nằm ở đây chờ thầy cô
 * đọc và tự chọn. Chọn xong mới thay vào đề, và LƯU LUÔN vào ngân hàng để lần sau còn
 * dùng lại - đỡ phải nhờ AI soạn lại đúng câu đó.
 */

export interface OSoanLai {
  /** Vị trí dòng ma trận và mã câu đang thay, để trang gọi biết thay vào đâu. */
  dongIdx: number;
  cauGoc: any;
  grade: string;
  subject: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  o: OSoanLai | null;
  /** Gọi khi thầy cô chọn xong một câu thay thế. */
  onThay: (dongIdx: number, idCauCu: string, cauMoi: QuestionData) => void;
}

export default function SoanLaiCauModal({ isOpen, onClose, o, onThay }: Props) {
  const supabase = createClient();
  const [yeuCau, setYeuCau] = useState("");
  const [soPhuongAn, setSoPhuongAn] = useState(2);
  const [dangChay, setDangChay] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [loi, setLoi] = useState("");
  const [cau, setCau] = useState<QuestionData[] | null>(null);
  const [model, setModel] = useState("");
  const [dangThay, setDangThay] = useState(false);

  useEffect(() => {
    if (!isOpen) { setCau(null); setLoi(""); setTienDo(""); setModel(""); setYeuCau(""); }
  }, [isOpen]);

  if (!isOpen || !o) return null;

  const g = o.cauGoc || {};
  const loaiCau = (g.question_type || "NLC") as BankType;

  const batDau = async () => {
    if (!yeuCau.trim()) return alert("Hãy dặn máy cần soạn câu như thế nào.");
    setDangChay(true); setLoi(""); setCau(null);
    try {
      // Chỉ dò trùng trong phạm vi CÙNG BÀI: câu về cực trị không thể trùng câu về tích
      // phân, mà nạp cả kho nghìn câu chỉ để dò thì chờ rất lâu.
      setTienDo("Đang nạp câu cùng bài để dò trùng...");
      const { data: cungBai } = await supabase
        .from("questions")
        .select("id, content, option_a, option_b, option_c, option_d")
        .eq("grade", o.grade).eq("lesson", g.lesson || "");

      const khoSoSanh: KhoaSoSanh[] = (cungBai || [])
        .map(q => taoKhoaSoSanh({ id: q.id, content: q.content, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d }))
        .filter(k => k.vanTay);

      setTienDo("Đang xin khoá AI...");
      const cauHinh = await layCauHinhAI();

      const yc: YeuCauSoanLai = {
        cauGoc: g,
        yeuCau,
        grade: o.grade,
        subject: o.subject,
        topic: g.topic || "",
        lesson: g.lesson || "",
        math_form: g.math_form || "",
        question_type: loaiCau,
        difficulty: String(g.difficulty ?? "1"),
        soPhuongAn,
      };

      const kq = await soanLaiMotCau(yc, cauHinh, khoSoSanh, setTienDo);
      if (kq.cauMoi.length === 0) {
        setLoi("Máy không soạn được câu nào dùng được. Thử dặn lại rõ hơn, hoặc bấm soạn lại.");
      } else {
        setCau(kq.cauMoi);
        setModel(kq.model);
      }
    } catch (e: any) {
      setLoi(e?.message || "Không gọi được AI.");
    } finally {
      setDangChay(false); setTienDo("");
    }
  };

  /**
   * Chọn một câu: lưu vào ngân hàng RỒI mới thay vào đề.
   *
   * Lưu trước để câu có id thật trong kho - đề lưu lại hay đẩy sang thi online đều cần
   * id đó. Lưu hỏng thì vẫn cho thay vào đề (khỏi mất công soạn), nhưng phải báo rõ là
   * câu chưa vào kho.
   */
  const chonCau = async (q: QuestionData) => {
    setDangThay(true);
    try {
      const kq = await saveQuestionsToBank(supabase, [{ ...q, isDuplicate: false }]);
      if (kq.insertedCount === 0) {
        const lyDo = kq.thieuPhanLoai.length
          ? "câu thiếu Chương/Bài/Dạng nên cửa lưu giữ lại"
          : "không rõ lý do";
        if (!confirm(`Chưa lưu được câu vào ngân hàng (${lyDo}).\n\nVẫn thay vào đề chứ? Câu sẽ chỉ nằm trong đề này.`)) {
          setDangThay(false);
          return;
        }
      }
      onThay(o.dongIdx, g.id, q);
      onClose();
    } catch (e: any) {
      alert("Lỗi khi lưu câu: " + (e?.message || "không rõ"));
    } finally {
      setDangThay(false);
    }
  };

  const theTrangThai = (q: QuestionData) => {
    if (q.mucDoTrung === "trung") return { chu: "Trùng câu đã có", mau: "bg-red-100 text-red-700 border-red-200" };
    if (q.mucDoTrung === "nghi") return { chu: "Nghi trùng", mau: "bg-amber-100 text-amber-800 border-amber-300" };
    return { chu: "Chưa có trong kho", mau: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-violet-100 bg-violet-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-violet-600 shrink-0" />
            <h2 className="text-base font-black text-violet-900 truncate">Soạn lại câu này theo yêu cầu</h2>
            {model && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-violet-300 text-violet-700">{model}</span>}
          </div>
          <button onClick={onClose} className="p-2 text-violet-600 hover:bg-violet-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Câu đang muốn thay */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] font-black uppercase text-gray-400">Câu đang có trong đề</span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[11px]">{g.math_form}</span>
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-bold text-[11px]">{bankTypeLabel(loaiCau)}</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[11px]">{difficultyLabel(g.difficulty)}</span>
            </div>
            <QuestionPreviewCard
              content={g.content}
              imageUrl={g.image_url}
              {...(() => { const { statements, statementsLayout } = taoStatements(g); return { statements, statementsLayout }; })()}
              correctAnswerDisplay={loaiCau === "TLN" || loaiCau === "TL" ? (g.correct_answer || undefined) : undefined}
              size="sm"
            />
          </div>

          {/* Dặn máy */}
          <div>
            <label className="text-xs font-black text-gray-600 uppercase">Cần soạn câu như thế nào</label>
            <textarea
              value={yeuCau}
              onChange={e => setYeuCau(e.target.value)}
              rows={3}
              placeholder={'VD: chia thành 2 ý a) và b), ý a hỏi tính công, ý b hỏi độ biến thiên nội năng;\nhoặc: giữ nguyên dạng nhưng đổi sang bài toán thực tế về ấm đun nước;\nhoặc: cho thêm dữ kiện khối lượng riêng, bỏ dữ kiện thể tích.'}
              className="mt-1 w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-violet-400"
            />
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <label className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
                Soạn
                <select
                  value={soPhuongAn}
                  onChange={e => setSoPhuongAn(Number(e.target.value) || 2)}
                  className="border border-gray-200 rounded-md px-2 py-1 text-[13px] font-bold outline-none"
                >
                  {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                câu để chọn
              </label>
              <button
                onClick={batDau}
                disabled={dangChay}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-lg text-[13px] disabled:opacity-60 transition-colors"
              >
                {dangChay ? <Loader2 className="w-4 h-4 animate-spin" /> : cau ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {dangChay ? (tienDo || "Đang soạn...") : cau ? "Soạn lại lượt khác" : "Soạn câu mới"}
              </button>
            </div>
            {loi && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{loi}</span>
              </div>
            )}
          </div>

          {/* Câu máy soạn ra */}
          {cau && (
            <div className="space-y-3">
              <div className="text-[11px] font-black uppercase text-gray-400">
                Máy soạn được {cau.length} câu - đọc kỹ rồi chọn một câu để thay
              </div>
              {cau.map((q, i) => {
                const tt = theTrangThai(q);
                const { statements, statementsLayout } = taoStatements(q);
                return (
                  <div key={q.temp_id} className="rounded-xl border-2 border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[11px]">Câu máy soạn {i + 1}</span>
                        <span className={`px-2 py-0.5 rounded border font-bold text-[11px] ${tt.mau}`}>{tt.chu}</span>
                        {q.canhBaoChuanHoa && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                            {q.canhBaoChuanHoa}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => chonCau(q)}
                        disabled={dangThay}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[13px] disabled:opacity-50"
                      >
                        {dangThay ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Dùng câu này
                      </button>
                    </div>
                    <QuestionPreviewCard
                      content={q.content}
                      imageUrl={q.image_url}
                      statements={statements}
                      statementsLayout={statementsLayout}
                      correctAnswerDisplay={loaiCau === "TLN" || loaiCau === "TL" ? (q.correct_answer || undefined) : undefined}
                      size="sm"
                    />
                    {q.explanation && (
                      <details className="mt-2">
                        <summary className="text-[12px] font-bold text-violet-700 cursor-pointer">Xem lời giải</summary>
                        <div className="mt-1 text-[13px] text-gray-700 whitespace-pre-wrap">{q.explanation}</div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[12px] text-gray-500 font-medium">
            Câu được chọn sẽ lưu vào ngân hàng rồi mới thay vào đề, để lần sau còn dùng lại.
          </p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white text-sm font-bold">Đóng</button>
        </div>
      </div>
    </div>
  );
}
