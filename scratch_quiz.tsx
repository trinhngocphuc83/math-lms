import React, { useState, useRef } from "react";
import { CheckCircle2, XCircle, Sparkles, Upload, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import confetti from 'canvas-confetti';

const playSound = (type: 'correct' | 'wrong') => {
  // same implementation as before
}

const InteractiveQuiz = ({ data, onPass }: { data: any, onPass: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  
  // For Short Answer
  const [shortAnswerText, setShortAnswerText] = useState("");
  
  // For Essay
  const [essayImage, setEssayImage] = useState<File | null>(null);
  const [essayImageUrl, setEssayImageUrl] = useState("");
  const [serverId, setServerId] = useState(1);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const type = data.type || "multiple_choice"; // default to multiple_choice for backward compatibility

  const handleSelect = (idx: number) => {
    if (isCorrect) return; 
    setSelected(idx);
    const correct = idx === data.answerIndex;
    setIsCorrect(correct);
    if (correct) {
      playSound('correct');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6', '#FBBF24'] });
      onPass();
    } else {
      playSound('wrong');
    }
  };

  const handleCheckShortAnswer = () => {
    if (isCorrect) return;
    const correct = shortAnswerText.trim().toLowerCase() === String(data.exactAnswer).trim().toLowerCase();
    setIsCorrect(correct);
    if (correct) {
      playSound('correct');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6', '#FBBF24'] });
      onPass();
    } else {
      playSound('wrong');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setEssayImage(file);
      setEssayImageUrl(URL.createObjectURL(file));
      setIsCorrect(null);
      setFeedback("");
    }
  };

  const handleGradeEssay = async () => {
    if (!essayImage) return alert("Vui lòng tải ảnh bài làm lên trước!");
    setIsGrading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(essayImage);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Data,
            question: data.question,
            sampleAnswer: data.sampleAnswer || data.exactAnswer || "Hãy chấm theo quy chuẩn toán học chung.",
            serverId
          })
        });
        const result = await res.json();
        setIsGrading(false);
        if (res.ok) {
          setIsCorrect(result.passed);
          setFeedback(result.feedback);
          if (result.passed) {
            playSound('correct');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6', '#FBBF24'] });
            onPass();
          } else {
            playSound('wrong');
          }
        } else {
          alert(result.error || "Lỗi chấm điểm.");
        }
      };
    } catch (e: any) {
      setIsGrading(false);
      alert("Lỗi: " + e.message);
    }
  };

  const renderQuizContent = (text: string) => (
    <div className="prose prose-lg max-w-full break-words prose-p:my-0 leading-relaxed text-inherit overflow-hidden [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
    </div>
  );

  if (!isRevealed) {
    return (
      <div className="my-10 flex justify-center not-prose relative z-10">
        <button 
          onClick={() => setIsRevealed(true)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-5 px-10 rounded-2xl shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.7)] transition-all transform hover:-translate-y-2 flex items-center gap-4 text-xl border-t border-indigo-400 animate-in zoom-in duration-500"
        >
          <span className="text-2xl">🧠</span>
          <span className="tracking-wide text-shadow-sm">Thử sức với Bài Tập</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white p-8 md:p-10 rounded-[2rem] border-4 border-indigo-50 my-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] not-prose animate-in zoom-in-95 duration-500 origin-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="text-xl md:text-2xl font-bold text-slate-800 mb-8 flex items-start gap-4 leading-snug p-2 max-w-full overflow-hidden">
        <span className="text-4xl mt-1 shrink-0 animate-bounce">🤔</span> 
        <div className="flex-1 min-w-0">{renderQuizContent(data.question)}</div>
      </div>

      {(type === "multiple_choice" || type === "true_false") && (
        <div className="flex flex-col gap-4">
          {data.options?.map((opt: string, i: number) => {
            let btnClass = "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-indigo-300 shadow-sm";
            let iconClass = "bg-slate-100 text-slate-500";
            let scaleClass = "scale-100 hover:scale-[1.01]";
            
            if (selected === i) {
              if (isCorrect) {
                btnClass = "bg-emerald-500 text-white border-emerald-600 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] z-10";
                iconClass = "bg-emerald-600 text-white shadow-inner";
                scaleClass = "scale-[1.03]";
              } else {
                btnClass = "bg-rose-500 text-white border-rose-600 shadow-[0_10px_25px_-5px_rgba(244,63,94,0.5)] animate-shake z-10";
                iconClass = "bg-rose-600 text-white shadow-inner";
                scaleClass = "scale-[0.98]";
              }
            } else if (isCorrect && i === data.answerIndex) {
              btnClass = "bg-emerald-50 text-emerald-800 border-emerald-200"; 
              iconClass = "bg-emerald-500 text-white";
            }
            
            return (
              <button key={i} onClick={() => handleSelect(i)} className={`text-left px-6 py-5 rounded-2xl border-2 font-medium text-lg md:text-xl transition-all duration-300 flex items-center gap-5 w-full ${btnClass} ${scaleClass}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 transition-colors text-xl ${iconClass}`}>
                  {type === "true_false" ? (i === 0 ? "1" : "2") : ['A', 'B', 'C', 'D'][i]}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">{renderQuizContent(opt)}</div>
              </button>
            );
          })}
        </div>
      )}

      {type === "short_answer" && (
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <input 
            type="text" 
            value={shortAnswerText} 
            onChange={(e) => setShortAnswerText(e.target.value)}
            disabled={isCorrect === true}
            placeholder="Nhập đáp án của bạn..." 
            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-lg font-medium outline-none transition-all"
          />
          <button 
            onClick={handleCheckShortAnswer}
            disabled={isCorrect === true || !shortAnswerText.trim()}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Kiểm tra
          </button>
        </div>
      )}

      {type === "essay" && (
        <div className="mt-4 p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center gap-4">
          <p className="text-slate-600 font-medium text-center">Câu hỏi tự luận yêu cầu bạn giải ra giấy. Hãy chụp ảnh bài làm của bạn và tải lên để AI chấm điểm nhé!</p>
          
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />
          
          {essayImageUrl && (
            <div className="relative w-full max-w-md rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={essayImageUrl} alt="Bài làm" className="w-full object-cover" />
              {isCorrect === true && <div className="absolute inset-0 border-4 border-emerald-500 rounded-xl pointer-events-none"></div>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-white border-2 border-indigo-200 text-indigo-700 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
            >
              <Upload className="w-5 h-5" /> {essayImage ? "Đổi ảnh khác" : "Chọn ảnh bài làm"}
            </button>
            <select 
              value={serverId} 
              onChange={e => setServerId(Number(e.target.value))}
              className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-4 rounded-xl font-medium outline-none focus:border-indigo-500"
            >
              <option value={1}>Máy chấm AI 1</option>
              <option value={2}>Máy chấm AI 2</option>
              <option value={3}>Máy chấm AI 3</option>
            </select>
          </div>

          {essayImage && (
            <button 
              onClick={handleGradeEssay}
              disabled={isGrading || isCorrect === true}
              className="w-full max-w-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
            >
              {isGrading ? <><Loader2 className="w-6 h-6 animate-spin" /> Đang chấm điểm...</> : <><Sparkles className="w-6 h-6" /> Chấm bài với AI</>}
            </button>
          )}

          {feedback && (
            <div className="w-full mt-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h4 className="font-bold text-lg mb-2 text-indigo-700 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Nhận xét từ AI:
              </h4>
              {renderQuizContent(feedback)}
            </div>
          )}
        </div>
      )}

      {isCorrect === true && (
        <div className="mt-8 p-6 bg-emerald-100 text-emerald-800 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 animate-in slide-in-from-bottom-6 zoom-in-95 duration-500 border border-emerald-300 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]">
          <div className="bg-emerald-500 p-2 rounded-full text-white">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          Tuyệt vời! Bạn là một thiên tài! 🎉
        </div>
      )}
      {isCorrect === false && (
        <div className="mt-8 p-5 bg-rose-50 text-rose-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 border border-rose-200">
          <div className="bg-rose-100 p-2 rounded-full text-rose-600">
            <XCircle className="w-7 h-7" />
          </div>
          {type === 'essay' ? 'Bài làm của bạn còn thiếu sót, hãy đọc nhận xét và thử lại nhé!' : 'Đáp án chưa chính xác! Hãy suy nghĩ kỹ và thử lại nhé.'}
        </div>
      )}
    </div>
  );
};
