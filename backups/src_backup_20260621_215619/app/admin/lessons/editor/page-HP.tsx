"use client";

import Link from "next/link";

import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Key, Loader2, RefreshCw, Video, Link as LinkIcon, FileText, X, CropIcon, Upload, ChevronLeft, ChevronRight, Maximize2, Minimize2, MonitorPlay, CheckCircle2, XCircle, Edit2, Download, PlayCircle, Eye, ChevronRightCircle, RefreshCcw, Bot, Copy, Code2, ListTodo, ChevronUp, ChevronDown } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactCrop, { type Crop } from 'react-image-crop';
import BlockEditor, { Block } from "./BlockEditor";
import 'react-image-crop/dist/ReactCrop.css';
import confetti from 'canvas-confetti';

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
      setFeedback("BÃ i lÃ m tá»‘t, rÃµ rÃ ng. PhÆ°Æ¡ng phÃ¡p giáº£i chÃ­nh xÃ¡c. \n\n**Äiá»ƒm: 9.5/10**");
      onPass();
    }, 2000);
  };

  const renderQuizContent = (content: string) => {
    return (
      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:my-2 prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-img:rounded-xl prose-img:shadow-md">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
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
      {/* Admin Header (Chá»‰ cÃ³ á»Ÿ báº£n Admin) */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm">
               <ListTodo className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-700 text-sm">
               {type === "multiple_choice" ? "Tráº¯c nghiá»‡m 4 lá»±a chá»n" : type === "true_false" ? "ÄÃºng / Sai" : type === "short_answer" ? "Tráº£ lá»i ngáº¯n" : "Tá»± luáº­n"}
            </span>
         </div>
      </div>

      {/* Pháº§n Äá» BÃ i */}
      <div className="p-5 md:p-6 bg-white flex flex-col relative border-b-4 border-[#0e6263]">
        <div className="absolute top-4 right-6 opacity-[0.03] pointer-events-none">
          <span className="text-[100px] leading-none">ðŸ“</span>
        </div>

        {data.autoCropMetadata && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in relative z-10">
            <span className="flex items-center gap-2 font-medium text-sm"><AlertTriangle className="w-5 h-5"/> AI Ä‘Ã£ tá»± Ä‘á»™ng cáº¯t áº£nh Ä‘á»“ thá»‹.</span>
            <button onClick={() => onEditCrop && onEditCrop(data.autoCropMetadata)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-sm font-bold hover:bg-yellow-600 transition-colors text-xs flex items-center gap-1.5 shrink-0"><CropIcon className="w-4 h-4" /> Báº¥m Ä‘á»ƒ xem / Cáº¯t láº¡i</button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-8 h-8 bg-[#f0f9ff] text-[#0e6263] rounded-lg flex items-center justify-center font-bold border border-teal-100 shadow-sm">
            <span className="text-sm">Q</span>
          </div>
          <h3 className="text-[15px] font-bold text-slate-700 tracking-wide">Ná»™i dung cÃ¢u há»i</h3>
        </div>
        
        <div className="text-[17px] font-medium text-slate-800 leading-relaxed relative z-10">
          {renderQuizContent(data.question)}
        </div>
      </div>

      {/* Pháº§n Khung Ä‘iá»n Ä‘Ã¡p Ã¡n */}
      <div className="p-5 md:p-6 bg-slate-50/50 flex flex-col relative z-20">
        {type === "true_false_cluster" && (
          <div className="flex flex-col gap-4 w-full">
            <div className="text-sm font-medium text-teal-800 bg-teal-50 px-4 py-3 rounded-xl border border-teal-100 flex items-center gap-2 shadow-sm">
               <ListTodo className="w-5 h-5 shrink-0"/>
               Barem 2025: Học sinh chọn ĐÚNG hoặc SAI cho từng mệnh đề độc lập.
            </div>
            {data.statements?.map((stmt: any, i: number) => {
              return (
                 <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 bg-white border-slate-200 shadow-sm">
                    <div className="flex items-start gap-3">
                       <div className="font-bold text-slate-500 w-6">{(['A','B','C','D'][i] || 'A')}.</div>
                       <div className="flex-1 min-w-0 overflow-hidden text-[15px] font-medium">{renderQuizContent(stmt.text)}</div>
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
                    {type === "true_false" ? (i === 0 ? "Ä" : "S") : ['A', 'B', 'C', 'D'][i]}
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
              placeholder="Nháº­p Ä‘Ã¡p Ã¡n cá»§a báº¡n..." 
              className={`w-full px-5 py-4 rounded-xl border-2 focus:ring-4 text-center text-xl font-bold outline-none transition-all shadow-inner ${isCorrect === true ? 'bg-[#ecfdf5] border-[#10b981] text-[#10b981]' : isCorrect === false ? 'bg-[#fff1f2] border-[#f43f5e] text-[#f43f5e]' : 'bg-white border-slate-300 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20 text-slate-700'}`}
            />
            <button 
              onClick={handleCheckShortAnswer}
              disabled={isCorrect !== null || !shortAnswerText.trim()}
              className="w-full bg-[#3b82f6] text-white px-4 py-4 rounded-xl font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              Kiá»ƒm tra Ä‘Ã¡p Ã¡n
            </button>
          </div>
        )}

        {type === "essay" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto mt-2">
            <p className="text-slate-500 text-sm text-center font-medium leading-relaxed">
              Giáº£i ra nhÃ¡p, chá»¥p áº£nh vÃ  táº£i lÃªn Ä‘Ã¢y Ä‘á»ƒ AI cháº¥m.
            </p>
            
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*, application/pdf, .docx" capture="environment" className="hidden" />
            
            {essayImageUrl && (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner group">
                <img src={essayImageUrl} alt="BÃ i lÃ m" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {isCorrect === true && <div className="absolute inset-0 border-4 border-[#10b981] rounded-xl pointer-events-none"></div>}
              </div>
            )}

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isCorrect !== null}
              className="w-full bg-white border-2 border-indigo-200 text-indigo-700 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" /> {essayImage ? "Äá»•i áº£nh" : "Chá»n áº£nh"}
            </button>

            <select 
              value={serverId} 
              onChange={e => setServerId(Number(e.target.value))}
              disabled={isCorrect !== null}
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium text-sm outline-none focus:border-indigo-500"
            >
              <option value={1}>MÃ¡y AI 1</option>
              <option value={2}>MÃ¡y AI 2</option>
              <option value={3}>MÃ¡y AI 3</option>
            </select>
            
            {essayImage && (
              <button 
                onClick={handleGradeEssay}
                disabled={isGrading || isCorrect === true}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-sm"
              >
                {isGrading ? <><Loader2 className="w-4 h-4 animate-spin" /> Äang cháº¥m...</> : <><Sparkles className="w-4 h-4" /> Cháº¥m Ä‘iá»ƒm</>}
              </button>
            )}

            {feedback && (
              <div className="w-full mt-2 p-5 bg-white border-2 border-indigo-100 rounded-xl shadow-sm overflow-hidden">
                <h4 className="font-bold text-sm mb-3 text-indigo-700 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Trá»£ giáº£ng AI nháº­n xÃ©t:
                </h4>
                <div className="text-[15px] text-slate-700">{renderQuizContent(feedback)}</div>
              </div>
            )}
          </div>
        )}

        {/* Lá»i giáº£i (Chá»‰ hiá»‡n khi tráº£ lá»i Ä‘Ãºng) */}
        {isCorrect && data.sampleAnswer && (
          <div className="mt-8 bg-emerald-50/50 border border-emerald-100 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
            <div className="bg-emerald-100/60 px-5 py-3 border-b border-emerald-100 flex items-center gap-2 font-bold text-emerald-800">
              <Key className="w-5 h-5 text-emerald-600"/> Lá»i giáº£i chi tiáº¿t
            </div>
            <div className="p-6 text-emerald-900 leading-relaxed text-[15px] md:text-base">
              {renderQuizContent(data.sampleAnswer)}
            </div>
          </div>
        )}

        {/* Cáº£nh bÃ¡o ÄÃºng / Sai */}
        {isCorrect === true && !data.sampleAnswer && (
          <div className="mt-8 p-4 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-500 border border-emerald-200 w-full justify-center shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" /> Xuáº¥t sáº¯c! Báº¡n Ä‘Ã£ tráº£ lá»i Ä‘Ãºng.
          </div>
        )}
        {isCorrect === false && (
          <div className="mt-8 p-4 bg-rose-50 text-rose-700 rounded-xl font-bold text-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 border border-rose-200 w-full justify-center shadow-sm">
            <XCircle className="w-6 h-6 text-rose-500" /> {type === 'essay' ? 'BÃ i lÃ m cá»§a báº¡n cÃ²n thiáº¿u sÃ³t, hÃ£y Ä‘á»c nháº­n xÃ©t nhÃ©!' : 'ChÆ°a chÃ­nh xÃ¡c, hÃ£y thá»­ láº¡i!'}
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
            <h3 className="text-xl font-bold text-gray-700 mb-2">ChÆ°a cÃ³ cÃ¢u há»i nÃ o!</h3>
            <p>Vui lÃ²ng chuyá»ƒn sang Tab <b>Nháº­p liá»‡u AI (DÃ¡n Äá»)</b> Ä‘á»ƒ tá»± Ä‘á»™ng biÃªn soáº¡n tá»« áº£nh.</p>
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
                    <span className="text-sm font-bold">Cáº£nh bÃ¡o: PhÃ¡t hiá»‡n hÃ¬nh áº£nh / biá»ƒu Ä‘á»“ á»Ÿ cÃ¢u há»i nÃ y!</span>
                  </div>
                  <button onClick={() => onTriggerCrop(idx)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center gap-1.5"><CropIcon className="w-3.5 h-3.5" /> Báº¥m Ä‘á»ƒ Cáº¯t & ChÃ¨n áº¢nh</button>
               </div>
             )}
             <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-teal-800 text-lg flex items-center gap-2"><div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm">{idx + 1}</div> CÃ¢u há»i {idx + 1}</span>
                <select value={type} onChange={e => onUpdateQuiz(idx, { ...quiz, type: e.target.value })} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                   <option value="multiple_choice">Tráº¯c nghiá»‡m 4 lá»±a chá»n</option>
                   <option value="true_false">ÄÃºng / Sai</option>\n                   <option value="true_false_cluster">ÄÃºng / Sai Cá»¥m (4 Ã)</option>
                   <option value="short_answer">Tráº£ lá»i ngáº¯n / Äiá»n khuyáº¿t</option>
                   <option value="essay">Tá»± luáº­n / TrÃ¬nh bÃ y chi tiáº¿t</option>
                </select>
             </div>
             <div className="p-5 flex flex-col gap-5">
                <div>
                   <div className="flex justify-between items-end mb-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ná»™i dung Ä‘á» bÃ i (Há»— trá»£ Markdown / LaTeX)</label>
                     <button onClick={() => onTriggerCrop(idx)} className="text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-orange-100"><CropIcon className="w-3.5 h-3.5"/> Cáº¯t & chÃ¨n áº£nh</button>
                   </div>
                   <textarea rows={3} value={quiz.question || ""} onChange={e => onUpdateQuiz(idx, { ...quiz, question: e.target.value })} placeholder="VD: TÃ¬m x biáº¿t $2x = 4$" className="w-full border border-gray-200 rounded-xl p-3 text-[15px] focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-mono" />
                </div>
                
                {type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {[0,1,2,3].map(optIdx => (
                       <div key={optIdx} className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-gray-600 flex items-center gap-2 cursor-pointer w-max">
                             <input type="radio" name={`ans_${idx}`} checked={quiz.answerIndex === optIdx} onChange={() => onUpdateQuiz(idx, { ...quiz, answerIndex: optIdx })} className="w-4 h-4 text-teal-600 focus:ring-teal-500" />
                             ÄÃ¡p Ã¡n {['A','B','C','D'][optIdx]} {quiz.answerIndex === optIdx && <span className="text-teal-600 ml-1">(ÄÃºng)</span>}
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
                                <option value="true">ÄÃšNG</option>
                                <option value="false">SAI</option>
                             </select>
                          </div>
                          <textarea rows={1} value={stmt.text || ""} onChange={e => {
                             const newStmts = [...(quiz.statements || [])];
                             newStmts[sIdx] = { ...newStmts[sIdx], text: e.target.value };
                             onUpdateQuiz(idx, { ...quiz, statements: newStmts });
                          }} className="w-full flex-1 border border-gray-200 rounded-lg p-2.5 text-[14px] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none font-mono" placeholder="Nháº­p má»‡nh Ä‘á»..." />
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
                             ÄÃ¡p Ã¡n {['ÄÃºng','Sai'][optIdx]} {quiz.answerIndex === optIdx && <span className="text-teal-600 ml-1">(Chuáº©n)</span>}
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
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">ÄÃ¡p Ã¡n Ä‘Ãºng chÃ­nh xÃ¡c (Text/Sá»‘)</label>
                     <input type="text" value={quiz.exactAnswer || ""} onChange={e => onUpdateQuiz(idx, { ...quiz, exactAnswer: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl p-3 text-[15px] focus:border-teal-500 outline-none font-bold text-teal-700 bg-gray-50 focus:bg-white transition-all" placeholder="VD: 5, hoáº·c: VÃ´ nghiá»‡m" />
                  </div>
                )}

                {type === 'essay' && (
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">HÆ°á»›ng dáº«n giáº£i / ÄÃ¡p Ã¡n máº«u (DÃ¹ng Ä‘á»ƒ AI tá»± Ä‘á»™ng cháº¥m bÃ i sinh viÃªn)</label>
                     <textarea rows={4} value={quiz.sampleAnswer || ""} onChange={e => onUpdateQuiz(idx, { ...quiz, sampleAnswer: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 text-[15px] focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-mono" placeholder="Ghi chi tiáº¿t cÃ¡c bÆ°á»›c giáº£i, barem Ä‘iá»ƒm..." />
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
    const regex = /```quiz\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
          const txt = content.substring(lastIndex, match.index).trim();
          if (txt) res.push({ id: Math.random().toString(36).substring(7), type: 'md', content: txt });
      }
      try {
          const data = JSON.parse(match[1].replace(/\n$/, ''));
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

  const [title, setTitle] = useState("Äang táº£i...");
  const [markdownContent, setMarkdownContent] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editorMode, setEditorMode] = useState<'form' | 'raw'>('form');
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
    if (!apiKey) return alert("Vui lÃ²ng nháº­p API Key!");
    localStorage.setItem("gemini_api_key", apiKey);
    setIsKeySaved(true); alert("LÆ°u API Key thÃ nh cÃ´ng!");
  };

  const handleSaveToDB = async () => {
    if (!lessonId) return;
    setIsSavingDB(true);
    const content = editorMode === 'form' ? serializeBlocksToMarkdown(blocks) : markdownContent;
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
    if (error) alert("Lá»—i lÆ°u bÃ i: " + error.message); else alert("ÄÃ£ lÆ°u thÃ nh cÃ´ng!");
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

  const handleAnalyzeQueue = async () => {
    if (pendingImages.length === 0 && pendingText.trim().length === 0) return alert("HÃ ng Ä‘á»£i rá»—ng!");
    if (!apiKey) return alert("Vui lÃ²ng lÆ°u Gemini API Key trÆ°á»›c!");
    
    setIsAnalyzing(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const prompt = `Báº¡n lÃ  má»™t chuyÃªn gia giÃ¡o dá»¥c ToÃ¡n há»c xuáº¥t sáº¯c hÃ ng Ä‘áº§u tháº¿ giá»›i. 
HÃ£y phÃ¢n tÃ­ch ná»™i dung cÃ¡c áº£nh tÃ i liá»‡u nÃ y vÃ  biÃªn soáº¡n láº¡i thÃ nh má»™t bÃ i giáº£ng ToÃ¡n há»c Cá»°C Ká»² THU HÃšT, TRÃŒNH BÃ€Y SIÃŠU Äáº¸P.
YÃŠU Cáº¦U Äá»ŠNH Dáº NG TUYá»†T Äá»I (LÃ€M SAI Sáº¼ Bá»Š PHáº T):
1. DÃ¹ng Markdown. Má»i cÃ´ng thá»©c ToÃ¡n há»c Báº®T BUá»˜C dÃ¹ng LaTeX bá»c trong $$ hoáº·c $.
2. [Cá»°C QUAN TRá»ŒNG]: TÄƒng cÆ°á»ng sá»­ dá»¥ng Emoji á»Ÿ Ä‘áº§u cÃ¡c dÃ²ng, cÃ¡c má»¥c Ä‘á»ƒ lÃ m ná»•i báº­t (VD: ðŸŽ¯ Má»¥c tiÃªu, ðŸ“ BÃ i táº­p, ðŸš€ PhÆ°Æ¡ng phÃ¡p, ðŸ’¡ PhÃ¢n tÃ­ch). Cáº¥u trÃºc bÃ i báº±ng Heading (#, ##).
3. [Cá»°C QUAN TRá»ŒNG]: Cá»© sau má»—i má»™t khÃ¡i niá»‡m lÃ½ thuyáº¿t, hoáº·c sau 1 vÃ­ dá»¥, Báº N PHáº¢I DÃ™NG Ä‘Ãºng 3 dáº¥u gáº¡ch ngang \`---\` Ä‘á»ƒ ngáº¯t trang (táº¡o thÃ nh slide má»›i).
4. Äá»‹nh nghÄ©a/Äá»‹nh lÃ½ báº¯t Ä‘áº§u báº±ng \`> ðŸ’¡ **Äá»‹nh lÃ½:**\`. VÃ­ dá»¥ báº¯t Ä‘áº§u báº±ng \`> ðŸ“Œ **VÃ­ dá»¥:**\`.
5. Náº¿u áº£nh gá»‘c cÃ³ Äá»“ thá»‹/HÃ¬nh há»c, chÃ¨n ngay dÃ²ng nÃ y: \`[ðŸ”´ CHÃš Ã: CÃ“ HÃŒNH Váº¼ á»ž ÄÃ‚Y - HÃƒY CHÃˆN áº¢NH VÃ€O]\`
6. [SIÃŠU QUAN TRá»ŒNG - Táº O CÃ‚U Há»ŽI TRáº®C NGHIá»†M]: TrÆ°á»›c má»—i láº§n báº¡n Ä‘áº·t dáº¥u ngáº¯t trang \`---\`, báº¡n HÃƒY Tá»° NGHÄ¨ RA 1 CÃ‚U Há»ŽI TRáº®C NGHIá»†M Ä‘á»ƒ kiá»ƒm tra há»c sinh. 
Má»i cÃ¢u há»i tráº¯c nghiá»‡m PHáº¢I Ä‘Æ°á»£c xuáº¥t ra ÄÃšNG DÆ¯á»šI Dáº NG ÄOáº N MÃƒ NGÃ”N NGá»® "quiz" chá»©a chuá»—i JSON chuáº©n xÃ¡c. CÃ³ 2 loáº¡i cáº¥u trÃºc JSON mÃ  báº¡n cÃ³ thá»ƒ dÃ¹ng:

LOáº I 1: CÃ‚U Há»ŽI NHIá»€U Lá»°A CHá»ŒN (1 ÄÃP ÃN ÄÃšNG)
\`\`\`quiz
{
  "type": "multiple_choice",
  "question": "Äáº¡o hÃ m cá»§a hÃ m sá»‘ $y = x^2 + 2x$ lÃ ?",
  "options": ["$y' = 2x + 2$", "$y' = x + 2$", "$y' = 2x$", "$y' = 2$"],
  "answerIndex": 0
}
\`\`\`

LOáº I 2: CÃ‚U Há»ŽI ÄÃšNG/SAI (4 Má»†NH Äá»€ Äá»˜C Láº¬P - BAREM 2025)
\`\`\`quiz
{
  "type": "true_false_cluster",
  "question": "Cho hÃ m sá»‘ y = f(x)... XÃ©t tÃ­nh ÄÃºng/Sai cá»§a cÃ¡c má»‡nh Ä‘á» sau:",
  "options": [
    { "id": "a", "content": "Má»‡nh Ä‘á» A", "isTrue": true },
    { "id": "b", "content": "Má»‡nh Ä‘á» B", "isTrue": false },
    { "id": "c", "content": "Má»‡nh Ä‘á» C", "isTrue": true },
    { "id": "d", "content": "Má»‡nh Ä‘á» D", "isTrue": false }
  ]
}
\`\`\`

GHI CHÃš TUYá»†T Äá»I QUAN TRá»ŒNG: 
- Táº¥t cáº£ cÃ¡c cÃ´ng thá»©c toÃ¡n há»c trong JSON Báº®T BUá»˜C bá»c trong $...$
- Náº¿u khÃ´ng chá»‰ Ä‘á»‹nh type, há»‡ thá»‘ng máº·c Ä‘á»‹nh lÃ  multiple_choice.`;

      let finalPrompt = prompt;
      if (pendingText.trim().length > 0) {
          finalPrompt += "\n\n[Ná»˜I DUNG VÄ‚N Báº¢N Tá»ª FILE WORD]:\n" + pendingText;
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
        // Giá»¯ cÃ¡c áº£nh trong blob memory Ä‘á»ƒ sá»­ dá»¥ng cho crop
      }
      setPendingImages([]);
      setPendingText("");
      
    } catch (error: any) {
      console.error(error); 
      if (error.message && error.message.includes("429")) {
        alert("Lá»—i AI: VÆ°á»£t quÃ¡ giá»›i háº¡n (Quota) cá»§a API Key (Lá»—i 429). Vui lÃ²ng chá» 1 lÃ¡t rá»“i thá»­ láº¡i, hoáº·c sá»­ dá»¥ng API Key Google khÃ¡c!");
      } else {
        alert("Lá»—i AI: " + (error.message || "Kiá»ƒm tra láº¡i káº¿t ná»‘i."));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyPrompt = () => {
    const prompt = `Báº¡n lÃ  má»™t chuyÃªn gia giÃ¡o dá»¥c ToÃ¡n há»c xuáº¥t sáº¯c hÃ ng Ä‘áº§u tháº¿ giá»›i. 
HÃ£y phÃ¢n tÃ­ch ná»™i dung cÃ¡c áº£nh tÃ i liá»‡u nÃ y vÃ  biÃªn soáº¡n láº¡i thÃ nh má»™t bÃ i giáº£ng ToÃ¡n há»c Cá»°C Ká»² THU HÃšT, TRÃŒNH BÃ€Y SIÃŠU Äáº¸P.
YÃŠU Cáº¦U Äá»ŠNH Dáº NG TUYá»†T Äá»I (LÃ€M SAI Sáº¼ Bá»Š PHáº T):
1. DÃ¹ng Markdown. Má»i cÃ´ng thá»©c ToÃ¡n há»c Báº®T BUá»˜C dÃ¹ng LaTeX bá»c trong $$ hoáº·c $.
2. [Cá»°C QUAN TRá»ŒNG]: TÄƒng cÆ°á»ng sá»­ dá»¥ng Emoji á»Ÿ Ä‘áº§u cÃ¡c dÃ²ng, cÃ¡c má»¥c Ä‘á»ƒ lÃ m ná»•i báº­t (VD: ðŸŽ¯ Má»¥c tiÃªu, ðŸ“ BÃ i táº­p, ðŸš€ PhÆ°Æ¡ng phÃ¡p, ðŸ’¡ PhÃ¢n tÃ­ch). Cáº¥u trÃºc bÃ i báº±ng Heading (#, ##).
3. [Cá»°C QUAN TRá»ŒNG]: Cá»© sau má»—i má»™t khÃ¡i niá»‡m lÃ½ thuyáº¿t, hoáº·c sau 1 vÃ­ dá»¥, Báº N PHáº¢I DÃ™NG Ä‘Ãºng 3 dáº¥u gáº¡ch ngang \`---\` Ä‘á»ƒ ngáº¯t trang (táº¡o thÃ nh slide má»›i).
4. Äá»‹nh nghÄ©a/Äá»‹nh lÃ½ báº¯t Ä‘áº§u báº±ng \`> ðŸ’¡ **Äá»‹nh lÃ½:**\`. VÃ­ dá»¥ báº¯t Ä‘áº§u báº±ng \`> ðŸ“Œ **VÃ­ dá»¥:**\`.
5. Náº¿u áº£nh gá»‘c cÃ³ Äá»“ thá»‹/HÃ¬nh há»c, chÃ¨n ngay dÃ²ng nÃ y: \`[ðŸ”´ CHÃš Ã: CÃ“ HÃŒNH Váº¼ á»ž ÄÃ‚Y - HÃƒY CHÃˆN áº¢NH VÃ€O]\`
6. [SIÃŠU QUAN TRá»ŒNG - Táº O CÃ‚U Há»ŽI TRáº®C NGHIá»†M]: TrÆ°á»›c má»—i láº§n báº¡n Ä‘áº·t dáº¥u ngáº¯t trang \`---\`, báº¡n HÃƒY Tá»° NGHÄ¨ RA 1 CÃ‚U Há»ŽI TRáº®C NGHIá»†M Ä‘á»ƒ kiá»ƒm tra há»c sinh. 
Má»i cÃ¢u há»i tráº¯c nghiá»‡m PHáº¢I Ä‘Æ°á»£c xuáº¥t ra ÄÃšNG DÆ¯á»šI Dáº NG ÄOáº N MÃƒ NGÃ”N NGá»® "quiz" chá»©a chuá»—i JSON chuáº©n xÃ¡c. CÃ³ 2 loáº¡i cáº¥u trÃºc JSON mÃ  báº¡n cÃ³ thá»ƒ dÃ¹ng:

LOáº I 1: CÃ‚U Há»ŽI NHIá»€U Lá»°A CHá»ŒN (1 ÄÃP ÃN ÄÃšNG)
\`\`\`quiz
{
  "type": "multiple_choice",
  "question": "Ná»™i dung cÃ¢u há»i á»Ÿ Ä‘Ã¢y?",
  "options": ["ÄÃ¡p Ã¡n A", "ÄÃ¡p Ã¡n B", "ÄÃ¡p Ã¡n C", "ÄÃ¡p Ã¡n D"],
  "answerIndex": 0
}
\`\`\`

LOáº I 2: CÃ‚U Há»ŽI ÄÃšNG/SAI (4 Má»†NH Äá»€ Äá»˜C Láº¬P - BAREM 2025)
\`\`\`quiz
{
  "type": "true_false_cluster",
  "question": "CÃ¢u dáº«n: Cho hÃ m sá»‘ y = f(x)... XÃ©t tÃ­nh ÄÃºng/Sai cá»§a cÃ¡c má»‡nh Ä‘á» sau:",
  "options": [
    { "id": "a", "content": "Má»‡nh Ä‘á» A", "isTrue": true },
    { "id": "b", "content": "Má»‡nh Ä‘á» B", "isTrue": false },
    { "id": "c", "content": "Má»‡nh Ä‘á» C", "isTrue": true },
    { "id": "d", "content": "Má»‡nh Ä‘á» D", "isTrue": false }
  ]
}
\`\`\`

GHI CHÃš TUYá»†T Äá»I QUAN TRá»ŒNG: 
- Táº¥t cáº£ cÃ¡c cÃ´ng thá»©c toÃ¡n há»c trong JSON Báº®T BUá»˜C bá»c trong $...$
- Náº¿u khÃ´ng chá»‰ Ä‘á»‹nh type, há»‡ thá»‘ng máº·c Ä‘á»‹nh lÃ  multiple_choice.`;

    navigator.clipboard.writeText(prompt);
    alert("ÄÃ£ Copy Prompt Chuáº©n!\n\nTháº§y/CÃ´ hÃ£y má»Ÿ gemini.google.com, dÃ¡n vÄƒn báº£n nÃ y vÃ o. Sau Ä‘Ã³, KÃ‰O THáº¢ cÃ¡c áº£nh tÃ i liá»‡u cá»§a Tháº§y/CÃ´ vÃ o pháº§n chat rá»“i Enter nhÃ©!");
  };

  const handleInsertManualMarkdown = () => {
    if (!manualGeminiInput.trim()) {
      alert("Vui lÃ²ng dÃ¡n ná»™i dung tá»« Gemini vÃ o khung trÆ°á»›c!");
      return;
    }
    const separator = markdownContent.length > 0 && !markdownContent.endsWith('---') ? "\n\n---\n\n" : "\n\n";
    setMarkdownContent(prev => prev ? prev + separator + manualGeminiInput : manualGeminiInput);
    setManualGeminiInput("");
    setIsBackupModalOpen(false);
    alert("ÄÃ£ chÃ¨n ná»™i dung thÃ nh cÃ´ng!");
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
            alert("Lá»—i Ä‘á»c file Word: " + err);
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
  const handleUploadCroppedImage = async () => {
    if (!imgRef.current || !crop || crop.width === 0 || crop.height === 0) return alert("Báº¡n chÆ°a chá» n vÃ¹ng!");
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
      const imageMarkdown = `\n![HÃ¬nh minh há» a](${publicUrl})\n`;

      if (targetCropBlockId) {
        // CHÃˆN VÃ€O BLOCK EDITOR
        const newBlocks = [...blocks];
        const bIndex = newBlocks.findIndex(b => b.id === targetCropBlockId);
        if (bIndex > -1) {
            const b = newBlocks[bIndex];
            const placeholderRegex = /\[IMAGE_PLACEHOLDER\]|\[.*?CHÃš Ã .*?\]|\[.*?HÃŒNH Váº¼.*?\]/i;
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
        // CHÃˆN VÃ€O RAW MARKDOWN
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart; const end = textareaRef.current.selectionEnd;
            setMarkdownContent(markdownContent.substring(0, start) + imageMarkdown + markdownContent.substring(end));
        } else {
            setMarkdownContent(prev => prev + imageMarkdown);
        }
      }
      setIsCropModalOpen(false); setCropImageSrc(''); setCrop(undefined);
    } catch (error: any) {
      console.error(error); alert("Lá»—i táº£i áº£nh. Kiá»ƒm tra láº¡i Storage Bucket.");
    } finally {
      setIsUploadingCropped(false);
    }
  };


  // --- LOGIC SLIDE & GAMIFICATION ---
  const activeSlideContent = markdownContent;

  const renderMarkdown = (content: string) => (
    <ReactMarkdown 
      remarkPlugins={[remarkMath]} 
      rehypePlugins={[rehypeKatex]}
      components={{
        blockquote({ node, children, ...props }) {
          const contentStr = String(children);
          if (contentStr.includes('ðŸ’¡') || contentStr.toLowerCase().includes('Ä‘á»‹nh lÃ½') || contentStr.toLowerCase().includes('Ä‘á»‹nh nghÄ©a')) {
            return (
              <blockquote className="bg-yellow-50 border-l-4 border-yellow-500 px-6 py-5 rounded-r-2xl my-6 not-prose shadow-sm relative transition-all hover:shadow-md" {...props}>
                <div className="font-semibold text-yellow-900 text-[1.1em]">{children}</div>
              </blockquote>
            );
          }
          if (contentStr.includes('ðŸ“Œ') || contentStr.toLowerCase().includes('vÃ­ dá»¥')) {
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
              return <div className="p-4 bg-red-100 text-red-600 rounded-lg shadow-sm border border-red-200">Lá»—i: Cáº¥u trÃºc cÃ¢u há» i Quiz tá»« AI khÃ´ng há»£p lá»‡. Vui lÃ²ng sá»­a láº¡i.</div>
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
    // Táº¡o 1 báº£n nhÃ¡p má»›i vÃ o báº£ng lessons
    const { data, error } = await supabase.from('lessons').insert([{ title: "BÃ i giáº£ng AI nhÃ¡p" }]).select().single();
    setIsCreating(false);
    if (error) {
      alert("Lá»—i khi táº¡o bÃ i: " + error.message + " (Do RÃ ng buá»™c cÆ¡ sá»Ÿ dá»¯ liá»‡u, báº¡n vui lÃ²ng táº¡o BÃ i tá»« Cáº¥u trÃºc KhÃ³a há» c)");
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
        <p className="text-gray-500 mb-10 leading-relaxed text-lg px-4">Báº¡n chÆ°a chá» n BÃ i giáº£ng cá»¥ thá»ƒ. Khá»Ÿi táº¡o má»™t Báº£n NhÃ¡p má»›i Ä‘á»ƒ thá» a sá»©c sÃ¡ng táº¡o vá»›i AI ngay bÃ¢y giá» ?</p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={handleCreateNewLesson} 
            disabled={isCreating}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(79,70,229,0.6)] hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-70 text-lg"
          >
            {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
            Táº¡o Báº£n NhÃ¡p Má»›i Trá»‘ng
          </button>
          <button 
            onClick={() => router.back()} 
            className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 hover:text-gray-800 transition-colors text-lg"
          >
            Quay láº¡i Danh sÃ¡ch
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-2 relative">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-shrink-0 transition-all duration-300 z-20">
        {!isHeaderExpanded ? (
           <div className="flex justify-between items-center px-3 py-1.5 bg-gray-50/80 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsHeaderExpanded(true)}>
             <div className="flex items-center gap-3">
               <button onClick={(e) => { e.stopPropagation(); router.back(); }} className="p-1.5 text-gray-500 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></button>
               <span className="font-bold text-sm text-gray-700 flex items-center gap-2"><Edit2 className="w-4 h-4 text-indigo-500" /> <span className="hidden sm:inline">CÃ i Ä‘áº·t:</span> <span className="text-teal-700 truncate max-w-[200px] sm:max-w-xs">{title || 'Ä ang táº£i...'}</span> {moduleTitle && <><span className="text-gray-300">/</span><span className="text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md text-xs border border-orange-200 uppercase tracking-wide shrink-0 shadow-sm">{moduleTitle}</span></>}</span>
             </div>
             <div className="flex items-center gap-3">
               <button onClick={(e) => { e.stopPropagation(); handleSaveToDB(); }} disabled={isSavingDB} className="bg-teal-600 text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-sm hover:bg-teal-700 flex items-center gap-1.5">
                  {isSavingDB ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5" />} LÆ°u
               </button>
               {lessonId && (
                 <button onClick={async (e) => { e.stopPropagation(); await handleSaveToDB(); window.open(`/student/lessons/${lessonId}`, '_blank'); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1.5">
                   <MonitorPlay className="w-3.5 h-3.5" /> Demo
                 </button>
               )}
               <div className="p-1 bg-gray-200 rounded-md ml-2"><ChevronDown className="w-4 h-4 text-gray-600" /></div>
             </div>
           </div>
        ) : (
           <div className="p-4 relative">
             <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
               <button onClick={(e) => { e.stopPropagation(); router.back(); }} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:bg-white shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /> Trá»Ÿ vá» </button>
             </div>
             <button onClick={() => setIsHeaderExpanded(false)} className="absolute top-3 right-3 text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-50 rounded-full p-1.5 transition-colors z-10"><ChevronUp className="w-4 h-4" /></button>
             <div className="flex flex-col gap-4 mb-2 mt-5">
          <div className="flex gap-4 items-start">
            <div className="flex-[2]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">TÃªn BÃ i Giáº£ng {moduleTitle && <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 normal-case tracking-normal">Má»¥c: {moduleTitle}</span>}</label>
              <input 
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-bold text-gray-800 bg-transparent border-b border-gray-200 focus:border-teal-500 focus:outline-none pb-1 transition-colors"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Thuá»™c KhÃ³a há» c</label>
              <select 
                value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedChapterId(""); }}
                className="w-full text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Chá» n --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Thuá»™c ChÆ°Æ¡ng</label>
              <select 
                value={selectedChapterId} onChange={e => setSelectedChapterId(e.target.value)}
                disabled={!selectedCourseId}
                className="w-full text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-teal-500 focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                <option value="">-- Chá» n --</option>
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
                  placeholder="Link TÃ i liá»‡u táº£i xuá»‘ng (Google Drive, PDF...)"
                  className="w-full bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 text-gray-700"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
            <div className="text-xs text-gray-400 font-medium">Báº£n nhÃ¡p Ä‘Æ°á»£c lÆ°u táº¡i: <span className="text-teal-600 font-bold">{title}</span></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                <Key className="w-4 h-4 text-gray-400 ml-2" />
                <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setIsKeySaved(false); }} placeholder="Nháº­p Gemini API Key..." className="bg-transparent border-none focus:ring-0 text-sm px-2 py-1 w-32 outline-none" />
                <button onClick={saveApiKey} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${isKeySaved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isKeySaved ? 'Ä Ã£ lÆ°u' : 'LÆ°u API'}</button>
              </div>
              <button onClick={handleSaveToDB} disabled={isSavingDB} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-[0_5px_15px_-5px_rgba(13,148,136,0.4)] hover:-translate-y-0.5 disabled:opacity-50">
                {isSavingDB ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} LÆ°u
              </button>
              {lessonId && (
                <Link href={`/student/lessons/${lessonId}`} target="_blank" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-[0_5px_15px_-5px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 ml-2">
                  <MonitorPlay className="w-4 h-4" /> Xem Há» c sinh
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>

      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">
          <div className="bg-gray-50 border-b border-gray-100 p-2.5 flex justify-between items-center flex-shrink-0">
            <span className="font-semibold text-gray-700 text-sm">Ná»™i dung E-learning</span>
            <button onClick={() => {
                 if (editorMode === 'form') setMarkdownContent(serializeBlocksToMarkdown(blocks));
                 else setBlocks(parseMarkdownToBlocks(markdownContent));
                 setEditorMode(editorMode === 'form' ? 'raw' : 'form');
              }} className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors shadow-sm">
                 {editorMode === 'form' ? <Code2 className="w-3.5 h-3.5" /> : <ListTodo className="w-3.5 h-3.5" />} {editorMode === 'form' ? 'Cháº¿ Ä‘á»™ Code' : 'Cháº¿ Ä‘á»™ Form'}
              </button>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} multiple onChange={handleQueueFileUpload} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"><ImageIcon className="w-3.5 h-3.5" /> Náº¡p File (áº¢nh/Word/PDF)</button>
              <button onClick={() => { if (lastAnalyzedImages.length > 0) setCropImageSrc(lastAnalyzedImages[0]); setIsCropModalOpen(true); }} className="flex items-center gap-1.5 text-xs font-medium bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-md hover:bg-orange-100 transition-colors shadow-sm"><CropIcon className="w-3.5 h-3.5" /> Cáº¯t áº¢nh & ChÃ¨n</button>
              <button onClick={() => setIsBackupModalOpen(true)} className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors shadow-sm"><Bot className="w-3.5 h-3.5" /> Dá»± phÃ²ng Web</button>
            </div>
          </div>
          
          {(pendingImages.length > 0 || pendingText.length > 0) && (
              <div className="bg-indigo-50/50 border-b border-indigo-100 p-3 max-h-64 overflow-y-auto shrink-0 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-indigo-800 uppercase">HÃ ng Ä‘á»£i ({pendingImages.length})</h4>
                  <button onClick={handleAnalyzeQueue} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 animate-bounce"><Sparkles className="w-3.5 h-3.5" /> PhÃ¢n TÃ­ch Ä á»£t NÃ y</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingText.length > 0 && (
                    <div className="relative group rounded-md border border-blue-200 p-2 shadow-sm bg-blue-50 text-blue-800 text-xs font-bold w-32 break-words flex flex-col justify-center items-center text-center">
                      <span className="text-xl mb-1">ðŸ“„</span>
                      <span>Word Text</span>
                      <span className="font-normal text-[10px] mt-0.5">{pendingText.length} kÃ½ tá»±</span>
                      <button onClick={() => setPendingText("")} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  {pendingImages.map(img => (
                    <div key={img.id} className="relative group rounded-md border border-indigo-200 overflow-hidden shadow-sm bg-white">
                      {img.file.type === 'application/pdf' ? (
                        <div className="h-16 w-16 bg-red-50 flex flex-col items-center justify-center text-red-600 font-bold text-[10px]"><span className="text-xl mb-1">ðŸ“„</span>PDF</div>
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
              <textarea 
                ref={textareaRef} value={markdownContent} onChange={(e) => setMarkdownContent(e.target.value)} onPaste={handlePaste}
                placeholder="Báº¯t Ä‘áº§u gÃµ hoáº·c áº¤n Ctrl + V Ä‘á»ƒ dÃ¡n áº£nh bÃ i táº­p vÃ o Ä‘Ã¢y."
                className="flex-1 w-full p-4 resize-none outline-none text-gray-700 font-mono text-sm leading-relaxed"
              />
            ) : (
              <div className="flex-1 overflow-y-auto relative bg-slate-50">
                 <BlockEditor blocks={blocks} onChangeBlocks={setBlocks} onTriggerCrop={(meta, id) => {
                     setTargetCropBlockId(id);
                     if (meta?.originalUrl) setCropImageSrc(meta.originalUrl);
                     setIsCropModalOpen(true);
                 }} globalSourceImage={lastAnalyzedImages.length > 0 ? lastAnalyzedImages[0] : (pendingImages.length > 0 ? pendingImages.map(img => img.previewUrl) : undefined)} />
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                <p className="text-indigo-700 font-semibold animate-pulse">âœ¨ Cá»— mÃ¡y AI Ä‘ang biÃªn soáº¡n BÃ i giáº£ng & Tráº¯c nghiá»‡m...</p>
              </div>
            )}
          </div>
        </div>
      </div>\n      {/* CROPPER MODAL OVERLAY */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onPaste={handlePaste} tabIndex={0} autoFocus>
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
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
                  <h3 className="text-lg font-bold text-gray-800 mb-2">áº¤n Ctrl + V Ä‘á»ƒ dÃ¡n áº£nh vÃ o Ä‘Ã¢y</h3>
                  <label className="bg-orange-600 text-white px-5 py-2.5 rounded-lg cursor-pointer hover:bg-orange-700 font-medium inline-flex items-center gap-2 mt-4"><Upload className="w-4 h-4" /> Hoáº·c táº£i tá»« mÃ¡y <input type="file" className="hidden" accept="image/*" onChange={handleFileSelectForCrop} /></label>
                </div>
              ) : (
                <div className="max-h-full max-w-full overflow-auto rounded-lg shadow-sm border border-gray-200 bg-white p-2">
                  <ReactCrop crop={crop} onChange={c => setCrop(c)}><img ref={imgRef} src={cropImageSrc} alt="Crop" className="max-w-none block" /></ReactCrop>
                </div>
              )}
            </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
              <p className="text-sm text-gray-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {cropImageSrc ? "DÃ¹ng chuá»™t kÃ©o chá»n vÃ¹ng cáº§n cáº¯t" : "Äang chá» áº£nh..."}</p>
              <div className="flex gap-3">
                <button onClick={() => setCropImageSrc('')} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg">XÃ³a áº£nh nÃ y</button>
                <button onClick={handleUploadCroppedImage} disabled={!cropImageSrc || isUploadingCropped} className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2">{isUploadingCropped ? <Loader2 className="w-4 h-4 animate-spin"/> : <CropIcon className="w-4 h-4" />} Cáº¯t & ChÃ¨n áº¢nh</button>
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
              <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2"><Bot className="w-5 h-5" /> Táº¡o bÃ i báº±ng Gemini Web (Thá»§ cÃ´ng)</h2>
              <button onClick={() => setIsBackupModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm">
                <p className="text-blue-900 text-[0.95rem] font-medium mb-4 leading-relaxed">
                  <strong>Dá»± phÃ²ng (Khi API bÃ¡o lá»—i):</strong> DÃ¹ng Gemini Web miá»…n phÃ­ báº±ng cÃ¡ch Copy Prompt chuáº©n vÃ  DÃ¡n káº¿t quáº£ vÃ o Ä‘Ã¢y.
                </p>
                <button onClick={handleCopyPrompt} className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border-[3px] border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 text-lg">
                  <Copy className="w-5 h-5" /> Copy Prompt Chuáº©n
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Code2 className="w-4 h-4 text-emerald-500"/> DÃ¡n mÃ£ JSON/Markdown tá»« Gemini vÃ o Ä‘Ã¢y...</label>
                <textarea 
                  value={manualGeminiInput}
                  onChange={(e) => setManualGeminiInput(e.target.value)}
                  className="w-full h-56 p-4 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-emerald-500 outline-none resize-none font-mono text-sm text-gray-700 bg-gray-50 shadow-inner"
                  placeholder="DÃ¡n toÃ n bá»™ ná»™i dung do Gemini sinh ra vÃ o Ä‘Ã¢y..."
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={handleInsertManualMarkdown} disabled={!manualGeminiInput.trim()} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
                <Code2 className="w-5 h-5" /> Nháº­n diá»‡n & ChÃ¨n Ná»™i dung
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
