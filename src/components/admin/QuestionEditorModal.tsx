import React, { useState, useEffect, useRef } from "react";
import { X, Save, Image as ImageIcon, Trash, Wand2, Crop, UploadCloud, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ReactCrop, { type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface QuestionData {
  temp_id?: string;
  question_id?: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
  question_type: string;
  difficulty: string;
  content: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
  explanation: string;
  image_url?: string;
  isDuplicate?: boolean;
  duplicateId?: string;
}

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionData | null;
  onSave: (updatedQuestion: QuestionData) => void;
}

export default function QuestionEditorModal({ isOpen, onClose, question, onSave }: QuestionEditorModalProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState<QuestionData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop & Upload State
  const [crop, setCrop] = useState<CropType>();
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Category Enforcement State
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryWarning, setIsCategoryWarning] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('question_categories').select('*');
    if (data) setCategories(data);
  };

  useEffect(() => {
    if (question && isOpen) {
      setFormData({ ...question });
    }
  }, [question, isOpen]);

  useEffect(() => {
    if (formData?.math_form && categories.length > 0) {
      const exists = categories.some(c => 
        c.math_form.toLowerCase() === formData.math_form.trim().toLowerCase()
      );
      setIsCategoryWarning(!exists);
    } else {
      setIsCategoryWarning(false);
    }
  }, [formData?.math_form, categories]);

  const handleQuickAddCategory = async () => {
    if (!formData?.grade || !formData?.subject || !formData?.topic || !formData?.math_form) {
      return alert("Vui lòng nhập đủ Lớp, Phân môn, Chuyên đề và Dạng toán để tạo Danh mục!");
    }
    setIsAddingCategory(true);
    try {
      const { error } = await supabase.from('question_categories').insert([{
        grade: formData.grade.trim(),
        subject: formData.subject.trim(),
        topic: formData.topic.trim(),
        lesson: formData.lesson?.trim() || "",
        math_form: formData.math_form.trim()
      }]);
      if (error) throw error;
      alert("Đã thêm Dạng toán vào Danh mục thành công!");
      fetchCategories();
    } catch(e: any) {
      alert("Lỗi: " + e.message);
    }
    setIsAddingCategory(false);
  };

  const uploadImageToSupabase = async (file: File) => {
    try {
      setIsUploading(true);
      const filePath = `questions/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('lesson_images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
      handleChange('image_url', publicUrl);
    } catch (e: any) {
      alert("Lỗi tải ảnh: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageToSupabase(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) uploadImageToSupabase(file);
        break;
      }
    }
  };

  const getCroppedImgBlob = async () => {
    if (!imgRef.current || !crop) return null;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width, crop.height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  };

  const handleCropAndUpload = async () => {
    try {
      const blob = await getCroppedImgBlob();
      if (!blob) throw new Error("Lỗi cắt ảnh");
      const file = new File([blob], `crop_${Date.now()}.png`, { type: 'image/png' });
      await uploadImageToSupabase(file);
      setIsCropping(false);
    } catch(e: any) {
      alert(e.message);
    }
  };

  const removeImage = () => {
    handleChange('image_url', '');
  };

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof QuestionData, value: string) => {
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleSave = () => {
    if (formData) onSave(formData);
    onClose();
  };

  const handleFixLatex = () => {
    if (!formData) return;
    const fixText = (text: string) => {
      if (!text) return text;
      let s = String(text);
      s = s.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');
      s = s.replace(/(?<!\\)begincases/g, '\\begin{cases}').replace(/(?<!\\)endcases/g, '\\end{cases}');
      s = s.replace(/\\\\\\\\/g, '\\\\');
      s = s.replace(/\\prime/g, "'");
      s = s.replace(/(?<!\\)rightarrow/g, "\\rightarrow");
      s = s.replace(/textAl/g, "\\text{Al}");
      s = s.replace(/textO/g, "\\text{O}");
      s = s.replace(/(?<!\$)\\begin\{cases\}/g, '$\\begin{cases}');
      s = s.replace(/\\end\{cases\}(?!\$)/g, '\\end{cases}$');
      return s;
    };

    setFormData(prev => {
        if (!prev) return prev;
        return {
            ...prev,
            content: fixText(prev.content),
            answer_a: fixText(prev.answer_a),
            answer_b: fixText(prev.answer_b),
            answer_c: fixText(prev.answer_c),
            answer_d: fixText(prev.answer_d),
            explanation: fixText(prev.explanation)
        };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onPaste={handlePaste}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-indigo-50/50">
          <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-600" /> Chỉnh sửa Chi tiết Câu hỏi
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleFixLatex} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-lg text-xs transition-colors border border-purple-200">
               <Wand2 className="w-3.5 h-3.5" />
               Sửa lỗi LaTeX
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex gap-6">
          
          {/* Cột trái: Phân loại */}
          <div className="w-1/3 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-700 border-b pb-2 text-sm uppercase tracking-wider">Phân loại</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Lớp</label>
                  <input value={formData.grade} onChange={e => handleChange('grade', e.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Phân môn</label>
                  <input value={formData.subject} onChange={e => handleChange('subject', e.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Chuyên đề</label>
                <input value={formData.topic} onChange={e => handleChange('topic', e.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tên bài học</label>
                <input value={formData.lesson} onChange={e => handleChange('lesson', e.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Dạng toán</label>
                <input value={formData.math_form} onChange={e => handleChange('math_form', e.target.value)} className={`w-full border rounded p-2 text-sm outline-none focus:border-indigo-500 ${isCategoryWarning ? 'border-yellow-400 bg-yellow-50/50' : ''}`} />
                {isCategoryWarning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 leading-relaxed">
                    Dạng toán này chưa có trong Khung Ngân hàng đề. 
                    <button onClick={handleQuickAddCategory} disabled={isAddingCategory} className="text-blue-600 font-bold ml-1 hover:underline whitespace-nowrap">
                      {isAddingCategory ? "Đang thêm..." : "Bấm để Thêm nhanh"}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Dạng thức</label>
                  <select value={formData.question_type} onChange={e => handleChange('question_type', e.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500">
                    <option value="NLC">Trắc nghiệm</option><option value="DS">Đúng/Sai</option><option value="TLN">Trả lời ngắn</option><option value="TL">Tự luận</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Mức độ</label>
                  <select value={formData.difficulty} onChange={e => handleChange('difficulty', e.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500">
                    <option value="1">1-Nhận biết</option><option value="2">2-Thông hiểu</option><option value="3">3-Vận dụng</option><option value="4">4-VD Cao</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <label className="text-xs font-bold text-emerald-800 mb-1 block uppercase tracking-wider">Đáp án đúng</label>
              <input value={formData.correct_answer} onChange={e => handleChange('correct_answer', e.target.value)} className="w-full border-2 border-emerald-300 rounded p-3 text-lg font-bold text-emerald-700 outline-none focus:border-emerald-500" placeholder="A, B, C, D hoặc ĐĐSĐ..." />
            </div>
          </div>

          {/* Cột phải: Nội dung */}
          <div className="w-2/3 space-y-4 flex flex-col">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wider flex justify-between">
                Nội dung câu hỏi <span className="text-orange-500 lowercase normal-case font-bold">Hỗ trợ LaTeX $...$</span>
              </label>
              
              <textarea 
                value={formData.content} onChange={e => handleChange('content', e.target.value)} 
                className="w-full h-32 p-3 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none mb-4"
              />

              {/* Image Dropzone UI like Old App */}
              <div 
                onClick={() => !formData.image_url && fileInputRef.current?.click()}
                className={`relative w-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors
                  ${formData.image_url ? 'border-emerald-300 bg-emerald-50/20' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer'}`}
              >
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                
                {isUploading && !isCropping && (
                  <div className="absolute inset-0 z-20 bg-white/80 flex items-center justify-center backdrop-blur-sm rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                )}

                {formData.image_url ? (
                  <div className="relative p-2 w-full flex flex-col items-center">
                    {isCropping ? (
                      <div className="w-full relative flex flex-col items-center">
                        <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                          <img ref={imgRef} src={formData.image_url} alt="Preview" className="max-h-[300px] object-contain rounded shadow" crossOrigin="anonymous" />
                        </ReactCrop>
                        <div className="mt-3 flex gap-2 w-full max-w-sm">
                          <button onClick={(e) => { e.stopPropagation(); setIsCropping(false); }} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">Hủy</button>
                          <button onClick={(e) => { e.stopPropagation(); handleCropAndUpload(); }} disabled={isUploading} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />} Cắt & Thay thế
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <img src={formData.image_url} alt="Preview" className="max-h-[200px] object-contain rounded" />
                        <button onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow hover:bg-red-600 transition-colors z-10">
                          <Trash className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <UploadCloud className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
                    <p className="text-sm font-bold text-gray-600">Click, Kéo thả, hoặc <span className="text-indigo-600">Ctrl+V</span> để dán ảnh</p>
                    <p className="text-xs text-gray-400 mt-1">Ảnh sẽ tự động tải lên mây. Bạn có thể cắt lại nếu cần.</p>
                  </div>
                )}
              </div>

              {/* Buttons below Image */}
              {formData.image_url && !isCropping && (
                <div className="flex gap-3 mt-3">
                  <button onClick={() => setIsCropping(true)} className="flex items-center justify-center gap-2 flex-1 py-2 border border-emerald-600 text-emerald-700 font-bold text-sm rounded-lg hover:bg-emerald-50 transition-colors">
                    <Crop className="w-4 h-4" /> Cắt xén lại ảnh gốc
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map((opt) => {
                const fieldName = `option_${opt.toLowerCase()}` as keyof QuestionData;
                return (
                  <div key={opt} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-800 rounded flex items-center justify-center font-bold text-sm">{opt}</span>
                    </div>
                    <textarea 
                      value={formData[fieldName] as string} onChange={e => handleChange(fieldName, e.target.value)}
                      className="w-full h-16 p-2 border rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm resize-none"
                    />
                  </div>
                )
              })}
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wider">Lời giải chi tiết</label>
              <textarea 
                value={formData.explanation} onChange={e => handleChange('explanation', e.target.value)} 
                className="w-full h-24 p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Hủy</button>
          <button onClick={handleSave} className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md flex items-center gap-2">
            <Save className="w-4 h-4" /> Lưu thay đổi
          </button>
        </div>

      </div>
    </div>
  );
}
