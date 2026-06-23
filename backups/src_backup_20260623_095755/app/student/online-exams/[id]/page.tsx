"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, PlayCircle, Clock, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, Lock, EyeOff } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";

export default function StudentExamRoom() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  
  // App State
  const [appState, setAppState] = useState<'LOADING' | 'WAITING' | 'PLAYING' | 'FINISHED'>('LOADING');
  const [examInfo, setExamInfo] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState("");
  
  // Waiting Room State
  const [password, setPassword] = useState("");
  
  // Playing State
  const [submissionId, setSubmissionId] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Result State
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // 1. Khởi tạo: Lấy thông tin cơ bản của đề thi
  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        const res = await fetch(`/api/student/exams`);
        const list = await res.json();
        const info = list.find((e: any) => e.id === params.id);
        if (info) {
          setExamInfo(info);
          setAppState('WAITING');
        } else {
          setErrorMsg("Không tìm thấy kỳ thi hoặc kỳ thi đã đóng.");
        }
      } catch (err) {
        setErrorMsg("Lỗi tải dữ liệu phòng thi.");
      }
    };
    fetchExamInfo();
  }, [params.id]);

  // 2. Chống Gian Lận (Chỉ kích hoạt khi PLAYING)
  useEffect(() => {
    if (appState !== 'PLAYING') return;

    const handleVisibilityChange = async () => {
      if (document.hidden && submissionId) {
        // Học sinh chuyển tab hoặc thu nhỏ cửa sổ
        alert("🚨 CẢNH BÁO GIAN LẬN: Bạn vừa thoát khỏi màn hình làm bài! Hệ thống đã ghi nhận vi phạm và gửi về cho Giáo viên.");
        try {
          await fetch(`/api/student/exams/${params.id}/cheat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submissionId })
          });
        } catch (e) {}
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const handleCopy = (e: Event) => {
      e.preventDefault();
      alert("Nội quy: Nghiêm cấm sao chép nội dung bài thi!");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
    };
  }, [appState, submissionId, params.id]);

  // 3. Đồng hồ đếm ngược
  useEffect(() => {
    if (appState !== 'PLAYING') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(); // Tự động nộp
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [appState]);

  // Hành động: Bắt đầu thi
  const handleStartExam = async () => {
    try {
      setAppState('LOADING');
      const res = await fetch(`/api/student/exams/${params.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error);
        setAppState('WAITING');
        return;
      }
      
      setSubmissionId(data.submission_id);
      setQuestions(data.safe_exam_data);
      setTimeLeft(data.exam_info.duration_minutes * 60);
      setAppState('PLAYING');

      // Chế độ toàn màn hình (Tùy chọn)
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log("Fullscreen blocked"));
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
      setAppState('WAITING');
    }
  };

  // Hành động: Nộp bài
  const handleSubmitExam = async () => {
    if (!confirm("Bạn có chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể sửa lại.")) return;
    
    try {
      setAppState('LOADING');
      const res = await fetch(`/api/student/exams/${params.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId, answers })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error);
        setAppState('PLAYING');
        return;
      }

      setFinalScore(data.score);
      setSubmissionStatus(data.status);
      setAppState('FINISHED');
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => {});
      }
    } catch (err) {
      alert("Lỗi nộp bài, vui lòng thử lại!");
      setAppState('PLAYING');
    }
  };

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (appState === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-600 animate-pulse">Đang kết nối vào hệ thống máy chủ thi...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-600 mb-6">{errorMsg}</p>
        <Link href="/student/online-exams" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Quay lại danh sách</Link>
      </div>
    );
  }

  if (appState === 'WAITING') {
    const hasPassword = examInfo.description && examInfo.description.includes('"password"');
    
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-white max-w-3xl w-full rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-10 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <ShieldAlert className="w-16 h-16 mb-6 text-indigo-200" />
            <h1 className="text-3xl font-black mb-2 leading-tight">{examInfo.title}</h1>
            <div className="space-y-3 mt-6 text-indigo-100 font-medium">
              <div className="flex items-center gap-2"><Clock className="w-5 h-5" /> Thời gian: {examInfo.duration_minutes} phút</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Chế độ: Tự động chấm điểm</div>
              <div className="flex items-center gap-2"><EyeOff className="w-5 h-5" /> Hệ thống: Giám sát gian lận (Bật)</div>
            </div>
          </div>
          <div className="p-10 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Nội quy phòng thi</h2>
            <ul className="space-y-3 text-sm text-slate-600 mb-8 font-medium">
              <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Tuyệt đối KHÔNG thoát khỏi màn hình thi hoặc chuyển sang Tab khác.</li>
              <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Hệ thống vô hiệu hóa chuột phải, bôi đen và sao chép.</li>
              <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Nếu hết thời gian, bài sẽ được tự động nộp.</li>
            </ul>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu phòng thi (Nếu có)</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all bg-slate-50"
                    placeholder="Nhập mật khẩu do GV cung cấp..."
                  />
                </div>
              </div>
              <button 
                onClick={handleStartExam}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-6 h-6" /> VÀO THI NGAY
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'PLAYING') {
    const currentQ = questions[currentQuestionIdx];

    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden select-none">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-lg leading-tight">{examInfo.title}</h1>
              <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> HỆ THỐNG ĐANG GIÁM SÁT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xl tracking-wider ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <button 
              onClick={handleSubmitExam}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-sm"
            >
              Nộp Bài
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Cột trái: Menu Câu hỏi */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700 text-sm">Danh sách Câu hỏi</h3>
              <div className="text-xs text-slate-500 mt-1">Đã làm: {Object.keys(answers).length} / {questions.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[idx] !== undefined;
                  const isCurrent = currentQuestionIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`
                        aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all
                        ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                        ${isAnswered 
                          ? (isCurrent ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 border border-indigo-200') 
                          : (isCurrent ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
                      `}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cột phải: Nội dung câu hỏi */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 relative">
            <div className="max-w-4xl w-full mx-auto p-8 pb-32">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
                
                {/* TIÊU ĐỀ NHÓM CÂU HỎI */}
                {(() => {
                  let groupCount = 0;
                  for (let i = 0; i <= currentQuestionIdx; i++) {
                    if (i === 0 || questions[i].type !== questions[i - 1]?.type) groupCount++;
                  }
                  const romanIndex = groupCount - 1;
                  const romanNumbers = ["I", "II", "III", "IV", "V", "VI"];
                  const groupTitles: Record<string, string> = {
                    'multiple_choice': 'PHẦN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
                    'true_false': 'PHẦN TRẮC NGHIỆM ĐÚNG SAI',
                    'short_answer': 'PHẦN TRẢ LỜI NGẮN',
                    'essay': 'PHẦN TỰ LUẬN'
                  };
                  return (
                    <div className="bg-indigo-600 text-white font-black text-lg p-3 rounded-xl mb-6 shadow-md uppercase tracking-wide">
                      {romanNumbers[romanIndex]}. {groupTitles[currentQ.type || 'multiple_choice'] || 'PHẦN THI'}
                    </div>
                  );
                })()}

                <div className="inline-flex px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg mb-4">
                  Câu hỏi {currentQuestionIdx + 1}
                </div>
                
                <div className="prose prose-slate max-w-none mb-8 text-lg text-slate-800">
                  <MathRenderer htmlContent={currentQ.question} />
                </div>

                <div className="space-y-3">
                  {(!currentQ.type || currentQ.type === 'multiple_choice') && currentQ.options && (
                    // Trắc nghiệm nhiều lựa chọn
                    currentQ.options.map((opt: string, optIdx: number) => {
                      const isSelected = answers[currentQuestionIdx] === optIdx;
                      return (
                        <div 
                          key={optIdx}
                          onClick={() => setAnswers(prev => ({ ...prev, [currentQuestionIdx]: optIdx }))}
                          className={`
                            p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4
                            ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                          `}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-500' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>}
                          </div>
                          <div className="flex-1 text-slate-700">
                            <MathRenderer htmlContent={opt} />
                          </div>
                        </div>
                      );
                    })
                  )}

                  {currentQ.type === 'true_false' && currentQ.options && (
                    // Trắc nghiệm Đúng / Sai
                    <div className="space-y-3">
                      <div className="flex text-sm font-bold text-slate-500 px-4">
                        <div className="flex-1">Nội dung các ý</div>
                        <div className="w-20 text-center text-green-600">ĐÚNG</div>
                        <div className="w-20 text-center text-red-500">SAI</div>
                      </div>
                      {Array.from({ length: Math.max(4, currentQ.options?.length || 4) }).map((_, optIdx: number) => {
                        const opt = currentQ.options?.[optIdx] || `Ý ${String.fromCharCode(97 + optIdx)})`;
                        const currentArr = answers[currentQuestionIdx] || [null, null, null, null];
                        const isTrue = currentArr[optIdx] === true;
                        const isFalse = currentArr[optIdx] === false;
                        
                        const handleSelect = (val: boolean) => {
                           setAnswers(prev => {
                             const arr = [...(prev[currentQuestionIdx] || [null, null, null, null])];
                             arr[optIdx] = val;
                             return { ...prev, [currentQuestionIdx]: arr };
                           });
                        };

                        return (
                          <div key={optIdx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                            <div className="font-bold text-slate-400">{String.fromCharCode(97 + optIdx)})</div>
                            <div className="flex-1 text-slate-700"><MathRenderer htmlContent={opt} /></div>
                            
                            <div className="w-20 flex justify-center">
                              <div 
                                onClick={() => handleSelect(true)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-2 transition-colors ${isTrue ? 'border-green-500 bg-green-50 text-green-600 font-bold' : 'border-slate-200 text-slate-300 hover:border-green-300'}`}
                              >Đ</div>
                            </div>
                            <div className="w-20 flex justify-center">
                              <div 
                                onClick={() => handleSelect(false)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-2 transition-colors ${isFalse ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-slate-200 text-slate-300 hover:border-red-300'}`}
                              >S</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'short_answer' && (
                    // Trả lời ngắn
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="block font-bold text-slate-700 mb-2">Câu trả lời ngắn của bạn:</label>
                      <input 
                        type="text"
                        className="w-full max-w-md p-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none text-lg font-bold text-slate-800"
                        placeholder="Nhập đáp án..."
                        value={answers[currentQuestionIdx] || ""}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestionIdx]: e.target.value }))}
                      />
                    </div>
                  )}

                  {currentQ.type === 'essay' && (
                    // Tự luận (Hỗ trợ chèn ảnh)
                    <div className="mt-4">
                      <label className="block font-bold text-slate-700 mb-2 flex items-center justify-between">
                        Phần trả lời tự luận:
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium">Bạn có thể dán (Ctrl+V) hình ảnh bài làm vào khung này</span>
                      </label>
                      <div 
                        contentEditable
                        className="w-full min-h-[200px] max-h-[500px] overflow-y-auto p-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none bg-white empty:before:content-['Nhập_nội_dung_hoặc_dán_ảnh_(Ctrl+V)_vào_đây...'] empty:before:text-slate-400 text-slate-800"
                        onBlur={(e) => setAnswers(prev => ({ ...prev, [currentQuestionIdx]: e.currentTarget.innerHTML }))}
                        dangerouslySetInnerHTML={{ __html: answers[currentQuestionIdx] || "" }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowLeft className="w-5 h-5" /> Câu trước
                </button>
                <button 
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIdx === questions.length - 1}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Câu tiếp theo <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 mb-2">Đã Nộp Bài Thành Công!</h1>
          <p className="text-slate-500 mb-8 font-medium">Hệ thống đã ghi nhận bài làm của bạn.</p>

          {submissionStatus === 'PUBLISHED' ? (
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Điểm số của bạn</div>
              <div className="text-6xl font-black text-indigo-600">{finalScore !== null ? finalScore : '-'}</div>
              <div className="text-slate-500 font-medium mt-1">/ 10 điểm</div>
              <div className="mt-6 flex flex-col gap-3">
                <Link href={`/student/online-exams/${params.id}/review/${submissionId}`} className="block w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-3 rounded-xl transition-colors">
                  Xem Lời Giải & Chi tiết Điểm
                </Link>
                <button onClick={() => window.location.reload()} className="block w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors">
                  Làm lại đề này để Ôn tập
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 rounded-2xl p-6 mb-8 border border-amber-200">
              <div className="text-xl font-black mb-2 flex items-center justify-center gap-2"><Clock className="w-6 h-6"/> Đang chờ công bố</div>
              <p className="font-medium text-amber-600/80">Bài làm của bạn đang được lưu trữ bảo mật. Điểm số và lời giải chi tiết sẽ được mở khóa sau khi Giáo viên công bố kết quả toàn lớp.</p>
            </div>
          )}

          <Link href="/student/online-exams" className="block w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-colors">
            Trở về Danh sách
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
