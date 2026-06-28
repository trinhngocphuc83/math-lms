import React, { useState } from 'react';
import { X, Bot, Copy, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

interface RemedialModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: any;
  onSuccess: () => void;
}

export default function RemedialModal({ isOpen, onClose, resultData, onSuccess }: RemedialModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');

  if (!isOpen || !resultData) return null;

  // Lấy danh sách các câu sai hoặc không làm được
  // Giả sử answer.gradingDetails có lưu điểm từng câu
  const gradingDetails = resultData.answers?.gradingDetails || [];
  const wrongQuestions = gradingDetails.filter((d: any) => d.score < d.maxScore);

  // Trích xuất tất cả URL hình ảnh từ nội dung các câu sai
  const extractImages = (text: string) => {
    if (!text) return [];
    const mdRegex = /!\[.*?\]\((.*?)\)/g;
    const htmlRegex = /<img.*?src=["'](.*?)["']/g;
    const urls: string[] = [];
    let match;
    while ((match = mdRegex.exec(text)) !== null) urls.push(match[1]);
    while ((match = htmlRegex.exec(text)) !== null) urls.push(match[1]);
    return urls;
  };

  const wrongImages = wrongQuestions.flatMap((q: any) => extractImages(q.question));

  const handleGeneratePrompt = () => {
    let prompt = `Bạn là một chuyên gia giáo dục. Dưới đây là ${wrongQuestions.length} câu hỏi mà học sinh đã làm sai hoặc chưa đạt điểm tối đa.\n`;
    prompt += `Nhiệm vụ của bạn là sinh ra ${wrongQuestions.length} câu hỏi MỚI TƯƠNG TỰ (cùng dạng, cùng mức độ khó, nhưng thay đổi số liệu hoặc ngữ cảnh) để học sinh luyện tập lại.\n\n`;
    
    wrongQuestions.forEach((q: any, i: number) => {
      prompt += `--- CÂU SAI SỐ ${i+1} ---\n`;
      prompt += `Nội dung: ${q.question || 'Không rõ'}\n`;
      prompt += `Loại câu hỏi: ${q.type || 'Tự luận'}\n\n`;
    });

    prompt += `Hãy trả về KẾT QUẢ DUY NHẤT LÀ ĐỊNH DẠNG JSON MẢNG (Array of Objects) chứa các câu hỏi mới. Cấu trúc mỗi object như sau:\n`;
    prompt += `{\n  "noiDung": "Nội dung câu hỏi mới",\n  "dangThuc": "TL" (hoặc NLC, DS, TN), \n  "loiGiai": "Lời giải chi tiết cho câu hỏi mới",\n  "dapAnDung": "Đáp án",\n  "diem": 1\n}\n`;
    prompt += `TUYỆT ĐỐI KHÔNG BỌC JSON TRONG MARKDOWN, CHỈ TRẢ VỀ CHUỖI JSON.`;

    setManualPrompt(prompt);
  };

  const handleSaveRemedial = async (questions: any[]) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/create-remedial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_result_id: resultData.id,
          student_id: resultData.student_id,
          lesson_id: resultData.lesson_id,
          questions_data: questions
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Đã giao bài luyện tập lại thành công!");
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (wrongQuestions.length === 0) return alert("Không tìm thấy câu hỏi sai nào để tạo bài luyện tập!");
    setIsGenerating(true);
    
    // Gọi API AI để sinh đề tự động (Chưa implement route này, dùng tạm prompt)
    alert("Tính năng sinh tự động bằng API AI đang được phát triển. Tạm thời Thầy có thể dùng Tab 'Sinh bằng Prompt' ạ.");
    setIsGenerating(false);
    setActiveTab('manual');
  };

  const handleManualSave = () => {
    if (!manualJsonInput.trim()) return alert("Vui lòng dán chuỗi JSON kết quả từ Gemini vào đây!");
    try {
      const parsed = JSON.parse(manualJsonInput);
      if (!Array.isArray(parsed)) throw new Error("JSON phải là một mảng (Array).");
      handleSaveRemedial(parsed);
    } catch(e: any) {
      alert("Lỗi định dạng JSON: " + e.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép vào bộ nhớ tạm!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-zinc-100 flex justify-between items-center bg-indigo-50/50">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-indigo-950">Giao bài luyện tập gỡ điểm</h2>
            <p className="text-sm text-indigo-600/80 font-medium mt-1">Học sinh: {resultData.profiles?.full_name} • Điểm cũ: {resultData.score}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white text-zinc-400 hover:text-zinc-600 rounded-full shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setActiveTab('auto')}
              className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'auto' ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
            >
              <Bot className="w-5 h-5" /> AI Tự động
            </button>
            <button 
              onClick={() => { setActiveTab('manual'); handleGeneratePrompt(); }}
              className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
            >
              <Copy className="w-5 h-5" /> Sinh bằng Prompt (Thủ công)
            </button>
          </div>

          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl mb-6 text-sm font-medium">
            Phát hiện <strong className="text-orange-900">{wrongQuestions.length} câu hỏi</strong> làm sai hoặc chưa đạt điểm tối đa. Hệ thống sẽ sinh ra số lượng câu hỏi mới tương ứng để học sinh luyện tập gỡ điểm.
          </div>

          {activeTab === 'auto' && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-700 mb-2">Sinh đề tự động bằng Gemini API</h3>
              <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">Hệ thống sẽ gọi API ngầm để phân tích các câu sai và tự tạo ra câu hỏi mới tương tự mà không cần Thầy can thiệp.</p>
              <button 
                onClick={handleAutoGenerate}
                disabled={isGenerating || wrongQuestions.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {isGenerating ? 'Đang gọi AI...' : 'Bắt đầu sinh đề tự động'}
              </button>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">1. Lệnh Prompt đã tạo sẵn (Copy và dán vào Gemini)</label>
                <div className="relative">
                  <textarea 
                    readOnly 
                    value={manualPrompt} 
                    className="w-full h-40 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-600 focus:outline-none"
                  />
                  <button 
                    onClick={() => copyToClipboard(manualPrompt)}
                    className="absolute top-2 right-2 p-2 bg-white shadow-sm border border-zinc-200 rounded-lg text-indigo-600 hover:bg-indigo-50"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {wrongImages.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-sm font-bold text-blue-800 mb-2">🖼️ Phát hiện có hình ảnh trong câu hỏi sai</p>
                  <p className="text-xs text-blue-600 mb-3">Gemini không tự đọc được link ảnh. Thầy hãy <strong>chuột phải vào từng ảnh &rarr; Sao chép hình ảnh</strong> và dán (Ctrl+V) vào cùng khung chat Gemini nhé!</p>
                  <div className="flex flex-wrap gap-2">
                    {wrongImages.map((url, idx) => (
                      <div key={idx} className="w-24 h-24 bg-white rounded border border-blue-200 p-1 flex items-center justify-center overflow-hidden">
                        <img src={url} alt={`Ảnh ${idx}`} className="max-w-full max-h-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-center py-2">
                <ArrowRight className="text-zinc-300 w-6 h-6 rotate-90 md:rotate-0" />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">2. Dán kết quả JSON từ Gemini vào đây</label>
                <textarea 
                  value={manualJsonInput}
                  onChange={e => setManualJsonInput(e.target.value)}
                  placeholder="[{...}, {...}]"
                  className="w-full h-40 p-3 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={handleManualSave}
                  disabled={isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Đang lưu...' : 'Lưu Đề Luyện Tập'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
