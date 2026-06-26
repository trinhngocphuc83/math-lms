import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle2, AlertCircle, RefreshCw, Bot, Edit3, Image as ImageIcon, Send, Copy } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: any;
  onUpdateSuccess: () => void;
}

export default function ReviewModal({ isOpen, onClose, resultData, onUpdateSuccess }: ReviewModalProps) {
  const [answers, setAnswers] = useState<any>(null);
  const [editedScore, setEditedScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // States cho tính năng Phòng Mổ AI
  const [activeAIBox, setActiveAIBox] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [isAIGrading, setIsAIGrading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && resultData) {
      const initialAnswers = resultData.answers || { globalImages: [], gradingDetails: [] };
      setAnswers(initialAnswers);
      setEditedScore(resultData.score || 0);
      setSelectedImageUrls(initialAnswers.globalImages || []);
    }
  }, [isOpen, resultData]);

  if (!isOpen || !resultData) return null;

  const images = answers?.globalImages || [];
  const gradingDetails = answers?.gradingDetails || [];

  const handleSave = async () => {
    if (!confirm("Bạn có chắc chắn muốn lưu điểm và nhận xét này?")) return;
    setIsSaving(true);
    
    try {
      const res = await fetch('/api/admin/update-exam-result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resultData.id,
          score: editedScore,
          answers: answers
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Cập nhật thành công!");
        onUpdateSuccess();
        onClose();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    }
    setIsSaving(false);
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...gradingDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setAnswers({ ...answers, gradingDetails: newDetails });
  };

  const calculateAutoScore = () => {
    // Chỉ tính cho phần tự luận, nếu có trắc nghiệm thì giáo viên tự sửa thủ công
    let total = 0;
    gradingDetails.forEach((d: any) => {
      total += Number(d.score || 0);
    });
    setEditedScore(Math.round(total * 100) / 100);
  };

  const handleCustomAIGrade = async (index: number, detail: any) => {
    if (selectedImageUrls.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ảnh để AI chấm!");
      return;
    }

    setIsAIGrading(true);
    try {
      const res = await fetch('/api/admin/grade-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: selectedImageUrls,
          customPrompt: customPrompt,
          question: detail.question,
          sampleAnswer: detail.sampleAnswer,
          maxScore: detail.maxScore || 10
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Lỗi AI");

      // Cập nhật kết quả vào detail
      const newDetails = [...gradingDetails];
      newDetails[index] = { 
        ...newDetails[index], 
        score: result.scoreNumber || 0,
        passed: result.passed || false,
        feedback: result.feedback || ''
      };
      setAnswers({ ...answers, gradingDetails: newDetails });
      setActiveAIBox(null);
      setCustomPrompt('');

    } catch (err: any) {
      alert("Lỗi khi gọi AI: " + err.message);
    }
    setIsAIGrading(false);
  };

  const toggleImageSelection = (url: string) => {
    setSelectedImageUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const generateManualPrompt = (detail: any) => {
    return `Bạn là Trợ lý AI Thông Minh hỗ trợ Giáo viên chấm bài.
Giáo viên yêu cầu bạn chấm bài làm (hình ảnh đính kèm) của học sinh dựa trên Đề bài và Đáp án mẫu dưới đây.

[LỆNH ĐẶC BIỆT TỪ GIÁO VIÊN]: "${customPrompt || 'Chấm bình thường dựa trên barem.'}"

THANG ĐIỂM TỐI ĐA: ${detail.maxScore} điểm

ĐỀ BÀI:
${detail.question}

ĐÁP ÁN MẪU / BAREM:
${detail.sampleAnswer}

Hãy đưa ra Nhận xét chi tiết cho Học sinh và đánh giá số điểm đạt được (Tối đa ${detail.maxScore} điểm).`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép Lệnh chấm bài chuẩn! Thầy có thể mở tab mới, vào trang web Gemini và dán vào đó (kèm theo thao tác Sao chép hình ảnh).");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-indigo-900">Trạm Chấm Bài Đa Năng</h2>
            <p className="text-sm text-indigo-700">Học sinh: <span className="font-bold">{resultData.profiles?.full_name}</span> | Bài: <span className="font-bold">{resultData.lessons?.title}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Main: Manual & AI Grading */}
          <div className="w-full p-6 overflow-y-auto bg-white flex flex-col">
            <div className="mb-6 flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl sticky top-0 z-10 shadow-sm">
              <div className="flex flex-col">
                <p className="text-sm text-indigo-600 font-semibold mb-1">ĐIỂM TỔNG KẾT</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editedScore} 
                    onChange={(e) => setEditedScore(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-2xl font-black text-indigo-700 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:ring-0 text-center"
                  />
                  <span className="text-xl font-bold text-indigo-300">/ 10</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                 <button 
                  onClick={calculateAutoScore}
                  className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-xl font-semibold transition-colors text-sm"
                 >
                   Cộng tự động
                 </button>
                 <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                 >
                  {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  LƯU CHỐT ĐIỂM
                 </button>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-4 text-zinc-800 border-b pb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-500" /> Bảng Chấm Chi Tiết Từng Câu
            </h3>
            
            {gradingDetails.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 bg-zinc-50 rounded-xl">Chưa có chi tiết bài chấm nào.</div>
            ) : (
              <div className="flex flex-col gap-6">
                {gradingDetails.map((detail: any, i: number) => (
                  <div key={i} className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm transition-all hover:border-indigo-200">
                    {/* Detail Header */}
                    <div className="bg-zinc-50 p-4 border-b flex justify-between items-center">
                      <h4 className="font-bold text-zinc-800 text-lg">Câu {detail.qIndex + 1}</h4>
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-semibold text-zinc-500">Điểm:</span>
                         <input 
                           type="number"
                           step="0.25"
                           value={detail.score}
                           onChange={(e) => handleDetailChange(i, 'score', Number(e.target.value))}
                           className="w-20 p-1 text-center font-bold text-indigo-700 border rounded focus:ring-2 focus:ring-indigo-500"
                         />
                         <span className="text-sm text-zinc-500">/ {detail.maxScore}</span>
                      </div>
                    </div>
                    
                    {/* Detail Body */}
                    <div className="p-4 flex flex-col gap-3">
                      {detail.question && (
                        <div className="text-sm text-zinc-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                          <strong className="text-amber-800">Đề bài:</strong> {detail.question}
                        </div>
                      )}

                      {/* Hiển thị Ảnh Bài Làm Từng Câu */}
                      {detail.images && detail.images.length > 0 && (
                        <div>
                           <label className="block text-sm font-semibold text-zinc-700 mb-2">Ảnh bài làm của học sinh:</label>
                           <div className="flex gap-3 flex-wrap">
                              {detail.images.map((img: string, imgIdx: number) => (
                                 <div key={imgIdx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 shadow-sm group">
                                    <img src={img} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage(img)} title="Phóng to" />
                                 </div>
                              ))}
                           </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Lời phê của Giáo viên (AI đã sinh):</label>
                        <textarea
                          rows={4}
                          value={detail.feedback}
                          onChange={(e) => handleDetailChange(i, 'feedback', e.target.value)}
                          className="w-full p-3 text-sm text-zinc-700 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                        />
                      </div>

                      {/* AI Regrading Action */}
                      <div className="mt-2 pt-3 border-t border-dashed border-zinc-200">
                        <button 
                          onClick={() => setActiveAIBox(activeAIBox === i ? null : i)}
                          className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Bot className="w-4 h-4" /> 
                          {activeAIBox === i ? "Đóng Phòng Mổ AI" : "Chấm lại câu này bằng Lệnh AI (Prompt)"}
                        </button>

                        {/* AI Box Content */}
                        {activeAIBox === i && (
                          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                            
                            {/* Chọn ảnh */}
                            <div>
                              <p className="text-xs font-bold text-indigo-800 mb-2 uppercase flex items-center gap-1"><ImageIcon className="w-3 h-3"/> 1. CHỌN ẢNH BÀI LÀM ĐỂ AI ĐỌC</p>
                              {!(detail.images && detail.images.length > 0) && images.length === 0 ? (
                                <p className="text-sm text-red-500 italic">Không có ảnh để chọn.</p>
                              ) : (
                                <div className="flex gap-2 flex-wrap">
                                  {((detail.images && detail.images.length > 0) ? detail.images : images).map((img: string, imgIdx: number) => {
                                    const isSelected = selectedImageUrls.includes(img);
                                    return (
                                      <div key={imgIdx} className="flex flex-col items-center gap-1">
                                        <div 
                                          className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all group ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-zinc-200 opacity-80 hover:opacity-100'}`}
                                        >
                                          <img src={img} className="w-full h-full object-cover cursor-pointer" onClick={() => setZoomedImage(img)} title="Bấm để Phóng to" />
                                          <div className="absolute top-0 right-0 bg-white/90 rounded-bl-lg p-0.5">
                                            <input 
                                               type="checkbox" 
                                               checked={isSelected}
                                               onChange={() => toggleImageSelection(img)}
                                               className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer block"
                                            />
                                          </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Ảnh {imgIdx + 1}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Lời nhắc */}
                            <div>
                              <p className="text-xs font-bold text-indigo-800 mb-2 uppercase">2. NHẬP LỆNH CHẤM (PROMPT)</p>
                              <textarea
                                placeholder="Ví dụ: Chấm chước cho lỗi trình bày, tập trung vào kết quả..."
                                rows={2}
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="w-full p-3 text-sm text-zinc-800 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <button 
                              onClick={() => handleCustomAIGrade(i, detail)}
                              disabled={isAIGrading}
                              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-bold shadow hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isAIGrading ? (
                                <><RefreshCw className="w-5 h-5 animate-spin" /> Đang phân tích...</>
                              ) : (
                                <><Send className="w-4 h-4" /> GỬI GEMINI CHẤM NHÁP</>
                              )}
                            </button>
                            <p className="text-[10px] text-center text-indigo-400 italic">Kết quả nháp sẽ được đè tự động vào Lời phê & Điểm ở trên.</p>

                            {/* Chấm thủ công khi nghẽn mạng */}
                            <div className="mt-2 pt-4 border-t border-indigo-200">
                              <p className="text-[11px] font-bold text-indigo-800 mb-2 uppercase">Trường hợp Cổng AI Nội bộ Hết Dung Lượng:</p>
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => copyToClipboard(generateManualPrompt(detail))}
                                  className="w-full py-2 bg-white text-indigo-700 border border-indigo-300 rounded-lg font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                  <Copy className="w-4 h-4" /> SAO CHÉP LỆNH CHẤM CHUẨN
                                </button>
                                <div className="text-[11px] text-zinc-600 bg-white/50 p-2 rounded border border-indigo-100">
                                  <strong>Phương án dự phòng:</strong> 1. Xem to ảnh bài làm, nhấp chuột phải chọn "Sao chép hình ảnh". 2. Bấm nút Sao Chép Lệnh ở trên. 3. Mở tab web <a href="https://gemini.google.com" target="_blank" className="text-blue-600 underline font-semibold">gemini.google.com</a>, dán Ảnh + Lệnh vào và yêu cầu Gemini chấm giúp.
                                </div>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Image Viewer */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition">
             <X className="w-8 h-8" />
          </button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
