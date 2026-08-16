"use client";

import React from "react";
import { CheckCircle2, Image as ImageIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { unifiedMarkdownComponents as customMarkdownComponents, preprocessMarkdown } from "@/components/CustomMarkdownComponents";

/**
 * Thẻ hiển thị Xem trước câu hỏi dùng CHUNG cho cả Ngân hàng câu hỏi
 * (PreviewQuestionModal) và Luyện tập (BlockEditor). Trước đây hai nơi
 * tự vẽ preview riêng, lệch nhau về giao diện lẫn cách xử lý LaTeX -
 * gộp lại một chỗ để đồng bộ và tránh lặp lại lỗi cũ (sửa chỗ này quên
 * chỗ kia).
 */

export interface PreviewStatement {
  key: string;
  label: string;
  content: string;
  /** Dùng cho dạng chọn 1 đáp án (trắc nghiệm) - true nếu là đáp án đúng */
  isCorrect?: boolean;
  /** Dùng cho dạng Đúng/Sai từng mệnh đề - true/false nếu đã biết, undefined nếu chưa xác định */
  isTrue?: boolean;
}

export interface QuestionPreviewBadge {
  label: string;
  value: string;
  color?: 'blue' | 'purple' | 'teal' | 'orange' | 'pink';
}

export interface QuestionPreviewCardProps {
  content: string;
  imageUrl?: string;
  badges?: QuestionPreviewBadge[];
  statements?: PreviewStatement[];
  statementsLayout?: 'choice' | 'truefalse';
  correctAnswerDisplay?: string;
  explanation?: string;
  size?: 'md' | 'lg';
  className?: string;
}

const BADGE_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  teal: 'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
  pink: 'bg-pink-100 text-pink-800',
};

/** Sửa các cú pháp LaTeX/Markdown hay gặp lỗi (bảng tabular, môi trường center, số thứ tự đầu dòng...) trước khi đưa qua ReactMarkdown. */
function preprocessLatexQuirks(text: string): string {
  if (!text) return "";
  let processed = String(text);

  processed = processed.replace(/^(\d+)\.\s*$/gm, '$1\\.');
  processed = processed.replace(/\\begin\{center\}/g, '').replace(/\\end\{center\}/g, '');

  processed = processed.replace(/\\begin\{tabular\}(\{[^}]*\})/g, '$$$$ \\begin{array}$1');
  processed = processed.replace(/\\end\{tabular\}/g, '\\end{array} $$$$');
  processed = processed.replace(/(\$\$\s*\\begin\{array\}[^]*?\\end\{array\}\s*\$\$)/g, (match) => {
    let inner = match.substring(2, match.length - 2);
    inner = inner.replace(/\$/g, '');
    return `$$$$${inner}$$$$`;
  });

  return processed;
}

/** Tách "Phương pháp giải" / "Lời giải chi tiết" ra khỏi 1 khối text lời giải thô, nếu có đánh dấu rõ ràng. */
function splitExplanation(raw: string): { methodText: string; explanationText: string } {
  let methodText = "";
  let explanationText = raw;

  const lower = raw.toLowerCase();
  const ppIndex = lower.indexOf("phương pháp giải:");
  const ppIndex2 = lower.indexOf("phương pháp giải");
  const lgIndex = lower.indexOf("lời giải:");
  const lgIndex2 = lower.indexOf("lời giải");

  let startPP = -1;
  let startLG = -1;
  if (ppIndex !== -1) startPP = ppIndex + "phương pháp giải:".length;
  else if (ppIndex2 !== -1) startPP = ppIndex2 + "phương pháp giải".length;

  if (lgIndex !== -1) startLG = lgIndex;
  else if (lgIndex2 !== -1 && lgIndex2 > startPP) startLG = lgIndex2;

  if (startPP !== -1 && startLG !== -1 && startPP < startLG) {
    methodText = raw.substring(startPP, startLG).trim();
    const lgOffset = lgIndex !== -1 ? "lời giải:".length : "lời giải".length;
    explanationText = raw.substring(startLG + lgOffset).trim();
  } else if (startPP !== -1 && startLG === -1) {
    methodText = raw.substring(startPP).trim();
    explanationText = "";
  } else if (startPP === -1 && startLG !== -1) {
    const lgOffset = lgIndex !== -1 ? "lời giải:".length : "lời giải".length;
    explanationText = raw.substring(startLG + lgOffset).trim();
  }

  methodText = methodText.replace(/^\*\*/, "");
  explanationText = explanationText.replace(/^\*\*/, "");
  return { methodText, explanationText };
}

export default function QuestionPreviewCard({
  content,
  imageUrl,
  badges = [],
  statements = [],
  statementsLayout = 'choice',
  correctAnswerDisplay,
  explanation,
  size = 'md',
  className = '',
}: QuestionPreviewCardProps) {
  const isLg = size === 'lg';

  /** Ảnh chèn giữa markdown (```![Hình minh họa](url)```) trôi lẫn với chữ nếu dùng
   *  thẻ <img> mặc định - bọc lại thành 1 khối riêng, cùng kiểu khung với ảnh truyền
   *  qua prop imageUrl để hai đường chèn ảnh (markdown lẫn prop riêng) trông giống nhau. */
  const markdownComponents = {
    ...customMarkdownComponents,
    img: ({ src, alt }: any) => (
      <span className="not-prose my-4 flex flex-col items-center gap-1.5">
        <img src={src} alt={alt || 'Hình minh họa'} className={`max-w-full h-auto rounded-lg shadow-sm border border-gray-200 ${isLg ? 'max-h-96' : 'max-h-64'}`} />
        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
          <ImageIcon className="w-3 h-3" /> {alt || 'Hình minh họa'}
        </span>
      </span>
    ),
  };

  const renderRich = (text: string, extraProseClass = '') => {
    const cleaned = String(text || '').replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '');
    let formatted = preprocessMarkdown(preprocessLatexQuirks(cleaned));
    formatted = formatted.replace(/\\n/g, '\n').replace(/^(?:\*\*)?Hướng\s+dẫn\s+giải:?(?:\*\*)?\s*/gim, '');
    return (
      <div className={`prose ${isLg ? 'prose-base' : 'prose-sm'} max-w-none break-words prose-p:my-1 leading-relaxed text-gray-800 overflow-x-auto
        [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto ${extraProseClass}`}>
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
          {formatted}
        </ReactMarkdown>
      </div>
    );
  };

  const { methodText, explanationText } = explanation ? splitExplanation(explanation) : { methodText: '', explanationText: '' };

  return (
    <div className={`${className} space-y-5`}>
      {badges.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {badges.map((b, i) => (
            <span key={i} className={`px-3 py-1 font-bold text-xs rounded-lg ${BADGE_COLORS[b.color || 'blue']}`}>
              {b.label}: {b.value}
            </span>
          ))}
        </div>
      )}

      <div className={`text-gray-800 font-medium leading-relaxed ${isLg ? 'text-lg' : 'text-base'}`}>
        {renderRich(content || "*(Chưa có nội dung)*")}
        {imageUrl && (
          <div className="my-4 flex flex-col items-center gap-1.5">
            <img src={imageUrl} alt="Hình minh họa" className={`max-w-full h-auto rounded-lg shadow-sm border border-gray-200 ${isLg ? 'max-h-96' : 'max-h-64'}`} />
            <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
              <ImageIcon className="w-3 h-3" /> Hình minh họa
            </span>
          </div>
        )}
      </div>

      {statements.length > 0 && statementsLayout === 'choice' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {statements.map(st => (
            <div key={st.key} className={`relative flex gap-3 p-3 rounded-xl border transition-colors ${
              st.isCorrect ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-gray-200'
            }`}>
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                st.isCorrect ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {st.label}
              </span>
              <div className="flex-1 min-w-0">{renderRich(st.content)}</div>
              {st.isCorrect && (
                <span className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> Đúng
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {statements.length > 0 && statementsLayout === 'truefalse' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {statements.map(st => (
            <div key={st.key} className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-indigo-600 text-sm">Mệnh đề {st.label.toUpperCase()}</span>
                {typeof st.isTrue === 'boolean' && (
                  st.isTrue
                    ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ ĐÚNG</span>
                    : <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">✕ SAI</span>
                )}
              </div>
              <div className="flex-1 text-sm">{renderRich(st.content)}</div>
            </div>
          ))}
        </div>
      )}

      {correctAnswerDisplay && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
          <h4 className="font-bold text-emerald-800 mb-1 text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-600 rounded-full"></span> Đáp án đúng:
          </h4>
          <div className="text-emerald-700 font-black text-xl">{renderRich(correctAnswerDisplay)}</div>
        </div>
      )}

      {(methodText || explanationText) && (
        <div className="space-y-4">
          {methodText && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span> Phương pháp giải:
              </h4>
              <div className="text-blue-900 text-sm">{renderRich(methodText)}</div>
            </div>
          )}
          {explanationText && (
            <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-gray-500 rounded-full"></span> Lời giải chi tiết:
              </h4>
              <div className="text-gray-700 text-sm">{renderRich(explanationText)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
