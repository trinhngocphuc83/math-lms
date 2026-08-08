"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ArrowLeft, Image as ImageIcon, Trash2, Code2, Bot, Eye,
  Wand2, AlertCircle, Loader2, Copy, SaveAll, Edit, Trash, CloudUpload, X, Save, Info,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CropIcon, Type, ListTodo
} from "lucide-react";
import QuestionPreviewModal from "@/components/admin/QuestionPreviewModal";
import RichTextarea from "@/components/admin/RichTextarea";
import {
  toBankType,
  toDifficultyCode,
  bankTypeLabel,
  difficultyLabel,
  BANK_TYPES,
  DIFFICULTY_CODES,
} from "@/utils/questionTypes";

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
}

export default function BatchAIEditorPage() {
  const router = useRouter();
  const supabase = createClient();

  // Settings & Context
  const [globalGrade, setGlobalGrade] = useState("12");
  const [globalSubject, setGlobalSubject] = useState("Đại số");
  const [globalTopics, setGlobalTopics] = useState<string[]>([]);
  const [globalLesson, setGlobalLesson] = useState("");
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  // AI Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [aiImageFiles, setAiImageFiles] = useState<File[]>([]);
  const [manualJsonInput, setManualJsonInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiTab, setAiTab] = useState<"api" | "manual">("api");

  // Questions List States
  const [parsedQuestions, setParsedQuestions] = useState<QuestionData[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<{id: string, content: string}[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Edit Modal States
  const [previewingQuestion, setPreviewingQuestion] = useState<QuestionData | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Keyboard Navigation for Active Question
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (parsedQuestions.length === 0) return;
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveQuestionIdx(prev => Math.max(0, prev - 1));
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveQuestionIdx(prev => Math.min(parsedQuestions.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedQuestions.length]);

  const updateParsedQuestion = (tempId: string, field: keyof QuestionData, value: any) => {
    setParsedQuestions(prev => prev.map(q => q.temp_id === tempId ? { ...q, [field]: value } : q));
  };

  const toggleCollapse = (tempId: string) => {
    setCollapsedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tempId)) newSet.delete(tempId);
      else newSet.add(tempId);
      return newSet;
    });
  };


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

  useEffect(() => {
    // Fetch all existing questions once to check duplicates later
    const fetchExisting = async () => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
         const { data } = await supabase.from('questions')
           .select('question_id, content')
           .range(page * pageSize, (page + 1) * pageSize - 1);
           
         if (!data || data.length === 0) break;
         allData = [...allData, ...data];
         if (data.length < pageSize) break;
         page++;
      }
      
      if (allData.length > 0) {
        setExistingQuestions(allData.map(d => ({
          id: d.question_id,
          content: (d.content || "").trim().toLowerCase().replace(/\s+/g, '')
        })));
      }
    };
    fetchExisting();
  }, []);



  // --- AI SCANNING LOGIC ---
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

  const handleAIFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAiImageFiles(prev => [...prev, ...newFiles]);
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
      
      let parsedData: any[] = [];
      
      // 1. Cắt chuỗi JSON thuần tuý ra trước
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

      try {
        parsedData = JSON.parse(jsonStr);
      } catch(e) {
        console.error("Lỗi parse JSON:", e);
        alert("Lỗi: AI trả về định dạng JSON không hợp lệ. Vui lòng thử lại.");
        return;
      }

      const newQuestions: QuestionData[] = parsedData.map(data => {
        let qContent = data.noiDung || "";
        // Tự động xóa các tiền tố "Câu X.", "Bài Y.", "VD Z:" ở đầu câu hỏi
        qContent = qContent.replace(/^(?:(?:Câu|Bài|VD|Ví\s*dụ)\s*\d+[a-zA-Z]?\s*[:.-]?\s*)+/i, "");

        const normalizedContent = qContent.trim().toLowerCase().replace(/\s+/g, '');
        const duplicateMatch = existingQuestions.find(eq => eq.content === normalizedContent && eq.content !== "");

        const lesson = data.tenBai || "";
        const math_form = data.dangToan || "";
        const isNewLesson = lesson !== "" && !uniqueLessons.includes(lesson);
        const isNewMathForm = math_form !== "" && !uniqueForms.includes(math_form);

        let parsedQuestionType = String(data.loaiCauHoi || "NLC");
        if (parsedQuestionType.toLowerCase().includes("trắc nghiệm")) parsedQuestionType = "NLC";
        else if (parsedQuestionType.toLowerCase().includes("đúng/sai") || parsedQuestionType.toLowerCase().includes("đúng sai")) parsedQuestionType = "DS";
        else if (parsedQuestionType.toLowerCase().includes("ngắn")) parsedQuestionType = "TLN";
        else if (parsedQuestionType.toLowerCase().includes("tự luận") || parsedQuestionType === "essay") parsedQuestionType = "TL";
        // Bảng quy đổi dùng chung bắt nốt các biến thể còn lại (TN, ĐS, multiple_choice...)
        else parsedQuestionType = toBankType(parsedQuestionType) ?? "NLC";

        // Prompt yêu cầu AI trả mucDo dạng mã "1|2|3|4", nhưng AI vẫn có lúc trả nhãn
        // chữ ("Thông hiểu"). Trước đây gán thẳng data.mucDo vào state trong khi <select>
        // lại dùng value là nhãn chữ -> không khớp option nào nên trình duyệt hiển thị
        // option đầu tiên, khiến MỌI câu đều hiện "Nhận biết" dù AI nhận diện đúng.
        // Quy về mã chuẩn 1-4 (đúng chuẩn đang lưu trong CSDL) cho cả hai kiểu đầu vào.
        const parsedDifficulty = toDifficultyCode(data.mucDo) ?? "1";

        const questionData = {
          temp_id: `TEMP_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          grade: data.lop || globalGrade || "12",
          subject: data.phanMon || globalSubject || "Đại số",
          topic: data.chuyenDe || (globalTopics.length === 1 ? globalTopics[0] : ""),
          lesson: lesson,
          math_form: math_form,
          isNewLesson,
          isNewMathForm,
          question_type: parsedQuestionType,
          difficulty: parsedDifficulty,
          content: qContent,
          option_a: data.dapAnA || "",
          option_b: data.dapAnB || "",
          option_c: data.dapAnC || "",
          option_d: data.dapAnD || "",
          correct_answer: data.dapAnDung || "",
          explanation: data.loiGiai || "",
          image_url: data.image_url || "",
          isDuplicate: !!duplicateMatch,
          duplicateId: duplicateMatch ? duplicateMatch.id : undefined
        };

        const parsedItems = [];
        parsedItems.push(questionData);

        // Xử lý tự động nhân bản nếu là câu hỏi DS đa bài học
        if (data.loaiCauHoi === "DS" && data.isMultiLesson === true) {
           const cloneData = {
             ...questionData,
             temp_id: `TEMP_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_clone`,
             lesson: "Ôn tập chương",
             isNewLesson: !uniqueLessons.includes("Ôn tập chương"),
             isDuplicate: false, // Bỏ cảnh báo trùng lặp cho bản sao này
             duplicateId: undefined
           };
           parsedItems.push(cloneData);
        }

        return parsedItems;
      }).flat();

      setParsedQuestions(prev => [...prev, ...newQuestions]);
      alert(`Đã nhận diện thành công ${newQuestions.length} câu hỏi!`);
      setAiImageFiles([]); // Clear files after scan
      setManualJsonInput("");
    } catch (e: any) {
      console.error(e);
      alert("Lỗi phân tích JSON: " + e.message);
    }
  };

  const handleScanAI = async () => {
    if (aiImageFiles.length === 0) return alert("Vui lòng dán/chọn file đề bài vào khung AI!");

    setIsScanning(true);
    try {
      const keyRes = await fetch('/api/admin/gemini-key');
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.keys || keyData.keys.length === 0) throw new Error(keyData.error || "Không thể cấp phát khóa AI.");

      const topicHint = globalTopics.length === 1 ? globalTopics[0] : 'Tự suy luận';
      const topicComment = globalTopics.length === 1 ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA ĐỔI BẤT KỲ KÝ TỰ NÀO.' : '// BẮT BUỘC: Tên Chương hoặc Chủ đề (VD: Chương I. Phương trình). PHẢI LẤY TỪ DANH SÁCH BÊN DƯỚI.';

      const contextCategories = `
DANH SÁCH BÀI HỌC ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueLessons.map(l => `- ${l}`).join("\n")}

DANH SÁCH DẠNG TOÁN ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueForms.map(f => `- ${f}`).join("\n")}
`;

      const prompt = `TRƯỚC KHI BẮT ĐẦU, BẠN PHẢI:
1. Đọc THẬT KỸ TOÀN BỘ nội dung ảnh/file từ đầu đến cuối, không bỏ sót bất kỳ câu hỏi hay hình ảnh nào.
2. Đọc kỹ TOÀN BỘ yêu cầu trong prompt này trước khi trả lời. Mỗi quy tắc đều quan trọng.
3. Kiểm tra lại output JSON trước khi gửi để đảm bảo ĐÚNG cấu trúc, ĐÚNG nội dung và KHÔNG thiếu trường nào.

Bạn là chuyên gia Toán học. Hãy đọc (các) ảnh/file PDF này và bóc tách TẤT CẢ các câu hỏi có trong đó. 
Trả về MỘT MẢNG JSON duy nhất (bắt đầu bằng [ và kết thúc bằng ]) chứa các object theo cấu trúc:
[
  {
    "lop": "${globalGrade || 'Tự suy luận'}",
    "phanMon": "${globalSubject || 'Tự suy luận'}",
    "chuyenDe": "${topicHint}", ${topicComment}
    "tenBai": "${globalLesson || 'Tự suy luận'}", ${globalLesson ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA ĐỔI BẤT KỲ KÝ TỰ NÀO.' : '// SO KHỚP VỚI DANH SÁCH BÊN DƯỚI. Nếu có bài tương tự, PHẢI COPY CHÍNH XÁC.'}
    "dangToan": "Tự suy luận", // SO KHỚP VỚI DANH SÁCH BÊN DƯỚI. Nếu có dạng tương tự, PHẢI COPY CHÍNH XÁC.
    "loaiCauHoi": "Tự suy luận (CHỈ ĐIỀN 1 TRONG 4: NLC, DS, TLN, TL)", // NLC (Trắc nghiệm), DS (Đúng/Sai), TLN (Trả lời ngắn), TL (Tự luận)
    "mucDo": "Tự suy luận (CHỈ ĐIỀN 1, 2, 3 HOẶC 4)", // 1(Nhận biết), 2(Thông hiểu), 3(Vận dụng), 4(Vận dụng cao)
    "noiDung": "Đề bài (BẮT BUỘC dùng LaTeX bọc trong $...$)",
    "dapAnA": "Nội dung A", "dapAnB": "Nội dung B", "dapAnC": "Nội dung C", "dapAnD": "Nội dung D",
    "dapAnDung": "A",
    "loiGiai": "Phương pháp giải:\\n[Ghi phương pháp ở đây]\\n\\nLời giải:\\n[Ghi lời giải chi tiết ở đây. BẮT BUỘC dùng ký tự \\n để xuống dòng cho từng ý/bước giải để dễ đọc!]",
    "isMultiLesson": false // CHỈ GÁN TRUE NẾU LÀ CÂU HỎI ĐÚNG/SAI (DS) MÀ CÁC Ý NHỎ NẰM Ở NHIỀU BÀI HỌC KHÁC NHAU. MẶC ĐỊNH LÀ FALSE.
  }
]
  YÊU CẦU CỰC QUAN TRỌNG VỀ BÓC TÁCH: Bạn phải phân tích và bóc tách RẠCH RÒI 3 trường "chuyenDe" (Chương), "tenBai" (Bài học), và "dangToan" (Dạng toán). Tuyệt đối không gộp chung nội dung của chúng vào nhau. ĐẶC BIỆT CHÚ Ý TRƯỜNG "loaiCauHoi", nếu là bài tự luận chứng minh/tính toán (không có ABCD), BẮT BUỘC phải điền "TL".
  
  CƠ SỞ DỮ LIỆU ĐỐI CHIẾU: 
  Bạn BẮT BUỘC PHẢI PHÂN LOẠI câu hỏi vào các Tên bài học và Dạng toán có trong danh sách dưới đây nếu có sự tương đồng. TUYỆT ĐỐI HẠN CHẾ TẠO MỚI (Chỉ được tự suy luận ra Dạng toán mới nếu trong danh sách thực sự không có dạng nào liên quan).
  ${contextCategories}

  LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG VÀ TÁCH CÂU: 
  1. QUY TẮC TÁCH HOẶC GỘP Ý NHỎ: 
     - TRƯỜNG HỢP TÁCH: Nếu một bài toán tự luận có các ý nhỏ (a, b, c...) hoàn toàn độc lập, không phụ thuộc nhau (VD: "Bài 1. Tính: a) 1+1 b) 2+2"). BẮT BUỘC TÁCH mỗi ý thành 1 object câu hỏi độc lập. Tự động ghép thêm "dẫn chung" vào từng ý.
     - TRƯỜNG HỢP GỘP (KHÔNG TÁCH): Nếu các ý nhỏ có liên quan mật thiết, dùng chung dữ kiện gốc, ý b phụ thuộc ý a (VD: "Cho biểu thức P... a) Rút gọn b) Tìm P max"). BẮT BUỘC GỘP CHUNG toàn bộ đề bài và các ý nhỏ thành MỘT câu hỏi tự luận duy nhất. Giữ nguyên các ký hiệu "a)", "b)".
  2. QUY ĐỊNH ĐỐI VỚI CÂU HỎI ĐÚNG/SAI (DS) ĐA BÀI HỌC:
     Nếu câu hỏi DS có 4 ý thuộc về nhiều bài học khác nhau trong chương:
     - Bạn HÃY ĐẶT "isMultiLesson": true.
     - Bạn PHẢI gán "tenBai" là tên bài học xa nhất/mới nhất trong chương trình mà câu hỏi đề cập tới (Ví dụ ý A thuộc Bài 1, ý C thuộc Bài 3 => Gán "tenBai": "Bài 3").
     - Bạn PHẢI gán "dangToan": "Toán tổng hợp".
  3. GIỮ NGUYÊN DANH MỤC: Nếu trường "chuyenDe" hoặc "tenBai" trong mẫu JSON đã được điền sẵn một giá trị (Không phải chữ "Tự suy luận"), BẠN PHẢI GIỮ NGUYÊN CHÍNH XÁC CHUỖI ĐÓ, KHÔNG ĐƯỢC TỰ Ý CẮT BỎ CÁC TIỀN TỐ (như "Chương I.", "Bài 2.") HAY THAY ĐỔI BẤT KỲ KÝ TỰ NÀO.
  4. ĐỊNH DẠNG CÔNG THỨC TOÁN: Mọi công thức Toán học PHẢI được bọc trong $...$ (ví dụ: $\\frac{1}{2}$). Bạn cứ viết lệnh LaTeX chuẩn, KHÔNG ĐƯỢC dùng 2 dấu gạch chéo (\\\\) để escape lệnh trừ khi xuống dòng.
  5. NẾU TRONG ĐỀ CÓ HÌNH VẼ, ĐỒ THỊ, BẢNG BIẾN THIÊN, HOẶC BẢNG XÉT DẤU: Tuyệt đối KHÔNG cố gắng vẽ lại bằng Markdown, ASCII hay LaTeX. Thay vào đó, hãy chỉ ghi đúng chữ "[HÌNH VẼ]" hoặc "[BẢNG BIẾN THIÊN]" vào vị trí đó trong nội dung. Người dùng sẽ tự chèn ảnh vào sau.
  6. ÉP BUỘC TRƯỜNG ĐÁP ÁN ĐÚNG: Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ TRỐNG trường "dapAnDung".
     - Với câu Trắc nghiệm (NLC): Phải điền A, B, C hoặc D.
     - Với câu Đúng/Sai (DS): Phải điền chuỗi 4 ký tự Đ và S (VD: "Đ S Đ S" hoặc "ĐĐSĐ"). Hãy đọc kỹ đề bài và lời giải để suy ra. TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỂ TRỐNG.
  7. XÓA TIỀN TỐ CÂU HỎI: TUYỆT ĐỐI KHÔNG đưa các chữ như "Câu 1.", "Bài 2:", "VD 3", "Ví dụ 4." vào trong nội dung của trường "noiDung". Bạn phải tự động loại bỏ các cụm từ này ở đầu câu hỏi.
  8. CÂU HỎI PHẢI ĐỘC LẬP VÀ TỰ CHỨA ĐẦY ĐỦ GIẢ THUYẾT: Mỗi câu hỏi sẽ được lưu RIÊNG BIỆT trong ngân hàng đề, nên TUYỆT ĐỐI KHÔNG ĐƯỢC viết kiểu tham chiếu ngữ cảnh bên ngoài như "Với các giả thiết như trong Ví dụ 5...", "Trong tình huống mở đầu...", "Trong Ví dụ 7...", "Theo bảng số liệu trên...". Nếu câu hỏi gốc trong ảnh có tham chiếu đến dữ kiện ở phần khác, BẠN PHẢI tự chép/nhúng đầy đủ toàn bộ dữ kiện cần thiết (số liệu, điều kiện, giả thuyết) vào trong "noiDung" để câu hỏi có thể hiểu được khi đứng một mình. Nếu không thể trích xuất đủ dữ kiện (ví dụ thiếu hình vẽ, bảng số liệu gốc không có trong ảnh), hãy BỎ QUA câu hỏi đó hoàn toàn, KHÔNG TẠO.
  9. NHẬN DẠNG HÌNH ẢNH ĐI KÈM CÂU HỎI: Nếu trong ảnh có đồ thị, hình vẽ, bảng số liệu hoặc sơ đồ ĐI KÈM một câu hỏi, TUYỆT ĐỐI KHÔNG mô tả chi tiết làm lệch nội dung gốc của câu hỏi. Thay vào đó, bạn chỉ cần quét kỹ và thêm một dòng thông báo "[CÓ HÌNH ẢNH KÈM THEO]" vào cuối trường "noiDung". CHỈ ĐƯỢC PHÉP can thiệp/sửa đổi nội dung gốc của câu hỏi nếu bạn phát hiện câu hỏi bị sai đề, và trong trường hợp đó, PHẢI thêm một dòng thông báo "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ, ĐÃ SỬA LẠI]" để thông báo.`;

      const parts = await Promise.all(aiImageFiles.map(async file => {
        const base64Data = await fileToBase64(file);
        return { inlineData: { data: base64Data, mimeType: file.type } };
      }));

      let success = false;
      let lastErrorMsg = "";

      for (const apiKey of keyData.keys) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
          const result = await model.generateContent([ prompt, ...parts ]);
          const text = result.response.text();
          processExtractedJson(text);
          success = true;
          break;
        } catch (e: any) {
          console.warn("API Key lỗi, thử key tiếp theo...", e.message);
          lastErrorMsg = e.message;
        }
      }

      if (!success) {
        throw new Error("Tất cả các API key đều bị lỗi hoặc quá tải (503). Vui lòng thử lại sau. Lỗi cuối: " + lastErrorMsg);
      }
    } catch (error: any) {
      console.error(error);
      alert("Lỗi AI: " + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualJson = () => {
    if (!manualJsonInput) return alert("Vui lòng dán JSON!");
    processExtractedJson(manualJsonInput);
  };

  const handleCopyPrompt = () => {
    const topicHint = globalTopics.length === 1 ? globalTopics[0] : 'Tự suy luận';
    const topicComment = globalTopics.length === 1 ? '// GIỮ NGUYÊN' : '// LẤY TỪ DANH SÁCH';
    const contextCategories = `
DANH SÁCH BÀI HỌC ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueLessons.map(l => `- ${l}`).join("\n")}

DANH SÁCH DẠNG TOÁN ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueForms.map(f => `- ${f}`).join("\n")}
`;
    const prompt = `TRƯỚC KHI BẮT ĐẦU, BẠN PHẢI:
1. Đọc THẬT KỸ TOÀN BỘ nội dung ảnh/file từ đầu đến cuối, không bỏ sót bất kỳ câu hỏi hay hình ảnh nào.
2. Đọc kỹ TOÀN BỘ yêu cầu trong prompt này trước khi trả lời. Mỗi quy tắc đều quan trọng.
3. Kiểm tra lại output JSON trước khi gửi để đảm bảo ĐÚNG cấu trúc, ĐÚNG nội dung và KHÔNG thiếu trường nào.

Bạn là chuyên gia Toán học. Hãy bóc tách TẤT CẢ câu hỏi trong ảnh/file và trả về MỘT MẢNG JSON:
[
  {
    "lop": "${globalGrade || 'Tự suy luận'}", "phanMon": "${globalSubject || 'Tự suy luận'}",
    "chuyenDe": "${topicHint}", ${topicComment}
    "tenBai": "${globalLesson || 'Tự suy luận'}", ${globalLesson ? '// GIỮ NGUYÊN' : '// LẤY TỪ DANH SÁCH'}
    "dangToan": "Tự suy luận", // LẤY TỪ DANH SÁCH BÊN DƯỚI NẾU CÓ DẠNG TƯƠNG ĐƯƠNG
    "loaiCauHoi": "Tự suy luận (NLC, DS, TLN, TL)", "mucDo": "Tự suy luận (1, 2, 3, 4)",
    "noiDung": "Đề bài dùng LaTeX bọc trong $...$",
    "dapAnA": "", "dapAnB": "", "dapAnC": "", "dapAnD": "", "dapAnDung": "",
    "loiGiai": "Phương pháp giải:\\\\n[...]\\\\n\\\\nLời giải:\\\\n[Ghi lời giải chi tiết. BẮT BUỘC dùng \\\\n để xuống dòng cho từng ý/bước giải!]",
    "isMultiLesson": false
  }
]
  CƠ SỞ DỮ LIỆU ĐỐI CHIẾU:
  Bạn BẮT BUỘC PHẢI PHÂN LOẠI câu hỏi vào các Tên bài học và Dạng toán có trong danh sách dưới đây nếu có sự tương đồng. TUYỆT ĐỐI HẠN CHẾ TẠO MỚI.
  ${contextCategories}

  LƯU Ý CỰC KỲ QUAN TRỌNG:
  1. TÁCH/GỘP Ý NHỎ: Các ý độc lập thì TÁCH, các ý phụ thuộc nhau thì GỘP thành 1 câu TL duy nhất. ĐẶC BIỆT CHÚ Ý TRƯỜNG "loaiCauHoi", nếu là bài tự luận (không có ABCD), BẮT BUỘC phải điền "TL".
  2. CÂU ĐÚNG/SAI ĐA BÀI HỌC: Đặt "isMultiLesson": true, gán "tenBai" bài xa nhất, "dangToan": "Toán tổng hợp".
  3. GIỮ NGUYÊN DANH MỤC: Nếu "chuyenDe"/"tenBai" đã điền sẵn, GIỮ NGUYÊN CHÍNH XÁC, KHÔNG CẮT TIỀN TỐ.
  4. CÔNG THỨC TOÁN: Bọc trong $...$ (Ví dụ: $A + B = B + A$). Viết LaTeX chuẩn, liền mạch trên 1 dòng. KHÔNG dùng \\\\\\\\ để escape.
  5. KHÔNG vẽ lại hình/bảng. Nếu có hình/bảng, bắt buộc làm theo quy tắc 7.
  6. CÂU HỎI PHẢI ĐỘC LẬP: Không tham chiếu ngữ cảnh bên ngoài. Tự nhúng đầy đủ giả thuyết vào "noiDung".
  7. VỊ TRÍ HÌNH ẢNH/BẢNG BIỂU: Nếu câu hỏi có đồ thị, hình vẽ hoặc bảng số liệu ĐI KÈM, TUYỆT ĐỐI KHÔNG mô tả chi tiết làm lệch câu gốc. BẮT BUỘC chèn đoạn text "[CÓ HÌNH ẢNH KÈM THEO]" vào ĐÚNG VỊ TRÍ mà hình ảnh đó xuất hiện trong tài liệu gốc (Ví dụ: ngay sau chữ "như hình vẽ bên:"). Tuyệt đối KHÔNG được tự ý vứt xuống cuối câu hỏi nếu không đúng vị trí gốc. CHỈ ĐƯỢC sửa nội dung câu gốc nếu sai đề, khi đó phải thêm "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ, ĐÃ SỬA LẠI]".`;
    navigator.clipboard.writeText(prompt);
    alert("Đã Copy Prompt Chuẩn!");
  };

  // --- ACTIONS ---
  const handleRemoveQuestion = (tempId: string) => {
    setParsedQuestions(prev => {
      const remaining = prev.filter(q => q.temp_id !== tempId);
      // Điều chỉnh active index
      setActiveQuestionIdx(oldIdx => {
        if (remaining.length === 0) return 0;
        if (oldIdx >= remaining.length) return remaining.length - 1;
        return oldIdx;
      });
      return remaining;
    });
  };

  const handleSaveAll = async () => {
    if (parsedQuestions.length === 0) return alert("Chưa có câu hỏi nào để lưu!");
    setIsSavingAll(true);

    try {
      // 1. Tự động loại bỏ các câu bị trùng lặp (isDuplicate = true)
      const validQuestions = parsedQuestions.filter(q => !q.isDuplicate);
      const duplicatesCount = parsedQuestions.length - validQuestions.length;

      if (validQuestions.length === 0) {
        setIsSavingAll(false);
        return alert("Tất cả câu hỏi đều bị trùng lặp với Ngân hàng! Không có câu hỏi mới nào được thêm.");
      }

      // 2. Lọc và chuẩn bị lưu các danh mục mới (nếu có) từ các câu hỏi HỢP LỆ
      const newCats = validQuestions.filter(q => q.isNewLesson || q.isNewMathForm).map(q => ({
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
      }));
      // Loại bỏ trùng lặp trong mảng newCats
      const uniqueNewCats = Array.from(new Set(newCats.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
      
      if (uniqueNewCats.length > 0) {
        const { error: catError } = await supabase.from('question_categories').insert(uniqueNewCats);
        if (catError) console.error("Lỗi thêm danh mục mới:", catError);
      }

      const inserts = validQuestions.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
        grade: q.grade,
        subject: q.subject,
        topic: q.topic,
        lesson: q.lesson,
        math_form: q.math_form,
        // Chốt về mã chuẩn ngay trước khi ghi, tránh lọt nhãn chữ vào CSDL làm hỏng bộ lọc
        question_type: toBankType(q.question_type) ?? 'NLC',
        difficulty: toDifficultyCode(q.difficulty) ?? '1',
        content: q.content,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        image_url: q.image_url,
        usage_count: 0
      }));

      const { error } = await supabase.from('questions').insert(inserts);
      if (error) throw error;

      alert(`Đã lưu thành công ${inserts.length} câu vào Ngân hàng!${duplicatesCount > 0 ? `\n(Đã tự động loại bỏ ${duplicatesCount} câu trùng lặp)` : ''}`);
      router.push("/admin/questions");
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi lưu: " + e.message);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveSingle = async (tempId: string) => {
    const q = parsedQuestions.find(q => q.temp_id === tempId);
    if (!q) return;
    
    try {
      if (q.isNewLesson || q.isNewMathForm) {
        const { error: catError } = await supabase.from('question_categories').insert([{
           grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
        }]);
        if (catError) console.error("Lỗi thêm danh mục:", catError);
      }

      const qId = `CH_${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
      const insertData = {
        question_id: qId, grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson,
        math_form: q.math_form,
        question_type: toBankType(q.question_type) ?? 'NLC',
        difficulty: toDifficultyCode(q.difficulty) ?? '1',
        content: q.content,
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer, explanation: q.explanation, image_url: q.image_url, usage_count: 0
      };

      const { error } = await supabase.from('questions').insert(insertData);
      if (error) throw error;
      
      // Xoá câu hỏi đã lưu khỏi danh sách hiện tại
      handleRemoveQuestion(tempId);
    } catch (e: any) {
      alert("Lỗi khi lưu câu hỏi: " + e.message);
    }
  };

  const handleModalSave = (updated: QuestionData) => {
    setParsedQuestions(prev => prev.map(q => q.temp_id === updated.temp_id ? updated : q));
  };

  const handleMapCategory = (tempId: string, field: 'grade' | 'subject' | 'topic' | 'lesson' | 'math_form', value: string) => {
    if (!value) return;
    setParsedQuestions(prev => prev.map(q => {
      if (q.temp_id !== tempId) return q;
      return {
        ...q,
        [field]: value,
        ...(field === 'lesson' ? { isNewLesson: false } : {}),
        ...(field === 'math_form' ? { isNewMathForm: false } : {})
      };
    }));
  };

  const handleApproveNewCategory = async (tempId: string, field: 'lesson' | 'math_form', newValue: string) => {
    const q = parsedQuestions.find(q => q.temp_id === tempId);
    if (!q || !newValue.trim()) return;
    
    try {
      const insertData = {
        grade: q.grade, 
        subject: q.subject, 
        topic: q.topic, 
        lesson: field === 'lesson' ? newValue.trim() : q.lesson, 
        math_form: field === 'math_form' ? newValue.trim() : (q.math_form || '')
      };
      
      const { error } = await supabase.from('question_categories').insert([insertData]);
      if (error) throw error;
      
      // Update local categories list
      setCategories(prev => [...prev, insertData as any]);
      
      // Apply the new category to the question and dismiss the alert
      setParsedQuestions(prev => prev.map(item => {
        if (item.temp_id !== tempId) return item;
        return {
          ...item,
          [field]: newValue.trim(),
          ...(field === 'lesson' ? { isNewLesson: false } : {}),
          ...(field === 'math_form' ? { isNewMathForm: false } : {})
        };
      }));
      
      alert(`Đã thêm ${field === 'lesson' ? 'Tên Bài' : 'Dạng Toán'} mới vào danh mục!`);
    } catch (e: any) {
      alert("Lỗi khi thêm danh mục: " + e.message);
    }
  };

  /**
   * Thống kê nhanh đợt quét: số câu theo từng Dạng thức và theo từng Mức độ,
   * kèm bảng chéo Dạng thức × Mức độ để Thầy nắm cấu trúc đề ngay trên Bản đồ
   * mà không phải bấm dò từng câu.
   */
  const scanSummary = React.useMemo(() => {
    const byType: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};

    parsedQuestions.forEach(q => {
      const t = toBankType(q.question_type) ?? 'NLC';
      const d = toDifficultyCode(q.difficulty) ?? '1';
      byType[t] = (byType[t] || 0) + 1;
      byDifficulty[d] = (byDifficulty[d] || 0) + 1;
      if (!matrix[t]) matrix[t] = {};
      matrix[t][d] = (matrix[t][d] || 0) + 1;
    });

    return {
      byType,
      byDifficulty,
      matrix,
      typesPresent: BANK_TYPES.filter(t => byType[t] > 0),
      total: parsedQuestions.length,
    };
  }, [parsedQuestions]);

  /** Màu nhận diện theo Dạng thức - dùng chung cho ô số và bảng thống kê. */
  const TYPE_STYLE: Record<string, { dot: string; chip: string; label: string }> = {
    NLC: { dot: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Trắc nghiệm' },
    DS: { dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Đúng/Sai' },
    TLN: { dot: 'bg-purple-500', chip: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Trả lời ngắn' },
    TL: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Tự luận' },
  };

  const DIFF_STYLE: Record<string, string> = {
    '1': 'bg-slate-100 text-slate-700 border-slate-200',
    '2': 'bg-sky-50 text-sky-700 border-sky-200',
    '3': 'bg-amber-50 text-amber-700 border-amber-200',
    '4': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden text-gray-800">
      
      {/* CỘT TRÁI: ĐIỀU KHIỂN & AI / BẢN ĐỒ CÂU HỎI */}
      <div className={`flex flex-col bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex-shrink-0 transition-all duration-300 ${
         parsedQuestions.length > 0 
            ? (isSidebarCollapsed ? 'w-12 md:min-w-[48px]' : 'w-[280px]') 
            : 'w-[320px]'
      }`}>
        {parsedQuestions.length === 0 ? (
          <>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-black text-indigo-900 tracking-tight">Quét Đề Hàng Loạt</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          
          {/* Box Cố định */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-xs font-black text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4" /> Phân loại Gốc (Gợi ý AI)
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Lớp</label>
                <select value={globalGrade} onChange={e=>setGlobalGrade(e.target.value)} className="w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Tự động --</option>
                  {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Phân môn</label>
                <select value={globalSubject} onChange={e=>setGlobalSubject(e.target.value)} className="w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Tự động --</option>
                  {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Chuyên đề</label>
                <div 
                  className="w-full text-sm border rounded-lg p-2 bg-white cursor-pointer flex justify-between items-center"
                  onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                >
                  <span className="truncate flex-1">
                    {globalTopics.length === 0 ? "-- AI tự trích xuất --" : `${globalTopics.length} chuyên đề đã chọn`}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">▼</span>
                </div>
                {isTopicDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] z-50 max-h-64 overflow-y-auto">
                    <div 
                      className="p-2 hover:bg-gray-50 cursor-pointer border-b text-[13px] font-bold text-blue-600 text-center"
                      onClick={() => setGlobalTopics([])}
                    >
                      Bỏ chọn tất cả
                    </div>
                    {uniqueTopics.map(t => (
                      <label key={t as string} className="flex items-center p-2.5 hover:bg-gray-50 cursor-pointer text-sm gap-2 border-b border-gray-50 last:border-0">
                        <input 
                          type="checkbox" 
                          checked={globalTopics.includes(t as string)}
                          onChange={(e) => {
                            if (e.target.checked) setGlobalTopics([...globalTopics, t as string]);
                            else setGlobalTopics(globalTopics.filter(topic => topic !== t));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="truncate flex-1" title={t as string}>{t as string}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Bài học</label>
                <select value={globalLesson} onChange={e=>setGlobalLesson(e.target.value)} className="w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 bg-white">
                  <option value="">-- AI tự trích xuất --</option>
                  {uniqueLessons.map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Box AI */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="flex border-b border-gray-100">
              <button onClick={()=>setAiTab('api')} className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${aiTab==='api'?'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600':'text-gray-500 hover:bg-gray-50'}`}>Dùng Hệ Thống AI</button>
              <button onClick={()=>setAiTab('manual')} className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${aiTab==='manual'?'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600':'text-gray-500 hover:bg-gray-50'}`}>Web Dự Phòng</button>
            </div>

            <div className="p-4">
              {aiTab === 'api' ? (
                <div className="space-y-4 animate-in fade-in">
                  <div 
                    className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl p-4 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
                    tabIndex={0} onPaste={handleAIPaste} onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleAIFileUpload} />
                    
                    {aiImageFiles.length === 0 ? (
                      <div className="py-2">
                        <ImageIcon className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-indigo-900">Click chọn File / Ctrl+V dán ảnh</p>
                        <p className="text-[11px] text-gray-500 mt-1 px-2">Hỗ trợ quét nhiều ảnh/PDF cùng lúc.</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {aiImageFiles.map((file, idx) => (
                          <div key={idx} className="relative group border border-indigo-200 rounded-md bg-white p-1 shadow-sm">
                            {file.type.includes('image') ? <img src={URL.createObjectURL(file)} className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 flex items-center justify-center text-[10px] font-bold text-indigo-700 break-all overflow-hidden leading-tight">{file.name}</div>}
                            <button onClick={(e) => { e.stopPropagation(); setAiImageFiles(prev=>prev.filter((_,i)=>i!==idx)); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={handleScanAI} disabled={aiImageFiles.length===0 || isScanning} className="w-full bg-[#f97316] text-white font-black py-3 rounded-xl hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                    {isScanning ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>} AI BẮT ĐẦU QUÉT
                  </button>
                </div>
              ) : (
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
            </div>
          </div>
          
        </div>
          </>
        ) : (
          // Bảng câu hỏi (Sidebar Bản đồ câu hỏi) tương tự BlockEditor
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-left duration-200 relative">
             <div className="p-4 border-b border-gray-100 bg-indigo-50/50 flex items-center justify-between shrink-0">
                {!isSidebarCollapsed && (
                   <h3 className="font-black text-indigo-950 flex items-center gap-2 text-sm uppercase tracking-wider truncate">
                      <ListTodo className="w-4 h-4 text-indigo-600 shrink-0"/> Bản đồ câu hỏi
                   </h3>
                )}
                <button 
                   onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                   className="p-1 hover:bg-indigo-100 rounded text-indigo-700 mx-auto" 
                   title={isSidebarCollapsed ? "Mở rộng Bản đồ" : "Thu gọn Bản đồ"}
                >
                   {isSidebarCollapsed ? <ChevronRight className="w-5 h-5"/> : <ChevronLeft className="w-5 h-5"/>}
                </button>
             </div>
             
             {!isSidebarCollapsed && (
             <div className="flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-4 gap-2">
                   {parsedQuestions.map((q, idx) => {
                      const isSelected = activeQuestionIdx === idx;
                      const hasWarning = q.isDuplicate || (!q.image_url && (q.content.includes("HÌNH VẼ") || q.content.includes("ĐỒ THỊ") || q.content.includes("như hình") || q.content.includes("BẢNG BIẾN THIÊN")));
                      return (
                         <button
                            key={q.temp_id}
                            onClick={() => setActiveQuestionIdx(idx)}
                            title={`Câu ${idx + 1} · ${bankTypeLabel(q.question_type)} · ${difficultyLabel(q.difficulty)}`}
                            className={`h-10 rounded-lg text-xs font-black transition-all flex items-center justify-center relative border overflow-hidden ${
                               isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-indigo-300'
                            }`}
                         >
                            {idx + 1}
                            {/* Vạch màu dưới đáy: nhận biết ngay Dạng thức của từng câu */}
                            <span className={`absolute bottom-0 left-0 right-0 h-[3px] ${TYPE_STYLE[toBankType(q.question_type) ?? 'NLC']?.dot || 'bg-gray-300'}`} />
                            {hasWarning && (
                               <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-500 ring-1 ring-white animate-pulse" />
                            )}
                         </button>
                      );
                   })}
                </div>

                {/* TỔNG HỢP ĐỢT QUÉT: số câu theo Dạng thức và theo Mức độ */}
                <div className="mt-5 border-t border-gray-100 pt-4">
                   <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2.5">
                      Tổng hợp ({scanSummary.total} câu)
                   </h4>

                   <div className="space-y-1.5">
                      {scanSummary.typesPresent.map(t => (
                         <div key={t} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11.5px] font-bold ${TYPE_STYLE[t].chip}`}>
                            <span className="flex items-center gap-1.5 truncate">
                               <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_STYLE[t].dot}`} />
                               {TYPE_STYLE[t].label}
                            </span>
                            <span className="font-black shrink-0">{scanSummary.byType[t]}</span>
                         </div>
                      ))}
                   </div>

                   <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {DIFFICULTY_CODES.filter(d => scanSummary.byDifficulty[d] > 0).map(d => (
                         <div key={d} className={`flex items-center justify-between px-2 py-1 rounded-md border text-[10.5px] font-bold ${DIFF_STYLE[d]}`}>
                            <span className="truncate">{difficultyLabel(d)}</span>
                            <span className="font-black shrink-0 ml-1">{scanSummary.byDifficulty[d]}</span>
                         </div>
                      ))}
                   </div>

                   {/* Bảng chéo Dạng thức × Mức độ - nắm cấu trúc đề trong một cái liếc */}
                   {scanSummary.typesPresent.length > 0 && (
                      <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
                         <table className="w-full text-[10px] text-center border-collapse">
                            <thead className="bg-gray-50 text-gray-500">
                               <tr>
                                  <th className="px-1.5 py-1 text-left font-black">Dạng</th>
                                  <th className="px-1 py-1 font-black" title="Nhận biết">NB</th>
                                  <th className="px-1 py-1 font-black" title="Thông hiểu">TH</th>
                                  <th className="px-1 py-1 font-black" title="Vận dụng">VD</th>
                                  <th className="px-1 py-1 font-black" title="Vận dụng cao">VDC</th>
                               </tr>
                            </thead>
                            <tbody>
                               {scanSummary.typesPresent.map(t => (
                                  <tr key={t} className="border-t border-gray-100">
                                     <td className="px-1.5 py-1 text-left font-bold text-gray-700 whitespace-nowrap">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${TYPE_STYLE[t].dot}`} />
                                        {t}
                                     </td>
                                     {DIFFICULTY_CODES.map(d => (
                                        <td key={d} className={`px-1 py-1 font-bold ${scanSummary.matrix[t]?.[d] ? 'text-gray-800' : 'text-gray-300'}`}>
                                           {scanSummary.matrix[t]?.[d] || '·'}
                                        </td>
                                     ))}
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   )}
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
                   <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block shadow-sm"></span>
                      <span>Đang chỉnh sửa</span>
                   </div>
                   <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block animate-pulse"></span>
                      <span>Cần lưu ý</span>
                   </div>
                </div>

                <div className="mt-8 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                   <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Phím tắt nhanh</h4>
                   <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between"><span className="font-medium">Câu trước:</span><kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] shadow-sm font-sans font-bold">Alt + ←</kbd></div>
                      <div className="flex justify-between"><span className="font-medium">Câu tiếp theo:</span><kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] shadow-sm font-sans font-bold">Alt + →</kbd></div>
                   </div>
                </div>
             </div>

             <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <button 
                   onClick={() => {
                      if (confirm("Bạn có chắc muốn xoá hết và quét đề mới?")) {
                         setParsedQuestions([]);
                         setActiveQuestionIdx(0);
                      }
                   }} 
                   className="w-full mb-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold py-2 rounded-xl text-xs transition-colors"
                >
                   Quét Đề Mới (Hủy hết)
                </button>
                <button 
                   onClick={handleSaveAll} 
                   disabled={parsedQuestions.length === 0 || isSavingAll} 
                   className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                   {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveAll className="w-4.5 h-4.5" />} LƯU TẤT CẢ VÀO NGÂN HÀNG
                </button>
             </div>
             </div>
             )}
          </div>
        )}
      </div>

      {/* CỘT PHẢI: KẾT QUẢ & DANH SÁCH (65%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        {/* Header Right */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm shrink-0 z-10 relative">
          <div className="flex items-center gap-3">
            {parsedQuestions.length > 0 && (
              <button onClick={() => { if(confirm("Quay lại nhập đề mới sẽ hủy các câu chưa lưu. Đồng ý?")) { setParsedQuestions([]); setActiveQuestionIdx(0); } }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Quay lại nhập đề mới">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" /> Kết quả nhận diện ({parsedQuestions.length} câu)
            </h2>
          </div>
          
          {parsedQuestions.length > 0 && (
             <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-xl">
                <button 
                   onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                   disabled={activeQuestionIdx === 0}
                   className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 transition-colors"
                   title="Câu trước"
                >
                   <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[13px] font-black text-indigo-900 min-w-[80px] text-center">
                   Câu {activeQuestionIdx + 1} / {parsedQuestions.length}
                </span>
                <button 
                   onClick={() => setActiveQuestionIdx(prev => Math.min(parsedQuestions.length - 1, prev + 1))}
                   disabled={activeQuestionIdx === parsedQuestions.length - 1}
                   className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 transition-colors"
                   title="Câu sau"
                >
                   <ChevronRight className="w-5 h-5" />
                </button>
             </div>
          )}
          
          <button onClick={handleSaveAll} disabled={parsedQuestions.length === 0 || isSavingAll} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
            {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveAll className="w-5 h-5" />} Lưu tất cả
          </button>
        </div>

        {/* List of Questions */}
        <div className="flex-1 overflow-y-auto p-6">
          {parsedQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <CloudUpload className="w-20 h-20 text-gray-400 mb-4" />
              <p className="text-xl font-bold text-gray-500">Chưa có dữ liệu. Hãy quét ảnh ở cột bên trái!</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
               {(() => {
                  const q = parsedQuestions[activeQuestionIdx];
                  if (!q) return null;
                  return (
                     <div key={q.temp_id} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:border-indigo-200 transition-colors animate-in fade-in duration-200">
                        
                        {/* Alerts area */}
                        {q.isDuplicate && (
                          <div className="bg-red-50 text-red-700 p-3 text-[13px] font-bold border-b border-red-100 flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> CẢNH BÁO: Nội dung tương tự với một câu đã tồn tại trong Ngân hàng! Bạn nên "Bỏ câu này".
                          </div>
                        )}
                        
                        {(!q.image_url && (q.content.includes("HÌNH VẼ") || q.content.includes("ĐỒ THỊ") || q.content.includes("như hình") || q.content.includes("BẢNG BIẾN THIÊN"))) && (
                          <div className="bg-orange-50 text-orange-700 p-3 text-[13px] font-bold border-b border-orange-100 flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> CẢNH BÁO: Câu hỏi thiếu [chưa chèn ảnh/đồ thị (đề bài có từ khóa [HÌNH VẼ / BẢNG BIẾN THIÊN])]. Hãy bổ sung trước khi lưu!
                          </div>
                        )}

                        {q.image_url && (
                          <div className="bg-blue-50 text-blue-700 p-3 text-[13px] font-bold border-b border-blue-100 flex gap-2">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" /> INFO: Câu hỏi này có chứa hình ảnh tự động cắt. Vui lòng kiểm tra lại xem ảnh cắt đã chuẩn chưa (có thể dùng chức năng Cắt xén lại nếu cần).
                          </div>
                        )}

                        {/* Header: Toolbar & Toggle */}
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center rounded-t-2xl z-20 relative">
                           <div className="flex items-center gap-2 font-bold text-gray-700 text-[15px]">
                              <ListTodo className="w-4 h-4 text-teal-500"/> Soạn thảo câu hỏi {activeQuestionIdx + 1}
                           </div>
                           <div className="flex gap-1.5">
                              <button onClick={() => setPreviewingQuestion(q)} className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-md text-[11px] font-bold transition-colors">
                                 <Eye className="w-3.5 h-3.5"/> Xem trước
                              </button>
                              <button onClick={() => handleSaveSingle(q.temp_id!)} className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-md text-[11px] font-bold transition-colors">
                                 <Save className="w-3.5 h-3.5"/> Lưu câu này
                              </button>
                              <button onClick={() => handleRemoveQuestion(q.temp_id!)} className="p-1.5 hover:bg-red-100 rounded-md text-red-500 transition-colors">
                                 <Trash className="w-4 h-4"/>
                              </button>
                           </div>
                        </div>

                        <div className="p-6 space-y-6">
                    {/* PHẦN 1: CẤU TRÚC DANH MỤC & PHÂN LOẠI */}
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 shadow-inner">
                       <h3 className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          📂 Cấu trúc Chương / Bài / Dạng
                       </h3>
                       
                       <div className="grid grid-cols-3 gap-2.5 mb-3">
                          <select value={q.grade} onChange={e => handleMapCategory(q.temp_id!, 'grade', e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 bg-white text-center truncate outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                             {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                          </select>
                          <select value={q.subject} onChange={e => handleMapCategory(q.temp_id!, 'subject', e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 bg-white text-center truncate outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                             {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                          </select>
                          <select value={q.topic} onChange={e => handleMapCategory(q.temp_id!, 'topic', e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 bg-white text-center truncate outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                             {uniqueTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
                          </select>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3">
                          <div className={`border rounded-xl px-3 py-2 flex flex-col justify-center gap-2 ${q.isNewLesson ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-200 shadow-sm'}`}>
                             <div className="flex items-center gap-1.5">
                                {q.isNewLesson && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                                {!q.isNewLesson ? (
                                  <select value={q.lesson} onChange={e => handleMapCategory(q.temp_id!, 'lesson', e.target.value)} className="w-full bg-transparent text-[11px] font-bold text-gray-700 outline-none cursor-pointer truncate">
                                    <option value={q.lesson}>{q.lesson}</option>
                                    {uniqueLessons.filter(l => l !== q.lesson).map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-[11px] font-bold line-clamp-2 text-red-700">{q.lesson || 'Chưa phân bài học'}</span>
                                )}
                             </div>
                             {q.isNewLesson && (
                                <div className="flex flex-col gap-1.5 mt-1 border-t border-red-100 pt-1.5">
                                  <select onChange={e => handleMapCategory(q.temp_id!, 'lesson', e.target.value)} className="w-full text-[10px] p-1.5 border border-red-200 rounded-md bg-white text-gray-700 outline-none focus:border-red-500 font-medium shadow-sm cursor-pointer">
                                     <option value="">-- Ép về Tên Bài có sẵn --</option>
                                     {uniqueLessons.map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
                                  </select>
                                  <input 
                                    type="text" 
                                    value={q.lesson} 
                                    onChange={e => updateParsedQuestion(q.temp_id!, 'lesson', e.target.value)}
                                    placeholder="Nhập tên bài mới..." 
                                    className="w-full text-[10px] p-1.5 border border-red-200 rounded-md bg-white text-gray-700 outline-none focus:border-red-500 font-medium shadow-sm"
                                  />
                                  <button onClick={() => handleApproveNewCategory(q.temp_id!, 'lesson', q.lesson)} className="w-full py-1 text-[10px] font-black tracking-wide bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition-colors uppercase">Duyệt Tạo Mới</button>
                                </div>
                             )}
                          </div>
                          
                          <div className={`border rounded-xl px-3 py-2 flex flex-col justify-center gap-2 ${q.isNewMathForm ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-200 shadow-sm'}`}>
                             <div className="flex items-center gap-1.5">
                                {q.isNewMathForm && <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                                {!q.isNewMathForm ? (
                                  <select value={q.math_form} onChange={e => handleMapCategory(q.temp_id!, 'math_form', e.target.value)} className="w-full bg-transparent text-[11px] font-bold text-gray-700 outline-none cursor-pointer truncate">
                                    <option value={q.math_form}>{q.math_form}</option>
                                    {uniqueForms.filter(f => f !== q.math_form).map(f => <option key={f as string} value={f as string}>{f as string}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-[11px] font-bold line-clamp-2 text-orange-700">{q.math_form || 'Chưa phân dạng toán'}</span>
                                )}
                             </div>
                             {q.isNewMathForm && (
                               <div className="flex flex-col gap-1.5 mt-1 border-t border-orange-100 pt-1.5">
                                 <select onChange={e => handleMapCategory(q.temp_id!, 'math_form', e.target.value)} className="w-full text-[10px] p-1.5 border border-orange-200 rounded-md bg-white text-gray-700 outline-none focus:border-orange-500 font-medium shadow-sm cursor-pointer">
                                    <option value="">-- Ép về Dạng Toán có sẵn --</option>
                                    {uniqueForms.map(f => <option key={f as string} value={f as string}>{f as string}</option>)}
                                 </select>
                                 <input 
                                   type="text" 
                                   value={q.math_form} 
                                   onChange={e => updateParsedQuestion(q.temp_id!, 'math_form', e.target.value)}
                                   placeholder="Nhập dạng toán mới..." 
                                   className="w-full text-[10px] p-1.5 border border-orange-200 rounded-md bg-white text-gray-700 outline-none focus:border-orange-500 font-medium shadow-sm"
                                 />
                                 <button onClick={() => handleApproveNewCategory(q.temp_id!, 'math_form', q.math_form)} className="w-full py-1 text-[10px] font-black tracking-wide bg-orange-100 text-orange-700 border border-orange-200 rounded hover:bg-orange-200 transition-colors uppercase">Duyệt Tạo Mới</button>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* PHẦN 2: THỂ LOẠI & ĐỘ KHÓ */}
                    <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 shadow-sm">
                       <h3 className="text-xs font-black text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          ⚙️ Cấu hình câu hỏi
                       </h3>
                       <div className="flex gap-3">
                          <select value={q.question_type} onChange={e => updateParsedQuestion(q.temp_id!, 'question_type', e.target.value)} className="border border-gray-200 rounded-lg p-2 text-sm font-bold bg-white outline-none focus:border-indigo-500 flex-1 shadow-sm cursor-pointer">
                            <option value="NLC">Trắc nghiệm 4 lựa chọn</option>
                            <option value="DS">Đúng/Sai (4 Ý - Barem 2025)</option>
                            <option value="TLN">Trả lời ngắn / Điền khuyết</option>
                            <option value="TL">Tự luận / Trình bày chi tiết</option>
                          </select>
                          {/* Value dùng MÃ 1-4 đúng như chuẩn lưu trong CSDL. Trước đây dùng
                              nhãn chữ nên giá trị AI trả về ("2") không khớp option nào. */}
                          <select value={toDifficultyCode(q.difficulty) ?? '1'} onChange={e => updateParsedQuestion(q.temp_id!, 'difficulty', e.target.value)} className="border border-gray-200 rounded-lg p-2 text-sm font-bold bg-white outline-none focus:border-indigo-500 w-36 shadow-sm cursor-pointer">
                            {DIFFICULTY_CODES.map(code => (
                              <option key={code} value={code}>{difficultyLabel(code)}</option>
                            ))}
                          </select>
                       </div>
                    </div>

                    {/* PHẦN 3: ĐỀ BÀI */}
                    <div className="bg-violet-50/20 border border-violet-100 rounded-2xl p-4 shadow-sm">
                       <label className="block text-xs font-black text-violet-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          📝 Đề bài
                       </label>
                       <RichTextarea value={q.content} onValueChange={(v) => updateParsedQuestion(q.temp_id!, 'content', v)} minRows={4} />
                    </div>

                    {/* PHẦN 4: ĐÁP ÁN */}
                    <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                       <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          🎯 Đáp án
                       </label>
                       
                       {q.question_type === 'NLC' && (
                        <div className="grid grid-cols-2 gap-4 bg-white/70 p-4 rounded-xl border border-emerald-100/50 shadow-sm">
                           {['A', 'B', 'C', 'D'].map(opt => {
                              const key = `option_${opt.toLowerCase()}` as keyof QuestionData;
                              return (
                                <div key={opt} className="flex flex-col gap-1.5">
                                   <div className="flex items-center gap-2">
                                     <input type="radio" name={`correct_${q.temp_id}`} checked={q.correct_answer === opt} onChange={() => updateParsedQuestion(q.temp_id!, 'correct_answer', opt)} className="w-4.5 h-4.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                     <span className={`font-black text-sm ${q.correct_answer === opt ? 'text-emerald-700' : 'text-gray-500'}`}>Đáp án {opt}</span>
                                   </div>
                                   <RichTextarea value={q[key] as string || ''} onValueChange={(v) => updateParsedQuestion(q.temp_id!, key, v)} minRows={2} collapsibleToolbar={true} className="border-gray-200" />
                                </div>
                              );
                           })}
                        </div>
                      )}
                      
                      {q.question_type === 'DS' && (
                        <div className="grid grid-cols-1 gap-3 bg-white/70 p-4 rounded-xl border border-emerald-100/50 shadow-sm">
                           {['a', 'b', 'c', 'd'].map((opt, idx) => {
                              const key = `option_${opt}` as keyof QuestionData;
                              const isTrue = q.correct_answer?.charAt(idx) === 'D' || q.correct_answer?.charAt(idx) === 'T';
                              const toggleStatus = () => {
                                 let ansArr = (q.correct_answer || "SSSS").split('');
                                 while(ansArr.length < 4) ansArr.push('S');
                                 ansArr[idx] = isTrue ? 'S' : 'D';
                                 updateParsedQuestion(q.temp_id!, 'correct_answer', ansArr.join(''));
                              };
                              return (
                                <div key={opt} className="flex flex-col gap-1.5">
                                   <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-inner">
                                      <span className="font-black text-sm text-gray-700">Mệnh đề {opt.toUpperCase()}</span>
                                      <button onClick={toggleStatus} className={`px-3 py-1 rounded-lg text-xs font-black transition-colors shadow-sm ${isTrue ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200' : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'}`}>
                                        {isTrue ? "ĐÚNG (Sửa thành Sai)" : "SAI (Sửa thành Đúng)"}
                                      </button>
                                   </div>
                                   <RichTextarea value={q[key] as string || ''} onValueChange={(v) => updateParsedQuestion(q.temp_id!, key, v)} minRows={2} collapsibleToolbar={true} className="border-gray-200" />
                                </div>
                              );
                           })}
                        </div>
                      )}

                      {(q.question_type === 'TLN' || q.question_type === 'TL') && (
                        <div className="bg-white/70 p-4 rounded-xl border border-emerald-100/50 shadow-sm">
                           <input type="text" value={q.correct_answer} onChange={(e) => updateParsedQuestion(q.temp_id!, 'correct_answer', e.target.value)} placeholder={q.question_type === 'TLN' ? "Nhập kết quả cuối cùng (VD: 12.5)" : "Nhập đáp án ngắn gọn (tùy chọn)"} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold bg-white outline-none focus:border-emerald-500 shadow-sm" />
                        </div>
                      )}
                    </div>

                    {/* PHẦN 5: LỜI GIẢI CHI TIẾT */}
                    <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-4 shadow-sm">
                       <label className="block text-xs font-black text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          💡 Hướng dẫn giải chi tiết
                       </label>
                       <RichTextarea value={q.explanation} onValueChange={(v) => updateParsedQuestion(q.temp_id!, 'explanation', v)} minRows={4} />
                    </div>
                  </div>
                     </div>
                  );
               })()}
            </div>
          )}
        </div>

      </div>

      
      
      <QuestionPreviewModal 
        isOpen={!!previewingQuestion}
        onClose={() => setPreviewingQuestion(null)}
        question={previewingQuestion}
      />
    </div>
  );
}

