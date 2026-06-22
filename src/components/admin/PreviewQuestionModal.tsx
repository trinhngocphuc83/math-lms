"use client";

import { X, Wand2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

interface PreviewQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: any;
}

export default function PreviewQuestionModal({ isOpen, onClose, question }: PreviewQuestionModalProps) {
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
      s = s.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');
      s = s.replace(/(?<!\\)begincases/g, '\\begin{cases}').replace(/(?<!\\)endcases/g, '\\end{cases}');
      s = s.replace(/\\\\\\\\/g, '\\\\');
      s = s.replace(/\\prime/g, "'");
      s = s.replace(/(?<!\\)rightarrow/g, "\\rightarrow");
      s = s.replace(/textAl/g, "\\text{Al}");
      s = s.replace(/textO/g, "\\text{O}");
      // Cố gắng bọc begincases bằng $
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
    } catch(e) {
      console.error("Lỗi khi lưu fix latex", e);
    }
    setIsFixing(false);
  };

  // Helper function to make KaTeX render tabular and basic center environments
  const preprocessLaTeX = (text: string) => {
    if (!text) return "";
    let processed = String(text);
    
    // Prevent Markdown from treating isolated "1.", "2.", etc. as an empty ordered list
    processed = processed.replace(/^(\d+)\.\s*$/gm, '$1\\.');

    // Strip center tags (KaTeX will center display math anyway)
    processed = processed.replace(/\\begin\{center\}/g, '');
    processed = processed.replace(/\\end\{center\}/g, '');

    // Replace tabular with array and wrap in display math block
    processed = processed.replace(/\\begin\{tabular\}(\{[^}]*\})/g, '$$$$ \\begin{array}$1');
    processed = processed.replace(/\\end\{tabular\}/g, '\\end{array} $$$$');
    
    // Remove $ signs specifically inside the \begin{array} ... \end{array} blocks 
    processed = processed.replace(/(\$\$\s*\\begin\{array\}[^]*?\\end\{array\}\s*\$\$)/g, (match) => {
      let inner = match.substring(2, match.length - 2);
      inner = inner.replace(/\$/g, '');
      return `$$$$${inner}$$$$`;
    });

    return processed;
  };

  const renderContent = (content: string) => {
    let finalContent = String(content).replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '');
    return (
      <div className="prose prose-sm max-w-none prose-p:my-1 overflow-x-auto text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
          {preprocessLaTeX(finalContent)}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-orange-50">
          <h2 className="text-lg font-black text-orange-800">Xem trước: {localQuestion.question_id || localQuestion.temp_id}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleFixLatex} disabled={isFixing} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-lg text-xs transition-colors border border-purple-200">
               {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
               Sửa lỗi LaTeX
            </button>
            <button onClick={onClose} className="p-2 text-orange-500 hover:bg-orange-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-gray-50/50">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg">Loại: {localQuestion.question_type}</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-lg">Mức độ: {localQuestion.difficulty}</span>
          </div>

          <div className="text-gray-800 text-base font-medium leading-relaxed mb-6">
            {renderContent(localQuestion.content)}
            {localQuestion.image_url && (
              <div className="my-4 text-center">
                <img src={localQuestion.image_url} alt="Minh họa" className="max-w-full h-auto max-h-64 rounded-lg shadow-sm mx-auto border border-gray-200" />
              </div>
            )}
          </div>

          {(localQuestion.question_type === 'TN' || localQuestion.question_type === 'NLC' || localQuestion.question_type === 'DS') && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {['a', 'b', 'c', 'd'].map(opt => {
                const val = localQuestion[`option_${opt}`] || localQuestion[`answer_${opt}`];
                if (!val) return null;
                const isDS = localQuestion.question_type === 'DS';
                return (
                  <div key={opt} className="flex gap-2 p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="font-bold text-indigo-600">{isDS ? `${opt})` : `${opt.toUpperCase()}.`}</span>
                    <div className="flex-1">{renderContent(val)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {localQuestion.correct_answer && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
              <h4 className="font-bold text-emerald-800 mb-1 text-sm">Đáp án đúng:</h4>
              <p className="text-emerald-700 font-black text-xl">{localQuestion.correct_answer}</p>
            </div>
          )}

          {localQuestion.explanation && (() => {
            let methodText = "";
            let explanationText = localQuestion.explanation;

            const lowerExp = localQuestion.explanation.toLowerCase();
            const ppIndex = lowerExp.indexOf("phương pháp giải:");
            const ppIndex2 = lowerExp.indexOf("phương pháp giải");
            const lgIndex = lowerExp.indexOf("lời giải:");
            const lgIndex2 = lowerExp.indexOf("lời giải");

            let startPP = -1;
            let startLG = -1;

            if (ppIndex !== -1) startPP = ppIndex + "phương pháp giải:".length;
            else if (ppIndex2 !== -1) startPP = ppIndex2 + "phương pháp giải".length;

            if (lgIndex !== -1) startLG = lgIndex;
            else if (lgIndex2 !== -1 && lgIndex2 > startPP) startLG = lgIndex2;

            if (startPP !== -1 && startLG !== -1 && startPP < startLG) {
              methodText = localQuestion.explanation.substring(startPP, startLG).trim();
              let lgOffset = lgIndex !== -1 ? "lời giải:".length : "lời giải".length;
              explanationText = localQuestion.explanation.substring(startLG + lgOffset).trim();
            } else if (startPP !== -1 && startLG === -1) {
              methodText = localQuestion.explanation.substring(startPP).trim();
              explanationText = "";
            } else if (startPP === -1 && startLG !== -1) {
              let lgOffset = lgIndex !== -1 ? "lời giải:".length : "lời giải".length;
              explanationText = localQuestion.explanation.substring(startLG + lgOffset).trim();
            }

            methodText = methodText.replace(/^\*\*/, "");
            explanationText = explanationText.replace(/^\*\*/, "");

            return (
              <div className="space-y-4">
                {methodText && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span> Phương pháp giải:
                    </h4>
                    <div className="text-blue-900 text-sm">
                      {renderContent(methodText)}
                    </div>
                  </div>
                )}
                {explanationText && (
                  <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-gray-500 rounded-full"></span> Lời giải chi tiết:
                    </h4>
                    <div className="text-gray-700 text-sm">
                      {renderContent(explanationText)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
