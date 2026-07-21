"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  ArrowLeft, Wand2, Copy, Save, Loader2, CheckCircle2, AlertCircle, ImageIcon, X, Eye, Edit3, Trash2, Database
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import QuestionBankModal from "@/components/admin/QuestionBankModal";

export default function QuestionGeneratorPage() {
  const router = useRouter();
  const supabase = createClient();

  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [globalGrade, setGlobalGrade] = useState("12");
  const [globalSubject, setGlobalSubject] = useState("Đại số");
  const [globalTopic, setGlobalTopic] = useState("");
  const [globalLesson, setGlobalLesson] = useState("");
  const [globalMathForm, setGlobalMathForm] = useState("");

  // Input State
  const [essayContent, setEssayContent] = useState("");
  const [essayExplanation, setEssayExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("2"); // 1-4
  const [aiImageFiles, setAiImageFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Output State
  const [generatedResults, setGeneratedResults] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Manual Backup State
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [manualJsonInput, setManualJsonInput] = useState("");

  // Question Bank Modal State
  const [isQuestionBankModalOpen, setIsQuestionBankModalOpen] = useState(false);

  useEffect(() => {
    supabase.from('question_categories').select('*').then(({data}) => {
      if (data) setCategories(data);
    });
  }, []);

  const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !globalGrade || c.grade === globalGrade).map(c => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject)).map(c => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (!globalTopic || c.topic === globalTopic)).map(c => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter(c => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (!globalTopic || c.topic === globalTopic) && (!globalLesson || c.lesson === globalLesson)).map(c => c.math_form))).filter(Boolean);

  const generatePrompt = () => {
    return `Bạn là một chuyên gia Toán học và chuyên gia ra đề thi trắc nghiệm.
Nhiệm vụ: Chuyển đổi câu hỏi tự luận sau thành một câu hỏi TRẮC NGHIỆM 4 ĐÁP ÁN.

[ĐỀ BÀI TỰ LUẬN GỐC]:
${essayContent}

${essayExplanation ? `[LỜI GIẢI GỐC ĐỂ THAM KHẢO]:\n${essayExplanation}\n` : ''}

[YÊU CẦU NGHIÊM NGẶT]:
1. Phân tích nội dung và tính toán/tìm ra đáp án chính xác tuyệt đối.
2. Tạo ra 3 đáp án nhiễu (sai lầm phổ biến). Các đáp án nhiễu phải logic, mô phỏng lỗi sai thường gặp của học sinh (như nhầm dấu, quên chia 2, áp dụng sai công thức). Mức độ đánh đố nhiễu: ${difficulty}/4.
3. ĐẢM BẢO CHỐNG TRÙNG LẶP: 4 đáp án phải độc lập tuyệt đối về mặt giá trị toán học (Không được có 2 đáp án cùng giá trị như 1/2 và 0.5).
4. Đồng nhất định dạng: 4 đáp án nên có cùng cấu trúc và độ dài tương đồng để không tạo ra "mẹo chọn".
5. Lời giải chi tiết: Bắt buộc viết lời giải tự luận chi tiết từng bước.
6. Mọi công thức Toán học PHẢI được bọc trong dấu $...$ (ví dụ: $\\frac{1}{2}$). KHÔNG dùng \\\\[ ... \\\\] hay $$ ... $$. KHÔNG escape markdown bừa bãi.

[PHÂN LOẠI DANH MỤC]:
Hãy tự động phân loại câu hỏi vào Chuyên đề, Bài học và Dạng toán phù hợp nhất dựa trên danh sách có sẵn dưới đây:
${!globalTopic ? `DANH SÁCH CHUYÊN ĐỀ:\n${uniqueTopics.map(t => `- ${t}`).join('\n')}\n` : ''}
${!globalLesson ? `DANH SÁCH BÀI HỌC:\n${uniqueLessons.map(l => `- ${l}`).join('\n')}\n` : ''}
${!globalMathForm ? `DANH SÁCH DẠNG TOÁN:\n${uniqueForms.map(f => `- ${f}`).join('\n')}\n` : ''}
Lưu ý: BẮT BUỘC ưu tiên sử dụng chính xác tên trong danh sách trên nếu có sự tương đồng.

[ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC]:
Trả về DUY NHẤT một mảng JSON (không bọc trong markdown tick \`\`\`json, chỉ mảng JSON thuần) với cấu trúc sau:
[
  {
    "topic": "${globalTopic || "Tên chuyên đề (Lấy từ danh sách hoặc tự suy luận)"}",
    "lesson": "${globalLesson || "Tên bài học (Lấy từ danh sách hoặc tự suy luận)"}",
    "math_form": "${globalMathForm || "Tên dạng toán (Lấy từ danh sách hoặc tự suy luận)"}",
    "question_text": "Nội dung câu hỏi (chỉnh sửa lại từ đề bài gốc cho phù hợp với trắc nghiệm, bọc toán bằng $...$)",
    "correct_answer": "Đáp án đúng (chỉ chứa nội dung, không chứa A, B, C, D)",
    "wrong_answers": ["Nhiễu 1", "Nhiễu 2", "Nhiễu 3"],
    "explanation": "Phương pháp giải:\\n[Phương pháp]\\n\\nLời giải:\\n[Lời giải chi tiết, dùng \\n để xuống dòng]"
  }
]`;
  };

  const processAndShuffleOutput = (items: any[]) => {
    const results = items.map((jsonObj, idx) => {
      if (!jsonObj || !jsonObj.question_text || !jsonObj.correct_answer || !Array.isArray(jsonObj.wrong_answers) || jsonObj.wrong_answers.length !== 3) {
        throw new Error(`Dữ liệu JSON từ AI không đúng cấu trúc ở câu ${idx + 1}.`);
      }

      const allOptions = [
        { text: jsonObj.correct_answer, isCorrect: true },
        { text: jsonObj.wrong_answers[0], isCorrect: false },
        { text: jsonObj.wrong_answers[1], isCorrect: false },
        { text: jsonObj.wrong_answers[2], isCorrect: false }
      ];

      for (let i = allOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
      }

      const correctIndex = allOptions.findIndex(o => o.isCorrect);
      const correctLetter = ['A', 'B', 'C', 'D'][correctIndex];

      return {
        id: `temp_${Date.now()}_${idx}`,
        topic: jsonObj.topic || globalTopic,
        lesson: jsonObj.lesson || globalLesson,
        math_form: jsonObj.math_form || globalMathForm,
        content: jsonObj.question_text,
        option_a: allOptions[0].text,
        option_b: allOptions[1].text,
        option_c: allOptions[2].text,
        option_d: allOptions[3].text,
        correct_answer: correctLetter,
        explanation: jsonObj.explanation
      };
    });

    setGeneratedResults(results);
  };

  const preprocessLaTeX = (text: string) => {
    if (!text) return "";
    let processed = text;
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
    processed = processed.replace(/\\begin\{center\}/g, '');
    processed = processed.replace(/\\end\{center\}/g, '');
    return processed;
  };

  const normalizeMathString = (str: string) => {
    if (!str) return "";
    return str
      .replace(/[\s\$\\\{\}]/g, '') // Bỏ khoảng trắng, $, \, {, }
      .replace(/dfrac/g, 'frac')    // Đồng nhất dfrac và frac
      .toLowerCase();
  };

  const handleAIFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAiImageFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleAIPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const newFiles = Array.from(e.clipboardData.files);
      setAiImageFiles(prev => [...prev, ...newFiles]);
      e.preventDefault();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); 
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerateAI = async () => {
    if (!essayContent.trim() && aiImageFiles.length === 0) return alert("Vui lòng nhập nội dung hoặc chọn ảnh đề bài!");
    if (!globalGrade || !globalSubject) return alert("Vui lòng chọn ít nhất Lớp và Phân môn!");

    setIsGenerating(true);
    setGeneratedResults([]);
    try {
      const keyRes = await fetch('/api/admin/gemini-key');
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.keys || keyData.keys.length === 0) throw new Error(keyData.error || "Không thể cấp phát khóa AI.");

      const keys = keyData.keys;
      if (!keys || keys.length === 0) throw new Error("Không tìm thấy danh sách khóa API.");
      
      const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
      let result;
      let success = false;
      let lastError;

      const prompt = generatePrompt();
      const parts: any[] = [{ text: prompt }];

      for (const file of aiImageFiles) {
        if (file.type.includes('image')) {
          const base64 = await fileToBase64(file);
          parts.push({
            inlineData: { data: base64, mimeType: file.type }
          });
        }
      }

      for (let i = 0; i < shuffledKeys.length; i++) {
        const key = shuffledKeys[i];
        const genAI = new GoogleGenerativeAI(key);
        
        try {
          // Thử model 3.1 trước
          const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
          result = await model.generateContent(parts);
          success = true;
          break; // Thành công thì thoát vòng lặp
        } catch (err: any) {
          console.warn(`[Key ${i+1}] Lỗi với gemini-3.1-pro-preview:`, err.message);
          
          try {
            // Nếu 3.1 lỗi (Quota 429, 503...), thử fallback sang 3.5-flash bằng chính key đó
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
            result = await fallbackModel.generateContent(parts);
            success = true;
            break; // Thành công thì thoát vòng lặp
          } catch (fallbackErr: any) {
            console.warn(`[Key ${i+1}] Lỗi cả fallback gemini-3.5-flash:`, fallbackErr.message);
            lastError = fallbackErr;
            // Tiếp tục vòng lặp để thử Key tiếp theo
          }
        }
      }

      if (!success || !result) {
        throw new Error(lastError?.message || "Tất cả các key API đều đã quá tải (503/429). Hệ thống tạm thời không thể xử lý.");
      }

      let text = result.response.text();
      
      // Cleanup JSON markdown if any
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(text);
      const items = Array.isArray(parsedData) ? parsedData : [parsedData];
      
      processAndShuffleOutput(items);
    } catch (e: any) {
      console.error(e);
      alert("Lỗi AI (Có thể do quá tải API hoặc model không tồn tại). Hãy thử dùng tính năng Prompt thủ công! Chi tiết lỗi: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualJsonSubmit = () => {
    try {
      let text = manualJsonInput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(text);
      const items = Array.isArray(parsedData) ? parsedData : [parsedData];
      processAndShuffleOutput(items);
      setShowManualPrompt(false);
    } catch (e: any) {
      alert("Lỗi khi đọc JSON thủ công: " + e.message);
    }
  };

  const handleSaveToBank = async () => {
    if (generatedResults.length === 0) return;
    
    try {
      // 1. Fetch existing questions to check duplicates
      const { data: existingQuestions, error: fetchErr } = await supabase
        .from('questions')
        .select('content')
        .eq('grade', globalGrade)
        .eq('subject', globalSubject);
      
      if (fetchErr) throw fetchErr;

      const existingNormalized = (existingQuestions || []).map(q => normalizeMathString(q.content));
      const inserts = [];
      let duplicateCount = 0;

      for (let i = 0; i < generatedResults.length; i++) {
        const res = generatedResults[i];
        const normContent = normalizeMathString(res.content);
        
        if (existingNormalized.includes(normContent)) {
          duplicateCount++;
          continue; // Skip duplicate
        }
        
        // Add to existing normalized array to prevent duplicates within the same batch
        existingNormalized.push(normContent);
        
        inserts.push({
          question_id: `CH_${Date.now()}_${i}`,
          grade: globalGrade,
          subject: globalSubject,
          topic: res.topic,
          lesson: res.lesson,
          math_form: res.math_form,
          question_type: "NLC",
          difficulty: difficulty,
          content: res.content,
          option_a: res.option_a,
          option_b: res.option_b,
          option_c: res.option_c,
          option_d: res.option_d,
          correct_answer: res.correct_answer,
          explanation: res.explanation,
          created_at: new Date().toISOString()
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('questions').insert(inserts);
        if (error) throw error;
      }

      alert(`Lưu thành công: ${inserts.length} câu.\nBỏ qua: ${duplicateCount} câu (do trùng lặp với dữ liệu trong Ngân hàng).`);
      setGeneratedResults([]);
      setEssayContent("");
      setEssayExplanation("");
    } catch (e: any) {
      alert("Lỗi khi lưu: " + e.message);
    }
  };

  const updateResult = (id: string, updates: any) => {
    setGeneratedResults(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeResult = (id: string) => {
    setGeneratedResults(prev => prev.filter(item => item.id !== id));
  };

  const handleInsertFromBank = (selectedQuestions: any[]) => {
    if (!selectedQuestions || selectedQuestions.length === 0) return;
    
    let newContent = essayContent;
    if (newContent && !newContent.endsWith('\n\n')) {
      newContent += '\n\n';
    }
    
    selectedQuestions.forEach((q, idx) => {
      newContent += `Câu ${idx + 1}:\n${q.content}\n\n`;
    });
    
    setEssayContent(newContent.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-indigo-600" />
              Công xưởng Tạo Câu Hỏi AI
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Tự động chuyển đổi Tự luận thành Trắc nghiệm 4 đáp án</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowManualPrompt(!showManualPrompt)} 
                className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${showManualPrompt ? 'bg-amber-100 text-amber-700' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
                <AlertCircle className="w-4 h-4" /> Prompt thủ công (Backup)
            </button>
        </div>
      </div>

      {/* Category Selection Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex gap-3 overflow-x-auto">
        <select value={globalGrade} onChange={e => { setGlobalGrade(e.target.value); setGlobalTopic(""); setGlobalLesson(""); setGlobalMathForm(""); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold min-w-[100px] outline-none">
          <option value="">-- Lớp --</option>
          {uniqueGrades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
        </select>
        <select value={globalSubject} onChange={e => { setGlobalSubject(e.target.value); setGlobalTopic(""); setGlobalLesson(""); setGlobalMathForm(""); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold min-w-[120px] outline-none">
          <option value="">-- Phân môn --</option>
          {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={globalTopic} onChange={e => { setGlobalTopic(e.target.value); setGlobalLesson(""); setGlobalMathForm(""); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold flex-1 min-w-[200px] outline-none">
          <option value="">-- Chọn Chương / Chuyên đề --</option>
          {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={globalLesson} onChange={e => { setGlobalLesson(e.target.value); setGlobalMathForm(""); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold flex-1 min-w-[200px] outline-none">
          <option value="">-- Chọn Bài học --</option>
          {uniqueLessons.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={globalMathForm} onChange={e => setGlobalMathForm(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold flex-1 min-w-[200px] outline-none">
          <option value="">-- Chọn Dạng toán --</option>
          {uniqueForms.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Input */}
        <div className="w-1/2 flex flex-col border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <div className="p-6 flex flex-col gap-5 shrink-0">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Đề bài tự luận gốc <span className="text-red-500">*</span></label>
                    <div 
                        className="border-2 border-dashed border-indigo-200 bg-white rounded-2xl p-4 transition-colors hover:border-indigo-400 focus-within:border-indigo-500"
                        onPaste={handleAIPaste}
                    >
                        <textarea 
                            value={essayContent}
                            onChange={(e) => setEssayContent(e.target.value)}
                            placeholder="Nhập nội dung text, hoặc ấn Ctrl+V để dán ảnh đề bài vào đây..."
                            className="w-full h-24 bg-transparent outline-none text-slate-700 resize-none font-medium mb-3"
                        />
                        
                        <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
                            <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleAIFileUpload} />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 text-sm"
                            >
                                <ImageIcon className="w-4 h-4" /> Chọn ảnh/PDF
                            </button>
                            <button 
                                onClick={() => setIsQuestionBankModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 font-bold rounded-lg hover:bg-orange-100 text-sm"
                            >
                                <Database className="w-4 h-4" /> Rút từ Ngân hàng
                            </button>
                            
                            {aiImageFiles.map((file, idx) => (
                                <div key={idx} className="relative group border border-indigo-200 rounded-md bg-white p-1 shadow-sm">
                                    {file.type.includes('image') ? <img src={URL.createObjectURL(file)} className="h-8 w-8 object-cover rounded" /> : <div className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-indigo-700 break-all overflow-hidden leading-tight">{file.name}</div>}
                                    <button onClick={(e) => { e.stopPropagation(); setAiImageFiles(prev=>prev.filter((_,i)=>i!==idx)); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hướng dẫn giải (Tùy chọn, giúp AI chính xác hơn)</label>
                    <textarea 
                        value={essayExplanation}
                        onChange={(e) => setEssayExplanation(e.target.value)}
                        placeholder="Nếu có sẵn lời giải, hãy dán vào đây để AI dựa vào đó sinh đáp án nhiễu..."
                        className="w-full h-32 p-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-slate-700 resize-none font-medium"
                    />
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                    <label className="text-sm font-bold text-slate-700 flex-1">Độ khó của đáp án nhiễu (1-4):</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="p-2 border-2 border-slate-200 rounded-lg outline-none font-bold text-indigo-600">
                        <option value="1">1 - Rất dễ loại trừ</option>
                        <option value="2">2 - Trung bình</option>
                        <option value="3">3 - Dễ nhầm lẫn</option>
                        <option value="4">4 - Rất lừa, bẫy tinh vi</option>
                    </select>
                </div>
                
                {showManualPrompt && (
                    <div className="mt-4 p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-amber-800 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Chế độ thủ công</h3>
                            <button 
                                onClick={() => navigator.clipboard.writeText(generatePrompt())}
                                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-700 font-bold text-sm flex items-center gap-2 hover:bg-amber-100"
                            >
                                <Copy className="w-4 h-4" /> Copy Prompt
                            </button>
                        </div>
                        <p className="text-sm text-amber-700 mb-3 font-medium">1. Copy prompt trên và dán vào ChatGPT / Claude / Gemini.<br/>2. Dán kết quả (JSON) AI trả về vào ô dưới đây:</p>
                        <textarea 
                            value={manualJsonInput}
                            onChange={(e) => setManualJsonInput(e.target.value)}
                            placeholder='Dán đoạn [ { "question_text": ... } ] vào đây...'
                            className="w-full h-32 p-3 border border-amber-300 rounded-xl outline-none font-mono text-sm mb-3"
                        />
                        <button 
                            onClick={handleManualJsonSubmit}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-colors"
                        >
                            Đọc dữ liệu JSON
                        </button>
                    </div>
                )}
            </div>
            
            <div className="p-6 bg-white border-t border-slate-200 mt-auto sticky bottom-0 z-10">
                <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || (!essayContent.trim() && aiImageFiles.length === 0)}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
                    {isGenerating ? "Hệ thống đang suy nghĩ..." : "TẠO TRẮC NGHIỆM TỰ ĐỘNG BẰNG AI"}
                </button>
            </div>
        </div>

        {/* Right Column: Output Preview */}
        <div className="w-1/2 bg-white flex flex-col overflow-y-auto">
            {generatedResults.length > 0 ? (
                <div className="flex flex-col h-full relative">
                    {/* Floating Controls */}
                    <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-indigo-100 p-4 z-20 flex items-center justify-between shadow-sm">
                        <span className="font-bold text-indigo-900 bg-indigo-100 px-3 py-1 rounded-full text-sm">Đã sinh: {generatedResults.length} câu</span>
                        <button 
                            onClick={() => {
                                const isAllPreview = generatedResults.every(r => r.isPreviewMode !== false);
                                setGeneratedResults(prev => prev.map(item => ({...item, isPreviewMode: !isAllPreview})));
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${generatedResults.every(r => r.isPreviewMode !== false) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
                        >
                            {generatedResults.every(r => r.isPreviewMode !== false) ? <><Edit3 className="w-4 h-4" /> BẬT CHẾ ĐỘ SỬA</> : <><Eye className="w-4 h-4" /> BẬT XEM TRƯỚC TẤT CẢ</>}
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        {generatedResults.map((res, index) => (
                            <div key={res.id} className="bg-indigo-50/30 p-6 rounded-3xl border-2 border-indigo-100 relative group">
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black shadow-md">
                                    {index + 1}
                                </div>
                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => updateResult(res.id, { isPreviewMode: res.isPreviewMode === false })}
                                        className="text-indigo-500 bg-white hover:bg-indigo-50 p-2 rounded-xl border border-indigo-200 shadow-sm"
                                        title={res.isPreviewMode !== false ? "Sửa câu này" : "Xem trước câu này"}
                                    >
                                        {res.isPreviewMode !== false ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => removeResult(res.id)}
                                        className="text-red-500 bg-white hover:bg-red-50 p-2 rounded-xl border border-red-200 shadow-sm"
                                        title="Xóa câu này"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="mb-4 p-4 bg-white border border-indigo-100 rounded-xl mt-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phân loại danh mục</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500">Chuyên đề:</label>
                                            <input type="text" value={res.topic || ""} onChange={e => updateResult(res.id, {topic: e.target.value})} className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500">Bài học:</label>
                                            <input type="text" value={res.lesson || ""} onChange={e => updateResult(res.id, {lesson: e.target.value})} className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500">Dạng toán:</label>
                                            <input type="text" value={res.math_form || ""} onChange={e => updateResult(res.id, {math_form: e.target.value})} className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-indigo-900 mb-4 text-lg">Đề bài:</h3>
                                {res.isPreviewMode !== false ? (
                                    <div className="w-full min-h-[100px] p-4 bg-white border border-indigo-200 rounded-xl mb-4 font-medium text-slate-800 prose prose-slate max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                                            {preprocessLaTeX(res.content)}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <textarea 
                                        value={res.content}
                                        onChange={(e) => updateResult(res.id, {content: e.target.value})}
                                        className="w-full min-h-[100px] p-4 bg-white border border-indigo-200 rounded-xl mb-4 font-medium text-slate-700 outline-indigo-400"
                                    />
                                )}
                                
                                <h3 className="font-bold text-indigo-900 mb-3 text-lg">4 Đáp án (Đã trộn tự động):</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {['A', 'B', 'C', 'D'].map(char => (
                                        <div key={char} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${res.correct_answer === char ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                            <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-black mt-1 ${res.correct_answer === char ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {char}
                                            </div>
                                            {res.isPreviewMode !== false ? (
                                                <div className="flex-1 min-h-[40px] font-medium text-slate-800 self-center py-1 overflow-x-auto">
                                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                                                        {preprocessLaTeX(res[`option_${char.toLowerCase()}`])}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <textarea 
                                                    value={res[`option_${char.toLowerCase()}`]}
                                                    onChange={(e) => updateResult(res.id, {[`option_${char.toLowerCase()}`]: e.target.value})}
                                                    className="flex-1 bg-transparent outline-none resize-none min-h-[40px] font-medium py-1"
                                                />
                                            )}
                                            {res.correct_answer === char && <CheckCircle2 className="w-5 h-5 text-green-500 mt-2 shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                                
                                <h3 className="font-bold text-indigo-900 mb-3 text-lg">Đáp án đúng:</h3>
                                <select 
                                    value={res.correct_answer}
                                    onChange={(e) => updateResult(res.id, {correct_answer: e.target.value})}
                                    className="w-full md:w-1/3 p-3 border-2 border-indigo-200 rounded-xl bg-white font-black text-indigo-700 outline-none mb-6"
                                >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>

                                <div className="bg-white p-6 rounded-3xl border-2 border-slate-200">
                                    <h3 className="font-bold text-slate-800 mb-3 text-lg">Hướng dẫn giải chi tiết:</h3>
                                    {res.isPreviewMode !== false ? (
                                        <div className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 prose prose-slate max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                                                {preprocessLaTeX(res.explanation)}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <textarea 
                                            value={res.explanation}
                                            onChange={(e) => updateResult(res.id, {explanation: e.target.value})}
                                            className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-slate-400"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4 sticky bottom-0 z-20">
                        <button 
                            onClick={() => setGeneratedResults([])}
                            className="px-6 py-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={handleSaveToBank}
                            className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <Save className="w-6 h-6" /> LƯU VÀO NGÂN HÀNG CÂU HỎI
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Wand2 className="w-12 h-12 text-slate-300" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-300 mb-2">Chưa có dữ liệu sinh ra</h2>
                    <p className="font-medium text-slate-400 max-w-sm">Hãy nhập câu hỏi tự luận ở cột bên trái và nhấn nút "Tạo Trắc Nghiệm" để AI bắt đầu làm việc.</p>
                </div>
            )}
        </div>
      </div>

      <QuestionBankModal 
        isOpen={isQuestionBankModalOpen}
        onClose={() => setIsQuestionBankModalOpen(false)}
        onInsert={handleInsertFromBank}
      />
    </div>
  );
}
