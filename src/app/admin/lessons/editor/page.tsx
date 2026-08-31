"use client";

import Link from "next/link";

import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { chuyenDiaChiAnh } from '@/components/CustomMarkdownComponents';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import { fixLatexText, applyLatexFixToActiveElement , cleanObjectLatex } from "@/utils/latexFixer";
import { latexToDocxElement } from "@/utils/latexToDocxMath";
import 'katex/dist/katex.min.css';
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactCrop, { type Crop } from 'react-image-crop';
import BlockEditor, { Block } from "./BlockEditor";
import PushToBankModal from './PushToBankModal';
import 'react-image-crop/dist/ReactCrop.css';
import confetti from 'canvas-confetti';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { fetchImageWithDimensions, base64ToUint8Array } from "@/utils/exportDocx";
import { IMAGE_NEEDED_REGEX, IMAGE_PLACEHOLDER_STRIP_REGEX, callGeminiWithKeyFallback, filesToGeminiParts } from "@/utils/aiQuestionScan";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import { autoCropImage, uploadSourceImage, cropImageFromBoundingBox, uploadCroppedImage, type NormalizedBox } from "@/utils/autoCropImage";
import { thamDinhVaVeLai, svgSangPng, chamDoNetTuBlob } from "@/utils/veLaiHinhAI";
import { chuanHoaNguonThanhAnh, laFilePdf } from "@/utils/pdfToImages";
import { LUAT_KHONG_CAT_CUT, soatKhoiQuiz, lenhNoiTiep } from "@/utils/noiTiepJson";
import { docJsonCauHoi } from "@/utils/vaJson";
import HuongDanSoanBaiModal from "@/components/admin/HuongDanSoanBaiModal";
import { ArrowLeft, HelpCircle, Save, Sparkles, Image as ImageIcon, Key, Loader2, RefreshCw, Video, Link as LinkIcon, FileText, X, CropIcon, Upload, ChevronLeft, ChevronRight, Maximize2, Minimize2, MonitorPlay, Presentation, CheckCircle2, XCircle, Edit2, Download, PlayCircle, Eye, ChevronRightCircle, RefreshCcw, Bot, Copy, Code2, ListTodo, ChevronUp, ChevronDown, AlertTriangle, Database, UploadCloud } from "lucide-react";

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

// --- INTERACTIVE QUIZ COMPONENT ---
const playSound = (type: 'correct' | 'wrong') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch(e) {}
};

const InteractiveQuiz = ({ data, onPass, onEditCrop }: { data: any, onPass: () => void, onEditCrop?: (meta: any) => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [essayImage, setEssayImage] = useState<File | null>(null);
  const [essayImageUrl, setEssayImageUrl] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [serverId, setServerId] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(null);
    setIsCorrect(null);
    setShortAnswerText("");
    setEssayImage(null);
    setEssayImageUrl(null);
    setFeedback(null);
  }, [data]);

  const type = data.type || "multiple_choice";

  const handleSelect = (index: number) => {
    if (isCorrect !== null) return;
    setSelected(index);
    const correct = index === data.answerIndex;
    setIsCorrect(correct);
    if (correct) onPass();
  };

  const handleCheckShortAnswer = () => {
    if (!shortAnswerText.trim() || isCorrect !== null) return;
    let normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const correct = normalize(shortAnswerText) === normalize(data.answerText || "");
    setIsCorrect(correct);
    if (correct) onPass();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEssayImage(file);
      const url = URL.createObjectURL(file);
      setEssayImageUrl(url);
    }
  };

  const handleGradeEssay = async () => {
    if (!essayImage) return;
    setIsGrading(true);
    setTimeout(() => {
      setIsGrading(false);
      setIsCorrect(true);
      setFeedback("Bài làm tốt, rõ ràng. Phương pháp giải chính xác. \n\n**Điểm: 9.5/10**");
      onPass();
    }, 2000);
  };

  const renderQuizContent = (content: string) => {
    return (
      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:my-2 prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-img:rounded-xl prose-img:shadow-md">
        <ReactMarkdown urlTransform={chuyenDiaChiAnh}
          remarkPlugins={[remarkMath, remarkBreaks]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
        table: ({node, style, children, ...props}: any) => (
            <div className="overflow-x-auto my-6 not-prose">
                <table className="w-full text-left border-collapse border-2 border-slate-400 text-base" style={style} {...props}>
                    {children}
                </table>
            </div>
        ),
        thead: ({node, style, children, ...props}: any) => <thead className="bg-slate-100 font-bold" style={style} {...props}>{children}</thead>,
        tbody: ({node, style, children, ...props}: any) => <tbody className="bg-white" style={style} {...props}>{children}</tbody>,
        tr: ({node, style, children, ...props}: any) => <tr className="hover:bg-slate-50 transition-colors" style={style} {...props}>{children}</tr>,
        th: ({node, style, children, ...props}: any) => <th className="px-4 py-2 border-2 border-slate-400 text-slate-800 font-bold" style={style} {...props}>{children}</th>,
        td: ({node, style, children, ...props}: any) => <td className="px-4 py-2 border-2 border-slate-400 text-slate-700 align-top" style={style} {...props}>{children}</td>,
             span: ({node, style, children, ...props}: any) => {
                 let parsedStyle: any = {};
                 if (typeof style === 'string') {
                     style.split(';').forEach((rule: string) => {
                         const [key, val] = rule.split(':');
                         if (key && val) {
                             const camelKey = key.trim().replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());
                             parsedStyle[camelKey] = val.trim();
                         }
                     });
                 } else if (style) {
                     parsedStyle = style;
                 }
                 return <span style={parsedStyle} {...props}>{children}</span>;
             },
             img({node, ...props}) {
               return <img {...props} className="max-h-64 object-contain rounded-lg shadow-sm border border-slate-200 mx-auto my-4" />
             }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 mb-6 shadow-sm not-prose animate-in zoom-in-95 duration-500 origin-center overflow-hidden flex flex-col">
      {/* Admin Header (Chỉ có ở bản Admin) */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm">
               <ListTodo className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-700 text-sm">
               {type === "multiple_choice" ? "Trắc nghiệm 4 lựa chọn" : type === "true_false" ? "Đúng / Sai" : type === "short_answer" ? "Trả lời ngắn" : "Tự luận"}
            </span>
         </div>
      </div>

      {/* Phần Đề Bài */}
      <div className="p-5 md:p-6 bg-white flex flex-col relative border-b-4 border-[#0e6263]">
        <div className="absolute top-4 right-6 opacity-[0.03] pointer-events-none">
          <span className="text-[100px] leading-none">📝</span>
        </div>

        {data.autoCropMetadata && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in relative z-10">
            <span className="flex items-center gap-2 font-medium text-sm"><AlertTriangle className="w-5 h-5"/> AI đã tự động cắt ảnh đồ thị.</span>
            <button onClick={() => onEditCrop && onEditCrop(data.autoCropMetadata)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-sm font-bold hover:bg-yellow-600 transition-colors text-xs flex items-center gap-1.5 shrink-0"><CropIcon className="w-4 h-4" /> Bấm để xem / Cắt lại</button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-8 h-8 bg-[#f0f9ff] text-[#0e6263] rounded-lg flex items-center justify-center font-bold border border-teal-100 shadow-sm">
            <span className="text-sm">Q</span>
          </div>
          <h3 className="text-[15px] font-bold text-slate-700 tracking-wide">Nội dung câu hỏi</h3>
        </div>

        <div className="text-[17px] font-medium text-slate-800 leading-relaxed relative z-10">
          {renderQuizContent(data.question)}
        </div>
      </div>

      {/* Phần Khung điền đáp án */}
      <div className="p-5 md:p-6 bg-slate-50/50 flex flex-col relative z-20">
        {type === "true_false_cluster" && (
          <div className="flex flex-col gap-4 w-full">
            <div className="text-sm font-medium text-teal-800 bg-teal-50 px-4 py-3 rounded-xl border border-teal-100 flex items-center gap-2 shadow-sm">
               <ListTodo className="w-5 h-5 shrink-0"/>
               Barem 2025: Học sinh chọn ĐÚNG hoặc SAI cho từng mệnh đề độc lập.
            </div>
            {(data.options || data.statements || []).map((stmt: any, i: number) => {
              return (
                 <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 bg-white border-slate-200 shadow-sm">
                    <div className="flex items-start gap-3">
                       <div className="font-bold text-slate-500 w-6">{(['A','B','C','D'][i] || 'A')}.</div>
                       <div className="flex-1 min-w-0 overflow-hidden text-[15px] font-medium">{renderQuizContent(stmt.content || stmt.text)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                       <button disabled className="px-4 py-2 font-bold rounded-lg text-sm border-2 bg-white text-slate-400 border-slate-200 cursor-not-allowed">ĐÚNG</button>
                       <button disabled className="px-4 py-2 font-bold rounded-lg text-sm border-2 bg-white text-slate-400 border-slate-200 cursor-not-allowed">SAI</button>
                    </div>
                 </div>
              );
            })}
          </div>
        )}

        {(type === "multiple_choice" || type === "true_false") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {data.options?.map((opt: string, i: number) => {
              const isSelected = selected === i;
              let isCorrectOpt = false;
              let isWrongOpt = false;
              if (isCorrect !== null) {
                 if (i === data.answerIndex) isCorrectOpt = true;
                 else if (isSelected && i !== data.answerIndex) isWrongOpt = true;
              }

              let btnClass = "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-[#0e6263]/50 shadow-sm";
              let iconClass = "bg-slate-100 text-[#0e6263] border-slate-200";
              let scaleClass = "scale-100 hover:scale-[1.01]";

              if (isSelected) {
                btnClass = "bg-[#f0f9ff] border-[#3b82f6] shadow-md z-10";
                iconClass = "bg-white/20 text-[#3b82f6] border-[#3b82f6] shadow-inner";
              }
              if (isCorrectOpt) {
                btnClass = "bg-[#0e6263] text-white border-[#0e6263] shadow-md z-10";
                iconClass = "bg-white/20 text-white border-transparent shadow-inner";
                scaleClass = "scale-[1.02]";
              }
              if (isWrongOpt) {
                btnClass = "bg-rose-50 text-rose-700 border-rose-500 shadow-md animate-shake z-10";
                iconClass = "bg-rose-500 text-white border-rose-500 shadow-inner";
                scaleClass = "scale-[0.98]";
              }

              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={isCorrect !== null} className={`text-left p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 w-full ${btnClass} ${scaleClass} ${isCorrect !== null ? 'cursor-default' : 'cursor-pointer'}`}>
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold shrink-0 transition-colors text-base shadow-sm font-serif ${iconClass}`}>
                    {type === "true_false" ? (i === 0 ? "Đ" : "S") : ['A', 'B', 'C', 'D'][i]}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden text-[15px] font-medium">{renderQuizContent(opt)}</div>
                </button>
              );
            })}
          </div>
        )}

        {type === "short_answer" && (
          <div className="flex flex-col gap-4 w-full max-w-xl mx-auto mt-2">
            <input
              type="text"
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              disabled={isCorrect !== null}
              placeholder="Nhập đáp án của bạn..."
              className={`w-full px-5 py-4 rounded-xl border-2 focus:ring-4 text-center text-xl font-bold outline-none transition-all shadow-inner ${isCorrect === true ? 'bg-[#ecfdf5] border-[#10b981] text-[#10b981]' : isCorrect === false ? 'bg-[#fff1f2] border-[#f43f5e] text-[#f43f5e]' : 'bg-white border-slate-300 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20 text-slate-700'}`}
            />
            <button
              onClick={handleCheckShortAnswer}
              disabled={isCorrect !== null || !shortAnswerText.trim()}
              className="w-full bg-[#3b82f6] text-white px-4 py-4 rounded-xl font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              Kiểm tra đáp án
            </button>
          </div>
        )}

        {type === "essay" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto mt-2">
            <p className="text-slate-500 text-sm text-center font-medium leading-relaxed">
              Giải ra nháp, chụp ảnh và tải lên đây để AI chấm.
            </p>

            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*, application/pdf, .docx" capture="environment" className="hidden" />

            {essayImageUrl && (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner group">
                <img src={essayImageUrl} alt="Bài làm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {isCorrect === true && <div className="absolute inset-0 border-4 border-[#10b981] rounded-xl pointer-events-none"></div>}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isCorrect !== null}
              className="w-full bg-white border-2 border-indigo-200 text-indigo-700 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" /> {essayImage ? "Đổi ảnh" : "Chọn ảnh"}
            </button>

            <select
              value={serverId}
              onChange={e => setServerId(Number(e.target.value))}
              disabled={isCorrect !== null}
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium text-sm outline-none focus:border-indigo-500"
            >
              <option value={1}>Máy AI 1</option>
              <option value={2}>Máy AI 2</option>
              <option value={3}>Máy AI 3</option>
            </select>

            {essayImage && (
              <button
                onClick={handleGradeEssay}
                disabled={isGrading || isCorrect === true}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-sm"
              >
                {isGrading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang chấm...</> : <><Sparkles className="w-4 h-4" /> Chấm điểm</>}
              </button>
            )}

            {feedback && (
              <div className="w-full mt-2 p-5 bg-white border-2 border-indigo-100 rounded-xl shadow-sm overflow-hidden">
                <h4 className="font-bold text-sm mb-3 text-indigo-700 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Trợ giảng AI nhận xét:
                </h4>
                <div className="text-[15px] text-slate-700">{renderQuizContent(feedback)}</div>
              </div>
            )}
          </div>
        )}

        {/* Lời giải (Chỉ hiện khi trả lời đúng) */}
        {isCorrect && data.sampleAnswer && (
          <div className="mt-8 bg-emerald-50/50 border border-emerald-100 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
            <div className="bg-emerald-100/60 px-5 py-3 border-b border-emerald-100 flex items-center gap-2 font-bold text-emerald-800">
              <Key className="w-5 h-5 text-emerald-600"/> Lời giải chi tiết
            </div>
            <div className="p-6 text-emerald-900 leading-relaxed text-[15px] md:text-base">
              {renderQuizContent(data.sampleAnswer)}
            </div>
          </div>
        )}

        {/* Cảnh báo Đúng / Sai */}
        {isCorrect === true && !data.sampleAnswer && (
          <div className="mt-8 p-4 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-500 border border-emerald-200 w-full justify-center shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" /> Xuất sắc! Bạn đã trả lời đúng.
          </div>
        )}
        {isCorrect === false && (
          <div className="mt-8 p-4 bg-rose-50 text-rose-700 rounded-xl font-bold text-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 border border-rose-200 w-full justify-center shadow-sm">
            <XCircle className="w-6 h-6 text-rose-500" /> {type === 'essay' ? 'Bài làm của bạn còn thiếu sót, hãy đọc nhận xét nhé!' : 'Chưa chính xác, hãy thử lại!'}
          </div>
        )}
      </div>
    </div>
  );
};




const VisualQuizEditor = ({ quizzes, onUpdateQuiz, onTriggerCrop }: { quizzes: any[], onUpdateQuiz: (index: number, quiz: any) => void, onTriggerCrop: (index: number) => void }) => {
  return (
    <div className="flex flex-col gap-6 p-4 h-full overflow-y-auto bg-gray-100">
       {quizzes.length === 0 && (
         <div className="p-10 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <ListTodo className="w-16 h-16 text-teal-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có câu hỏi nào!</h3>
            <p>Vui lòng chuyển sang Tab <b>Nhập liệu AI (Dán Đề)</b> để tự động biên soạn từ ảnh.</p>
         </div>
       )}
       {quizzes.map((quiz, idx) => {
         const type = quiz.type || 'multiple_choice';
         return (
           <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
             {((/(?:\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\])/i.test(quiz.question || '')) || (quiz.options && quiz.options.some((o: any) => typeof o === 'string' && /(?:\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\])/i.test(o))) || (/(?:\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\])/i.test(quiz.sampleAnswer || ''))) && (
               <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-bold">Cảnh báo: Phát hiện hình ảnh / biểu đồ ở câu hỏi này!</span>
                  </div>
                  <button onClick={() => onTriggerCrop(idx)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center gap-1.5"><CropIcon className="w-3.5 h-3.5" /> Bấm để Cắt & Chèn Ảnh</button>
               </div>
             )}
             <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-teal-800 text-lg flex items-center gap-2"><div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm">{idx + 1}</div> Câu hỏi {idx + 1}</span>
                <select value={type} onChange={e => onUpdateQuiz(idx, { ...quiz, type: e.target.value })} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                   <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                   <option value="true_false">Đúng / Sai</option>\n                   <option value="true_false_cluster">Đúng / Sai Cụm (4 Ý)</option>
                   <option value="short_answer">Trả lời ngắn / Điền khuyết</option>
                   <option value="essay">Tự luận / Trình bày chi tiết</option>
                </select>
             </div>
             <div className="p-5 flex flex-col gap-5">
                <div>
                   <div className="flex justify-between items-end mb-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nội dung đề bài (Hỗ trợ Markdown / LaTeX)</label>
                     <button onClick={() => onTriggerCrop(idx)} className="text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-orange-100"><CropIcon className="w-3.5 h-3.5"/> Cắt & chèn ảnh</button>
                   </div>
                   <textarea rows={3} value={quiz.question || ""} onChange={e => onUpdateQuiz(idx, { ...quiz, question: e.target.value })} placeholder="VD: Tìm x biết $2x = 4$" className="w-full border border-gray-200 rounded-xl p-3 text-[15px] focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-mono" />
                </div>

                {type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {[0,1,2,3].map(optIdx => (
                       <div key={optIdx} className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-gray-600 flex items-center gap-2 cursor-pointer w-max">
                             <input type="radio" name={`ans_${idx}`} checked={quiz.answerIndex === optIdx} onChange={() => onUpdateQuiz(idx, { ...quiz, answerIndex: optIdx })} className="w-4 h-4 text-teal-600 focus:ring-teal-500" />
                             Đáp án {['A','B','C','D'][optIdx]} {quiz.answerIndex === optIdx && <span className="text-teal-600 ml-1">(Đúng)</span>}
                          </label>
                          <textarea rows={2} value={quiz.options?.[optIdx] || ""} onChange={e => {
                             const newOpts = [...(quiz.options || ["","","",""])];
                             newOpts[optIdx] = e.target.value;
                             onUpdateQuiz(idx, { ...quiz, options: newOpts });
                          }} className={`w-full border rounded-xl p-3 text-[15px] outline-none transition-all font-mono ${quiz.answerIndex === optIdx ? 'border-teal-400 bg-teal-50/30' : 'border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10'}`} />
                       </div>
                     ))}
                  </div>
                )}

                {type === 'true_false_cluster' && (
                  <div className="flex flex-col gap-4">
                     {(quiz.statements || [
                        {text: '', isTrue: true},
                        {text: '', isTrue: false},
                        {text: '', isTrue: false},
                        {text: '', isTrue: false}
                     ]).map((stmt: any, sIdx: number) => (
                       <div key={sIdx} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2 w-full md:w-[130px] shrink-0">
                             <label className="text-sm font-bold text-teal-700 w-6">{['a)','b)','c)','d)'][sIdx]}</label>
                             <select value={stmt.isTrue ? "true" : "false"} onChange={e => {
                                const newStmts = [...(quiz.statements || [])];
                                newStmts[sIdx] = { ...newStmts[sIdx], isTrue: e.target.value === "true" };
                                onUpdateQuiz(idx, { ...quiz, statements: newStmts });
                             }} className={`flex-1 text-sm border-2 rounded-lg px-2 py-1.5 outline-none font-bold ${stmt.isTrue ? 'border-green-500 text-green-700 bg-green-50' : 'border-red-400 text-red-600 bg-red-50'}`}>
                                <option value="true">ĐÚNG</option>
                                <option value="false">SAI</option>
                             </select>
                          </div>
                          <textarea rows={1} value={stmt.text || ""} onChange={e => {
                             const newStmts = [...(quiz.statements || [])];
                             newStmts[sIdx] = { ...newStmts[sIdx], text: e.target.value };
                             onUpdateQuiz(idx, { ...quiz, statements: newStmts });
                          }} className="w-full flex-1 border border-gray-200 rounded-lg p-2.5 text-[14px] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-mono" placeholder="Nhập mệnh đề..." />
                       </div>
                     ))}
                  </div>
                )}

                {type === 'true_false' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[0,1].map(optIdx => (
                       <div key={optIdx} className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-gray-600 flex items-center gap-2 cursor-pointer w-max">
                             <input type="radio" name={`ans_${idx}`} checked={quiz.answerIndex === optIdx} onChange={() => onUpdateQuiz(idx, { ...quiz, answerIndex: optIdx })} className="w-4 h-4 text-teal-600 focus:ring-teal-500" />
                             Đáp án {['Đúng','Sai'][optIdx]} {quiz.answerIndex === optIdx && <span className="text-teal-600 ml-1">(Chuẩn)</span>}
                          </label>
                          <textarea rows={2} value={quiz.options?.[optIdx] || ""} onChange={e => {
                             const newOpts = [...(quiz.options || ["",""])];
                             newOpts[optIdx] = e.target.value;
                             onUpdateQuiz(idx, { ...quiz, options: newOpts });
                          }} className={`w-full border rounded-xl p-3 text-[15px] outline-none transition-all font-mono ${quiz.answerIndex === optIdx ? 'border-teal-400 bg-teal-50/30' : 'border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10'}`} />
                       </div>
                     ))}
                  </div>
                )}

                {type === 'short_answer' && (
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Đáp án đúng chính xác (Text/Số)</label>
                     <input type="text" value={quiz.exactAnswer || ""} onChange={e => onUpdateQuiz(idx, { ...quiz, exactAnswer: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 text-[15px] focus:border-teal-500 outline-none font-bold text-teal-700 bg-gray-50 focus:bg-white transition-all" placeholder="VD: 5, hoặc: Vô nghiệm" />
                  </div>
                )}

                {type === 'essay' && (
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Hướng dẫn giải / Đáp án mẫu (Dùng để AI tự động chấm bài sinh viên)</label>
                     <textarea rows={4} value={quiz.sampleAnswer || ""} onChange={e => onUpdateQuiz(idx, { ...quiz, sampleAnswer: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 text-[15px] focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-mono" placeholder="Ghi chi tiết các bước giải, barem điểm..." />
                  </div>
                )}

             </div>
           </div>
         );
       })}
    </div>
  );
};





/**
 * Cứu một khối CHỮ thực ra là khối câu hỏi bị hỏng rào mã.
 *
 * Dán từ Gemini về hay gặp: câu trả lời bị cắt cụt nên thiếu dấu \`\`\` đóng, hoặc dán
 * hai đợt liền nhau thành số dấu rào lẻ. Khi đó bộ tách khối không nhận ra đây là câu
 * hỏi, đẩy nguyên đoạn JSON thành khối Văn bản - trên màn hiện ra một đống
 * "type": "multiple_choice"... và công thức vỡ hết (\\ge thành "ge", \\frac thành "frac").
 *
 * Ở đây gỡ rào, vá JSON bằng đúng bộ vá đang dùng cho đường quét AI, rồi trả về danh
 * sách câu. Chỉ nhận khi đọc ra câu có đủ "type" và "question" - khối lý thuyết lỡ có
 * đoạn JSON minh hoạ thì không bị bắt nhầm.
 */
const cuuKhoiQuizHong = (txt: string): any[] | null => {
    const t = String(txt || '').trim();
    if (!/"question"\s*:/.test(t) || !/"type"\s*:/.test(t)) return null;

    const than = t
        .replace(/^`{3,}\s*(?:quiz|json)?\s*/i, '')   // rào mở còn sót
        .replace(/^(?:quiz|json)\s*/i, '')            // chữ "quiz" trơ lại sau khi rào bị ăn
        .replace(/`{3,}\s*$/, '')                     // rào đóng còn sót
        .trim();

    try {
        const kq = docJsonCauHoi(than);
        const items = kq.items.filter((x: any) => x && x.type && x.question);
        return items.length > 0 ? items : null;
    } catch {
        return null;
    }
};

const parseMarkdownToBlocks = (content: string): Block[] => {
    if (!content) return [];

    const trimmed = content.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
            let data = JSON.parse(trimmed);
            data = cleanObjectLatex(data);
            if (Array.isArray(data)) {
                const res: Block[] = [];
                data.forEach(item => {
                    if (item.question) {
                        item.question = item.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
                    }
                    res.push({ id: Math.random().toString(36).substring(7), type: 'quiz', content: item });
                });
                return res;
            } else if (data.type) {
                if (data.question) {
                    data.question = data.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
                }
                return [{ id: Math.random().toString(36).substring(7), type: 'quiz', content: data }];
            }
        } catch(e) {
            // Ignore and fall through to regex parsing
        }
    }

    const res: Block[] = [];

    /* Mọi đoạn sắp thành khối CHỮ đều thử cứu trước: đoạn nào thực ra là câu hỏi bị hỏng
       rào mã thì đổi thành khối câu hỏi đàng hoàng, chứ không bắt Thầy cô nhìn JSON thô. */
    const themKhoiChu = (ra: Block[], txt: string) => {
        const cuu = cuuKhoiQuizHong(txt);
        if (cuu) {
            cuu.forEach((item) => {
                if (item.question) item.question = item.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
                ra.push({ id: Math.random().toString(36).substring(7), type: 'quiz', content: cleanObjectLatex(item) });
            });
            return;
        }
        ra.push({ id: Math.random().toString(36).substring(7), type: 'md', content: txt });
    };

    const regex = /```(?:quiz|json)[ \t]*\r?\n([\s\S]*?)\r?\n```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
          const txt = content.substring(lastIndex, match.index).trim();
          if (txt) themKhoiChu(res, txt);
      }
      try {
          let rawJson = match[1].replace(/\n$/, '');
          let data;

          // Thử parse THẲNG trước tiên. Nội dung đã lưu đúng (qua JSON.stringify chuẩn
          // ở serializeBlocksToMarkdown) sẽ parse thành công ngay ở bước này.
          try {
              data = JSON.parse(rawJson);
          } catch {
              // Chỉ khi parse thẳng thất bại (dấu hiệu AI quên nhân đôi dấu \ lúc mới
              // sinh nội dung) mới áp dụng phục hồi escape. Bắt buộc kèm (?<!\\) để KHÔNG
              // đụng vào các cặp \\ đã đúng sẵn - trước đây thiếu điều kiện này nên mỗi
              // lần MỞ LẠI một bài đã lưu đúng, bộ phục hồi lại nhân ba dấu \ (\\forall
              // -> \\\forall), khiến JSON.parse biến \f thành ký tự điều khiển và công
              // thức hiện lỗi "\orall" dù dữ liệu trong CSDL vẫn hoàn toàn đúng.
              const recovered = rawJson
                  .replace(/(?<!\\)\\n(?=eq|otin|exists|eg|abla|u|i|earrow|atural|parallel)/g, '\\\\n')
                  .replace(/(?<!\\)\\r(?=ightarrow|ho|angle)/g, '\\\\r')
                  .replace(/(?<!\\)\\t(?=imes|heta|riangle|ext)/g, '\\\\t')
                  .replace(/(?<!\\)\\b(?=egin)/g, '\\\\b')
                  .replace(/(?<!\\)\\f(?=rac|orall)/g, '\\\\f')
                  .replace(/(?<!\\)\\e(?=nd)/g, '\\\\e');

              try {
                  data = JSON.parse(recovered);
              } catch(e1) {
                  // Thử vá lỗi JSON bị AI cắt cụt do vượt max token
                  let patchedJson = recovered.trim();
                  if (patchedJson.endsWith(',')) patchedJson = patchedJson.slice(0, -1);
                  if (patchedJson.endsWith('"')) patchedJson += '}]';
                  else if (patchedJson.endsWith('}')) patchedJson += ']';
                  else if (!patchedJson.endsWith(']')) patchedJson += '}]';
                  data = JSON.parse(patchedJson);
              }
          }

          // Dọn nốt ký tự điều khiển còn sót (nếu nội dung cũ đã lỡ bị lưu hỏng từ
          // trước) - vô hại với nội dung vốn đã đúng vì không có gì để dọn.
          data = cleanObjectLatex(data);

          if (Array.isArray(data)) {
              data.forEach(item => {
                  if (item.question) {
                      item.question = item.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
                  }
                  res.push({ id: Math.random().toString(36).substring(7), type: 'quiz', content: item });
              });
          } else {
              if (data.question) {
                  data.question = data.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
              }
              res.push({ id: Math.random().toString(36).substring(7), type: 'quiz', content: data });
          }
      } catch(e) {
          themKhoiChu(res, match[0]);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
        const txt = content.substring(lastIndex).trim();
        if (txt) themKhoiChu(res, txt);
    }
    return res.length > 0 ? res : [{ id: Math.random().toString(36).substring(7), type: 'md', content: "" }];
};

/**
 * Khung toạ độ ảnh cho khối lý thuyết (md): AI ghi ngay sau marker, dạng
 * `[IMAGE_PLACEHOLDER]{"fileIndex":0,"ymin":300,"xmin":250,"ymax":800,"xmax":750}`.
 * Khối quiz thì mang khung trong trường JSON `viTriHinhAnh` nên không cần regex.
 */
const MD_IMAGE_BOX_REGEX = /\[IMAGE_PLACEHOLDER\]\s*(\{\s*"fileIndex"\s*:[^}]*\})/gi;

/** Khung AI trả về có hợp lệ không (đủ 5 số, toạ độ thuận, nằm trong thang 0-1000). */
const isValidImageBox = (box: any): box is NormalizedBox & { fileIndex: number } => {
    if (!box || typeof box !== 'object') return false;
    const nums = [box.fileIndex, box.ymin, box.xmin, box.ymax, box.xmax];
    if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
    if (box.xmin >= box.xmax || box.ymin >= box.ymax) return false;
    return box.xmin >= 0 && box.ymin >= 0 && box.xmax <= 1000 && box.ymax <= 1000;
};

/**
 * Tự động cắt ảnh minh hoạ cho các khối vừa quét được, dùng đúng cỗ máy đang chạy bên
 * Ngân hàng câu hỏi (`autoCropImage`: cắt theo khung 0-1000, phóng to + làm nét khi vùng
 * cắt nhỏ, chặn khung vô lý), rồi thay marker bằng ảnh thật ngay trong nội dung.
 *
 * Cắt hỏng ở một khối thì bỏ qua đúng khối đó và giữ nguyên marker để rơi về luồng cắt
 * tay như trước - không được làm hỏng cả lượt quét.
 */
const autoCropBlocksImages = async (
    parsedBlocks: Block[],
    sourceFiles: File[],
    supabase: any,
    cauHinhAI: any | null,
): Promise<{ blocks: Block[]; croppedCount: number; failedCount: number; redrawnCount: number }> => {
    let croppedCount = 0;
    let failedCount = 0;
    let redrawnCount = 0;

    for (const b of parsedBlocks) {
        try {
            if (b.type === 'quiz' && b.content && typeof b.content === 'object') {
                const box = b.content.viTriHinhAnh;
                if (!isValidImageBox(box)) {
                    if (box !== undefined) delete b.content.viTriHinhAnh;
                    continue;
                }
                const file = sourceFiles[box.fileIndex];
                if (!file) { delete b.content.viTriHinhAnh; continue; }

                /*
                 * Ưu tiên VẼ LẠI, cắt ảnh chỉ là phương án dự phòng.
                 *
                 * Ảnh chụp từ sách cắt ra thì nét chỉ đến thế, in lên A4 hay rỗ. Hình nào
                 * chỉ gồm đường nét và chữ (đồ thị, bảng, mạch điện, hình học) thì máy vẽ
                 * lại được bằng SVG, nét vector in cỡ nào cũng sắc. Máy tự nhận "không vẽ
                 * được" với ảnh chụp thật hay hình quá mờ - lúc đó mới dùng ảnh cắt, và
                 * chấm độ nét để cảnh báo nếu mờ.
                 */
                const anhCat = await cropImageFromBoundingBox(file, box);

                let url = '';
                let daVeLai = false;
                let lyDoKhongVeLai = '';
                let svgVeLai = '';
                let doNet: any = null;

                if (cauHinhAI) {
                  try {
                    const td = await thamDinhVaVeLai(cauHinhAI, anhCat);
                    if (td.veLaiDuoc) {
                      const png = await svgSangPng(td.svg);
                      url = await uploadCroppedImage(supabase, png);
                      daVeLai = true;
                      svgVeLai = td.svg;
                      redrawnCount++;
                    } else {
                      lyDoKhongVeLai = td.lyDo;
                    }
                  } catch (e: any) {
                    lyDoKhongVeLai = 'gọi máy vẽ lại không được: ' + (e?.message || 'lỗi không rõ');
                  }
                } else {
                  lyDoKhongVeLai = 'chưa lấy được khoá AI';
                }

                // Luôn lưu ảnh cắt: hoặc để dùng luôn, hoặc để đối chiếu và quay về khi
                // bản vẽ lại sai số liệu.
                const urlAnhCat = await uploadCroppedImage(supabase, anhCat);
                if (!url) {
                  url = urlAnhCat;
                  try { doNet = await chamDoNetTuBlob(anhCat); } catch { /* chấm hỏng thì thôi */ }
                }

                const imageMarkdown = `\n\n![Hình minh họa](${url})\n\n`;
                const question = b.content.question || '';
                const replaced = question.replace(IMAGE_PLACEHOLDER_STRIP_REGEX, imageMarkdown);
                b.content.question = replaced !== question ? replaced : question + imageMarkdown;

                // Giữ ảnh gốc + khung để còn đối chiếu và cắt lại thủ công nếu AI cắt lệch.
                // Phải là địa chỉ thật trên Storage: địa chỉ blob: chỉ sống trong đúng phiên
                // mở trang, hôm sau mở lại bài là mất ảnh nguồn.
                let urlAnhGoc = '';
                try { urlAnhGoc = await uploadSourceImage(supabase, file); }
                catch (e) { console.warn('Không tải được ảnh trang gốc lên Storage:', e); }
                b.content.autoCropMetadata = {
                  originalUrl: urlAnhGoc, box,
                  urlAnhCat, daVeLai, lyDoKhongVeLai, svgVeLai,
                  doNet: doNet ? { diem: doNet.diem, beRong: doNet.beRong, nenVeLai: doNet.nenVeLai, moTa: doNet.moTa } : null,
                };
                delete b.content.viTriHinhAnh; // đã dùng xong, không lưu vào CSDL cho rác
                croppedCount++;
                continue;
            }

            if (b.type === 'md' && typeof b.content === 'string') {
                const matches = Array.from(b.content.matchAll(MD_IMAGE_BOX_REGEX));
                for (const m of matches) {
                    let box: any;
                    try { box = JSON.parse(m[1]); } catch { continue; }
                    if (!isValidImageBox(box)) continue;
                    const file = sourceFiles[box.fileIndex];
                    if (!file) continue;

                    /*
                     * DUNG CHUNG CO MAY VOI KHOI TRAC NGHIEM.
                     *
                     * Truoc gio nhanh nay chi goi autoCropImage - cat tron, khong nho ve
                     * lai, khong cham do net. Hinh trong bai giang vi the van la anh chup
                     * cat ra, in len A4 la ro; trong khi cung mot trang tai lieu thi hinh
                     * cua cau trac nghiem lai duoc ve lai bang net vector.
                     */
                    const anhCat = await cropImageFromBoundingBox(file, box);

                    let url = '';
                    let daVeLai = false;
                    let doNet: any = null;

                    if (cauHinhAI) {
                      try {
                        const td = await thamDinhVaVeLai(cauHinhAI, anhCat);
                        if (td.veLaiDuoc) {
                          url = await uploadCroppedImage(supabase, await svgSangPng(td.svg));
                          daVeLai = true;
                          redrawnCount++;
                        }
                      } catch (e) {
                        console.warn('Khong ve lai duoc hinh trong bai giang, dung anh cat:', e);
                      }
                    }

                    if (!url) {
                      url = await uploadCroppedImage(supabase, anhCat);
                      try { doNet = await chamDoNetTuBlob(anhCat); } catch { /* cham hong thi thoi */ }
                    }

                    /*
                     * Ghi kem mot chu thich HTML de con VE LAI hoac CAT LAI ve sau.
                     *
                     * Khoi ly thuyet luu xuong CSDL duoi dang Markdown thuan, khong co cho
                     * dat doi tuong metadata nhu khoi trac nghiem. Chu thich HTML thi nam
                     * ngay canh anh, song sot qua moi lan luu, va khong hien ra man hinh.
                     */
                    const ghiChu = JSON.stringify({ veLai: daVeLai, moNet: !!doNet?.nenVeLai });
                    b.content = b.content.replace(
                      m[0],
                      `\n\n![Hình minh họa](${url})\n<!--anh ${ghiChu}-->\n\n`,
                    );
                    croppedCount++;
                }
                // Khung nào cắt không nổi thì bỏ phần JSON đi, chỉ để lại marker cho cắt tay
                b.content = b.content.replace(MD_IMAGE_BOX_REGEX, '[IMAGE_PLACEHOLDER]');
            }
        } catch (e) {
            failedCount++;
            console.warn('Không tự cắt được ảnh cho 1 khối, giữ nguyên để cắt tay:', e);
        }
    }

    return { blocks: parsedBlocks, croppedCount, failedCount, redrawnCount };
};

const serializeBlocksToMarkdown = (blocks: Block[]): string => {
    return blocks.map(b => {
        if (b.type === 'md') return b.content;
        if (b.type === 'quiz') return '```quiz\n' + JSON.stringify(b.content, null, 2) + '\n```';
        return '';
    }).join('\n\n');
};

// ===== Xuất Giáo Án ra file .docx thật (dùng thư viện "docx", công thức là công thức
// Word/MathType thật - không cần chuyển đổi thủ công) =====

const MATH_MARKER = ' MATH';

// Bóc tách công thức $...$ / $$...$$ thành các placeholder vô hại (  không bao giờ
// xuất hiện trong nội dung thật) để không bị lẫn với ảnh/in đậm khi tách dòng thành runs.
const extractMathPlaceholders = (text: string, store: string[]): string => {
    if (!text) return text;
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m: string, expr: string) => {
        store.push(expr);
        return `${MATH_MARKER}${store.length - 1} `;
    });
    text = text.replace(/\$([^\$\n]+?)\$/g, (_m: string, expr: string) => {
        store.push(expr);
        return `${MATH_MARKER}${store.length - 1} `;
    });
    return text;
};

// Tách 1 đoạn text thường (không còn ảnh/công thức) thành các TextRun, xử lý **in đậm**
// và <span style="color:...">...</span> (không lồng nhau - đúng với cách nội dung AI sinh ra).
const textToRuns = (text: string, opts: { color?: string; bold?: boolean } = {}): TextRun[] => {
    if (!text) return [];
    const boldItalicRuns = (t: string): TextRun[] => {
        const runs: TextRun[] = [];
        let remaining = t;
        while (remaining.length > 0) {
            const boldIdx = remaining.indexOf('**');
            if (boldIdx !== -1) {
                const endBold = remaining.indexOf('**', boldIdx + 2);
                if (endBold !== -1) {
                    if (boldIdx > 0) runs.push(new TextRun({ text: remaining.slice(0, boldIdx), color: opts.color, bold: opts.bold }));
                    runs.push(new TextRun({ text: remaining.slice(boldIdx + 2, endBold), color: opts.color, bold: true }));
                    remaining = remaining.slice(endBold + 2);
                    continue;
                }
            }
            runs.push(new TextRun({ text: remaining, color: opts.color, bold: opts.bold }));
            break;
        }
        return runs;
    };

    const spanRegex = /<span[^>]*style="[^"]*color:\s*([^;"]+)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    const runs: TextRun[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    let hasSpan = false;
    while ((m = spanRegex.exec(text)) !== null) {
        hasSpan = true;
        if (m.index > lastIndex) runs.push(...boldItalicRuns(text.slice(lastIndex, m.index)));
        const color = m[1].trim().replace('#', '').toUpperCase();
        runs.push(...textToRuns(m[2], { ...opts, color }));
        lastIndex = m.index + m[0].length;
    }
    if (hasSpan) {
        if (lastIndex < text.length) runs.push(...boldItalicRuns(text.slice(lastIndex)));
        return runs;
    }
    return boldItalicRuns(text);
};

// Chuyển 1 dòng nội dung (có thể chứa ảnh, công thức, in đậm, span màu) thành mảng
// children cho Paragraph của docx: TextRun | Math | ImageRun.
const buildRunsFromLine = async (line: string, opts: { color?: string; bold?: boolean } = {}): Promise<any[]> => {
    const mathStore: string[] = [];
    const withPlaceholders = extractMathPlaceholders(line, mathStore);

    const runs: any[] = [];
    let remaining = withPlaceholders;
    while (remaining.length > 0) {
        const imgIdx = remaining.toLowerCase().indexOf('<img');
        const mdIdx = remaining.indexOf('![');
        const mathIdx = remaining.indexOf(MATH_MARKER);

        const candidates = [
            imgIdx !== -1 ? { type: 'img', idx: imgIdx } : null,
            mdIdx !== -1 ? { type: 'mdimg', idx: mdIdx } : null,
            mathIdx !== -1 ? { type: 'math', idx: mathIdx } : null,
        ].filter((c): c is { type: string; idx: number } => c !== null);

        if (candidates.length === 0) {
            runs.push(...textToRuns(remaining, opts));
            break;
        }
        candidates.sort((a, b) => a.idx - b.idx);
        const next = candidates[0];

        if (next.idx > 0) runs.push(...textToRuns(remaining.slice(0, next.idx), opts));

        if (next.type === 'math') {
            const endIdx = remaining.indexOf(' ', next.idx + MATH_MARKER.length);
            const nStr = remaining.slice(next.idx + MATH_MARKER.length, endIdx);
            const n = parseInt(nStr, 10);
            runs.push(latexToDocxElement(mathStore[n], opts));
            remaining = remaining.slice(endIdx + 1);
        } else if (next.type === 'img') {
            const end = remaining.indexOf('>', next.idx);
            if (end === -1) { runs.push(...textToRuns(remaining.slice(next.idx), opts)); break; }
            const tag = remaining.slice(next.idx, end + 1);
            remaining = remaining.slice(end + 1);
            const srcMatch = tag.match(/src="(data:image\/([^;]+);base64,([^"]+))"/i) || tag.match(/src='(data:image\/([^;]+);base64,([^']+))'/i);
            if (srcMatch && srcMatch[3]) {
                try {
                    const buffer = base64ToUint8Array(srcMatch[3].replace(/\s+/g, ''));
                    runs.push(new ImageRun({ data: buffer, transformation: { width: 300, height: 200 } } as any));
                } catch (e) { /* bỏ qua ảnh lỗi */ }
            }
        } else {
            const bracketEnd = remaining.indexOf('](', next.idx);
            const parenEnd = bracketEnd !== -1 ? remaining.indexOf(')', bracketEnd) : -1;
            if (bracketEnd === -1 || parenEnd === -1) {
                runs.push(new TextRun({ text: '![', color: opts.color, bold: opts.bold }));
                remaining = remaining.slice(next.idx + 2);
            } else {
                const url = remaining.slice(bracketEnd + 2, parenEnd).trim();
                remaining = remaining.slice(parenEnd + 1);
                try {
                    const imgData = await fetchImageWithDimensions(url);
                    if (imgData) runs.push(new ImageRun({ data: imgData.buffer, transformation: { width: imgData.width, height: imgData.height } } as any));
                } catch (e) { /* bỏ qua ảnh lỗi */ }
            }
        }
    }
    return runs;
};

// Tách 1 khối text dài (nhiều dòng, ví dụ lời giải) theo từng dòng, gộp mỗi dòng
// thành 1 Paragraph có icon mũi tên màu ở đầu dòng.
const buildBulletParagraphs = async (text: string, bulletColor: string): Promise<Paragraph[]> => {
    const cleaned = text.replace(/^(?:\*\*)?(?:Phương pháp giải|Lời giải|Hướng dẫn giải|Giải thích):?(?:\*\*)?\s*/i, '');
    const lines = cleaned.split('\n').map(l => l.replace(/^[\-\+\*]\s*/, '').trim()).filter(Boolean);
    const paragraphs: Paragraph[] = [];
    for (const line of lines) {
        const runs = await buildRunsFromLine(line);
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: '➤ ', color: bulletColor, bold: true }), ...runs],
            spacing: { before: 40, after: 40 },
        }));
    }
    return paragraphs;
};

// Chuyển 1 khối ```quiz``` (câu hỏi tương tác trong bài giảng) thành các Paragraph.
const renderQuizToParagraphs = async (quiz: any, questionNumber: number, type: 'student' | 'teacher'): Promise<Paragraph[]> => {
    const paragraphs: Paragraph[] = [];

    const questionRuns = await buildRunsFromLine((quiz.question || '').replace(/\\n/g, ' '));
    paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `Câu ${questionNumber}. `, bold: true, color: '0000FF' }), ...questionRuns],
        spacing: { before: 160, after: 60 },
    }));

    if (quiz.options) {
        for (let i = 0; i < quiz.options.length; i++) {
            const opt = quiz.options[i];
            const optText = typeof opt === 'string' ? opt : opt.content;
            const label = String.fromCharCode(65 + i);
            const optRuns = await buildRunsFromLine((optText || '').replace(/\\n/g, ' '));
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: `${label}. `, bold: true, color: '0000FF' }), ...optRuns],
                spacing: { before: 20, after: 20 },
            }));
        }
    }

    if (type === 'teacher') {
        const fullText: string = [quiz.explanation, quiz.sampleAnswer, quiz.answer].filter(Boolean).join('\n\n');
        const lowerExp = fullText.toLowerCase();
        const ppIndex = lowerExp.indexOf('phương pháp giải');
        const lgIndex = lowerExp.indexOf('lời giải');

        let methodText = '';
        let explanationText = '';
        if (ppIndex !== -1 && lgIndex !== -1 && ppIndex < lgIndex) {
            const startPP = ppIndex + (lowerExp.indexOf('phương pháp giải:') === ppIndex ? 17 : 16);
            const startLG = lgIndex + (lowerExp.indexOf('lời giải:') === lgIndex ? 9 : 8);
            methodText = fullText.substring(startPP, lgIndex).trim();
            explanationText = fullText.substring(startLG).trim();
        } else if (ppIndex !== -1 && lgIndex === -1) {
            const startPP = ppIndex + (lowerExp.indexOf('phương pháp giải:') === ppIndex ? 17 : 16);
            methodText = fullText.substring(startPP).trim();
        } else if (ppIndex === -1 && lgIndex !== -1) {
            const startLG = lgIndex + (lowerExp.indexOf('lời giải:') === lgIndex ? 9 : 8);
            explanationText = fullText.substring(startLG).trim();
        } else {
            explanationText = fullText.trim();
        }

        if (methodText) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: 'Phương pháp giải', bold: true, color: '0000FF' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 60 },
            }));
            paragraphs.push(...(await buildBulletParagraphs(methodText, 'E67E22')));
        }
        if (explanationText) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: 'Lời giải', bold: true, color: '0000FF' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 60 },
            }));
            paragraphs.push(...(await buildBulletParagraphs(explanationText, '27AE60')));
        }
    }

    return paragraphs;
};

const getPrompt = (isPractice: boolean, isPresentation: boolean) => {
  if (isPractice) {
      return `Bạn là một chuyên gia giáo dục Toán học xuất sắc hàng đầu thế giới.
Hãy phân tích nội dung các ảnh/tài liệu này và BÓC TÁCH TOÀN BỘ CÁC CÂU HỎI BÀI TẬP thành các khối mã \`\`\`quiz\`\`\` định dạng JSON.
YÊU CẦU ĐỊNH DẠNG TUYỆT ĐỐI (LÀM SAI SẼ BỊ PHẠT):
1. [CẢNH BÁO LỖI ĐỀ]: Trách nhiệm cao nhất của bạn là giải thử từng câu. Nếu phát hiện câu hỏi bị sai đề, thiếu dữ kiện, mâu thuẫn toán học, hoặc không có đáp án đúng, hãy IN ĐẬM VÀ TÔ MÀU ĐỎ cảnh báo ngay trước đoạn mã \`\`\`quiz\`\`\` của câu hỏi đó (VD: **<span style="color:red">⚠️ LỖI ĐỀ BÀI: Câu hỏi này thiếu điều kiện m ≠ 0...</span>**).
2. [KHÔNG BỎ SÓT BÀI TẬP]: Quét KỸ 100% tài liệu gốc. Tôi đưa lên bao nhiêu câu hỏi thì BẮT BUỘC bạn phải bóc tách bấy nhiêu câu. TUYỆT ĐỐI KHÔNG được qua loa hay bỏ sót bất kỳ câu nào, nếu vi phạm sẽ bị phạt nặng.
3. [VỊ TRÍ HÌNH ẢNH/BẢNG BIỂU]: Nếu phát hiện câu hỏi trong tài liệu gốc có chứa hình vẽ, biểu đồ hoặc đồ thị, TUYỆT ĐỐI KHÔNG mô tả chi tiết làm lệch câu gốc. BẮT BUỘC phải chèn dòng chữ \`[CÓ HÌNH ẢNH KÈM THEO]\` vào ĐÚNG VỊ TRÍ mà hình ảnh đó xuất hiện trong câu hỏi gốc (ví dụ: ngay sau chữ "như hình vẽ bên:"). Tuyệt đối KHÔNG được tự ý vứt xuống cuối phần nội dung nếu nó nằm ở giữa câu.
3b. [KHUNG TOẠ ĐỘ HÌNH ẢNH - ĐỂ HỆ THỐNG TỰ CẮT ẢNH]: Với MỖI câu hỏi có chèn \`[CÓ HÌNH ẢNH KÈM THEO]\`, BẮT BUỘC điền thêm trường \`"viTriHinhAnh"\` là object: {"fileIndex": (số thứ tự file ảnh chứa hình đó, ĐẾM TỪ 0 theo đúng thứ tự các file được gửi lên), "ymin": ..., "xmin": ..., "ymax": ..., "xmax": ...} - toạ độ khung bao quanh CHÍNH XÁC vùng hình vẽ/đồ thị/bảng của riêng câu đó trong ảnh gốc, chuẩn hoá theo thang 0-1000 (0 = mép trên/trái, 1000 = mép dưới/phải). Khung phải ôm trọn hình, không cắt cụt, không lấn sang hình của câu khác hay sang vùng chữ dài. Nếu KHÔNG xác định được rõ ràng vị trí, để \`"viTriHinhAnh": null\` - TUYỆT ĐỐI KHÔNG ĐOÁN BỪA vì cắt sai làm hỏng câu hỏi. Câu không có hình thì bỏ qua trường này.
4. [KHÔNG VIẾT LÝ THUYẾT]: Tuyệt đối KHÔNG viết câu mở đầu, KHÔNG tóm tắt lý thuyết, KHÔNG giải thích. CHỈ ĐƯỢC PHÉP TRẢ VỀ CÁC ĐOẠN MÃ \`\`\`quiz\`\`\` (và các dòng cảnh báo lỗi đề nếu có).
5. [CHUẨN HÓA TOÁN HỌC LATEX TỐI ƯU NHƯ MATHTYPE]:
- Bao bọc TẤT CẢ công thức bằng dấu $ (Ví dụ: $x^2 + y^2 = 25$). Tuyệt đối KHÔNG bao bọc chữ tiếng Việt bên trong dấu $ (Ví dụ SAI: $Ta có: x = 2$, ĐÚNG: Ta có $x = 2$).
- CÔNG THỨC PHẢI LIỀN MẠCH TRÊN 1 DÒNG: Tuyệt đối không được bẻ gãy, ngắt dòng (enter) giữa chừng một công thức (trừ hệ phương trình).

- Phân số: Dạng \\frac{tử}{mẫu}. Góc: Dạng \\widehat{tên}. Hệ phương trình: Dùng \\begin{cases} ... \\end{cases}.
6. [LỜI GIẢI CHI TIẾT]: Mỗi câu hỏi BẮT BUỘC phải có trường \`"answer"\` chứa lời giải chi tiết, giải thích rõ ràng từng bước. Nếu đề sai, hãy chỉ rõ cái sai trong lời giải và sửa lại cho đúng.
7. TOÀN BỘ CÁC CÂU HỎI PHẢI ĐƯỢC GỘP CHUNG VÀO MỘT (1) ĐOẠN MÃ NGÔN NGỮ "quiz" DUY NHẤT (BẮT BUỘC BỌC TRONG \`\`\`quiz VÀ \`\`\`). BÊN TRONG LÀ MỘT MẢNG JSON (JSON ARRAY) CHỨA TẤT CẢ CÁC CÂU HỎI. Cấu trúc mỗi object JSON trong mảng:

LOẠI 1: TRẮC NGHIỆM 4 LỰA CHỌN (1 ĐÁP ÁN ĐÚNG)
\`\`\`quiz
[
  {
    "type": "multiple_choice",
    "question": "Đạo hàm của hàm số $y = x^2 + 2x$ là?",
    "options": ["$y' = 2x + 2$", "$y' = x + 2$", "$y' = 2x$", "$y' = 2$"],
    "answerIndex": 0,
    "answer": "Sử dụng công thức đạo hàm cơ bản: $(x^n)' = n.x^{n-1}$. Ta có $y' = 2x + 2$",
    "viTriHinhAnh": null
  },
  {
    "type": "multiple_choice",
    "question": "Cho hình chữ nhật $ABCD$ như hình vẽ bên [CÓ HÌNH ẢNH KÈM THEO]. Tính độ dài $AC$.",
    "options": ["$10$", "$12$", "$14$", "$48$"],
    "answerIndex": 0,
    "answer": "Áp dụng định lí Pythagore: $AC = \\\\sqrt{8^2 + 6^2} = 10$.",
    "viTriHinhAnh": { "fileIndex": 0, "ymin": 305, "xmin": 640, "ymax": 565, "xmax": 920 }
  },
  {
    "type": "true_false_cluster",
    "question": "Cho hàm số $y = x^3 - 3x$.",
    "options": [
      { "id": "a", "content": "Hàm số đồng biến trên $(1; +\\\\infty)$.", "isTrue": true },
      { "id": "b", "content": "Hàm số đạt cực đại tại $x = 1$.", "isTrue": false }
    ],
    "answer": "Ta có $y' = 3x^2 - 3$..."
  },
  {
    "type": "short_answer",
    "question": "Tính giá trị của biểu thức $\\\\sqrt{9} + \\\\sqrt{16}$.",
    "exactAnswer": "7",
    "answer": "Tổng là $3 + 4 = 7$."
  },
  {
    "type": "essay",
    "question": "Giải phương trình $x^2 - 4x + 3 = 0$.",
    "answer": "Phương trình có 2 nghiệm phân biệt $x_1 = 3, x_2 = 1$."
  }
]
\`\`\`

GHI CHÚ TUYỆT ĐỐI QUAN TRỌNG VỀ JSON:
- [BẮT BUỘC VỀ TOÁN HỌC]: Tất cả công thức toán học trong JSON BẮT BUỘC phải được bọc trong cặp dấu $...$.
- [BẮT BUỘC ESCAPE LATEX]: TẤT CẢ các ký tự gạch chéo (\\) bên trong chuỗi JSON BẮT BUỘC PHẢI NHÂN ĐÔI thành (\\\\). Ví dụ: \\\\neq, \\\\Rightarrow, \\\\begin{cases}. Kí hiệu xuống dòng của hệ phương trình cũng phải viết là \\\\\\\\. Nếu không, file JSON SẼ BỊ HỎNG HOÀN TOÀN và BẠN SẼ BỊ PHẠT!
- [KHÔNG ĐƯỢC CẮT CỤT DỮ LIỆU]: BẠN BẮT BUỘC PHẢI TRẢ VỀ CHUỖI JSON HOÀN CHỈNH, ĐÓNG ĐẦY ĐỦ NGOẶC \`}\` HOẶC \`]\` Ở CUỐI! TUYỆT ĐỐI KHÔNG TRẢ VỀ DỮ LIỆU BỊ CẮT CỤT GIỮA CHỪNG!
- ĐỪNG xuất ra bất kỳ giải thích chữ nào bên ngoài các khối \`\`\`quiz\`\`\`. Chỉ xuất các khối quiz.`;
  }

  if (!isPresentation) {
      return `Bạn là một chuyên gia giáo dục Toán học xuất sắc hàng đầu thế giới.
Hãy phân tích nội dung các ảnh tài liệu này và biên soạn lại thành một bài giảng Toán học HOÀN CHỈNH, CHI TIẾT, DỄ HIỂU.
YÊU CẦU ĐỊNH DẠNG TUYỆT ĐỐI (LÀM SAI SẼ BỊ PHẠT):
1. Dạng Markdown. [CHUẨN HÓA TOÁN HỌC LATEX TỐI ƯU NHƯ MATHTYPE]:
- Bao bọc TẤT CẢ công thức bằng dấu $ (Ví dụ: $x^2 + y^2 = 25$). Tuyệt đối KHÔNG bao bọc chữ tiếng Việt bên trong dấu $ (Ví dụ SAI: $Ta có: x = 2$, ĐÚNG: Ta có $x = 2$).
- CÔNG THỨC PHẢI LIỀN MẠCH TRÊN 1 DÒNG: Tuyệt đối không được bẻ gãy, ngắt dòng (enter) giữa chừng một công thức (trừ hệ phương trình). Các biểu thức toán học phải liền khối.

- Phân số: Dạng \\frac{tử}{mẫu}. Góc: Dạng \\widehat{tên}. Hệ phương trình: Dùng \\begin{cases} ... \\end{cases}.
2. [CẤU TRÚC VÀNG CỦA BÀI GIẢNG TOÁN HỌC]:
Bài giảng bắt buộc phải có 2 phần chính liên tiếp nhau:
* PHẦN 1: LÝ THUYẾT CHI TIẾT. Hãy giải thích cặn kẽ Định nghĩa, Định lý, Công thức cốt lõi. Văn phong tự nhiên, dễ đọc. BẮT BUỘC trình bày theo cấu trúc phân mục đánh số rõ ràng (1. 2. 3. ...) để học sinh dễ theo dõi và ghi chép bài. Tuyệt đối không dùng dấu ngắt trang (---).
* PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI. Hãy chia các bài tập thành các Dạng Toán riêng biệt. Giải thích rõ ràng phương pháp.\n* PHẦN CUỐI - 📌 CÔNG THỨC CẦN NHỚ: Kết thúc bài BẮT BUỘC có mục \`## 📌 CÔNG THỨC CẦN NHỚ\`, liệt kê các công thức trọng tâm đã dùng trong bài. Mỗi công thức viết ĐÚNG một dòng theo khuôn sau, không thêm bớt:\n  \`- **Tên công thức** | $công thức LaTeX$ | dùng khi nào\`\n  Ví dụ: \`- **Diện tích tam giác theo hai cạnh và góc xen giữa** | $S = \\dfrac{1}{2}ab\\sin C$ | biết hai cạnh và góc kẹp giữa\`\n  Chỉ lấy công thức THẬT SỰ CÓ trong bài, không bịa thêm. Đây là chỗ học sinh học thuộc, giáo viên dò bài, và hệ thống đưa vào Sổ tay công thức - nên khuôn phải đúng.
3. [PHÂN BIỆT RẠCH RÒI BẰNG HEADING VÀ BLOCKQUOTE]:
- TẤT CẢ Tiêu đề Phần, Tên Dạng Bài phải là Heading 2 (##) kèm Emoji (Ví dụ: "## 💡 DẠNG 1: TÌM ĐIỀU KIỆN XÁC ĐỊNH").
- TẤT CẢ Phương pháp giải phải là Heading 3 (###).
- [QUY TẮC VÍ DỤ MẪU]: Trích lấy ví dụ bài tập. Toàn bộ nội dung của Ví dụ mẫu (bao gồm tiêu đề \`> ### 📌 Ví dụ mẫu\`, đề bài và lời giải) BẮT BUỘC phải được bọc trong thẻ trích dẫn Blockquote (thêm \`> \` vào đầu mỗi dòng). Ở phần lời giải, phải ghi chữ "> Hướng dẫn giải:" ngay trước khi giải.
4. [TẠO CÂU HỎI TƯƠNG TÁC]: Chèn câu hỏi quiz ở dạng đoạn mã "quiz" chứa chuỗi JSON (multiple_choice, true_false, short_answer) để học sinh tự làm.\n- [SỐ CÂU TƯƠNG TÁC THEO TỪNG DẠNG - RẤT QUAN TRỌNG]: MỖI Dạng bài BẮT BUỘC phải có ÍT NHẤT 2 câu hỏi tương tác (đoạn mã \`quiz\`) đặt ngay sau phần Phương pháp giải của dạng đó. Dạng nào nhiều bước tính hoặc nhiều trường hợp thì phải 3-4 câu. TUYỆT ĐỐI KHÔNG có dạng nào chỉ 1 câu hoặc không câu nào.\n- [CÂU HỎI PHẢI ĐÚNG TRỌNG TÂM DẠNG]: Câu hỏi phải giải được bằng ĐÚNG phương pháp vừa trình bày của dạng đó, không hỏi sang dạng khác, không hỏi lý thuyết suông kiểu \"định nghĩa nào sau đây đúng\".\n- [ƯU TIÊN KỸ NĂNG TÍNH TOÁN]: Phải là bài TÍNH ra được con số hoặc biểu thức cụ thể - tính giá trị, giải phương trình, tìm toạ độ, tính diện tích... Đây là những bài tập mẫu để học sinh cầm tay chỉ việc, làm xong là tự làm được phần Tự luyện.\n- [XẾP TỪ DỄ ĐẾN KHÓ]: Câu đầu áp dụng thẳng công thức, các câu sau thêm một bước biến đổi hoặc một trường hợp cần xét.
5. [HÌNH VẼ - CHÈN MARKER KÈM KHUNG TOẠ ĐỘ ĐỂ HỆ THỐNG TỰ CẮT ẢNH]: Nếu tài liệu gốc có hình vẽ, đồ thị, bảng biến thiên, TUYỆT ĐỐI KHÔNG vẽ lại bằng ký tự/ASCII và KHÔNG mô tả dài dòng. Hãy chèn thẻ \`[IMAGE_PLACEHOLDER]\` vào đúng vị trí cần hình, và NGAY SAU thẻ đó ghi liền một object JSON khung toạ độ: \`[IMAGE_PLACEHOLDER]{"fileIndex":0,"ymin":300,"xmin":250,"ymax":800,"xmax":750}\` - trong đó "fileIndex" là số thứ tự file ảnh chứa hình (ĐẾM TỪ 0 theo thứ tự file gửi lên), còn ymin/xmin/ymax/xmax là khung bao quanh CHÍNH XÁC vùng hình đó, chuẩn hoá theo thang 0-1000 (0 = mép trên/trái, 1000 = mép dưới/phải). Khung phải ôm trọn hình, không cắt cụt, không lấn sang vùng chữ. Nếu KHÔNG xác định được rõ vị trí thì chỉ ghi \`[IMAGE_PLACEHOLDER]\` và KHÔNG ghi JSON - tuyệt đối không đoán bừa toạ độ.`;
  }

  const unifiedPrompt = `Bạn là một chuyên gia giáo dục Toán học xuất sắc hàng đầu thế giới.
Hãy phân tích nội dung các ảnh tài liệu này và biên soạn lại thành một bài giảng Toán học HOÀN CHỈNH, GỒM LÝ THUYẾT VÀ CÁC DẠNG BÀI TẬP, TRÌNH BÀY SIÊU ĐẸP, CỰC KỲ THU HÚT.
YÊU CẦU ĐỊNH DẠNG TUYỆT ĐỐI (LÀM SAI SẼ BỊ PHẠT):
1. Dạng Markdown. [CHUẨN HÓA TOÁN HỌC LATEX TỐI ƯU NHƯ MATHTYPE]:
- Bao bọc TẤT CẢ công thức bằng dấu $ (Ví dụ: $x^2 + y^2 = 25$). Tuyệt đối KHÔNG bao bọc chữ tiếng Việt bên trong dấu $ (Ví dụ SAI: $Ta có: x = 2$, ĐÚNG: Ta có $x = 2$).
- CÔNG THỨC PHẢI LIỀN MẠCH TRÊN 1 DÒNG: Tuyệt đối không được bẻ gãy, ngắt dòng (enter) giữa chừng một công thức (trừ hệ phương trình). Các biểu thức toán học phải liền khối và chuẩn xác.

- Phân số: Dạng \\frac{tử}{mẫu}. Góc: Dạng \\widehat{tên}. Hệ phương trình: Dùng \\begin{cases} ... \\end{cases}.
2. [CẤU TRÚC VÀNG CỦA BÀI GIẢNG TOÁN HỌC]:
Bài giảng bắt buộc phải có 2 phần chính liên tiếp nhau:
* PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM. Hãy chắt lọc Định nghĩa, Định lý, Công thức cốt lõi. Bỏ qua diễn giải rườm rà. BẮT BUỘC trình bày theo cấu trúc phân mục đánh số rõ ràng (1. 2. 3. ...) để học sinh dễ theo dõi và ghi chép bài.
* PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI. Hãy chia các bài tập thành các Dạng Toán riêng biệt. [KHÔNG BỎ SÓT KIẾN THỨC]: Quét kỹ 100% tài liệu, tôi đưa vào bao nhiêu dạng toán thì bắt buộc phải bóc tách bấy nhiêu dạng, tuyệt đối không được qua loa hay cắt xén bớt.\n* PHẦN CUỐI - 📌 CÔNG THỨC CẦN NHỚ: Kết thúc bài BẮT BUỘC có mục \`## 📌 CÔNG THỨC CẦN NHỚ\`, liệt kê các công thức trọng tâm đã dùng trong bài. Mỗi công thức viết ĐÚNG một dòng theo khuôn sau, không thêm bớt:\n  \`- **Tên công thức** | $công thức LaTeX$ | dùng khi nào\`\n  Ví dụ: \`- **Diện tích tam giác theo hai cạnh và góc xen giữa** | $S = \\dfrac{1}{2}ab\\sin C$ | biết hai cạnh và góc kẹp giữa\`\n  Chỉ lấy công thức THẬT SỰ CÓ trong bài, không bịa thêm. Đây là chỗ học sinh học thuộc, giáo viên dò bài, và hệ thống đưa vào Sổ tay công thức - nên khuôn phải đúng.
3. [PHÂN BIỆT RẠCH RÒI BẰNG HEADING VÀ BLOCKQUOTE]:
- TẤT CẢ Tiêu đề Phần, Tên Dạng Bài phải là Heading 2 (##) kèm Emoji (Ví dụ: "## 💡 DẠNG 1: TÌM ĐIỀU KIỆN XÁC ĐỊNH").
- TẤT CẢ Phương pháp giải phải là Heading 3 (###) (Ví dụ: "### 💡 Phương pháp giải").
- [QUY TẮC VÍ DỤ MẪU]: Mỗi dạng lấy 1 bài tập mức CƠ BẢN làm Ví dụ mẫu có lời giải đầy đủ, rồi thêm các câu tương tác theo quy tắc số câu bên dưới.
- [RẤT QUAN TRỌNG]: Toàn bộ nội dung của Ví dụ mẫu (bao gồm tiêu đề \`> ### 📌 Ví dụ mẫu\`, đề bài và lời giải) BẮT BUỘC phải được bọc trong thẻ trích dẫn Blockquote (thêm \`> \` vào đầu mỗi dòng). Ở phần lời giải, phải ghi chữ "> Hướng dẫn giải:" ngay trước khi giải để hệ thống lên màu chuẩn mực.
- [KIỂM TRA TÍNH CHÍNH XÁC & CẢNH BÁO LỖI]: Phải tự động giải lại toàn bộ bài tập/ví dụ. Nếu phát hiện đề bài sai, thiếu dữ kiện hoặc mâu thuẫn, hãy IN ĐẬM VÀ TÔ MÀU ĐỎ một dòng cảnh báo (VD: **<span style="color:red">⚠️ LỖI ĐỀ BÀI: Bài toán này thiếu điều kiện...</span>**) ngay trước ví dụ/bài tập đó, đồng thời tự động sửa lại số liệu cho đúng rồi mới giải.
4. [PHÂN TRANG KHOA HỌC ĐỂ TRÌNH CHIẾU]: Sử dụng ĐÚNG 3 dấu gạch ngang \`---\` để ngắt trang (tạo slide mới).
- MỖI MỘT ĐỊNH NGHĨA, ĐỊNH LÝ, HAY GHI CHÚ PHẢI NẰM TRÊN 1 SLIDE RIÊNG BIỆT (phải ngắt trang \`---\` ngay sau đó).
- MỖI VÍ DỤ HOẶC BÀI TẬP BẮT BUỘC NẰM TRÊN 1 SLIDE MỚI.
- KHÔNG GỘP QUÁ NHIỀU NỘI DUNG VÀO 1 SLIDE VÌ ĐÂY LÀ ĐỂ CHIẾU LÊN TIVI (Slide càng ngắn gọn càng tốt).
5. [QUY TẮC BẢNG BIẾN THIÊN & HÌNH VẼ]: Nếu bài toán có Hình vẽ, Bảng biến thiên... TUYỆT ĐỐI KHÔNG giải thích dài dòng bằng chữ. THAY VÀO ĐÓ, BẮT BUỘC chèn thẻ \`[IMAGE_PLACEHOLDER]\` vào đúng vị trí cần vẽ hình, và NGAY SAU thẻ đó ghi liền object JSON khung toạ độ để hệ thống tự cắt ảnh: \`[IMAGE_PLACEHOLDER]{"fileIndex":0,"ymin":300,"xmin":250,"ymax":800,"xmax":750}\` - "fileIndex" là số thứ tự file ảnh chứa hình (ĐẾM TỪ 0), ymin/xmin/ymax/xmax là khung bao quanh CHÍNH XÁC vùng hình, chuẩn hoá thang 0-1000 (0 = mép trên/trái, 1000 = mép dưới/phải), ôm trọn hình và không lấn sang vùng chữ. Nếu không xác định được rõ vị trí thì chỉ ghi \`[IMAGE_PLACEHOLDER]\`, TUYỆT ĐỐI không đoán bừa toạ độ.
6. [TẠO CÂU HỎI TƯƠNG TÁC]: Học sinh phải làm đúng câu hỏi thì mới được đọc trang tiếp theo, nên câu hỏi là phần bắt buộc chứ không phải thêm cho vui.\n- [SỐ CÂU TƯƠNG TÁC THEO TỪNG DẠNG - RẤT QUAN TRỌNG]: MỖI Dạng bài BẮT BUỘC phải có ÍT NHẤT 2 câu hỏi tương tác (đoạn mã \`quiz\`) đặt ngay sau phần Phương pháp giải của dạng đó. Dạng nào nhiều bước tính hoặc nhiều trường hợp thì phải 3-4 câu. TUYỆT ĐỐI KHÔNG có dạng nào chỉ 1 câu hoặc không câu nào.\n- [CÂU HỎI PHẢI ĐÚNG TRỌNG TÂM DẠNG]: Câu hỏi phải giải được bằng ĐÚNG phương pháp vừa trình bày của dạng đó, không hỏi sang dạng khác, không hỏi lý thuyết suông kiểu \"định nghĩa nào sau đây đúng\".\n- [ƯU TIÊN KỸ NĂNG TÍNH TOÁN]: Phải là bài TÍNH ra được con số hoặc biểu thức cụ thể - tính giá trị, giải phương trình, tìm toạ độ, tính diện tích... Đây là những bài tập mẫu để học sinh cầm tay chỉ việc, làm xong là tự làm được phần Tự luyện.\n- [XẾP TỪ DỄ ĐẾN KHÓ]: Câu đầu áp dụng thẳng công thức, các câu sau thêm một bước biến đổi hoặc một trường hợp cần xét.
7. Mỗi câu hỏi trắc nghiệm PHẢI được xuất ra ĐÚNG DƯỚI DẠNG ĐOẠN MÃ NGÔN NGỮ "quiz" chứa chuỗi JSON chuẩn xác. Cấu trúc JSON có 2 loại:

LOẠI 1: CÂU HỎI NHIỀU LỰA CHỌN (1 ĐÁP ÁN ĐÚNG)
\`\`\`quiz
{
  "type": "multiple_choice",
  "question": "Đạo hàm của hàm số $y = x^2 + 2x$ là?",
  "options": ["$y' = 2x + 2$", "$y' = x + 2$", "$y' = 2x$", "$y' = 2$"],
  "answerIndex": 0
}
\`\`\`

LOẠI 4: CÂU TRẢ LỜI NGẮN (kết quả ngắn gọn: 1 số, 1 biểu thức, 1 từ)
\`\`\`quiz
{
  "type": "short_answer",
  "question": "Tính giá trị của biểu thức $\\\\sqrt{9} + \\\\sqrt{16}$.",
  "exactAnswer": "7",
  "answer": "Ta có $\\\\sqrt{9} = 3$ và $\\\\sqrt{16} = 4$, nên tổng là $3 + 4 = 7$."
}
\`\`\`

GHI CHÚ TUYỆT ĐỐI QUAN TRỌNG VỀ JSON:
- [BẮT BUỘC VỀ TOÁN HỌC]: Tất cả các công thức toán học trong JSON BẮT BUỘC phải được bọc trong cặp dấu $...$$.
- TẤT CẢ các ký tự gạch chéo (\\) bên trong chuỗi JSON BẮT BUỘC PHẢI NHÂN ĐÔI thành (\\\\). Nếu không làm điều này, hệ thống sẽ BỊ LỖI.`;

  return unifiedPrompt;
};

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lessonId = searchParams.get('lessonId');
  const moduleId = searchParams.get('moduleId');
  /**
   * Nơi cần quay về khi bấm nút lui, do trang gọi truyền sang.
   *
   * Khu Ôn tập gọi tới đây thì phải lui về khu Ôn tập, chứ không phải về cây bài giảng -
   * về đó là lạc hẳn sang nhánh khác, tìm đường vào lại mệt.
   */
  const quayVe = searchParams.get('quayVe');
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [moduleType, setModuleType] = useState<string>('');
  const supabase = createClient();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [moHuongDan, setMoHuongDan] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [globalTriggerBankModal, setGlobalTriggerBankModal] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("Đang tải...");

  const [activeTab, setActiveTab] = useState<'elearning' | 'presentation'>('elearning');
  const [elearningMarkdown, setElearningMarkdown] = useState("");
  const [presentationMarkdown, setPresentationMarkdown] = useState("");
  const [elearningBlocks, setElearningBlocks] = useState<Block[]>([]);
  const [presentationBlocks, setPresentationBlocks] = useState<Block[]>([]);
  const [elearningEditorMode, setElearningEditorMode] = useState<'form' | 'raw'>('form');
  const [presentationEditorMode, setPresentationEditorMode] = useState<'form' | 'raw'>('raw');

  const markdownContent = activeTab === 'elearning' ? elearningMarkdown : presentationMarkdown;
  const setMarkdownContent = (updater: any) => {
    if (activeTab === 'elearning') setElearningMarkdown(prev => typeof updater === 'function' ? updater(prev) : updater);
    else setPresentationMarkdown(prev => typeof updater === 'function' ? updater(prev) : updater);
  };

  const blocks = activeTab === 'elearning' ? elearningBlocks : presentationBlocks;
  const setBlocks = (updater: any) => {
    if (activeTab === 'elearning') setElearningBlocks(prev => typeof updater === 'function' ? updater(prev) : updater);
    else setPresentationBlocks(prev => typeof updater === 'function' ? updater(prev) : updater);
  };

  const editorMode = activeTab === 'elearning' ? elearningEditorMode : presentationEditorMode;
  const setEditorMode = (mode: 'form' | 'raw') => {
    if (activeTab === 'elearning') setElearningEditorMode(mode);
    else setPresentationEditorMode(mode);
  };

  const [showRawPreview, setShowRawPreview] = useState(false);

  const handleFixRawLatex = (e?: React.MouseEvent) => {
    if (e) e.preventDefault(); // Tránh làm mất focus của ô nhập liệu
    const isFixedBySelection = applyLatexFixToActiveElement();
    if (!isFixedBySelection) {
       setMarkdownContent(fixLatexText(markdownContent));
    }
  };

  const applyFormatting = (prefix: string, suffix: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) {
      alert("Vui lòng bôi đen đoạn chữ muốn định dạng trước!");
      return;
    }

    const text = markdownContent;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);

    setMarkdownContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleRawKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (start === end) {
        const newValue = val.substring(0, start) + "  " + val.substring(end);
        setMarkdownContent(newValue);
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    } else if (e.key === 'Backspace' && start === end && start > 0) {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const textBeforeCursor = val.substring(lineStart, start);
      if (textBeforeCursor.trim() === '' && textBeforeCursor.length > 0) {
        e.preventDefault();
        const deleteCount = textBeforeCursor.length % 2 !== 0 ? 1 : 2;
        const newValue = val.substring(0, start - deleteCount) + val.substring(end);
        setMarkdownContent(newValue);
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.setSelectionRange(start - deleteCount, start - deleteCount);
        }, 0);
      }
    }
  };
  const [docList, setDocList] = useState<{id: string, title: string, url: string}[]>([]);
  const isDocumentModule = moduleType === 'document' || moduleTitle.toLowerCase().includes('tài liệu tham khảo');
  const isVideoModule = moduleType === 'solution_video' || moduleTitle.toLowerCase().includes('video');
  const isPracticeModule = moduleType === 'practice' || moduleTitle.toLowerCase().includes('luyện tập') || moduleTitle.toLowerCase().includes('kiểm tra') || moduleTitle.toLowerCase().includes('đề') || moduleTitle.toLowerCase().includes('phân dạng');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  // Lời nhắc tiến trình khi đang dựng trang PDF thành ảnh - việc này mất vài giây mỗi
  // trang nên phải cho thầy cô thấy máy đang chạy, không phải bị treo.
  const [trangThaiNguon, setTrangThaiNguon] = useState('');
  // Ảnh nguồn của các bài soạn trước có thể không mở được nữa (bản cũ lưu địa chỉ blob:
  // chỉ sống trong một phiên). Bắt sự kiện lỗi để giải thích cho thầy cô thay vì để
  // trình duyệt hiện một ô ảnh vỡ không rõ lý do.
  const [anhNguonHong, setAnhNguonHong] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Selection states for Course & Chapter
  const [courses, setCourses] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");

  // Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [targetCropBlockId, setTargetCropBlockId] = useState<string | null>(null);
  const [lastAnalyzedImages, setLastAnalyzedImages] = useState<string[]>([]);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [isUploadingCropped, setIsUploadingCropped] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileSelectForCrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Live Preview Pagination & Gamification State (REMOVED - Now continuous scroll)
  // Gemini Web Backup Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPushToBankModalOpen, setIsPushToBankModalOpen] = useState(false);

  /**
   * Lui MỘT BẬC chứ không văng hẳn ra ngoài.
   *
   * Bản cũ khi chưa kịp biết bài này thuộc khoá nào thì gọi router.back(), mà trang soạn
   * hay được mở trong thẻ mới nên lịch sử rỗng - bấm lui là nhảy đi đâu không biết.
   * Nay luôn về đúng cây bài giảng của khoá đó, kèm mã bài để cây tự mở sẵn đúng chương,
   * đúng bài vừa soạn.
   */
  const luiMotBac = () => {
    if (quayVe) { router.push(quayVe); return; }
    if (selectedCourseId) {
      router.push(`/admin/courses/${selectedCourseId}/lessons${lessonId ? `?bai=${lessonId}` : ''}`);
      return;
    }
    router.back();
  };
  const [manualGeminiInput, setManualGeminiInput] = useState("");
  /** Đợt vừa dán có bị cắt cụt không, và đã lấy được bao nhiêu câu trước khi đứt. */
  const [daCatCut, setDaCatCut] = useState<{ soCau: number; cauBiCut: string } | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    const fetchLesson = async () => {
      const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
      if (lessonData) {
        setTitle(lessonData.title);
        if (lessonData.course_id) setSelectedCourseId(lessonData.course_id);
        if (lessonData.chapter_id) setSelectedChapterId(lessonData.chapter_id);
      }

      if (moduleId) {
          const { data: modData } = await supabase.from('lesson_modules').select('*').eq('id', moduleId).single();
          if (modData) {
              setModuleTitle(modData.title || "");
              setModuleType(modData.type || "");
              setElearningMarkdown(modData.content_markdown || "");
              setPresentationMarkdown(modData.presentation_markdown || "");
              setElearningBlocks(parseMarkdownToBlocks(modData.content_markdown || ""));
              setPresentationBlocks(parseMarkdownToBlocks(modData.presentation_markdown || ""));
                if (modData.type === 'document' || modData.type === 'solution_video' || modData.title?.toLowerCase().includes('tài liệu tham khảo') || modData.title?.toLowerCase().includes('video')) {
                    try {
                        const parsed = JSON.parse(modData.content_markdown);
                        if (Array.isArray(parsed)) setDocList(parsed);
                    } catch(e) {}
                }
              setVideoUrl(modData.video_url || "");
              setAttachmentUrl(modData.attachment_url || "");
          }
      } else if (lessonData) {
          setElearningMarkdown(lessonData.content_markdown || "");
          setPresentationMarkdown(lessonData.presentation_markdown || "");
          setElearningBlocks(parseMarkdownToBlocks(lessonData.content_markdown || ""));
          setPresentationBlocks(parseMarkdownToBlocks(lessonData.presentation_markdown || ""));
          setVideoUrl(lessonData.video_url || "");
          setAttachmentUrl(lessonData.attachment_url || "");
      }
    };
    fetchLesson();
  }, [lessonId, moduleId]);

  useEffect(() => {
    const fetchCourses = async () => {
      // Bảng courses chỉ có cột grade_level, KHÔNG có cột grade/subject.
      // Trước đây chọn nhầm 2 cột này nên truy vấn lỗi, danh sách khóa học rỗng,
      // kéo theo ô "Thuộc khóa học" luôn trống và câu hỏi đẩy sang bị mất Lớp.
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, grade_level')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Lỗi tải danh sách khóa học:', error.message);
        return;
      }
      if (data) setCourses(data);
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setChapters([]);
      return;
    }
    const fetchChapters = async () => {
      const { data } = await supabase.from('chapters').select('id, title, loai')
        .eq('course_id', selectedCourseId).order('order_index', { ascending: true });
      // Chương thuộc khu Ôn tập & Kiểm tra soạn ở /admin/on-tap, không bày trong ô này
      if (data) setChapters(data.filter((c: any) => c.loai !== 'on-tap'));
    };
    fetchChapters();
  }, [selectedCourseId]);


  const handleSaveToDB = async () => {
    if (!lessonId) return;
    setIsSavingDB(true);
    const isDoc = moduleTitle.toLowerCase().includes('tài liệu tham khảo') || moduleTitle.toLowerCase().includes('video');
    const finalElearning = isDoc ? JSON.stringify(docList) : (elearningEditorMode === 'form' ? serializeBlocksToMarkdown(elearningBlocks) : elearningMarkdown);
    const finalPresentation = presentationEditorMode === 'form' ? serializeBlocksToMarkdown(presentationBlocks) : presentationMarkdown;
    let error;

    if (moduleId) {
        const { error: modError } = await supabase.from('lesson_modules').update({
            content_markdown: finalElearning,
            presentation_markdown: finalPresentation,
            video_url: videoUrl,
            attachment_url: attachmentUrl
        }).eq('id', moduleId);
        error = modError;

        await supabase.from('lessons').update({
            title, course_id: selectedCourseId || null, chapter_id: selectedChapterId || null
        }).eq('id', lessonId);
    } else {
        const { error: lesError } = await supabase.from('lessons').update({
          title,
          content_markdown: finalElearning,
          presentation_markdown: finalPresentation,
          video_url: videoUrl,
          attachment_url: attachmentUrl,
          course_id: selectedCourseId || null,
          chapter_id: selectedChapterId || null
        }).eq('id', lessonId);
        error = lesError;
    }

    setIsSavingDB(false);
    if (error) alert("Lỗi lưu bài: " + error.message); else alert("Đã lưu thành công!");
  };

  const addToQueue = (file: File) => {
    setPendingImages(prev => [...prev, { id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file) }]);
  };

  const removePendingImage = (id: string) => {
    setPendingImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
  };

  const handleExportWord = async (type: 'student' | 'teacher' = 'teacher') => {
    try {
      let content = editorMode === 'form' ? serializeBlocksToMarkdown(blocks) : markdownContent;

      if (type === 'student') {
         // Xóa bỏ các đoạn được đánh dấu là Lời Giải
         content = content.replace(/\*\*(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|Đáp\s*án).*?\*\*:?[\s\S]*?(?=\*\*Câu|$)/gi, '\n');
         content = content.replace(/<details>[\s\S]*?<summary>.*?(?:Lời\s*giải|Đáp\s*án).*?<\/summary>[\s\S]*?<\/details>/gi, '\n');
      }

      // Xóa màu chữ LaTeX (\color{}) và chữa lỗi cú pháp hệ phương trình viết tắt
      content = content.replace(/\\{1,2}color\s*\{[^}]+\}/gi, '');
      content = content.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');

      // Bóc tách các khối câu hỏi ```quiz``` thành đối tượng JSON thật (không phải chuỗi)
      const quizBlocks: any[] = [];
      content = content.replace(/```quiz\n([\s\S]*?)\n```/g, (match, jsonString) => {
          try {
              const quiz = JSON.parse(jsonString);
              quizBlocks.push(quiz);
              return `\n@@QUIZ_${quizBlocks.length - 1}@@\n`;
          } catch (e) { return match; }
      });

      const bodyParagraphs: Paragraph[] = [];
      const lines = content.split('\n');
      let questionCounter = 1;

      for (const rawLine of lines) {
          const trimmed = rawLine.trim();
          if (!trimmed) continue;
          if (trimmed === '---') continue; // dấu ngắt trang cũ - bỏ qua

          const quizMatch = trimmed.match(/^@@QUIZ_(\d+)@@$/);
          if (quizMatch) {
              const quiz = quizBlocks[Number(quizMatch[1])];
              if (quiz) {
                  bodyParagraphs.push(...(await renderQuizToParagraphs(quiz, questionCounter, type)));
                  questionCounter++;
              }
              continue;
          }

          let text = trimmed;

          let isQuote = false;
          if (text.startsWith('> ')) { isQuote = true; text = text.slice(2); }
          else if (text === '>') { isQuote = true; text = ''; }

          let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
          if (text.startsWith('### ')) { headingLevel = HeadingLevel.HEADING_3; text = text.slice(4); }
          else if (text.startsWith('## ')) { headingLevel = HeadingLevel.HEADING_2; text = text.slice(3); }
          else if (text.startsWith('# ')) { headingLevel = HeadingLevel.HEADING_1; text = text.slice(2); }

          text = text.replace(/^[\-\+\*]\s*/, isQuote ? '' : '- ');

          const runs = await buildRunsFromLine(text, isQuote ? { color: '555555' } : {});
          bodyParagraphs.push(new Paragraph({
              heading: headingLevel,
              children: runs,
              indent: isQuote ? { left: 480 } : undefined,
              border: isQuote ? { left: { style: BorderStyle.SINGLE, size: 12, color: '6366F1', space: 8 } } : undefined,
              spacing: { before: headingLevel ? 240 : 80, after: 80 },
          }));
      }

      const doc = new Document({
          styles: {
              default: { document: { run: { size: 26, font: 'Times New Roman' } } },
          },
          sections: [{
              properties: {},
              children: [
                  new Paragraph({
                      children: [new TextRun({ text: title || 'Giáo Án Lý Thuyết', bold: true, size: 36, color: '00529B' })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 300 },
                  }),
                  ...bodyParagraphs,
              ],
          }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `GiaoAn_${title || 'BaiGiang'}.docx`);
    } catch (e) { alert("Lỗi xuất file Word: " + e); }
  };

  const handleAnalyzeQueue = async () => {
    if (pendingImages.length === 0 && pendingText.trim().length === 0) return alert("Hàng đợi rỗng!");

    setIsAnalyzing(true);
    try {
      // Tự động xin cấp phát khóa AI và danh sách model từ hệ thống
      const cauHinh = await layCauHinhAI();

      const isPractice = isPracticeModule;
      const prompt = getPrompt(isPractice, activeTab === 'presentation');

      let finalPrompt = prompt;
      if (pendingText.trim().length > 0) {
          finalPrompt += "\n\n[NỘI DUNG VĂN BẢN TỪ FILE WORD]:\n" + pendingText;
      }

      // PDF phải dựng thành ảnh trước: cỗ máy tự cắt hình vẽ lên canvas nên chỉ nhận ảnh,
      // và khung Smart Cropper cũng không hiển thị được tệp PDF.
      const anhNguon = await chuanHoaNguonThanhAnh(
        pendingImages.map(img => img.file),
        (moTa) => setTrangThaiNguon(moTa),
        (f, loi) => alert(`Không đọc được tệp ${f.name}: ${loi}`),
      );
      setTrangThaiNguon('');
      let ketQuaCatAnh: { daCat: number; hong: number; veLai: number } | null = null;

      const imageParts = await filesToGeminiParts(anhNguon);

      // Xoay vòng toàn bộ API key, hết key thì tụt xuống model kế tiếp - thay vì chết
      // cả lượt soạn bài vì đúng model đầu tiên đang bị Google quá tải.
      let text = await callGeminiWithKeyFallback(cauHinh, finalPrompt, imageParts);

      // TỰ ĐỘNG CẮT ẢNH ngay tại đây, khi File gốc còn trong bộ nhớ (bên dưới sẽ
      // setPendingImages([]) làm mất File).
      if (anhNguon.length > 0) {
        try {
          const parsed = parseMarkdownToBlocks(text);
          setTrangThaiNguon('Đang xử lý hình minh hoạ (ưu tiên vẽ lại bằng nét vector)...');
          const { blocks: croppedBlocks, croppedCount, failedCount, redrawnCount } = await autoCropBlocksImages(
            parsed,
            anhNguon,
            supabase,
            cauHinh,
          );
          if (croppedCount > 0) text = serializeBlocksToMarkdown(croppedBlocks);
          ketQuaCatAnh = { daCat: croppedCount, hong: failedCount, veLai: redrawnCount };
          setTrangThaiNguon('');
        } catch (e) {
          console.warn('Bỏ qua bước tự cắt ảnh, giữ nguyên kết quả quét:', e);
        }
      }

      const separator = markdownContent.length > 0 && !markdownContent.endsWith('---') ? "\\n\\n---\\n\\n" : "\\n\\n";
      const finalText = text;
      setMarkdownContent((prev: string) => {
        const newMarkdown = prev ? prev + separator + finalText : finalText;
        if (editorMode === 'form') {
           setBlocks(parseMarkdownToBlocks(newMarkdown));
        }
        return newMarkdown;
      });

      if (anhNguon.length > 0) {
        // Giữ lại ảnh nguồn (đã dựng từ PDF nếu cần) để còn cắt tay trong phiên này
        setLastAnalyzedImages(anhNguon.map(f => URL.createObjectURL(f)));
      }
      if (ketQuaCatAnh && (ketQuaCatAnh.daCat > 0 || ketQuaCatAnh.hong > 0)) {
        const soCatAnh = ketQuaCatAnh.daCat - ketQuaCatAnh.veLai;
        alert(
          `Đã xử lý ${ketQuaCatAnh.daCat} hình minh hoạ:`
          + `
  - ${ketQuaCatAnh.veLai} hình máy VẼ LẠI bằng nét vector (in cỡ nào cũng sắc)`
          + `
  - ${soCatAnh} hình dùng ảnh cắt (máy không vẽ lại được)`
          + `

Hình nào máy vẽ lại, hãy soi kỹ các con số trước khi dùng - máy vẽ lại chứ không phải làm sạch.`
          + (ketQuaCatAnh.hong > 0
              ? `

${ketQuaCatAnh.hong} câu không xử lý được, đã giữ dấu [CÓ HÌNH ẢNH KÈM THEO] để thầy cô cắt tay.`
              : '')
        );
      }
      setPendingImages([]);
      setPendingText("");

    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes("429")) {
        alert("Lỗi AI: Vượt quá giới hạn (Quota) của API Key (Lỗi 429). Vui lòng chờ 1 lát rồi thử lại, hoặc sử dụng API Key Google khác!");
      } else {
        alert("Lỗi AI: " + (error.message || "Kiểm tra lại kết nối."));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyUploadPrompt = () => {
    navigator.clipboard.writeText("Đây là các tài liệu đợt tiếp theo. BẠN CHỈ CẦN XÁC NHẬN 'Đã nhận ảnh đợt này', TUYỆT ĐỐI CHƯA LÀM GÌ VỘI.");
    alert("Đã copy lệnh tải ảnh!\n\nThầy/Cô hãy dán lệnh này kèm 10 ảnh vào Gemini. Nhắc lại thao tác này cho đến khi tải hết toàn bộ ảnh.");
  };

  const handleCopyShortPrompt = () => {
    const isPractice = isPracticeModule;
    /* Kèm luật chống đứt giữa chừng: bài "ngắn" vẫn thừa sức chạm trần độ dài nếu mỗi câu
       kèm lời giải chi tiết. Trước đây chỉ lệnh "Bắt đầu xử lý" mới có dặn. */
    const prompt = getPrompt(isPractice, activeTab === 'presentation') + LUAT_KHONG_CAT_CUT;

    navigator.clipboard.writeText(prompt);
    alert("Đã Copy Prompt Chuẩn cho bài NGẮN!\n\nThầy/Cô hãy mở gemini.google.com, kéo thả CÁC ẢNH VÀO, sau đó dán văn bản này vào và ấn Gửi.");
  };

  const handleCopyPrompt = () => {
    const isPractice = isPracticeModule;
    const prompt = getPrompt(isPractice, activeTab === 'presentation');
    const taskName = isPractice ? "bóc tách thành các câu hỏi trắc nghiệm/tự luận" : "soạn thành 1 bài giảng duy nhất";

    navigator.clipboard.writeText(`TÔI ĐÃ TẢI XONG TOÀN BỘ ẢNH.\nBây giờ hãy BẮT ĐẦU tổng hợp TẤT CẢ các ảnh tôi đã gửi từ nãy đến giờ và ${taskName} theo định dạng sau:\n\n${prompt}\n\n${LUAT_KHONG_CAT_CUT}`);
    alert(`Đã copy lệnh BẮT ĐẦU ${isPractice ? 'BÓC TÁCH ĐỀ' : 'SOẠN BÀI'}!\n\nThầy/Cô dán lệnh này vào Gemini (không kèm ảnh) để yêu cầu nó bắt đầu tổng hợp xuyên suốt nhé.`);
  };

  const handleInsertManualMarkdown = (closeModal: boolean = true) => {
    if (!manualGeminiInput.trim()) {
      alert("Vui lòng dán nội dung từ Gemini vào khung trước!");
      return;
    }

    /* Chèn BẢN ĐÃ DỌN chứ không chèn nguyên văn: câu trả lời của Gemini hay đứt giữa một
       chuỗi, để nguyên thì cả khối quiz hỏng mà nhìn mắt thường không thấy đứt ở đâu. */
    const soat = soatKhoiQuiz(manualGeminiInput);
    const noiDungChen = soat.coJson && soat.biCatCut ? soat.banSach : manualGeminiInput;

    const separator = markdownContent.length > 0 && !markdownContent.endsWith('---') ? "\n\n---\n\n" : "\n\n";
    setMarkdownContent((prev: string) => {
        const newMarkdown = prev ? prev + separator + noiDungChen : noiDungChen;
        if (editorMode === 'form') {
           setBlocks(parseMarkdownToBlocks(newMarkdown));
        }
        return newMarkdown;
    });
    setManualGeminiInput("");

    /* Bị cắt cụt thì KHÔNG đóng hộp: Thầy cô còn phải bấm "Copy lệnh nối tiếp" rồi dán
       đợt sau vào đây. Đóng lại là mất luôn mấy câu còn thiếu mà không ai biết. */
    if (soat.biCatCut) {
      setDaCatCut({ soCau: soat.soCau, cauBiCut: soat.cauBiCut });
      alert(
        `⚠️ Gemini trả lời BỊ CẮT CỤT giữa chừng.\n\n`
        + `Đã lấy được ${soat.soCau} câu trọn vẹn và chèn vào bài; câu đang dở bị bỏ đi.\n\n`
        + `Hộp vẫn mở: Thầy/Cô bấm "Copy lệnh nối tiếp" ở ngay trên, dán sang Gemini để nó làm `
        + `nốt từ câu ${soat.soCau + 1}, rồi dán kết quả vào đây như cũ.`,
      );
      return;
    }

    setDaCatCut(null);
    if (closeModal) {
      setIsBackupModalOpen(false);
      alert(soat.coJson
        ? `Đã chèn ${soat.soCau} câu vào bài.`
        : "Đã chèn nội dung thành công!");
    } else {
      alert("Đã chèn xong đợt này! Khung chữ đã được xóa trắng, Thầy/Cô có thể dán tiếp nội dung của đợt ảnh tiếp theo vào đây.");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isCropModalOpen) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setCropImageSrc(reader.result?.toString() || ''));
            reader.readAsDataURL(file);
          }
          e.preventDefault(); break;
        }
      }
      return;
    }
    const items = e.clipboardData.items;
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) { addToQueue(file); hasImage = true; }
      }
    }
    if (hasImage) e.preventDefault();
  };

  // --- Hỗ trợ Dán Ảnh (Ctrl+V) Toàn cục ---
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isCropModalOpen) return; // Nếu đang mở crop modal, để modal tự lo

      const target = e.target as HTMLElement;
      // Bỏ qua nếu người dùng đang nhập liệu vào ô text (tránh xung đột copy-paste văn bản)
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      let hasImage = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
             addToQueue(file);
             hasImage = true;
          }
        }
      }
      if (hasImage) e.preventDefault();
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [isCropModalOpen]);


  const handleQueueFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            if (result.value) {
               setPendingText(prev => prev + (prev ? "\n\n" : "") + result.value);
            }
          } catch(err) {
            alert("Lỗi đọc file Word: " + err);
          }
        } else {
          addToQueue(file);
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  function getCroppedImg(image: HTMLImageElement, crop: Crop, fileName: string): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width; const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width; canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if(!ctx) return Promise.reject("No 2d context");
    ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width, crop.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas is empty')); return; }
        resolve(blob);
      }, 'image/jpeg');
    });
  }

  const handleUploadCroppedImage = async () => {
    if (!imgRef.current || !crop || crop.width === 0 || crop.height === 0) return alert("Bạn chưa chọn vùng!");
    setIsUploadingCropped(true);
    try {
      const blob = await getCroppedImg(imgRef.current, crop, 'crop.jpg');
      const file = new File([blob], 'crop.jpg', { type: 'image/jpeg' });
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
      const filePath = `editor_images/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('lesson_images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      const imageMarkdown = `\n![Hình minh họa](${publicUrl})\n`;

      if (targetCropBlockId) {
        // CHÈN VÀO BLOCK EDITOR
        const newBlocks = [...blocks];
        const bIndex = newBlocks.findIndex(b => b.id === targetCropBlockId);
        if (bIndex > -1) {
            const b = newBlocks[bIndex];
            // So sánh trước/sau thay vì .test(): IMAGE_PLACEHOLDER_STRIP_REGEX mang cờ "g"
            // nên .test() nhớ lastIndex giữa các lần gọi. Bản regex cũ ở đây còn thiếu cờ "g"
            // nên chỉ thay được đúng 1 marker mỗi lần cắt.
            const replaceMarker = (text: string): string => {
                const replaced = (text || '').replace(IMAGE_PLACEHOLDER_STRIP_REGEX, imageMarkdown);
                return replaced !== (text || '') ? replaced : (text || '') + imageMarkdown;
            };
            if (b.type === 'md' && typeof b.content === 'string') {
                b.content = replaceMarker(b.content);
            } else if (b.type === 'quiz') {
                b.content.question = replaceMarker(b.content.question);
                // Giữ nguyên autoCropMetadata để còn cắt lại được nhiều lần; chấm đỏ đã
                // tự tắt nhờ blockNeedsImage kiểm tra "đã có ảnh trong nội dung hay chưa".
            }
            setBlocks(newBlocks);
        }
        setTargetCropBlockId(null);
      } else {
        // CHÈN VÀO RAW MARKDOWN
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart; const end = textareaRef.current.selectionEnd;
            setMarkdownContent(markdownContent.substring(0, start) + imageMarkdown + markdownContent.substring(end));
        } else {
            setMarkdownContent(prev => prev + imageMarkdown);
        }
      }
      setIsCropModalOpen(false); setCropImageSrc(''); setCrop(undefined);
    } catch (error: any) {
      console.error(error); alert("Lỗi tải ảnh. Kiểm tra lại Storage Bucket.");
    } finally {
      setIsUploadingCropped(false);
    }
  };




  const renderMarkdown = (content: string) => (
    <ReactMarkdown urlTransform={chuyenDiaChiAnh}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        span: ({node, style, children, ...props}: any) => {
            let parsedStyle: any = {};
            if (typeof style === 'string') {
                style.split(';').forEach((rule: string) => {
                    const [key, val] = rule.split(':');
                    if (key && val) {
                        const camelKey = key.trim().replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());
                        parsedStyle[camelKey] = val.trim();
                    }
                });
            } else if (style) {
                parsedStyle = style;
            }
            return <span style={parsedStyle} {...props}>{children}</span>;
        },
        strong: ({node, children, ...props}) => {
           const text = String(children);
           if (text.toLowerCase().includes("hướng dẫn giải") || text.toLowerCase().includes("phương pháp giải") || text.toLowerCase().includes("lời giải")) {
              return (
                 <span className="block mt-10 mb-4 not-prose w-full">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-t-2xl font-black flex items-center gap-3 w-max max-w-full shadow-md">
                       <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner text-lg">💡</span>
                       {text.toUpperCase()}
                    </span>
                    <span className="bg-white border-l-4 border-orange-400 p-4 rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-100 flex items-center gap-2 mb-2 w-full">
                       <span className="text-orange-600 font-bold text-sm uppercase flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                          Các bước chi tiết bên dưới
                       </span>
                    </span>
                 </span>
              );
           }
           if (text.toLowerCase().startsWith("bước")) {
              return (
                 <span className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-1 rounded-lg font-black shadow-sm mt-3 mb-1 mr-2">
                   <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                   {children}
                 </span>
              );
           }
           return <strong {...props} className="text-slate-900 font-bold">{children}</strong>;
        },
        blockquote({ node, children, ...props }) {
          const contentStr = String(children);
          if (contentStr.includes('💡') || contentStr.toLowerCase().includes('định lý') || contentStr.toLowerCase().includes('định nghĩa')) {
            return (
              <blockquote className="bg-yellow-50 border-l-4 border-yellow-500 px-6 py-5 rounded-r-2xl my-6 not-prose shadow-sm relative transition-all hover:shadow-md" {...props}>
                <div className="font-semibold text-yellow-900 text-[1.1em]">{children}</div>
              </blockquote>
            );
          }
          if (contentStr.includes('📌') || contentStr.toLowerCase().includes('ví dụ')) {
            return (
              <blockquote className="bg-sky-50 border-l-4 border-sky-500 px-6 py-5 rounded-r-2xl my-6 not-prose shadow-sm transition-all hover:shadow-md" {...props}>
                <div className="font-semibold text-sky-900 text-[1.1em]">{children}</div>
              </blockquote>
            );
          }
          return <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-500 my-4" {...props}>{children}</blockquote>
        },
        code(props) {
          const {children, className, node, ...rest} = props
          const match = /language-(\w+)/.exec(className || '')
          if (!match?.length) return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-sm" {...rest}>{children}</code>;

          if (match[1] === 'quiz' || match[1] === 'json') {
            try {
              const data = JSON.parse(String(children).replace(/\n$/, ''));
              if (Array.isArray(data)) {
                 return (
                    <div className="space-y-6">
                       {data.map((q, idx) => (
                           <InteractiveQuiz key={idx} data={q} onPass={() => {}} />
                       ))}
                    </div>
                 );
              }
              return <InteractiveQuiz data={data} onPass={() => {}} />
            } catch (e) {
              return <div className="p-4 bg-red-100 text-red-600 rounded-lg shadow-sm border border-red-200">Lỗi: Cấu trúc câu hỏi Quiz từ AI không hợp lệ. Vui lòng sửa lại.</div>
            }
          }
          return <code className={className} {...rest}>{children}</code>
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );

  const handleCreateNewLesson = async () => {
    setIsCreating(true);
    // Tạo 1 bản nháp mới vào bảng lessons
    const { data, error } = await supabase.from('lessons').insert([{ title: "Bài giảng AI nháp" }]).select().single();
    setIsCreating(false);
    if (error) {
      alert("Lỗi khi tạo bài: " + error.message + " (Do Ràng buộc cơ sở dữ liệu, bạn vui lòng tạo Bài từ Cấu trúc Khóa học)");
    } else if (data) {
      router.replace(`/admin/lessons/editor?lessonId=${data.id}`);
    }
  };

  if (!lessonId) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 m-4 md:m-8 rounded-[2.5rem] border border-indigo-100/50 shadow-inner min-h-[80vh]">
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl max-w-xl w-full border border-gray-100 relative overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500"></div>
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-white">
          <Sparkles className="w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-4 tracking-tight">AI Studio</h2>
        <p className="text-gray-500 mb-10 leading-relaxed text-lg px-4">Bạn chưa chọn Bài giảng cụ thể. Khởi tạo một Bản Nháp mới để thỏa sức sáng tạo với AI ngay bây giờ?</p>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleCreateNewLesson}
            disabled={isCreating}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(79,70,229,0.6)] hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-70 text-lg"
          >
            {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
            Tạo Bản Nháp Mới Trống
          </button>
          <button
            onClick={luiMotBac}
            className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 hover:text-gray-800 transition-colors text-lg"
          >
            Quay lại Danh sách
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col gap-2 relative">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-shrink-0 transition-all duration-300 z-20">
        {!isHeaderExpanded ? (
           <div className="flex justify-between items-center px-3 py-1.5 bg-gray-50/80 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsHeaderExpanded(true)}>
             <div className="flex items-center gap-3">
               <button onClick={(e) => { e.stopPropagation(); luiMotBac(); }} title="Quay lại một bậc" className="p-1.5 text-gray-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></button>
               <span className="font-bold text-sm text-gray-700 flex items-center gap-2"><Edit2 className="w-4 h-4 text-indigo-500" /> <span className="hidden sm:inline">Cài đặt:</span> <span className="text-teal-700 truncate max-w-[200px] sm:max-w-xs">{title || 'Đang tải...'}</span> {moduleTitle && <><span className="text-gray-300">/</span><span className="text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md text-xs border border-orange-200 uppercase tracking-wide shrink-0 shadow-sm">{moduleTitle}</span></>}</span>
             </div>
             <div className="flex items-center gap-3">
               <button onClick={(e) => { e.stopPropagation(); handleSaveToDB(); }} disabled={isSavingDB} className="bg-teal-600 text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-sm hover:bg-teal-700 flex items-center gap-1.5">
                  {isSavingDB ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5" />} Lưu
               </button>
               {lessonId && (
                 <button onClick={async (e) => {
                   e.stopPropagation();
                   await handleSaveToDB();
                   // Kèm moduleId để mở thẳng đúng mục vừa soạn. Thiếu nó thì trang học
                   // sinh mở ở mục đầu tiên (Lý thuyết), Thầy cô tưởng đề chưa lưu được.
                   window.open(
                     `/student/lessons/${lessonId}` + (moduleId ? `?moduleId=${moduleId}` : ''),
                     '_blank',
                   );
                 }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1.5">
                   <MonitorPlay className="w-3.5 h-3.5" /> Demo
                 </button>
               )}
               {lessonId && moduleId && (
                 <button onClick={async (e) => {
                   e.stopPropagation();
                   await handleSaveToDB();
                   window.open(`/present/${lessonId}?moduleId=${moduleId}`, '_blank');
                 }} className="bg-amber-500 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-amber-600 shadow-sm flex items-center gap-1.5 ml-2">
                   <Presentation className="w-3.5 h-3.5" /> Trình chiếu
                 </button>
               )}
               <button onClick={(e) => { e.stopPropagation(); setMoHuongDan(true); }}
                       title="Bảng tra lệnh soạn bài"
                       className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-gray-50 shadow-sm flex items-center gap-1.5 ml-2">
                 <HelpCircle className="w-3.5 h-3.5" /> Hướng dẫn
               </button>
               <div className="p-1 bg-gray-200 rounded-md ml-2"><ChevronDown className="w-4 h-4 text-gray-600" /></div>
             </div>
           </div>
        ) : (
           <div className="p-4 relative">
             <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
               <button onClick={(e) => { e.stopPropagation(); luiMotBac(); }} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:bg-white shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /> Trở về</button>
             </div>
             <button onClick={() => setIsHeaderExpanded(false)} className="absolute top-3 right-3 text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-50 rounded-full p-1.5 transition-colors z-10"><ChevronUp className="w-4 h-4" /></button>
             <div className="flex flex-col gap-4 mb-2 mt-5">
          <div className="flex gap-4 items-start">
            <div className="flex-[2]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">Tên Bài Giảng {moduleTitle && <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 normal-case tracking-normal">Mục: {moduleTitle}</span>}</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-bold text-gray-800 bg-transparent border-b border-gray-200 focus:border-teal-500 focus:outline-none pb-1 transition-colors"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Thuộc Khóa học</label>
              <select
                value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedChapterId(""); }}
                className="w-full text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Chọn --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Thuộc Chương</label>
              <select
                value={selectedChapterId} onChange={e => setSelectedChapterId(e.target.value)}
                disabled={!selectedCourseId}
                className="w-full text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                <option value="">-- Chọn --</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          {!isPracticeModule && (
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:border-teal-500 transition-colors shadow-sm">
                  <Video className="w-4 h-4 text-rose-500 shrink-0" />
                  <input
                    type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Link Video YouTube (VD: https://youtube.com/...)"
                    className="w-full bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 text-gray-700"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:border-teal-500 transition-colors shadow-sm">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <input
                    type="text" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Link Tài liệu tải xuống (Google Drive, PDF...)"
                    className="w-full bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 text-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
            <div className="text-xs text-gray-400 font-medium">Bản nháp được lưu tại: <span className="text-teal-600 font-bold">{title}</span></div>
            <div className="flex items-center gap-3">

              <button onClick={() => setMoHuongDan(true)}
                      title="Bảng tra lệnh soạn bài"
                      className="bg-white border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <HelpCircle className="w-4 h-4" /> Hướng dẫn
              </button>

              <button onClick={handleSaveToDB} disabled={isSavingDB} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-[0_5px_15px_-5px_rgba(13,148,136,0.4)] hover:-translate-y-0.5 disabled:opacity-50">
                {isSavingDB ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Lưu
              </button>
              {lessonId && (
                <button onClick={async (e) => { e.stopPropagation(); await handleSaveToDB(); window.open(`/student/lessons/${lessonId}`, '_blank'); }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-[0_5px_15px_-5px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 ml-2">
                    <MonitorPlay className="w-4 h-4" /> Xem Học sinh
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>

      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">
          {(isDocumentModule || isVideoModule) ? (
             <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
                <div className="mb-6 flex justify-between items-center">
                   <h3 className="text-lg font-bold text-gray-800">Quản lý Tài liệu & Video</h3>
                   <button onClick={() => setDocList([...docList, { id: Math.random().toString(36).substring(7), title: '', doc_url: '', video_url: '' }])} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">+ Thêm Mục mới</button>
                </div>
                <div className="flex flex-col gap-4 max-w-4xl">
                   {docList.map((doc: any, idx) => (
                      <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 group relative hover:border-indigo-300 transition-colors">
                         <button onClick={() => setDocList(docList.filter(d => d.id !== doc.id))} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-indigo-500"/> Tiêu đề (Bắt buộc)</label>
                            <input type="text" value={doc.title} onChange={(e) => { const n = [...docList]; n[idx].title = e.target.value; setDocList(n); }} className="w-full text-sm font-bold border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none" placeholder="VD: Video chữa bài và Đề PDF" />
                         </div>
                         <div className="flex flex-col md:flex-row gap-4">
                           <div className="flex flex-col gap-2 flex-1">
                              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Video className="w-3.5 h-3.5 text-rose-500"/> Link Video (Tùy chọn)</label>
                              <input type="text" value={doc.video_url || (isVideoModule ? doc.url : '') || ''} onChange={(e) => { const n = [...docList]; n[idx].video_url = e.target.value; setDocList(n); }} className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none font-mono" placeholder="https://youtube.com/..." />
                           </div>
                           <div className="flex flex-col gap-2 flex-1">
                              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5 text-blue-500"/> Link Tài liệu tải về (Tùy chọn)</label>
                              <input type="text" value={doc.doc_url || (!isVideoModule ? doc.url : '') || ''} onChange={(e) => { const n = [...docList]; n[idx].doc_url = e.target.value; setDocList(n); }} className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none font-mono" placeholder="https://drive.google.com/..." />
                           </div>
                         </div>
                      </div>
                   ))}
                   {docList.length === 0 && (
                      <div className="text-center py-16 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                         <div className="flex items-center justify-center gap-2 mb-3"><FileText className="w-8 h-8 text-gray-300" /><Video className="w-8 h-8 text-gray-300" /></div>
                         <p className="text-gray-500 font-medium mb-4">Chưa có tài liệu hay video nào trong mục này.</p>
                         <button onClick={() => setDocList([{ id: Math.random().toString(36).substring(7), title: '', doc_url: '', video_url: '' }])} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-100 transition-colors">+ Bấm để thêm mục đầu tiên</button>
                      </div>
                   )}
                </div>
             </div>
          ) : (
          <React.Fragment>
          {isHeaderExpanded && (
            <React.Fragment>
          <div className="flex bg-slate-100 p-1 gap-1 border-b border-slate-200">
             <button onClick={() => setActiveTab('elearning')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all shadow-sm ${activeTab === 'elearning' ? 'bg-white text-indigo-700 border border-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
                📱 Chế độ App (E-learning)
             </button>
             <button onClick={() => setActiveTab('presentation')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all shadow-sm ${activeTab === 'presentation' ? 'bg-white text-orange-700 border border-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
                📺 Chế độ Trình chiếu
             </button>
          </div>

          <div className="bg-gray-50 border-b border-gray-100 p-2.5 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-700 text-sm">
                    {activeTab === 'elearning' ? 'Nội dung E-learning' : 'Nội dung Trình chiếu'}
                </span>
                <button onClick={() => {
                    const source = activeTab === 'elearning' ? 'Trình chiếu' : 'E-learning';
                    if (window.confirm(`Thao tác này sẽ GHI ĐÈ toàn bộ nội dung hiện tại bằng nội dung từ chế độ ${source}. Bạn có chắc chắn?`)) {
                        if (activeTab === 'elearning') {
                            setElearningMarkdown(presentationMarkdown);
                            setElearningBlocks(presentationBlocks);
                        } else {
                            setPresentationMarkdown(elearningMarkdown);
                            setPresentationBlocks(elearningBlocks);
                        }
                    }
                }} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-100 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-md hover:bg-indigo-200 transition-colors shadow-sm">
                    🔄 Đồng bộ từ {activeTab === 'elearning' ? 'Trình chiếu' : 'E-learning'}
                </button>
            </div>
            <button onClick={() => {
                 if (editorMode === 'form') setMarkdownContent(serializeBlocksToMarkdown(blocks));
                 else setBlocks(parseMarkdownToBlocks(markdownContent));
                 setEditorMode(editorMode === 'form' ? 'raw' : 'form');
              }} className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors shadow-sm">
                 {editorMode === 'form' ? <Code2 className="w-3.5 h-3.5" /> : <ListTodo className="w-3.5 h-3.5" />} {editorMode === 'form' ? 'Chế độ Code' : 'Chế độ Form'}
              </button>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} multiple onChange={handleQueueFileUpload} accept="image/*,application/pdf" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"><ImageIcon className="w-3.5 h-3.5" /> Tải File / Dán Ảnh (Ctrl+V)</button>
              <button onClick={() => { if (lastAnalyzedImages.length > 0) setCropImageSrc(lastAnalyzedImages[0]); setIsCropModalOpen(true); }} className="flex items-center gap-1.5 text-xs font-medium bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-md hover:bg-orange-100 transition-colors shadow-sm"><CropIcon className="w-3.5 h-3.5" /> Cắt Ảnh & Chèn</button>
              <button onClick={() => setIsBackupModalOpen(true)} className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors shadow-sm" title="Sinh mẫu Prompt thủ công"><Bot className="w-3.5 h-3.5" /> Lấy Prompt Thủ Công</button>
              <button onClick={() => setGlobalTriggerBankModal(prev => prev + 1)} className="flex items-center gap-1.5 text-xs font-bold bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1.5 rounded-md hover:bg-amber-200 transition-colors shadow-sm"><Database className="w-3.5 h-3.5" /> Rút từ Ngân hàng</button>
              <button onClick={() => setIsPushToBankModalOpen(true)} className="flex items-center gap-1.5 text-xs font-bold bg-fuchsia-100 border border-fuchsia-300 text-fuchsia-800 px-3 py-1.5 rounded-md hover:bg-fuchsia-200 transition-colors shadow-sm"><UploadCloud className="w-3.5 h-3.5" /> Đưa vào Ngân hàng</button>
              <div className="relative">
                <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors shadow-[0_4px_10px_-2px_rgba(37,99,235,0.4)]">
                  <Download className="w-3.5 h-3.5" /> Xuất Giáo Án (Word) <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isExportMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <button onClick={() => { handleExportWord('student'); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700 text-sm">Bản Học Sinh (Chỉ Đề)</button>
                    <button onClick={() => { handleExportWord('teacher'); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700 text-sm">Bản Giáo Viên (Có Lời giải)</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(pendingImages.length > 0 || pendingText.length > 0) && (
              <div className="bg-indigo-50/50 border-b border-indigo-100 p-3 max-h-64 overflow-y-auto shrink-0 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-indigo-800 uppercase">Hàng đợi ({pendingImages.length})</h4>
                  <button onClick={handleAnalyzeQueue} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 animate-bounce"><Sparkles className="w-3.5 h-3.5" /> Phân Tích Đợt Này</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingText.length > 0 && (
                    <div className="relative group rounded-md border border-blue-200 p-2 shadow-sm bg-blue-50 text-blue-800 text-xs font-bold w-32 break-words flex flex-col justify-center items-center text-center">
                      <span className="text-xl mb-1">📄</span>
                      <span>Word Text</span>
                      <span className="font-normal text-[10px] mt-0.5">{pendingText.length} ký tự</span>
                      <button onClick={() => setPendingText("")} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  {pendingImages.map(img => (
                    <div key={img.id} className="relative group rounded-md border border-indigo-200 overflow-hidden shadow-sm bg-white">
                      {img.file.type === 'application/pdf' ? (
                        <div className="h-16 w-16 bg-red-50 flex flex-col items-center justify-center text-red-600 font-bold text-[10px]"><span className="text-xl mb-1">📄</span>PDF</div>
                      ) : (
                        <img src={img.previewUrl} alt="Preview" className="h-16 w-16 object-cover" />
                      )}
                      <button onClick={() => removePendingImage(img.id)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </React.Fragment>
          )}
          <div className="flex-1 flex flex-col relative min-h-[75vh]">
            {editorMode === 'raw' ? (
              <div className="flex flex-col flex-1 relative min-h-0">

                 <div className="sticky top-0 z-40 flex flex-col shadow-sm">
                   {/* Thanh công cụ phụ cho RAW */}
                   <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                         <button onClick={() => setShowRawPreview(!showRawPreview)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${showRawPreview ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                            <Eye className="w-4 h-4"/> {showRawPreview ? 'Ẩn Xem Trước' : 'Bật Xem Trước (Split View)'}
                         </button>
                         {showRawPreview && (
                             <button onMouseDown={handleFixRawLatex} className="flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors shadow-sm">
                                🪄 Sửa lỗi LaTeX tự động
                             </button>
                         )}
                      </div>
                   </div>

                   {/* Cảnh báo Bảng/Ảnh */}
                   {(() => {
                      // Dùng regex chung (bản cũ ở đây thiếu nhánh "HÌNH ẢNH" nên không cảnh
                      // báo với marker "[CÓ HÌNH ẢNH KÈM THEO]"); vẫn giữ thêm nhánh bảng Markdown.
                      const hasImageOrTable = IMAGE_NEEDED_REGEX.test(markdownContent) || /\|.*\|.*\n\s*\|[-\s:]+\|/.test(markdownContent);
                      if (!hasImageOrTable) return null;
                      return (
                          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 shrink-0 flex items-center justify-between">
                              <span className="text-[13px] font-medium text-yellow-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600"/> Có Bảng / Yêu cầu chèn ảnh! Đặt con trỏ đúng vị trí và nhấn:</span>
                              <button onClick={() => {
                                  setTargetCropBlockId(null);
                                  if (lastAnalyzedImages.length > 0) setCropImageSrc(lastAnalyzedImages[0]);
                                  setIsCropModalOpen(true);
                              }} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 animate-pulse"><CropIcon className="w-3.5 h-3.5"/> Cắt & Chèn Ảnh Tại Con Trỏ</button>
                          </div>
                      );
                   })()}

                   <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-2 flex items-center gap-2 shrink-0 flex-wrap">
                      <span className="text-xs font-bold text-indigo-800 uppercase mr-1">Bôi đen chữ rồi ấn:</span>
                      <button onClick={() => applyFormatting('**', '**')} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-100 text-slate-800 font-black text-sm" title="In đậm (Bold)">B</button>
                      <button onClick={() => applyFormatting('<span style="color:red">', '</span>')} className="w-8 h-8 flex items-center justify-center bg-white border border-red-200 rounded shadow-sm hover:bg-red-50 text-red-600 font-black text-sm" title="Chữ Đỏ">A</button>
                      <button onClick={() => applyFormatting('<span style="color:blue">', '</span>')} className="w-8 h-8 flex items-center justify-center bg-white border border-blue-200 rounded shadow-sm hover:bg-blue-50 text-blue-600 font-black text-sm" title="Chữ Xanh Dương">A</button>
                      <button onClick={() => applyFormatting('<span style="color:green">', '</span>')} className="w-8 h-8 flex items-center justify-center bg-white border border-green-200 rounded shadow-sm hover:bg-green-50 text-green-600 font-black text-sm" title="Chữ Xanh Lá">A</button>
                      <div className="w-px h-5 bg-indigo-200 mx-1"></div>
                      <button onClick={() => applyFormatting('## ', '')} className="h-8 px-3 flex items-center justify-center bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-100 text-slate-700 font-bold text-xs" title="Tiêu đề to">H2</button>
                      <button onClick={() => applyFormatting('### ', '')} className="h-8 px-3 flex items-center justify-center bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-100 text-slate-700 font-bold text-xs" title="Tiêu đề vừa">H3</button>
                   </div>
                 </div>

                 <div className="flex-1 flex flex-row overflow-hidden relative min-h-[65vh]">
                    <textarea
                      ref={textareaRef} value={markdownContent} onChange={(e) => setMarkdownContent(e.target.value)} onPaste={handlePaste} onKeyDown={handleRawKeyDown}
                      placeholder="Bắt đầu gõ hoặc Ấn Ctrl + V để dán bài tập vào đây."
                      className={`h-full w-full p-4 resize-none outline-none text-gray-700 font-mono text-[14px] leading-relaxed scroll-smooth ${showRawPreview ? 'w-1/2 border-r border-gray-200 bg-white' : 'bg-white'}`}
                    />
                    {showRawPreview && (
                       <div className="w-1/2 h-full overflow-y-auto bg-gray-50/50 p-6 scroll-smooth">

                          <div className="bg-white p-8 rounded-2xl shadow-md border-4 border-slate-700 aspect-video overflow-y-auto w-full max-w-none prose prose-lg prose-indigo whitespace-pre-wrap prose-h1:text-4xl prose-h1:font-black prose-h1:text-indigo-900 prose-h1:mb-10 prose-h1:text-center prose-h1:tracking-tight prose-h2:text-[1.5rem] prose-h2:font-black prose-h2:text-white prose-h2:bg-gradient-to-r prose-h2:from-indigo-600 prose-h2:via-blue-600 prose-h2:to-cyan-500 prose-h2:px-6 prose-h2:py-4 prose-h2:rounded-2xl prose-h2:mt-14 prose-h2:mb-8 prose-h2:uppercase prose-h2:tracking-wide prose-h2:shadow-[0_8px_30px_rgb(79,70,229,0.2)] prose-h2:border-l-8 prose-h2:border-l-yellow-400 prose-h2:block prose-h2:w-fit prose-h2:clear-both prose-h3:text-[1.2rem] prose-h3:font-bold prose-h3:text-white prose-h3:bg-gradient-to-r prose-h3:from-emerald-500 prose-h3:to-teal-400 prose-h3:px-5 prose-h3:py-3 prose-h3:rounded-xl prose-h3:mt-10 prose-h3:mb-5 prose-h3:shadow-md prose-h3:block prose-h3:w-fit prose-h3:clear-both prose-strong:text-indigo-800 prose-strong:font-black prose-strong:bg-indigo-50/50 prose-strong:px-1.5 prose-strong:py-0.5 prose-strong:rounded-md">
                              {renderMarkdown(markdownContent)}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto relative bg-slate-50">
                 <BlockEditor blocks={blocks} onChangeBlocks={setBlocks} onTriggerCrop={(meta, id) => {
                     setTargetCropBlockId(id);
                     if (meta?.originalUrl) setCropImageSrc(meta.originalUrl);
                     setIsCropModalOpen(true);
                 }} globalSourceImage={lastAnalyzedImages.length > 0 ? lastAnalyzedImages[0] : (pendingImages.length > 0 ? pendingImages[0].previewUrl : undefined)} globalTriggerBankModal={globalTriggerBankModal} />
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                <p className="text-indigo-700 font-semibold animate-pulse">
                  {trangThaiNguon || '✨ Cỗ máy AI đang biên soạn Bài giảng & Trắc nghiệm...'}
                </p>
              </div>
            )}
          </div>
          </React.Fragment>
          )}
        </div>
      </div>
      {/* CROPPER MODAL OVERLAY */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onPaste={handlePaste} tabIndex={0} autoFocus>
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CropIcon className="w-5 h-5 text-orange-600" /> Smart Cropper</h2>
              <button onClick={() => { setIsCropModalOpen(false); setCropImageSrc(''); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR SOURCE IMAGES */}
                <div className="w-44 bg-gray-50 border-r border-gray-200 p-3 flex flex-col gap-3 overflow-y-auto shrink-0 shadow-inner">
                    <div className="text-xs font-bold text-gray-500 uppercase text-center mb-2">Nguồn Ảnh Gốc</div>
                    {(() => {
                        const availableSourceImages = [
                            ...(lastAnalyzedImages || []),
                            ...(pendingImages || []).map(img => img.previewUrl)
                        ].filter(Boolean);

                        if (availableSourceImages.length === 0) {
                            return <div className="text-xs text-gray-400 text-center italic bg-white p-3 rounded border border-dashed border-gray-300">Không có ảnh gốc</div>;
                        }

                        return availableSourceImages.map((src, i) => (
                            <div
                                key={i}
                                onClick={() => { setAnhNguonHong(false); setCropImageSrc(src); }}
                                className={`cursor-pointer border-2 rounded-xl overflow-hidden transition-all hover:border-orange-400 hover:-translate-y-0.5 ${cropImageSrc === src ? 'border-orange-600 shadow-md ring-4 ring-orange-100' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                            >
                                <img src={src} className="w-full h-auto block object-cover bg-white" alt={`Trang ${i+1}`} />
                                <div className={`text-[11px] text-center py-1.5 font-bold ${cropImageSrc === src ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}>Trang {i+1}</div>
                            </div>
                        ));
                    })()}
                </div>

                <div className="flex-1 overflow-auto bg-gray-100 p-6 flex flex-col items-center justify-center relative">
                  {!cropImageSrc ? (
                    <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-2xl bg-white w-full max-w-lg">
                      <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon className="w-8 h-8" /></div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Chọn ảnh nguồn bên trái</h3>
                      <p className="text-gray-500 mb-4">Hoặc ấn Ctrl + V để dán ảnh mới vào đây</p>
                      <label className="bg-orange-600 text-white px-5 py-2.5 rounded-lg cursor-pointer hover:bg-orange-700 font-medium inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Hoặc tải từ máy <input type="file" className="hidden" accept="image/*" onChange={handleFileSelectForCrop} /></label>
                    </div>
                  ) : anhNguonHong ? (
                    <div className="text-center p-10 border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50 w-full max-w-lg">
                      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
                      <h3 className="text-lg font-bold text-amber-900 mb-2">Không mở được ảnh nguồn</h3>
                      <p className="text-amber-800 mb-4 text-sm leading-relaxed">
                        Bài này được soạn bằng bản cũ, ảnh nguồn khi đó chỉ lưu tạm trong phiên làm việc
                        nên nay không còn. Thầy cô tải lại ảnh (hoặc tệp PDF) của trang đề để cắt tiếp.
                      </p>
                      <label className="bg-orange-600 text-white px-5 py-2.5 rounded-lg cursor-pointer hover:bg-orange-700 font-medium inline-flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Tải ảnh nguồn từ máy
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileSelectForCrop} />
                      </label>
                    </div>
                  ) : (
                    <div className="max-h-full max-w-full overflow-auto rounded-lg shadow-sm border border-gray-200 bg-white p-2">
                      <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                        <img
                          ref={imgRef}
                          src={cropImageSrc}
                          alt="Ảnh nguồn để cắt"
                          className="max-w-none block"
                          onLoad={() => setAnhNguonHong(false)}
                          onError={() => setAnhNguonHong(true)}
                        />
                      </ReactCrop>
                    </div>
                  )}
                </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
              <p className="text-sm text-gray-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {cropImageSrc ? "Dùng chuột kéo chọn vùng cần cắt" : "Đang chờ ảnh..."}</p>
              <div className="flex gap-3">
                <button onClick={() => setCropImageSrc('')} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Xóa ảnh này</button>
                <button onClick={handleUploadCroppedImage} disabled={!cropImageSrc || isUploadingCropped} className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2">{isUploadingCropped ? <Loader2 className="w-4 h-4 animate-spin"/> : <CropIcon className="w-4 h-4" />} Cắt & Chèn Ảnh</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI WEB BACKUP MODAL */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative border border-gray-100">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-emerald-50/50 shrink-0">
              <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2"><Bot className="w-5 h-5" /> {isPracticeModule ? 'Bóc tách đề bằng Gemini Web' : 'Tạo bài bằng Gemini Web'} (Thủ công)</h2>
              <button onClick={() => { setIsBackupModalOpen(false); setDaCatCut(null); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto min-h-0">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm">
                <p className="text-blue-900 text-[0.95rem] font-medium mb-3 leading-relaxed">
                  <strong>Hướng dẫn {isPracticeModule ? 'bóc tách đề' : 'soạn bài'} liền mạch:</strong>
                </p>
                <div className="flex flex-col gap-3">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-bold text-gray-800 mb-1">A. DÀNH CHO BÀI NGẮN (Dưới 10 ảnh)</p>
                    <p className="text-xs text-gray-500 mb-2">Kéo tất cả ảnh vào Gemini, dán lệnh này và ấn Gửi.</p>
                    <button onClick={handleCopyShortPrompt} className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded-lg transition-all text-sm">
                      <Copy className="w-4 h-4" /> Copy Prompt Chuẩn (Bài ngắn)
                    </button>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <p className="text-sm font-bold text-blue-800 mb-1">B. DÀNH CHO BÀI DÀI (Hơn 10 ảnh - Cần chia đợt tải)</p>
                    <p className="text-xs text-gray-500 mb-2"><strong>Bước 1:</strong> Dùng lệnh này để tải dần ảnh lên (mỗi lần 10 ảnh).</p>
                    <button onClick={handleCopyUploadPrompt} className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition-all text-sm mb-3">
                      <Copy className="w-4 h-4" /> Copy lệnh Tải Ảnh (Chỉ nhận, chưa xử lý)
                    </button>
                    <p className="text-xs text-gray-500 mb-2"><strong>Bước 2:</strong> Khi tải xong toàn bộ, dùng lệnh này để ép máy xử lý 1 lần liền mạch.</p>
                    <button onClick={handleCopyPrompt} className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-50 border border-emerald-500 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg transition-all text-sm">
                      <Copy className="w-4 h-4" /> Copy lệnh Bắt Đầu Xử Lý (Kèm cấu trúc)
                    </button>
                  </div>
                </div>
              </div>

              {/*
                Dải nối tiếp: hiện khi đợt vừa dán bị đứt giữa chừng.
                Gemini Web có trần độ dài cho mỗi câu trả lời; bóc đề 25-30 câu kèm lời giải là
                chạm trần, chuỗi JSON đứt ngay giữa một câu. Trước đây app không hề biết, cứ chèn
                nguyên văn vào bài rồi hỏng cả khối mà nhìn không ra đứt ở đâu.
              */}
              {daCatCut && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                  <p className="text-amber-900 text-sm font-bold flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Đợt vừa dán bị cắt cụt — đã lấy {daCatCut.soCau} câu trọn vẹn
                  </p>
                  <p className="text-[12.5px] text-amber-800 leading-relaxed mb-2">
                    {daCatCut.cauBiCut
                      ? <>Câu bị đứt bắt đầu bằng: <i>“{daCatCut.cauBiCut.slice(0, 70)}…”</i>. </>
                      : null}
                    Bấm nút dưới, dán sang Gemini để nó làm nốt từ câu {daCatCut.soCau + 1}, rồi dán kết quả
                    vào khung dưới đây như cũ.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lenhNoiTiep(daCatCut.soCau, daCatCut.cauBiCut));
                      alert(`Đã copy lệnh nối tiếp!\n\nDán vào đúng cuộc trò chuyện Gemini đang mở (không kèm ảnh), `
                        + `nó sẽ làm nốt từ câu ${daCatCut.soCau + 1}.`);
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all text-sm"
                  >
                    <Copy className="w-4 h-4" /> Copy lệnh nối tiếp (từ câu {daCatCut.soCau + 1})
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Code2 className="w-4 h-4 text-emerald-500"/> Dán mã JSON/Markdown từ Gemini vào đây...</label>
                <textarea
                  value={manualGeminiInput}
                  onChange={(e) => setManualGeminiInput(e.target.value)}
                  className="w-full h-56 p-4 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none resize-none font-mono text-sm text-gray-700 bg-gray-50 shadow-inner"
                  placeholder="Dán toàn bộ nội dung do Gemini sinh ra vào đây..."
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => handleInsertManualMarkdown(false)} disabled={!manualGeminiInput.trim()} className="px-6 py-3 bg-white border-2 border-emerald-500 hover:bg-emerald-50 disabled:border-gray-300 disabled:text-gray-400 text-emerald-600 font-bold rounded-xl flex items-center gap-2 transition-all">
                <Code2 className="w-5 h-5" /> Chèn & Xóa trắng để Dán đợt tiếp theo
              </button>
              <button onClick={() => handleInsertManualMarkdown(true)} disabled={!manualGeminiInput.trim()} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
                Nhận diện & Hoàn tất đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUSH TO BANK MODAL */}
      {isPushToBankModalOpen && (
        <PushToBankModal
          isOpen={isPushToBankModalOpen}
          onClose={() => setIsPushToBankModalOpen(false)}
          blocks={activeTab === 'elearning' ? elearningBlocks : presentationBlocks}
          courseContext={(() => {
            const course = courses.find(c => c.id === selectedCourseId);
            // Một số khóa học để grade_level = 0 (chưa đặt); khi đó trả về rỗng
            // để modal tự đoán Lớp từ tên khóa học.
            const gradeLevel = Number(course?.grade_level) || 0;
            return {
              grade: gradeLevel > 0 ? String(gradeLevel) : "",
              // Bảng courses không lưu Môn - giáo viên chọn trong modal,
              // và bước kiểm tra trước khi lưu sẽ chặn nếu còn bỏ trống.
              subject: "",
              topic: chapters.find(c => c.id === selectedChapterId)?.title || "",
              lesson: title,
              courseName: course?.title || ""
            };
          })()}
        />
      )}

      <HuongDanSoanBaiModal isOpen={moHuongDan} onClose={() => setMoHuongDan(false)} />
    </div>
  );
}

export default function AIEditorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>}>
      <EditorContent />
    </Suspense>
  );
}


