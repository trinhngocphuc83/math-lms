"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ArrowLeft, Save, Sparkles, UploadCloud, Trash2, Edit2, Loader2, Image as ImageIcon, CheckCircle, Type, Image as LucideImage, CropIcon } from "lucide-react";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function AIQuestionEditorPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'prompt' | 'file'>('prompt');
  const [prompt, setPrompt] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isUploadingCrop, setIsUploadingCrop] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('question_categories').select('*');
    if (data) setCategories(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const generateAIQuestions = async () => {
    if (activeTab === 'prompt' && !prompt.trim()) return alert("Vui lòng nhập yêu cầu!");
    if (activeTab === 'file' && !uploadedFile) return alert("Vui lòng tải lên file đề thi hoặc ảnh!");

    setIsGenerating(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chưa cấu hình API Key Gemini!");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use 1.5 flash for both text and vision

      const categoryListText = categories.map(c => `- Lớp: ${c.grade}, Phân môn: ${c.subject}, Chuyên đề: ${c.topic}, Tên bài: ${c.lesson}, Dạng toán: ${c.math_form}`).join('\n');

      const systemPrompt = `Bạn là chuyên gia Toán học xuất sắc. Nhiệm vụ của bạn là tạo ra (hoặc bóc tách từ ảnh) các câu hỏi trắc nghiệm/tự luận môn Toán.
RẤT QUAN TRỌNG: Bạn PHẢI phân loại câu hỏi vào ĐÚNG một trong các Dạng toán sau đây. KHÔNG ĐƯỢC TỰ BỊA RA TÊN DẠNG TOÁN MỚI:
${categoryListText}

Đối với phần lời giải (explanation), BẮT BUỘC PHẢI CHIA LÀM 2 PHẦN:
Phương pháp giải:
[Nêu ngắn gọn phương pháp]

Lời giải:
[Giải chi tiết]

Bạn PHẢI trả về ĐÚNG MỘT MẢNG JSON thuần túy (Array of Objects), không kèm markdown \`\`\`json, không kèm text thừa. 
Cấu trúc mỗi object:
{
  "grade": "12", "subject": "Đại số", "topic": "...", "lesson": "...", "math_form": "...",
  "question_type": "NLC", // NLC (Nhiều lựa chọn), DS (Đúng Sai), TLN (Trả lời ngắn), TL (Tự luận)
  "difficulty": "1", // 1 đến 4
  "content": "Nội dung câu hỏi (dùng LaTeX $...$ hoặc $$...$$ cho công thức)",
  "option_a": "", "option_b": "", "option_c": "", "option_d": "",
  "correct_answer": "A",
  "explanation": "Phương pháp giải:\n...\n\nLời giải:\n..."
}`;

      let result;
      if (activeTab === 'prompt') {
        result = await model.generateContent([systemPrompt, `Yêu cầu tạo câu hỏi: ${prompt}`]);
      } else {
        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(uploadedFile!);
        });
        const base64Data = await base64Promise;
        const base64Content = base64Data.split(',')[1];

        const imagePart = {
          inlineData: {
            data: base64Content,
            mimeType: uploadedFile!.type
          }
        };
        result = await model.generateContent([systemPrompt, "Hãy bóc tách toàn bộ câu hỏi trong ảnh/file này.", imagePart]);
      }

      const text = result.response.text();
      // Clean JSON
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/```json/g, '');
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/```/g, '');
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("AI không trả về mảng dữ liệu.");

      const withIds = parsed.map((q: any) => ({
        ...q,
        temp_id: `AI_CH_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        question_id: `CH_NEW_${Date.now()}_${Math.random().toString(36).substring(7)}`
      }));

      // KIỂM TRA TRÙNG LẶP
      const cleanString = (str: string) => {
        if (!str) return "";
        // Xóa khoảng trắng, dấu $, dấu \, dấu ngoặc, dấu *, và đưa về chữ thường
        return str.replace(/\s+/g, '').replace(/[\$\\\{\}\*]/g, '').toLowerCase();
      };

      const { data: existingQData } = await supabase.from('questions').select('question_id, content');
      const existingQs = existingQData || [];

      const finalParsed = withIds.map((q: any) => {
        const cleanedContent = cleanString(q.content);
        const duplicate = existingQs.find(eq => cleanString(eq.content) === cleanedContent);
        if (duplicate) {
          return { ...q, isDuplicate: true, duplicateOf: duplicate.question_id };
        }
        return q;
      });

      setGeneratedQuestions(prev => [...prev, ...finalParsed]);
      setPrompt("");
      setUploadedFile(null);
      setFilePreviewUrl(null);
    } catch (e: any) {
      console.error(e);
      alert("Lỗi AI: " + e.message + "\n(Vui lòng thử lại hoặc mô tả rõ hơn)");
    }
    setIsGenerating(false);
  };

  const handleSaveModal = (updatedQ: any) => {
    if (editingIndex !== null) {
      const newArr = [...generatedQuestions];
      newArr[editingIndex] = updatedQ;
      setGeneratedQuestions(newArr);
    }
    setEditingIndex(null);
    setEditingQuestion(null);
  };

  const removeQuestion = (idx: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBulkSave = async () => {
    if (generatedQuestions.length === 0) return;
    try {
      const { error } = await supabase.from('questions').insert(
        generatedQuestions.map(q => {
          const { temp_id, isDuplicate, duplicateOf, ...rest } = q;
          return rest;
        })
      );
      if (error) throw error;
      alert(`Đã lưu thành công ${generatedQuestions.length} câu hỏi vào Ngân hàng!`);
      router.push('/admin/questions');
    } catch (e: any) {
      alert("Lỗi lưu DB: " + e.message);
    }
  };

  const duplicatesCount = generatedQuestions.filter(q => q.isDuplicate).length;

  const handleRemoveDuplicates = () => {
    if (confirm(`Bạn có chắc chắn muốn xóa bỏ ${duplicatesCount} câu hỏi bị trùng lặp khỏi danh sách này không?`)) {
      setGeneratedQuestions(prev => prev.filter(q => !q.isDuplicate));
    }
  };

  const getCroppedImg = async () => {
    if (!imgRef.current || !crop) return null;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleCropAndUpload = async () => {
    try {
      setIsUploadingCrop(true);
      const blob = await getCroppedImg();
      if (!blob) throw new Error("Lỗi cắt ảnh");

      const file = new File([blob], `crop_${Date.now()}.png`, { type: 'image/png' });
      const filePath = `questions/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from('lesson_images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
      
      navigator.clipboard.writeText(publicUrl);
      alert(`Đã tải ảnh lên mây thành công!\nLink đã được copy vào khay nhớ tạm.\nGiờ Thầy/Cô có thể bấm Sửa 1 câu hỏi và dán link này (hoặc thẻ ![Hình](${publicUrl})) vào Nội dung/Lời giải.`);
      setIsCropping(false);
    } catch(e: any) {
      alert("Lỗi tải ảnh: " + e.message);
    } finally {
      setIsUploadingCrop(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/questions" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-500" /> Thêm hàng loạt (AI Generator)
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Sinh câu hỏi tự động và bóc tách từ file đề thi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {duplicatesCount > 0 && (
            <button 
              onClick={handleRemoveDuplicates}
              className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm"
            >
              <Trash2 className="w-5 h-5" /> Bỏ {duplicatesCount} câu trùng
            </button>
          )}
          <button 
            onClick={handleBulkSave}
            disabled={generatedQuestions.length === 0}
            className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm"
          >
            <Save className="w-5 h-5" /> Lưu {generatedQuestions.length > 0 ? generatedQuestions.length : ''} câu vào Kho
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Input */}
        <div className="w-[450px] border-r border-gray-200 bg-white flex flex-col h-full overflow-y-auto z-10 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4 uppercase tracking-wider text-sm">1. Cung cấp Dữ liệu Đầu vào</h2>
            
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setActiveTab('prompt')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'prompt' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Type className="w-4 h-4" /> Nhập Yêu Cầu
              </button>
              <button 
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LucideImage className="w-4 h-4" /> Tải Ảnh/File
              </button>
            </div>

            {activeTab === 'prompt' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                <p className="text-sm text-gray-500 font-medium">Viết câu lệnh mô tả chi tiết nội dung, số lượng và độ khó của câu hỏi bạn muốn AI tạo ra.</p>
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Ví dụ: Tạo 5 câu trắc nghiệm về Khảo sát hàm số (cực trị, đơn điệu), mức độ Vận dụng. Cần có lời giải chi tiết..."
                  className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-gray-800 resize-none transition-all"
                />
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <p className="text-sm text-gray-500 font-medium">Tải lên ảnh chụp đề thi (Hình học, đồ thị) hoặc file Word/PDF. AI sẽ dùng OCR để bóc tách toàn bộ câu hỏi.</p>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all hover:border-indigo-400 group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 mb-3 transition-colors" />
                    <p className="text-sm text-gray-500 font-bold mb-1"><span className="text-indigo-600">Bấm để tải lên</span> hoặc Kéo thả file</p>
                    <p className="text-xs text-gray-400">PNG, JPG, PDF, DOCX (Max 10MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*, .pdf, .docx" onChange={handleFileUpload} />
                </label>
                {uploadedFile && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span className="text-sm font-bold text-emerald-800 truncate">{uploadedFile.name}</span>
                    </div>
                    <button onClick={() => { setUploadedFile(null); setFilePreviewUrl(null); }} className="text-red-500 p-1 hover:bg-red-100 rounded-md">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={generateAIQuestions}
              disabled={isGenerating || (activeTab === 'prompt' && !prompt) || (activeTab === 'file' && !uploadedFile)}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? "AI đang xử lý..." : "Bắt đầu Sinh / Bóc tách bằng AI"}
            </button>
          </div>

          {/* Manual Crop Tool Section */}
          {activeTab === 'file' && filePreviewUrl && (
            <div className="p-6 border-t border-gray-100 bg-blue-50/30 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-blue-900 uppercase tracking-wider text-sm flex items-center gap-2">
                  <CropIcon className="w-4 h-4 text-blue-600" /> Cắt Ảnh Thủ công
                </h2>
                <button onClick={() => setIsCropping(!isCropping)} className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 shadow-sm transition-colors">
                  {isCropping ? "Tắt cắt ảnh" : "Bật chế độ Cắt"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Nếu AI quét trượt hình vẽ/đồ thị, hãy khoanh vùng hình vẽ ở đây để tải lên và lấy Link ảnh chèn trực tiếp vào câu hỏi.
              </p>
              
              <div className="border border-gray-300 bg-white rounded-xl overflow-hidden shadow-sm relative">
                {isCropping ? (
                  <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                    <img ref={imgRef} src={filePreviewUrl} alt="Upload preview" className="w-full object-contain" />
                  </ReactCrop>
                ) : (
                  <img src={filePreviewUrl} alt="Upload preview" className="w-full object-contain opacity-80" />
                )}
              </div>
              
              {isCropping && crop && crop.width > 0 && (
                <button 
                  onClick={handleCropAndUpload}
                  disabled={isUploadingCrop}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition-all shadow-sm text-sm"
                >
                  {isUploadingCrop ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Tải vùng chọn lên & Copy Link
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Content - Preview List */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          {generatedQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Bot className="w-24 h-24 text-gray-400 mb-6" />
              <h2 className="text-2xl font-black text-gray-500 mb-2">Chưa có dữ liệu</h2>
              <p className="text-gray-400 font-medium max-w-sm text-center">Hãy nhập yêu cầu hoặc tải file lên ở cột bên trái để AI tự động sinh câu hỏi và bóc tách dữ liệu cho bạn nhé!</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto pb-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">2. Kiểm duyệt Câu hỏi ({generatedQuestions.length})</h2>
                <p className="text-sm text-gray-500">Hãy đọc lại và bấm Sửa để tinh chỉnh nội dung nếu cần.</p>
              </div>

              {generatedQuestions.map((q, idx) => (
                <div key={q.temp_id} className={`bg-white rounded-2xl shadow-sm border ${q.isDuplicate ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-indigo-300'} overflow-hidden group hover:shadow-md transition-all`}>
                  {q.isDuplicate && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 border-b border-red-200 text-sm font-bold flex items-center gap-2">
                      <span className="text-lg">⚠️</span> CẢNH BÁO: Câu này đã tồn tại trong Ngân hàng (Mã gốc: {q.duplicateOf}). Hãy bấm nút "Bỏ câu trùng" ở phía trên để loại bỏ!
                    </div>
                  )}
                  <div className="bg-gray-50/80 border-b border-gray-100 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">{idx + 1}</span>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{q.topic} - {q.math_form}</div>
                        <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                          <span className="bg-emerald-100 text-emerald-800 px-2 rounded-sm font-bold">{q.question_type}</span>
                          <span>Lớp {q.grade} • {q.subject} • Mức {q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingIndex(idx); setEditingQuestion(q); }} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-bold flex items-center gap-2 text-sm shadow-sm">
                        <Edit2 className="w-4 h-4" /> Sửa
                      </button>
                      <button onClick={() => removeQuestion(idx)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="prose prose-sm max-w-none text-gray-800 font-medium mb-6 prose-p:my-1">
                      <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                        {q.content || ""}
                      </ReactMarkdown>
                    </div>
                    
                    {q.question_type === 'NLC' && (
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const val = q[`option_${opt.toLowerCase()}`];
                          const isCorrect = q.correct_answer === opt;
                          return (
                            <div key={opt} className={`p-3 rounded-xl border-2 flex gap-3 items-start ${isCorrect ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50 border-gray-100'}`}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{opt}</span>
                              <div className="prose prose-sm max-w-none mt-0.5"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{val || ""}</ReactMarkdown></div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                      <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2 block">Lời giải chi tiết</span>
                      <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-1">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                          {q.explanation || ""}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QuestionEditorModal
        isOpen={!!editingQuestion}
        onClose={() => { setEditingIndex(null); setEditingQuestion(null); }}
        question={editingQuestion}
        onSave={handleSaveModal}
      />
    </div>
  );
}

// Thêm icon Bot bị thiếu ở trên
function Bot(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  );
}
