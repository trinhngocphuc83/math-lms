"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---
const calculateTrueFalseScore = (userAnswers: Record<string, boolean>, correctOptions: any[]) => {
  let correctCount = 0;
  correctOptions.forEach((opt: any) => {
    if (userAnswers[opt.id] !== undefined && userAnswers[opt.id] === opt.isTrue) {
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
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean>>({}); // Cho true_false_cluster
  const [isChecked, setIsChecked] = useState(false);

  const type = data.type || 'multiple_choice';

  const handleCheck = () => {
    setIsChecked(true);
    if (type === 'multiple_choice') {
      if (selectedOpt === data.answerIndex) onPass();
    } else if (type === 'true_false_cluster') {
      const score = calculateTrueFalseScore(tfAnswers, data.options || []);
      // Tuỳ logic: Nếu > 0 là pass, hoặc phải 1.0 mới pass
      if (score > 0) onPass();
    }
  };

  const getTfColor = (optId: string, isCorrectVal: boolean) => {
    if (!isChecked) {
      return tfAnswers[optId] !== undefined ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:bg-gray-50";
    }
    const opt = (data.options || []).find((o:any) => o.id === optId);
    if (!opt) return "border-gray-200 opacity-50";
    
    // Nếu chưa chọn
    if (tfAnswers[optId] === undefined) return "border-gray-200 opacity-50";
    
    // Nếu chọn đúng
    if (tfAnswers[optId] === opt.isTrue) return "border-green-500 bg-green-50";
    return "border-red-500 bg-red-50";
  };

  return (
    <div className="my-6 bg-white border-2 border-indigo-100 rounded-2xl p-5 md:p-8 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-start gap-2">
         <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded text-sm shrink-0">Câu hỏi</span> 
         <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{data.question}</ReactMarkdown>
      </h3>

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
                  className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3
                     ${isSelected && !isChecked ? 'border-indigo-500 bg-indigo-50 shadow-md transform -translate-y-0.5' : ''}
                     ${!isSelected && !isChecked ? 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50' : ''}
                     ${isCorrect ? 'border-green-500 bg-green-50' : ''}
                     ${isWrong ? 'border-red-500 bg-red-50' : ''}
                     ${isChecked && !isCorrect && !isWrong ? 'border-gray-200 opacity-50' : ''}
                  `}
               >
                  <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-xs
                     ${isSelected && !isChecked ? 'border-indigo-500 bg-indigo-500 text-white' : ''}
                     ${!isSelected && !isChecked ? 'border-gray-300 text-gray-400' : ''}
                     ${isCorrect ? 'border-green-500 bg-green-500 text-white' : ''}
                     ${isWrong ? 'border-red-500 bg-red-500 text-white' : ''}
                  `}>
                     {['A','B','C','D'][idx]}
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700">
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
            {(data.options || []).map((opt: any, idx: number) => {
               const st = getTfColor(opt.id, opt.isTrue);
               return (
                  <div key={idx} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 ${st}`}>
                     <div className="flex items-start gap-3">
                        <div className="font-bold text-gray-500 w-6">{(opt.id || ['a','b','c','d'][idx]).toUpperCase()}.</div>
                        <div className="prose prose-sm max-w-none text-gray-700">
                           <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt.content}</ReactMarkdown>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                        <button 
                           disabled={isChecked}
                           onClick={() => setTfAnswers(prev => ({...prev, [opt.id]: true}))}
                           className={`px-4 py-2 font-bold rounded-lg text-sm border-2 transition-colors ${tfAnswers[opt.id] === true ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 disabled:opacity-50'}`}
                        >
                           ĐÚNG
                        </button>
                        <button 
                           disabled={isChecked}
                           onClick={() => setTfAnswers(prev => ({...prev, [opt.id]: false}))}
                           className={`px-4 py-2 font-bold rounded-lg text-sm border-2 transition-colors ${tfAnswers[opt.id] === false ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 disabled:opacity-50'}`}
                        >
                           SAI
                        </button>
                     </div>
                  </div>
               )
            })}
         </div>
      )}

      {isChecked && type === 'multiple_choice' && (
         <div className={`mt-5 p-4 rounded-xl flex items-start gap-3 ${selectedOpt === data.answerIndex ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {selectedOpt === data.answerIndex ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <div>
               <p className="font-bold">{selectedOpt === data.answerIndex ? 'Tuyệt vời! Bạn đã trả lời chính xác.' : 'Chưa đúng rồi! Hãy cố gắng ở câu tiếp theo nhé.'}</p>
            </div>
         </div>
      )}

      {isChecked && type === 'true_false_cluster' && (() => {
         const score = calculateTrueFalseScore(tfAnswers, data.options || []);
         let color = score === 1.0 ? 'bg-green-50 text-green-800 border-green-200' : (score > 0 ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-red-50 text-red-800 border-red-200');
         return (
            <div className={`mt-5 p-4 rounded-xl border flex flex-col gap-1 ${color}`}>
               <p className="font-bold flex items-center gap-2">
                  {score === 1.0 ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                  Kết quả chấm điểm: {score} điểm
               </p>
               <p className="text-sm opacity-80">
                  (Khớp {score === 0.1 ? 1 : score === 0.25 ? 2 : score === 0.5 ? 3 : score === 1.0 ? 4 : 0}/4 mệnh đề)
               </p>
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

// --- RENDER BÀI GIẢNG MARKDOWN ---
const RenderSmartMarkdown = ({ content }: { content: string }) => {
  const parts = useMemo(() => {
     if (!content) return [];
     const res = [];
     const regex = /```quiz\n([\s\S]*?)\n```/g;
     let lastIndex = 0;
     let match;
     while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            res.push({ type: 'md', content: content.substring(lastIndex, match.index) });
        }
        try {
           const data = JSON.parse(match[1].trim());
           res.push({ type: 'quiz', content: data });
        } catch(e) {
           res.push({ type: 'quiz_error' });
        }
        lastIndex = match.index + match[0].length;
     }
     if (lastIndex < content.length) {
         res.push({ type: 'md', content: content.substring(lastIndex) });
     }
     return res;
  }, [content]);

  return (
    <>
      {parts.map((p, idx) => {
         if (p.type === 'md') {
             return (
               <div key={idx} className="prose prose-lg prose-indigo max-w-none text-gray-700 leading-relaxed 
                  prose-h1:text-3xl prose-h1:font-extrabold prose-h1:text-indigo-900 prose-h1:mb-6
                  prose-h2:text-2xl prose-h2:font-bold prose-h2:text-indigo-800 prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-700
                  prose-p:mb-6 prose-li:mb-2
                  [&_code]:bg-indigo-50 [&_code]:text-indigo-600 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em]
                  [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-indigo-50 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:rounded-r-lg [&_blockquote]:italic [&_blockquote]:not-italic [&_blockquote_p]:m-0
               ">
                 <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{p.content}</ReactMarkdown>
               </div>
             );
         } else if (p.type === 'quiz') {
             return <InteractiveQuiz key={idx} data={p.content} onPass={() => {}} />
         } else {
             return <div key={idx} className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 my-4">Lỗi: Cấu trúc câu hỏi Quiz từ AI không hợp lệ. Vui lòng báo cáo giáo viên.</div>
         }
      })}
    </>
  );
};

// --- TRANG CHÍNH ---
export default function StudentLessonPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
      if (data) setLesson(data);
      setLoading(false);
    }
    load();
  }, [lessonId, supabase]);

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  if (!lesson) return <div className="p-8 text-center text-red-500 bg-gray-50 h-screen">Không tìm thấy bài giảng.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
         <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href={`/student/dashboard`} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><ArrowLeft className="w-5 h-5"/></Link>
            <h1 className="font-extrabold text-xl text-gray-800 line-clamp-1">{lesson.title}</h1>
         </div>
      </div>

      {/* NỘI DUNG CHÍNH (Đã loại bỏ slide, cuộn trang thẳng) */}
      <div className="max-w-3xl mx-auto px-4 py-10">
         {/* BÀI GIẢNG */}
         <RenderSmartMarkdown content={lesson.content_markdown || ""} />
         
         <div className="mt-16 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-500 mb-6">Bạn đã đọc xong bài giảng này. Nếu muốn bạn có thể quay lại trang chủ.</p>
            <Link href="/student/dashboard" className="inline-block bg-indigo-100 text-indigo-700 font-bold px-6 py-3 rounded-full hover:bg-indigo-200 transition-colors">
               Quay lại Dashboard
            </Link>
         </div>
      </div>
    </div>
  );
}
