"use client";

import Link from "next/link";

import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Key, Loader2, RefreshCw, Video, Link as LinkIcon, FileText, X, CropIcon, Upload, ChevronLeft, ChevronRight, Maximize2, Minimize2, MonitorPlay, CheckCircle2, XCircle, Edit2, Download, PlayCircle, Eye, ChevronRightCircle, RefreshCcw, Bot, Copy, Code2, ListTodo, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactCrop, { type Crop } from 'react-image-crop';
import BlockEditor, { Block } from "./BlockEditor";
import 'react-image-crop/dist/ReactCrop.css';
import confetti from 'canvas-confetti';
import { Document, Packer, Paragraph, TextRun } from "docx";

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
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkBreaks]}
          rehypePlugins={[rehypeKatex]}
          components={{
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





const parseMarkdownToBlocks = (content: string): Block[] => {
    if (!content) return [];
    const res: Block[] = [];
    const regex = /```quiz[ \t]*\r?\n([\s\S]*?)\r?\n```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
          const txt = content.substring(lastIndex, match.index).trim();
          if (txt) res.push({ id: Math.random().toString(36).substring(7), type: 'md', content: txt });
      }
      try {
          const data = JSON.parse(match[1].replace(/\n$/, ''));
          if (data.question) {
              data.question = data.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
          }
          res.push({ id: Math.random().toString(36).substring(7), type: 'quiz', content: data });
      } catch(e) {
          res.push({ id: Math.random().toString(36).substring(7), type: 'md', content: match[0] });
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
        const txt = content.substring(lastIndex).trim();
        if (txt) res.push({ id: Math.random().toString(36).substring(7), type: 'md', content: txt });
    }
    return res.length > 0 ? res : [{ id: Math.random().toString(36).substring(7), type: 'md', content: "" }];
};

const serializeBlocksToMarkdown = (blocks: Block[]): string => {
    return blocks.map(b => {
        if (b.type === 'md') return b.content;
        if (b.type === 'quiz') return '```quiz\n' + JSON.stringify(b.content, null, 2) + '\n```';
        return '';
    }).join('\n\n');
};

const getPrompt = (isPractice: boolean) => {
  const theoryPrompt = `Bạn là một chuyên gia giáo dục Toán học xuất sắc hàng đầu thế giới. 
Hãy phân tích nội dung các ảnh tài liệu này và biên soạn lại thành một bài giảng Toán học CỰC KỲ THU HÚT, TRÌNH BÀY SIÊU ĐẸP.
YÊU CẦU ĐỊNH DẠNG TUYỆT ĐỐI (LÀM SAI SẼ BỊ PHẠT):
1. Dùng Markdown. [CHUẨN HÓA TOÁN HỌC LATEX TỐI ƯU CHO MATHTYPE]:
- Bao bọc TẤT CẢ công thức bằng dấu $ (Ví dụ: $x^2 + y^2 = 25$).
- Phân số: Dùng \\frac{tử}{mẫu}.
- Góc: Dùng \\widehat{tên} (Ví dụ: $\\widehat{ABC}$).
- Độ: Dùng $^\\circ$ hoặc $^\\circ C$.
- Ký hiệu đỉnh, phẩy: Dùng trực tiếp dấu nháy đơn ' trên bàn phím (Ví dụ: $A'B'C'D'$). Tuyệt đối KHÔNG dùng mã \\prime.
2. [BẮT BUỘC DÙNG HEADING]: TẤT CẢ các Tiêu đề bài học, Tên Phương pháp, và Đề mục BẮT BUỘC phải đặt trong thẻ Heading 2 (##) hoặc Heading 3 (###) kèm theo Emoji. TUYỆT ĐỐI KHÔNG viết Tiêu đề bằng văn bản in đậm (**) hay văn bản thường. Ví dụ chuẩn: "## 🚀 1. PHƯƠNG PHÁP THẾ", "### 💡 Quy tắc cộng đại số".
3. [TÓM TẮT NGẮN GỌN & SÚC TÍCH]: ĐÂY LÀ PHẦN LÝ THUYẾT. BẠN PHẢI CHẮT LỌC VÀ CHỈ GIỮ LẠI NHỮNG Ý CHÍNH NHẤT, ĐỊNH NGHĨA VÀ CÔNG THỨC TRỌNG TÂM. TUYỆT ĐỐI KHÔNG VIẾT DÀI DÒNG, LAN MAN. NGẮN GỌN LÀ ƯU TIÊN SỐ 1. Bỏ qua các diễn giải rườm rà.
4. [PHÂN TRANG KHOA HỌC]: Sử dụng đúng 3 dấu gạch ngang \`---\` để ngắt trang (tạo slide mới). Hãy phân trang khoa học và hợp lý sao cho mỗi trang không quá dài, thường là sau 1 cụm lý thuyết hoàn chỉnh hoặc sau 1-2 ví dụ.
5. Định nghĩa/Định lý bắt đầu bằng \`> 💡 **Định lý:**\`. Ví dụ bắt đầu bằng \`> 📌 **Ví dụ:**\`.
6. [QUY TẮC BẢNG BIẾN THIÊN & HÌNH VẼ]: Nếu bài toán có sử dụng Đồ thị, Hình học, Bảng biến thiên, Bảng xét dấu... TUYỆT ĐỐI KHÔNG giải thích dài dòng bằng chữ (VD: không viết "đồ thị đi lên/đi xuống từ..."). THAY VÀO ĐÓ, bạn BẮT BUỘC chèn thẻ \`[IMAGE_PLACEHOLDER]\` vào đúng vị trí cần vẽ bảng/hình để giáo viên tự cắt ảnh dán vào. Lời giải bên dưới chỉ cần ghi "Từ Bảng biến thiên/Đồ thị ở trên, ta có kết luận:".
7. [SIÊU QUAN TRỌNG - TẠO CÂU HỎI TƯƠNG TÁC CHỐNG LƯỜI]: Ngay TRƯỚC mỗi lần bạn đặt dấu ngắt trang \`---\`, bạn HÃY TỰ NGHĨ RA 1 CÂU HỎI TRẮC NGHIỆM để kiểm tra sự tập trung của học sinh. Học sinh bắt buộc phải làm đúng câu này thì mới được đọc trang tiếp theo.
Mọi câu hỏi trắc nghiệm PHẦI được xuất ra ĐÚNG DƯỚI DẠNG ĐOẠN MÃ NGÔN NGỮ "quiz" chứa chuỗi JSON chuẩn xác. Có 2 loại cấu trúc JSON mà bạn có thể dùng:

LOẠI 1: CÂU HỎI NHIỀU LỰA CHỌN (1 ĐÁP ÁN ĐÚNG)
\`\`\`quiz
{
  "type": "multiple_choice",
  "question": "Đạo hàm của hàm số $y = x^2 + 2x$ là?",
  "options": ["$y' = 2x + 2$", "$y' = x + 2$", "$y' = 2x$", "$y' = 2$"],
  "answerIndex": 0
}
\`\`\`

LOẠI 2: CÂU HỎI ĐÚNG/SAI (4 MỆNH ĐỀ ĐỘC LẬP - BAREM 2025)
\`\`\`quiz
{
  "type": "true_false_cluster",
  "question": "Cho hàm số y = f(x)... Xét tính Đúng/Sai của các mệnh đề sau:",
  "options": [
    { "id": "a", "content": "Mệnh đề A", "isTrue": true },
    { "id": "b", "content": "Mệnh đề B", "isTrue": false },
    { "id": "c", "content": "Mệnh đề C", "isTrue": true },
    { "id": "d", "content": "Mệnh đề D", "isTrue": false }
  ]
}
\`\`\`

GHI CHÚ TUYỆT ĐỐI QUAN TRỌNG VỀ JSON:
- [BẮT BUỘC VỀ TOÁN HỌC]: Tất cả các công thức toán học trong JSON BẮT BUỘC phải được bọc trong cặp dấu $...$. TUYỆT ĐỐI KHÔNG xuất công thức trần trụi (như {{begincases...}} hay x=2). Đối với Hệ phương trình, dùng chuẩn $\\begin{cases}...\\end{cases}$.
- TẤT CẢ các ký tự gạch chéo (\\) bên trong chuỗi JSON BẮT BUỘC PHẢI NHÂN ĐÔI thành (\\\\). Ví dụ: \\frac phải viết là \\\\frac, \\mathbb là \\\\mathbb, \\infty là \\\\infty, \\{ là \\\\{. Nếu không làm điều này, hệ thống sẽ BỊ LỖI.
- Nếu không chỉ định type, hệ thống mặc định là multiple_choice.`;

  const practicePrompt = `Bạn là một Gia sư Toán học xuất sắc hàng đầu.
Nhiệm vụ của bạn là phân tích tài liệu bài tập này và thiết kế thành một "Bài Giảng Phân Dạng" TRÌNH BÀY SIÊU ĐẸP, BÀI BẢN.
YÊU CẦU ĐỊNH DẠNG TUYỆT ĐỐI (LÀM SAI SẼ BỊ PHẠT):
1. Dùng Markdown. [CHUẨN HÓA TOÁN HỌC LATEX TỐI ƯU CHO MATHTYPE]:
- Bao bọc TẤT CẢ công thức bằng dấu $ (Ví dụ: $x^2 + y^2 = 25$).
- Phân số: Dùng \\frac{tử}{mẫu}.
- Góc: Dùng \\widehat{tên} (Ví dụ: $\\widehat{ABC}$).
- Độ: Dùng $^\\circ$ hoặc $^\\circ C$.
- Ký hiệu đỉnh, phẩy: Dùng trực tiếp dấu nháy đơn ' trên bàn phím (Ví dụ: $A'B'C'D'$). Tuyệt đối KHÔNG dùng mã \\prime.
2. [QUY TRÌNH PHÂN DẠNG - CỰC QUAN TRỌNG]:
- Gom nhóm các bài tập trong ảnh thành các DẠNG TOÁN riêng biệt. 
- Mở đầu mỗi Dạng bằng thẻ Heading 2 (##) kèm Emoji. Ví dụ: \`## 📚 Dạng 1: Viết phương trình tiếp tuyến\`. 
- Sau đó bạn hãy TỰ biên soạn \`### 💡 Phương pháp giải\` ngắn gọn cho Dạng đó.
- Tiếp theo, trích lấy 1 bài tập tiêu biểu làm \`### 📌 Ví dụ mẫu\` và tự biên soạn trình bày lời giải chi tiết bên dưới. ĐỂ KÍCH HOẠT KHUNG GIAO DIỆN CHUẨN, ở phần lời giải của Ví dụ mẫu BẮT BUỘC bạn phải ghi chữ "Hướng dẫn giải:" ngay trước khi giải.
- [QUY TẮC BẢNG BIẾN THIÊN & HÌNH VẼ]: Nếu bài toán có Đồ thị, Hình học, Bảng biến thiên, Bảng xét dấu... TUYỆT ĐỐI KHÔNG giải thích dài dòng bằng chữ (VD: không viết "đồ thị đi lên/đi xuống từ..."). THAY VÀO ĐÓ, bạn BẮT BUỘC chèn thẻ \`[IMAGE_PLACEHOLDER]\` vào đúng vị trí cần vẽ bảng/hình. Lời giải bên dưới chỉ ghi ngắn gọn "Từ Bảng biến thiên/Đồ thị ở trên, ta có:".
3. [TẠO BÀI TẬP TƯƠNG TÁC]: Ngay sau khi giải xong Ví dụ mẫu, bạn hãy dùng dấu ngắt trang \`---\`. Tiếp theo, biến các bài tập còn lại của Dạng đó thành các khối mã "quiz" (JSON) để học sinh tự làm. Học sinh làm đúng mới được qua Dạng tiếp theo.
4. Mọi câu hỏi trong phần luyện tập PHẢI được xuất ra ĐÚNG DẠNG ĐOẠN MÃ NGÔN NGỮ "quiz" chứa chuỗi JSON chuẩn xác. Cấu trúc JSON có 3 loại:

LOẠI 1: CÂU HỎI NHIỀU LỰA CHỌN (1 ĐÁP ÁN ĐÚNG)
\`\`\`quiz
{
  "type": "multiple_choice",
  "question": "Đạo hàm của hàm số $y = x^2 + 2x$ là?",
  "options": ["$y' = 2x + 2$", "$y' = x + 2$", "$y' = 2x$", "$y' = 2$"],
  "answerIndex": 0,
  "answer": "Giải thích nhanh",
  "phuong_phap_giai": "Sử dụng công thức đạo hàm cơ bản $(x^n)' = n.x^{n-1}$",
  "cac_buoc_thuc_hien": [
    "Bước 1: Đạo hàm $x^2$ được $2x$",
    "Bước 2: Đạo hàm $2x$ được $2$"
  ],
  "goi_y_nhanh": "Nhớ đạo hàm tổng bằng tổng các đạo hàm"
}
\`\`\`

LOẠI 2: CÂU HỎI ĐÚNG/SAI (4 MỆNH ĐỀ ĐỘC LẬP - BAREM 2025)
\`\`\`quiz
{
  "type": "true_false_cluster",
  "question": "Cho hàm số y = f(x)... Xét tính Đúng/Sai của các mệnh đề sau:",
  "options": [
    { "id": "a", "content": "Mệnh đề A", "isTrue": true },
    { "id": "b", "content": "Mệnh đề B", "isTrue": false },
    { "id": "c", "content": "Mệnh đề C", "isTrue": true },
    { "id": "d", "content": "Mệnh đề D", "isTrue": false }
  ],
  "phuong_phap_giai": "Lập bảng biến thiên...",
  "cac_buoc_thuc_hien": ["Đạo hàm y'", "Tìm nghiệm y'=0", "Lập BBT"],
  "goi_y_nhanh": "Chú ý dấu của hệ số a"
}
\`\`\`

LOẠI 3: CÂU HỎI TỰ LUẬN
\`\`\`quiz
{
  "type": "essay",
  "question": "Giải phương trình $3x + 2y = 4$.",
  "answer": "Đáp án mẫu chi tiết của câu tự luận",
  "phuong_phap_giai": "Rút y theo x hoặc ngược lại.",
  "cac_buoc_thuc_hien": [
    "Từ $3x + 2y = 4$, ta có $2y = 4 - 3x$",
    "Suy ra $y = 2 - \\\\frac{3}{2}x$"
  ],
  "goi_y_nhanh": "Đây là phương trình Diophante tuyến tính."
}
\`\`\`

LOẠI 4: CÂU TRẢ LỜI NGẮN (kết quả ngắn gọn: 1 số, 1 biểu thức, 1 từ)
\`\`\`quiz
{
  "type": "short_answer",
  "question": "Tính giá trị của biểu thức $\\\\\\\\sqrt{9} + \\\\\\\\sqrt{16}$.",
  "correctAnswer": "7",
  "answer": "Ta có $\\\\\\\\sqrt{9} = 3$ và $\\\\\\\\sqrt{16} = 4$, nên tổng là $3 + 4 = 7$.",
  "phuong_phap_giai": "Tính căn bậc hai của số chính phương rồi cộng lại.",
  "cac_buoc_thuc_hien": [
    "Tính $\\\\\\\\sqrt{9} = 3$",
    "Tính $\\\\\\\\sqrt{16} = 4$",
    "Cộng: $3 + 4 = 7$"
  ],
  "goi_y_nhanh": "Nhớ căn bậc hai các số chính phương: 1, 4, 9, 16, 25..."
}
\`\`\`

GHI CHÚ TUYỆT ĐỐI QUAN TRỌNG VỀ JSON:
- BẮT BUỘC TRÍCH XUẤT ĐẦY ĐỦ "phuong_phap_giai", "cac_buoc_thuc_hien" (là MẢNG CÁC CHUỖI), và "goi_y_nhanh" cho TẤT CẢ các câu hỏi nếu có thể suy luận ra từ tài liệu.
- TẤT CẢ các ký tự gạch chéo (\\) bên trong chuỗi JSON BẮT BUỘC PHẢI NHÂN ĐÔI thành (\\\\). Ví dụ: \\frac phải viết là \\\\frac, \\mathbb là \\\\mathbb. Nếu không làm điều này, hệ thống sẽ BỊ LỖI.
- Tất cả các công thức toán học trong JSON BẮT BUỘC bọc trong $...$
- Bạn không cần ghi chữ "Câu 1:", "Bài 2:" ở đầu mục "question", chỉ cần trích xuất nội dung cốt lõi của câu hỏi.
- Nếu không chỉ định type, hệ thống mặc định là multiple_choice.`;

  return isPractice ? practicePrompt : theoryPrompt;
};

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lessonId = searchParams.get('lessonId');
  const moduleId = searchParams.get('moduleId');
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const supabase = createClient();

  const [apiKey, setApiKey] = useState("");
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("Đang tải...");
  const [markdownContent, setMarkdownContent] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editorMode, setEditorMode] = useState<'form' | 'raw'>('form');
  const [showRawPreview, setShowRawPreview] = useState(false);

  const handleFixRawLatex = () => {
    let text = markdownContent;
    text = text.replace(/\[cite_start\]/g, "").replace(/\[cite_end\]/g, "");
    text = text.replace(/\{\{\s*begincases\s*\}\}/g, "\\begin{cases}");
    text = text.replace(/\{\{\s*endcases\s*\}\}/g, "\\end{cases}");
    text = text.replace(/\\rightarrow/g, "\\rightarrow ");
    setMarkdownContent(text);
  };
  const [docList, setDocList] = useState<{id: string, title: string, url: string}[]>([]);
  const isDocumentModule = moduleTitle.toLowerCase().includes('tài liệu tham khảo');
  const isVideoModule = moduleTitle.toLowerCase().includes('video');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingText, setPendingText] = useState("");

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
  const [manualGeminiInput, setManualGeminiInput] = useState("");

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
              setMarkdownContent(modData.content_markdown || "");
              setBlocks(parseMarkdownToBlocks(modData.content_markdown || ""));
                if (modData.title?.toLowerCase().includes('tài liệu tham khảo') || modData.title?.toLowerCase().includes('video')) {
                    try {
                        const parsed = JSON.parse(modData.content_markdown);
                        if (Array.isArray(parsed)) setDocList(parsed);
                    } catch(e) {}
                }
              setVideoUrl(modData.video_url || "");
              setAttachmentUrl(modData.attachment_url || "");
          }
      } else if (lessonData) {
          setMarkdownContent(lessonData.content_markdown || "");
          setBlocks(parseMarkdownToBlocks(lessonData.content_markdown || ""));
          setVideoUrl(lessonData.video_url || "");
          setAttachmentUrl(lessonData.attachment_url || "");
      }
    };
    fetchLesson();
  }, [lessonId, moduleId]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('id, title').order('created_at', { ascending: false });
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
      const { data } = await supabase.from('chapters').select('id, title').eq('course_id', selectedCourseId).order('order_index', { ascending: true });
      if (data) setChapters(data);
    };
    fetchChapters();
  }, [selectedCourseId]);

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) { setApiKey(savedKey); setIsKeySaved(true); }
  }, []);

  const saveApiKey = () => {
    if (!apiKey) return alert("Vui lòng nhập API Key!");
    localStorage.setItem("gemini_api_key", apiKey);
    setIsKeySaved(true); alert("Lưu API Key thành công!");
  };

  const handleSaveToDB = async () => {
    if (!lessonId) return;
    setIsSavingDB(true);
    const isDoc = moduleTitle.toLowerCase().includes('tài liệu tham khảo') || moduleTitle.toLowerCase().includes('video');
    const content = isDoc ? JSON.stringify(docList) : (editorMode === 'form' ? serializeBlocksToMarkdown(blocks) : markdownContent);
    let error;

    if (moduleId) {
        const { error: modError } = await supabase.from('lesson_modules').update({
            content_markdown: content,
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
          content_markdown: content, 
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
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

  const handleExportWord = async () => {
    try {
      let content = editorMode === 'form' ? serializeBlocksToMarkdown(blocks) : markdownContent;
      
      // 1. Lọc và bóc tách các câu hỏi trắc nghiệm JSON (Xóa bỏ JSON thô)
      content = content.replace(/```quiz\n([\s\S]*?)\n```/g, (match, jsonString) => {
          try {
              const quiz = JSON.parse(jsonString);
              let quizText = `\n\n**CÂU HỎI KIỂM TRA:**\n${quiz.question}\n\n`;
              if (quiz.options) {
                 quiz.options.forEach((opt: any, i: number) => {
                    const label = String.fromCharCode(65 + i);
                    const optText = typeof opt === 'string' ? opt : opt.content;
                    quizText += `**${label}.** ${optText}  \n`; 
                 });
              }
              return quizText;
          } catch(e) { return match; }
      });

      // 2. Chữa các lỗi sai cú pháp LaTeX của AI để MathType/Word nhận diện được
      content = content.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');

      // 3. Parser Markdown cơ bản sang HTML để MS Word hiểu được In đậm, Tiêu đề và Kéo dòng
      let html = content.replace(/\\\\/g, '\\'); // Đưa dấu chéo kép về dấu chéo đơn chuẩn LaTeX cho MathType
      html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Parse Heading
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      
      // Parse Bold/Italic
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Bao bọc <p> cho từng dòng để Word bắt buộc phải xuống đoạn thay vì dính chùm
      html = html.split('\n').map(line => {
         const t = line.trim();
         if (!t) return '';
         if (t.startsWith('<h')) return t; // Không bọc p cho heading
         return `<p>${line}</p>`;
      }).join('\n');

      const documentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 14pt; line-height: 1.5; }
        h1 { font-size: 20pt; text-align: center; color: #00529b; }
        h2 { font-size: 16pt; color: #00529b; margin-top: 24px; }
        h3 { font-size: 14pt; font-weight: bold; margin-top: 16px; }
        p { margin-top: 4px; margin-bottom: 4px; }
      </style>
      </head>
      <body>
        <h1>${title || "Giáo Án Lý Thuyết"}</h1>
        ${html}
      </body>
      </html>`;

      const blob = new Blob(['\ufeff', documentHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `GiaoAn_${title || 'BaiGiang'}.doc`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Lỗi xuất file Word: " + e); }
  };

  const handleAnalyzeQueue = async () => {
    if (pendingImages.length === 0 && pendingText.trim().length === 0) return alert("Hàng đợi rỗng!");
    if (!apiKey) return alert("Vui lòng lưu Gemini API Key trước!");
    
    setIsAnalyzing(true);
    try {
      // Cơ chế Xoay vòng Key (Load Balancing) - Hỗ trợ nhập nhiều key cách nhau bằng dấu phẩy
      const keys = apiKey.split(',').map(k => k.trim()).filter(k => k);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];

      const genAI = new GoogleGenerativeAI(randomKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      
      const isPractice = moduleTitle.toLowerCase().includes('luyện tập') || moduleTitle.toLowerCase().includes('kiểm tra') || moduleTitle.toLowerCase().includes('phân dạng');
      const prompt = getPrompt(isPractice);

      let finalPrompt = prompt;
      if (pendingText.trim().length > 0) {
          finalPrompt += "\n\n[NỘI DUNG VĂN BẢN TỪ FILE WORD]:\n" + pendingText;
      }
      
      const imageParts = await Promise.all(
        pendingImages.map(async (img) => {
          const base64Data = await fileToBase64(img.file);
          return { inlineData: { data: base64Data, mimeType: img.file.type } };
        })
      );

      const result = await model.generateContent([finalPrompt, ...imageParts]);
      const text = result.response.text();
      
      const separator = markdownContent.length > 0 && !markdownContent.endsWith('---') ? "\\n\\n---\\n\\n" : "\\n\\n";
      setMarkdownContent(prev => prev ? prev + separator + text : text);
      
      if (pendingImages.length > 0) {
        setLastAnalyzedImages(pendingImages.map(img => img.previewUrl));
        // Giữ các ảnh trong blob memory để sử dụng cho crop
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

  const handleCopyPrompt = () => {
    const isPractice = moduleTitle.toLowerCase().includes('luyện tập') || moduleTitle.toLowerCase().includes('kiểm tra') || moduleTitle.toLowerCase().includes('phân dạng');
    const prompt = getPrompt(isPractice);

    navigator.clipboard.writeText(prompt);
    alert("Đã Copy Prompt Chuẩn!\n\nThầy/Cô hãy mở gemini.google.com, dán văn bản này vào. Sau đó, KÉO THẢ các ảnh tài liệu của Thầy/Cô vào phần chat rồi Enter nhé!");
  };

  const handleInsertManualMarkdown = () => {
    if (!manualGeminiInput.trim()) {
      alert("Vui lòng dán nội dung từ Gemini vào khung trước!");
      return;
    }
    const separator = markdownContent.length > 0 && !markdownContent.endsWith('---') ? "\n\n---\n\n" : "\n\n";
    setMarkdownContent(prev => prev ? prev + separator + manualGeminiInput : manualGeminiInput);
    setManualGeminiInput("");
    setIsBackupModalOpen(false);
    alert("Đã chèn nội dung thành công!");
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
            const placeholderRegex = /\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\]/i;
            if (b.type === 'md' && typeof b.content === 'string') {
                if (placeholderRegex.test(b.content)) {
                    b.content = b.content.replace(placeholderRegex, imageMarkdown);
                } else {
                    b.content += imageMarkdown;
                }
            } else if (b.type === 'quiz') {
                if (placeholderRegex.test(b.content.question || '')) {
                    b.content.question = b.content.question.replace(placeholderRegex, imageMarkdown);
                } else {
                    b.content.question = (b.content.question || '') + imageMarkdown;
                }
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
    <ReactMarkdown 
      remarkPlugins={[remarkMath]} 
      rehypePlugins={[rehypeKatex]}
      components={{
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
        h1({node, children, ...props}) {
          return (
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 uppercase tracking-wide mb-8 pb-4 border-b-4 border-indigo-200 text-center shadow-sm break-words leading-tight block" {...props}>
              {children}
            </h1>
          );
        },
        h2({node, children, ...props}) {
          return (
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-teal-800 bg-teal-50/80 px-6 py-5 rounded-2xl border-l-8 border-teal-500 my-8 shadow-sm break-words leading-tight block" {...props}>
              {children}
            </h2>
          );
        },
        h3({node, children, ...props}) {
          return <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-rose-600 mt-8 mb-4 border-b-2 border-rose-100 pb-2 break-words leading-tight block" {...props}>{children}</h3>
        },
        h4({node, children, ...props}) {
          return <h4 className="text-base md:text-lg lg:text-xl font-bold text-purple-700 mt-6 mb-3 break-words leading-tight block" {...props}>{children}</h4>
        },
        code(props) {
          const {children, className, node, ...rest} = props
          const match = /language-(\w+)/.exec(className || '')
          if (!match?.length) return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-sm" {...rest}>{children}</code>;
          
          if (match[1] === 'quiz') {
            try {
              const data = JSON.parse(String(children).replace(/\n$/, ''));
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
            onClick={() => router.back()} 
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
               <button onClick={(e) => { e.stopPropagation(); router.back(); }} className="p-1.5 text-gray-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></button>
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
                   window.open(`/student/lessons/${lessonId}`, '_blank'); 
                 }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1.5">
                   <MonitorPlay className="w-3.5 h-3.5" /> Demo
                 </button>
               )}
               <div className="p-1 bg-gray-200 rounded-md ml-2"><ChevronDown className="w-4 h-4 text-gray-600" /></div>
             </div>
           </div>
        ) : (
           <div className="p-4 relative">
             <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
               <button onClick={(e) => { e.stopPropagation(); router.back(); }} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:bg-white shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /> Trở về</button>
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
          
          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
            <div className="text-xs text-gray-400 font-medium">Bản nháp được lưu tại: <span className="text-teal-600 font-bold">{title}</span></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                <Key className="w-4 h-4 text-gray-400 ml-2" />
                <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setIsKeySaved(false); }} placeholder="Nhập Gemini API Key..." className="bg-transparent border-none focus:ring-0 text-sm px-2 py-1 w-32 outline-none" />
                <button onClick={saveApiKey} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${isKeySaved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isKeySaved ? 'Đã lưu' : 'Lưu API'}</button>
              </div>
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
                   <h3 className="text-lg font-bold text-gray-800">Quản lý {isVideoModule ? 'Video' : 'Tài liệu tải về'}</h3>
                   <button onClick={() => setDocList([...docList, { id: Math.random().toString(36).substring(7), title: '', url: '' }])} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">+ Thêm {isVideoModule ? 'Video' : 'tài liệu'}</button>
                </div>
                <div className="flex flex-col gap-4 max-w-4xl">
                   {docList.map((doc, idx) => (
                      <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 group relative hover:border-indigo-300 transition-colors">
                         <button onClick={() => setDocList(docList.filter(d => d.id !== doc.id))} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">{isVideoModule ? <Video className="w-3.5 h-3.5 text-indigo-500"/> : <FileText className="w-3.5 h-3.5 text-indigo-500"/>} Tiêu đề {isVideoModule ? 'video' : 'tài liệu'}</label>
                            <input type="text" value={doc.title} onChange={(e) => { const n = [...docList]; n[idx].title = e.target.value; setDocList(n); }} className="w-full text-sm font-medium border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none" placeholder={isVideoModule ? "VD: Video chữa câu 1-10..." : "VD: Đề thi thử số 01 (PDF)..."} />
                         </div>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5 text-blue-500"/> Link {isVideoModule ? 'video (YouTube...)' : 'tải (Google Drive / OneDrive...)'}</label>
                            <input type="text" value={doc.url} onChange={(e) => { const n = [...docList]; n[idx].url = e.target.value; setDocList(n); }} className="w-full text-sm text-blue-600 border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none font-mono" placeholder="https://..." />
                         </div>
                      </div>
                   ))}
                   {docList.length === 0 && (
                      <div className="text-center py-16 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                         {isVideoModule ? <Video className="w-10 h-10 text-gray-300 mx-auto mb-3" /> : <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
                         <p className="text-gray-500 font-medium mb-4">Chưa có {isVideoModule ? 'video' : 'tài liệu'} nào trong mục này.</p>
                         <button onClick={() => setDocList([{ id: Math.random().toString(36).substring(7), title: '', url: '' }])} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-100 transition-colors">+ Bấm để thêm {isVideoModule ? 'video' : 'tài liệu'} đầu tiên</button>
                      </div>
                   )}
                </div>
             </div>
          ) : (
          <React.Fragment>

          <div className="bg-gray-50 border-b border-gray-100 p-2.5 flex justify-between items-center flex-shrink-0">
            <span className="font-semibold text-gray-700 text-sm">Nội dung E-learning</span>
            <button onClick={() => {
                 if (editorMode === 'form') setMarkdownContent(serializeBlocksToMarkdown(blocks));
                 else setBlocks(parseMarkdownToBlocks(markdownContent));
                 setEditorMode(editorMode === 'form' ? 'raw' : 'form');
              }} className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors shadow-sm">
                 {editorMode === 'form' ? <Code2 className="w-3.5 h-3.5" /> : <ListTodo className="w-3.5 h-3.5" />} {editorMode === 'form' ? 'Chế độ Code' : 'Chế độ Form'}
              </button>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} multiple onChange={handleQueueFileUpload} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"><ImageIcon className="w-3.5 h-3.5" /> Nạp File (Ảnh/Word/PDF)</button>
              <button onClick={() => { if (lastAnalyzedImages.length > 0) setCropImageSrc(lastAnalyzedImages[0]); setIsCropModalOpen(true); }} className="flex items-center gap-1.5 text-xs font-medium bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-md hover:bg-orange-100 transition-colors shadow-sm"><CropIcon className="w-3.5 h-3.5" /> Cắt Ảnh & Chèn</button>
              <button onClick={() => setIsBackupModalOpen(true)} className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors shadow-sm" title="Sinh mẫu Prompt thủ công"><Bot className="w-3.5 h-3.5" /> Lấy Prompt Thủ Công</button>
              <button onClick={handleExportWord} className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors shadow-[0_4px_10px_-2px_rgba(37,99,235,0.4)]"><Download className="w-3.5 h-3.5" /> Xuất Giáo Án (Word)</button>
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
          <div className="flex-1 flex flex-col relative min-h-[75vh]">
            {editorMode === 'raw' ? (
              <div className="flex flex-col flex-1 relative min-h-0">
                 {/* Thanh công cụ phụ cho RAW */}
                 <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                       <button onClick={() => setShowRawPreview(!showRawPreview)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${showRawPreview ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                          <Eye className="w-4 h-4"/> {showRawPreview ? 'Ẩn Xem Trước' : 'Bật Xem Trước (Split View)'}
                       </button>
                       {showRawPreview && (
                           <button onClick={handleFixRawLatex} className="flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors shadow-sm">
                              🪄 Sửa lỗi LaTeX tự động
                           </button>
                       )}
                    </div>
                 </div>

                 {/* Cảnh báo Bảng/Ảnh */}
                 {(() => {
                    const hasImageOrTable = /(?:\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\]|\|.*\|.*\n\s*\|[-\s:]+\|)/i.test(markdownContent);
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

                 <div className="flex-1 flex flex-row overflow-hidden">
                    <textarea 
                      ref={textareaRef} value={markdownContent} onChange={(e) => setMarkdownContent(e.target.value)} onPaste={handlePaste}
                      placeholder="Bắt đầu gõ hoặc Ấn Ctrl + V để dán bài tập vào đây."
                      className={`h-full p-4 resize-none outline-none text-gray-700 font-mono text-[14px] leading-relaxed scroll-smooth ${showRawPreview ? 'w-1/2 border-r border-gray-200 bg-white' : 'w-full bg-white'}`}
                    />
                    {showRawPreview && (
                       <div className="w-1/2 h-full overflow-y-auto bg-gray-50/50 p-6 scroll-smooth">
                          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-full max-w-none prose prose-indigo">
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
                 }} globalSourceImage={lastAnalyzedImages.length > 0 ? lastAnalyzedImages[0] : (pendingImages.length > 0 ? pendingImages[0].previewUrl : undefined)} />
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                <p className="text-indigo-700 font-semibold animate-pulse">✨ Cỗ máy AI đang biên soạn Bài giảng & Trắc nghiệm...</p>
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
                                onClick={() => setCropImageSrc(src)}
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
                  ) : (
                    <div className="max-h-full max-w-full overflow-auto rounded-lg shadow-sm border border-gray-200 bg-white p-2">
                      <ReactCrop crop={crop} onChange={c => setCrop(c)}><img ref={imgRef} src={cropImageSrc} alt="Crop" className="max-w-none block" /></ReactCrop>
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
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden relative border border-gray-100">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-emerald-50/50">
              <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2"><Bot className="w-5 h-5" /> Tạo bài bằng Gemini Web (Thủ công)</h2>
              <button onClick={() => setIsBackupModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm">
                <p className="text-blue-900 text-[0.95rem] font-medium mb-4 leading-relaxed">
                  <strong>Dự phòng (Khi API báo lỗi):</strong> Dùng Gemini Web miễn phí bằng cách Copy Prompt chuẩn và Dán kết quả vào đây.
                </p>
                <button onClick={handleCopyPrompt} className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border-[3px] border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 text-lg">
                  <Copy className="w-5 h-5" /> Copy Prompt Chuẩn
                </button>
              </div>

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

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={handleInsertManualMarkdown} disabled={!manualGeminiInput.trim()} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
                <Code2 className="w-5 h-5" /> Nhận diện & Chèn Nội dung
              </button>
            </div>
          </div>
        </div>
      )}
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

