"use client";

import { useEffect, useState, useMemo } from "react";
import { CheckCircle2, AlertCircle, Send, ListTodo, UploadCloud, X, Lightbulb, ListOrdered, Pin, Bot, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

// Hàm tính điểm câu Đúng/Sai theo Barem 2025
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

// Hàm chuẩn hóa chuỗi đáp án để so sánh trả lời ngắn
const normalizeAnswer = (s: string) => {
  return s.trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.')
    .replace(/\$/g, '')
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '$1/$2');
};

// Hàm xác định dạng bài và tỉ lệ điểm
const getScoreDistribution = (typeCounts: Record<string, number>) => {
  const hasMC = (typeCounts['multiple_choice'] || 0) > 0;
  const hasTF = (typeCounts['true_false_cluster'] || 0) > 0;
  const hasSA = (typeCounts['short_answer'] || 0) > 0;
  const hasEssay = (typeCounts['essay'] || 0) > 0;

  // Dạng 5: TN + ĐS + TL ngắn + TL (3:2:2:3)
  if (hasMC && hasTF && hasSA && hasEssay) {
    return { multiple_choice: 3, true_false_cluster: 2, short_answer: 2, essay: 3 };
  }
  // Dạng 4: TN + ĐS + TL ngắn (3:4:3)
  if (hasMC && hasTF && hasSA && !hasEssay) {
    return { multiple_choice: 3, true_false_cluster: 4, short_answer: 3, essay: 0 };
  }
  // Dạng 3: TN + TL (4:6)
  if (hasMC && hasEssay && !hasTF && !hasSA) {
    return { multiple_choice: 4, true_false_cluster: 0, short_answer: 0, essay: 6 };
  }
  // Dạng 2: Full TN (10 điểm)
  if (hasMC && !hasTF && !hasSA && !hasEssay) {
    return { multiple_choice: 10, true_false_cluster: 0, short_answer: 0, essay: 0 };
  }
  // Dạng 1: Full TL (10 điểm)
  if (hasEssay && !hasMC && !hasTF && !hasSA) {
    return { multiple_choice: 0, true_false_cluster: 0, short_answer: 0, essay: 10 };
  }

  // Fallback: Chia đều cho các loại có mặt
  const activeTypes = [hasMC, hasTF, hasSA, hasEssay].filter(Boolean).length;
  const eachShare = activeTypes > 0 ? 10 / activeTypes : 10;
  return {
    multiple_choice: hasMC ? eachShare : 0,
    true_false_cluster: hasTF ? eachShare : 0,
    short_answer: hasSA ? eachShare : 0,
    essay: hasEssay ? eachShare : 0,
  };
};

export default function AzotaExamUI({ content, title, lessonId, moduleId }: { content: string, title: string, lessonId?: string, moduleId?: string }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(10);
  const [gradingStatus, setGradingStatus] = useState<Record<string, { isGrading: boolean; result?: any }>>({});
  const [isGradingAll, setIsGradingAll] = useState(false);
  // Lưu điểm từng câu sau khi chấm
  const [questionScores, setQuestionScores] = useState<Record<string, { earned: number; max: number }>>({});
  
  // Chống gian lận
  const [cheatWarnings, setCheatWarnings] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitted) {
        setCheatWarnings(prev => prev + 1);
        alert("CẢNH BÁO GIAN LẬN: Bạn vừa rời khỏi màn hình làm bài! Hệ thống đã ghi nhận.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSubmitted]);
  
  // Parse content thành các phần (markdown + quiz)
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

  // Xác định loại câu hỏi thực sự (xử lý essay ngầm)
  const getQuestionType = (data: any): string => {
    const type = data.type || 'multiple_choice';
    if (type === 'essay') return 'essay';
    if (type === 'short_answer') return 'short_answer';
    if (type === 'true_false_cluster') return 'true_false_cluster';
    // MC không có options → coi là essay
    if (type === 'multiple_choice' && (!data.options || data.options.length === 0)) return 'essay';
    return 'multiple_choice';
  };

  // Kiểm tra câu đã trả lời chưa
  const isQuestionAnswered = (qIndex: number, type: string, data: any) => {
    const ans = answers[qIndex.toString()];
    const realType = getQuestionType(data);
    
    if (realType === 'essay') {
       return ans && (ans.text?.trim() || ans.image);
    }
    if (realType === 'short_answer') return ans !== undefined && ans !== '';
    if (realType === 'multiple_choice') return ans !== undefined;
    if (realType === 'true_false_cluster') {
       if (!ans) return false;
       const items = data.options || data.statements || [];
       return Object.keys(ans).length === items.length;
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
      } else if (type === 'essay') {
        return { ...prev, [qIndex.toString()]: value };
      } else if (type === 'short_answer') {
        return { ...prev, [qIndex.toString()]: value };
      }
      return prev;
    });
  };

  // Chấm 1 câu tự luận bằng AI (dùng cho nút chấm riêng lẻ và chấm hàng loạt)
  const gradeOneEssay = async (qIndex: number, data: any, maxScoreForQ: number) => {
    const userAns = answers[qIndex.toString()];
    if (!userAns || (!userAns.text && !userAns.image)) {
      return { scoreNumber: 0, passed: false, feedback: "Học sinh không nộp bài.", score: `0/${maxScoreForQ.toFixed(2)}` };
    }

    const sampleAnswer = data.answer || (data.phuong_phap_giai
      ? `PP Giải: ${data.phuong_phap_giai}\nCác bước: ${(data.cac_buoc_thuc_hien || []).join('\n')}`
      : '');

    const response = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: data.question,
        sampleAnswer,
        image: userAns.image,
        textAnswer: userAns.text,
        serverId: 1,
        maxScore: maxScoreForQ
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Có lỗi xảy ra');
    return result;
  };

  const recalculateAndSaveScore = async (newScores: Record<string, { earned: number; max: number }>) => {
    let total = 0;
    Object.values(newScores).forEach(s => total += s.earned);
    const finalScore = Math.round(total * 100) / 100;
    setScore(finalScore);
    
    if (lessonId) {
      fetch('/api/student/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, moduleId, score: finalScore, passed: finalScore >= 7, cheatWarnings })
      }).catch(e => console.error("Error saving score:", e));
    }
  };

  // Nút chấm riêng 1 câu essay
  const handleGradeEssay = async (qIndex: number, data: any) => {
    const userAns = answers[qIndex.toString()];
    if (!userAns || (!userAns.text && !userAns.image)) {
      alert("Bạn chưa nhập câu trả lời hoặc đính kèm ảnh!");
      return;
    }

    setGradingStatus(prev => ({ ...prev, [qIndex]: { ...prev[qIndex], isGrading: true } }));

    try {
      const maxScoreForQ = questionScores[qIndex]?.max || 10;
      const result = await gradeOneEssay(qIndex, data, maxScoreForQ);
      setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result } }));
      
      const earned = typeof result.scoreNumber === 'number' ? Math.min(result.scoreNumber, maxScoreForQ) : 0;
      setQuestionScores(prev => {
        const newScores = { ...prev, [qIndex]: { earned, max: maxScoreForQ } };
        recalculateAndSaveScore(newScores);
        return newScores;
      });
    } catch (error: any) {
      alert("Lỗi chấm bài: " + error.message);
      setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result: { error: error.message, scoreNumber: 0, passed: false, feedback: `Lỗi hệ thống: ${error.message}` } } }));
    }
  };

  // === LOGIC CHẤM TOÀN BÀI THANG 10 ===
  const handleSubmit = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn nộp bài? Hệ thống sẽ tự động chấm điểm toàn bài trên thang điểm 10.")) return;
    
    setIsGradingAll(true);

    // 1. Đếm câu theo loại
    const typeCounts: Record<string, number> = {};
    const quizParts = parts.filter(p => p.type === 'quiz');
    quizParts.forEach(p => {
      const realType = getQuestionType(p.content);
      typeCounts[realType] = (typeCounts[realType] || 0) + 1;
    });

    // 2. Tính tỉ lệ điểm
    const distribution = getScoreDistribution(typeCounts);

    // 3. Tính điểm mỗi câu
    const perQuestionMax: Record<string, number> = {};
    quizParts.forEach(p => {
      const realType = getQuestionType(p.content);
      const groupTotal = distribution[realType as keyof typeof distribution] || 0;
      const count = typeCounts[realType] || 1;
      perQuestionMax[p.qIndex] = groupTotal / count;
    });

    // 4. Chấm các câu MC, TF, SA ngay lập tức
    let immediateScore = 0;
    const newQuestionScores: Record<string, { earned: number; max: number }> = {};
    const essayTasks: { qIndex: number; data: any; maxScore: number }[] = [];

    quizParts.forEach(p => {
      const data = p.content;
      const qIndex = p.qIndex;
      const realType = getQuestionType(data);
      const maxScoreQ = perQuestionMax[qIndex] || 0;
      const ans = answers[qIndex.toString()];

      if (realType === 'multiple_choice') {
        const isCorrect = ans === data.answerIndex;
        const earned = isCorrect ? maxScoreQ : 0;
        immediateScore += earned;
        newQuestionScores[qIndex] = { earned, max: maxScoreQ };
      } else if (realType === 'true_false_cluster') {
        const items = data.options || data.statements || [];
        const ratio = ans ? calculateTrueFalseScore(ans, items) : 0;
        const earned = ratio * maxScoreQ;
        immediateScore += earned;
        newQuestionScores[qIndex] = { earned, max: maxScoreQ };
      } else if (realType === 'short_answer') {
        const correctAns = data.correctAnswer || '';
        const isCorrect = normalizeAnswer(String(ans || '')) === normalizeAnswer(correctAns);
        const earned = isCorrect ? maxScoreQ : 0;
        immediateScore += earned;
        newQuestionScores[qIndex] = { earned, max: maxScoreQ };
      } else if (realType === 'essay') {
        // Đánh dấu để chấm AI sau
        newQuestionScores[qIndex] = { earned: 0, max: maxScoreQ };
        essayTasks.push({ qIndex, data, maxScore: maxScoreQ });
      }
    });

    setQuestionScores(newQuestionScores);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 5. Chấm essay song song bằng AI
    if (essayTasks.length > 0) {
      // Đánh dấu tất cả essay đang chấm
      const gradingInit: Record<string, { isGrading: boolean; result?: any }> = {};
      essayTasks.forEach(t => { gradingInit[t.qIndex] = { isGrading: true }; });
      setGradingStatus(prev => ({ ...prev, ...gradingInit }));

      let essayTotalScore = 0;

      // Gọi API song song
      const results = await Promise.allSettled(
        essayTasks.map(async (task) => {
          try {
            const result = await gradeOneEssay(task.qIndex, task.data, task.maxScore);
            return { qIndex: task.qIndex, result, maxScore: task.maxScore };
          } catch (err: any) {
            return { qIndex: task.qIndex, result: { scoreNumber: 0, passed: false, feedback: `Lỗi chấm: ${err.message}`, score: `0/${task.maxScore.toFixed(2)}` }, maxScore: task.maxScore };
          }
        })
      );

      // Cập nhật kết quả
      const newGradingStatus: Record<string, { isGrading: boolean; result?: any }> = {};
      const updatedScores = { ...newQuestionScores };

      results.forEach(r => {
        if (r.status === 'fulfilled') {
          const { qIndex, result, maxScore } = r.value;
          newGradingStatus[qIndex] = { isGrading: false, result };
          const earned = typeof result.scoreNumber === 'number' ? Math.min(result.scoreNumber, maxScore) : 0;
          updatedScores[qIndex] = { earned, max: maxScore };
          essayTotalScore += earned;
        }
      });

      setGradingStatus(prev => ({ ...prev, ...newGradingStatus }));
      setQuestionScores(updatedScores);
      const finalScore = Math.round((immediateScore + essayTotalScore) * 100) / 100;
      setScore(finalScore);
      setTotalScore(10);
      setIsGradingAll(false);
      
      // Gọi API lưu điểm
      if (lessonId) {
        fetch('/api/student/save-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, moduleId, score: finalScore, passed: finalScore >= 7, cheatWarnings })
        }).catch(e => console.error("Error saving score:", e));
      }
    } else {
      const finalScore = Math.round(immediateScore * 100) / 100;
      setScore(finalScore);
      setTotalScore(10);
      setIsGradingAll(false);
      
      if (lessonId) {
        fetch('/api/student/save-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, moduleId, score: finalScore, passed: finalScore >= 7, cheatWarnings })
        }).catch(e => console.error("Error saving score:", e));
      }
    }
  };

  const handleRetake = () => {
    setIsSubmitted(false);
    setGradingStatus({});
    setQuestionScores({});
    setScore(0);
    setAnswers({});
    setCheatWarnings(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 relative">
      {/* Loading overlay khi đang chấm toàn bài */}
      {isGradingAll && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center">Đang chấm toàn bộ bài...</h3>
            <p className="text-gray-500 text-center font-medium">Hệ thống AI đang phân tích và chấm điểm từng câu. Vui lòng chờ trong giây lát.</p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Phần trái: Câu hỏi */}
      <div className="flex-1 space-y-8 pb-32">
        {isSubmitted && (
           <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-indigo-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                 <h2 className="text-2xl font-extrabold text-indigo-900 mb-2">Kết quả làm bài</h2>
                 <p className="text-gray-600 font-medium">Bạn đã hoàn thành phần thi: <span className="font-bold text-gray-800">{title}</span></p>
                 {isGradingAll && <p className="text-indigo-500 text-sm font-bold mt-1 animate-pulse">⏳ Đang chấm các câu tự luận...</p>}
                 
                 {!isGradingAll && score < 7 && (
                   <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 animate-in fade-in slide-in-from-bottom-2">
                     <p className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Bạn chưa đạt yêu cầu (&lt; 7đ).</p>
                     <p className="text-sm">Hãy xem kỹ Hướng dẫn giải bên dưới và làm lại bài nhé!</p>
                     <button onClick={handleRetake} className="mt-3 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors text-sm flex items-center gap-2">
                        LÀM LẠI BÀI NGAY
                     </button>
                   </div>
                 )}
                 
                 {!isGradingAll && score >= 7 && (
                   <div className="mt-4 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 animate-in fade-in slide-in-from-bottom-2">
                     <p className="font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Chúc mừng bạn đã vượt qua bài luyện tập!</p>
                     <button onClick={handleRetake} className="mt-3 px-6 py-2 bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 rounded-lg font-bold shadow-sm transition-colors text-sm">
                        Làm lại lần nữa
                     </button>
                   </div>
                 )}
              </div>
              <div className="flex items-center justify-center bg-indigo-50 border-4 border-indigo-100 rounded-full w-28 h-28 shrink-0 shadow-sm">
                 <div className="text-center">
                    <div className="text-3xl font-black text-indigo-700 leading-none">{isGradingAll ? '...' : score.toFixed(1)}</div>
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
            const realType = getQuestionType(data);
            const isEssay = realType === 'essay';
            const isShortAnswer = realType === 'short_answer';
            const userAns = answers[qIndex.toString()];
            const cleanQuestion = data.question ? data.question.replace(/^(Câu|Bài)\s*\d+[\.:\-\s]*/i, '') : "";
            const qScore = questionScores[qIndex];

            return (
              <div key={p.id} id={`question-${qIndex}`} className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all ${isSubmitted ? 'border-gray-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                 <div className="flex items-start gap-3 mb-6">
                    <div className="flex flex-col items-center shrink-0">
                       <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-sm mb-1 shadow-sm">Câu {qIndex}</span>
                       {isSubmitted && qScore && (
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qScore.earned >= qScore.max * 0.8 ? 'bg-green-100 text-green-700' : qScore.earned > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                           {qScore.earned.toFixed(2)}/{qScore.max.toFixed(2)}
                         </span>
                       )}
                    </div>
                    <div className="flex-1 min-w-0 prose prose-sm sm:prose-base prose-slate max-w-none prose-p:my-0 font-bold text-slate-800">
                       <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{cleanQuestion}</ReactMarkdown>
                    </div>
                 </div>

                 {/* === TRẮC NGHIỆM === */}
                 {realType === 'multiple_choice' && (
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

                 {/* === ĐÚNG/SAI === */}
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
                                   <p className="font-bold">Đúng {Math.round(sc * 4)}/4 mệnh đề</p>
                                </div>
                             </div>
                          );
                       })()}
                    </div>
                 )}

                 {/* === TRẢ LỜI NGẮN === */}
                 {isShortAnswer && (
                   <div className="ml-0 md:ml-12 mt-4">
                     {!isSubmitted ? (
                       <input
                         type="text"
                         value={userAns || ''}
                         onChange={(e) => handleAnswerChange(qIndex, 'short_answer', e.target.value)}
                         placeholder="Nhập đáp án ngắn gọn (số, biểu thức, từ khóa...)"
                         className="w-full md:w-2/3 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-lg"
                       />
                     ) : (
                       <div className="space-y-3">
                         <div className={`p-4 rounded-xl border-2 flex items-center gap-3 ${normalizeAnswer(String(userAns || '')) === normalizeAnswer(data.correctAnswer || '') ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                           {normalizeAnswer(String(userAns || '')) === normalizeAnswer(data.correctAnswer || '') 
                             ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> 
                             : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
                           <div>
                             <p className="font-bold text-slate-800">Bạn trả lời: <span className="text-indigo-700">{userAns || '(trống)'}</span></p>
                             <p className="font-bold text-slate-600">Đáp án đúng: <span className="text-green-700">{data.correctAnswer}</span></p>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                 {/* === TỰ LUẬN === */}
                 {isEssay && (
                    <div className="flex flex-col gap-3 ml-0 md:ml-12 mt-4">
                       {!isSubmitted ? (
                          <div className="flex flex-col gap-3">
                             <textarea 
                                value={userAns?.text || ''}
                                onChange={(e) => handleAnswerChange(qIndex, 'essay', { ...userAns, text: e.target.value })}
                                onPaste={(e) => {
                                   const items = e.clipboardData?.items;
                                   if (!items) return;
                                   for (let i = 0; i < items.length; i++) {
                                      if (items[i].type.indexOf('image') !== -1) {
                                         const file = items[i].getAsFile();
                                         if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                               handleAnswerChange(qIndex, 'essay', { ...userAns, image: ev.target?.result });
                                            };
                                            reader.readAsDataURL(file);
                                         }
                                         break;
                                      }
                                   }
                                }}
                                placeholder="Nhập câu trả lời tự luận của bạn vào đây... (Có thể copy và dán/paste ảnh trực tiếp vào khung này)"
                                className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none min-h-[150px] transition-all"
                             />
                             <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer transition-colors border border-slate-300">
                                   <UploadCloud className="w-4 h-4" />
                                   <span>Đính kèm ảnh bài làm</span>
                                   <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden"
                                      onChange={(e) => {
                                         if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                               handleAnswerChange(qIndex, 'essay', { ...userAns, image: ev.target?.result });
                                            };
                                            reader.readAsDataURL(file);
                                         }
                                      }}
                                   />
                                </label>
                                {userAns?.image && (
                                   <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" /> Đã đính kèm ảnh
                                   </span>
                                )}
                             </div>
                             {userAns?.image && (
                                <div className="mt-2 relative inline-block">
                                   <img src={userAns.image} alt="Bài làm" className="max-h-48 rounded-lg border-2 border-indigo-200 shadow-sm" />
                                   <button 
                                      onClick={() => handleAnswerChange(qIndex, 'essay', { ...userAns, image: null })}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-sm hover:bg-red-600"
                                   >
                                      <X className="w-3 h-3" />
                                   </button>
                                </div>
                             )}
                          </div>
                       ) : (
                          <div className="flex flex-col gap-4">
                             <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                                <h4 className="font-bold text-slate-700 mb-2">Bài làm của bạn:</h4>
                                {userAns?.text ? (
                                   <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                                      {userAns.text}
                                   </div>
                                ) : !userAns?.image ? (
                                   <p className="text-slate-400 italic">Không có câu trả lời</p>
                                ) : null}
                                
                                {userAns?.image && (
                                   <div className="mt-4">
                                      <img src={userAns.image} alt="Bài làm" className="max-h-64 rounded-lg border border-slate-300 shadow-sm" />
                                   </div>
                                )}
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 {/* === PHẦN HƯỚNG DẪN GIẢI (Hiện sau khi nộp) === */}
                 {isSubmitted && (
                    <div className="mt-8 pt-6 border-t-2 border-slate-100 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2">
                       {data.phuong_phap_giai && (
                          <div className="p-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 flex gap-4 shadow-sm">
                             <div className="mt-0.5 shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-blue-100">
                                <Lightbulb className="w-5 h-5 text-blue-600" />
                             </div>
                             <div className="flex-1">
                                <h4 className="text-lg font-extrabold text-blue-900 mb-2 uppercase tracking-wide text-sm">Phương pháp giải</h4>
                                <div className="prose prose-sm sm:prose-base max-w-none text-blue-900 font-medium leading-relaxed">
                                   <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{data.phuong_phap_giai}</ReactMarkdown>
                                </div>
                             </div>
                          </div>
                       )}
                       
                       {data.cac_buoc_thuc_hien && Array.isArray(data.cac_buoc_thuc_hien) && data.cac_buoc_thuc_hien.length > 0 && (
                          <div className="p-6 rounded-2xl border-2 border-emerald-100 bg-white shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                             <h4 className="text-lg font-extrabold text-emerald-800 mb-5 flex items-center gap-2 uppercase tracking-wide text-sm pl-2">
                                <ListOrdered className="w-5 h-5 text-emerald-600" /> Các bước thực hiện
                             </h4>
                             <div className="flex flex-col gap-4 pl-2">
                                {data.cac_buoc_thuc_hien.map((step: string, sIdx: number) => (
                                   <div key={sIdx} className="flex gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-sm ring-4 ring-emerald-50">
                                         {sIdx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0 prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed pt-0.5">
                                         <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{step}</ReactMarkdown>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}

                       {data.goi_y_nhanh && (
                          <div className="relative p-6 rounded-2xl border-2 border-amber-200 bg-[#fffdf0] shadow-[3px_4px_10px_rgba(251,191,36,0.1)] mt-2 transform md:rotate-1 hover:rotate-0 transition-transform">
                             <Pin className="w-8 h-8 text-red-500 absolute -top-4 -right-2 transform rotate-12 drop-shadow-md" />
                             <h4 className="text-lg font-black text-amber-900 mb-3 flex items-center gap-2">
                                💡 GỢI MỞ KIẾN THỨC
                             </h4>
                             <div className="prose prose-sm sm:prose-base max-w-none text-amber-900 font-medium leading-relaxed prose-p:my-1">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{data.goi_y_nhanh}</ReactMarkdown>
                             </div>
                          </div>
                       )}
                       
                       {/* Fallback dữ liệu cũ chỉ có 'answer' */}
                       {!data.phuong_phap_giai && !data.cac_buoc_thuc_hien && data.answer && (
                          <div className="p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50">
                             <h4 className="font-bold text-indigo-800 mb-3 uppercase tracking-wide text-sm">Gợi ý / Đáp án</h4>
                             <div className="prose prose-sm sm:prose-base max-w-none text-indigo-900">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{data.answer}</ReactMarkdown>
                             </div>
                          </div>
                       )}

                       {/* Kết quả chấm AI cho Tự luận */}
                       {isEssay && (
                          <div className="mt-2 p-6 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 relative overflow-hidden">
                             <div className="absolute -right-10 -bottom-10 opacity-10">
                                <Bot className="w-40 h-40 text-indigo-600" />
                             </div>
                             
                             {gradingStatus[qIndex]?.result?.error || (gradingStatus[qIndex]?.result?.scoreNumber === 0 && !gradingStatus[qIndex]?.result?.passed && gradingStatus[qIndex]?.result?.feedback?.includes('Lỗi chấm')) ? (
                                <div className="relative z-10 animate-in fade-in zoom-in-95 duration-300">
                                   <div className="flex items-center gap-3 mb-4 border-b border-indigo-100 pb-3">
                                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm border border-red-200">
                                         <AlertCircle className="w-6 h-6" />
                                      </div>
                                      <div>
                                         <h4 className="text-xl font-black text-red-900">Lỗi trong quá trình chấm AI</h4>
                                         <p className="text-sm font-bold text-red-600">Đã xảy ra lỗi hệ thống</p>
                                      </div>
                                      <button 
                                        onClick={() => handleGradeEssay(qIndex, data)}
                                        disabled={gradingStatus[qIndex]?.isGrading}
                                        className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50"
                                      >
                                        Thử chấm lại
                                      </button>
                                   </div>
                                   <div className="text-slate-700 bg-white p-5 rounded-xl border border-red-100 shadow-sm">
                                      <p className="font-medium text-red-600">{gradingStatus[qIndex].result.feedback || gradingStatus[qIndex].result.error}</p>
                                   </div>
                                </div>
                             ) : gradingStatus[qIndex]?.result ? (
                                <div className="relative z-10 animate-in fade-in zoom-in-95 duration-300">
                                   <div className="flex items-center gap-3 mb-4 border-b border-indigo-100 pb-3">
                                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm border border-green-200">
                                         <CheckCircle2 className="w-6 h-6" />
                                      </div>
                                      <div>
                                         <h4 className="text-xl font-black text-indigo-900">Kết quả chấm điểm AI</h4>
                                         <p className="text-sm font-bold text-green-600">Đã chấm xong</p>
                                      </div>
                                      {gradingStatus[qIndex].result.score && (
                                         <div className="ml-auto bg-indigo-600 text-white px-4 py-1.5 rounded-full font-black text-lg shadow-sm">
                                            {gradingStatus[qIndex].result.score}
                                         </div>
                                      )}
                                   </div>
                                   <div className="prose prose-sm sm:prose-base max-w-none text-slate-700 bg-white p-5 rounded-xl border border-indigo-100 shadow-sm leading-relaxed">
                                      <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{gradingStatus[qIndex].result.feedback || ''}</ReactMarkdown>
                                   </div>
                                </div>
                             ) : gradingStatus[qIndex]?.isGrading ? (
                                <div className="relative z-10 flex items-center justify-center gap-4 py-4">
                                   <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                   <p className="text-indigo-700 font-bold text-lg">AI đang chấm câu này...</p>
                                </div>
                             ) : (
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                   <div className="text-center md:text-left">
                                      <h4 className="text-xl font-black text-indigo-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                                         <Bot className="w-6 h-6 text-indigo-600" /> AI Chấm Điểm Tự Luận
                                      </h4>
                                      <p className="text-indigo-700 font-medium">Hệ thống AI sẽ phân tích bài làm của bạn, đối chiếu với các bước giải để cho điểm chi tiết.</p>
                                   </div>
                                   <button 
                                      onClick={() => handleGradeEssay(qIndex, data)}
                                      disabled={gradingStatus[qIndex]?.isGrading}
                                      className="shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 hover:-translate-y-1 active:scale-95"
                                   >
                                      <Bot className="w-5 h-5" /> BẮT ĐẦU CHẤM
                                   </button>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 )}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Phần phải: Sidebar (Sticky) */}
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
                          const realType = getQuestionType(p.content);
                          if (realType === 'multiple_choice') {
                             isCorrect = ans === p.content.answerIndex;
                          } else if (realType === 'true_false_cluster') {
                             const items = p.content.options || p.content.statements || [];
                             isCorrect = ans ? calculateTrueFalseScore(ans, items) === 1.0 : false;
                          } else if (realType === 'short_answer') {
                             isCorrect = normalizeAnswer(String(ans || '')) === normalizeAnswer(p.content.correctAnswer || '');
                          }
                       }
                    }

                    let boxClass = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";
                    if (!isSubmitted) {
                       if (isAnswered) boxClass = "bg-indigo-600 border-indigo-600 text-white shadow-sm";
                    } else {
                       const realType = p ? getQuestionType(p.content) : 'multiple_choice';
                       
                       if (realType === 'essay') {
                          // Câu essay: xanh dương nếu đã trả lời, xám nếu chưa
                          if (gradingStatus[qn]?.result) {
                            boxClass = gradingStatus[qn].result.passed ? "bg-green-500 border-green-500 text-white" : "bg-orange-500 border-orange-500 text-white";
                          } else {
                            boxClass = isAnswered ? "bg-blue-500 border-blue-500 text-white" : "bg-slate-200 border-slate-300 text-slate-500";
                          }
                       } else {
                          if (isCorrect) boxClass = "bg-green-500 border-green-500 text-white";
                          else boxClass = "bg-red-500 border-red-500 text-white";
                       }
                    }

                    return (
                       <button 
                         key={qn} 
                         onClick={() => {
                            const el = document.getElementById(`question-${qn}`);
                            if (el) {
                               el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                    disabled={isGradingAll}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
