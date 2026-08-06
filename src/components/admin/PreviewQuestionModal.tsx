"use client";

import { X, Wand2, Loader2, Eye } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import QuestionPreviewCard, { type PreviewStatement } from "@/components/admin/QuestionPreviewCard";
import { toBankType, bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";

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
  // khung hiển thị với Xem trước bên Luyện tập để hai nơi không lệch giao diện.
  const bankType = toBankType(localQuestion.question_type);
  let statements: PreviewStatement[] = [];
  let statementsLayout: 'choice' | 'truefalse' = 'choice';

  if (bankType === 'NLC') {
    statementsLayout = 'choice';
    const correctLetter = String(localQuestion.correct_answer || '').trim().toUpperCase();
    statements = ['a', 'b', 'c', 'd']
      .map(opt => {
        const val = localQuestion[`option_${opt}`] || localQuestion[`answer_${opt}`];
        if (!val) return null;
        return { key: opt, label: opt.toUpperCase(), content: val, isCorrect: correctLetter === opt.toUpperCase() } as PreviewStatement;
      })
      .filter((s): s is PreviewStatement => !!s);
  } else if (bankType === 'DS') {
    statementsLayout = 'truefalse';
    const correctStr = String(localQuestion.correct_answer || '');
    statements = ['a', 'b', 'c', 'd']
      .map((opt, i) => {
        const val = localQuestion[`option_${opt}`] || localQuestion[`answer_${opt}`];
        if (!val) return null;
        const ch = correctStr.charAt(i);
        const isTrue = ch ? (ch === 'D' || ch === 'T' || ch.toUpperCase() === 'Đ') : undefined;
        return { key: opt, label: opt, content: val, isTrue } as PreviewStatement;
      })
      .filter((s): s is PreviewStatement => !!s);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-orange-100 uppercase tracking-widest">Xem trước câu hỏi</div>
              <h2 className="text-base font-black text-white truncate">{localQuestion.question_id || localQuestion.temp_id}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleFixLatex} disabled={isFixing} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-orange-700 font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-60">
               {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
               Sửa lỗi LaTeX
            </button>
            <button onClick={onClose} className="p-2 text-white/90 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-gray-50/70">
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
            size="lg"
          />
        </div>

      </div>
    </div>
  );
}
