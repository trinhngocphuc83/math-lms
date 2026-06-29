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

  const [showGlobalAIBox, setShowGlobalAIBox] = useState(false);
  const [globalCustomPrompt, setGlobalCustomPrompt] = useState<string>('');
  const [globalSelectedImages, setGlobalSelectedImages] = useState<string[]>([]);
  const [isCopyingImages, setIsCopyingImages] = useState(false);

  useEffect(() => {
    if (isOpen && resultData) {
      const initialAnswers = resultData.answers || { globalImages: [], gradingDetails: [] };
      setAnswers(initialAnswers);
      setEditedScore(resultData.score || 0);
      setSelectedImageUrls(initialAnswers.globalImages || []);
    }
  }, [isOpen, resultData]);

  // Khởi tạo danh sách ảnh chọn khi mở Global AI Box
  useEffect(() => {
    if (showGlobalAIBox) {
      // allImages is not computed yet here, but we can compute it on the fly
      const images = answers?.globalImages || [];
      const gradingDetails = answers?.gradingDetails || [];
      const ai = Array.from(new Set([
        ...images,
        ...gradingDetails.flatMap((d: any) => d.images || [])
      ]));
      setGlobalSelectedImages(ai);
    }
  }, [showGlobalAIBox, answers]);

  if (!isOpen || !resultData) return null;

  const images = answers?.globalImages || [];
  const gradingDetails = answers?.gradingDetails || [];
  const allImages = Array.from(new Set([
    ...images,
    ...gradingDetails.flatMap((d: any) => d.images || [])
  ]));

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

  const generateGlobalManualPrompt = () => {
    let prompt = `Bạn là Giám khảo chấm thi chuyên nghiệp.
Hãy chấm toàn bộ bài làm tự luận (các hình ảnh đính kèm) của học sinh dựa trên Đề bài và Đáp án mẫu/Barem dưới đây.
Đề thi gồm nhiều câu tự luận.

[LỆNH ĐẶC BIỆT TỪ GIÁO VIÊN]: "${globalCustomPrompt || 'Chấm kỹ từng bước, đối chiếu chặt chẽ với barem.'}"

NHIỆM VỤ CỦA BẠN:
1. Đọc kỹ từng câu hỏi và đáp án mẫu/barem.
2. Tìm và đọc phần bài làm của học sinh trong các ảnh đính kèm tương ứng với từng câu.
3. Chấm điểm từng câu một cách công tâm, chỉ ra rõ học sinh sai ở bước nào, đúng ở bước nào.
4. Cho điểm từng câu (không được vượt quá số điểm tối đa của câu đó).
5. Cuối cùng, phải có phần TỔNG KẾT ĐIỂM: tính tổng số điểm học sinh đạt được trên tổng số điểm tối đa của toàn bài tự luận.

--- DANH SÁCH CÁC CÂU HỎI TỰ LUẬN ---\n\n`;

    let totalMaxScore = 0;
    gradingDetails.forEach((detail: any, index: number) => {
      const maxScore = detail.maxScore || 10;
      totalMaxScore += maxScore;
      prompt += `[CÂU ${index + 1} - Tối đa ${maxScore} điểm]:\n`;
      if (detail.question) prompt += `ĐỀ BÀI: ${detail.question}\n`;
      if (detail.sampleAnswer) prompt += `ĐÁP ÁN MẪU / BAREM: ${detail.sampleAnswer}\n`;
      prompt += `\n`;
    });

    prompt += `Hãy làm theo đúng Nhiệm vụ trên. Lưu ý tổng điểm không được vượt quá ${totalMaxScore} điểm. Trình bày rõ ràng theo từng câu để tôi dễ đối chiếu.`;
    return prompt;
  };

  const copyAllImages = async () => {
    const imagesToCopy = globalSelectedImages.length > 0 ? globalSelectedImages : allImages;
    if (imagesToCopy.length === 0) return alert("Không có ảnh nào để sao chép!");
    
    setIsCopyingImages(true);
    try {
      // 1. Tải tất cả ảnh
      const loadedImages = await Promise.all(imagesToCopy.map(url => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Không thể tải ảnh từ máy chủ."));
          img.src = url;
        });
      }));

      // 2. Tính toán kích thước (Giới hạn chiều rộng để khỏi lỗi)
      const MAX_WIDTH = 1200;
      let totalHeight = 0;
      let maxWidth = 0;
      
      const scaledImages = loadedImages.map(img => {
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        const w = img.width * scale;
        const h = img.height * scale;
        maxWidth = Math.max(maxWidth, w);
        totalHeight += h;
        return { img, w, h };
      });

      // 3. Gộp ảnh bằng Canvas
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ Canvas");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let currentY = 0;
      scaledImages.forEach(({img, w, h}) => {
        const x = (maxWidth - w) / 2;
        ctx.drawImage(img, x, currentY, w, h);
        currentY += h;
      });

      // 4. Ghi vào Clipboard
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error("Lỗi khi tạo ảnh gộp"));
          try {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            alert(`Đã gộp thành công ${imagesToCopy.length} ảnh thành 1 ẢNH DUY NHẤT và copy vào bộ nhớ tạm! Thầy hãy sang Gemini bấm Ctrl+V để dán.`);
            resolve();
          } catch (err) {
            reject(err);
          }
        }, "image/png", 0.9);
      });

    } catch (e: any) {
      console.error(e);
      alert("Lỗi sao chép: " + e.message + "\nTrình duyệt của Thầy có thể chặn tính năng này, vui lòng sao chép thủ công từng ảnh.");
    } finally {
      setIsCopyingImages(false);
    }
  };

  const toggleGlobalImageSelection = (url: string) => {
    setGlobalSelectedImages(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
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
                  onClick={() => setShowGlobalAIBox(!showGlobalAIBox)}
                  className={`px-4 py-2 border rounded-xl font-semibold transition-colors text-sm flex items-center gap-2 ${showGlobalAIBox ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                 >
                   <Bot className="w-4 h-4" />
                   {showGlobalAIBox ? "Đóng vùng chấm AI" : "Chấm toàn bài bằng Gemini"}
                 </button>
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

            {/* Global AI Box */}
            {showGlobalAIBox && (
              <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-6 h-6 text-indigo-600" />
                  <h3 className="font-black text-lg text-indigo-900">Trạm Chấm Toàn Bài bằng Gemini (Thủ công)</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cột trái: Hình ảnh */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-bold text-indigo-800 uppercase flex items-center gap-1"><ImageIcon className="w-4 h-4"/> BƯỚC 1: SAO CHÉP ẢNH BÀI LÀM</p>
                      {allImages.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Đã chọn: {globalSelectedImages.length}/{allImages.length}</span>
                          <button onClick={() => setGlobalSelectedImages(globalSelectedImages.length === allImages.length ? [] : allImages)} className="text-xs font-bold text-blue-600 hover:underline">
                            {globalSelectedImages.length === allImages.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                          </button>
                        </div>
                      )}
                    </div>
                    {allImages.length === 0 ? (
                      <p className="text-sm text-red-500 italic">Không có ảnh nào trong bài làm này.</p>
                    ) : (
                      <div className="flex gap-3 flex-wrap max-h-64 overflow-y-auto p-2">
                        {allImages.map((img: string, imgIdx: number) => {
                          const isSelected = globalSelectedImages.includes(img);
                          return (
                            <div key={imgIdx} className="flex flex-col items-center gap-1">
                              <div className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 transition-all group ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-zinc-200 opacity-80 hover:opacity-100'}`}>
                                <img src={img} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage(img)} title="Phóng to" />
                                <div className="absolute top-0 right-0 bg-white/90 rounded-bl-lg p-0.5">
                                  <input 
                                     type="checkbox" 
                                     checked={isSelected}
                                     onChange={() => toggleGlobalImageSelection(img)}
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
                    <button 
                      onClick={copyAllImages}
                      disabled={isCopyingImages}
                      className="w-full mt-2 py-2.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCopyingImages ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} 
                      {isCopyingImages ? 'Đang gộp ảnh...' : `Sao chép ${globalSelectedImages.length > 0 ? globalSelectedImages.length : 'tất cả'} Ảnh`}
                    </button>
                    <p className="text-[11px] text-zinc-500 italic text-center mt-2">Mẹo: Hệ thống sẽ tự động ghép các ảnh Thầy chọn thành 1 ảnh dài duy nhất để copy, giúp lách luật giới hạn 10 ảnh của Gemini.</p>
                  </div>

                  {/* Cột phải: Lệnh */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
                    <p className="text-sm font-bold text-indigo-800 uppercase flex items-center gap-1"><Send className="w-4 h-4"/> BƯỚC 2: TẠO VÀ SAO CHÉP LỆNH CHẤM</p>
                    
                    <textarea
                      placeholder="Lệnh bổ sung (Tùy chọn). Ví dụ: Chấm nương tay, tập trung vào phương pháp làm..."
                      rows={2}
                      value={globalCustomPrompt}
                      onChange={(e) => setGlobalCustomPrompt(e.target.value)}
                      className="w-full p-3 text-sm text-zinc-800 border-2 border-indigo-100 rounded-lg focus:border-indigo-400 focus:ring-0"
                    />

                    <button 
                      onClick={() => copyToClipboard(generateGlobalManualPrompt())}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-5 h-5" /> SAO CHÉP LỆNH CHẤM (PROMPT) CHUẨN
                    </button>
                    
                    <div className="text-xs text-zinc-600 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed">
                      <strong>Hướng dẫn:</strong><br/>
                      1. Mở trang <a href="https://gemini.google.com" target="_blank" className="text-blue-600 underline font-bold">gemini.google.com</a><br/>
                      2. Dán Ảnh (Ctrl+V) vào khung chat.<br/>
                      3. Dán Lệnh Chấm (Ctrl+V) vào cùng khung chat và nhấn Gửi.<br/>
                      4. Đợi Gemini chấm xong rồi copy điểm & lời phê quay lại đây nhập bằng tay.
                    </div>
                  </div>
                </div>
              </div>
            )}

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
