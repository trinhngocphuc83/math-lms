"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  ArrowLeft, Image as ImageIcon, Trash2, Code2, Bot, Eye,
  Wand2, AlertCircle, Loader2, Copy, SaveAll, Edit, Trash, CloudUpload, X, Save, Info
} from "lucide-react";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import QuestionPreviewModal from "@/components/admin/QuestionPreviewModal";

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
  const [apiKey, setApiKey] = useState("");
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [globalGrade, setGlobalGrade] = useState("12");
  const [globalSubject, setGlobalSubject] = useState("Đại số");
  const [globalTopic, setGlobalTopic] = useState("");
  const [globalLesson, setGlobalLesson] = useState("");

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
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [previewingQuestion, setPreviewingQuestion] = useState<QuestionData | null>(null);

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('question_categories').select('*').then(({data}) => {
      if(data) setCategories(data);
    });
  }, []);

  const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !globalGrade || c.grade === globalGrade).map(c => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject)).map(c => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (!globalTopic || c.topic === globalTopic)).map(c => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (!globalTopic || c.topic === globalTopic) && (!globalLesson || c.lesson === globalLesson)).map(c => c.math_form))).filter(Boolean);

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) { setApiKey(savedKey); setIsKeySaved(true); }
    
    // Fetch all existing questions once to check duplicates later
    const fetchExisting = async () => {
      const { data } = await supabase.from('questions').select('question_id, content');
      if (data) {
        setExistingQuestions(data.map(d => ({
          id: d.question_id,
          content: (d.content || "").trim().toLowerCase().replace(/\s+/g, '')
        })));
      }
    };
    fetchExisting();
  }, []);

  const saveApiKey = () => {
    if (!apiKey) return alert("Vui lòng nhập API Key!");
    localStorage.setItem("gemini_api_key", apiKey);
    setIsKeySaved(true); alert("Lưu API Key thành công!");
  };

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
      
      // Fix "Bad escaped character": AI sometimes forgets to escape \ in LaTeX (\frac, \sum...)
      // We will try to pre-process the JSON string to escape unescaped backslashes.
      // But we must be careful not to escape already escaped ones like \n, \t, \", \\
      // A simple regex to escape \ that are followed by characters other than " \ / b f n r t
      // Actually, \f \b \r \n \t inside math are not meant to be control chars, so escaping all single \ might be safer except \" and \\.
      let cleanStr = jsonStr;
      cleanStr = cleanStr.replace(/\\(?!["]|[/]|[\\]|[b]|[f]|[n]|[r]|[t])/g, "\\\\");
      // Furthermore, if \frac is present, JSON will think it's form feed (\f). We should escape \f, \b, \n, \r, \t if they are part of math, but we don't know.
      // Best way is to rely on Prompt.

      if (firstBracket !== -1) {
        cleanStr = cleanStr.substring(firstBracket, lastBracket + 1);
        try {
          parsedData = JSON.parse(cleanStr);
        } catch(e) {
          // Fallback if cleanStr fails, try raw
          parsedData = JSON.parse(jsonStr.substring(firstBracket, lastBracket + 1));
        }
      } else {
        // Fallback for single object
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1) {
          cleanStr = cleanStr.substring(firstBrace, lastBrace + 1);
          try {
            parsedData = [JSON.parse(cleanStr)];
          } catch(e) {
            parsedData = [JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1))];
          }
        } else {
          throw new Error("Không tìm thấy cấu trúc mảng JSON");
        }
      }

      const newQuestions: QuestionData[] = parsedData.map(data => {
        const qContent = data.noiDung || "";
        const normalizedContent = qContent.trim().toLowerCase().replace(/\s+/g, '');
        const duplicateMatch = existingQuestions.find(eq => eq.content === normalizedContent && eq.content !== "");

        const lesson = data.tenBai || "";
        const math_form = data.dangToan || "";
        const isNewLesson = lesson !== "" && !uniqueLessons.includes(lesson);
        const isNewMathForm = math_form !== "" && !uniqueForms.includes(math_form);

        return {
          temp_id: `TEMP_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          grade: data.lop || globalGrade || "12",
          subject: data.phanMon || globalSubject || "Đại số",
          topic: data.chuyenDe || globalTopic || "",
          lesson: lesson,
          math_form: math_form,
          isNewLesson,
          isNewMathForm,
          question_type: data.loaiCauHoi || "NLC",
          difficulty: data.mucDo || "1",
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
      });

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
    if (!apiKey) return alert("Vui lòng nhập API Key!");

    setIsScanning(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const contextCategories = `
DANH SÁCH BÀI HỌC ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueLessons.map(l => `- ${l}`).join("\n")}

DANH SÁCH DẠNG TOÁN ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueForms.map(f => `- ${f}`).join("\n")}
`;

      const prompt = `Bạn là chuyên gia Toán học. Hãy đọc (các) ảnh/file PDF này và bóc tách TẤT CẢ các câu hỏi có trong đó. 
Trả về MỘT MẢNG JSON duy nhất (bắt đầu bằng [ và kết thúc bằng ]) chứa các object theo cấu trúc:
[
  {
    "lop": "${globalGrade || 'Tự suy luận'}",
    "phanMon": "${globalSubject || 'Tự suy luận'}",
    "chuyenDe": "${globalTopic || 'Tự suy luận'}", ${globalTopic ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA ĐỔI BẤT KỲ KÝ TỰ NÀO.' : '// BẮT BUỘC: Tên Chương hoặc Chủ đề (VD: Chương I. Phương trình)'}
    "tenBai": "${globalLesson || 'Tự suy luận'}", ${globalLesson ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA ĐỔI BẤT KỲ KÝ TỰ NÀO.' : '// SO KHỚP VỚI DANH SÁCH BÊN DƯỚI. Nếu có bài tương tự, PHẢI COPY CHÍNH XÁC.'}
    "dangToan": "Tự suy luận", // SO KHỚP VỚI DANH SÁCH BÊN DƯỚI. Nếu có dạng tương tự, PHẢI COPY CHÍNH XÁC.
    "loaiCauHoi": "NLC", // NLC (Trắc nghiệm 4 đáp án), DS (Đúng/Sai), TLN (Trả lời ngắn), TL (Tự luận)
    "mucDo": "1", // 1(Nhận biết), 2(Thông hiểu), 3(Vận dụng), 4(Vận dụng cao)
    "noiDung": "Đề bài (BẮT BUỘC dùng LaTeX bọc trong $...$)",
    "dapAnA": "Nội dung A", "dapAnB": "Nội dung B", "dapAnC": "Nội dung C", "dapAnD": "Nội dung D",
    "dapAnDung": "A",
    "loiGiai": "Phương pháp giải:\\n[Ghi phương pháp ở đây]\\n\\nLời giải:\\n[Ghi lời giải chi tiết ở đây]"
  }
]
  YÊU CẦU CỰC QUAN TRỌNG VỀ BÓC TÁCH: Bạn phải phân tích và bóc tách RẠCH RÒI 3 trường "chuyenDe" (Chương), "tenBai" (Bài học), và "dangToan" (Dạng toán). Tuyệt đối không gộp chung nội dung của chúng vào nhau.
  
  CƠ SỞ DỮ LIỆU ĐỐI CHIẾU: 
  Bạn BẮT BUỘC PHẢI PHÂN LOẠI câu hỏi vào các Tên bài học và Dạng toán có trong danh sách dưới đây nếu có sự tương đồng. TUYỆT ĐỐI HẠN CHẾ TẠO MỚI (Chỉ được tự suy luận ra Dạng toán mới nếu trong danh sách thực sự không có dạng nào liên quan).
  ${contextCategories}

  LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG VÀ TÁCH CÂU: 
  1. NẾU MỘT BÀI TOÁN TỰ LUẬN CÓ NHIỀU Ý NHỎ (a, b, c, d...): BẠN BẮT BUỘC PHẢI TÁCH MỖI Ý THÀNH 1 OBJECT CÂU HỎI ĐỘC LẬP.
     - Ví dụ đề bài gốc là: "Bài 1. Giải phương trình: a) X=1 b) Y=2"
     - TRẢ VÊ 2 OBJECT ĐỘC LẬP: 
       + Object 1 có nội dung: "Giải phương trình: $X=1$", đánh giá mức độ riêng, dạng toán riêng, lời giải riêng cho câu a.
       + Object 2 có nội dung: "Giải phương trình: $Y=2$", đánh giá mức độ riêng, dạng toán riêng, lời giải riêng cho câu b.
     - BẮT BUỘC: Phải tự động ghép thêm phần "dẫn nhập chung" của bài lớn vào đầu nội dung mỗi ý nhỏ để câu hỏi đứng độc lập vẫn có nghĩa.
     - TUYỆT ĐỐI KHÔNG: Không được đưa các tiền tố như "Bài 1.", "Bài 1a.", "Câu 2.", "a)", "b)" vào đầu nội dung câu hỏi. Hãy xóa bỏ hoàn toàn các ký hiệu đánh số này. Lấy thẳng vào nội dung chính.
  2. GIỮ NGUYÊN DANH MỤC: Nếu trường "chuyenDe" hoặc "tenBai" trong mẫu JSON đã được điền sẵn một giá trị (Không phải chữ "Tự suy luận"), BẠN PHẢI GIỮ NGUYÊN CHÍNH XÁC CHUỖI ĐÓ, KHÔNG ĐƯỢC TỰ Ý CẮT BỎ CÁC TIỀN TỐ (như "Chương I.", "Bài 2.") HAY THAY ĐỔI BẤT KỲ KÝ TỰ NÀO.
  3. Để không làm hỏng cấu trúc JSON, BẠN BẮT BUỘC phải dùng 2 dấu gạch chéo (\\\\) cho TẤT CẢ các lệnh LaTeX. Ví dụ: Phải viết $\\\\frac{1}{2}$ thay vì $\\frac{1}{2}$, viết $\\\\sqrt{2}$ thay vì $\\sqrt{2}$.
  4. NẾU TRONG ĐỀ CÓ HÌNH VẼ, ĐỒ THỊ, BẢNG BIẾN THIÊN, HOẶC BẢNG XÉT DẤU: Tuyệt đối KHÔNG cố gắng vẽ lại bằng Markdown, ASCII hay LaTeX. Thay vào đó, hãy chỉ ghi đúng chữ "[HÌNH VẼ]" hoặc "[BẢNG BIẾN THIÊN]" vào vị trí đó trong nội dung. Người dùng sẽ tự chèn ảnh vào sau.`;

      const parts = await Promise.all(aiImageFiles.map(async file => {
        const base64Data = await fileToBase64(file);
        return { inlineData: { data: base64Data, mimeType: file.type } };
      }));

      const result = await model.generateContent([ prompt, ...parts ]);
      const text = result.response.text();
      processExtractedJson(text);
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
    const contextCategories = `
DANH SÁCH BÀI HỌC ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueLessons.map(l => `- ${l}`).join("\n")}

DANH SÁCH DẠNG TOÁN ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueForms.map(f => `- ${f}`).join("\n")}
`;

    const prompt = `Bạn là chuyên gia Toán học. Hãy bóc tách TẤT CẢ câu hỏi trong ảnh/file và trả về MỘT MẢNG JSON:
[
  {
    "lop": "${globalGrade || 'Tự suy luận'}", "phanMon": "${globalSubject || 'Tự suy luận'}", 
    "chuyenDe": "${globalTopic || 'Tự suy luận'}", ${globalTopic ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, KHÔNG SỬA ĐỔI' : ''}
    "tenBai": "${globalLesson || 'Tự suy luận'}", ${globalLesson ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, KHÔNG SỬA ĐỔI' : ''}
    "dangToan": "Tự suy luận", // BẮT BUỘC PHẢI LẤY TỪ DANH SÁCH BÊN DƯỚI NẾU CÓ DẠNG TƯƠNG ĐƯƠNG, 
    "loaiCauHoi": "NLC", "mucDo": "1",
    "noiDung": "Đề bài dùng LaTeX bọc trong $...$",
    "dapAnA": "", "dapAnB": "", "dapAnC": "", "dapAnD": "", "dapAnDung": "",
    "loiGiai": "Phương pháp giải:\\n[Ghi phương pháp ở đây]\\n\\nLời giải:\\n[Ghi lời giải chi tiết ở đây]"
  }
]
  CƠ SỞ DỮ LIỆU ĐỐI CHIẾU: 
  Bạn BẮT BUỘC PHẢI PHÂN LOẠI câu hỏi vào các Tên bài học và Dạng toán có trong danh sách dưới đây nếu có sự tương đồng. TUYỆT ĐỐI HẠN CHẾ TẠO MỚI.
  ${contextCategories}

  LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG VÀ TÁCH CÂU: 
  1. NẾU MỘT BÀI TOÁN TỰ LUẬN CÓ NHIỀU Ý NHỎ: BẮT BUỘC TÁCH MỖI Ý THÀNH 1 OBJECT ĐỘC LẬP. Ghép "dẫn chung" vào mỗi ý nhỏ. TUYỆT ĐỐI XÓA BỎ các tiền tố đánh số như "Bài 1.", "Bài 1a.", "Câu 2.", "a)". (VD Nội dung chuẩn: "Giải pt: $X=1$").
  2. GIỮ NGUYÊN DANH MỤC: Nếu "chuyenDe" hoặc "tenBai" đã được điền sẵn giá trị, BẠN PHẢI GIỮ NGUYÊN CHÍNH XÁC CHUỖI ĐÓ, KHÔNG ĐƯỢC TỰ Ý CẮT BỎ TIỀN TỐ (như "Chương I.", "Bài 2.") HAY THAY ĐỔI GÌ.
  3. Để không làm hỏng cấu trúc JSON, BẠN BẮT BUỘC phải dùng 2 dấu gạch chéo (\\\\) cho TẤT CẢ lệnh LaTeX. Ví dụ: $\\\\frac{1}{2}$ thay vì $\\frac{1}{2}$. Mọi công thức Toán bọc trong $...$
  4. KHÔNG vẽ lại hình vẽ, đồ thị, hay bảng biến thiên. Hãy ghi "[HÌNH VẼ]" hoặc "[BẢNG BIẾN THIÊN]" thay thế.`;
    navigator.clipboard.writeText(prompt);
    alert("Đã Copy Prompt Chuẩn!");
  };

  // --- ACTIONS ---
  const handleRemoveQuestion = (tempId: string) => {
    setParsedQuestions(prev => prev.filter(q => q.temp_id !== tempId));
  };

  const handleSaveAll = async () => {
    if (parsedQuestions.length === 0) return alert("Chưa có câu hỏi nào để lưu!");
    setIsSavingAll(true);

    try {
      // 1. Lọc và chuẩn bị lưu các danh mục mới (nếu có)
      const newCats = parsedQuestions.filter(q => q.isNewLesson || q.isNewMathForm).map(q => ({
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
      }));
      // Loại bỏ trùng lặp trong mảng newCats
      const uniqueNewCats = Array.from(new Set(newCats.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
      
      if (uniqueNewCats.length > 0) {
        const { error: catError } = await supabase.from('question_categories').insert(uniqueNewCats);
        if (catError) console.error("Lỗi thêm danh mục mới:", catError);
      }

      const inserts = parsedQuestions.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
        grade: q.grade,
        subject: q.subject,
        topic: q.topic,
        lesson: q.lesson,
        math_form: q.math_form,
        question_type: q.question_type,
        difficulty: q.difficulty,
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

      alert(`Đã lưu thành công ${inserts.length} câu vào Ngân hàng!`);
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
        math_form: q.math_form, question_type: q.question_type, difficulty: q.difficulty, content: q.content,
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

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden text-gray-800">
      
      {/* CỘT TRÁI: ĐIỀU KHIỂN & AI (35%) */}
      <div className="w-[380px] flex flex-col bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
        
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
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Chuyên đề</label>
                <select value={globalTopic} onChange={e=>setGlobalTopic(e.target.value)} className="w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 bg-white">
                  <option value="">-- AI tự trích xuất --</option>
                  {uniqueTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
                </select>
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
              <button onClick={()=>setAiTab('api')} className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${aiTab==='api'?'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600':'text-gray-500 hover:bg-gray-50'}`}>Dùng API Trực Tiếp</button>
              <button onClick={()=>setAiTab('manual')} className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${aiTab==='manual'?'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600':'text-gray-500 hover:bg-gray-50'}`}>Web Dự Phòng</button>
            </div>

            <div className="p-4">
              {aiTab === 'api' ? (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Gemini API Key</label>
                    <div className="flex gap-2">
                      <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} className="flex-1 text-sm border rounded-lg p-2 outline-none focus:border-indigo-500 bg-gray-50" placeholder="AIzaSy..." />
                      <button onClick={saveApiKey} className="bg-gray-800 text-white px-3 rounded-lg text-xs font-bold hover:bg-gray-700">Lưu</button>
                    </div>
                  </div>

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
      </div>

      {/* CỘT PHẢI: KẾT QUẢ & DANH SÁCH (65%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        {/* Header Right */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm shrink-0 z-10 relative">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" /> Kết quả nhận diện ({parsedQuestions.length} câu)
          </h2>
          <button onClick={handleSaveAll} disabled={parsedQuestions.length === 0 || isSavingAll} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
            {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveAll className="w-5 h-5" />} Lưu tất cả vào Ngân hàng
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
            <div className="space-y-6 max-w-4xl mx-auto">
              {parsedQuestions.map((q, idx) => (
                <div key={q.temp_id} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:border-indigo-200 transition-colors">
                  
                  {/* Alerts area */}
                  {q.isDuplicate && (
                    <div className="bg-red-50 text-red-700 p-3 text-[13px] font-bold border-b border-red-100 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> CẢNH BÁO: Nội dung tương tự với một câu đã tồn tại trong Ngân hàng! Bạn nên "Bỏ câu này".
                    </div>
                  )}
                  
                  {(!q.image_url && (q.content.includes("HÌNH VẼ") || q.content.includes("ĐỒ THỊ") || q.content.includes("như hình") || q.content.includes("BẢNG BIẾN THIÊN"))) && (
                    <div className="bg-orange-50 text-orange-700 p-3 text-[13px] font-bold border-b border-orange-100 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> CẢNH BÁO: Câu hỏi thiếu [chưa chèn ảnh/đồ thị (đề bài có từ khóa [HÌNH VẼ / BẢNG BIẾN THIÊN])]. Hãy bấm "Sửa" bổ sung trước khi lưu!
                    </div>
                  )}

                  {q.image_url && (
                    <div className="bg-blue-50 text-blue-700 p-3 text-[13px] font-bold border-b border-blue-100 flex gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" /> INFO: Câu hỏi này có chứa hình ảnh tự động cắt. Vui lòng bấm "Sửa" và kiểm tra lại xem ảnh cắt đã chuẩn chưa (có thể dùng chức năng Cắt xén lại nếu cần).
                    </div>
                  )}

                  {/* Body area */}
                  <div className="p-5">
                    {/* Header info */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <select value={q.grade} onChange={e => handleMapCategory(q.temp_id!, 'grade', e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 bg-white text-center truncate outline-none focus:border-indigo-500 cursor-pointer">
                         {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                      </select>
                      <select value={q.subject} onChange={e => handleMapCategory(q.temp_id!, 'subject', e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 bg-white text-center truncate outline-none focus:border-indigo-500 cursor-pointer">
                         {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                      </select>
                      <select value={q.topic} onChange={e => handleMapCategory(q.temp_id!, 'topic', e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 bg-white text-center truncate outline-none focus:border-indigo-500 cursor-pointer">
                         {uniqueTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className={`border rounded-lg px-3 py-2 flex flex-col justify-center gap-2 ${q.isNewLesson ? 'bg-red-50 border-red-200 shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
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
                             <button onClick={() => handleMapCategory(q.temp_id!, 'lesson', q.lesson)} className="w-full py-1 text-[10px] font-black tracking-wide bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition-colors uppercase">Duyệt Tạo Mới</button>
                           </div>
                         )}
                      </div>
                      
                      <div className={`border rounded-lg px-3 py-2 flex flex-col justify-center gap-2 ${q.isNewMathForm ? 'bg-orange-50 border-orange-200 shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
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
                             <button onClick={() => handleMapCategory(q.temp_id!, 'math_form', q.math_form)} className="w-full py-1 text-[10px] font-black tracking-wide bg-orange-100 text-orange-700 border border-orange-200 rounded hover:bg-orange-200 transition-colors uppercase">Duyệt Tạo Mới</button>
                           </div>
                         )}
                      </div>
                    </div>

                    {/* Preview Text */}
                    <div className="space-y-1.5 mb-4">
                      <p className="text-sm"><span className="font-bold text-indigo-700">Loại:</span> {q.question_type} | <span className="font-bold text-indigo-700">Mức độ:</span> {q.difficulty}</p>
                      <p className="text-sm text-gray-800 font-mono leading-relaxed line-clamp-3 bg-gray-50 p-2 rounded border"><span className="font-bold text-indigo-700 font-sans">Nội dung:</span> {q.content}</p>
                      <p className="text-sm"><span className="font-bold text-emerald-600">Đáp án đúng:</span> <span className="font-bold text-emerald-700">{q.correct_answer}</span></p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                      <button onClick={() => setPreviewingQuestion(q)} className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors border border-orange-200">
                        <Eye className="w-4 h-4" /> Xem trước
                      </button>
                      <button onClick={() => setEditingQuestion(q)} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-200">
                        <Edit className="w-4 h-4" /> Sửa
                      </button>
                      <button onClick={() => handleSaveSingle(q.temp_id!)} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
                        <Save className="w-4 h-4" /> Lưu câu này
                      </button>
                      <div className="flex-1"></div>
                      <button onClick={() => handleRemoveQuestion(q.temp_id!)} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors border border-red-200">
                        <Trash className="w-4 h-4" /> Bỏ câu này
                      </button>
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
        onClose={() => setEditingQuestion(null)} 
        question={editingQuestion} 
        onSave={handleModalSave} 
      />
      
      <QuestionPreviewModal 
        isOpen={!!previewingQuestion}
        onClose={() => setPreviewingQuestion(null)}
        question={previewingQuestion}
      />
    </div>
  );
}
