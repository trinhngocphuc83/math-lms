"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, List, PlayCircle, FileText, Download } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import AzotaExamUI from './AzotaExamUI';

const DocumentDownloadUI = ({ content }: { content: string }) => {
  const [docList, setDocList] = useState<{id: string, title: string, url: string}[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
     try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) setDocList(parsed);
     } catch(e) {}
  }, [content]);

  if (docList.length === 0) {
     return <div className="p-10 text-center bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500 font-medium">Chưa có tài liệu nào trong mục này.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="w-full md:w-[35%] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0 sticky top-[130px]">
          <div className="bg-gray-50 border-b border-gray-200 p-4 font-bold text-gray-700 flex items-center gap-2">
             <List className="w-5 h-5 text-indigo-600"/> Danh sách Tài liệu
          </div>
          <div className="flex flex-col max-h-[60vh] overflow-y-auto no-scrollbar">
             {docList.map((doc, idx) => (
                <button 
                  key={doc.id || idx} 
                  onClick={() => setActiveIndex(idx)}
                  className={`text-left px-5 py-4 border-b border-gray-100 transition-colors flex items-center gap-3 hover:bg-indigo-50/50 ${activeIndex === idx ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                >
                   <FileText className={`w-5 h-5 shrink-0 ${activeIndex === idx ? 'text-indigo-600' : 'text-gray-400'}`} />
                   <span className={`text-sm font-medium line-clamp-2 ${activeIndex === idx ? 'text-indigo-700 font-bold' : 'text-gray-600'}`}>
                      {doc.title || "Tài liệu không tên"}
                   </span>
                </button>
             ))}
          </div>
       </div>

       <div className="w-full md:w-[65%]">
          {(() => {
             const activeDoc = docList[activeIndex];
             if (!activeDoc) return null;
             return (
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-6 items-center text-center">
                  <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                     <FileText className="w-10 h-10 text-indigo-500"/>
                  </div>
                  <div className="flex flex-col gap-2">
                     <h3 className="font-bold text-gray-800 text-2xl">{activeDoc.title || "Tài liệu không tên"}</h3>
                     <a href={activeDoc.url} target="_blank" className="text-sm text-blue-500 hover:underline line-clamp-1 break-all">{activeDoc.url}</a>
                  </div>
                  <a href={activeDoc.url} target="_blank" rel="noopener noreferrer" className="mt-4 bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-3 text-lg w-full sm:w-auto">
                     <Download className="w-6 h-6" />
                     Tải xuống ngay
                  </a>
               </div>
             );
          })()}
       </div>
    </div>
  );
};

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
};

const VideoListUI = ({ content }: { content: string }) => {
  const [videoList, setVideoList] = useState<{id: string, title: string, url: string}[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
     try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) setVideoList(parsed);
     } catch(e) {}
  }, [content]);

  if (videoList.length === 0) {
     return <div className="p-10 text-center bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500 font-medium">Chưa có video nào trong mục này.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="w-full md:w-[35%] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0 sticky top-[130px]">
          <div className="bg-gray-50 border-b border-gray-200 p-4 font-bold text-gray-700 flex items-center gap-2">
             <List className="w-5 h-5 text-rose-600"/> Danh sách Video
          </div>
          <div className="flex flex-col max-h-[60vh] overflow-y-auto no-scrollbar">
             {videoList.map((vid, idx) => (
                <button 
                  key={vid.id || idx} 
                  onClick={() => setActiveIndex(idx)}
                  className={`text-left px-5 py-4 border-b border-gray-100 transition-colors flex items-center gap-3 hover:bg-rose-50/50 ${activeIndex === idx ? 'bg-rose-50 border-l-4 border-l-rose-600' : 'border-l-4 border-l-transparent'}`}
                >
                   <PlayCircle className={`w-5 h-5 shrink-0 ${activeIndex === idx ? 'text-rose-600' : 'text-gray-400'}`} />
                   <span className={`text-sm font-medium line-clamp-2 ${activeIndex === idx ? 'text-rose-700 font-bold' : 'text-gray-600'}`}>
                      {vid.title || "Video không tên"}
                   </span>
                </button>
             ))}
          </div>
       </div>

       <div className="w-full md:w-[65%] flex flex-col gap-4">
          {(() => {
             const activeVid = videoList[activeIndex];
             if (!activeVid) return null;
             const embedUrl = getYouTubeEmbedUrl(activeVid.url);
             const isYouTube = embedUrl.includes('youtube.com/embed');
             
             return (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-4">
                 <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                    <svg className="w-6 h-6 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> 
                    {activeVid.title || "Video không tên"}
                 </h3>
                 {isYouTube ? (
                   <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-black">
                     <iframe src={embedUrl} allowFullScreen className="absolute top-0 left-0 w-full h-full border-none"></iframe>
                   </div>
                 ) : (
                   <a href={activeVid.url} target="_blank" rel="noopener noreferrer" className="bg-rose-50 text-rose-600 px-6 py-4 rounded-xl font-bold flex items-center justify-between hover:bg-rose-100 transition-colors">
                     <span className="truncate">{activeVid.url}</span>
                     <span className="shrink-0 ml-4 flex items-center gap-2">Mở Video <ArrowRight className="w-4 h-4"/></span>
                   </a>
                 )}
               </div>
             );
          })()}
       </div>
    </div>
  );
};


// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---

const calculateTrueFalseScore = (userAnswers: Record<string, boolean>, items: any[]) => {
  let correctCount = 0;
  items.forEach((stmt: any, idx: number) => {
    if (userAnswers[idx.toString()] !== undefined && userAnswers[idx.toString()] === stmt.isTrue) {
      correctCount++;
    }
  });

  if (correctCount === 1) return 0.1;
  if (correctCount === 2) return 0.25;
  if (correctCount === 3) return 0.5;
  if (correctCount === 4) return 1.0;
  return 0;
};

// --- COMPONENT TRẮC NGHIỆM TƯƠNG TÁC ---
const InteractiveQuiz = ({ data, onPass }: { data: any, onPass: () => void }) => {
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean>>({});
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  const type = data.type || 'multiple_choice';

  const handleCheck = () => {
    setIsChecked(true);
    if (type === 'multiple_choice') {
      if (selectedOpt === data.answerIndex) onPass();
    } else if (type === 'true_false_cluster') {
      const items = data.options || data.statements || [];
      const score = calculateTrueFalseScore(tfAnswers, items);
      if (score > 0) onPass();
    } else if (type === 'short_answer' || type === 'essay') {
      onPass();
    }
  };

  const getTfColor = (idx: number, stmt: any) => {
    const key = idx.toString();
    if (!isChecked) {
      return tfAnswers[key] !== undefined ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:bg-gray-50";
    }
    const isUserTrue = tfAnswers[key];
    if (isUserTrue === undefined) return "border-gray-200 opacity-50";
    if (isUserTrue === stmt.isTrue) return "border-green-500 bg-green-50";
    return "border-red-500 bg-red-50";
  };

  const cleanQuestion = data.question ? data.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '') : "";

  return (
    <div className="my-8 bg-white border-2 border-indigo-200 rounded-[2rem] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(199,210,254,1)] relative transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(199,210,254,1)]">
      <div className="text-lg font-bold text-gray-800 mb-6 flex flex-col md:flex-row items-start md:items-center gap-3">
         <span className="text-indigo-800 bg-indigo-100 border-2 border-indigo-200 px-4 py-1.5 rounded-2xl text-sm shrink-0 font-black tracking-wide">THỬ THÁCH NHỎ</span>
         <div className="flex-1 min-w-0 prose prose-sm sm:prose-base prose-indigo max-w-none prose-p:my-0 font-bold leading-relaxed text-slate-700">
            <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{cleanQuestion.replace(/^(?:\*\*)?Hướng\s+dẫn\s+giải:?(?:\*\*)?\s*/gim, '### 💡 Hướng dẫn giải chi tiết:\n\n')}</ReactMarkdown>
         </div>
      </div>

      {/* RENDER DẠNG NHIỀU LỰA CHỌN */}
      {type === 'multiple_choice' && (
        <div className="flex flex-col gap-3">
          {(data.options || []).map((opt: string, idx: number) => {
             const isSelected = selectedOpt === idx;
             const isCorrect = isChecked && idx === data.answerIndex;
             const isWrong = isChecked && isSelected && idx !== data.answerIndex;
             return (
               <button
                  key={idx}
                  disabled={isChecked}
                  onClick={() => setSelectedOpt(idx)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4
                     ${isSelected && !isChecked ? 'border-indigo-400 bg-indigo-50 shadow-[4px_4px_0px_0px_rgba(129,140,248,1)] transform -translate-y-1' : ''}
                     ${!isSelected && !isChecked ? 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:-translate-y-0.5 hover:shadow-sm' : ''}
                     ${isCorrect ? 'border-green-400 bg-green-50 shadow-[4px_4px_0px_0px_rgba(74,222,128,1)]' : ''}
                     ${isWrong ? 'border-red-400 bg-red-50 shadow-[4px_4px_0px_0px_rgba(248,113,113,1)]' : ''}
                     ${isChecked && !isCorrect && !isWrong ? 'border-gray-200 opacity-50' : ''}
                  `}
               >
                  <div className={`w-8 h-8 shrink-0 rounded-xl border-2 flex items-center justify-center font-black text-sm
                     ${isSelected && !isChecked ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm' : ''}
                     ${!isSelected && !isChecked ? 'border-slate-300 text-slate-500 bg-slate-50' : ''}
                     ${isCorrect ? 'border-green-500 bg-green-500 text-white shadow-sm' : ''}
                     ${isWrong ? 'border-red-500 bg-red-500 text-white shadow-sm' : ''}
                  `}>
                     {['A','B','C','D'][idx]}
                  </div>
                  <div className="flex-1 min-w-0 prose prose-sm max-w-none text-gray-700 prose-p:my-0">
                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                  </div>
               </button>
             );
          })}
        </div>
      )}

      {/* RENDER DẠNG ĐÚNG/SAI CỤM 4 Ý (BAREM 2025) */}
      {type === 'true_false_cluster' && (
         <div className="flex flex-col gap-4">
            <div className="text-sm font-semibold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg mb-2">
               Luật thi 2025: Chọn Đ/S cho mỗi mệnh đề. (1 ý: 0.1đ | 2 ý: 0.25đ | 3 ý: 0.5đ | 4 ý: 1.0đ)
            </div>
            {(data.options || data.statements || []).map((stmt: any, idx: number) => {
               const key = idx.toString();
               const st = getTfColor(idx, stmt);
               return (
                  <div key={idx} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 ${st}`}>
                     <div className="flex items-start gap-3">
                        <div className="font-bold text-gray-500 w-6">{['A','B','C','D'][idx] || 'A'}.</div>
                        <div className="flex-1 min-w-0 prose prose-sm max-w-none text-gray-700 prose-p:my-0">
                           <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{stmt.content || stmt.text}</ReactMarkdown>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                        <button
                           disabled={isChecked}
                           onClick={() => setTfAnswers(prev => ({...prev, [key]: true}))}
                           className={`px-4 py-2 font-bold rounded-lg text-sm border-2 transition-colors ${tfAnswers[key] === true ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 disabled:opacity-50'}`}
                        >
                           ĐÚNG
                        </button>
                        <button
                           disabled={isChecked}
                           onClick={() => setTfAnswers(prev => ({...prev, [key]: false}))}
                           className={`px-4 py-2 font-bold rounded-lg text-sm border-2 transition-colors ${tfAnswers[key] === false ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 disabled:opacity-50'}`}
                        >
                           SAI
                        </button>
                     </div>
                  </div>
               );
            })}
         </div>
      )}

      {/* RENDER DẠNG TRẢ LỜI NGẮN / TỰ LUẬN */}
      {(type === 'short_answer' || type === 'essay') && (
         <div className="flex flex-col gap-3 mt-4">
            <input 
               type="text" 
               disabled={isChecked}
               placeholder="Nhập câu trả lời của bạn vào đây..."
               value={shortAnswerText}
               onChange={e => setShortAnswerText(e.target.value)}
               className={`w-full p-4 rounded-xl border-2 outline-none font-bold text-gray-700 focus:ring-4 focus:ring-indigo-500/20 transition-all ${
                  isChecked 
                    ? ((shortAnswerText || '').trim().toLowerCase() === (data.exactAnswer || '').trim().toLowerCase() ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700')
                    : 'border-slate-200 hover:border-indigo-300 focus:border-indigo-500'
               }`}
            />
         </div>
      )}

      {isChecked && type === 'multiple_choice' && (
         <div className={`mt-5 p-4 rounded-xl flex items-start gap-3 ${selectedOpt === data.answerIndex ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {selectedOpt === data.answerIndex ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <div className="flex-1">
               <p className="font-bold">{selectedOpt === data.answerIndex ? 'Tuyệt vời! Bạn đã trả lời chính xác.' : 'Chưa đúng rồi! Hãy thử lại nhé.'}</p>
            </div>
            {selectedOpt !== data.answerIndex && (
               <button onClick={() => { setIsChecked(false); setSelectedOpt(null); }} className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-sm transition-colors shrink-0 shadow-sm">Làm lại</button>
            )}
         </div>
      )}

      {isChecked && type === 'short_answer' && (
         <div className={`mt-5 p-4 rounded-xl flex items-start gap-3 ${((shortAnswerText || '').trim().toLowerCase() === (data.exactAnswer || '').trim().toLowerCase()) ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {((shortAnswerText || '').trim().toLowerCase() === (data.exactAnswer || '').trim().toLowerCase()) ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <div className="flex-1">
               <p className="font-bold">{((shortAnswerText || '').trim().toLowerCase() === (data.exactAnswer || '').trim().toLowerCase()) ? 'Tuyệt vời! Bạn đã điền chính xác.' : `Chưa đúng rồi! Đáp án đúng là: ${data.exactAnswer || 'Chưa cập nhật'}`}</p>
            </div>
            {((shortAnswerText || '').trim().toLowerCase() !== (data.exactAnswer || '').trim().toLowerCase()) && (
               <button onClick={() => { setIsChecked(false); setShortAnswerText(""); }} className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-sm transition-colors shrink-0 shadow-sm">Làm lại</button>
            )}
         </div>
      )}

      {isChecked && type === 'true_false_cluster' && (() => {
         const items = data.options || data.statements || [];
         const score = calculateTrueFalseScore(tfAnswers, items);
         const isPerfect = score === 1.0;
         const color = isPerfect ? 'bg-green-50 text-green-800 border-green-200' : (score > 0 ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-red-50 text-red-800 border-red-200');
         return (
            <div className={`mt-5 p-4 rounded-xl border flex items-start gap-3 ${color}`}>
               {isPerfect ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0"/> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0"/>}
               <div className="flex-1">
                 <p className="font-bold">Kết quả chấm điểm: {score} điểm</p>
                 <p className="text-sm opacity-80">(Khớp {score === 0.1 ? 1 : score === 0.25 ? 2 : score === 0.5 ? 3 : score === 1.0 ? 4 : 0}/4 mệnh đề)</p>
               </div>
               {!isPerfect && (
                 <button onClick={() => { setIsChecked(false); setTfAnswers({}); }} className="px-4 py-1.5 bg-white/50 hover:bg-white/80 font-bold rounded-lg text-sm transition-colors border border-black/10 shrink-0 shadow-sm text-gray-800">Làm lại</button>
               )}
            </div>
         );
      })()}

      {!isChecked && (
        <button
           disabled={(type === 'multiple_choice' && selectedOpt === null) || (type === 'true_false_cluster' && Object.keys(tfAnswers).length === 0)}
           onClick={handleCheck}
           className="mt-6 w-full md:w-auto bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
        >
          Kiểm tra đáp án
        </button>
      )}
    </div>
  );
};

// --- RENDER BÀI GIẢNG MARKDOWN DẠNG SÁCH LẬT (FLIPBOOK) ---
const InteractiveFlipbook = ({ content }: { content: string }) => {
  const pages = useMemo(() => {
     if (!content) return [];
     // Tách trang bằng ---
     return content.split(/(?:\r?\n|^)---(?:\r?\n|$)/).filter(p => p.trim() !== '');
  }, [content]);

  const [currentPage, setCurrentPage] = useState(0);
  const [passedQuizzes, setPassedQuizzes] = useState<Record<string, boolean>>({});

  // Reset khi nội dung thay đổi
  useEffect(() => {
    setCurrentPage(0);
    setPassedQuizzes({});
  }, [content]);

  const currentPageContent = pages[currentPage] || '';

  // Parse trang hiện tại thành các khối (md và quiz)
  const parts = useMemo(() => {
     const res: any[] = [];
     const regex = /```quiz[ \t]*\r?\n([\s\S]*?)\r?\n```/g;
     let lastIndex = 0;
     let match;
     while ((match = regex.exec(currentPageContent)) !== null) {
        if (match.index > lastIndex) {
            res.push({ type: 'md', content: currentPageContent.substring(lastIndex, match.index) });
        }
        try {
           const data = JSON.parse(match[1].trim());
           res.push({ type: 'quiz', content: data, id: `quiz-${currentPage}-${res.length}` });
        } catch {
           res.push({ type: 'quiz_error' });
        }
        lastIndex = match.index + match[0].length;
     }
     if (lastIndex < currentPageContent.length) {
         res.push({ type: 'md', content: currentPageContent.substring(lastIndex) });
     }
     return res;
  }, [currentPageContent, currentPage]);

  const quizzesOnPage = parts.filter(p => p.type === 'quiz');
  const allQuizzesPassed = quizzesOnPage.length === 0 || quizzesOnPage.every(q => passedQuizzes[q.id]);

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
       setCurrentPage(prev => prev + 1);
       window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
       setCurrentPage(prev => prev - 1);
       window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (pages.length === 0) return null;

  return (
    <div className="flex flex-col min-h-[50vh] bg-white rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(203,213,225,0.4)] border-2 border-slate-200 p-6 sm:p-10 md:p-14">
      <div className="flex-1">
        {parts.map((p, idx) => {
           if (p.type === 'md') {
               return (
                 <div key={`md-${currentPage}-${idx}`} className="prose prose-lg prose-indigo max-w-none text-slate-800 leading-relaxed font-medium
                    prose-h1:text-4xl prose-h1:font-black prose-h1:text-slate-800 prose-h1:mb-10 prose-h1:text-center prose-h1:tracking-tight
                    prose-h2:text-[1.4rem] prose-h2:font-black prose-h2:text-blue-900 prose-h2:bg-blue-50/80 prose-h2:px-5 prose-h2:py-3 prose-h2:rounded-xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:uppercase prose-h2:tracking-wide prose-h2:border-l-[6px] prose-h2:border-blue-600 prose-h2:shadow-sm
                    prose-h3:text-[1.15rem] prose-h3:font-bold prose-h3:text-emerald-900 prose-h3:bg-emerald-50/80 prose-h3:px-4 prose-h3:py-2.5 prose-h3:rounded-lg prose-h3:mt-8 prose-h3:mb-4 prose-h3:border-l-[5px] prose-h3:border-emerald-500
                    prose-p:mb-6 prose-p:text-[1.05rem] prose-p:leading-8
                    prose-li:mb-3 prose-ul:list-none prose-ul:pl-0 [&_ul>li]:relative [&_ul>li]:pl-7 [&_ul>li::before]:content-[''] [&_ul>li::before]:absolute [&_ul>li::before]:w-2.5 [&_ul>li::before]:h-2.5 [&_ul>li::before]:bg-[#00529b] [&_ul>li::before]:rounded-full [&_ul>li::before]:left-0 [&_ul>li::before]:top-2.5 [&_ul>li::before]:shadow-sm
                    [&_code]:bg-amber-100 [&_code]:text-amber-800 [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded-lg [&_code]:border [&_code]:border-amber-200 [&_code]:font-bold [&_code]:text-[0.9em]
                    [&_blockquote]:border-2 [&_blockquote]:border-dashed [&_blockquote]:border-emerald-400 [&_blockquote]:bg-emerald-50/40 [&_blockquote]:text-emerald-950 [&_blockquote]:px-6 [&_blockquote]:py-5 [&_blockquote]:rounded-[2rem] [&_blockquote]:shadow-sm [&_blockquote]:my-8 [&_blockquote_p]:m-0 [&_blockquote_p]:font-bold [&_blockquote_p]:leading-relaxed
                 ">
                   <ReactMarkdown 
                      remarkPlugins={[remarkMath, remarkBreaks]} 
                      rehypePlugins={[rehypeKatex]}
                      components={{
                         strong: ({node, children, ...props}) => {
                            const text = String(children);
                            if (text.toLowerCase().includes("hướng dẫn giải") || text.toLowerCase().includes("phương pháp giải")) {
                               return (
                                  <span className="block mt-10 mb-4 not-prose w-full">
                                     <span className="bg-blue-50 text-blue-800 px-5 py-3 rounded-t-2xl border-b-2 border-emerald-400 font-bold flex items-center gap-3 w-max max-w-full">
                                        <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-lg">💡</span>
                                        PHƯƠNG PHÁP GIẢI
                                     </span>
                                     <span className="bg-white border-l-4 border-emerald-500 p-4 rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-100 flex items-center gap-2 mb-2 w-full">
                                        <span className="text-emerald-700 font-bold text-sm uppercase flex items-center gap-2">
                                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                           CÁC BƯỚC THỰC HIỆN
                                        </span>
                                     </span>
                                  </span>
                               );
                            }
                            return <strong {...props} className="text-slate-900 font-bold">{children}</strong>;
                         }
                      }}
                   >
                     {p.content.replace(/^(?:\*\*)?Hướng\s+dẫn\s+giải:?(?:\*\*)?\s*/gim, '### 💡 Hướng dẫn giải chi tiết:\n\n')}
                   </ReactMarkdown>
                 </div>
               );
           } else if (p.type === 'quiz') {
               const isPassed = !!passedQuizzes[p.id];
               return (
                  <div key={p.id} className="relative mt-8 mb-4">
                    <InteractiveQuiz data={p.content} onPass={() => setPassedQuizzes(prev => ({ ...prev, [p.id]: true }))} />
                    {isPassed && (
                       <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1 animate-in fade-in zoom-in">
                          <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                       </div>
                    )}
                  </div>
               );
           } else {
               return <div key={idx} className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 my-4">Lỗi: Cấu trúc câu hỏi Quiz từ AI không hợp lệ.</div>;
           }
        })}
      </div>

      {pages.length > 1 && (
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
           <button 
             onClick={handlePrev} 
             disabled={currentPage === 0}
             className="px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 w-full sm:w-auto justify-center
               disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95"
           >
             <ArrowLeft className="w-5 h-5" /> Trang trước
           </button>
           
           <div className="font-medium text-gray-500 order-first sm:order-none">
             Trang <span className="text-indigo-600 font-bold">{currentPage + 1}</span> / {pages.length}
           </div>

           <div className="flex flex-col items-center w-full sm:w-auto gap-2">
             <button 
               onClick={handleNext} 
               disabled={currentPage === pages.length - 1 || !allQuizzesPassed}
               className="px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 w-full sm:w-auto justify-center
                 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md hover:shadow-lg"
             >
               Trang sau <ArrowRight className="w-5 h-5" />
             </button>
             {!allQuizzesPassed && currentPage !== pages.length - 1 && (
                <span className="text-[11px] text-orange-600 font-medium text-center">
                   *Cần trả lời đúng các câu hỏi ở trên để đi tiếp
                </span>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

// --- TRANG CHÍNH ---
export default function StudentLessonPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
      const { data: modulesData } = await supabase.from('lesson_modules').select('*').eq('lesson_id', lessonId).order('order_index', { ascending: true });
      
      if (lessonData) {
        setLesson({ ...lessonData, modules: modulesData || [] });
        if (modulesData && modulesData.length > 0) {
          setActiveModuleId(modulesData[0].id);
        }
      }
      setLoading(false);
    }
    load();
  }, [lessonId, supabase]);

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  if (!lesson) return <div className="p-8 text-center text-red-500 bg-gray-50 h-screen">Không tìm thấy bài giảng.</div>;

  const activeModule = lesson.modules?.find((m: any) => m.id === activeModuleId);
  const isPracticeModule = activeModule?.title.toLowerCase().includes('luyện tập') || activeModule?.title.toLowerCase().includes('kiểm tra');
  const isDocumentModule = activeModule?.title.toLowerCase().includes('tài liệu tham khảo');
  const isVideoModule = activeModule?.title.toLowerCase().includes('video');
  const containerClass = isPracticeModule ? "max-w-7xl" : "max-w-4xl";

  return (
    <div className="w-full flex-1 h-screen overflow-y-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
         <div className={`${containerClass} mx-auto px-4 py-4 flex items-center gap-4 transition-all duration-500`}>
            <Link href="/student/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><ArrowLeft className="w-5 h-5"/></Link>
            <h1 className="font-extrabold text-xl text-gray-800 line-clamp-1">{lesson.title}</h1>
         </div>
      </div>

      {/* TABS */}
      {lesson.modules && lesson.modules.length > 0 && (
        <div className="bg-white border-b border-gray-200 sticky top-[69px] z-40 overflow-x-auto no-scrollbar shadow-sm">
          <div className={`${containerClass} mx-auto px-4 flex items-center gap-2 py-3 transition-all duration-500`}>
             {lesson.modules.map((mod: any) => (
               <button
                 key={mod.id}
                 onClick={() => setActiveModuleId(mod.id)}
                 className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${activeModuleId === mod.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               >
                 {mod.title}
               </button>
             ))}
          </div>
        </div>
      )}

      {/* NỘI DUNG CHÍNH */}
      <div className={`${containerClass} mx-auto px-4 py-10 transition-all duration-500`}>
         {/* Chỉ render content_markdown của lesson nếu KHÔNG có module nào (để hỗ trợ bài giảng cũ) */}
         {(!lesson.modules || lesson.modules.length === 0) && lesson.content_markdown && (
           <InteractiveFlipbook content={lesson.content_markdown} />
         )}
         
         {/* Render Active Module */}
         {activeModule && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center gap-2 mb-8">
                 <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                 <h2 className="text-2xl font-bold text-gray-800">{activeModule.title}</h2>
               </div>
               {isVideoModule ? (
                  <VideoListUI content={activeModule.content_markdown || ""} />
               ) : isDocumentModule ? (
                  <DocumentDownloadUI content={activeModule.content_markdown || ""} />
               ) : isPracticeModule ? (
                  <AzotaExamUI content={activeModule.content_markdown || ""} title={activeModule.title} lessonId={lesson.id} moduleId={activeModule.id} />
               ) : (
                  <InteractiveFlipbook content={activeModule.content_markdown || ""} />
               )}
            </div>
         )}

         <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            {lesson.modules && lesson.modules.length > 0 ? (
               <>
                 <p className="text-gray-500 font-medium">Bạn đã hoàn thành phần <span className="font-bold text-gray-700">"{activeModule?.title}"</span></p>
                 <div className="flex gap-3">
                   {/* Next module button logic can be added here if needed */}
                   <Link href="/student/dashboard" className="bg-indigo-100 text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-200 transition-colors shadow-sm">
                      Quay lại Dashboard
                   </Link>
                 </div>
               </>
            ) : (
               <>
                 <p className="text-gray-500 font-medium">Bạn đã đọc xong bài giảng này.</p>
                 <Link href="/student/dashboard" className="bg-indigo-100 text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-200 transition-colors shadow-sm">
                    Quay lại Dashboard
                 </Link>
               </>
            )}
         </div>
      </div>
    </div>
  );
}
