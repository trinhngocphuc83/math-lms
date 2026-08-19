"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { chuanHoaNguonThanhAnh, laFilePdf } from "@/utils/pdfToImages";
import { goiGeminiTrenTrinhDuyet, layCauHinhAI } from "@/utils/geminiBrowser";
import { 
  ArrowLeft, Image as ImageIcon, Trash2, Code2, Bot, Eye, Search,
  Wand2, AlertCircle, Loader2, Copy, SaveAll, Edit, Trash, CloudUpload, X, Save, Info, Plus,
  Layers, ChevronRight, FileDown
} from "lucide-react";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import QuestionPreviewModal from "@/components/admin/QuestionPreviewModal";
import { exportQuestionsToWord } from "@/utils/exportDocx";
import { targetFormatPrompt, CORRECT_ANSWER_FORMAT_HINT } from "@/utils/questionTypes";


const cleanJsonString = (str: string) => {
  return str.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
};

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
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  image_url?: string;
  isDuplicate?: boolean;
  duplicateId?: string;
  isNewLesson?: boolean;
  isNewMathForm?: boolean;
  parent_id?: string;
}

interface BaseQuestion extends QuestionData {
  target_count: number;
  target_difficulty: string;
  target_format: string;
  context_mode: string;
  generatedVariants: QuestionData[];
  isGenerating: boolean;
}

export default function SimilarGeneratorPage() {
  const router = useRouter();
  const supabase = createClient();

  // Settings & Context
  const [globalGrade, setGlobalGrade] = useState("12");
  const [globalSubject, setGlobalSubject] = useState("Đại số");
  const [globalTopics, setGlobalTopics] = useState<string[]>([]);
  const [globalLesson, setGlobalLesson] = useState("");
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  // AI Scanning States (For Base Question)
  const [isScanningBase, setIsScanningBase] = useState(false);
  const [aiImageFiles, setAiImageFiles] = useState<File[]>([]);
  // Lời nhắc trong lúc dựng trang PDF thành ảnh, để không tưởng là máy bị treo.
  const [dangDungPdf, setDangDungPdf] = useState('');
  const [manualJsonInput, setManualJsonInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiTab, setAiTab] = useState<"api" | "manual" | "free">("api");
  const [freePromptInput, setFreePromptInput] = useState("");

  // Questions List States
  const [baseQuestions, setBaseQuestions] = useState<BaseQuestion[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Edit Modal States
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [previewingQuestion, setPreviewingQuestion] = useState<QuestionData | null>(null);
  
  // Categories
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('question_categories').select('*').then(({data}) => {
      if(data) setCategories(data);
    });
  }, []);

  const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !globalGrade || c.grade === globalGrade).map(c => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject)).map(c => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (globalTopics.length === 0 || globalTopics.includes(c.topic))).map(c => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (globalTopics.length === 0 || globalTopics.includes(c.topic)) && (!globalLesson || c.lesson === globalLesson)).map(c => c.math_form))).filter(Boolean);


  // Handle AI File upload
  const handleAIPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let newFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
        const file = items[i].getAsFile();
        if (file) newFiles.push(file);
      }
    }
    if (newFiles.length > 0) {
      setAiImageFiles(prev => [...prev, ...newFiles]);
      e.preventDefault();
    }
  };

  /**
   * Nhận tệp nguồn. Tệp PDF được dựng thành từng trang ảnh ngay lúc chọn, nhờ vậy các
   * khâu sau (gửi AI, tự cắt hình minh hoạ, cắt tay) chỉ còn phải làm việc với ảnh -
   * canvas không vẽ được PDF nên trước đây nạp PDF là mất hẳn phần hình.
   */
  const handleAIFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    e.target.value = '';

    if (!newFiles.some(laFilePdf)) {
      setAiImageFiles(prev => [...prev, ...newFiles]);
      return;
    }

    setDangDungPdf('Đang dựng trang từ tệp PDF...');
    try {
      const anh = await chuanHoaNguonThanhAnh(
        newFiles,
        (moTa) => setDangDungPdf(moTa),
        (f, loi) => alert(`Không đọc được tệp ${f.name}: ${loi}`),
      );
      setAiImageFiles(prev => [...prev, ...anh]);
    } finally {
      setDangDungPdf('');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const processExtractedJson = (rawText: string) => {
    try {
      let jsonStr = rawText;
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      
      if (firstBracket !== -1) {
        jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
      } else {
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1) {
          jsonStr = '[' + jsonStr.substring(firstBrace, lastBrace + 1) + ']';
        } else {
          throw new Error("Không tìm thấy cấu trúc JSON");
        }
      }

      const parsedData = JSON.parse(cleanJsonString(jsonStr));

      const newBaseQuestions: BaseQuestion[] = parsedData.map((data: any) => {
        let qContent = data.noiDung || data.noidung || data.content || data.question || data.deBai || "";
        qContent = qContent.replace(/^(?:(?:Câu|Bài|VD|Ví\s*dụ)\s*\d+[a-zA-Z]?\s*[:.-]?\s*)+/i, "").trim();

        let parsedQuestionType = String(data.loaiCauHoi || data.loai || data.type || "NLC");
        if (parsedQuestionType.toLowerCase().includes("trắc nghiệm")) parsedQuestionType = "NLC";
        else if (parsedQuestionType.toLowerCase().includes("đúng/sai") || parsedQuestionType.toLowerCase().includes("đúng sai") || parsedQuestionType === "DS") parsedQuestionType = "DS";
        else if (parsedQuestionType.toLowerCase().includes("ngắn") || parsedQuestionType === "TLN") parsedQuestionType = "TLN";
        else if (parsedQuestionType.toLowerCase().includes("tự luận") || parsedQuestionType === "essay" || parsedQuestionType === "TL") parsedQuestionType = "TL";
        else if (!["NLC", "DS", "TLN", "TL"].includes(parsedQuestionType)) parsedQuestionType = "NLC";

        return {
          temp_id: `TEMP_BASE_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          grade: data.lop || data.grade || globalGrade || "12",
          subject: data.phanMon || data.subject || globalSubject || "Đại số",
          topic: data.chuyenDe || data.topic || (globalTopics.length === 1 ? globalTopics[0] : ""),
          lesson: data.tenBai || data.lesson || "",
          math_form: data.dangToan || data.mathForm || data.math_form || "",
          question_type: parsedQuestionType,
          difficulty: data.mucDo || data.difficulty || "1",
          content: qContent,
          option_a: data.dapAnA || data.optionA || data.option_a || "",
          option_b: data.dapAnB || data.optionB || data.option_b || "",
          option_c: data.dapAnC || data.optionC || data.option_c || "",
          option_d: data.dapAnD || data.optionD || data.option_d || "",
          correct_answer: data.dapAnDung || data.correctAnswer || data.correct_answer || "",
          explanation: data.loiGiai || data.explanation || "",
          image_url: data.image_url || data.imageUrl || "",
          
          target_count: 2,
          target_difficulty: "same",
          target_format: "same",
          context_mode: "keep",
          generatedVariants: [],
          isGenerating: false,
        };
      });

      setBaseQuestions(prev => [...prev, ...newBaseQuestions]);
      alert(`Đã bóc tách thành công ${newBaseQuestions.length} câu gốc!`);
      setAiImageFiles([]);
      setManualJsonInput("");
    } catch (e: any) {
      console.error(e);
      alert("Lỗi phân tích JSON: " + e.message);
    }
  };

  const handleScanBaseAI = async () => {
    if (aiImageFiles.length === 0) return alert("Vui lòng dán/chọn file đề bài!");
    setIsScanningBase(true);
    try {
      const cauHinh = await layCauHinhAI();

      const categoryTree = categories.map(c => `Lớp: ${c.grade} | Phân môn: ${c.subject} | Chuyên đề: ${c.topic} | Bài: ${c.lesson} | Dạng: ${c.math_form}`).join('\\n');

      const prompt = `Bạn là chuyên gia Toán học. Hãy bóc tách các câu hỏi trong ảnh và trả về MẢNG JSON.
      Dưới đây là Khung chương trình (Danh mục) hiện có của ngân hàng câu hỏi:
      ${categoryTree}

      Dựa vào khung chương trình trên, hãy phân tích câu hỏi và phân loại nó vào ĐÚNG Lớp, Phân môn, Chuyên đề, Tên bài, và Dạng toán có sẵn trong Khung. Nếu không tìm thấy mục nào khớp chính xác 100%, hãy chọn mục giống nhất hoặc tự tạo tên Dạng toán mới nhưng phải giữ nguyên Lớp, Phân môn, Chuyên đề.

      Cấu trúc object giống hệt hệ thống:
      [
        {
          "lop": "...", "phanMon": "...", "chuyenDe": "...", "tenBai": "...", "dangToan": "...",
          "loaiCauHoi": "NLC hoặc DS hoặc TLN hoặc TL", 
          "mucDo": "1, 2, 3 HOẶC 4",
          "noiDung": "Đề bài chi tiết (TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ TRỐNG)...", 
          "dapAnA": "", "dapAnB": "", "dapAnC": "", "dapAnD": "", "dapAnDung": "",
          "loiGiai": "Phương pháp giải:\\n[...]\\n\\nLời giải:\\n[...]"
        }
      ]
      QUY TẮC CỰC QUAN TRỌNG:
      - Định dạng công thức bọc trong $...$.
      - Lời giải xuống dòng bằng \\n.
      - ĐẶC BIỆT CHÚ Ý TRƯỜNG "loaiCauHoi", nếu là bài tự luận chứng minh/tính toán (không có ABCD), BẮT BUỘC phải điền "TL".
      - Phải trả về JSON thuần túy, mảng các object. Không kèm text dư thừa.
      `;

      const parts = await Promise.all(aiImageFiles.map(async file => {
        const base64Data = await fileToBase64(file);
        return { inlineData: { data: base64Data, mimeType: file.type } };
      }));

      const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [prompt, ...parts]);
      console.log(`[AI] Quét đề gốc bằng model ${kq.model}`);
      processExtractedJson(kq.text);
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsScanningBase(false);
    }
  };

  const handleManualJson = () => {
    if (!manualJsonInput) return alert("Vui lòng dán JSON!");
    processExtractedJson(manualJsonInput);
  };
  
  const handleCopyPrompt = () => {
      const categoryTree = categories.map(c => `Lớp: ${c.grade} | Phân môn: ${c.subject} | Chuyên đề: ${c.topic} | Bài: ${c.lesson} | Dạng: ${c.math_form}`).join('\\n');
      const prompt = `Bạn là chuyên gia Toán học. Hãy bóc tách các câu hỏi trong ảnh và trả về MẢNG JSON.
      Dưới đây là Khung chương trình (Danh mục) hiện có của ngân hàng câu hỏi:
      ${categoryTree}

      Dựa vào khung chương trình trên, hãy phân tích câu hỏi và phân loại nó vào ĐÚNG Lớp, Phân môn, Chuyên đề, Tên bài, và Dạng toán có sẵn trong Khung. Nếu không tìm thấy mục nào khớp chính xác 100%, hãy chọn mục giống nhất hoặc tự tạo tên Dạng toán mới nhưng phải giữ nguyên Lớp, Phân môn, Chuyên đề.

      Cấu trúc object giống hệt hệ thống:
      [
        {
          "lop": "...", "phanMon": "...", "chuyenDe": "...", "tenBai": "...", "dangToan": "...",
          "loaiCauHoi": "NLC hoặc DS hoặc TLN hoặc TL", 
          "mucDo": "1, 2, 3 HOẶC 4",
          "noiDung": "Đề bài chi tiết (TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ TRỐNG)...", 
          "dapAnA": "", "dapAnB": "", "dapAnC": "", "dapAnD": "", "dapAnDung": "",
          "loiGiai": "Phương pháp giải:\\n[...]\\n\\nLời giải:\\n[...]"
        }
      ]
      QUY TẮC CỰC QUAN TRỌNG:
      - Định dạng công thức bọc trong $...$.
      - Lời giải xuống dòng bằng \\n.
      - ĐẶC BIỆT CHÚ Ý TRƯỜNG "loaiCauHoi", nếu là bài tự luận chứng minh/tính toán (không có ABCD), BẮT BUỘC phải điền "TL".
      - Phải trả về JSON thuần túy, mảng các object. Không kèm text dư thừa.
      `;
      navigator.clipboard.writeText(prompt);
      alert("Đã copy prompt!");
  };

  const generateFreePromptText = () => {
      const categoryTree = categories.map((c: any) => `Lớp ${c.grade} > ${c.subject} > ${c.topic} > ${c.lesson} > ${c.math_form}`).join('\n');
      return `Bạn là chuyên gia Toán học. Hãy ĐÓNG VAI LÀ NGƯỜI BIÊN SOẠN và TỰ SÁNG TÁC / TỰ SINH RA các câu hỏi Toán học MỚI HOÀN TOÀN dựa trên yêu cầu sau của giáo viên:
      
      YÊU CẦU CỦA GIÁO VIÊN: "${freePromptInput}"

      Dưới đây là Khung chương trình (Danh mục) hiện có của ngân hàng câu hỏi:
      ${categoryTree}

      Dựa vào khung chương trình trên, hãy phân loại câu hỏi bạn vừa sinh ra vào ĐÚNG Lớp, Phân môn, Chuyên đề, Tên bài, và Dạng toán có sẵn trong Khung. Nếu không tìm thấy mục nào khớp chính xác 100%, hãy chọn mục giống nhất hoặc tự tạo tên Dạng toán mới.

      Cấu trúc object giống hệt hệ thống:
      [
        {
          "lop": "...", "phanMon": "...", "chuyenDe": "...", "tenBai": "...", "dangToan": "...",
          "loaiCauHoi": "NLC hoặc DS hoặc TLN hoặc TL", 
          "mucDo": "1, 2, 3 HOẶC 4",
          "noiDung": "Đề bài chi tiết...", 
          "dapAnA": "", "dapAnB": "", "dapAnC": "", "dapAnD": "", "dapAnDung": "",
          "loiGiai": "Phương pháp giải:\\n[...]\\n\\nLời giải:\\n[...]"
        }
      ]
      QUY TẮC:
      - Phải trả về JSON thuần túy, mảng các object. Không kèm text dư thừa.
      - Định dạng công thức bọc trong $...$. Lời giải xuống dòng bằng \\n.
      - KIỂM TRA TÍNH HỢP LÝ VÀ LOGIC (SELF-REFLECTION): BẮT BUỘC tự giải lại bài toán vừa sinh. Kiểm tra tính hợp lý của giả thiết (VD: diện tích thành phần không lớn hơn diện tích tổng, độ dài không âm, nghiệm ra số đẹp...). Nếu phát hiện vô lý, thiếu logic, mâu thuẫn hoặc không đủ giả thiết, PHẢI TỰ ĐỘNG SINH LẠI BÀI TOÁN KHÁC chuẩn xác hơn trước khi xuất ra JSON.
      `;
  };

  const handleCopyFreePrompt = () => {
      if (!freePromptInput) return alert("Vui lòng nhập yêu cầu của bạn trước!");
      navigator.clipboard.writeText(generateFreePromptText());
      alert("Đã copy prompt tự sinh! Bạn có thể dán vào Claude, ChatGPT hoặc Gemini để tạo câu hỏi, sau đó copy JSON dán vào tab 'Dán Thủ Công'.");
  };

  const handleGenerateFreeAPI = async () => {
    if (!freePromptInput) return alert("Vui lòng nhập yêu cầu!");
    setIsScanningBase(true);
    try {
      const cauHinh = await layCauHinhAI();

      const prompt = generateFreePromptText();
      const kq = await goiGeminiTrenTrinhDuyet(
        cauHinh,
        [prompt],
        { responseMimeType: "application/json", temperature: 0.7 },
      );
      console.log(`[AI] Sinh câu hỏi bằng model ${kq.model}`);
      processExtractedJson(kq.text);
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsScanningBase(false);
    }
  };

  const updateBaseQuestion = (tempId: string, updates: Partial<BaseQuestion>) => {
    setBaseQuestions(prev => prev.map(q => q.temp_id === tempId ? { ...q, ...updates } : q));
  };

  const removeBaseQuestion = (tempId: string) => {
    setBaseQuestions(prev => prev.filter(q => q.temp_id !== tempId));
  };
  
  const removeVariant = (baseId: string, variantId: string) => {
      setBaseQuestions(prev => prev.map(q => {
          if (q.temp_id !== baseId) return q;
          return { ...q, generatedVariants: q.generatedVariants.filter(v => v.temp_id !== variantId) };
      }));
  }

  const handleGenerateSimilar = async (baseQuestion: BaseQuestion) => {
      updateBaseQuestion(baseQuestion.temp_id!, { isGenerating: true });
      try {
          // GỌI API /api/exams/generate-similar
          const res = await fetch('/api/exams/generate-similar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  baseQuestion,
                  targetCount: baseQuestion.target_count,
                  targetDifficulty: baseQuestion.target_difficulty,
                  targetFormat: baseQuestion.target_format,
                  contextMode: baseQuestion.context_mode
              })
          });
          
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Lỗi API');
          }
          
          const data = await res.json();
          updateBaseQuestion(baseQuestion.temp_id!, { 
              generatedVariants: [...baseQuestion.generatedVariants, ...data.variants],
              isGenerating: false 
          });
          
      } catch (e: any) {
          alert('Lỗi sinh tương tự: ' + e.message);
          updateBaseQuestion(baseQuestion.temp_id!, { isGenerating: false });
      }
  };

  const handleCopySimilarPrompt = (baseQuestion: BaseQuestion) => {
    const targetFormatStr = targetFormatPrompt(baseQuestion.target_format);

    let targetDifficultyStr = "giữ nguyên độ khó như câu gốc";
    if (baseQuestion.target_difficulty === "harder") targetDifficultyStr = "nâng cao, khó hơn 1 chút so với câu gốc";
    else if (baseQuestion.target_difficulty === "easier") targetDifficultyStr = "cơ bản, dễ hơn 1 chút so với câu gốc";

    let contextModeStr = "Chỉ thay đổi số liệu/hàm số, giữ nguyên bối cảnh thực tế (nếu có).";
    if (baseQuestion.context_mode === "change") {
        contextModeStr = "Thay đổi hoàn toàn bối cảnh thực tế (Ví dụ: Từ bài toán xe chạy sang bài toán con thuyền, từ quỹ đạo bóng bay sang dòng nước...). Nhưng vẫn giữ nguyên lõi toán học và phương pháp giải.";
    }

    const prompt = `Bạn là một chuyên gia ra đề Toán học. 
Nhiệm vụ của bạn là đọc một "Câu Hỏi Gốc" và sinh ra ĐÚNG ${baseQuestion.target_count} "Câu Hỏi Tương Tự" (Biến thể).

YÊU CẦU CHO CÁC CÂU HỎI TƯƠNG TỰ:
1. Độ khó: ${targetDifficultyStr}.
2. Dạng thức: ${targetFormatStr}.
3. Bối cảnh: ${contextModeStr}
4. Số liệu/Hàm số: BẮT BUỘC phải thay đổi số liệu, hàm số, hoặc phương trình cốt lõi để tạo thành một bài toán hoàn toàn mới, nhưng cách giải tương đương. PHẢI đảm bảo số liệu mới tính toán ra nghiệm đẹp, hợp lý (không ra số quá lẻ, vô lý).
5. Nếu câu hỏi gốc có Hình ảnh/Đồ thị: Bạn KHÔNG được tự vẽ đồ thị bằng ký tự. Bắt buộc chèn dòng chữ "[CẦN CHÈN HÌNH TƯƠNG TỰ]" vào đề bài để báo hiệu.
6. Lời giải: PHẢI sinh lời giải chi tiết cho từng biến thể, tương tự như phong cách giải của câu gốc. Sử dụng \\n để xuống dòng các bước giải.
7. Format Toán học: Phải dùng LaTeX chuẩn bọc trong dấu $...$ cho tất cả các biểu thức toán học. Không dùng \\\\ để escape lệnh.

TRẢ VỀ MỘT MẢNG JSON CÓ CẤU TRÚC:
[
  {
    "loaiCauHoi": "NLC hoặc DS hoặc TLN hoặc TL",
    "mucDo": "1, 2, 3 hoặc 4",
    "noiDung": "Nội dung câu hỏi (chứa LaTeX)...",
    "dapAnA": "...", "dapAnB": "...", "dapAnC": "...", "dapAnD": "...",
    "dapAnDung": "${CORRECT_ANSWER_FORMAT_HINT}",
    "loiGiai": "Phương pháp giải:\\n[...]\\n\\nLời giải:\\n[...]"
  }
]
Lưu ý: Mảng trả về phải có ĐÚNG ${baseQuestion.target_count} phần tử. Chỉ trả về JSON thuần tuý, không chứa ký tự markdown json ở đầu/cuối.

--- CÂU HỎI GỐC ---
Dạng toán: ${baseQuestion.math_form}
Chuyên đề: ${baseQuestion.topic}
Loại câu hỏi: ${baseQuestion.question_type}
Đề bài: ${baseQuestion.content}
Đáp án A: ${baseQuestion.option_a}
Đáp án B: ${baseQuestion.option_b}
Đáp án C: ${baseQuestion.option_c}
Đáp án D: ${baseQuestion.option_d}
Đáp án đúng: ${baseQuestion.correct_answer}
Lời giải: ${baseQuestion.explanation}
-------------------`;

    navigator.clipboard.writeText(prompt);
    alert(`Đã copy prompt cho Câu gốc!\nHãy dán vào Claude/Gemini để sinh ${baseQuestion.target_count} câu, sau đó bấm nút "Dán kết quả JSON" kế bên.`);
  };

  const handleManualPasteVariants = (baseQuestion: BaseQuestion) => {
    const input = window.prompt(`Dán mảng JSON chứa các câu biến thể của CÂU GỐC này vào đây:`);
    if (!input) return;

    try {
      let jsonStr = input;
      const jsonMatch = input.match(/```json\n([\s\S]*?)\n```/) || input.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      
      if (firstBracket !== -1) {
        jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
      } else {
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1) {
          jsonStr = '[' + jsonStr.substring(firstBrace, lastBrace + 1) + ']';
        } else {
          throw new Error("Không tìm thấy cấu trúc JSON");
        }
      }

      const parsed = JSON.parse(cleanJsonString(jsonStr));
      const finalArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

      const variants = finalArray.map((data: any) => {
         let parsedQuestionType = String(data.loaiCauHoi || baseQuestion.target_format || "NLC");
         if (baseQuestion.target_format && baseQuestion.target_format !== "same") parsedQuestionType = baseQuestion.target_format;
         
         if (parsedQuestionType.toLowerCase().includes("trắc nghiệm")) parsedQuestionType = "NLC";
         else if (parsedQuestionType.toLowerCase().includes("đúng/sai") || parsedQuestionType.toLowerCase().includes("đúng sai")) parsedQuestionType = "DS";
         else if (parsedQuestionType.toLowerCase().includes("ngắn") || parsedQuestionType === "TLN") parsedQuestionType = "TLN";
         else if (parsedQuestionType.toLowerCase().includes("tự luận") || parsedQuestionType === "essay") parsedQuestionType = "TL";
         
         let difficulty = data.mucDo || baseQuestion.difficulty;
         if (baseQuestion.target_difficulty === "harder") difficulty = Math.min(4, parseInt(baseQuestion.difficulty) + 1).toString();
         if (baseQuestion.target_difficulty === "easier") difficulty = Math.max(1, parseInt(baseQuestion.difficulty) - 1).toString();

         let qContent = data.noiDung || data.noidung || data.content || data.question || data.deBai || "";

         return {
            temp_id: `TEMP_VAR_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            parent_id: baseQuestion.question_id || baseQuestion.temp_id,
            grade: baseQuestion.grade,
            subject: baseQuestion.subject,
            topic: baseQuestion.topic,
            lesson: baseQuestion.lesson,
            math_form: baseQuestion.math_form,
            question_type: parsedQuestionType,
            difficulty: difficulty,
            content: qContent,
            option_a: data.dapAnA || data.optionA || data.option_a || "",
            option_b: data.dapAnB || data.optionB || data.option_b || "",
            option_c: data.dapAnC || data.optionC || data.option_c || "",
            option_d: data.dapAnD || data.optionD || data.option_d || "",
            correct_answer: data.dapAnDung || data.correctAnswer || data.correct_answer || "",
            explanation: data.loiGiai || data.explanation || "",
            image_url: ""
         };
      });

      updateBaseQuestion(baseQuestion.temp_id!, { 
          generatedVariants: [...baseQuestion.generatedVariants, ...variants]
      });
      
      alert(`Đã thêm thành công ${variants.length} biến thể!`);
    } catch (err: any) {
      alert("Lỗi phân tích JSON: " + err.message);
    }
  };

  const handleCopyAllPrompt = () => {
    if (baseQuestions.length === 0) return alert("Chưa có câu gốc nào!");

    let questionsText = "";
    let totalTargetCount = 0;

    baseQuestions.forEach((bq, index) => {
        const targetFormatStr = targetFormatPrompt(bq.target_format);

        let targetDifficultyStr = "giữ nguyên độ khó như câu gốc";
        if (bq.target_difficulty === "harder") targetDifficultyStr = "nâng cao, khó hơn 1 chút so với câu gốc";
        else if (bq.target_difficulty === "easier") targetDifficultyStr = "cơ bản, dễ hơn 1 chút so với câu gốc";

        let contextModeStr = "Chỉ thay đổi số liệu/hàm số, giữ nguyên bối cảnh thực tế (nếu có).";
        if (bq.context_mode === "change") {
            contextModeStr = "Thay đổi hoàn toàn bối cảnh thực tế (Ví dụ: Từ bài toán xe chạy sang bài toán con thuyền, từ quỹ đạo bóng bay sang dòng nước...). Nhưng vẫn giữ nguyên lõi toán học và phương pháp giải.";
        }

        totalTargetCount += bq.target_count;

        questionsText += `--- CÂU GỐC SỐ ${index + 1} ---
YÊU CẦU: Sinh ra ĐÚNG ${bq.target_count} câu tương tự. 
- Độ khó: ${targetDifficultyStr}.
- Dạng thức: ${targetFormatStr}.
- Bối cảnh: ${contextModeStr}

Dạng toán: ${bq.math_form}
Chuyên đề: ${bq.topic}
Loại câu hỏi: ${bq.question_type}
Đề bài: ${bq.content}
Đáp án A: ${bq.option_a}
Đáp án B: ${bq.option_b}
Đáp án C: ${bq.option_c}
Đáp án D: ${bq.option_d}
Đáp án đúng: ${bq.correct_answer}
Lời giải: ${bq.explanation}
-------------------\n\n`;
    });

    const prompt = `Bạn là một chuyên gia ra đề Toán học. 
Nhiệm vụ của bạn là đọc danh sách các "CÂU HỎI GỐC" dưới đây và sinh ra các "Câu Hỏi Tương Tự" (Biến thể) tương ứng cho từng câu.

DANH SÁCH CÂU HỎI GỐC VÀ YÊU CẦU RIÊNG:
${questionsText}

QUY TẮC CỰC QUAN TRỌNG CHO TẤT CẢ CÁC CÂU:
1. Số liệu/Hàm số: BẮT BUỘC phải thay đổi số liệu, hàm số, hoặc phương trình cốt lõi để tạo thành bài toán hoàn toàn mới, nhưng cách giải tương đương. PHẢI đảm bảo tính toán ra nghiệm đẹp, hợp lý (không ra số quá lẻ, vô lý).
2. Hình ảnh: Bạn KHÔNG được tự vẽ đồ thị bằng ký tự. Bắt buộc chèn dòng chữ "[CẦN CHÈN HÌNH TƯƠNG TỰ]" vào đề bài nếu câu gốc có hình.
3. Lời giải: PHẢI sinh lời giải chi tiết cho từng biến thể, tương tự như phong cách giải của câu gốc. Sử dụng \\n để xuống dòng các bước giải.
4. Format Toán học: Phải dùng LaTeX chuẩn bọc trong dấu $...$ cho tất cả các biểu thức toán học. Không dùng \\\\ để escape lệnh.

TRẢ VỀ MỘT MẢNG JSON CÓ CẤU TRÚC SAU:
[
  {
    "cauGocSo": 1, 
    "loaiCauHoi": "NLC hoặc DS hoặc TLN hoặc TL",
    "mucDo": "1, 2, 3 hoặc 4",
    "noiDung": "Nội dung câu hỏi (chứa LaTeX)...",
    "dapAnA": "...", "dapAnB": "...", "dapAnC": "...", "dapAnD": "...",
    "dapAnDung": "${CORRECT_ANSWER_FORMAT_HINT}",
    "loiGiai": "Phương pháp giải:\\n[...]\\n\\nLời giải:\\n[...]"
  }
]
Lưu ý: Trường "cauGocSo" (kiểu số nguyên) BẮT BUỘC phải có để hệ thống biết biến thể này thuộc về CÂU GỐC số mấy.
Tổng cộng bạn phải sinh ra ĐÚNG ${totalTargetCount} phần tử trong mảng JSON theo đúng yêu cầu số lượng của từng câu gốc. Chỉ trả về JSON thuần tuý, không chứa ký tự markdown json ở đầu/cuối.`;

    navigator.clipboard.writeText(prompt);
    alert(`Đã copy prompt TỔNG HỢP cho ${baseQuestions.length} Câu gốc!\nHãy dán vào Claude/Gemini để sinh tổng cộng ${totalTargetCount} câu, sau đó bấm nút "Dán Tất Cả JSON" trên cùng.`);
  };

  const handleManualPasteAllVariants = () => {
    if (baseQuestions.length === 0) return alert("Chưa có câu gốc nào!");

    const input = window.prompt(`Dán mảng JSON chứa TẤT CẢ các câu biến thể của ${baseQuestions.length} CÂU GỐC vào đây:`);
    if (!input) return;

    try {
      let jsonStr = input;
      const jsonMatch = input.match(/```json\n([\s\S]*?)\n```/) || input.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      
      if (firstBracket !== -1) {
        jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
      } else {
        throw new Error("Không tìm thấy mảng JSON trong văn bản (phải bọc trong [...])");
      }

      const parsed = JSON.parse(cleanJsonString(jsonStr));
      const finalArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

      let successCount = 0;

      // Nhóm các biến thể theo cauGocSo
      const variantsByBaseIndex: { [key: number]: any[] } = {};
      
      let missingCauGocSo = false;
      finalArray.forEach((data: any) => {
          let cauGocSoVal = data.cauGocSo || data.cau_goc_so || data.CauGocSo || data.caugocso || data.cauGoc || data.cau_goc;
          if (!cauGocSoVal || isNaN(parseInt(cauGocSoVal))) {
              missingCauGocSo = true;
          }
      });

      if (missingCauGocSo && baseQuestions.length > 1) {
          // FALLBACK: Áp dụng tuần tự theo số lượng yêu cầu của từng câu gốc
          let currentBaseIndex = 0;
          let currentVariantCount = 0;
          
          finalArray.forEach((data: any) => {
              while (currentBaseIndex < baseQuestions.length && currentVariantCount >= baseQuestions[currentBaseIndex].target_count) {
                  currentBaseIndex++;
                  currentVariantCount = 0;
              }
              if (currentBaseIndex < baseQuestions.length) {
                  if (!variantsByBaseIndex[currentBaseIndex]) variantsByBaseIndex[currentBaseIndex] = [];
                  variantsByBaseIndex[currentBaseIndex].push(data);
                  currentVariantCount++;
              }
          });
      } else {
          // NORMAL MAPPING: Dựa vào trường cauGocSo
          finalArray.forEach((data: any) => {
              let cauGocSoVal = data.cauGocSo || data.cau_goc_so || data.CauGocSo || data.caugocso || data.cauGoc || data.cau_goc;
              let cauGocSo = parseInt(cauGocSoVal);
              
              // Fallback nếu có 1 câu gốc duy nhất
              if (isNaN(cauGocSo) && baseQuestions.length === 1) cauGocSo = 1;
              
              if (!isNaN(cauGocSo) && cauGocSo >= 1 && cauGocSo <= baseQuestions.length) {
                  if (!variantsByBaseIndex[cauGocSo - 1]) variantsByBaseIndex[cauGocSo - 1] = [];
                  variantsByBaseIndex[cauGocSo - 1].push(data);
              }
          });
      }

      // Update base questions
      setBaseQuestions(prev => prev.map((bq, idx) => {
          const rawVariants = variantsByBaseIndex[idx];
          if (!rawVariants || rawVariants.length === 0) return bq;

          const variants = rawVariants.map((data: any) => {
             let parsedQuestionType = String(data.loaiCauHoi || bq.target_format || "NLC");
             if (bq.target_format && bq.target_format !== "same") parsedQuestionType = bq.target_format;
             
             if (parsedQuestionType.toLowerCase().includes("trắc nghiệm")) parsedQuestionType = "NLC";
             else if (parsedQuestionType.toLowerCase().includes("đúng/sai") || parsedQuestionType.toLowerCase().includes("đúng sai")) parsedQuestionType = "DS";
             else if (parsedQuestionType.toLowerCase().includes("ngắn") || parsedQuestionType === "TLN") parsedQuestionType = "TLN";
             else if (parsedQuestionType.toLowerCase().includes("tự luận") || parsedQuestionType === "essay") parsedQuestionType = "TL";
             
             let difficulty = data.mucDo || bq.difficulty;
             if (bq.target_difficulty === "harder") difficulty = Math.min(4, parseInt(bq.difficulty) + 1).toString();
             if (bq.target_difficulty === "easier") difficulty = Math.max(1, parseInt(bq.difficulty) - 1).toString();
    
             let qContent = data.noiDung || data.noidung || data.content || data.question || data.deBai || "";
    
             return {
                temp_id: `TEMP_VAR_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
                parent_id: bq.question_id || bq.temp_id,
                grade: bq.grade,
                subject: bq.subject,
                topic: bq.topic,
                lesson: bq.lesson,
                math_form: bq.math_form,
                question_type: parsedQuestionType,
                difficulty: difficulty,
                content: qContent,
                option_a: data.dapAnA || data.optionA || data.option_a || "",
                option_b: data.dapAnB || data.optionB || data.option_b || "",
                option_c: data.dapAnC || data.optionC || data.option_c || "",
                option_d: data.dapAnD || data.optionD || data.option_d || "",
                correct_answer: data.dapAnDung || data.correctAnswer || data.correct_answer || "",
                explanation: data.loiGiai || data.explanation || "",
                image_url: ""
             };
          });

          successCount += variants.length;
          return {
              ...bq,
              generatedVariants: [...bq.generatedVariants, ...variants]
          };
      }));
      
      if (successCount > 0) {
          alert(`Đã thêm thành công TỔNG CỘNG ${successCount} biến thể cho các Câu gốc!`);
      } else {
          alert(`Không tìm thấy biến thể hợp lệ nào hoặc AI quên trả về thuộc tính "cauGocSo".`);
      }
    } catch (err: any) {
      alert("Lỗi phân tích JSON: " + err.message);
    }
  };

  const handleExportWordStudent = async () => {
    setIsExporting(true);
    try {
        const allVariants = baseQuestions.flatMap(q => q.generatedVariants);
        if (allVariants.length === 0) return alert("Không có câu hỏi nào để xuất!");
        await exportQuestionsToWord(allVariants, 'student', 'Cau_Hoi_Tuong_Tu');
    } catch (e: any) {
        alert("Lỗi xuất file Word: " + e.message);
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportWordTeacher = async () => {
    setIsExporting(true);
    try {
        const allVariants = baseQuestions.flatMap(q => q.generatedVariants);
        if (allVariants.length === 0) return alert("Không có câu hỏi nào để xuất!");
        await exportQuestionsToWord(allVariants, 'teacher', 'Cau_Hoi_Tuong_Tu');
    } catch (e: any) {
        alert("Lỗi xuất file Word: " + e.message);
    } finally {
        setIsExporting(false);
    }
  };

  const handleGenerateAll = async () => {
      // Loop over base questions sequentially
      for (const bq of baseQuestions) {
          if (bq.target_count > 0 && !bq.isGenerating) {
              await handleGenerateSimilar(bq);
          }
      }
  };

  const handleSaveAll = async () => {
    // Collect all variants
    const allVariants = baseQuestions.flatMap(q => q.generatedVariants);
    if (allVariants.length === 0) return alert("Chưa có biến thể nào được sinh ra!");
    
    setIsSavingAll(true);
    try {
      const inserts = allVariants.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson,
        math_form: q.math_form, question_type: q.question_type, difficulty: q.difficulty,
        content: q.content, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer, explanation: q.explanation, image_url: q.image_url, usage_count: 0
      }));

      const { error } = await supabase.from('questions').insert(inserts);
      if (error) throw error;

      alert(`Đã lưu ${inserts.length} câu vào Ngân hàng!`);
      
      // Xoá các variant đã lưu
      setBaseQuestions(prev => prev.map(q => ({ ...q, generatedVariants: [] })));
    } catch (e: any) {
      alert("Lỗi khi lưu: " + e.message);
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex h-screen bg-[#f3f4f6] overflow-hidden text-gray-800 font-sans">
      
      {/* CỘT TRÁI: BÓC TÁCH GỐC (35%) */}
      <div className="w-[380px] flex flex-col bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/questions')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-black text-pink-700 tracking-tight flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Sinh Tương Tự
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Cài đặt giới hạn cây thư mục */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-gray-500 uppercase flex items-center gap-1.5 mb-2"><Layers className="w-3.5 h-3.5"/> Cài đặt giới hạn cây thư mục</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <select value={globalGrade} onChange={e=>{setGlobalGrade(e.target.value); setGlobalTopics([]); setGlobalLesson("");}} className="w-full border rounded-lg p-2 text-xs font-medium focus:border-indigo-500 outline-none text-gray-700">
                  <option value="">-- Lớp --</option>
                  {uniqueGrades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
                <select value={globalSubject} onChange={e=>{setGlobalSubject(e.target.value); setGlobalTopics([]); setGlobalLesson("");}} className="w-full border rounded-lg p-2 text-xs font-medium focus:border-indigo-500 outline-none text-gray-700">
                  <option value="">-- Phân môn --</option>
                  {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="relative">
                <button onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)} className="w-full text-left border rounded-lg p-2 text-xs font-medium flex justify-between items-center hover:bg-gray-50 text-gray-700">
                  <span className="truncate">{globalTopics.length > 0 ? `Đã chọn ${globalTopics.length} chuyên đề` : "-- Chuyên đề --"}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isTopicDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
                {isTopicDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-lg shadow-xl z-50 p-2 space-y-1">
                    {uniqueTopics.map(t => (
                      <label key={t} className="flex items-start gap-2 p-1.5 hover:bg-indigo-50 rounded cursor-pointer text-xs">
                        <input type="checkbox" checked={globalTopics.includes(t)} onChange={(e) => {
                          if(e.target.checked) setGlobalTopics(prev => [...prev, t]);
                          else setGlobalTopics(prev => prev.filter(x => x !== t));
                          setGlobalLesson("");
                        }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5" />
                        <span className="leading-tight text-gray-700">{t}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <select value={globalLesson} onChange={e=>setGlobalLesson(e.target.value)} className="w-full border rounded-lg p-2 text-xs font-medium focus:border-indigo-500 outline-none text-gray-700">
                <option value="">-- Bài (Tùy chọn) --</option>
                {uniqueLessons.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Box AI Input */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex border-b border-gray-100">
                <button onClick={()=>setAiTab('api')} className={`flex-1 py-2.5 text-[11px] font-bold transition-colors ${aiTab==='api'?'bg-pink-50 text-pink-700 border-b-2 border-pink-600':'text-gray-500 hover:bg-gray-50'}`}>Dùng AI Tự Động</button>
                <button onClick={()=>setAiTab('manual')} className={`flex-1 py-2.5 text-[11px] font-bold transition-colors ${aiTab==='manual'?'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600':'text-gray-500 hover:bg-gray-50'}`}>Dán Thủ Công</button>
                <button onClick={()=>setAiTab('free')} className={`flex-1 py-2.5 text-[11px] font-bold transition-colors ${aiTab==='free'?'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600':'text-gray-500 hover:bg-gray-50'}`}>Sinh Tự Do</button>
              </div>

              <div className="p-4">
                {aiTab === 'api' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div 
                      className="border-2 border-dashed border-pink-200 bg-pink-50/30 rounded-xl p-4 text-center cursor-pointer hover:bg-pink-50 transition-colors"
                      tabIndex={0} onPaste={handleAIPaste} onClick={() => fileInputRef.current?.click()}
                    >
                      <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleAIFileUpload} />
                      {dangDungPdf && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> {dangDungPdf}
                      </div>
                      )}
                      
                      {aiImageFiles.length === 0 ? (
                        <div className="py-2">
                          <ImageIcon className="w-8 h-8 text-pink-300 mx-auto mb-2" />
                          <p className="text-sm font-bold text-pink-900">Nhập đề gốc vào đây</p>
                          <p className="text-[11px] text-gray-500 mt-1 px-2">Click để chọn file hoặc Ctrl+V dán ảnh đề gốc.</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {aiImageFiles.map((file, idx) => (
                            <div key={idx} className="relative group border border-pink-200 rounded-md bg-white p-1 shadow-sm">
                              {file.type.includes('image') ? <img src={URL.createObjectURL(file)} className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 flex items-center justify-center text-[10px] font-bold text-pink-700 break-all overflow-hidden leading-tight">{file.name}</div>}
                              <button onClick={(e) => { e.stopPropagation(); setAiImageFiles(prev=>prev.filter((_,i)=>i!==idx)); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button onClick={handleScanBaseAI} disabled={aiImageFiles.length===0 || isScanningBase} className="w-full bg-[#db2777] text-white font-black py-3 rounded-xl hover:bg-pink-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                      {isScanningBase ? <Loader2 className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5"/>} BÓC TÁCH ĐỀ GỐC
                    </button>
                  </div>
                )}
                {aiTab === 'manual' && (
                  <div className="space-y-4 animate-in fade-in">
                    <p className="text-xs text-gray-600 font-medium">Sử dụng web Gemini miễn phí nếu API bị lỗi.</p>
                    <button onClick={handleCopyPrompt} className="w-full border-2 border-emerald-500 text-emerald-700 font-bold py-2 rounded-lg hover:bg-emerald-50 text-sm flex justify-center items-center gap-2">
                      <Copy className="w-4 h-4" /> Copy Prompt Chuẩn
                    </button>
                    <textarea value={manualJsonInput} onChange={e=>setManualJsonInput(e.target.value)} className="w-full h-32 border rounded-lg p-2 text-xs font-mono bg-gray-50 outline-none focus:border-emerald-500" placeholder="Dán mảng JSON [...] vào đây" />
                    <button onClick={handleManualJson} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2">
                      <Code2 className="w-5 h-5" /> Nhận Diện JSON
                    </button>
                  </div>
                )}
                {aiTab === 'free' && (
                  <div className="space-y-4 animate-in fade-in">
                    <p className="text-xs text-gray-600 font-medium">Viết yêu cầu để AI tự biên soạn câu hỏi hoàn toàn mới.</p>
                    <textarea value={freePromptInput} onChange={e=>setFreePromptInput(e.target.value)} className="w-full h-24 border border-indigo-200 rounded-lg p-3 text-sm bg-indigo-50/30 outline-none focus:border-indigo-500" placeholder="VD: Hãy sinh cho tôi 5 câu hỏi phương trình bậc 2, mức độ khó, dạng trắc nghiệm 4 đáp án..." />
                    
                    <button onClick={handleCopyFreePrompt} className="w-full border-2 border-indigo-500 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-50 text-sm flex justify-center items-center gap-2">
                      <Copy className="w-4 h-4" /> Copy Prompt Đưa Cho Claude/Gemini
                    </button>
                    
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium">HOẶC</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button onClick={handleGenerateFreeAPI} disabled={!freePromptInput || isScanningBase} className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                      {isScanningBase ? <Loader2 className="w-5 h-5 animate-spin"/> : <Bot className="w-5 h-5"/>} SINH TRỰC TIẾP BẰNG API
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mt-4">
                <h3 className="text-xs font-black text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Hướng dẫn
                </h3>
                <ul className="text-[12px] text-orange-800 space-y-2 list-disc list-inside">
                    <li>Nhập đề gốc vào cột bên trái.</li>
                    <li>Ở cột phải, cài đặt cấu hình sinh tương tự cho từng câu (Độ khó, Dạng thức, Số lượng).</li>
                    <li>Bấm sinh AI, kiểm tra, chỉnh sửa và lưu.</li>
                </ul>
            </div>
        </div>
      </div>

      {/* CỘT PHẢI: KẾT QUẢ & CẤU HÌNH SINH (65%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        {/* Header Right */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm shrink-0 z-10 relative">
          <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" /> Tuỳ chỉnh & Sinh câu hỏi ({baseQuestions.length} câu gốc)
              </h2>
              {baseQuestions.length > 0 && (
                  <div className="flex items-center gap-2">
                      <button onClick={handleCopyAllPrompt} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold hover:bg-indigo-100 border border-indigo-200 shadow-sm flex items-center gap-1.5 text-sm transition-colors" title="Copy 1 Prompt Chung duy nhất cho TẤT CẢ các câu">
                          <Copy className="w-4 h-4"/> Copy Prompt Chung
                      </button>
                      <button onClick={handleManualPasteAllVariants} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold hover:bg-indigo-100 border border-indigo-200 shadow-sm flex items-center gap-1.5 text-sm transition-colors" title="Dán kết quả JSON cho tất cả các câu">
                          <Code2 className="w-4 h-4"/> Dán Tất Cả JSON
                      </button>
                      <button onClick={handleGenerateAll} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-sm flex items-center gap-2 text-sm ml-2">
                          <Wand2 className="w-4 h-4"/> Sinh Tất Cả (API)
                      </button>
                  </div>
              )}
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={handleExportWordStudent} disabled={baseQuestions.flatMap(q=>q.generatedVariants).length === 0 || isExporting} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 text-sm">
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />} Xuất Học Sinh
            </button>
            <button onClick={handleExportWordTeacher} disabled={baseQuestions.flatMap(q=>q.generatedVariants).length === 0 || isExporting} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 text-sm">
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />} Xuất Giáo Viên
            </button>
            <button onClick={handleSaveAll} disabled={baseQuestions.flatMap(q=>q.generatedVariants).length === 0 || isSavingAll} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 text-sm">
              {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveAll className="w-5 h-5" />} Lưu các câu đã sinh
            </button>
          </div>
        </div>

        {/* List of Questions */}
        <div className="flex-1 overflow-y-auto p-6">
          {baseQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <CloudUpload className="w-20 h-20 text-gray-400 mb-4" />
              <p className="text-xl font-bold text-gray-500">Chưa có đề gốc. Hãy bóc tách đề ở cột bên trái!</p>
            </div>
          ) : (
            <div className="space-y-8 max-w-5xl mx-auto">
              {baseQuestions.map((bq, idx) => (
                <div key={bq.temp_id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden group transition-all">
                  
                  {/* BẢN GỐC (Base Question) */}
                  <div className="p-5 border-b-4 border-pink-100 relative bg-gray-50/50">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => setPreviewingQuestion(bq)} className="text-blue-500 hover:text-blue-700 bg-white p-1.5 rounded shadow-sm border" title="Xem trước"><Eye className="w-4 h-4"/></button>
                        <button onClick={() => setEditingQuestion(bq)} className="text-indigo-500 hover:text-indigo-700 bg-white p-1.5 rounded shadow-sm border" title="Sửa"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => removeBaseQuestion(bq.temp_id!)} className="text-red-500 hover:text-red-700 bg-white p-1.5 rounded shadow-sm border" title="Xóa"><Trash className="w-4 h-4"/></button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-pink-100 text-pink-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">CÂU GỐC #{idx + 1}</span>
                        <span className="text-xs font-bold text-gray-600">[{bq.question_type}] Mức {bq.difficulty}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200">Lớp {bq.grade}</span>
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200">{bq.subject}</span>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-100 line-clamp-1 max-w-[200px]" title={bq.topic}>{bq.topic}</span>
                        {bq.lesson && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-100 line-clamp-1 max-w-[200px]" title={bq.lesson}>{bq.lesson}</span>}
                        {bq.math_form && <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-100 line-clamp-1 max-w-[200px]" title={bq.math_form}>{bq.math_form}</span>}
                    </div>
                    <div className="text-sm font-medium text-gray-800 bg-white p-3 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                        {bq.content}
                    </div>
                    
                    {/* CẤU HÌNH SINH */}
                    <div className="mt-4 flex flex-wrap items-end gap-3 bg-white p-3 rounded-lg border border-pink-100 shadow-sm">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Số lượng</label>
                            <input type="number" min={1} max={10} value={bq.target_count} onChange={e=>updateBaseQuestion(bq.temp_id!, { target_count: parseInt(e.target.value)||1 })} className="w-20 border rounded-lg p-2 text-sm font-bold text-center focus:border-pink-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Độ khó</label>
                            <select value={bq.target_difficulty} onChange={e=>updateBaseQuestion(bq.temp_id!, { target_difficulty: e.target.value })} className="border rounded-lg p-2 text-sm focus:border-pink-500 outline-none font-medium">
                                <option value="same">Giữ nguyên</option>
                                <option value="harder">Khó hơn (+1)</option>
                                <option value="easier">Dễ hơn (-1)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Dạng thức đích</label>
                            <select value={bq.target_format} onChange={e=>updateBaseQuestion(bq.temp_id!, { target_format: e.target.value })} className="border rounded-lg p-2 text-sm focus:border-pink-500 outline-none font-medium">
                                <option value="same">Giữ nguyên</option>
                                <option value="NLC">Chuyển sang Trắc nghiệm</option>
                                <option value="TLN">Chuyển sang Trả lời ngắn</option>
                                <option value="TL">Chuyển sang Tự luận</option>
                                <option value="DS">Chuyển sang Đúng/Sai</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ngữ cảnh thực tế</label>
                            <select value={bq.context_mode} onChange={e=>updateBaseQuestion(bq.temp_id!, { context_mode: e.target.value })} className="border rounded-lg p-2 text-sm focus:border-pink-500 outline-none font-medium">
                                <option value="keep">Chỉ thay đổi số liệu</option>
                                <option value="change">Đổi mới hoàn toàn ngữ cảnh</option>
                            </select>
                        </div>
                        <div className="flex gap-2 ml-auto w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                            <button onClick={() => handleCopySimilarPrompt(bq)} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold shadow hover:bg-indigo-100 flex items-center gap-1.5 text-[12px] border border-indigo-200 transition-colors" title="Copy Prompt Sinh Tương Tự (Thủ công)">
                                <Copy className="w-3.5 h-3.5"/> Copy Prompt (Thủ công)
                            </button>
                            <button onClick={() => handleManualPasteVariants(bq)} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold shadow hover:bg-indigo-100 flex items-center gap-1.5 text-[12px] border border-indigo-200 transition-colors" title="Dán kết quả JSON từ Claude/Gemini">
                                <Code2 className="w-3.5 h-3.5"/> Dán Kết Quả
                            </button>
                            <button onClick={() => handleGenerateSimilar(bq)} disabled={bq.isGenerating} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2 text-sm ml-1 transition-colors">
                                {bq.isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>} 
                                Sinh {bq.target_count} câu (API)
                            </button>
                        </div>
                    </div>
                  </div>

                  {/* DANH SÁCH BIẾN THỂ (Variants) */}
                  {bq.generatedVariants.length > 0 && (
                      <div className="p-5 space-y-4 bg-white">
                          <h4 className="text-xs font-black text-indigo-700 flex items-center gap-2 uppercase tracking-wider mb-2">
                              <Bot className="w-4 h-4"/> Các biến thể sinh ra
                          </h4>
                          {bq.generatedVariants.map((v, vIdx) => (
                              <div key={v.temp_id} className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 relative">
                                  <div className="absolute top-4 right-4 flex gap-1">
                                      <button onClick={() => setPreviewingQuestion(v)} className="text-blue-600 bg-blue-100 hover:bg-blue-200 p-1.5 rounded"><Eye className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => setEditingQuestion(v)} className="text-indigo-600 bg-indigo-100 hover:bg-indigo-200 p-1.5 rounded"><Edit className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => removeVariant(bq.temp_id!, v.temp_id!)} className="text-red-600 bg-red-100 hover:bg-red-200 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                                  </div>
                                  <div className="flex gap-2 mb-2 items-center">
                                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">BIẾN THỂ #{vIdx + 1}</span>
                                      <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{v.question_type}</span>
                                      <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Mức {v.difficulty}</span>
                                  </div>
                                  
                                  {v.content.includes("[CẦN CHÈN HÌNH TƯƠNG TỰ]") && (
                                      <div className="mb-2 text-[11px] bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-1 rounded font-bold flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3"/> AI không vẽ được đồ thị. Hãy bấm Sửa và bổ sung hình ảnh tương tự!
                                      </div>
                                  )}
                                  
                                  <div className="text-sm font-medium text-gray-800 mt-2 line-clamp-3">
                                      {v.content}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <QuestionPreviewModal isOpen={!!previewingQuestion} onClose={()=>setPreviewingQuestion(null)} question={previewingQuestion} onEdit={(q) => setEditingQuestion(q)} />
      <QuestionEditorModal isOpen={!!editingQuestion} onClose={()=>setEditingQuestion(null)} question={editingQuestion} onSave={(updated: any)=>{
          setBaseQuestions(prev => prev.map(bq => {
              if (bq.temp_id === updated.temp_id) {
                  return { ...bq, ...updated };
              }
              return {
                  ...bq,
                  generatedVariants: bq.generatedVariants.map(v => v.temp_id === updated.temp_id ? updated : v)
              };
          }));
      }} />

    </div>
  );
}