"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { 
  ShieldAlert, Save, ArrowLeft, Clock, FileText, Settings, Database, UploadCloud, Copy, Image as ImageIcon, Bot, Code2, AlertTriangle, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { MathRenderer } from "@/components/MathRenderer";

export default function EditOnlineExamPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(45);
  const [examGroupName, setExamGroupName] = useState("");
  const [variantName, setVariantName] = useState("");
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [systemCourses, setSystemCourses] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('id, title').order('created_at', { ascending: false });
      if (data) setSystemCourses(data);
    };
    fetchCourses();
  }, [supabase]);
  const [password, setPassword] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResults, setShowResults] = useState("LATER");
  const [maxCheatWarnings, setMaxCheatWarnings] = useState(3);

  // Nhập đề thi
  const [importMethod, setImportMethod] = useState("AI"); // 'BANK' or 'AI'
  const [rawHtml, setRawHtml] = useState("");
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{name: string, base64: string, mimeType: string} | null>(null);

  const defaultPrompt = "Phân tích đề thi sau thành mảng các câu hỏi trắc nghiệm và tự luận. Trích xuất chính xác văn bản, đáp án và giải thích. Yêu cầu có cờ hasMediaWarning=true và mediaWarningNote nếu phát hiện câu hỏi chứa hình ảnh/bảng biểu ở tài liệu gốc.";
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(defaultPrompt);

  const [examData, setExamData] = useState<any[]>([]); // Danh sách câu hỏi sau khi parse
  const [isParsing, setIsParsing] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  
  // Các lựa chọn mới
  const [grade, setGrade] = useState("12");
  const [structure, setStructure] = useState("1"); // 1: Full tự luận, 2: TN+TL (4:6), 3: TN+ĐS+TLN+TL (3:2:2:3), 4: TN+ĐS+TLN (3:4:3)

  React.useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/admin/exams/${params.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setTitle(data.title || "");
        setExamData(data.exam_data || []);
        setDuration(data.duration_minutes || 45);
        setExamGroupName(data.exam_group_name || "");
        setVariantName(data.variant_name || "");
        setAssignedClasses(data.assigned_classes || []);
        if (data.description) {
            try {
              const meta = JSON.parse(data.description);
              if (meta.grade) setGrade(meta.grade);
              if (meta.structure) setStructure(meta.structure);
            } catch(e) {}
        }
        if (data.start_time) setStartTime(data.start_time.slice(0, 16));
        if (data.end_time) setEndTime(data.end_time.slice(0, 16));
        if (data.password) setPassword(data.password);
        setShuffleQuestions(!!data.shuffle_questions);
        setShuffleOptions(!!data.shuffle_options);
        setShowResults(!!data.show_results);
        setMaxCheatWarnings(data.max_cheat_warnings || 3);
        
        try {
          if (data.description) {
            const meta = JSON.parse(data.description);
            if (meta.grade) setGrade(meta.grade);
            if (meta.structure) setStructure(meta.structure);
          }
        } catch(e) {}
      } catch (err) {
        console.error(err);
        alert("Lỗi tải thông tin đề thi cũ");
      } finally {
        setIsInitializing(false);
      }
    };
    fetchExam();
  }, [params.id]);

  const updateQuestionField = (idx: number, field: string, value: any) => {
    setExamData(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOptionField = (qIdx: number, optIdx: number, value: string) => {
    setExamData(prev => prev.map((q, i) => {
      if (i === qIdx) {
        const newOpts = [...q.options];
        newOpts[optIdx] = value;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const markMediaResolved = (idx: number) => {
    setExamData(prev => prev.map((q, i) => i === idx ? { ...q, hasMediaWarning: false } : q));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
       // Cảnh báo nếu không phải PDF (hiện tại hỗ trợ PDF tốt nhất)
       if (!window.confirm("Hệ thống AI xử lý file PDF tốt nhất. File Word (.docx) có thể bị mất định dạng công thức. Bạn có muốn tiếp tục?")) {
         if (fileInputRef.current) fileInputRef.current.value = "";
         return;
       }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
       const result = event.target?.result as string;
       const base64Data = result.split(',')[1]; // Lấy phần base64 sau dấu phẩy
       setUploadedFile({
         name: file.name,
         base64: base64Data,
         mimeType: file.type || 'application/pdf'
       });
       setRawHtml(""); // Reset khung text nếu đã chọn file
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
             const base64 = event.target?.result as string;
             // Chèn ảnh vào vị trí con trỏ
             document.execCommand("insertImage", false, base64);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("Vui lòng nhập tên kỳ thi!");
    if (examData.length === 0) return alert("Kỳ thi chưa có câu hỏi nào!");

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      title: (examGroupName ? examGroupName + ' - ' : '') + (variantName || title),
      exam_group_name: examGroupName || title,
      variant_name: variantName || "Đề gốc",
      assigned_classes: assignedClasses,
      description: JSON.stringify({ grade, structure }),
      exam_data: examData,
      duration_minutes: duration,
      start_time: startTime ? new Date(startTime).toISOString() : null,
      end_time: endTime ? new Date(endTime).toISOString() : null,
      password: password || null,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      show_results: showResults,
      max_cheat_warnings: maxCheatWarnings,
      status: "PUBLISHED",
      created_by: user?.id
    };

    try {
      const res = await fetch(`/api/admin/exams/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      
      if (!res.ok) throw new Error(resData.error || "Lỗi lưu đề thi");
      
      router.push("/admin/online-exams");
    } catch (err: any) {
      alert("Lỗi khi lưu kỳ thi: " + err.message);
      setLoading(false);
    }
  };

  const [manualJson, setManualJson] = useState("");

  const handleFixLatexAI = async (idx: number, isQuestion: boolean, optIdx?: number) => {
    try {
      const contentToFix = isQuestion ? examData[idx].question : examData[idx].options[optIdx!];
      const res = await fetch("/api/exams/fix-latex", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: contentToFix })
      });
      const data = await res.json();
      if (res.ok) {
        if (isQuestion) updateQuestionField(idx, 'question', data.fixedHtml);
        else updateOptionField(idx, optIdx!, data.fixedHtml);
      } else {
        alert("Lỗi AI: " + data.error);
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ AI");
    }
  };

  const handleParseManualJSON = () => {
    if (!manualJson.trim()) return alert("Vui lòng dán chuỗi JSON vào ô dưới!");
    try {
      // Làm sạch chuỗi JSON nếu dính markdown (```json ... ```)
      const cleanJson = manualJson.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e1) {
        // Thử tự động fix lỗi escape giống API
        const sanitized = cleanJson.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
        parsed = JSON.parse(sanitized);
      }
      const finalArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      if (finalArray.length === 0) throw new Error("Mảng câu hỏi rỗng hoặc sai định dạng.");
      
      setExamData(finalArray);
      alert(`Nhập thành công ${finalArray.length} câu hỏi!`);
    } catch (e: any) {
      alert("JSON không hợp lệ. Vui lòng kiểm tra lại. Chi tiết lỗi: " + e.message);
    }
  };

  const handleParseAI = async () => {
    if (!rawHtml.trim() && !uploadedFile) return alert("Vui lòng dán nội dung đề thi hoặc tải lên file PDF/Word!");
    setIsParsing(true);
    try {
      // Gọi API nhận diện
      const response = await fetch('/api/exams/parse', { 
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({
            prompt: showCustomPrompt ? customPrompt : defaultPrompt,
            rawHtml: rawHtml,
            fileData: uploadedFile
         })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Có lỗi xảy ra khi phân tích.');
      
      if (result && Array.isArray(result.questions)) {
        setExamData(result.questions);
        alert(`Nhận diện thành công ${result.questions.length} câu hỏi!`);
      } else {
        throw new Error("Dữ liệu trả về không đúng định dạng.");
      }
      setIsParsing(false);
    } catch (e: any) {
      alert("Lỗi AI: " + e.message);
      setIsParsing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans pb-32">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/admin/online-exams" className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-2 font-medium transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            Cấu hình Kỳ thi
          </h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading || isInitializing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {loading ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang cập nhật...</>
          ) : (
            <><Save className="w-5 h-5" /> Lưu Thay đổi</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Nội dung đề thi */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {isInitializing ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="font-medium animate-pulse">Đang nạp dữ liệu đề thi...</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Nội dung Đề thi
                </h2>
                
                {/* Tabs Phương thức nhập */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                  <button 
                    onClick={() => setImportMethod("AI")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${importMethod === "AI" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    1. Tự động (AI)
                  </button>
                  <button 
                    onClick={() => setImportMethod("BANK")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${importMethod === "BANK" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    2. Từ Ngân hàng
                  </button>
                  <button 
                    onClick={() => setImportMethod("MANUAL")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${importMethod === "MANUAL" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    3. Nhập JSON thủ công
                  </button>
                </div>

            {importMethod === "AI" && (
              <div className="space-y-4">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm">
                  <span className="font-bold">Mẹo:</span> Bạn có thể copy toàn bộ nội dung từ file Word (bao gồm cả ảnh) và dán (Ctrl+V) trực tiếp vào khung dưới đây, hoặc tải trực tiếp file PDF lên. Hệ thống AI sẽ tự động đọc và chia tách thành từng câu hỏi trắc nghiệm/tự luận.
                </div>
                
                {/* Input File Ẩn */}
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />

                {/* Trình soạn thảo Rich Text cho phép paste ảnh */}
                <div className="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                  <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 hover:bg-slate-200 rounded text-slate-600 font-bold text-sm px-3 flex items-center gap-1"
                    >
                      <UploadCloud className="w-4 h-4" /> Tải file Word/PDF
                    </button>
                  </div>
                  
                  {uploadedFile ? (
                    <div className="w-full h-[400px] flex flex-col items-center justify-center bg-indigo-50 p-6 relative">
                      <FileText className="w-16 h-16 text-indigo-400 mb-3" />
                      <p className="font-bold text-indigo-800 text-lg">{uploadedFile.name}</p>
                      <p className="text-indigo-600 text-sm mt-1">Đã sẵn sàng để AI phân tích</p>
                      <button 
                        onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="mt-4 px-4 py-2 bg-white text-indigo-600 rounded-lg shadow-sm font-bold text-sm hover:bg-slate-50"
                      >
                        Hủy / Xóa file
                      </button>
                    </div>
                  ) : (
                    <div 
                      ref={editorRef}
                      contentEditable
                      onPaste={handlePaste}
                      onInput={(e) => setRawHtml(e.currentTarget.innerHTML)}
                      data-placeholder="Dán (Ctrl+V) nội dung đề thi (Bao gồm cả Chữ và Ảnh) vào đây..."
                      className="w-full h-[400px] p-4 outline-none overflow-y-auto prose max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
                    />
                  )}
                </div>
                
                {/* Phần Tùy chỉnh Lệnh cho AI (Custom Prompt) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showCustomPrompt} 
                      onChange={e=>setShowCustomPrompt(e.target.checked)} 
                      className="w-4 h-4 text-indigo-600 rounded" 
                    />
                    <span className="text-sm font-bold text-slate-700">Tùy chỉnh lệnh AI (Prompt) thủ công</span>
                  </label>
                  {showCustomPrompt && (
                    <div className="mt-3">
                      <textarea 
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="w-full h-24 p-3 text-sm outline-none border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ví dụ: Chỉ lấy 10 câu đầu tiên, hoặc đổi đáp án đúng thành in hoa..."
                      />
                      <p className="text-xs text-slate-500 mt-1">Ghi rõ yêu cầu của bạn, AI sẽ làm theo chính xác những gì bạn hướng dẫn.</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleParseAI}
                  disabled={isParsing || (!rawHtml.trim() && !uploadedFile)}
                  className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isParsing ? <><Bot className="w-5 h-5 animate-pulse" /> AI đang đọc và xử lý đề...</> : <><Bot className="w-5 h-5" /> Sử dụng AI nhận diện câu hỏi</>}
                </button>
              </div>
            )}

            {importMethod === "MANUAL" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800">
                  <h4 className="font-bold mb-2 text-base">Hướng dẫn nhập thủ công:</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Copy đoạn lệnh tiêu chuẩn ở dưới đây.</li>
                    <li>Mở ChatGPT hoặc Gemini trên một tab mới, dán đoạn lệnh đó cùng với toàn bộ nội dung đề thi của bạn.</li>
                    <li>Copy kết quả JSON mà ChatGPT/Gemini trả về (Chỉ lấy phần cấu trúc {"[{...}]"}).</li>
                    <li>Dán đoạn JSON đó vào ô trống phía dưới và ấn kiểm tra.</li>
                  </ol>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`Bạn là một chuyên gia dữ liệu. Phân tích đề thi dưới đây thành mảng JSON. Mỗi câu là 1 object có các trường: "qIndex" (số), "type" (multiple_choice/essay), "question" (chữ), "options" (mảng 4 chữ nếu là trắc nghiệm), "answerIndex" (0,1,2,3), "answerText" (hướng dẫn giải), "hasMediaWarning" (boolean - true nếu có bảng biểu/hình học ở gốc), "mediaWarningNote" (chữ - Mô tả vị trí của ảnh đó ví dụ: "Có bảng biến thiên ở trang 1"). \n\nĐây là đề thi:\n`);
                      alert("Đã copy lệnh vào bộ nhớ tạm!");
                    }}
                    className="mt-3 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Copy câu lệnh chuẩn cho AI
                  </button>
                </div>

                <div>
                  <textarea 
                    value={manualJson}
                    onChange={(e) => setManualJson(e.target.value)}
                    placeholder='Dán đoạn mã JSON (bắt đầu bằng [ và kết thúc bằng ]) vào đây...'
                    className="w-full h-64 p-4 font-mono text-sm outline-none border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-green-400 placeholder:text-slate-600"
                  />
                </div>

                <button 
                  onClick={handleParseManualJSON}
                  disabled={!manualJson.trim()}
                  className="w-full bg-slate-800 text-white hover:bg-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Code2 className="w-5 h-5" /> Kiểm tra và Nhập Dữ liệu
                </button>
              </div>
            )}

            {importMethod === "BANK" && (
              <div className="h-64 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500">
                <Database className="w-10 h-10 mb-2 text-slate-300" />
                <p className="font-medium">Chức năng chọn từ ma trận đang phát triển</p>
              </div>
            )}

            {examData.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>Kết quả nhận diện ({examData.length} câu hỏi)</span>
                </h3>

                {/* Chú giải cảnh báo ảnh */}
                {examData.some(q => q.hasMediaWarning) && editingQuestionIdx === null && (
                  <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg mb-4 text-sm flex gap-3 items-start shadow-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <strong>Cảnh báo từ AI:</strong> Hệ thống phát hiện một số câu hỏi có chứa Bảng biểu hoặc Hình ảnh ở tài liệu gốc. Vui lòng bấm <strong>Sửa</strong> tại câu hỏi đó, dùng công cụ cắt ảnh (Snipping Tool) để cắt từ file gốc và dán (Ctrl+V) đè vào các câu bị thiếu ảnh tương ứng.
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {examData.map((q, idx) => {
                    const isEditingThis = editingQuestionIdx === idx;
                    
                    // Xử lý Tiêu đề Nhóm (Group Title)
                    let showGroupTitle = false;
                    let romanIndex = 0;
                    if (idx === 0 || q.type !== examData[idx - 1].type) {
                      showGroupTitle = true;
                      let groupCount = 0;
                      for (let i = 0; i <= idx; i++) {
                        if (i === 0 || examData[i].type !== examData[i - 1].type) groupCount++;
                      }
                      romanIndex = groupCount - 1;
                    }
                    const romanNumbers = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
                    const groupTitles: Record<string, string> = {
                      'multiple_choice': 'PHẦN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
                      'true_false': 'PHẦN TRẮC NGHIỆM ĐÚNG SAI',
                      'short_answer': 'PHẦN TRẢ LỜI NGẮN',
                      'essay': 'PHẦN TỰ LUẬN'
                    };

                    return (
                    <React.Fragment key={idx}>
                    {showGroupTitle && (
                      <div className="bg-indigo-600 text-white font-black text-lg p-3 rounded-xl mb-4 mt-8 shadow-md">
                        {romanNumbers[romanIndex]}. {groupTitles[q.type || 'multiple_choice'] || 'PHẦN THI'}
                      </div>
                    )}
                    
                    <div className={`p-4 bg-white border rounded-xl text-sm transition-all mb-4 ${q.hasMediaWarning ? 'border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]' : 'border-slate-200 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">Câu {idx + 1}</span>
                          
                          <select 
                            value={q.type || 'multiple_choice'} 
                            onChange={(e) => updateQuestionField(idx, 'type', e.target.value)}
                            className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="multiple_choice">Trắc nghiệm 4 chọn 1</option>
                            <option value="true_false">Trắc nghiệm Đúng/Sai</option>
                            <option value="short_answer">Trả lời ngắn</option>
                            <option value="essay">Tự luận</option>
                          </select>

                          <button 
                            onClick={() => setEditingQuestionIdx(isEditingThis ? null : idx)}
                            className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${isEditingThis ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          >
                            {isEditingThis ? "Hoàn tất lưu" : "Sửa câu này"}
                          </button>
                          {isEditingThis && (
                            <button 
                              onClick={() => handleFixLatexAI(idx, true)}
                              className="text-xs px-3 py-1 rounded-full font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center gap-1"
                            >
                              ✨ AI Sửa Toán
                            </button>
                          )}
                        </div>
                        {q.hasMediaWarning && (
                          <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
                            <AlertTriangle className="w-4 h-4" />
                            {q.mediaWarningNote || "Thiếu ảnh/bảng từ bản gốc"}
                            <button 
                              onClick={() => markMediaResolved(idx)}
                              className="ml-2 hover:text-amber-900 bg-amber-200/50 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Đã xử lý
                            </button>
                          </div>
                        )}
                      </div>

                      {/* NỘI DUNG CÂU HỎI */}
                      {isEditingThis ? (
                        <div 
                          contentEditable
                          onBlur={(e) => updateQuestionField(idx, 'question', e.currentTarget.innerHTML)}
                          dangerouslySetInnerHTML={{ __html: q.question }}
                          className="font-medium text-slate-800 outline-none border-b border-dashed border-slate-300 pb-3 mb-3 min-h-[40px] focus:border-indigo-500 transition-colors empty:before:content-['Nhập_nội_dung_hoặc_dán_ảnh_vào_đây...'] empty:before:text-slate-300"
                        />
                      ) : (
                        <div className="font-medium text-slate-800 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <MathRenderer htmlContent={q.question} />
                        </div>
                      )}

                      {/* CÁC ĐÁP ÁN DỰA TRÊN TYPE */}
                      {(!q.type || q.type === 'multiple_choice') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {q.options?.map((opt: string, i: number) => (
                            <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${i === q.answerIndex ? "border-green-400 bg-green-50 shadow-sm" : "border-slate-100 bg-slate-50"}`}>
                              <span className={`font-bold shrink-0 mt-0.5 cursor-pointer ${i === q.answerIndex ? "text-green-600" : "text-slate-500"}`} onClick={() => isEditingThis && updateQuestionField(idx, 'answerIndex', i)}>
                                {String.fromCharCode(65 + i)}.
                              </span>
                              {isEditingThis ? (
                                <div className="flex-1 flex flex-col gap-1">
                                  <div 
                                    contentEditable
                                    onBlur={(e) => updateOptionField(idx, i, e.currentTarget.innerHTML)}
                                    dangerouslySetInnerHTML={{ __html: opt }}
                                    className={`outline-none min-h-[24px] ${i === q.answerIndex ? "text-green-800 font-medium" : "text-slate-600"}`}
                                  />
                                  <button onClick={() => handleFixLatexAI(idx, false, i)} className="text-[10px] text-purple-600 bg-purple-50 w-fit px-2 rounded hover:bg-purple-100">✨ Sửa Toán</button>
                                </div>
                              ) : (
                                <div className={`flex-1 overflow-hidden ${i === q.answerIndex ? "text-green-800 font-medium" : "text-slate-600"}`}>
                                  <MathRenderer htmlContent={opt} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div className="mt-2 space-y-2">
                          <div className="flex text-xs font-bold text-slate-500 px-2">
                            <div className="flex-1">Nội dung ý</div>
                            <div className="w-16 text-center text-green-600">Đúng</div>
                            <div className="w-16 text-center text-red-500">Sai</div>
                          </div>
                          {Array.from({ length: Math.max(4, q.options?.length || 4) }).map((_, i: number) => {
                            const opt = q.options?.[i] || "";
                            const isTrue = q.answers && q.answers[i] === true;
                            const isFalse = q.answers && q.answers[i] === false;
                            return (
                              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white">
                                <span className="font-bold text-slate-500">{String.fromCharCode(97 + i)})</span>
                                {isEditingThis ? (
                                  <div className="flex-1 flex flex-col gap-1">
                                    <div 
                                      contentEditable
                                      onBlur={(e) => updateOptionField(idx, i, e.currentTarget.innerHTML)}
                                      dangerouslySetInnerHTML={{ __html: opt }}
                                      className="outline-none min-h-[24px] text-slate-700"
                                    />
                                    <button onClick={() => handleFixLatexAI(idx, false, i)} className="text-[10px] text-purple-600 bg-purple-50 w-fit px-2 rounded hover:bg-purple-100">✨ Sửa Toán</button>
                                  </div>
                                ) : (
                                  <div className="flex-1 text-slate-700 overflow-hidden"><MathRenderer htmlContent={opt} /></div>
                                )}
                                <div className="w-16 text-center">
                                  <input type="radio" checked={isTrue} onChange={() => {
                                      if(isEditingThis) {
                                        const newAnswers = [...(q.answers || [false,false,false,false])];
                                        newAnswers[i] = true;
                                        updateQuestionField(idx, 'answers', newAnswers);
                                      }
                                  }} className="w-4 h-4 text-green-500" />
                                </div>
                                <div className="w-16 text-center">
                                  <input type="radio" checked={isFalse} onChange={() => {
                                      if(isEditingThis) {
                                        const newAnswers = [...(q.answers || [false,false,false,false])];
                                        newAnswers[i] = false;
                                        updateQuestionField(idx, 'answers', newAnswers);
                                      }
                                  }} className="w-4 h-4 text-red-500" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                           <span className="font-bold text-slate-700 text-sm">Đáp án đúng (Trả lời ngắn): </span>
                           {isEditingThis ? (
                             <input 
                               type="text" 
                               value={q.correct_answers?.[0] || q.answerText || ""} 
                               onChange={(e) => updateQuestionField(idx, 'correct_answers', [e.target.value])}
                               className="mt-2 w-full px-3 py-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                               placeholder="Nhập đáp án ngắn..."
                             />
                           ) : (
                             <span className="font-bold text-indigo-600">{q.correct_answers?.[0] || q.answerText || "(Chưa có đáp án)"}</span>
                           )}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                           <span className="font-bold text-slate-700 text-sm">Hướng dẫn giải / Đáp án tự luận: </span>
                           {isEditingThis ? (
                             <textarea 
                               value={q.answerText || ""} 
                               onChange={(e) => updateQuestionField(idx, 'answerText', e.target.value)}
                               className="mt-2 w-full h-24 p-3 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                               placeholder="Nhập hướng dẫn giải..."
                             />
                           ) : (
                             <div className="mt-2 text-slate-600"><MathRenderer htmlContent={q.answerText || "(Chưa có đáp án mẫu)"} /></div>
                           )}
                        </div>
                      )}

                    </div>
                    </React.Fragment>
                  )})}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>

        {/* Cột phải: Cài đặt */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Cài đặt chung
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tên Nhóm Kỳ Thi (Thư mục chung)</label>
                <input 
                  type="text" 
                  list="exam-titles"
                  value={examGroupName} 
                  onChange={e=>setExamGroupName(e.target.value)} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4" 
                  placeholder="Chọn từ danh sách hoặc tự nhập (VD: Kiểm tra Giữa kì I)" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tên Đề số <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={variantName} 
                    onChange={e=>setVariantName(e.target.value)} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="VD: Đề 01" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Giao cho Khóa Học (LMS)</label>
                  <div className="w-full px-3 py-2 border border-slate-300 rounded-lg max-h-32 overflow-y-auto space-y-2 bg-slate-50">
                    {systemCourses.length === 0 ? <span className="text-sm text-slate-500 italic">Đang tải / Chưa có khóa học...</span> : systemCourses.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200 p-1 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={assignedClasses.includes(c.id)} 
                          onChange={(e) => {
                            if (e.target.checked) setAssignedClasses([...assignedClasses, c.id]);
                            else setAssignedClasses(assignedClasses.filter(id => id !== c.id));
                          }} 
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm text-slate-700 font-medium">{c.title}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Không check Khóa nào = Đề Mở tự do</p>
                </div>
              </div>

              {/* Ẩn tiêu đề cũ đi để tương thích */}
              <input type="hidden" value={title} onChange={e=>setTitle(e.target.value)} />


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Khối lớp</label>
                  <select value={grade} onChange={e=>setGrade(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    {[12,11,10,9,8,7,6].map(g => (
                      <option key={g} value={String(g)}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cấu trúc đề</label>
                  <select value={structure} onChange={e=>setStructure(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="1">Full tự luận (100%)</option>
                    <option value="2">Trắc nghiệm + Tự luận (4:6)</option>
                    <option value="3">TN + Đ/S + Ngắn + TL (3:2:2:3)</option>
                    <option value="4">TN + Đ/S + Ngắn (3:4:3)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian (Phút)</label>
                  <input type="number" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu (Tùy chọn)</label>
                  <input type="text" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Để trống nếu k có" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian mở đề (Từ - Đến)</label>
                <div className="flex items-center gap-2">
                  <input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                  <span>-</span>
                  <input type="datetime-local" value={endTime} onChange={e=>setEndTime(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Bảo mật & Hiển thị
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shuffleQuestions} onChange={e=>setShuffleQuestions(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Trộn thứ tự câu hỏi (Đảo đề)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shuffleOptions} onChange={e=>setShuffleOptions(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Trộn thứ tự đáp án (A, B, C, D)</span>
              </label>
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">Khi nào học sinh được xem điểm?</label>
                <select value={showResults} onChange={e=>setShowResults(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="IMMEDIATELY">Hiển thị điểm ngay sau khi nộp bài</option>
                  <option value="LATER">Ẩn điểm (Giáo viên công bố sau)</option>
                </select>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">Chống gian lận (Rời tab/Chuyển màn hình)</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">Thu bài sau</span>
                  <input type="number" value={maxCheatWarnings} onChange={e=>setMaxCheatWarnings(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-center" min={0} />
                  <span className="text-sm text-slate-600">lần vi phạm</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Hệ thống sẽ khóa chuột phải, chặn bôi đen copy và cảnh báo nếu học sinh chuyển sang tab khác để tra Google.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium hidden md:block">Hãy chắc chắn bạn đã nhận diện câu hỏi thành công trước khi lưu.</p>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link href="/admin/online-exams" className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors flex-1 md:flex-none text-center">Hủy bỏ</Link>
            <button 
              onClick={handleSave}
              disabled={loading || examData.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 flex-1 md:flex-none"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? "Đang lưu..." : "Lưu & Xuất bản"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
