"use client";

import { X, Wand2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import QuestionPreviewCard, { taoStatements } from "@/components/admin/QuestionPreviewCard";
import { bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";

interface PreviewQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: any;
  onUpdate?: (updatedQuestion: any) => void;
}

export default function PreviewQuestionModal({ isOpen, onClose, question, onUpdate }: PreviewQuestionModalProps) {
  const [localQuestion, setLocalQuestion] = useState<any>(null);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  if (!isOpen || !localQuestion) return null;

  const handleFixLatex = async () => {
    if (!localQuestion) return;
    setIsFixing(true);
    const fixText = (text: string) => {
      if (!text) return text;
      let s = String(text);
                // Fix control characters caused by missing escape in JSON (e.g. \f becomes form feed)
          s = s.replace(/\x0Crac/g, '\\frac');
          s = s.replace(/\x0Bec/g, '\\vec');
          s = s.replace(/\x0Aeq/g, '\\neq');
          s = s.replace(/\x08eta/g, '\\beta');
          s = s.replace(/\x08egin/g, '\\begin');
          s = s.replace(/\x09an/g, '\\tan');
          s = s.replace(/\x09heta/g, '\\theta');
          s = s.replace(/\x0Dightarrow/g, '\\rightarrow');
          s = s.replace(/\x0Dight/g, '\\right');

          // Fix JSON escaping for common LaTeX commands (e.g. \\vec -> \vec)
      s = s.replace(/\\\\(vec|frac|Rightarrow|rightarrow|leftrightarrow|Leftrightarrow|lim|log|sin|cos|tan|cot|sqrt|Delta|alpha|beta|gamma|pi|Omega|Sigma|sum|int|infty|to|text|begin|end|cases|le|ge|neq|pm|mp|cup|cap|subset|supset|in|notin|emptyset|mathbb|mathcal|mathbf|mathrm|widehat)/g, '\\$1');

      // Fix cases block shortcuts
      s = s.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');
      s = s.replace(/(?<!\\)begincases/g, '\\begin{cases}').replace(/(?<!\\)endcases/g, '\\end{cases}');

      // Convert Markdown math blocks to LaTeX math blocks
      s = s.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
      s = s.replace(/\\\(/g, '$').replace(/\\\)/g, '$');

      s = s.replace(/\\\\\\\\/g, '\\\\');
      s = s.replace(/\\prime/g, "'");
      s = s.replace(/(?<!\\)rightarrow/g, "\\rightarrow");
      s = s.replace(/textAl/g, "\\text{Al}");
      s = s.replace(/textO/g, "\\text{O}");
      s = s.replace(/(?<!\$)\\begin\{cases\}/g, '$\\begin{cases}');
      s = s.replace(/\\end\{cases\}(?!\$)/g, '\\end{cases}$');
      return s;
    };

    const updated = {
        ...localQuestion,
        content: fixText(localQuestion.content),
        answer_a: fixText(localQuestion.answer_a),
        answer_b: fixText(localQuestion.answer_b),
        answer_c: fixText(localQuestion.answer_c),
        answer_d: fixText(localQuestion.answer_d),
        option_a: fixText(localQuestion.option_a),
        option_b: fixText(localQuestion.option_b),
        option_c: fixText(localQuestion.option_c),
        option_d: fixText(localQuestion.option_d),
        explanation: fixText(localQuestion.explanation)
    };

    setLocalQuestion(updated);

    try {
      const supabase = createClient();
      await supabase.from('questions').update({
         content: updated.content,
         answer_a: updated.answer_a,
         answer_b: updated.answer_b,
         answer_c: updated.answer_c,
         answer_d: updated.answer_d,
         option_a: updated.option_a,
         option_b: updated.option_b,
         option_c: updated.option_c,
         option_d: updated.option_d,
         explanation: updated.explanation
      }).eq('id', updated.id);
      if (onUpdate) {
        onUpdate(updated);
      }
      alert("Đã sửa lỗi LaTeX thành công!");
    } catch(e) {
      console.error("Lỗi khi lưu fix latex", e);
      alert("Sửa lỗi LaTeX trên máy nhưng lưu vào máy chủ thất bại!");
    }
    setIsFixing(false);
  };

  // Chuẩn hoá dữ liệu ngân hàng (option_a/b/c/d, correct_answer dạng chữ cái hoặc
  // chuỗi Đ/S 4 ký tự) về đúng props mà QuestionPreviewCard hiểu - dùng CHUNG bộ
  // khung hiển thị với Xem trước bên Luyện tập và hộp Đối chiếu câu trùng, để ba
  // nơi không lệch giao diện.
  const { statements, statementsLayout } = taoStatements(localQuestion);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-orange-50 shrink-0">
          <h2 className="text-lg font-black text-orange-800">Xem trước: {localQuestion.question_id || localQuestion.temp_id}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleFixLatex} disabled={isFixing} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-lg text-xs transition-colors border border-purple-200 disabled:opacity-60">
               {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
               Sửa lỗi LaTeX
            </button>
            <button onClick={onClose} className="p-2 text-orange-500 hover:bg-orange-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[85vh] bg-gray-50/50">
          <QuestionPreviewCard
            content={localQuestion.content}
            imageUrl={localQuestion.image_url}
            badges={[
              { label: 'Loại', value: bankTypeLabel(localQuestion.question_type), color: 'blue' },
              { label: 'Mức độ', value: difficultyLabel(localQuestion.difficulty), color: 'purple' },
            ]}
            statements={statements}
            statementsLayout={statementsLayout}
            correctAnswerDisplay={localQuestion.correct_answer || undefined}
            explanation={localQuestion.explanation}
            size="md"
          />
        </div>

      </div>
    </div>
  );
}
