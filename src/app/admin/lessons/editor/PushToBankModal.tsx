"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from "@/utils/supabase/client";
import { X, UploadCloud, Loader2, Database, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface PushToBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: any[]; // The blocks from the editor
  courseContext: {
    grade: string;
    subject: string;
    topic: string; // chapter title
    lesson: string; // lesson title
  };
}

export default function PushToBankModal({ isOpen, onClose, blocks, courseContext }: PushToBankModalProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      // Parse blocks into questions
      const quizBlocks = blocks.filter(b => b.type === 'quiz' && b.content);
      const parsed = quizBlocks.map(b => {
        let question_type = "multiple_choice";
        if (b.content.type === 'true_false') question_type = "true_false";
        if (b.content.type === 'true_false_cluster') question_type = "true_false_cluster";
        if (b.content.type === 'short_answer') question_type = "short_answer";
        if (b.content.type === 'essay') question_type = "essay";

        let option_a = "", option_b = "", option_c = "", option_d = "";
        let correct_answer = "";

        if (question_type === "multiple_choice" || question_type === "true_false") {
            option_a = b.content.options?.[0] || "";
            option_b = b.content.options?.[1] || "";
            option_c = b.content.options?.[2] || "";
            option_d = b.content.options?.[3] || "";
            correct_answer = ['A','B','C','D'][b.content.answerIndex || 0];
        } else if (question_type === "short_answer") {
            correct_answer = b.content.answer || b.content.correctAnswer || "";
        } else if (question_type === "true_false_cluster") {
            const stmts = b.content.options || b.content.statements || [];
            option_a = stmts[0]?.content || stmts[0]?.text || "";
            option_b = stmts[1]?.content || stmts[1]?.text || "";
            option_c = stmts[2]?.content || stmts[2]?.text || "";
            option_d = stmts[3]?.content || stmts[3]?.text || "";
            correct_answer = stmts.map((s: any) => s.isCorrect || s.is_correct || s.correct ? "Đ" : "S").join("");
        } else if (question_type === "essay") {
            correct_answer = b.content.sampleAnswer || b.content.answer || "";
        }

        return {
          id: b.id, // temporary id for mapping
          grade: courseContext.grade || "",
          subject: courseContext.subject || "",
          topic: courseContext.topic || "",
          lesson: courseContext.lesson || "",
          math_form: "", // to be filled
          difficulty: "Vận dụng",
          question_type,
          content: b.content.question || "",
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation: b.content.explanation || "",
          image_url: b.content.imageUrl || "",
        };
      });
      setQuestions(parsed);
    }
  }, [isOpen, blocks, courseContext]);

  if (!isOpen) return null;

  const handleUpdate = (id: string, field: string, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateAllMathForm = (value: string) => {
    setQuestions(prev => prev.map(q => ({ ...q, math_form: value })));
  };

  const handlePushAll = async () => {
    if (questions.length === 0) return alert("Không có câu hỏi nào để đưa vào ngân hàng.");
    setIsPushing(true);
    try {
      const inserts = questions.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
        grade: q.grade,
        subject: q.subject,
        topic: q.topic,
        lesson: q.lesson,
        math_form: q.math_form,
        question_type: q.question_type,
        difficulty: q.difficulty,
        content: q.content,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        image_url: q.image_url,
        usage_count: 0
      }));

      // Gather new categories
      const newCats = inserts.filter(q => q.math_form).map(q => ({
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
      }));
      // Loại bỏ trùng lặp trong mảng newCats
      const uniqueNewCats = Array.from(new Set(newCats.map(c => JSON.stringify(c)))).map(s => JSON.parse(s as string));
      
      if (uniqueNewCats.length > 0) {
        await supabase.from('question_categories').insert(uniqueNewCats);
      }

      const { error } = await supabase.from('questions').insert(inserts);
      if (error) throw error;

      alert(`Đã đưa thành công ${inserts.length} câu vào Ngân hàng!`);
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi lưu: " + e.message);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/80 shrink-0">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-fuchsia-100 text-fuchsia-700 rounded-xl shadow-sm"><UploadCloud className="w-5 h-5"/></div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Đưa vào Ngân hàng</h3>
                <p className="text-xs text-gray-500 font-medium">Bạn chuẩn bị đưa {questions.length} câu hỏi vào ngân hàng dùng chung.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-xl border border-gray-200 hover:border-red-200 transition-colors shadow-sm"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col gap-6">
           <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex gap-3 text-sm shadow-sm">
             <Info className="w-5 h-5 shrink-0" />
             <div className="flex flex-col gap-1">
                 <p><strong>Bối cảnh tự động:</strong> Các câu hỏi sẽ được tự động gắn với <strong>Khóa học/Chương/Bài</strong> mà bạn đang soạn.</p>
                 <p><strong>Lớp:</strong> {courseContext.grade || '---'} | <strong>Môn:</strong> {courseContext.subject || '---'} | <strong>Chương:</strong> {courseContext.topic || '---'} | <strong>Bài:</strong> {courseContext.lesson || '---'}</p>
             </div>
           </div>
           
           {questions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-gray-400">
               <Database className="w-10 h-10 mb-2 opacity-50"/>
               <p>Không tìm thấy câu hỏi nào trong bài giảng này.</p>
             </div>
           ) : (
             <>
               <div className="flex items-center justify-end gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                   <span className="text-sm font-bold text-gray-600">Áp dụng chung:</span>
                   <input 
                      type="text" 
                      placeholder="Nhập Dạng bài chung cho tất cả..." 
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:border-fuchsia-500 focus:outline-none"
                      onChange={(e) => handleUpdateAllMathForm(e.target.value)}
                   />
               </div>
               {questions.map((q, idx) => (
                 <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap gap-4 items-center">
                      <span className="font-bold text-gray-600 text-sm">Câu {idx + 1}</span>
                      <span className="text-xs font-bold px-2 py-1 bg-gray-200 text-gray-700 rounded-md uppercase tracking-wider">{q.question_type}</span>
                      <div className="ml-auto flex flex-wrap items-center gap-4">
                         <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">ĐỘ KHÓ:</label>
                            <select value={q.difficulty} onChange={(e) => handleUpdate(q.id, 'difficulty', e.target.value)} className="text-sm border border-gray-300 rounded-lg p-1 focus:outline-none focus:border-fuchsia-500">
                               <option value="Nhận biết">Nhận biết</option>
                               <option value="Thông hiểu">Thông hiểu</option>
                               <option value="Vận dụng">Vận dụng</option>
                               <option value="Vận dụng cao">Vận dụng cao</option>
                            </select>
                         </div>
                         <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">DẠNG BÀI:</label>
                            <input type="text" placeholder="VD: Tìm GTLN..." value={q.math_form} onChange={(e) => handleUpdate(q.id, 'math_form', e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1 w-48 focus:outline-none focus:border-fuchsia-500"/>
                         </div>
                      </div>
                   </div>
                   <div className="p-4 prose prose-sm max-w-none prose-p:my-1 text-slate-800">
                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.content}</ReactMarkdown>
                     
                     {q.question_type === 'multiple_choice' && (
                       <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
                         <div className={q.correct_answer === 'A' ? 'text-teal-600 font-bold bg-teal-50 p-2 rounded border border-teal-100' : 'p-2'}>A. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_a}</ReactMarkdown></div>
                         <div className={q.correct_answer === 'B' ? 'text-teal-600 font-bold bg-teal-50 p-2 rounded border border-teal-100' : 'p-2'}>B. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_b}</ReactMarkdown></div>
                         <div className={q.correct_answer === 'C' ? 'text-teal-600 font-bold bg-teal-50 p-2 rounded border border-teal-100' : 'p-2'}>C. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_c}</ReactMarkdown></div>
                         <div className={q.correct_answer === 'D' ? 'text-teal-600 font-bold bg-teal-50 p-2 rounded border border-teal-100' : 'p-2'}>D. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_d}</ReactMarkdown></div>
                       </div>
                     )}
                     
                     {q.question_type === 'true_false_cluster' && (
                       <div className="mt-4 grid grid-cols-1 gap-2 text-sm font-medium">
                         <div className="p-2 border rounded border-gray-100">A. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_a}</ReactMarkdown> <span className="text-teal-600 font-bold ml-2">[{q.correct_answer[0] || '?'}]</span></div>
                         <div className="p-2 border rounded border-gray-100">B. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_b}</ReactMarkdown> <span className="text-teal-600 font-bold ml-2">[{q.correct_answer[1] || '?'}]</span></div>
                         <div className="p-2 border rounded border-gray-100">C. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_c}</ReactMarkdown> <span className="text-teal-600 font-bold ml-2">[{q.correct_answer[2] || '?'}]</span></div>
                         <div className="p-2 border rounded border-gray-100">D. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_d}</ReactMarkdown> <span className="text-teal-600 font-bold ml-2">[{q.correct_answer[3] || '?'}]</span></div>
                       </div>
                     )}

                     {q.question_type === 'short_answer' && (
                        <div className="mt-4 text-sm font-medium p-3 bg-teal-50 text-teal-800 rounded border border-teal-100">
                          Đáp án: <strong>{q.correct_answer}</strong>
                        </div>
                     )}
                   </div>
                 </div>
               ))}
             </>
           )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shrink-0 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Đóng</button>
           <button onClick={handlePushAll} disabled={isPushing || questions.length === 0} className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
             {isPushing ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>} 
             Đồng ý đưa {questions.length} câu vào Ngân hàng
           </button>
        </div>
      </div>
    </div>
  );
}
