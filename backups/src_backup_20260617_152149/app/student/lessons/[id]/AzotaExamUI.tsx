"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, AlertCircle, Send, ListTodo } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

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

export default function AzotaExamUI({ content, title }: { content: string, title: string }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  
  // Parse content into parts
  const { parts, totalQuizzes } = useMemo(() => {
     const res: any[] = [];
     const regex = /```quiz[ \t]*\r?\n([\s\S]*?)\r?\n```/g;
     let lastIndex = 0;
     let match;
     let qIndex = 0;
     
     while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
           const text = content.substring(lastIndex, match.index).trim();
           if (text) res.push({ type: 'md', content: text, id: `md-${lastIndex}` });
        }
        lastIndex = regex.lastIndex;
        try {
           const data = JSON.parse(match[1].trim());
           qIndex++;
           res.push({ type: 'quiz', content: data, id: `quiz-${qIndex}`, qIndex });
        } catch (e) {
           res.push({ type: 'error', content: "Lỗi: Cấu trúc câu hỏi Quiz từ AI không hợp lệ.", id: `err-${lastIndex}` });
        }
     }
     if (lastIndex < content.length) {
        const text = content.substring(lastIndex).trim();
        if (text) res.push({ type: 'md', content: text, id: `md-${lastIndex}` });
     }
     return { parts: res, totalQuizzes: qIndex };
  }, [content]);

  // check if a question is answered
  const isQuestionAnswered = (qIndex: number, type: string, data: any) => {
    const ans = answers[qIndex.toString()];
    if (type === 'multiple_choice') return ans !== undefined;
    if (type === 'true_false_cluster') {
       if (!ans) return false;
       const items = data.options || data.statements || [];
       return Object.keys(ans).length === items.length; // must answer all 4
    }
    return false;
  };

  const handleAnswerChange = (qIndex: number, type: string, value: any) => {
    if (isSubmitted) return;
    setAnswers(prev => {
      if (type === 'multiple_choice') {
        return { ...prev, [qIndex.toString()]: value };
      } else if (type === 'true_false_cluster') {
        const currentAns = prev[qIndex.toString()] || {};
        return { ...prev, [qIndex.toString()]: { ...currentAns, ...value } };
      }
      return prev;
    });
  };

  const handleSubmit = () => {
    if (window.confirm("Bạn có chắc chắn muốn nộp bài? Hệ thống sẽ tự động chấm điểm và hiển thị kết quả.")) {
      let currentScore = 0;
      let maxScore = 0;
      
      parts.forEach(p => {
        if (p.type === 'quiz') {
           const type = p.content.type || 'multiple_choice';
           const ans = answers[p.qIndex.toString()];
           
           if (type === 'multiple_choice') {
             maxScore += 1;
             if (ans === p.content.answerIndex) currentScore += 1;
           } else if (type === 'true_false_cluster') {
             maxScore += 1; // 1 point max for TF cluster in Barem 2025
             const items = p.content.options || p.content.statements || [];
             if (ans) {
               currentScore += calculateTrueFalseScore(ans, items);
             }
           }
        }
      });
      
      setScore(currentScore);
      setTotalScore(maxScore);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 relative">
      {/* Left side: Questions */}
      <div className="flex-1 space-y-8 pb-32">
        {isSubmitted && (
           <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-indigo-200 mb-8 flex flex-col md:flex-row items-center justify-between">
              <div>
                 <h2 className="text-2xl font-extrabold text-indigo-900 mb-2">Kết quả làm bài</h2>
                 <p className="text-gray-600 font-medium">Bạn đã hoàn thành phần thi: <span className="font-bold text-gray-800">{title}</span></p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center justify-center bg-indigo-50 border-4 border-indigo-100 rounded-full w-24 h-24 shrink-0">
                 <div className="text-center">
                    <div className="text-2xl font-black text-indigo-700 leading-none">{score}</div>
                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest border-t border-indigo-200 pt-1 mt-1">/ {totalScore}</div>
                 </div>
              </div>
           </div>
        )}

        {parts.map((p, idx) => {
          if (p.type === 'md') {
            return (
              <div key={p.id} className="prose prose-indigo max-w-none text-gray-700 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{p.content}</ReactMarkdown>
              </div>
            );
          } else if (p.type === 'quiz') {
            const data = p.content;
            const qIndex = p.qIndex;
            const type = data.type || 'multiple_choice';
            const userAns = answers[qIndex.toString()];
            const cleanQuestion = data.question ? data.question.replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '') : "";

            return (
              <div key={p.id} id={`question-${qIndex}`} className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all ${isSubmitted ? 'border-gray-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                 <div className="flex items-start gap-3 mb-6">
                    <div className="flex flex-col items-center shrink-0">
                       <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-sm mb-1 shadow-sm">Câu {qIndex}</span>
                    </div>
                    <div className="flex-1 min-w-0 prose prose-sm sm:prose-base prose-slate max-w-none prose-p:my-0 font-bold text-slate-800">
                       <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{cleanQuestion}</ReactMarkdown>
                    </div>
                 </div>

                 {type === 'multiple_choice' && (
                   <div className="flex flex-col gap-3 ml-0 md:ml-12">
                     {(data.options || []).map((opt: string, optIdx: number) => {
                        const isSelected = userAns === optIdx;
                        let btnClass = "border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50";
                        let circleClass = "border-slate-300 text-slate-500";
                        
                        if (!isSubmitted) {
                           if (isSelected) {
                              btnClass = "border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-500";
                              circleClass = "border-indigo-500 bg-indigo-500 text-white";
                           }
                        } else {
                           const isCorrectAns = data.answerIndex === optIdx;
                           if (isCorrectAns) {
                              btnClass = "border-green-500 bg-green-50 shadow-sm ring-1 ring-green-500";
                              circleClass = "border-green-500 bg-green-500 text-white";
                           } else if (isSelected && !isCorrectAns) {
                              btnClass = "border-red-500 bg-red-50";
                              circleClass = "border-red-500 bg-red-500 text-white";
                           } else {
                              btnClass = "border-slate-100 bg-white opacity-60";
                              circleClass = "border-slate-200 text-slate-400";
                           }
                        }

                        return (
                          <button
                             key={optIdx}
                             disabled={isSubmitted}
                             onClick={() => handleAnswerChange(qIndex, type, optIdx)}
                             className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${btnClass}`}
                          >
                             <div className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${circleClass}`}>
                                {['A','B','C','D'][optIdx]}
                             </div>
                             <div className="flex-1 min-w-0 prose prose-sm max-w-none text-slate-700 prose-p:my-0">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                             </div>
                          </button>
                        );
                     })}
                   </div>
                 )}

                 {type === 'true_false_cluster' && (
                    <div className="flex flex-col gap-4 ml-0 md:ml-12">
                       {(data.options || data.statements || []).map((stmt: any, optIdx: number) => {
                          const key = optIdx.toString();
                          const isUserTrue = userAns ? userAns[key] : undefined;
                          
                          let wrapperClass = "border-slate-200 bg-white";
                          if (!isSubmitted) {
                             if (isUserTrue !== undefined) wrapperClass = "border-indigo-300 bg-indigo-50/30";
                          } else {
                             if (isUserTrue === undefined) {
                                wrapperClass = "border-slate-200 bg-slate-50 opacity-60";
                             } else if (isUserTrue === stmt.isTrue) {
                                wrapperClass = "border-green-400 bg-green-50";
                             } else {
                                wrapperClass = "border-red-400 bg-red-50";
                             }
                          }

                          return (
                             <div key={optIdx} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border-2 transition-all gap-4 ${wrapperClass}`}>
                                <div className="flex items-start gap-3">
                                   <div className="font-bold text-slate-400 w-6 mt-0.5">{['A','B','C','D'][optIdx] || 'A'}.</div>
                                   <div className="flex-1 min-w-0 prose prose-sm max-w-none text-slate-700 prose-p:my-0">
                                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{stmt.content || stmt.text}</ReactMarkdown>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                                   {!isSubmitted ? (
                                      <>
                                         <button
                                            onClick={() => handleAnswerChange(qIndex, type, { [key]: true })}
                                            className={`px-4 py-2 font-bold rounded-lg text-sm border-2 transition-all ${isUserTrue === true ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'}`}
                                         >
                                            ĐÚNG
                                         </button>
                                         <button
                                            onClick={() => handleAnswerChange(qIndex, type, { [key]: false })}
                                            className={`px-4 py-2 font-bold rounded-lg text-sm border-2 transition-all ${isUserTrue === false ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'}`}
                                         >
                                            SAI
                                         </button>
                                      </>
                                   ) : (
                                      <div className="flex gap-2">
                                         {isUserTrue !== undefined && (
                                            <span className={`px-4 py-2 font-bold rounded-lg text-sm border-2 ${isUserTrue === stmt.isTrue ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                               Chọn: {isUserTrue ? 'ĐÚNG' : 'SAI'}
                                            </span>
                                         )}
                                         <span className="px-4 py-2 font-bold rounded-lg text-sm border-2 bg-slate-100 text-slate-700 border-slate-300">
                                            Đáp án: {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                                         </span>
                                      </div>
                                   )}
                                </div>
                             </div>
                          );
                       })}
                       
                       {isSubmitted && (() => {
                          const items = data.options || data.statements || [];
                          const sc = calculateTrueFalseScore(userAns || {}, items);
                          const isPerfect = sc === 1.0;
                          return (
                             <div className={`mt-2 p-4 rounded-xl border flex items-start gap-3 ${isPerfect ? 'bg-green-50 text-green-800 border-green-200' : (sc > 0 ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-red-50 text-red-800 border-red-200')}`}>
                                {isPerfect ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0"/> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0"/>}
                                <div className="flex-1">
                                   <p className="font-bold">Điểm câu này: {sc} điểm</p>
                                </div>
                             </div>
                          );
                       })()}
                    </div>
                 )}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Right side: Sidebar (Sticky) */}
      <div className="w-full md:w-72 shrink-0 relative">
        <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col max-h-[calc(100vh-120px)]">
           <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
             <ListTodo className="w-5 h-5 text-indigo-600" /> Tiến độ làm bài
           </h3>
           <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-4">
              <div className="grid grid-cols-5 gap-2">
                 {Array.from({ length: totalQuizzes }).map((_, i) => {
                    const qn = i + 1;
                    const p = parts.find(part => part.type === 'quiz' && part.qIndex === qn);
                    let isAnswered = false;
                    let isCorrect = false;
                    
                    if (p && p.type === 'quiz') {
                       isAnswered = isQuestionAnswered(qn, p.content.type || 'multiple_choice', p.content);
                       
                       if (isSubmitted) {
                          const ans = answers[qn.toString()];
                          const t = p.content.type || 'multiple_choice';
                          if (t === 'multiple_choice') {
                             isCorrect = ans === p.content.answerIndex;
                          } else if (t === 'true_false_cluster') {
                             const items = p.content.options || p.content.statements || [];
                             isCorrect = ans ? calculateTrueFalseScore(ans, items) === 1.0 : false;
                          }
                       }
                    }

                    let boxClass = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";
                    if (!isSubmitted) {
                       if (isAnswered) boxClass = "bg-indigo-600 border-indigo-600 text-white shadow-sm";
                    } else {
                       if (isCorrect) boxClass = "bg-green-500 border-green-500 text-white";
                       else boxClass = "bg-red-500 border-red-500 text-white";
                    }

                    return (
                       <button 
                         key={qn} 
                         onClick={() => {
                            const el = document.getElementById(`question-${qn}`);
                            if (el) {
                               const y = el.getBoundingClientRect().top + window.scrollY - 100;
                               window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                         }}
                         className={`aspect-square rounded-lg border-2 font-bold text-sm flex items-center justify-center transition-colors ${boxClass}`}
                       >
                         {qn}
                       </button>
                    );
                 })}
              </div>
           </div>
           
           {!isSubmitted && (
              <div className="mt-auto pt-4 border-t border-slate-100">
                 <button 
                    onClick={handleSubmit}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all flex justify-center items-center gap-2"
                 >
                    <Send className="w-5 h-5" /> NỘP BÀI
                 </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
