"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, User, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";

export default function GradeSubmissionPage() {
  const params = useParams<{ id: string, student_id: string }>();
  const router = useRouter();
  
  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lưu điểm lẻ cho từng câu tự luận do GV nhập
  const [manualScores, setManualScores] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch submission
      const res = await fetch(`/api/admin/exams/${params.id}/submissions/${params.student_id}`);
      const data = await res.json();
      if (res.ok && data.submission) {
        setSubmission(data.submission);
        setExam(data.exam);
        
        // Load điểm đã chấm cũ nếu có
        if (data.submission.answers?.gradedScores) {
          setManualScores(data.submission.answers.gradedScores);
        }
      } else {
        alert("Không tìm thấy bài nộp.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = () => {
    if (!exam || !submission) return 0;
    
    let total = 0;
    const examData = exam.exam_data || [];
    const answers = submission.answers || {};
    const scorePerQuestion = 10 / (examData.length || 1);

    examData.forEach((q: any, idx: number) => {
      // Trắc nghiệm
      if (q.type === 'multiple_choice' && answers[idx] === q.answerIndex) {
        total += scorePerQuestion;
      } 
      // Đúng sai
      else if (q.type === 'true_false' && answers[idx]) {
        let countTF = 0;
        for (let i = 0; i < 4; i++) {
          if (q.answers[i] === answers[idx][i]) countTF++;
        }
        total += (countTF / 4) * scorePerQuestion;
      }
      // Trả lời ngắn
      else if (q.type === 'short_answer' && answers[idx]) {
        const isMatch = q.correct_answers.some((ans: string) => 
           String(ans).trim().toLowerCase() === String(answers[idx]).trim().toLowerCase()
        );
        if (isMatch) total += scorePerQuestion;
      }
      // Tự luận: Lấy điểm manual GV nhập, nếu không có lấy điểm AI chấm
      else if (q.type === 'essay') {
         if (manualScores[idx] !== undefined) {
           total += Number(manualScores[idx]);
         } else if (answers.aiFeedback?.[idx]) {
           // Giả định AI feedback string không tự lưu điểm số dưới dạng parse được dễ dàng, nhưng AI có trả score = x trong logic API, API submit lưu totalScore. 
           // Vì ta chỉ hiển thị, nên nếu GV chưa nhập, tổng điểm sẽ lấy từ submission.score. Tuy nhiên ta đang tính lại real-time.
           // Để đơn giản, khi tính real-time ta dựa vào manualScores.
         }
      }
    });

    // Nếu GV chưa nhập điểm tự luận nào, giữ nguyên điểm do AI tính ban đầu
    if (Object.keys(manualScores).length === 0 && submission.score) {
      return submission.score;
    }

    return Math.round(total * 100) / 100;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newScore = calculateTotalScore();
      const updatedAnswers = {
        ...submission.answers,
        gradedScores: manualScores
      };

      const res = await fetch(`/api/admin/exams/${params.id}/submissions/${params.student_id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: newScore, answers: updatedAnswers })
      });

      if (res.ok) {
        alert("Lưu điểm thành công!");
        router.push(`/admin/online-exams/${params.id}/monitor`);
      } else {
        alert("Lỗi khi lưu điểm.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Đang tải dữ liệu bài làm...</div>;
  if (!submission) return <div className="p-10 text-center text-red-500">Bài làm không tồn tại.</div>;

  const examData = exam.exam_data || [];
  const currentTotal = calculateTotalScore();

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href={`/admin/online-exams/${params.id}/monitor`} className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-2 font-medium">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Chấm Bài Tự Luận
          </h1>
          <p className="text-slate-600 mt-2 font-medium text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500"/> {submission.profiles?.full_name || 'Học sinh Ẩn danh'} ({submission.profiles?.class_name || 'Không rõ lớp'})
          </p>
        </div>
        
        {/* Điểm tổng kết */}
        <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-indigo-100 flex items-center gap-6 sticky top-4 z-50">
          <div>
            <div className="text-sm font-bold text-slate-400 uppercase">TỔNG ĐIỂM (Cộng dồn)</div>
            <div className="text-4xl font-black text-indigo-600">{currentTotal} <span className="text-xl text-slate-300">/10</span></div>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
            LƯU ĐIỂM & HOÀN TẤT
          </button>
        </div>
      </div>

      {/* Danh sách Câu hỏi */}
      <div className="space-y-8">
        {examData.map((q: any, idx: number) => {
           const stuAns = submission.answers?.[idx];
           const aiFb = submission.answers?.aiFeedback?.[idx];
           const isEssay = q.type === 'essay';

           return (
             <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 text-lg">Câu {idx + 1} <span className="text-sm font-medium text-slate-500 ml-2">({isEssay ? 'Tự luận' : 'Trắc nghiệm'})</span></h3>
               </div>
               <div className="p-6">
                 {/* Câu hỏi */}
                 <div className="prose max-w-none text-slate-800 mb-6 font-medium">
                   <MathRenderer htmlContent={q.question} />
                 </div>

                 {/* Bài làm */}
                 <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 mb-6">
                   <div className="text-sm font-bold text-indigo-600 uppercase mb-2 flex items-center gap-2">Bài làm của học sinh</div>
                   {isEssay ? (
                     <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: stuAns || '<i>Không có bài làm</i>' }} />
                   ) : (
                     <div className="text-slate-700 font-bold">
                       {q.type === 'multiple_choice' && stuAns !== undefined && stuAns !== null ? (
                         <MathRenderer htmlContent={q.options[stuAns]} />
                       ) : (
                         JSON.stringify(stuAns)
                       )}
                     </div>
                   )}
                 </div>

                 {/* AI Feedback & Chấm điểm cho Tự luận */}
                 {isEssay && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                     <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                       <h4 className="font-bold text-amber-700 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4"/> AI Nhận Xét</h4>
                       <p className="text-sm text-amber-900">{aiFb || 'AI chưa chấm câu này'}</p>
                     </div>
                     <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 flex flex-col justify-center items-center">
                       <label className="font-bold text-emerald-800 mb-2">ĐIỂM CÂU NÀY (Giáo viên nhập):</label>
                       <input 
                         type="number" 
                         step="0.25"
                         min="0"
                         max={10 / examData.length}
                         value={manualScores[idx] !== undefined ? manualScores[idx] : ''}
                         onChange={(e) => setManualScores(prev => ({ ...prev, [idx]: parseFloat(e.target.value) }))}
                         placeholder={`Max: ${(10 / examData.length).toFixed(2)}`}
                         className="w-32 text-center text-2xl font-black text-emerald-700 px-4 py-2 border-2 border-emerald-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100"
                       />
                     </div>
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
