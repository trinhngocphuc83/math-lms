"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lightbulb, ListOrdered, Pin, CheckCircle2, RotateCcw } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";

export default function ReviewSubmissionPage() {
  const params = useParams<{ id: string, submission_id: string }>();
  
  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/student/exams/${params.id}/review/${params.submission_id}`);
      const data = await res.json();
      if (res.ok) {
        setSubmission(data.submission);
        setExam(data.exam);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Đang tải Lời giải chi tiết...</div>;
  if (!submission || !exam) return <div className="p-10 text-center text-red-500">Bài làm không tồn tại.</div>;

  const examData = exam.exam_data || [];
  const answers = submission.answers || {};

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href={`/student/online-exams/${params.id}`} className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-1 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Trở về
            </Link>
            <h1 className="text-2xl font-black text-slate-800">Lời Giải Chi Tiết</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng điểm</p>
              <div className="text-3xl font-black text-indigo-600">{submission.score} <span className="text-lg text-slate-300">/10</span></div>
            </div>
            <Link 
              href={`/student/online-exams/${params.id}`} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại ôn tập
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-6">
        {examData.map((q: any, idx: number) => {
           const stuAns = answers[idx];
           const scorePerQ = 10 / examData.length;
           let isCorrect = false;
           let earnedScore = 0;

           if (q.type === 'multiple_choice' && stuAns === q.answerIndex) { isCorrect = true; earnedScore = scorePerQ; }
           
           if (q.type === 'essay') {
              earnedScore = answers.gradedScores?.[idx] !== undefined ? answers.gradedScores[idx] : 0;
           }

           // Hiển thị nội dung HS chọn
           let displayAnswer: React.ReactNode = "Không có câu trả lời";
           if (q.type === 'multiple_choice' && stuAns !== undefined && stuAns !== null) {
              displayAnswer = <MathRenderer htmlContent={q.options[stuAns]} />;
           } else if (q.type === 'essay') {
              displayAnswer = <div dangerouslySetInnerHTML={{__html: stuAns || 'Không có'}} />;
           }

           return (
             <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex gap-4 md:gap-6 flex-col md:flex-row">
               
               {/* Câu hỏi & Bài làm */}
               <div className="flex-1 min-w-0">
                 <div className="flex gap-4 mb-4">
                    <div className="shrink-0 flex flex-col items-center gap-1">
                       <div className="bg-indigo-600 text-white font-black px-3 py-1 rounded-lg text-sm w-full text-center">Câu {idx + 1}</div>
                       <div className={`text-xs font-bold px-2 py-0.5 rounded border text-center w-full ${isCorrect || earnedScore > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>
                         {earnedScore.toFixed(2)}/{scorePerQ.toFixed(2)}
                       </div>
                    </div>
                    <div className="prose prose-slate max-w-none text-slate-800 font-medium">
                      <MathRenderer htmlContent={q.question} />
                    </div>
                 </div>

                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 md:ml-[72px]">
                   <div className="font-bold text-slate-600 mb-2 text-sm">Bài làm của bạn:</div>
                   <div className={`text-slate-700 ${!stuAns ? 'italic text-slate-400' : ''}`}>{displayAnswer}</div>
                 </div>

                 {/* Giải thích (Tái hiện thiết kế đẹp) */}
                 {(q.explanation || q.method || q.steps || q.hint) && (
                   <div className="md:ml-[72px] space-y-4">
                     
                     {/* Phương pháp giải */}
                     {(q.method || q.explanation) && (
                       <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-4">
                         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                           <Lightbulb className="w-4 h-4 text-blue-500"/>
                         </div>
                         <div>
                           <div className="font-bold text-blue-800 text-sm mb-1 uppercase tracking-wider">PHƯƠNG PHÁP GIẢI & LỜI GIẢI CHI TIẾT</div>
                           <div className="prose max-w-none text-blue-900/80 text-sm">
                             <MathRenderer htmlContent={q.method || q.explanation} />
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Các bước thực hiện */}
                     {q.steps && q.steps.length > 0 && (
                       <div className="border-l-4 border-emerald-500 bg-white rounded-r-xl border-y border-r border-slate-200 p-5 shadow-sm">
                          <div className="font-bold text-emerald-700 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                            <ListOrdered className="w-4 h-4"/> CÁC BƯỚC THỰC HIỆN
                          </div>
                          <div className="space-y-3">
                            {q.steps.map((step: string, sIdx: number) => (
                              <div key={sIdx} className="bg-slate-50 rounded-lg p-3 flex gap-3 items-center">
                                <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">{sIdx + 1}</div>
                                <div className="prose max-w-none text-sm text-slate-700">
                                  <MathRenderer htmlContent={step} />
                                </div>
                              </div>
                            ))}
                          </div>
                       </div>
                     )}

                     {/* Gợi mở */}
                     {q.hint && (
                       <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 relative mt-6">
                         <Pin className="w-6 h-6 text-rose-500 absolute -top-3 -right-2 rotate-45 drop-shadow-md" />
                         <div className="font-bold text-amber-700 text-sm mb-1 uppercase tracking-wider flex items-center gap-2">
                           <Lightbulb className="w-4 h-4"/> GỢI MỞ KIẾN THỨC
                         </div>
                         <div className="prose max-w-none text-amber-900/80 text-sm">
                           <MathRenderer htmlContent={q.hint} />
                         </div>
                       </div>
                     )}

                     {/* AI Feedback */}
                     {q.type === 'essay' && answers.aiFeedback?.[idx] && (
                       <div className="border-2 border-indigo-100 rounded-xl overflow-hidden mt-4">
                         <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                           <div className="flex items-center gap-2 font-bold text-indigo-700">
                             <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Kết quả chấm điểm AI
                           </div>
                           <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">AI Đã chấm</div>
                         </div>
                         <div className="p-4 bg-white prose max-w-none text-sm text-slate-700">
                           {answers.aiFeedback[idx]}
                         </div>
                       </div>
                     )}

                   </div>
                 )}
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
}
